import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

describe("renderMarkdown", () => {
  it("escapes HTML special characters", () => {
    const html = renderMarkdown("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders ## headings as <h2>", () => {
    expect(renderMarkdown("## Hello")).toContain("<h2>Hello</h2>");
  });

  it("renders ### headings as <h3>", () => {
    expect(renderMarkdown("### Hello")).toContain("<h3>Hello</h3>");
  });

  it("renders **bold**", () => {
    expect(renderMarkdown("Suhu **tinggi**")).toContain("<strong>tinggi</strong>");
  });

  it("renders *italic*", () => {
    expect(renderMarkdown("nilai *37°*")).toContain("<em>37°</em>");
  });

  it("renders inline `code`", () => {
    expect(renderMarkdown("var `x = 1`")).toContain("<code>x = 1</code>");
  });

  it("renders dash bullet lists", () => {
    const html = renderMarkdown("- one\n- two");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<li>two</li>");
    expect(html).toContain("</ul>");
  });

  it("renders asterisk bullet lists", () => {
    const html = renderMarkdown("* a\n* b");
    expect(html).toContain("<li>a</li>");
    expect(html).toContain("<li>b</li>");
  });

  it("joins consecutive lines into a single paragraph", () => {
    const html = renderMarkdown("line one\nline two");
    expect(html).toContain("<p>line one line two</p>");
  });

  it("starts a new paragraph after a blank line", () => {
    const html = renderMarkdown("a\n\nb");
    const matches = html.match(/<p>/g);
    expect(matches?.length).toBe(2);
  });

  it("does not let bold/italic syntax create raw HTML", () => {
    const html = renderMarkdown("**<img onerror=1>**");
    expect(html).toContain("<strong>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("renders the full Gemini insight structure", () => {
    const md = [
      "## Ringkasan Kondisi",
      "Cuaca di **Majalengka** cerah.",
      "",
      "## Potensi Risiko",
      "- Suhu tinggi *32°C*.",
      "",
      "## Rekomendasi",
      "- Jaga **hidrasi**.",
    ].join("\n");
    const html = renderMarkdown(md);
    expect(html).toMatch(/<h2>Ringkasan Kondisi<\/h2>/);
    expect(html).toMatch(/<h2>Potensi Risiko<\/h2>/);
    expect(html).toMatch(/<h2>Rekomendasi<\/h2>/);
    expect(html).toContain("<strong>Majalengka</strong>");
    expect(html).toContain("<em>32°C</em>");
    expect(html).toContain("<strong>hidrasi</strong>");
  });
});
