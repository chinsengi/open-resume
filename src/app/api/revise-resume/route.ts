import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { Resume, ResumeWorkExperience } from "lib/redux/types";

const STAGE1_SYSTEM_PROMPT = `You are a senior technical recruiter with 15+ years of experience evaluating candidates.

Compare the provided resume against the job description and identify gaps.

You MUST respond with this exact JSON structure:
{
  "score": <integer 0-100 representing overall match>,
  "missingKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

Scoring guidelines:
- 80-100: Strong match, most required skills present
- 60-79: Moderate match, several key skills missing
- 0-59: Weak match, major gaps in required qualifications

The missingKeywords array must contain exactly 5 items: the most important skills, technologies, or qualifications from the job description that are absent or underrepresented in the resume.`;

const STAGE2_SYSTEM_PROMPT = `You are an expert resume writer specializing in the XYZ achievement formula: "Accomplished X, as measured by Y, by doing Z."

Rewrite the work experience section of the resume using the XYZ formula for every bullet point. Naturally incorporate the provided missing keywords throughout the descriptions where contextually appropriate.

Rules:
- Every bullet point must follow the XYZ structure (quantified achievement + metric + method)
- Missing keywords must appear organically, not forced
- Preserve all company names, job titles, and dates exactly as given
- Return the same number of work experiences as the original
- NEVER invent facts. Do not fabricate companies, job titles, technologies, tools, or metrics that are not present in the candidate's original descriptions.
- Metrics: Only use numbers or metrics that already appear in the original bullet point. If no metric exists, describe the achievement qualitatively (e.g., "significantly reduced…") rather than inventing a percentage or number.
- Missing keywords: Only incorporate a missing keyword if the candidate genuinely worked with that technology or concept based on their existing descriptions. It is better to skip a keyword than to falsely claim experience.
- Rewrite, don't reinvent: Restructure and strengthen existing bullet points using the XYZ formula — the underlying facts must remain true to the original.
- Bold formatting: Use **bold** (markdown double-asterisks) to highlight the most impactful parts of each bullet — specifically: quantified metrics and results (e.g., **40%**, **$2M**, **3x faster**), and the most important incorporated keywords. Bold only the highest-signal words or phrases per bullet; do not over-bold.

You MUST respond with this exact JSON structure:
{
  "workExperiences": [
    {
      "company": "string",
      "jobTitle": "string",
      "date": "string",
      "descriptions": ["string (XYZ-formula bullet point)"]
    }
  ]
}`;

const STAGE3_SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) optimization specialist.

Review the resume for ATS compatibility issues and rewrite it for maximum machine readability:
- Use standard section headers (Experience, Education, Skills, Projects)
- Use simple, parser-friendly date formats (e.g., "Jan 2022 - Mar 2024")
- Remove special characters, tables, columns, or unusual formatting from descriptions
- Increase keyword density for critical skills found in the resume
- Ensure bullet points start with strong action verbs
- Keep descriptions clear and scannable
- Preserve all facts exactly. Every company, job title, date, school, degree, project, and skill must be carried over verbatim from the input.
- Do not add new skills, technologies, or experiences that are not already present in the resume.
- Only improve phrasing and formatting for ATS readability — do not invent new content.
- If a section is already ATS-friendly, reproduce it as-is.
- Bold formatting: Use **bold** (markdown double-asterisks) across ALL description fields in every section to highlight the highest-impact words and phrases a recruiter's eye should land on. Apply bold to: key technical skills and tools (e.g., **React**, **Kubernetes**), quantified results (e.g., **50% reduction**, **$1.2M**), publication titles and venue names in the custom section (e.g., **"Attention Is All You Need"**, **NeurIPS 2023**), notable awards or honors in education descriptions, and 1-2 critical qualifications in the profile summary. Preserve any existing bold from prior stages. Do not bold generic words like "team", "project", or "experience".

