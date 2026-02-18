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

export const AIResumeGenerator = () => {
    const dispatch = useAppDispatch();
    const currentResume = useAppSelector(selectResume);

    const [jobDescription, setJobDescription] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [useExistingResume, setUseExistingResume] = useState(true);

    const hasExistingContent = currentResume.profile.name !== "";

    const generateResume = useCallback(async () => {
        if (!jobDescription.trim()) {
            setError("Please paste a job description first.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const body: { jobDescription: string; currentResume?: Resume } = {
                jobDescription: jobDescription.trim(),
            };

            if (useExistingResume && hasExistingContent) {
                body.currentResume = currentResume;
            }

            const response = await fetch("/api/generate-resume", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate resume.");
            }

            dispatch(setResume(data.resume));
            setSuccess(true);
            setTimeout(() => setSuccess(false), 5000);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [jobDescription, useExistingResume, hasExistingContent, currentResume, dispatch]);

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
                                setError(null);
                            }}
                            maxLength={10000}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Enhance Mode Toggle */}
                    {hasExistingContent && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="use-existing-resume"
                                checked={useExistingResume}
                                onChange={(e) => setUseExistingResume(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                disabled={isLoading}
                            />
                            <label
                                htmlFor="use-existing-resume"
                                className="text-sm text-gray-600"
                            >
                                Use my existing resume as a base (enhance mode)
                            </label>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="rounded-md bg-red-50 p-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="rounded-md bg-green-50 p-3">
                            <p className="text-sm text-green-700">
                                ✨ Resume generated successfully! Review the updated content below.
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={generateResume}
                            disabled={isLoading || !jobDescription.trim()}
                            className="flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <LoadingSpinner />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon />
                                    Generate AI Resume
                                </>
                            )}
                        </button>

                        {jobDescription && !isLoading && (
                            <button
                                type="button"
                                onClick={() => {
                                    setJobDescription("");
                                    setError(null);
                                    setSuccess(false);
                                }}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {isLoading && (
                        <p className="text-xs text-gray-500">
                            This may take 10-30 seconds. The AI is crafting your tailored
                            resume...
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
