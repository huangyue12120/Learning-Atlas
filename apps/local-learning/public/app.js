import { streamTutor } from "/tutor-stream.js";
import mermaid from "/vendor/mermaid/mermaid.esm.min.mjs";
import hljs from "/vendor/highlight/es/core.js";
import bash from "/vendor/highlight/es/languages/bash.min.js";
import dockerfile from "/vendor/highlight/es/languages/dockerfile.min.js";
import ini from "/vendor/highlight/es/languages/ini.min.js";
import json from "/vendor/highlight/es/languages/json.min.js";
import markdown from "/vendor/highlight/es/languages/markdown.min.js";
import python from "/vendor/highlight/es/languages/python.min.js";
import yaml from "/vendor/highlight/es/languages/yaml.min.js";
import { createMarkdownRenderer, escapeHtml } from "/markdown.js";
import { renderTheoryCard } from "/theory-card.js";
import { applyTheme, saveTheme, themeSelect, themePreference as getThemePreference, observeSystemTheme, mermaidTheme } from "/theme.js";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("dockerfile", dockerfile);
hljs.registerLanguage("ini", ini);
hljs.registerLanguage("json", json);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("python", python);
hljs.registerLanguage("yaml", yaml);

const app = document.querySelector("#app");
let lesson;
let state;
let notes = [];
let content;
let sectionObserver;
let mermaidDiagramIndex = 0;
let notesOpen = false;
let navigatorOpen = false;
let tutorOpen = false;
let reviewOpen = false;
let tutorWidth = 336;
let navigatorWidth = 256;
let readingPosition = 0;
let shouldRestoreReadingPosition = false;
let readingPositionTimer;
let modelConfig = { baseUrl: "", model: "", apiKeyConfigured: false };
let discoveredModels = [];
let tutorMessages = [];
let activeSectionTitle = "本课概览";
let activeTheoryCardSlug = "";
let tutorStatus = "";
let tutorRequest = null;
let reviewItems = [];
let quiz = { status: "unavailable", questions: [] };
let quizResult = null;
let course = [];
let renderedLessonId;
let modelConfigChanged = false;
let loadSequence = 0;
let draftTimer;
const draftCache = new Map();
const draftWrites = new Map();
let draft = { noteText: "", tutorText: "", reviewText: "", answers: {}, predictions: {}, openCards: [], fingerprint: "" };
let navigatorFilter = "";

let selectedLessonId = new URLSearchParams(window.location.search).get("lessonId") ??
  null;
let themePreference = getThemePreference();
const themePreferences = ["system", "light", "dark"];
function configureMermaid() { mermaid.initialize(mermaidTheme()); }
function applyThemePreference() { applyTheme(themePreference); configureMermaid(); }
applyThemePreference();
observeSystemTheme(() => { configureMermaid(); if (lesson) void renderMermaidDiagrams(); });

const panelControls = {
  tutor: { panel: "#tutor-panel", heading: "#tutor-title", trigger: ".tutor-toggle" },
  notes: { panel: "#notes-panel", heading: "#notes-title", trigger: ".notes-toggle" },
  review: { panel: "#review-panel", heading: "#review-title", trigger: ".review-toggle" }
};

function activePanelKind() {
  if (tutorOpen) return "tutor";
  if (notesOpen) return "notes";
  if (reviewOpen) return "review";
  return null;
}

function isPanelOpen(kind) {
  return kind === "tutor" ? tutorOpen : kind === "notes" ? notesOpen : reviewOpen;
}

function setPanelOpen(kind, open) {
  if (kind === "tutor") tutorOpen = open;
  if (kind === "notes") notesOpen = open;
  if (kind === "review") reviewOpen = open;
}

function focusPanel(kind) {
  const control = panelControls[kind];
  const panel = document.querySelector(control.panel);
  const target = document.querySelector(control.heading) ?? panel?.querySelector("button, textarea, input, select");
  target?.focus({ preventScroll: true });
}

function focusPanelTrigger(kind) {
  document.querySelector(panelControls[kind].trigger)?.focus({ preventScroll: true });
}

function toggleAuxiliaryPanel(kind) {
  const opening = !isPanelOpen(kind);
  if (opening) {
    notesOpen = kind === "notes";
    tutorOpen = kind === "tutor";
    reviewOpen = kind === "review";
    navigatorOpen = false;
  } else {
    setPanelOpen(kind, false);
  }
  syncPanelUI();
  if (opening) focusPanel(kind); else focusPanelTrigger(kind);
}

function desktopOverlayActive() {
  return window.matchMedia("(max-width: 1104px)").matches;
}

window.addEventListener("resize", () => {
  syncPanelUI();
});

function modalPanel() {
  if (navigatorOpen && window.matchMedia("(max-width: 900px)").matches) return document.querySelector("#course-navigator");
  const kind = activePanelKind();
  return kind && desktopOverlayActive() ? document.querySelector(panelControls[kind].panel) : null;
}

function syncPanelUI() {
  const shell = document.querySelector(".shell");
  if (!shell) return;
  shell.classList.toggle("notes-open", notesOpen);
  shell.classList.toggle("tutor-open", tutorOpen);
  shell.classList.toggle("review-open", reviewOpen);
  shell.classList.toggle("navigator-open", navigatorOpen);
  for (const kind of ["notes", "tutor", "review"]) {
    document.querySelector(panelControls[kind].panel).hidden = !isPanelOpen(kind);
    document.querySelector(panelControls[kind].trigger)?.setAttribute("aria-expanded", String(isPanelOpen(kind)));
  }
  const mobile = window.matchMedia("(max-width: 900px)").matches;
  document.querySelector("#course-navigator").hidden = mobile && !navigatorOpen;
  document.querySelector(".navigator-toggle").setAttribute("aria-expanded", String(navigatorOpen));
  const scrim = document.querySelector("#panel-scrim");
  scrim.hidden = !activePanelKind() || !desktopOverlayActive();
  scrim.dataset.action = activePanelKind() ?? "tutor";
  document.querySelector(".navigator-scrim").hidden = !navigatorOpen || !mobile;
  syncPanelAccessibility();
}

function syncPanelAccessibility() {
  const panel = modalPanel();
  document.querySelectorAll(".topbar, .navigator, .lesson, .notes, .review-panel, .tutor").forEach(element => {
    element.inert = Boolean(panel && element !== panel);
    if (panel && element !== panel) element.setAttribute("aria-hidden", "true"); else element.removeAttribute("aria-hidden");
    if (element === panel) { element.setAttribute("role", "dialog"); element.setAttribute("aria-modal", "true"); }
    else { element.removeAttribute("role"); element.removeAttribute("aria-modal"); }
  });
}

function trapAuxiliaryPanelFocus(event) {
  if (event.key !== "Tab") return;
  const panel = modalPanel();
  if (!panel) return;
  const focusable = [...panel.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex='-1'])")]
    .filter(element => element.getClientRects().length && !element.closest("[hidden]"));
  const index = focusable.indexOf(document.activeElement);
  if (!focusable.length) return;
  if (event.shiftKey && index <= 0) { event.preventDefault(); focusable.at(-1).focus(); }
  else if (!event.shiftKey && (index === focusable.length - 1 || index === -1)) { event.preventDefault(); focusable[0].focus(); }
}

async function request(path, options) {
  const response = await fetch(path, options);
  let data;
  try { data = await response.json(); } catch { throw new Error("本地服务返回了无法读取的响应，请重试。"); }
  if (!response.ok) throw new Error(data?.error ?? `请求失败（${response.status}）`);
  return data;
}

