"use client";

/**
 * Suppress ResumePDF development errors.
 * See ResumePDF doc string for context.
 */
if (typeof window !== "undefined" && window.location.hostname === "localhost") {
  const consoleError = console.error;
  const SUPPRESSED_WARNINGS = ["DOCUMENT", "PAGE", "TEXT", "VIEW", "wrap"];
  console.error = function filterWarnings(msg, ...args) {
    const allStrings = [msg, ...args].filter((x): x is string => typeof x === "string");
    if (!SUPPRESSED_WARNINGS.some((entry) => allStrings.some((s) => s.includes(entry)))) {
      consoleError(msg, ...args);
    }
  };
}

export const SuppressResumePDFErrorMessage = () => {
  return <></>;
};
