import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { Resume } from "lib/redux/types";

const SYSTEM_PROMPT = `You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist.

Your task is to generate a tailored resume optimized for a specific job description. You must:
1. Extract key skills, technologies, qualifications, and keywords from the job description
2. Generate resume content that naturally incorporates these keywords
3. Use strong action verbs and quantifiable achievements
4. Ensure the content passes ATS keyword scanning
5. Keep descriptions concise but impactful (use bullet-point style phrasing)

You MUST respond with a valid JSON object matching this exact structure:
{
  "profile": {
    "name": "string (candidate name)",
    "email": "string (email)",
    "phone": "string (phone number)",
    "url": "string (portfolio/linkedin URL)",
    "summary": "string (2-3 sentence professional summary tailored to the job)",
    "location": "string (city, state)"
  },
  "workExperiences": [
    {
      "company": "string",
      "jobTitle": "string (tailored to match job description terminology)",
      "date": "string (e.g., 'Jan 2022 - Present')",
      "descriptions": ["string (achievement-focused bullet points with metrics where possible)"]
    }
  ],
  "educations": [
    {
      "school": "string",
      "degree": "string",
      "date": "string",
      "gpa": "string (optional, leave empty if not relevant)",
      "descriptions": ["string (relevant coursework, honors, activities)"]
    }
  ],
  "projects": [
    {
      "project": "string",
      "date": "string",
      "descriptions": ["string (project details highlighting relevant skills)"]
    }
  ],
  "skills": {
    "featuredSkills": [
      { "skill": "string (top skill from job description)", "rating": 4 },
      { "skill": "string", "rating": 4 },
      { "skill": "string", "rating": 3 },
      { "skill": "string", "rating": 3 },
      { "skill": "string", "rating": 3 },
      { "skill": "string", "rating": 3 }
    ],
    "descriptions": ["string (comma-separated skill categories, e.g., 'Languages: Python, Java, SQL')"]
  },
  "custom": {
    "descriptions": []
  }
}

Guidelines:
- Include 2-3 work experiences with 3-4 bullet points each
- Include 1-2 education entries
- Include 1-2 relevant projects
- Featured skills should be the 6 most important skills from the job description
- Skill descriptions should group related skills (Languages, Frameworks, Tools, etc.)
- All content should be realistic and professional`;

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

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const body = await request.json();
        const { jobDescription, currentResume } = body;

        if (!jobDescription || typeof jobDescription !== "string") {
            return NextResponse.json(
                { error: "Job description is required." },
                { status: 400 }
            );
        }

        if (jobDescription.length > 10000) {
            return NextResponse.json(
                {
                    error:
                        "Job description is too long. Please limit to 10,000 characters.",
                },
                { status: 400 }
            );
        }

        let userPrompt = `Generate a tailored resume for the following job description:\n\n---\n${jobDescription}\n---`;

        if (currentResume) {
            userPrompt += `\n\nHere is the candidate's current resume data to use as a base. Enhance and tailor this content to better match the job description while keeping the core information intact:\n\n${JSON.stringify(currentResume, null, 2)}`;
        } else {
            userPrompt += `\n\nGenerate realistic but sample resume content that would be a strong match for this position.`;
        }

        const model = process.env.OPENAI_MODEL || "gpt-4o";
        console.log("Using model:", JSON.stringify(model));

        const completion = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            return NextResponse.json(
                { error: "No response received from AI. Please try again." },
                { status: 500 }
            );
        }

        let resume: Resume;
        try {
            resume = JSON.parse(content) as Resume;
        } catch {
            return NextResponse.json(
                { error: "Failed to parse AI response. Please try again." },
                { status: 500 }
            );
        }

        // Validate the resume structure has required fields
        if (
            !resume.profile ||
            !resume.workExperiences ||
            !resume.educations ||
            !resume.skills
        ) {
            return NextResponse.json(
                { error: "AI generated an incomplete resume. Please try again." },
                { status: 500 }
            );
        }

        // Ensure featuredSkills has exactly 6 entries
        if (resume.skills.featuredSkills) {
            while (resume.skills.featuredSkills.length < 6) {
                resume.skills.featuredSkills.push({ skill: "", rating: 4 });
            }
            resume.skills.featuredSkills = resume.skills.featuredSkills.slice(0, 6);
        }

        // Ensure custom section exists
        if (!resume.custom) {
            resume.custom = { descriptions: [] };
        }

        // Ensure projects exists
        if (!resume.projects) {
            resume.projects = [];
        }

        return NextResponse.json({ resume });
    } catch (error: any) {
        console.error("Resume generation error:", error);

        if (error?.status === 429) {
            return NextResponse.json(
                {
                    error: "Rate limit exceeded. Please wait a moment and try again.",
                },
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