function lessonApi(path, lessonId = lesson?.id ?? selectedLessonId) {
  if (!lessonId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}lessonId=${encodeURIComponent(lessonId)}`;
}

function mermaidDiagram(source) {
  const id = `mermaid-diagram-${mermaidDiagramIndex += 1}`;
  return `<figure class="concept-diagram"><div class="mermaid-diagram" data-mermaid-id="${id}" data-mermaid-source="${encodeURIComponent(source)}" aria-busy="true"><p>正在生成图示…</p></div><figcaption>课程图示</figcaption></figure>`;
}

function figureDirective(name) {
  if (name !== "eigen-directions") return `<figure class="concept-diagram"><figcaption>图示：${escapeHtml(name)}</figcaption></figure>`;
  return `<figure class="concept-diagram eigen-directions"><svg viewBox="0 0 360 190" role="img" aria-labelledby="eigen-title eigen-description"><title id="eigen-title">二维变换的特征方向</title><desc id="eigen-description">椭圆表示变换后的空间；两条穿过原点的箭头表示保持方向不变的特征向量。</desc><defs><marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="currentColor"/></marker></defs><ellipse cx="180" cy="96" rx="124" ry="54" fill="none" stroke="currentColor" stroke-width="2" opacity=".45"/><line x1="48" y1="96" x2="314" y2="96" stroke="currentColor" stroke-width="2" marker-end="url(#arrowhead)"/><line x1="119" y1="151" x2="246" y2="41" stroke="currentColor" stroke-width="2" marker-end="url(#arrowhead)"/><circle cx="180" cy="96" r="4" fill="currentColor"/><text x="278" y="85">特征方向 1</text><text x="202" y="47">特征方向 2</text></svg><figcaption>特征方向在矩阵变换后仍保持原来的方向，只改变长度。</figcaption></figure>`;
}

const renderMarkdown = createMarkdownRenderer({
  hljs,
  renderMermaid: mermaidDiagram,
  renderFigure: figureDirective,
  renderTheoryCard
});

function publishedMarkdown() {
  if (content.translationStatus !== "reviewed") {
    return { html: `<section class="content-unavailable"><h2>译文需要同步</h2><p>上游内容已变化或当前译文尚未审核。阅读器不会显示可能过期的内容。</p></section>`, headings: [] };
  }
  const firstSection = content.markdown.indexOf("## 学习目标");
  const body = firstSection >= 0 ? content.markdown.slice(firstSection) : content.markdown.replace(/^\s*# [^\n]+(?:\n|$)/, "");
  return renderMarkdown(body, { cards: content.theoryCards, resourceBaseUrl: lesson.sourceUrl.replace(/[^/]+$/, ""), imageBaseUrl: new URL(content.resourceBaseUrl, location.origin).href });
}

function tableOfContents(headings) {
  if (!headings.length) return "";
  return `<nav class="reader-toc" aria-label="本课目录"><div class="reader-progress"><label for="reading-progress">阅读进度 <span id="reading-percent">0%</span></label><progress id="reading-progress" max="100" value="0"></progress></div><details open><summary>本课目录</summary><ol id="course-toc">${headings.map(({ id, title }) => `<li><a class="reader-toc-tab" href="#${escapeHtml(id)}" aria-label="前往：${escapeHtml(title)}"><span class="reader-toc-marker" aria-hidden="true"></span><span class="reader-toc-summary">${escapeHtml(title)}</span></a></li>`).join("")}</ol></details></nav>`;
}

function activateTableOfContents() {
  sectionObserver?.disconnect();
  const links = [...document.querySelectorAll("#course-toc a")];
  const headings = [...document.querySelectorAll(".markdown-content h2, .markdown-content h3")];
  if (!links.length || !headings.length || !("IntersectionObserver" in window)) return;
  const setCurrent = (heading) => {
    links.forEach((link) => link.toggleAttribute("aria-current", link.getAttribute("href") === `#${heading.id}`));
    activeSectionTitle = heading.textContent;
    activeTheoryCardSlug = heading.dataset.theoryCard ?? "";
    const theoryCard = content.theoryCards.find((card) => card.slug === activeTheoryCardSlug);
    const evidence = document.querySelector("#tutor-evidence");
    if (evidence) evidence.textContent = `当前证据：${activeSectionTitle}${theoryCard ? `；${theoryCard.title}` : "；当前课程"}。`;
  };
  setCurrent(headings[0]);
  sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
    if (visible) setCurrent(visible.target);
  }, { rootMargin: "-22% 0px -68% 0px" });
  headings.forEach((heading) => sectionObserver.observe(heading));
}

async function renderMermaidDiagrams() {
  const diagrams = [...document.querySelectorAll("[data-mermaid-source]")];
  await Promise.all(diagrams.map(async (element) => {
    const source = decodeURIComponent(element.dataset.mermaidSource);
    try {
      const { svg, bindFunctions } = await mermaid.render(element.dataset.mermaidId, source);
      element.innerHTML = svg;
      element.removeAttribute("aria-busy");
      bindFunctions?.(element);
    } catch (error) {
      element.removeAttribute("aria-busy");
      element.innerHTML = "";
      const message = document.createElement("p");
      message.className = "diagram-error";
      message.textContent = "图示无法生成；以下为课程中的 Mermaid 源码。";
      const fallback = document.createElement("pre");
      fallback.textContent = source;
      element.append(message, fallback);
    }
  }));
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
  const copied = document.execCommand("copy");
  fallback.remove();
  if (!copied) throw new Error("Clipboard unavailable");
}

function updateStreamingView() {
  const active = tutorRequest && tutorRequest.lessonId === lesson?.id;
  document.querySelectorAll("#tutor-form button[type='submit']").forEach(button => { button.disabled = Boolean(active); });
  const stop = document.querySelector("[data-stop-tutor]");
  if (stop) stop.hidden = !active;
  let preview = document.querySelector(".tutor-streaming");
  if (!active) { preview?.remove(); return; }
  if (!preview) {
    preview = document.createElement("article"); preview.className = "tutor-message assistant tutor-streaming";
    preview.innerHTML = '<strong>学习助理（生成中，尚未保存）</strong><p></p>';
    document.querySelector(".tutor-messages").append(preview);
  }
  preview.querySelector("p").textContent = tutorRequest.text;
}

