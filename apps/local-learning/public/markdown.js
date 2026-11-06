import katex from "/vendor/katex/katex.mjs";
import { Marked, Renderer } from "/vendor/marked/marked.esm.js";
import DOMPurify from "/vendor/dompurify/purify.es.mjs";

export const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
}[character]));

function safeUrl(value, base) {
  try {
    const url = new URL(value, base);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function mathHtml(source, displayMode) {
  return katex.renderToString(source, { displayMode, output: "htmlAndMathml", strict: "warn", throwOnError: false, trust: false });
}

function headingSlug(title) {
  const slug = title
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_]/g, "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

function highlightedCode(hljs, source, language) {
  const aliases = { py: "python", sh: "bash", shell: "bash", jsonc: "json", yml: "yaml", toml: "ini", md: "markdown" };
  const normalizedLanguage = aliases[language.toLowerCase()] ?? language.toLowerCase();
  if (!hljs?.getLanguage(normalizedLanguage)) return escapeHtml(source);
  return hljs.highlight(source, { language: normalizedLanguage, ignoreIllegals: true }).value;
}

export function createMarkdownRenderer({ hljs, renderMermaid, renderFigure, renderTheoryCard } = {}) {
  return function renderMarkdown(markdown, { cards = [], resourceBaseUrl = window.location.href } = {}) {
    const headings = [];
    const usedIds = new Map();
    let codeIndex = 0;
    const defaults = new Renderer();
    const parser = new Marked({
      gfm: true,
      renderer: {
        heading(token) {
          const anchor = token.text.match(/\s*<!-- learning-atlas: ([a-z0-9-]+) -->/)?.[1];
          const title = token.text.replace(/<!--.*?-->/g, "").trim();
          const base = anchor || headingSlug(title);
          const seen = usedIds.get(base) ?? 0;
          usedIds.set(base, seen + 1);
          const id = seen ? `${base}-${seen + 1}` : base;
          const text = parser.parseInline(title);
          if ([2, 3].includes(token.depth)) headings.push({ id, level: token.depth, title });
          const linkedCards = anchor && renderTheoryCard ? cards.filter(card => card.slug === anchor).map(renderTheoryCard).join("") : "";
          return `<h${token.depth} id="${escapeHtml(id)}"${anchor ? ` data-theory-card="${escapeHtml(anchor)}"` : ""}>${text}</h${token.depth}>${linkedCards}`;
        },
        code({ text, lang = "text" }) {
          const language = lang.split(/\s/)[0];
          if (language === "mermaid" && renderMermaid) return renderMermaid(text);
          if (language === "figure" && renderFigure) return renderFigure(text.trim());
          const id = `code-${codeIndex += 1}`;
          return `<div class="code-block"><div class="code-toolbar"><span>${escapeHtml(language)}</span><button type="button" class="copy-code" data-copy-code="${id}">复制代码</button><span class="copy-status" role="status" aria-live="polite"></span></div><pre><code id="${id}" class="hljs language-${escapeHtml(language)}">${highlightedCode(hljs, text, language)}</code></pre></div>`;
        },
        table(token) {
          defaults.parser = this.parser;
          return `<div class="table-wrap">${defaults.table(token)}</div>`;
        },
        image({ href, text }) {
          const url = safeUrl(href, resourceBaseUrl);
          return url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(text)}" loading="lazy" decoding="async">` : "";
        },
        link({ href, tokens }) {
          const url = safeUrl(href, resourceBaseUrl);
          const label = this.parser.parseInline(tokens);
          return url ? `<a href="${escapeHtml(url)}">${label}</a>` : label;
        },
        html({ text }) {
          return DOMPurify.sanitize(text, { FORBID_TAGS: ["style", "form", "input", "textarea", "select"], FORBID_ATTR: ["style"] });
        }
      },
      extensions: [
        { name: "displayMath", level: "block", start: source => source.indexOf("$$"),
          tokenizer(source) {
            const match = /^(?:\$\$[ \t]*\n([\s\S]*?)\n[ \t]*\$\$(?:\n|$)|\$\$([^\n]+?)\$\$(?:\n|$))/.exec(source);
            if (match) return { type: "displayMath", raw: match[0], text: match[1] ?? match[2] };
          }, renderer: token => `<div class="math-display">${mathHtml(token.text, true)}</div>` },
        { name: "inlineMath", level: "inline", start: source => source.indexOf("$"),
          tokenizer(source) {
            const match = /^\$(?![\s$])((?:\\.|[^$\\\n])+?)(?<!\s)\$(?!\d)/.exec(source);
            if (match) return { type: "inlineMath", raw: match[0], text: match[1] };
          }, renderer: token => mathHtml(token.text, false) }
      ]
    });
    const fragment = DOMPurify.sanitize(parser.parse(String(markdown)), {
      RETURN_DOM_FRAGMENT: true, ADD_ATTR: ["target"], FORBID_TAGS: ["form", "input", "textarea", "select", "style"]
    });
    fragment.querySelectorAll("a[href], img[src]").forEach(element => {
      const attribute = element.tagName === "IMG" ? "src" : "href";
      const value = element.getAttribute(attribute);
      const url = safeUrl(value, resourceBaseUrl);
      if (!url) { element.removeAttribute(attribute); return; }
      element.setAttribute(attribute, url);
      if (attribute === "href" && new URL(url).origin !== window.location.origin) {
        element.setAttribute("target", "_blank"); element.setAttribute("rel", "noreferrer noopener");
        element.setAttribute("aria-label", `${element.textContent}（在新窗口打开）`);
      }
    });
    fragment.querySelectorAll("p > img:only-child").forEach(img => img.parentElement.classList.add("markdown-figure"));
    const container = document.createElement("div"); container.append(fragment);
    return { html: container.innerHTML, headings };
  };
}
