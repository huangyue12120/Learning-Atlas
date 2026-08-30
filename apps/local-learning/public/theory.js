import hljs from "/vendor/highlight/es/core.js";
import bash from "/vendor/highlight/es/languages/bash.min.js";
import json from "/vendor/highlight/es/languages/json.min.js";
import python from "/vendor/highlight/es/languages/python.min.js";
import yaml from "/vendor/highlight/es/languages/yaml.min.js";
import { createMarkdownRenderer, escapeHtml } from "/markdown.js";
import { applyTheme, observeSystemTheme, saveTheme, themePreference, themeSelect } from "/theme.js";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("python", python);
hljs.registerLanguage("yaml", yaml);

const app = document.querySelector("#app");
const theoryId = new URLSearchParams(window.location.search).get("theoryId") ?? "";
const renderMarkdown = createMarkdownRenderer({ hljs });
let drawerOpen = false;
let sectionObserver;

applyTheme();
observeSystemTheme();

async function request(path) {
  const response = await fetch(path);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "请求失败");
  return data;
}

function chapterNavigation(chapters) {
  return chapters.map((chapter) => {
    const currentChapter = chapter.notes.some((note) => note.theoryId === theoryId);
    const notes = chapter.notes.map((note) => {
      const current = note.theoryId === theoryId;
      const external = note.readKind === "external";
      return `<a class="theory-note-link${current ? " current" : ""}" href="${escapeHtml(note.readUrl)}"${external ? ' target="_blank" rel="noreferrer"' : ""}${current ? ' aria-current="page"' : ""}><span>${escapeHtml(note.position)} ${escapeHtml(note.title)}</span><small>${note.readLanguage === "zh" ? "中文" : "English"}</small></a>`;
    }).join("");
    return `<details class="theory-chapter"${currentChapter ? " open" : ""}><summary><span>${escapeHtml(chapter.position)}</span><strong>${escapeHtml(chapter.title)}</strong><small>${chapter.notes.length} 节</small></summary><div>${notes}</div></details>`;
  }).join("");
}

function tableOfContents(headings) {
  if (!headings.length) return "";
  return `<nav class="theory-toc" aria-label="本篇目录"><strong>本篇目录</strong><ol>${headings.map((heading) => `<li class="level-${heading.level}"><a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.title)}</a></li>`).join("")}</ol></nav>`;
}

function activateTableOfContents() {
  sectionObserver?.disconnect();
  const links = [...document.querySelectorAll(".theory-toc a")];
  const headings = [...document.querySelectorAll(".theory-prose h2, .theory-prose h3")];
  if (!links.length || !headings.length || !("IntersectionObserver" in window)) return;
  const setCurrent = (heading) => links.forEach((link) =>
    link.toggleAttribute("aria-current", link.getAttribute("href") === `#${heading.id}`));
  setCurrent(headings[0]);
  sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting)
      .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
    if (visible) setCurrent(visible.target);
  }, { rootMargin: "-18% 0px -70% 0px" });
  headings.forEach((heading) => sectionObserver.observe(heading));
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const fallback = document.createElement("textarea");
  fallback.value = value;
  fallback.setAttribute("readonly", "");
  fallback.style.position = "fixed";
  fallback.style.opacity = "0";
  document.body.append(fallback);
  fallback.select();
  document.execCommand("copy");
  fallback.remove();
}

function setDrawer(open) {
  const wasOpen = drawerOpen;
  drawerOpen = open;
  document.body.classList.toggle("theory-drawer-open", open);
  const button = document.querySelector(".theory-nav-toggle");
  const navigation = document.querySelector(".theory-nav");
  const mobile = window.matchMedia("(max-width: 1023px)").matches;
  button?.setAttribute("aria-expanded", String(open));
  navigation?.setAttribute("aria-hidden", String(mobile && !open));
  navigation?.toggleAttribute("inert", mobile && !open);
  if (!open && wasOpen) window.requestAnimationFrame(() => button?.focus({ preventScroll: true }));
}