function attachQuizEvidence() {
  for (const result of quizResult?.results ?? []) {
    if (!result.reference) continue;
    const id = `evidence-${result.id}`;
    if (document.getElementById(id)) continue;
    const heading = document.getElementById(result.reference.headingId);
    const normalize = text => text.replace(/[`*_\s]/g, "");
    const quote = normalize(result.reference.quote);
    let element = heading?.nextElementSibling, target;
    while (element && !/^H[1-6]$/.test(element.tagName)) {
      target = [...element.querySelectorAll("p, li, td, th, pre > code"), element].find(candidate => normalize(candidate.textContent).includes(quote));
      if (target) break;
      element = element.nextElementSibling;
    }
    if (target) {
      const anchor = document.createElement("span"); anchor.id = id; anchor.className = "evidence-anchor"; anchor.tabIndex = -1;
      if (["LI", "TD", "TH"].includes(target.tagName)) target.prepend(anchor);
      else target.before(anchor);
    } else {
      const link = [...document.querySelectorAll("[data-evidence-question]")].find(link => link.dataset.evidenceQuestion === result.id);
      if (link) { link.href = heading ? `#${heading.id}` : "#lesson-body"; link.textContent = heading ? "回看相关小节" : "回看本课正文"; }
    }
  }
}

function questionOptions(question, prefix) {
  return question.options.map((option, index) => `<label><input type="radio" name="${prefix}-${escapeHtml(question.id)}" value="${index}"> <span>${escapeHtml(option)}</span></label>`).join("");
}
function predictionMarkup() {
  const questions = quiz.questions.filter(question => question.stage === "pre");
  if (!questions.length) return "";
  return `<section class="prediction" aria-labelledby="prediction-title"><p class="eyebrow">读前预测 · 不计分</p><h2 id="prediction-title">先记录你的直觉</h2><p>先选一个答案，读完后与自测对照。预测不会改变得分或学习状态。</p><form id="prediction-form">${questions.map(question => `<fieldset><legend>${escapeHtml(question.question)}</legend>${questionOptions(question, "prediction")}</fieldset>`).join("")}</form></section>`;
}
function quizFeedback() {
  if (!quizResult) return "";
  return `<section class="quiz-result" aria-live="polite"><p>本次得分：<strong>${quizResult.score} / ${quizResult.total}</strong></p>${quizResult.results.map((result, index) => {
    const question = quiz.questions[index];
    const prediction = draft.predictions[question.id];
    const added = reviewItems.some(item => item.text === question.question.slice(0, 1000));
    return `<article class="${result.correct ? "correct" : "incorrect"}"><strong>第 ${index + 1} 题：${result.correct ? "✓ 回答正确" : "△ 需要回顾"}</strong><p>正确选项：${escapeHtml(question.options[result.correctOption] ?? "")}</p><p>${escapeHtml(result.explanation)}</p>${prediction !== undefined ? `<p>你读前选择：${escapeHtml(question.options[prediction])}</p>` : ""}${result.correct ? "" : `<button type="button" data-review-question-id="${escapeHtml(question.id)}"${added ? " disabled" : ""}>${added ? "已加入待复习" : "将本题加入待复习"}</button>`}<a data-evidence-question="${escapeHtml(question.id)}" href="${result.reference ? `#evidence-${escapeHtml(question.id)}` : "#lesson-body"}">${result.reference ? "回看相关段落" : "回看本课正文"}</a></article>`;
  }).join("")}<button type="button" data-quiz-reset>重新作答</button></section>`;
}
function quizMarkup() {
  if (quiz.status !== "reviewed") return "";
  return `<section class="quiz" aria-labelledby="quiz-title"><p class="eyebrow">本课自测</p><h2 id="quiz-title">检验你的理解</h2><p class="quiz-intro">本课共 ${quiz.questions.length} 题；课末完整作答计分，结果保存在此设备。</p><form id="quiz-form" novalidate>${quiz.questions.map((question, index) => `<fieldset tabindex="-1"><legend>${index + 1}. <small>${({ pre: "读前 pre", check: "检查 check", post: "课后 post" })[question.stage] ?? "检查"}</small> ${escapeHtml(question.question)}</legend>${questionOptions(question, "quiz")}</fieldset>`).join("")}<button>提交自测</button><p id="quiz-status" role="status"></p></form>${quizFeedback()}</section>`;
}
function inlineConfirm(button, text) {
  return new Promise(resolve => {
    const row = document.createElement("div"); row.className = "inline-confirm";
    row.innerHTML = `<p>${escapeHtml(text)}</p><button type="button" data-confirm-yes>确认</button><button type="button" data-confirm-no>取消</button>`;
    button.insertAdjacentElement("afterend", row);
    row.querySelector("[data-confirm-no]").focus();
    row.addEventListener("click", event => {
      if (!event.target.matches("button")) return;
      const yes = event.target.hasAttribute("data-confirm-yes"); row.remove(); button.focus(); resolve(yes);
    });
  });
}
let undoTimer;
function showUndo(undo, message) {
  clearTimeout(undoTimer);
  const status = document.querySelector("#undo-status");
  status.innerHTML = `${escapeHtml(message)} <button type="button" data-undo-token="${escapeHtml(undo.token)}" data-undo-scope="${escapeHtml(undo.scope)}">撤销（60 秒）</button>`;
  undoTimer = setTimeout(() => { status.textContent = `${message} 撤销时限已过。`; }, Math.max(0, undo.expiresAt - Date.now()));
}
async function reloadRestoredLesson() {
  clearTimeout(draftTimer); clearTimeout(readingPositionTimer);
  const id = lesson.id; lesson = null; renderedLessonId = null; draftCache.clear();
  await loadLesson(id, "none");
}

function render() {
  const changingLesson = renderedLessonId !== lesson.id;
  const lessonContent = changingLesson ? publishedMarkdown() : { html: "", headings: [] };
  const isSetupCourse = lesson.phaseSlug === "00-setup-and-tooling";
  const lessonLede = content.markdown.slice(content.markdown.indexOf("# ")).match(/^>\s+(.+)$/m)?.[1]?.replace(/[*`]/g, "") ?? "阅读课程，完成实践，记录你的理解与疑问。";
  const practiceTitle = isSetupCourse ? "把配置变成可复用的本地工作流" : "把理解变成可运行的代码";
  const practiceDescription = isSetupCourse
    ? "本课的 Python 示例会复制到你的私人工作区；配置和其他工具操作仍以课程中的原始步骤为准。"
    : "工作区与探索笔记都只保存在此设备，不会修改上游课程。";
  const notePlaceholder = "用自己的话记录本课的理解或疑问。";
  const tutorPlaceholder = "描述你在本课遇到的问题，以及已经尝试的步骤。";
  const completedLabel = state.completed ? "已标记理解" : "我理解了";
  const reviewLabel = state.review ? "已加入待复习" : "仍需复习";
  const notesToggleLabel = notesOpen ? "收起笔记" : `笔记${notes.length ? `（${notes.length}）` : ""}`;
  const tutorToggleLabel = tutorOpen ? "收起助理" : "学习助理";
  const reviewToggleLabel = reviewOpen ? "收起复习" : `复习${reviewItems.length ? `（${reviewItems.length}）` : ""}`;
  const themeControl = themeSelect(themePreference, "theme-select");
  const noteList = notes.length
    ? notes.map((note) => `<article class="note"><p>${escapeHtml(note.text)}</p><button type="button" data-delete-note="${note.id}">删除笔记</button><time datetime="${note.createdAt}">${new Date(note.createdAt).toLocaleString("zh-CN")}</time></article>`).join("")
    : "<p class=\"empty\">尚无笔记。用自己的话记录一个理解或疑问。</p>";
  const reviewList = reviewItems.length
    ? `<ul class="review-item-list">${reviewItems.map((item) => `<li><span>${escapeHtml(item.text)}</span><button type="button" data-delete-review="${item.id}">删除</button><button type="button" class="review-item-resolve" data-review-item-id="${item.id}">已复习</button></li>`).join("")}</ul>`
    : "<p class=\"empty\">尚无确认的待复习点。</p>";
  const progressMeta = {
    "not-started": { label: "○ 未开始", className: "not-started" },
    "in-progress": { label: "◐ 学习中", className: "in-progress" },
    understood: { label: "✓ 已理解", className: "understood" },
    review: { label: "△ 需复习", className: "review" }
  };
  const courseNavigation = course.map((phase) => {
    const publishedCourseCount = phase.lessons.filter((item) => item.available).length;
    const startedCourseCount = phase.lessons.filter((item) => item.progress !== "not-started").length;
    const nextLesson = phase.lessons.find((item) => item.progress !== "understood");
    const phaseProgress = nextLesson ? `进行至 ${nextLesson.position}` : "已完成";
    const lessons = phase.lessons.map((item) => {
      const progress = progressMeta[item.progress] ?? progressMeta["not-started"];
      return item.available
      ? `<a class="course-lesson ${progress.className}${item.id === lesson.id ? " current" : ""}" href="${item.id === lesson.id ? "#lesson" : `/learn?lessonId=${encodeURIComponent(item.id)}#lesson`}"${item.id === lesson.id ? ' aria-current="page"' : ' data-lesson-id="' + escapeHtml(item.id) + '"'}><span class="course-lesson-title">${escapeHtml(item.position)} ${escapeHtml(item.title)}</span><small class="course-progress-label">${progress.label}</small></a>`
      : `<span class="course-unavailable" aria-label="${escapeHtml(item.position)} ${escapeHtml(item.title)}，待审核发布">${escapeHtml(item.position)} ${escapeHtml(item.title)}<small>${({ stale: "待同步", untranslated: "待中文适配", staged: "Phase 19 待接入" })[item.publicationStatus] ?? "待审核发布"}</small></span>`
    }).join("");
    return `<details class="phase-group"${phase.slug === lesson.phaseSlug ? " open" : ""}><summary><span>${escapeHtml(phase.title)}<small>${startedCourseCount} / ${phase.lessons.length} 已学习 · ${phaseProgress}</small></span><small>${publishedCourseCount} / ${phase.lessons.length} 已发布</small></summary><div class="phase-lessons">${lessons}</div></details>`;
  }).join("");
  const quizPanel = quizMarkup();
  const translationLabel = content.translationStatus === "reviewed" ? "已审核" : "待同步";
  const modelNameControl = discoveredModels.length
    ? `<div id="model-name-control"><label for="model-name">模型名</label><select id="model-name" name="model" required>${discoveredModels.map((name) => `<option value="${escapeHtml(name)}"${name === modelConfig.model ? " selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select></div>`
    : `<div id="model-name-control"><label for="model-name">模型名</label><input id="model-name" name="model" required value="${escapeHtml(modelConfig.model)}" placeholder="你的模型名"></div>`;
  const modelConfigForm = `<form id="model-config-form"><label for="model-base-url">兼容接口地址</label><input id="model-base-url" name="baseUrl" type="url" required value="${escapeHtml(modelConfig.baseUrl)}" placeholder="http://127.0.0.1:11434/v1"><label for="model-api-key">API key（可选）</label><input id="model-api-key" name="apiKey" type="password" autocomplete="new-password" placeholder="${modelConfig.apiKeyConfigured ? "已保存；留空保持不变" : "本机可选保存"}">${modelConfig.apiKeyConfigured ? '<label class="tutor-clear-key"><input name="clearApiKey" type="checkbox">清除已保存的 key</label>' : ""}<button type="button" id="discover-models">获取模型名称</button><p id="model-list-status" role="status"></p>${modelNameControl}<button type="submit">保存连接</button><p class="tutor-config-note">连接和 key 仅保存在此设备的学习数据库中。</p></form>`;
  const tutorMessagesHtml = tutorMessages.length
    ? `<div class="tutor-conversation-actions"><span>本课对话</span><button type="button" class="tutor-clear-history" data-clear-tutor>清空本课对话</button></div>${tutorMessages.map((message) => `<article class="tutor-message ${message.role}"><div class="tutor-message-heading"><strong>${message.role === "user" ? "你" : "学习助理"}</strong><button type="button" class="tutor-message-delete" data-tutor-message-id="${message.id}" aria-label="删除这条${message.role === "user" ? "用户" : "助理"}消息">删除</button></div><p>${escapeHtml(message.text)}</p></article>`).join("")}`
    : '<p class="empty">配置后，从一个具体疑问开始。助理会先提问并给出最小提示。</p>';
  const next = document.createElement("div");
  next.innerHTML = `
    <div class="shell${notesOpen ? " notes-open" : ""}${tutorOpen ? " tutor-open" : ""}${reviewOpen ? " review-open" : ""}${navigatorOpen ? " navigator-open" : ""}" style="--navigator-width: ${navigatorWidth}px${tutorOpen ? `; --tutor-width: ${tutorWidth}px` : ""}">
      <div id="undo-status" role="status" aria-live="polite"></div><header class="topbar"><a class="brand" href="/">Learning Atlas</a><button type="button" class="navigator-toggle" data-action="navigator" aria-expanded="${navigatorOpen}" aria-controls="course-navigator">课程目录</button><span>本地优先 · 学习数据仅保存在此设备</span><div class="topbar-actions">${themeControl}<button type="button" class="tutor-toggle" data-action="tutor" aria-expanded="${tutorOpen}" aria-controls="tutor-panel">${tutorToggleLabel}</button><button type="button" class="notes-toggle" data-action="notes" aria-expanded="${notesOpen}" aria-controls="notes-panel">${notesToggleLabel}</button></div></header>
      <button type="button" class="navigator-scrim" data-action="navigator" aria-label="关闭课程目录" hidden tabindex="-1"></button>
      <nav id="course-navigator" class="navigator" aria-label="课程导航"><div class="navigator-resizer" role="separator" aria-label="调整实践主线宽度" aria-orientation="vertical" aria-valuemin="224" aria-valuemax="384" aria-valuenow="${navigatorWidth}" tabindex="0"></div><button class="navigator-close" type="button" data-action="navigator">关闭目录</button><p>实践主线</p><label for="course-filter">筛选课程</label><input id="course-filter" type="search" placeholder="课程名称或状态" value="${escapeHtml(navigatorFilter)}">${courseNavigation}</nav>
      <main id="lesson" class="lesson">
        <p class="eyebrow">${escapeHtml(lesson.phase)} / ${escapeHtml(lesson.position)}</p>
        <h1>${escapeHtml(lesson.title)}</h1>
        <p class="original-title">${escapeHtml(lesson.originalTitle)}</p>
        <p class="lede">${escapeHtml(lessonLede)}</p>
        <dl class="metadata"><div><dt>预计学习</dt><dd>${escapeHtml(lesson.duration)}</dd></div><div><dt>译文状态</dt><dd>${translationLabel}</dd></div></dl>
        ${predictionMarkup()}<div class="markdown-content" id="lesson-body">${lessonContent.html}</div>
        <section class="notice"><p class="eyebrow">本地实践</p><h2>${practiceTitle}</h2><p>${practiceDescription}</p><div class="actions">${lesson.resources.workspace ? '<button type="button" data-action="workspace">在 VS Code 中继续</button>' : ""}${lesson.resources.exploration ? '<button type="button" data-action="exploration">用 marimo 探索</button>' : ""}</div><p id="tool-status" role="status"></p><a href="${escapeHtml(lesson.sourceUrl)}" target="_blank" rel="noreferrer">查看锁定版本的原始课程</a></section>
        <section class="reflection" aria-labelledby="reflection-title"><p class="eyebrow">学习状态</p><h2 id="reflection-title">完成本课后，你能用自己的话解释关键概念并完成相应练习吗？</h2><div class="actions"><button type="button" data-state="completed" aria-pressed="${state.completed}">${completedLabel}</button><button type="button" data-state="review" aria-pressed="${state.review}">${reviewLabel}</button></div></section>
      ${lessonNavigation()}<p id="draft-status" role="status"></p></main>
      <button id="panel-scrim" class="panel-scrim" type="button" data-action="tutor" hidden tabindex="-1" aria-label="关闭辅助面板"></button>
      <aside id="notes-panel" class="notes" aria-labelledby="notes-title"><div class="notes-heading"><div><p class="eyebrow">个人学习数据</p><h2 id="notes-title" tabindex="-1">笔记</h2></div><button type="button" class="notes-close" data-action="notes" aria-label="关闭笔记">关闭</button></div><form id="note-form"><label for="note-text">写下自己的表述</label><textarea id="note-text" name="text" required maxlength="2000" placeholder="${notePlaceholder}"></textarea><button>保存笔记</button><p id="form-status" role="status"></p></form><div class="note-list">${noteList}</div><section class="export-actions" aria-labelledby="backup-title"><h3 id="backup-title">备份与恢复</h3><p>JSON 可恢复学习数据；Markdown 仅用于阅读。恢复会替换课程状态、笔记、对话、复习项和自测记录，但不会修改模型连接或私人工作区。</p><div><a href="/api/export?format=json" download>导出 JSON</a><a href="/api/export?format=markdown" download>导出 Markdown</a></div><form id="import-form"><label for="import-file">导入 JSON 备份</label><input id="import-file" name="file" type="file" accept="application/json,.json" required><button type="submit">导入并替换学习数据</button><p id="import-status" role="status"></p></form></section></aside>
      <aside id="tutor-panel" class="tutor" aria-labelledby="tutor-title" aria-describedby="tutor-evidence"><div class="tutor-resizer" role="separator" aria-label="调整学习助理宽度" aria-orientation="vertical" aria-valuemin="280" aria-valuemax="560" aria-valuenow="${tutorWidth}" tabindex="0"></div><div class="tutor-heading"><div><p class="eyebrow">本地学习助理</p><h2 id="tutor-title" tabindex="-1">一起推理</h2></div><button type="button" data-stop-tutor hidden>停止生成</button><button type="button" class="tutor-close" data-action="tutor" aria-label="关闭学习助理">关闭</button></div><p id="tutor-evidence" class="tutor-evidence">当前证据：${activeSectionTitle}；已批准的上下文理论卡。</p><details class="tutor-config"><summary>模型连接${modelConfig.model ? `：${escapeHtml(modelConfig.model)}` : "（未配置）"}</summary>${modelConfigForm}</details><div class="tutor-messages">${tutorMessagesHtml}</div><form id="tutor-form"><label for="tutor-text">向学习助理说明你的卡点</label><textarea id="tutor-text" name="text" required maxlength="4000" placeholder="${tutorPlaceholder}"></textarea><button type="submit">发送问题</button><p id="tutor-status" role="status" aria-live="polite">${escapeHtml(tutorStatus)}</p></form></aside>
    </div>`;
  next.querySelector(".reflection")?.insertAdjacentHTML("afterend", quizPanel);
  next.querySelector(".lesson .metadata")?.insertAdjacentHTML("afterend", tableOfContents(lessonContent.headings));
  next.querySelector(".topbar-actions")?.insertAdjacentHTML("beforeend", `<button type="button" class="review-toggle" data-action="review" aria-expanded="${reviewOpen}" aria-controls="review-panel">${reviewToggleLabel}</button>`);
  next.querySelector("#tutor-panel")?.insertAdjacentHTML("beforebegin", `<aside id="review-panel" class="review-panel" aria-labelledby="review-title"><div class="review-heading"><div><p class="eyebrow">个人学习数据</p><h2 id="review-title" tabindex="-1">待复习</h2></div><button type="button" class="review-close" data-action="review" aria-label="关闭待复习">关闭</button></div><p class="review-intro">将已经确认的卡点留在这里；完成回顾后再标记为已复习。</p><form id="review-item-form"><label for="review-item-text">用自己的话写下要复习的内容</label><textarea id="review-item-text" name="text" required maxlength="1000" placeholder="写下你希望稍后回顾的问题或概念。"></textarea><button>确认加入待复习</button><p id="review-item-status" role="status"></p></form><div class="review-items">${reviewList}</div></aside>`);
  next.querySelector(".tutor-messages")?.insertAdjacentHTML("afterend", `<p class="tutor-review-link">已经明确了一个卡点？<button type="button" data-action="review" data-review-add="true">在待复习中确认</button></p>`);
  next.querySelector("#tutor-status")?.insertAdjacentHTML("beforebegin", '<button type="submit" class="tutor-explain" data-tutor-mode="explanation">需要完整解释</button>');
  const existing = document.querySelector(".shell");
  if (!existing) app.replaceChildren(...next.childNodes);
  else {
    if (changingLesson) document.querySelector(".lesson").replaceChildren(...next.querySelector(".lesson").childNodes);
    const openPhases = [...document.querySelectorAll(".phase-group[open]")].map(element => element.querySelector("summary").textContent);
    for (const selector of [".navigator", ".note-list", ".review-items", ".tutor-messages", ...(changingLesson ? [] : [".reflection"])]) {
      document.querySelector(selector).replaceChildren(...next.querySelector(selector).childNodes);
    }
    if (!changingLesson) document.querySelectorAll(".phase-group").forEach(element => { element.open = openPhases.includes(element.querySelector("summary").textContent); });
    if (modelConfigChanged) {
      document.querySelector(".tutor-config").replaceChildren(...next.querySelector(".tutor-config").childNodes);
      modelConfigChanged = false;
    }
    if (!changingLesson) document.querySelector(".quiz-result")?.remove();
    const result = changingLesson ? null : next.querySelector(".quiz-result");
    if (result && !changingLesson) document.querySelector(".quiz")?.append(result);
    for (const kind of ["notes", "tutor", "review"]) document.querySelector(panelControls[kind].trigger).textContent = next.querySelector(panelControls[kind].trigger).textContent;
  }
  renderedLessonId = lesson.id;
  if (changingLesson) { restoreDraft(); if (innerWidth <= 900) document.querySelector(".reader-toc details")?.removeAttribute("open"); }
  document.querySelectorAll("form button").forEach(button => { button.disabled = false; });
  document.querySelector("#tutor-status").textContent = tutorStatus;
  document.querySelector("#quiz-status")?.replaceChildren();
  syncPanelUI();
  updateStreamingView();
  attachQuizEvidence();
  filterCourse();
  document.querySelectorAll('.theory-card-action[href^="/theory?"]').forEach(link => {
    const url = new URL(link.href); url.searchParams.set("lessonId", lesson.id); link.href = url.href;
  });
  if (changingLesson) {
    activateTableOfContents();
    const id = lesson.id;
    void renderMermaidDiagrams().finally(() => {
      if (lesson.id !== id || !shouldRestoreReadingPosition) return;
      window.scrollTo(0, readingPosition); shouldRestoreReadingPosition = false;
    });
  }
}

