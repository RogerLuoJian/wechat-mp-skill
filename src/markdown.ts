// src/markdown.ts
import { Marked } from "marked";
import hljs from "highlight.js";
import type { ArticleMeta } from "./types.js";

const STYLES = {
  h1: "font-size: 22px; font-weight: bold; color: #333; margin: 20px 0 10px 0; line-height: 1.4;",
  h2: "font-size: 20px; font-weight: bold; color: #333; margin: 18px 0 8px 0; line-height: 1.4;",
  h3: "font-size: 18px; font-weight: bold; color: #333; margin: 16px 0 8px 0; line-height: 1.4;",
  p: "font-size: 16px; color: #333; line-height: 1.8; margin: 10px 0;",
  blockquote:
    "border-left: 4px solid #ddd; padding: 10px 15px; color: #666; margin: 10px 0; background: #f9f9f9;",
  code: "background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 14px; color: #c7254e;",
  pre: "background: #2d2d2d; color: #ccc; padding: 16px; border-radius: 4px; overflow-x: auto; font-size: 14px; line-height: 1.6; margin: 10px 0;",
  ul: "margin: 10px 0; padding-left: 20px; font-size: 16px; color: #333; line-height: 1.8;",
  ol: "margin: 10px 0; padding-left: 20px; font-size: 16px; color: #333; line-height: 1.8;",
  li: "margin: 4px 0;",
  img: "max-width: 100%; height: auto; margin: 10px 0; border-radius: 4px;",
  a: "color: #576b95; text-decoration: none;",
};

function createMarked(): Marked {
  const marked = new Marked();

  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const tag = `h${depth}` as keyof typeof STYLES;
        const style = STYLES[tag] || STYLES.h3;
        const text = this.parser.parseInline(tokens);
        return `<${tag} style="${style}">${text}</${tag}>\n`;
      },
      paragraph({ tokens }) {
        const text = this.parser.parseInline(tokens);
        return `<p style="${STYLES.p}">${text}</p>\n`;
      },
      blockquote({ tokens }) {
        const body = this.parser.parse(tokens);
        return `<blockquote style="${STYLES.blockquote}">${body}</blockquote>\n`;
      },
      code({ text, lang }) {
        let highlighted: string;
        if (lang && hljs.getLanguage(lang)) {
          highlighted = hljs.highlight(text, { language: lang }).value;
        } else {
          highlighted = hljs.highlightAuto(text).value;
        }
        return `<pre style="${STYLES.pre}"><code>${highlighted}</code></pre>\n`;
      },
      codespan({ text }) {
        return `<code style="${STYLES.code}">${text}</code>`;
      },
      list({ items, ordered }) {
        const tag = ordered ? "ol" : "ul";
        const style = ordered ? STYLES.ol : STYLES.ul;
        const body = items.map((item) => this.listitem(item)).join("");
        return `<${tag} style="${style}">${body}</${tag}>\n`;
      },
      listitem({ tokens }) {
        const text = this.parser.parse(tokens);
        return `<li style="${STYLES.li}">${text}</li>\n`;
      },
      image({ href, title, text }) {
        const titleAttr = title ? ` title="${title}"` : "";
        return `<img src="${href}" alt="${text}"${titleAttr} style="${STYLES.img}" />\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const titleAttr = title ? ` title="${title}"` : "";
        return `<a href="${href}"${titleAttr} style="${STYLES.a}">${text}</a>`;
      },
    },
  });

  return marked;
}

export function convertMarkdownToHtml(markdown: string): string {
  const marked = createMarked();
  return marked.parse(markdown, { async: false });
}

function parseFrontmatter(content: string): {
  meta: Record<string, string>;
  body: string;
} {
  const normalized = content.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: normalized };

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      meta[key] = value;
    }
  }
  return { meta, body: match[2].trim() };
}

export function parseArticleFile(
  fileContent: string,
  filename: string,
): Partial<ArticleMeta> {
  const { meta, body } = parseFrontmatter(fileContent);

  if (!meta.title) {
    throw new Error(
      `Article file "${filename}" missing required frontmatter field: title`,
    );
  }

  const isMarkdown =
    filename.endsWith(".md") || filename.endsWith(".markdown");
  const htmlContent = isMarkdown ? convertMarkdownToHtml(body) : body;

  const article: Partial<ArticleMeta> = {
    title: meta.title,
    author: meta.author,
    digest: meta.digest,
    thumb_media_id: meta.thumb_media_id || "",
    content: htmlContent,
  };

  if (meta.content_source_url) {
    article.content_source_url = meta.content_source_url;
  }

  return article;
}
