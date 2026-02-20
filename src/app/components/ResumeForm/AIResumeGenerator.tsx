"use client";
import { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { selectResume, setResume } from "lib/redux/resumeSlice";
import type { Resume } from "lib/redux/types";

const SparklesIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-5 w-5"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
        />
    </svg>
);

const LoadingSpinner = () => (
    <svg
        className="h-5 w-5 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
    >
        <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
        />
        <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
    </svg>
);

type RevisionStage = "idle" | "loading1" | "done1" | "loading2" | "done2" | "loading3" | "done3";

export const AIResumeGenerator = () => {
    const dispatch = useAppDispatch();
    const currentResume = useAppSelector(selectResume);

    const [jobDescription, setJobDescription] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);

    // Revision state
    const [revisionStage, setRevisionStage] = useState<RevisionStage>("idle");
    const [matchScore, setMatchScore] = useState<number | null>(null);
    const [missingKeywords, setMissingKeywords] = useState<string[]>([]);
    const [revisionError, setRevisionError] = useState<string | null>(null);
    const [originalResume, setOriginalResume] = useState<Resume | null>(null);

    // Custom instruction state
    const [customInstruction, setCustomInstruction] = useState("");
    const [isApplyingCustom, setIsApplyingCustom] = useState(false);
    const [customError, setCustomError] = useState<string | null>(null);
    const [customSuccess, setCustomSuccess] = useState(false);

    const hasExistingContent = currentResume.profile.name !== "";

    const runStage1 = useCallback(async () => {
        if (!originalResume) setOriginalResume(currentResume);
        setRevisionStage("loading1");
        setRevisionError(null);
        try {
            const response = await fetch("/api/revise-resume", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stage: 1,
                    jobDescription: jobDescription.trim(),
                    resume: currentResume,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Stage 1 failed.");
            setMatchScore(data.score);
            setMissingKeywords(data.missingKeywords);
            setRevisionStage("done1");
        } catch (err: any) {
            setRevisionError(err.message || "An unexpected error occurred.");
            setRevisionStage("idle");
        }
    }, [jobDescription, currentResume, originalResume]);

    const runStage2 = useCallback(async () => {
        setRevisionStage("loading2");
        setRevisionError(null);
        try {
            const response = await fetch("/api/revise-resume", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stage: 2,
                    jobDescription: jobDescription.trim(),
                    resume: currentResume,
                    missingKeywords,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Stage 2 failed.");
            dispatch(setResume({ ...currentResume, workExperiences: data.workExperiences }));
            setRevisionStage("done2");
        } catch (err: any) {
            setRevisionError(err.message || "An unexpected error occurred.");
            setRevisionStage("done1");
        }
    }, [jobDescription, currentResume, missingKeywords, dispatch]);

    const runStage3 = useCallback(async () => {
        setRevisionStage("loading3");
        setRevisionError(null);
        try {
            const response = await fetch("/api/revise-resume", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stage: 3,
                    resume: currentResume,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Stage 3 failed.");
            dispatch(setResume(data.resume));
            setRevisionStage("done3");
        } catch (err: any) {
            setRevisionError(err.message || "An unexpected error occurred.");
            setRevisionStage("done2");
        }
    }, [currentResume, dispatch]);

    const revertToOriginal = useCallback(() => {
        if (originalResume) {
            dispatch(setResume(originalResume));
            setOriginalResume(null);
            setRevisionStage("idle");
            setMatchScore(null);
            setMissingKeywords([]);
            setRevisionError(null);
        }
    }, [originalResume, dispatch]);

    const runCustom = useCallback(async () => {
        if (!originalResume) setOriginalResume(currentResume);
        setIsApplyingCustom(true);
        setCustomError(null);
        setCustomSuccess(false);
        try {
            const response = await fetch("/api/revise-resume", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stage: 4,
                    resume: currentResume,
                    jobDescription: jobDescription.trim(),
                    instruction: customInstruction.trim(),
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Custom instruction failed.");
            dispatch(setResume(data.resume));
            setCustomSuccess(true);
            setCustomInstruction("");
            setTimeout(() => setCustomSuccess(false), 4000);
        } catch (err: any) {
            setCustomError(err.message || "An unexpected error occurred.");
        } finally {
            setIsApplyingCustom(false);
        }
    }, [currentResume, jobDescription, customInstruction, originalResume, dispatch]);

    const scoreColor =
        matchScore === null
            ? ""
            : matchScore >= 80
                ? "text-green-700 bg-green-100 border-green-300"
                : matchScore >= 60
                    ? "text-yellow-700 bg-yellow-100 border-yellow-300"
                    : "text-red-700 bg-red-100 border-red-300";

    const showRevisionSection =
        hasExistingContent && jobDescription.trim().length > 0;

    const isRevising =
        revisionStage === "loading1" ||
        revisionStage === "loading2" ||
        revisionStage === "loading3";

    return (
        <div className="rounded-md border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
            {/* Header / Toggle */}
            <button
                type="button"
                className="flex w-full items-center justify-between p-4 text-left"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <SparklesIcon />
                    <h2 className="text-base font-semibold text-purple-900">
                        AI Resume Generator
                    </h2>
                </div>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className={`h-5 w-5 text-purple-600 transition-transform ${isExpanded ? "rotate-180" : ""
                        }`}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                </svg>
            </button>

            {/* Expandable Content */}
            {isExpanded && (
                <div className="space-y-4 border-t border-purple-200 p-4">
                    <p className="text-sm text-gray-600">
                        Paste a job description below and let AI generate a tailored resume
                        optimized with relevant keywords to maximize your interview chances.
                    </p>

                    {/* Job Description Textarea */}
                    <div>
                        <div className="flex items-center justify-between">
                            <label
                                htmlFor="job-description"
                                className="mb-1 block text-sm font-medium text-gray-700"
                            >
                                Job Description
                            </label>
                            <span className={`text-xs ${jobDescription.length > 9000 ? "text-red-500" : "text-gray-400"
                                }`}>
                                {jobDescription.length.toLocaleString()} / 10,000
                            </span>
                        </div>
                        <textarea
                            id="job-description"
                            rows={6}
                            className="w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="Paste the full job description here..."
                            value={jobDescription}
                            onChange={(e) => {
                                setJobDescription(e.target.value);
                                setOriginalResume(null);
                                // Reset revision state when JD changes
                                setRevisionStage("idle");
                                setMatchScore(null);
                                setMissingKeywords([]);
                                setRevisionError(null);
                            }}
                            maxLength={10000}
                            disabled={isRevising}
                        />
                    </div>

                    {/* ── AI Resume Revision Section ── */}
                    {showRevisionSection && (
                        <div className="mt-2 space-y-3 border-t border-purple-200 pt-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-purple-900">
                                    AI Resume Revision
                                </h3>
                                {originalResume !== null && (
                                    <button
                                        type="button"
                                        onClick={revertToOriginal}
                                        className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                                    >
                                        Revert to Original
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-gray-500">
                                Run three targeted AI passes to score, rewrite, and ATS-optimize your resume.
                            </p>

                            {/* Revision error */}
                            {revisionError && (
                                <div className="rounded-md bg-red-50 p-3">
                                    <p className="text-sm text-red-700">{revisionError}</p>
                                </div>
                            )}

                            {/* Stage 1 */}
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={runStage1}
                                    disabled={
                                        isRevising ||
                                        revisionStage === "done1" ||
                                        revisionStage === "done2" ||
                                        revisionStage === "done3"
                                    }
                                    className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {revisionStage === "loading1" ? (
                                        <>
                                            <LoadingSpinner />
                                            Analyzing match...
                                        </>
                                    ) : (
                                        "Stage 1: Analyze Match"
                                    )}
                                </button>

                                {/* Stage 1 result */}
                                {(revisionStage === "done1" ||
                                    revisionStage === "loading2" ||
                                    revisionStage === "done2" ||
                                    revisionStage === "loading3" ||
                                    revisionStage === "done3") &&
                                    matchScore !== null && (
                                        <div className="space-y-2 pl-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-600">Match Score:</span>
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-3 py-0.5 text-sm font-semibold ${scoreColor}`}
                                                >
                                                    {matchScore} / 100
                                                </span>
                                            </div>
                                            {missingKeywords.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1">
                                                    <span className="text-sm text-gray-600">Missing:</span>
                                                    {missingKeywords.map((kw) => (
                                                        <span
                                                            key={kw}
                                                            className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                                                        >
                                                            {kw}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                            </div>

                            {/* Stage 2 */}
                            {(revisionStage === "done1" ||
                                revisionStage === "loading2" ||
                                revisionStage === "done2" ||
                                revisionStage === "loading3" ||
                                revisionStage === "done3") && (
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={runStage2}
                                            disabled={
                                                isRevising ||
                                                revisionStage === "done2" ||
                                                revisionStage === "done3"
                                            }
                                            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {revisionStage === "loading2" ? (
                                                <>
                                                    <LoadingSpinner />
                                                    Rewriting experience...
                                                </>
                                            ) : (
                                                "Stage 2: Rewrite Experience"
                                            )}
                                        </button>

                                        {/* Stage 2 result */}
                                        {(revisionStage === "done2" ||
                                            revisionStage === "loading3" ||
                                            revisionStage === "done3") && (
                                                <p className="pl-1 text-sm text-green-700">
                                                    ✓ Experience section rewritten with XYZ formula and keywords.
                                                </p>
                                            )}
                                    </div>
                                )}

                            {/* Stage 3 */}
                            {(revisionStage === "done2" ||
                                revisionStage === "loading3" ||
                                revisionStage === "done3") && (
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={runStage3}
                                            disabled={
                                                isRevising ||
                                                revisionStage === "done3"
                                            }
                                            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {revisionStage === "loading3" ? (
                                                <>
                                                    <LoadingSpinner />
                                                    Scanning for ATS issues...
                                                </>
                                            ) : (
                                                "Stage 3: ATS Scan & Fix"
                                            )}
                                        </button>

                                        {/* Stage 3 result */}
                                        {revisionStage === "done3" && (
                                            <p className="pl-1 text-sm text-green-700">
                                                ✓ ATS improvements applied. Your resume is fully optimized.
                                            </p>
                                        )}
                                    </div>
                                )}

                            {isRevising && (
                                <p className="text-xs text-gray-500">
                                    This may take 10-30 seconds...
                                </p>
                            )}

                            {/* Custom Instructions */}
                            <div className="space-y-2 border-t border-purple-200 pt-3">
                                <h4 className="text-sm font-semibold text-purple-900">
                                    Custom Instructions
                                </h4>
                                <textarea
                                    rows={3}
                                    className="w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    placeholder="e.g. Make my summary more concise, add Python to skills, shorten the first job's bullets..."
                                    value={customInstruction}
                                    onChange={(e) => setCustomInstruction(e.target.value)}
                                    disabled={isApplyingCustom || isRevising}
                                />
                                <div className="flex items-center justify-end gap-3">
                                    {customSuccess && (
                                        <p className="text-sm text-green-700">✓ Changes applied.</p>
                                    )}
                                    {customError && (
                                        <p className="text-sm text-red-700">{customError}</p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={runCustom}
                                        disabled={isApplyingCustom || !customInstruction.trim() || isRevising}
                                        className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isApplyingCustom ? (
                                            <>
                                                <LoadingSpinner />
                                                Applying...
                                            </>
                                        ) : (
                                            "Apply Instructions"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