function filterCourse() {
  const value = navigatorFilter.trim().toLowerCase();
  document.querySelectorAll(".phase-group").forEach(group => {
    const lessons = [...group.querySelectorAll(".course-lesson, .course-unavailable")];
    lessons.forEach(item => { item.hidden = Boolean(value && !item.textContent.toLowerCase().includes(value)); });
    group.hidden = lessons.every(item => item.hidden);
    if (value && !group.hidden) group.open = true;
  });
}

function captureDraft() {
  if (!lesson) return;
  draft.noteText = document.querySelector("#note-text")?.value ?? draft.noteText;
  draft.tutorText = document.querySelector("#tutor-text")?.value ?? draft.tutorText;
  draft.reviewText = document.querySelector("#review-item-text")?.value ?? draft.reviewText;
  draft.predictions = Object.fromEntries([...document.querySelectorAll("#prediction-form input:checked")].map(input => [input.name.slice(11), Number(input.value)]));
  draft.answers = Object.fromEntries([...document.querySelectorAll('#quiz-form input:checked')].map(input => [input.name.slice(5), Number(input.value)]));
  draft.openCards = [...document.querySelectorAll(".theory-card[open]")].map(element => element.dataset.cardSlug).filter(Boolean);
  draftCache.set(lesson.id, structuredClone(draft));
}
function restoreDraft() {
  for (const [id, key] of [["note-text", "noteText"], ["tutor-text", "tutorText"], ["review-item-text", "reviewText"]]) document.getElementById(id).value = draft[key];
  for (const input of document.querySelectorAll("#prediction-form input")) input.checked = draft.predictions[input.name.slice(11)] === Number(input.value);
  for (const input of document.querySelectorAll('#quiz-form input')) input.checked = draft.answers[input.name.slice(5)] === Number(input.value);
  for (const card of document.querySelectorAll(".theory-card")) card.open = draft.openCards.includes(card.dataset.cardSlug);
}
function persistDraft(keepalive = false) {
  clearTimeout(draftTimer);
  captureDraft();
  if (!lesson) return Promise.resolve();
  const id = lesson.id, value = structuredClone(draft);
  const write = () => request(lessonApi("/api/reader-draft", id), { method: "PUT", keepalive, headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
  const pending = keepalive ? write() : (draftWrites.get(id) ?? Promise.resolve()).catch(() => {}).then(write);
  draftWrites.set(id, pending);
  pending.catch(error => { const status = document.querySelector("#draft-status"); if (status) status.textContent = `草稿尚未保存：${error.message}`; });
  return pending;
}
app.addEventListener("input", event => {
  if (event.target.id === "course-filter") { navigatorFilter = event.target.value; filterCourse(); return; }
  if (!event.target.closest("#note-form, #tutor-form, #review-item-form, #quiz-form, #prediction-form")) return;
  captureDraft(); clearTimeout(draftTimer); draftTimer = setTimeout(() => void persistDraft(), 350);
});
app.addEventListener("toggle", event => {
  if (event.target.matches(".theory-card") && !shouldRestoreReadingPosition) {
    const open = [...document.querySelectorAll(".theory-card[open]")].map(card => card.dataset.cardSlug).filter(Boolean);
    if (JSON.stringify(open) !== JSON.stringify(draft.openCards)) void persistDraft();
  }
}, true);

function saveReadingPosition(keepalive = false) {
  if (!lesson) return;
  const position = Math.max(0, Math.round(window.scrollY));
  void request(`/api/reading-position?lessonId=${encodeURIComponent(lesson.id)}`, {
    method: "PUT",
    keepalive,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ position })
  }).catch(() => {});
}

