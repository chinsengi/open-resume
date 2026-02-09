import { parseMarkdown, hasMarkdown, MarkdownToken } from "../parseMarkdown";

describe("parseMarkdown", () => {
    it("returns plain text for strings without markdown", () => {
        const result = parseMarkdown("This is plain text");
        expect(result).toEqual([{ type: "text", content: "This is plain text" }]);
    });

    it("parses bold text", () => {
        const result = parseMarkdown("This is **bold** text");
        expect(result).toEqual([
            { type: "text", content: "This is " },
            { type: "bold", content: "bold" },
            { type: "text", content: " text" },
        ]);
    });

    it("parses italic text", () => {
        const result = parseMarkdown("This is *italic* text");
        expect(result).toEqual([
            { type: "text", content: "This is " },
            { type: "italic", content: "italic" },
            { type: "text", content: " text" },
        ]);
    });

    it("parses links", () => {
        const result = parseMarkdown("Check out [this link](https://example.com)");
        expect(result).toEqual([
            { type: "text", content: "Check out " },
            { type: "link", content: "this link", url: "https://example.com" },
        ]);
    });

    it("parses mixed formatting", () => {
        const result = parseMarkdown(
            "This has **bold** and *italic* and [link](https://example.com)"
        );
        expect(result).toEqual([
            { type: "text", content: "This has " },
            { type: "bold", content: "bold" },
            { type: "text", content: " and " },
            { type: "italic", content: "italic" },
            { type: "text", content: " and " },
            { type: "link", content: "link", url: "https://example.com" },
        ]);
    });

    it("handles multiple bold segments", () => {
        const result = parseMarkdown("**first** and **second**");
        expect(result).toEqual([
            { type: "bold", content: "first" },
            { type: "text", content: " and " },
            { type: "bold", content: "second" },
        ]);
    });

    it("handles empty string", () => {
        const result = parseMarkdown("");
        expect(result).toEqual([]);
    });

    it("handles text starting with formatting", () => {
        const result = parseMarkdown("**Bold** at start");
        expect(result).toEqual([
            { type: "bold", content: "Bold" },
            { type: "text", content: " at start" },
        ]);
    });

    it("handles text ending with formatting", () => {
        const result = parseMarkdown("Ends with **bold**");
        expect(result).toEqual([
            { type: "text", content: "Ends with " },
            { type: "bold", content: "bold" },
        ]);
    });
});

describe("hasMarkdown", () => {
    it("returns false for plain text", () => {
        expect(hasMarkdown("This is plain text")).toBe(false);
    });

    it("returns true for bold text", () => {
        expect(hasMarkdown("This is **bold**")).toBe(true);
    });

    it("returns true for italic text", () => {
        expect(hasMarkdown("This is *italic*")).toBe(true);
    });

    it("returns true for links", () => {
        expect(hasMarkdown("[link](https://example.com)")).toBe(true);
    });
});
