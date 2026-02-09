/**
 * Lightweight markdown parser for resume text fields.
 * Supports: **bold**, *italic*, [text](url)
 */

export type MarkdownToken =
    | { type: "text"; content: string }
    | { type: "bold"; content: string }
    | { type: "italic"; content: string }
    | { type: "link"; content: string; url: string };

/**
 * Parse a markdown string into an array of tokens.
 * Supports **bold**, *italic*, and [text](url) syntax.
 */
export function parseMarkdown(text: string): MarkdownToken[] {
    const tokens: MarkdownToken[] = [];

    // Combined regex to match bold, italic, or links
    // Order matters: bold (**) must be checked before italic (*)
    const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(\[(.+?)\]\((.+?)\))/g;

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Add any plain text before this match
        if (match.index > lastIndex) {
            tokens.push({
                type: "text",
                content: text.slice(lastIndex, match.index),
            });
        }

        if (match[1]) {
            // Bold: **text**
            tokens.push({ type: "bold", content: match[2] });
        } else if (match[3]) {
            // Italic: *text*
            tokens.push({ type: "italic", content: match[4] });
        } else if (match[5]) {
            // Link: [text](url)
            tokens.push({ type: "link", content: match[6], url: match[7] });
        }

        lastIndex = match.index + match[0].length;
    }

    // Add any remaining plain text
    if (lastIndex < text.length) {
        tokens.push({
            type: "text",
            content: text.slice(lastIndex),
        });
    }

    // If no tokens were created, return the original text
    if (tokens.length === 0 && text.length > 0) {
        tokens.push({ type: "text", content: text });
    }

    return tokens;
}

/**
 * Check if a string contains markdown formatting.
 */
export function hasMarkdown(text: string): boolean {
    return /(\*\*.+?\*\*)|(\*.+?\*)|(\[.+?\]\(.+?\))/.test(text);
}