function setTutorWidth(width) {
  tutorWidth = Math.round(Math.min(560, Math.max(280, width)));
  document.querySelector(".shell")?.style.setProperty("--tutor-width", `${tutorWidth}px`);
  document.querySelector(".tutor-resizer")?.setAttribute("aria-valuenow", `${tutorWidth}`);
}

function setNavigatorWidth(width) {
  navigatorWidth = Math.round(Math.min(384, Math.max(224, width)));
  document.querySelector(".shell")?.style.setProperty("--navigator-width", `${navigatorWidth}px`);
  document.querySelector(".navigator-resizer")?.setAttribute("aria-valuenow", `${navigatorWidth}`);
}

app.addEventListener("pointerdown", (event) => {
  const tutorResizer = event.target.closest(".tutor-resizer");
  const navigatorResizer = event.target.closest(".navigator-resizer");
  if (!tutorResizer && !navigatorResizer) return;
  event.preventDefault();
  const resize = (moveEvent) => {
    if (tutorResizer) setTutorWidth(window.innerWidth - moveEvent.clientX);
    if (navigatorResizer) setNavigatorWidth(moveEvent.clientX);
  };
  const stop = () => {
    window.removeEventListener("pointermove", resize);
    window.removeEventListener("pointerup", stop);
  };
  window.addEventListener("pointermove", resize);
  window.addEventListener("pointerup", stop, { once: true });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const kind = activePanelKind();
    if (navigatorOpen) { navigatorOpen = false; syncPanelUI(); document.querySelector(".navigator-toggle").focus(); return; }
    if (kind) {
      event.preventDefault();
      toggleAuxiliaryPanel(kind);
      return;
    }
  }
  trapAuxiliaryPanelFocus(event);
  if (["[", "]"].includes(event.key) && !event.target.closest("input, textarea, select, [contenteditable='true']")) {
    const item = adjacentLesson(event.key === "[" ? -1 : 1);
    if (item) { event.preventDefault(); void loadLesson(item.id).catch(showError); }
  }
  const tutorResizer = event.target.closest(".tutor-resizer");
  const navigatorResizer = event.target.closest(".navigator-resizer");
  if (!tutorResizer && !navigatorResizer) return;
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  if (tutorResizer) setTutorWidth(tutorWidth + (event.key === "ArrowLeft" ? 24 : -24));
  if (navigatorResizer) setNavigatorWidth(navigatorWidth + (event.key === "ArrowLeft" ? -24 : 24));
});