You MUST respond with a valid JSON object matching this exact structure:
{
  "profile": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "url": "string",
    "summary": "string (2-3 sentences, keyword-rich, ATS-friendly)",
    "location": "string"
  },
  "workExperiences": [
    {
      "company": "string",
      "jobTitle": "string",
      "date": "string",
      "descriptions": ["string"]
    }
  ],
  "educations": [
    {
      "school": "string",
      "degree": "string",
      "date": "string",
      "gpa": "string",
      "descriptions": ["string"]
    }
  ],
  "projects": [
    {
      "project": "string",
      "date": "string",
      "descriptions": ["string"]
    }
  ],
  "skills": {
    "featuredSkills": [
      { "skill": "string", "rating": 4 },
      { "skill": "string", "rating": 4 },
      { "skill": "string", "rating": 3 },
      { "skill": "string", "rating": 3 },
      { "skill": "string", "rating": 3 },
      { "skill": "string", "rating": 3 }
    ],
    "descriptions": ["string"]
  },
  "custom": {
    "descriptions": []
  }
}`;

function makeOpenAI() {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getModel() {
    return process.env.OPENAI_MODEL || "gpt-4o";
}

async function runStage1(
    openai: OpenAI,
    jobDescription: string,
    resume: Resume
): Promise<NextResponse> {
    const userPrompt = `Job Description:\n---\n${jobDescription}\n---\n\nCandidate Resume:\n${JSON.stringify(resume, null, 2)}`;

    const completion = await openai.chat.completions.create({
        model: getModel(),
        messages: [
            { role: "system", content: STAGE1_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
        return NextResponse.json(
            { error: "No response received from AI. Please try again." },
            { status: 500 }
        );
    }

    const parsed = JSON.parse(content) as { score: number; missingKeywords: string[] };

    if (
        typeof parsed.score !== "number" ||
        !Array.isArray(parsed.missingKeywords)
    ) {
        return NextResponse.json(
            { error: "AI returned an unexpected format. Please try again." },
            { status: 500 }
        );
    }

    return NextResponse.json({
        score: Math.round(Math.max(0, Math.min(100, parsed.score))),
        missingKeywords: parsed.missingKeywords.slice(0, 5),
    });
}

async function runStage2(
    openai: OpenAI,
    jobDescription: string,
    resume: Resume,
    missingKeywords: string[]
): Promise<NextResponse> {
    const userPrompt = `Job Description:\n---\n${jobDescription}\n---\n\nMissing Keywords to incorporate: ${missingKeywords.join(", ")}\n\nCurrent Work Experience:\n${JSON.stringify(resume.workExperiences, null, 2)}`;

    const completion = await openai.chat.completions.create({
        model: getModel(),
        messages: [
            { role: "system", content: STAGE2_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
        return NextResponse.json(
            { error: "No response received from AI. Please try again." },
            { status: 500 }
        );
    }

    const parsed = JSON.parse(content) as { workExperiences: ResumeWorkExperience[] };

    if (!Array.isArray(parsed.workExperiences)) {
        return NextResponse.json(
            { error: "AI returned an unexpected format. Please try again." },
            { status: 500 }
        );
    }

    return NextResponse.json({ workExperiences: parsed.workExperiences });
}

async function runStage3(openai: OpenAI, resume: Resume): Promise<NextResponse> {
    const userPrompt = `Here is the resume to optimize for ATS compatibility:\n\n${JSON.stringify(resume, null, 2)}`;

    const completion = await openai.chat.completions.create({
        model: getModel(),
        messages: [
            { role: "system", content: STAGE3_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
        return NextResponse.json(
            { error: "No response received from AI. Please try again." },
            { status: 500 }
        );
    }

    const parsed = JSON.parse(content) as Resume;

    if (!parsed.profile || !parsed.workExperiences || !parsed.educations || !parsed.skills) {
        return NextResponse.json(
            { error: "AI generated an incomplete resume. Please try again." },
            { status: 500 }
        );
    }

    // Normalize featuredSkills to exactly 6 entries
    if (parsed.skills.featuredSkills) {
        while (parsed.skills.featuredSkills.length < 6) {
            parsed.skills.featuredSkills.push({ skill: "", rating: 4 });
        }
        parsed.skills.featuredSkills = parsed.skills.featuredSkills.slice(0, 6);
    }

    if (!parsed.custom) parsed.custom = { descriptions: [] };
    if (!parsed.projects) parsed.projects = [];

    return NextResponse.json({ resume: parsed });
}

export async function POST(request: Request) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                {
                    error:
                        "OpenAI API key not configured. Please add OPENAI_API_KEY to your .env.local file.",
                },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { stage, jobDescription, resume, missingKeywords } = body;

        if (!stage || ![1, 2, 3].includes(stage)) {
            return NextResponse.json(
                { error: "Invalid stage. Must be 1, 2, or 3." },
                { status: 400 }
            );
        }

        if (!resume) {
            return NextResponse.json(
                { error: "Resume is required." },
                { status: 400 }
            );
        }

        if (stage !== 3 && (!jobDescription || typeof jobDescription !== "string")) {
            return NextResponse.json(
                { error: "Job description is required for stages 1 and 2." },
                { status: 400 }
            );
        }

        const openai = makeOpenAI();

        if (stage === 1) {
            return runStage1(openai, jobDescription, resume);
        }

        if (stage === 2) {
            if (!Array.isArray(missingKeywords)) {
                return NextResponse.json(
                    { error: "missingKeywords array is required for stage 2." },
                    { status: 400 }
                );
            }
            return runStage2(openai, jobDescription, resume, missingKeywords);
        }

        return runStage3(openai, resume);
    } catch (error: any) {
        console.error("Resume revision error:", error);

        if (error?.status === 429) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please wait a moment and try again." },
                { status: 429 }
            );
        }

        if (error?.status === 401) {
            return NextResponse.json(
                {
                    error:
                        "Invalid API key. Please check your OPENAI_API_KEY in .env.local.",
                },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: "An unexpected error occurred. Please try again." },
            { status: 500 }
        );
    }
}