function renderError(message) {
  document.title = "理论课程 | Learning Atlas";
  app.innerHTML = `<main class="page-state" id="main-content"><p>理论课程暂时无法打开。</p><h1>${escapeHtml(message)}</h1><div class="page-state-actions"><button type="button" data-retry>重试</button><a href="/#theory-course">返回理论目录</a></div></main>`;
}

async function loadTheory() {
  if (!theoryId) throw new Error("缺少 theoryId");
  const [curriculum, content] = await Promise.all([
    request("/api/curriculum"),
    request(`/api/theory/content?theoryId=${encodeURIComponent(theoryId)}`)
  ]);
  const chapter = curriculum.theory.find((item) => item.notes.some((note) => note.theoryId === theoryId));
  if (!chapter) throw new Error("理论条目不存在");
  const body = content.markdown.replace(/^\s*#\s+.+\n+/, "");
  const rendered = renderMarkdown(body, { resourceBaseUrl: new URL(content.resourceBaseUrl, window.location.origin).href });
  const reviewedRevision = content.source.reviewedRevision ?? content.source.revision;
  document.title = `${content.title} | Learning Atlas`;
  app.innerHTML = `
    <div class="theory-reader-shell">
      <header class="reader-header">
        <a class="brand" href="/">Learning Atlas</a>
        <nav aria-label="主要导航"><a href="/learn">实践主线</a><a href="/#theory-course" aria-current="page">理论课程</a></nav>
        <div class="reader-header-actions"><button type="button" class="theory-nav-toggle" aria-expanded="false" aria-controls="theory-navigation">章节</button>${themeSelect(themePreference(), "theory-theme-select")}</div>
      </header>
      <button type="button" class="theory-nav-scrim" aria-label="关闭章节导航"></button>
      <nav id="theory-navigation" class="theory-nav" aria-label="理论章节导航">
        <div class="theory-nav-heading"><a href="/#theory-course">完整理论课程</a><button type="button" class="theory-nav-close">关闭</button></div>
        ${chapterNavigation(curriculum.theory)}
      </nav>
      <main id="main-content" class="theory-reading-area">
        <article class="theory-article">
          <header class="theory-article-header">
            <p>${escapeHtml(chapter.title)} / ${escapeHtml(content.source.path)}</p>
            <h1>${escapeHtml(content.title)}</h1>
            <div class="theory-source-meta"><span>中文全文已审核</span><span>跟踪上游 main</span><span>审核快照 ${escapeHtml(reviewedRevision)}</span></div>
            <div class="theory-source-links"><a href="${escapeHtml(content.sourceUrl)}" target="_blank" rel="noreferrer">查看上游 main 原文</a></div>
          </header>
          ${tableOfContents(rendered.headings)}
          <div class="markdown-content theory-prose">${rendered.html}</div>
        </article>
      </main>
    </div>`;
  setDrawer(false);
  activateTableOfContents();
}

app.addEventListener("change", (event) => {
  if (event.target.id === "theory-theme-select") saveTheme(event.target.value);
});

app.addEventListener("click", async (event) => {
  const retry = event.target.closest("[data-retry]");
  if (retry) {
    window.location.reload();
    return;
  }
  if (event.target.closest(".theory-nav-toggle")) {
    setDrawer(!drawerOpen);
    return;
  }
  if (event.target.closest(".theory-nav-close, .theory-nav-scrim")) {
    setDrawer(false);
    return;
  }
  const copyButton = event.target.closest("[data-copy-code]");
  if (!copyButton) return;
  const code = document.getElementById(copyButton.dataset.copyCode);
  const status = copyButton.parentElement.querySelector(".copy-status");
  try {
    await copyText(code?.textContent ?? "");
    status.textContent = "已复制";
  } catch {
    status.textContent = "复制失败";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && drawerOpen) setDrawer(false);
});

window.addEventListener("resize", () => setDrawer(drawerOpen && window.matchMedia("(max-width: 1023px)").matches));

loadTheory().catch((error) => renderError(error.message));