window.addEventListener("scroll", () => {
  if (!lesson || shouldRestoreReadingPosition) return;
  const percent = Math.round(Math.min(100, window.scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) * 100));
  const progress = document.querySelector("#reading-progress");
  if (progress) progress.value = percent;
  const label = document.querySelector("#reading-percent");
  if (label) label.textContent = `${percent}%`;
  window.clearTimeout(readingPositionTimer);
  readingPositionTimer = window.setTimeout(saveReadingPosition, 600);
}, { passive: true });

window.addEventListener("pagehide", () => { saveReadingPosition(true); void persistDraft(true); });

async function updateState(property) {
  const id = lesson.id;
  const nextState = await request(`/api/learning-state?lessonId=${encodeURIComponent(lesson.id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...state, [property]: !state[property] })
  });
  const nextCourse = await request("/api/course");
  if (lesson.id !== id) return;
  state = nextState; course = nextCourse;
  render();
}

app.addEventListener("change", (event) => {
  const select = event.target.closest("#theme-select");
  if (!select || !themePreferences.includes(select.value)) return;
  themePreference = select.value;
  saveTheme(themePreference);
  applyThemePreference();
  void renderMermaidDiagrams();
  window.requestAnimationFrame(() => document.querySelector("#theme-select")?.focus({ preventScroll: true }));
});

app.addEventListener("click", async (event) => {
  const actionLessonId = lesson.id;
  if (event.target.closest("[data-stop-tutor]")) { tutorRequest?.controller.abort(); return; }
  const undoButton = event.target.closest("[data-undo-token]");
  if (undoButton) {
    undoButton.disabled = true;
    try {
      await request("/api/undo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: undoButton.dataset.undoToken, scope: undoButton.dataset.undoScope }) });
      if (undoButton.dataset.undoScope === "import") await reloadRestoredLesson();
      else {
        const [nextNotes, messages, items] = await Promise.all([request(lessonApi("/api/notes")), request(lessonApi("/api/tutor/messages")), request(lessonApi("/api/review-items"))]);
        if (lesson.id === actionLessonId) { notes = nextNotes; tutorMessages = messages; reviewItems = items; render(); }
      }
      document.querySelector("#undo-status").textContent = "已撤销。";
    } catch (error) { document.querySelector("#undo-status").textContent = error.message; }
    return;
  }
  const deleteButton = event.target.closest("[data-delete-note], [data-delete-review]");
  if (deleteButton) {
    if (!await inlineConfirm(deleteButton, "删除这条记录？60 秒内可撤销。")) return;
    const noteId = deleteButton.dataset.deleteNote, id = noteId ?? deleteButton.dataset.deleteReview;
    try {
      const result = await request(lessonApi(`/api/${noteId ? "notes" : "review-items"}/${id}`), { method: "DELETE" });
      showUndo(result.undo, "记录已删除。");
      if (lesson.id !== actionLessonId) return;
      if (noteId) notes = notes.filter(item => item.id !== Number(id));
      else reviewItems = reviewItems.filter(item => item.id !== Number(id));
      render();
    } catch (error) { showError(error); }
    return;
  }
  if (event.target.closest("[data-quiz-reset]")) {
    quizResult = null; draft.answers = {};
    document.querySelectorAll("#quiz-form input").forEach(input => { input.checked = false; });
    void persistDraft(); render(); document.querySelector("#quiz-form fieldset")?.focus(); return;
  }
  const questionReview = event.target.closest("[data-review-question-id]");
  if (questionReview) {
    const question = quiz.questions.find(question => question.id === questionReview.dataset.reviewQuestionId);
    questionReview.disabled = true;
    try {
      const item = await request(lessonApi("/api/review-items"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: question.question.slice(0, 1000) }) });
      if (lesson.id !== actionLessonId) return;
      if (!reviewItems.some(existing => existing.id === item.id)) reviewItems.unshift(item);
      render();
    } catch (error) { questionReview.disabled = false; showError(error); }
    return;
  }
  const copyButton = event.target.closest("button[data-copy-code]");
  if (copyButton) {
    const code = document.getElementById(copyButton.dataset.copyCode)?.textContent;
    const status = copyButton.parentElement.querySelector(".copy-status");
    if (!code) return;
    copyButton.disabled = true;
    try {
      await copyText(code);
      copyButton.textContent = "已复制";
      status.textContent = "代码已复制到剪贴板。";
    } catch (error) {
      status.textContent = "复制失败，请手动选择代码。";
    } finally {
      window.setTimeout(() => {
        copyButton.disabled = false;
        copyButton.textContent = "复制代码";
      }, 1800);
    }
    return;
  }
  const resolveReviewItem = event.target.closest("button[data-review-item-id]");
  if (resolveReviewItem) {
    resolveReviewItem.disabled = true;
    try {
      await request(lessonApi(`/api/review-items/${encodeURIComponent(resolveReviewItem.dataset.reviewItemId)}`), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resolved: true })
      });
      if (lesson.id !== actionLessonId) return;
      reviewItems = reviewItems.filter((item) => item.id !== Number(resolveReviewItem.dataset.reviewItemId));
      render();
    } catch (error) {
      resolveReviewItem.disabled = false;
      showError(error);
    }
    return;
  }
  const navigatorToggle = event.target.closest("button[data-action='navigator']");
  if (navigatorToggle) {
    navigatorOpen = !navigatorOpen;
    if (navigatorOpen) {
      notesOpen = false;
      tutorOpen = false;
      reviewOpen = false;
    }
    syncPanelUI();
    if (!navigatorOpen) document.querySelector(".navigator-toggle").focus();
    if (navigatorOpen) document.querySelector(".navigator-close")?.focus({ preventScroll: true });
    return;
  }
  const tutorToggle = event.target.closest("button[data-action='tutor']");
  if (tutorToggle) {
    toggleAuxiliaryPanel("tutor");
    return;
  }
  const notesToggle = event.target.closest("button[data-action='notes']");
  if (notesToggle) {
    toggleAuxiliaryPanel("notes");
    return;
  }
  const reviewToggle = event.target.closest("button[data-action='review']");
  if (reviewToggle) {
    toggleAuxiliaryPanel("review");
    return;
  }
  const courseLink = event.target.closest("a[data-lesson-id]");
  if (courseLink) {
    event.preventDefault();
    await loadLesson(courseLink.dataset.lessonId).catch(showError);
    if (navigatorOpen && window.matchMedia("(max-width: 900px)").matches) navigatorOpen = false;
    return;
  }
  const navigatorLink = event.target.closest("#course-navigator a");
  if (navigatorLink && navigatorOpen && window.matchMedia("(max-width: 900px)").matches) {
    window.setTimeout(() => {
      navigatorOpen = false;
      syncPanelUI();
    }, 0);
    return;
  }
  const discoverModels = event.target.closest("#discover-models");
  if (discoverModels) {
    const form = discoverModels.closest("form");
    const status = form.querySelector("#model-list-status");
    const baseUrl = new FormData(form).get("baseUrl");
    const apiKey = new FormData(form).get("apiKey");
    discoverModels.disabled = true;
    status.textContent = "正在获取模型名称…";
    try {
      const result = await request("/api/model-config/models", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ baseUrl, apiKey })
      });
      const control = form.querySelector("#model-name-control");
      const currentModel = control.querySelector("[name='model']")?.value ?? "";
      discoveredModels = result.models;
      control.innerHTML = `<label for="model-name">模型名</label><select id="model-name" name="model" required>${result.models.map((name) => `<option value="${escapeHtml(name)}"${name === currentModel ? " selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select>`;
      status.textContent = `已获取 ${result.models.length} 个模型名称。`;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      discoverModels.disabled = false;
    }
    return;
  }
  const tutorMessageDelete = event.target.closest("button[data-tutor-message-id]");
  if (tutorMessageDelete) {
    tutorMessageDelete.disabled = true;
    try {
      const id = tutorMessageDelete.dataset.tutorMessageId;
      if (!await inlineConfirm(tutorMessageDelete, "删除这条对话？60 秒内可撤销。")) { tutorMessageDelete.disabled = false; return; }
      const result = await request(lessonApi(`/api/tutor/messages/${encodeURIComponent(id)}`), { method: "DELETE" });
      showUndo(result.undo, "对话已删除。");
      if (lesson.id !== actionLessonId) return;
      tutorMessages = tutorMessages.filter((message) => message.id !== Number(id));
      render();
    } catch (error) {
      tutorMessageDelete.disabled = false;
      showError(error);
    }
    return;
  }
  const clearTutor = event.target.closest("button[data-clear-tutor]");
  if (clearTutor) {
    if (!await inlineConfirm(clearTutor, "清空本课全部对话？60 秒内可撤销。")) return;
    clearTutor.disabled = true;
    try {
      const result = await request(lessonApi("/api/tutor/messages"), { method: "DELETE" });
      showUndo(result.undo, "本课对话已清空。");
      if (lesson.id !== actionLessonId) return;
      tutorMessages = [];
      render();
    } catch (error) {
      clearTutor.disabled = false;
      showError(error);
    }
    return;
  }
  const toolButton = event.target.closest("button[data-action='workspace'], button[data-action='exploration']");
  if (toolButton) {
    toolButton.disabled = true;
    const status = document.querySelector("#tool-status");
    status.textContent = "正在准备本地工作区…";
    try {
      const path = lessonApi(toolButton.dataset.action === "workspace" ? "/api/workspace/open" : "/api/exploration/open");
      await request(path, { method: "POST" });
      status.textContent = toolButton.dataset.action === "workspace" ? "已在 VS Code 中打开工作区。" : "marimo 已在新浏览器标签中打开。";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      toolButton.disabled = false;
    }
    return;
  }
  const button = event.target.closest("button[data-state]");
  if (!button) return;
  button.disabled = true;
  try {
    await updateState(button.dataset.state);
  } catch (error) {
    button.disabled = false;
    showError(error);
  }
});

