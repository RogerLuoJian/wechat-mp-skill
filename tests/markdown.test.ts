// tests/markdown.test.ts
import { describe, it, expect } from "vitest";
import { convertMarkdownToHtml, parseArticleFile } from "../src/markdown.js";

describe("convertMarkdownToHtml", () => {
  it("converts heading to styled HTML", () => {
    const html = convertMarkdownToHtml("# Hello World");
    expect(html).toContain("Hello World");
    expect(html).toContain("style=");
    expect(html).not.toContain("<style>");
  });

  it("converts code block with inline highlight styles", () => {
    const md = "```javascript\nconst x = 1;\n```";
    const html = convertMarkdownToHtml(md);
    expect(html).toContain("const");
    expect(html).toContain("style=");
  });

  it("converts paragraph with inline styles", () => {
    const html = convertMarkdownToHtml("Hello **bold** text");
    expect(html).toContain("<strong>");
    expect(html).toContain("bold");
  });

  it("converts list items", () => {
    const html = convertMarkdownToHtml("- item 1\n- item 2");
    expect(html).toContain("item 1");
    expect(html).toContain("item 2");
  });

  it("converts blockquote", () => {
    const html = convertMarkdownToHtml("> quote text");
    expect(html).toContain("quote text");
    expect(html).toContain("style=");
  });
});

describe("parseArticleFile", () => {
  it("parses markdown file with frontmatter", () => {
    const content = `---
title: 测试文章
author: 作者
digest: 摘要
thumb_media_id: thumb_123
---

# 正文标题

正文内容`;

    const result = parseArticleFile(content, "article.md");
    expect(result.title).toBe("测试文章");
    expect(result.author).toBe("作者");
    expect(result.digest).toBe("摘要");
    expect(result.thumb_media_id).toBe("thumb_123");
    expect(result.content).toContain("正文标题");
    expect(result.content).toContain("style=");
  });

  it("parses HTML file with frontmatter", () => {
    const content = `---
title: HTML文章
thumb_media_id: thumb_456
---

<h1>HTML Title</h1>
<p>Paragraph</p>`;

    const result = parseArticleFile(content, "article.html");
    expect(result.title).toBe("HTML文章");
    expect(result.content).toContain("<h1>HTML Title</h1>");
  });

  it("throws if title is missing", () => {
    const content = `---
thumb_media_id: thumb_123
---

content`;

    expect(() => parseArticleFile(content, "article.md")).toThrow("title");
  });
});
