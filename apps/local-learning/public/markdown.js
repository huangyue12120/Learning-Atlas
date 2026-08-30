import katex from "/vendor/katex/katex.mjs";

export const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
}[character]));

function safeUrl(value, resourceBaseUrl = window.location.href) {
  try {
    const url = new URL(value, resourceBaseUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function mathHtml(source, displayMode) {
  try {
    return katex.renderToString(source, {
      displayMode,
      output: "htmlAndMathml",
      strict: "warn",
      throwOnError: false,
      trust: false
    });
  } catch {
    return `<code class="math-error">${escapeHtml(source)}</code>`;
  }
}

function inlineMarkdown(value, resourceBaseUrl) {
  const tokens = [];
  const placeholder = (html) => {
    const index = tokens.push(html) - 1;
    return `\u0000TOKEN${index}\u0000`;
  };
  const tokenized = String(value)
    .replace(/`([^`]+)`/g, (_match, code) => placeholder(`<code>${escapeHtml(code)}</code>`))
    .replace(/\$([^$\n]+)\$/g, (_match, source) => placeholder(mathHtml(source, false)))
    .replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+["'].*?["'])?\)/g, (_match, alt, source) => {
      const url = safeUrl(source, resourceBaseUrl);
      return url ? placeholder(`<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`) : "";
    })
    .replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+["'].*?["'])?\)/g, (_match, label, source) => {
      const url = safeUrl(source, resourceBaseUrl);
      if (!url) return escapeHtml(label);
      const external = /^https?:/i.test(source);
      return placeholder(`<a href="${escapeHtml(url)}"${external ? " target=\"_blank\" rel=\"noreferrer\"" : ""}>${escapeHtml(label)}</a>`);
    });
  return escapeHtml(tokenized)
    .replace(/\\\|/g, "|")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\u0000TOKEN(\d+)\u0000/g, (_match, index) => tokens[Number(index)] ?? "");
}

function tableCells(row, resourceBaseUrl) {
  const cells = [];
  let cell = "";
  let inCode = false;
  for (let index = 1; index < row.length - 1; index += 1) {
    const character = row[index];
    if (character === "\\" && row[index + 1] === "|") {
      cell += "\\|";
      index += 1;
    } else if (character === "`") {
      inCode = !inCode;
      cell += character;
    } else if (character === "|" && !inCode) {
      cells.push(inlineMarkdown(cell.trim(), resourceBaseUrl));
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(inlineMarkdown(cell.trim(), resourceBaseUrl));
  return cells;
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
    const cardsBySlug = new Map();
    cards.forEach((card) => {
      const cardsAtAnchor = cardsBySlug.get(card.slug) ?? [];
      cardsAtAnchor.push(card);
      cardsBySlug.set(card.slug, cardsAtAnchor);
    });
    const lines = String(markdown).replace(/\r\n?/g, "\n").split("\n");
    const output = [];
    const headings = [];
    const usedHeadingIds = new Map();
    let paragraph = [];
    const listStack = [];
    let codeIndex = 0;

    const flushParagraph = () => {
      if (paragraph.length) output.push(`<p>${inlineMarkdown(paragraph.join(" "), resourceBaseUrl)}</p>`);
      paragraph = [];
    };
    const closeList = () => {
      while (listStack.length) {
        const { type } = listStack.pop();
        output.push(`</li></${type}>`);
      }
    };
    const uniqueHeadingId = (title, preferred) => {
      const base = preferred || headingSlug(title);
      const seen = usedHeadingIds.get(base) ?? 0;
      usedHeadingIds.set(base, seen + 1);
      return seen ? `${base}-${seen + 1}` : base;
    };

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const fence = line.match(/^```([^\s]*)/);
      if (fence) {
        flushParagraph();
        closeList();
        const language = fence[1] || "text";
        const code = [];
        while (index += 1, index < lines.length && lines[index] !== "```") code.push(lines[index]);
        const source = code.join("\n");
        if (language === "mermaid" && renderMermaid) {
          output.push(renderMermaid(source));
        } else if (language === "figure" && renderFigure) {
          output.push(renderFigure(source.trim()));
        } else {
          const codeId = `code-${codeIndex += 1}`;
          output.push(`<div class="code-block"><div class="code-toolbar"><span>${escapeHtml(language)}</span><button type="button" class="copy-code" data-copy-code="${codeId}">复制代码</button><span class="copy-status" role="status" aria-live="polite"></span></div><pre><code id="${codeId}" class="hljs language-${escapeHtml(language)}">${highlightedCode(hljs, source, language)}</code></pre></div>`);
        }
        continue;
      }
      if (line.trim() === "$$" || /^\$\$.+\$\$$/.test(line.trim())) {
        flushParagraph();
        closeList();
        const singleLine = /^\$\$(.+)\$\$$/.exec(line.trim());
        const source = [];
        if (singleLine) {
          source.push(singleLine[1]);
        } else {
          while (index += 1, index < lines.length && lines[index].trim() !== "$$") source.push(lines[index]);
        }
        output.push(`<div class="math-display">${mathHtml(source.join("\n"), true)}</div>`);
        continue;
      }
      const heading = line.match(/^(#{1,6})\s+(.+?)(?:\s+<!-- learning-atlas: ([a-z0-9-]+) -->)?$/);
      if (heading) {
        flushParagraph();
        closeList();
        const [, marks, title, anchor] = heading;
        const level = marks.length;
        const id = uniqueHeadingId(title, anchor);
        output.push(`<h${level} id="${escapeHtml(id)}"${anchor ? ` data-theory-card="${escapeHtml(anchor)}"` : ""}>${inlineMarkdown(title, resourceBaseUrl)}</h${level}>`);
        if (level === 2 || level === 3) headings.push({ id, level, title: title.replace(/<!--.*?-->/g, "").trim() });
        if (anchor && cardsBySlug.has(anchor) && renderTheoryCard) {
          output.push(cardsBySlug.get(anchor).map(renderTheoryCard).join(""));
        }
        continue;
      }
      const image = line.trim().match(/^!\[([^\]]*)\]\(([^\s)]+)(?:\s+["'].*?["'])?\)$/);
      if (image) {
        flushParagraph();
        closeList();
        const url = safeUrl(image[2], resourceBaseUrl);
        if (url) output.push(`<figure class="markdown-figure"><img src="${escapeHtml(url)}" alt="${escapeHtml(image[1])}" loading="lazy" decoding="async"></figure>`);
        continue;
      }
      if (line.startsWith("|") && /^\|[-| :]+\|$/.test(lines[index + 1] ?? "")) {
        flushParagraph();
        closeList();
        const headers = tableCells(line, resourceBaseUrl);
        index += 1;
        const rows = [];
        while (index += 1, index < lines.length && lines[index].startsWith("|")) rows.push(tableCells(lines[index], resourceBaseUrl));
        index -= 1;
        output.push(`<div class="table-wrap"><table><thead><tr>${headers.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
        continue;
      }
      const listItem = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
      if (listItem) {
        flushParagraph();
        const [, indentation, marker, text] = listItem;
        const level = Math.floor(indentation.length / 2);
        const type = marker === "-" || marker === "*" ? "ul" : "ol";
        while (listStack.length && listStack.at(-1).level > level) {
          const { type: closedType } = listStack.pop();
          output.push(`</li></${closedType}>`);
        }
        const current = listStack.at(-1);
        if (current?.level === level && current.type === type) output.push("</li>");
        else if (current?.level === level) {
          const { type: closedType } = listStack.pop();
          output.push(`</li></${closedType}>`);
        }
        if (!listStack.length || listStack.at(-1).level < level || listStack.at(-1).type !== type) {
          output.push(`<${type}>`);
          listStack.push({ type, level });
        }
        output.push(`<li>${inlineMarkdown(text, resourceBaseUrl)}`);
        continue;
      }
      if (line.startsWith("> ")) {
        flushParagraph();
        closeList();
        output.push(`<blockquote>${inlineMarkdown(line.slice(2), resourceBaseUrl)}</blockquote>`);
        continue;
      }
      if (line.trim() === "") {
        flushParagraph();
        closeList();
        continue;
      }
      paragraph.push(line.replace(/<!--.*?-->/g, "").trim());
    }
    flushParagraph();
    closeList();
    return { html: output.join("\n"), headings };
  };
}