app.addEventListener("submit", async (event) => {
  const actionLessonId = lesson.id;
  if (event.target.id === "quiz-form") {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector("button");
    const status = form.querySelector("#quiz-status");
    const values = new FormData(form);
    const missing = quiz.questions.flatMap((question, index) => values.has(`quiz-${question.id}`) ? [] : [index]);
    if (missing.length) {
      status.textContent = `尚未作答：第 ${missing.map(index => index + 1).join("、")} 题。`;
      form.querySelectorAll("fieldset")[missing[0]].focus(); return;
    }
    button.disabled = true;
    status.textContent = "正在核对…";
    try {
      const answers = Object.fromEntries(quiz.questions.map((question) => [
        question.id,
        Number(new FormData(form).get(`quiz-${question.id}`))
      ]));
      const nextResult = await request(`/api/quiz/attempts?lessonId=${encodeURIComponent(lesson.id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers })
      });
      const nextCourse = await request("/api/course");
      if (lesson.id !== actionLessonId) return;
      quizResult = nextResult; course = nextCourse;
      render();
    } catch (error) {
      button.disabled = false;
      status.textContent = error.message;
    }
    return;
  }
  if (event.target.id === "model-config-form") {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector("button");
    button.disabled = true;
    tutorStatus = "正在保存连接…";
    try {
      modelConfig = await request("/api/model-config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      modelConfigChanged = true;
      tutorStatus = "连接已保存在本机。";
    } catch (error) {
      tutorStatus = error.message;
    }
    render();
    return;
  }
  if (event.target.id === "tutor-form") {
    event.preventDefault();
    if (tutorRequest) return;
    const form = event.target, submittedText = new FormData(form).get("text");
    const pending = { lessonId: actionLessonId, controller: new AbortController(), text: "" };
    tutorRequest = pending;
    tutorStatus = "正在依据当前小节的证据思考…";
    document.querySelector("#tutor-status").textContent = tutorStatus;
    updateStreamingView();
    try {
      const result = await streamTutor(lessonApi("/api/tutor/messages/stream", actionLessonId), {
        text: submittedText, context: { sectionTitle: activeSectionTitle, theoryCardSlug: activeTheoryCardSlug },
        mode: event.submitter?.dataset?.tutorMode === "explanation" ? "explanation" : "socratic"
      }, pending.controller.signal, delta => {
        pending.text += delta;
        if (lesson?.id === actionLessonId) updateStreamingView();
      });
      if (lesson?.id !== actionLessonId) return;
      tutorMessages.push(result.userMessage, result.assistantMessage);
      tutorStatus = "回复已保存在本机。";
      if (document.querySelector("#tutor-text").value === submittedText) document.querySelector("#tutor-text").value = "";
      void persistDraft();
    } catch (error) {
      if (lesson?.id === actionLessonId) tutorStatus = pending.controller.signal.aborted ? "已停止生成，草稿已保留；未保存半条回复。" : error.message;
    } finally {
      if (tutorRequest === pending) tutorRequest = null;
      if (lesson?.id === actionLessonId) render();
    }
    return;
  }
  if (event.target.id === "review-item-form") {
    event.preventDefault();
    const form = event.target;
    const submittedText = new FormData(form).get("text");
    const button = form.querySelector("button");
    const status = form.querySelector("#review-item-status");
    button.disabled = true;
    status.textContent = "正在保存…";
    try {
      const reviewItem = await request(`/api/review-items?lessonId=${encodeURIComponent(lesson.id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: submittedText })
      });
      if (lesson.id !== actionLessonId) return;
      reviewItems.unshift(reviewItem);
      if (document.querySelector("#review-item-text").value === submittedText) document.querySelector("#review-item-text").value = "";
      void persistDraft();
      render();
    } catch (error) {
      button.disabled = false;
      status.textContent = error.message;
    }
    return;
  }
  if (event.target.id === "import-form") {
    event.preventDefault();
    const form = event.target;
    const file = form.querySelector("input[type='file']")?.files?.[0];
    const button = form.querySelector("button");
    const status = form.querySelector("#import-status");
    if (!file) {
      status.textContent = "请选择导出的 JSON 备份文件。";
      return;
    }
    if (!await inlineConfirm(button, "导入会替换当前学习数据。确认恢复这份备份？60 秒内且没有新写入时可撤销。")) return;
    await persistDraft();
    button.disabled = true;
    status.textContent = "正在验证并恢复备份…";
    try {
      const backup = JSON.parse(await file.text());
      const result = await request("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(backup)
      });
      await reloadRestoredLesson();
      showUndo(result.undo, `已恢复备份；保留 ${result.restored.unknownLessonRecords} 条当前目录外记录。`);
    } catch (error) {
      button.disabled = false;
      status.textContent = error instanceof SyntaxError ? "备份不是有效的 JSON 文件。" : error.message;
    }
    return;
  }
  if (event.target.id !== "note-form") return;
  event.preventDefault();
  const form = event.target;
  const submittedText = new FormData(form).get("text");
  const status = form.querySelector("#form-status");
  const button = form.querySelector("button");
  button.disabled = true;
  status.textContent = "正在保存…";
  try {
    const note = await request(`/api/notes?lessonId=${encodeURIComponent(lesson.id)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: submittedText })
    });
    if (lesson.id !== actionLessonId) return;
    notes.unshift(note);
    if (document.querySelector("#note-text").value === submittedText) document.querySelector("#note-text").value = "";
    void persistDraft();
    course = await request("/api/course");
    render();
  } catch (error) {
    button.disabled = false;
    status.textContent = error.message;
  }
});

async function loadLesson(lessonId, navigation = "push") {
  const sequence = ++loadSequence;
  tutorRequest?.controller.abort();
  clearTimeout(readingPositionTimer);
  if (lesson) { saveReadingPosition(); await persistDraft(); }
  if (!lessonId) lessonId = (await request("/api/curriculum")).target.lessonId;
  if (sequence !== loadSequence) return;
  const [nextLesson, nextState, nextNotes, nextContent, nextReadingPosition, nextModelConfig, nextTutorMessages, nextReviewItems, nextQuiz, nextQuizResult, nextCourse, nextDraft] = await Promise.all([
    request(lessonApi("/api/lesson", lessonId)), request(lessonApi("/api/learning-state", lessonId)),
    request(lessonApi("/api/notes", lessonId)), request(lessonApi("/api/lesson/content", lessonId)),
    request(lessonApi("/api/reading-position", lessonId)), request("/api/model-config"),
    request(lessonApi("/api/tutor/messages", lessonId)), request(lessonApi("/api/review-items", lessonId)),
    request(lessonApi("/api/quiz", lessonId)), request(lessonApi("/api/quiz/attempts", lessonId)),
    request("/api/course"), request(lessonApi("/api/reader-draft", lessonId))
  ]);
  if (sequence !== loadSequence) return;
  document.title = `${nextLesson.title} | Learning Atlas`;
  lesson = nextLesson; selectedLessonId = lesson.id; state = nextState; notes = nextNotes; content = nextContent;
  readingPosition = nextReadingPosition.position; modelConfig = nextModelConfig; tutorMessages = nextTutorMessages;
  reviewItems = nextReviewItems; quiz = nextQuiz; quizResult = nextQuizResult; course = nextCourse;
  draft = draftCache.get(lesson.id) ?? nextDraft;
  if (draft.fingerprint !== nextQuiz.fingerprint) { draft.answers = {}; draft.predictions = {}; draft.fingerprint = nextQuiz.fingerprint; }
  activeSectionTitle = "本课概览"; activeTheoryCardSlug = ""; shouldRestoreReadingPosition = true;
  if (window.matchMedia("(max-width: 900px)").matches) navigatorOpen = false;
  const url = `/learn?lessonId=${encodeURIComponent(lesson.id)}`;
  if (navigation === "push") window.history.pushState({}, "", url);
  else if (navigation === "replace") window.history.replaceState({}, "", url);
  render();
}
window.addEventListener("popstate", () => {
  if (new URLSearchParams(location.search).get("lessonId") === lesson?.id) return;
  void loadLesson(new URLSearchParams(location.search).get("lessonId"), "none").catch(showError);
});
function adjacentLesson(direction) {
  const lessons = course.flatMap(phase => phase.lessons.filter(item => item.available));
  return lessons[lessons.findIndex(item => item.id === lesson.id) + direction];
}
function lessonNavigation() {
  return `<nav class="lesson-navigation" aria-label="课程翻页">${[-1, 1].map(direction => {
    const item = adjacentLesson(direction);
    return item ? `<a data-lesson-id="${escapeHtml(item.id)}" href="/learn?lessonId=${encodeURIComponent(item.id)}">${direction < 0 ? "上一课 [" : "下一课 ]"}：${escapeHtml(item.title)}</a>` : "";
  }).join("")}</nav>`;
}
function showError(error) {
  const status = document.querySelector("#draft-status");
  if (status) status.textContent = error.message;
  else app.innerHTML = `<p class="error">无法打开本地学习空间：${escapeHtml(error.message)}</p>`;
}
loadLesson(selectedLessonId, "replace").catch(showError);
