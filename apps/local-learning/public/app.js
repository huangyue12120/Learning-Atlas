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
let reviewItems = [];
let quiz = { status: "unavailable", questions: [] };
let quizResult = null;
let course = [];
let selectedLessonId = new URLSearchParams(window.location.search).get("lessonId") ??
  (window.location.pathname === "/learn" ? "practice/00-setup-and-tooling/01-dev-environment" : null);
const themeStorageKey = "learning-atlas-theme";
const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const themePreferences = ["system", "light", "dark"];

function readThemePreference() {
  try {
    const savedTheme = localStorage.getItem(themeStorageKey);
    return themePreferences.includes(savedTheme) ? savedTheme : "system";
  } catch {
    return "system";
  }
}

let themePreference = readThemePreference();

function configureMermaid() {
  const dark = document.documentElement.dataset.theme === "dark";
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: dark
      ? {
        background: "#202624",
        primaryColor: "#202624",
        primaryTextColor: "#e8eee8",
        primaryBorderColor: "#69b9af",
        lineColor: "#69b9af",
        secondaryColor: "#171b1a",
        tertiaryColor: "#1d3a35",
        clusterBkg: "#171b1a",
        clusterBorder: "#44504b",
        fontFamily: "Atlas Sans SC, system-ui, sans-serif"
      }
      : {
        background: "#fffefa",
        primaryColor: "#fffefa",
        primaryTextColor: "#183538",
        primaryBorderColor: "#0a726c",
        lineColor: "#0a726c",
        secondaryColor: "#f7f4ec",
        tertiaryColor: "#e9f3ef",
        clusterBkg: "#f7f4ec",
        clusterBorder: "#d8d4c8",
        fontFamily: "Atlas Sans SC, system-ui, sans-serif"
      }
  });
}

function applyThemePreference() {
  const dark = themePreference === "dark" || (themePreference === "system" && systemThemeQuery.matches);
  const resolvedTheme = dark ? "dark" : "light";
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
  configureMermaid();
}

applyThemePreference();

systemThemeQuery.addEventListener("change", () => {
  if (themePreference !== "system") return;
  applyThemePreference();
  if (lesson) render();
});

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
  render();
  window.requestAnimationFrame(() => (opening ? focusPanel(kind) : focusPanelTrigger(kind)));
}

function desktopOverlayActive() {
  return window.matchMedia("(min-width: 901px) and (max-width: 1104px)").matches;
}

window.addEventListener("resize", () => {
  if (activePanelKind()) syncPanelAccessibility();
});

function syncPanelAccessibility() {
  const kind = activePanelKind();
  const panel = kind ? document.querySelector(panelControls[kind].panel) : null;
  const modal = Boolean(panel && desktopOverlayActive());
  document.querySelectorAll(".notes, .review-panel, .tutor").forEach((element) => {
    if (element !== panel) {
      element.removeAttribute("role");
      element.removeAttribute("aria-modal");
    }
  });
  if (panel) {
    if (modal) {
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
    } else {
      panel.removeAttribute("role");
      panel.removeAttribute("aria-modal");
    }
  }
  document.querySelectorAll(".topbar, .navigator, .lesson").forEach((element) => {
    if (modal) {
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    } else {
      element.removeAttribute("inert");
      element.removeAttribute("aria-hidden");
    }
  });
}

function trapAuxiliaryPanelFocus(event) {
  if (event.key !== "Tab" || !desktopOverlayActive()) return;
  const kind = activePanelKind();
  const panel = kind ? document.querySelector(panelControls[kind].panel) : null;
  if (!panel) return;
  const focusable = [...panel.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex='-1'])")]
    .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
  if (!focusable.length) return;
  const currentIndex = focusable.indexOf(document.activeElement);
  if (event.shiftKey && (currentIndex <= 0)) {
    event.preventDefault();
    focusable.at(-1).focus({ preventScroll: true });
  } else if (!event.shiftKey && (currentIndex === focusable.length - 1 || currentIndex === -1)) {
    event.preventDefault();
    focusable[0].focus({ preventScroll: true });
  }
}

async function request(path, options) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "请求失败");
  return data;
}

function lessonApi(path, lessonId = lesson?.id ?? selectedLessonId) {
  if (!lessonId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}lessonId=${encodeURIComponent(lessonId)}`;
}

function theoryCard(card) {
  const primaryTarget = card.readKind === "internal" ? "" : " target=\"_blank\" rel=\"noreferrer\"";
  const primaryLabel = card.readKind === "internal" ? "阅读完整中文理论" : "阅读最新英文原文";
  return `<details class="theory-card"><summary><span>上下文理论</span><strong>${escapeHtml(card.title)}</strong><small>${escapeHtml(card.summary)}</small></summary><div><a href="${escapeHtml(card.readUrl)}"${primaryTarget}>${primaryLabel}</a><a href="${escapeHtml(card.sourceUrl)}" target="_blank" rel="noreferrer">查看上游 main 原文</a><small>${card.readKind === "internal" ? "中文全文按本地同步快照审核；上游 main 变化后会要求重新审核。" : "当前没有可发布的中文全文，将打开官方上游 main。"}</small></div></details>`;
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
  renderTheoryCard: theoryCard
});

function publishedMarkdown() {
  if (content.translationStatus !== "reviewed") {
    return { html: `<section class="content-unavailable"><h2>译文需要同步</h2><p>上游内容已变化或当前译文尚未审核。阅读器不会显示可能过期的内容。</p></section>`, headings: [] };
  }
  const firstSection = content.markdown.indexOf("## 学习目标");
  const body = firstSection >= 0 ? content.markdown.slice(firstSection) : content.markdown;
  return renderMarkdown(body, { cards: content.theoryCards });
}

function tableOfContents(headings) {
  if (!headings.length) return "";
  return `<nav class="reader-toc" aria-label="本课目录"><ol id="course-toc">${headings.map(({ id, title }) => `<li><a class="reader-toc-tab" href="#${escapeHtml(id)}" aria-label="前往：${escapeHtml(title)}"><span class="reader-toc-marker" aria-hidden="true"></span><span class="reader-toc-summary">${escapeHtml(title)}</span></a></li>`).join("")}</ol></nav>`;
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

function render() {
  const lessonContent = publishedMarkdown();
  const isSetupCourse = lesson.phaseSlug === "00-setup-and-tooling";
  const lessonLede = isSetupCourse
    ? "通过阅读、配置、实践与自测，建立后续 AI 工程所需的环境与工具基础。"
    : "通过阅读、实践与自测，把本课的数学直觉转化为可运行的 Python 实现。";
  const practiceTitle = isSetupCourse ? "把配置变成可复用的本地工作流" : "把理解变成可运行的代码";
  const practiceDescription = isSetupCourse
    ? "本课的 Python 示例会复制到你的私人工作区；配置和其他工具操作仍以课程中的原始步骤为准。"
    : "工作区与探索笔记都只保存在此设备，不会修改上游课程。";
  const notePlaceholder = isSetupCourse ? "例如：我需要确认 uv、虚拟环境和项目依赖各自负责什么。" : "例如：向量为什么能表示一个词？";
  const tutorPlaceholder = isSetupCourse ? "例如：我在配置 uv 或 GPU 检测时卡住了。" : "例如：为什么这两个方向越接近，点积通常越大？";
  const completedLabel = state.completed ? "已标记理解" : "我理解了";
  const reviewLabel = state.review ? "已加入待复习" : "仍需复习";
  const notesToggleLabel = notesOpen ? "收起笔记" : `笔记${notes.length ? `（${notes.length}）` : ""}`;
  const tutorToggleLabel = tutorOpen ? "收起助理" : "学习助理";
  const reviewToggleLabel = reviewOpen ? "收起复习" : `复习${reviewItems.length ? `（${reviewItems.length}）` : ""}`;
  const themeControl = `<label class="theme-control" for="theme-select"><span>主题</span><select id="theme-select" name="theme" aria-label="主题"><option value="system"${themePreference === "system" ? " selected" : ""}>跟随系统</option><option value="light"${themePreference === "light" ? " selected" : ""}>浅色</option><option value="dark"${themePreference === "dark" ? " selected" : ""}>深色</option></select></label>`;
  const noteList = notes.length
    ? notes.map((note) => `<article class="note"><p>${escapeHtml(note.text)}</p><time datetime="${note.createdAt}">${new Date(note.createdAt).toLocaleString("zh-CN")}</time></article>`).join("")
    : "<p class=\"empty\">尚无笔记。用自己的话记录一个理解或疑问。</p>";
  const reviewList = reviewItems.length
    ? `<ul class="review-item-list">${reviewItems.map((item) => `<li><span>${escapeHtml(item.text)}</span><button type="button" class="review-item-resolve" data-review-item-id="${item.id}">已复习</button></li>`).join("")}</ul>`
    : "<p class=\"empty\">尚无确认的待复习点。</p>";
  const progressMeta = {
    "not-started": { label: "未开始", className: "not-started" },
    "in-progress": { label: "学习中", className: "in-progress" },
    understood: { label: "已理解", className: "understood" },
    review: { label: "需复习", className: "review" }
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
      : `<span class="course-unavailable" aria-label="${escapeHtml(item.position)} ${escapeHtml(item.title)}，待审核发布">${escapeHtml(item.position)} ${escapeHtml(item.title)}<small>待审核发布</small></span>`
    }).join("");
    return `<details class="phase-group"${phase.slug === lesson.phaseSlug ? " open" : ""}><summary><span>${escapeHtml(phase.title)}<small>${startedCourseCount} / ${phase.lessons.length} 已学习 · ${phaseProgress}</small></span><small>${publishedCourseCount} / ${phase.lessons.length} 已发布</small></summary><div class="phase-lessons">${lessons}</div></details>`;
  }).join("");
  const quizPanel = quiz.status === "reviewed"
    ? `<section class="quiz" aria-labelledby="quiz-title"><p class="eyebrow">本课自测</p><h2 id="quiz-title">检验你的理解</h2><p class="quiz-intro">这三题来自锁定版本的课程测验；结果仅保存在此设备。</p><form id="quiz-form">${quiz.questions.map((question, index) => `<fieldset><legend>${index + 1}. ${escapeHtml(question.question)}</legend>${question.options.map((option, optionIndex) => `<label><input type="radio" name="quiz-${escapeHtml(question.id)}" value="${optionIndex}" required> ${escapeHtml(option)}</label>`).join("")}</fieldset>`).join("")}<button>提交自测</button><p id="quiz-status" role="status"></p></form>${quizResult ? `<section class="quiz-result" aria-live="polite"><p>本次得分：<strong>${quizResult.score} / ${quizResult.total}</strong></p>${quizResult.results.map((result, index) => `<article class="${result.correct ? "correct" : "incorrect"}"><strong>第 ${index + 1} 题：${result.correct ? "回答正确" : "需要回顾"}</strong><p>${escapeHtml(result.explanation)}</p>${result.correct ? "" : '<button type="button" class="quiz-review-link" data-action="review" data-review-add="true">在待复习中确认</button>'}</article>`).join("")}</section>` : ""}</section>`
    : "";
  const translationLabel = content.translationStatus === "reviewed" ? "已审核" : "待同步";
  const modelNameControl = discoveredModels.length
    ? `<div id="model-name-control"><label for="model-name">模型名</label><select id="model-name" name="model" required>${discoveredModels.map((name) => `<option value="${escapeHtml(name)}"${name === modelConfig.model ? " selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select></div>`
    : `<div id="model-name-control"><label for="model-name">模型名</label><input id="model-name" name="model" required value="${escapeHtml(modelConfig.model)}" placeholder="你的模型名"></div>`;
  const modelConfigForm = `<form id="model-config-form"><label for="model-base-url">兼容接口地址</label><input id="model-base-url" name="baseUrl" type="url" required value="${escapeHtml(modelConfig.baseUrl)}" placeholder="http://127.0.0.1:11434/v1"><label for="model-api-key">API key（可选）</label><input id="model-api-key" name="apiKey" type="password" autocomplete="new-password" placeholder="${modelConfig.apiKeyConfigured ? "已保存；留空保持不变" : "本机可选保存"}">${modelConfig.apiKeyConfigured ? '<label class="tutor-clear-key"><input name="clearApiKey" type="checkbox">清除已保存的 key</label>' : ""}<button type="button" id="discover-models">获取模型名称</button><p id="model-list-status" role="status"></p>${modelNameControl}<button type="submit">保存连接</button><p class="tutor-config-note">连接和 key 仅保存在此设备的学习数据库中。</p></form>`;
  const tutorMessagesHtml = tutorMessages.length
    ? `<div class="tutor-conversation-actions"><span>本课对话</span><button type="button" class="tutor-clear-history" data-clear-tutor>清空本课对话</button></div>${tutorMessages.map((message) => `<article class="tutor-message ${message.role}"><div class="tutor-message-heading"><strong>${message.role === "user" ? "你" : "学习助理"}</strong><button type="button" class="tutor-message-delete" data-tutor-message-id="${message.id}" aria-label="删除这条${message.role === "user" ? "用户" : "助理"}消息">删除</button></div><p>${escapeHtml(message.text)}</p></article>`).join("")}`
    : '<p class="empty">配置后，从一个具体疑问开始。助理会先提问并给出最小提示。</p>';
  const panelScrim = tutorOpen
    ? '<button type="button" class="tutor-scrim" data-action="tutor" aria-label="关闭学习助理" tabindex="-1"></button>'
    : notesOpen
      ? '<button type="button" class="panel-scrim" data-action="notes" aria-label="关闭笔记" tabindex="-1"></button>'
      : reviewOpen
        ? '<button type="button" class="panel-scrim" data-action="review" aria-label="关闭待复习" tabindex="-1"></button>'
        : "";

  app.innerHTML = `
    <div class="shell${notesOpen ? " notes-open" : ""}${tutorOpen ? " tutor-open" : ""}${reviewOpen ? " review-open" : ""}${navigatorOpen ? " navigator-open" : ""}" style="--navigator-width: ${navigatorWidth}px${tutorOpen ? `; --tutor-width: ${tutorWidth}px` : ""}">
      <header class="topbar"><a class="brand" href="/">Learning Atlas</a><button type="button" class="navigator-toggle" data-action="navigator" aria-expanded="${navigatorOpen}" aria-controls="course-navigator">课程目录</button><span>本地优先 · 学习数据仅保存在此设备</span><div class="topbar-actions">${themeControl}<button type="button" class="tutor-toggle" data-action="tutor" aria-expanded="${tutorOpen}" aria-controls="tutor-panel">${tutorToggleLabel}</button><button type="button" class="notes-toggle" data-action="notes" aria-expanded="${notesOpen}" aria-controls="notes-panel">${notesToggleLabel}</button></div></header>
      ${navigatorOpen ? '<button type="button" class="navigator-scrim" data-action="navigator" aria-label="关闭课程目录"></button>' : ""}
      <nav id="course-navigator" class="navigator" aria-label="课程导航"><div class="navigator-resizer" role="separator" aria-label="调整实践主线宽度" aria-orientation="vertical" aria-valuemin="224" aria-valuemax="384" aria-valuenow="${navigatorWidth}" tabindex="0"></div><p>实践主线</p>${courseNavigation}</nav>
      <main id="lesson" class="lesson">
        <p class="eyebrow">${lesson.phase} / ${lesson.position}</p>
        <h1>${lesson.title}</h1>
        <p class="original-title">${lesson.originalTitle}</p>
        <p class="lede">${lessonLede}</p>
        <dl class="metadata"><div><dt>预计学习</dt><dd>${lesson.duration}</dd></div><div><dt>译文状态</dt><dd>${translationLabel}</dd></div></dl>
        <div class="markdown-content">${lessonContent.html}</div>
        <section class="notice"><p class="eyebrow">本地实践</p><h2>${practiceTitle}</h2><p>${practiceDescription}</p><div class="actions">${lesson.resources.workspace ? '<button type="button" data-action="workspace">在 VS Code 中继续</button>' : ""}${lesson.resources.exploration ? '<button type="button" data-action="exploration">用 marimo 探索</button>' : ""}</div><p id="tool-status" role="status"></p><a href="${escapeHtml(lesson.sourceUrl)}" target="_blank" rel="noreferrer">查看锁定版本的原始课程</a></section>
        <section class="reflection" aria-labelledby="reflection-title"><p class="eyebrow">学习状态</p><h2 id="reflection-title">完成本课后，你能用自己的话解释关键概念并完成相应练习吗？</h2><div class="actions"><button type="button" data-state="completed" aria-pressed="${state.completed}">${completedLabel}</button><button type="button" data-state="review" aria-pressed="${state.review}">${reviewLabel}</button></div></section>
      </main>
      ${panelScrim}
      <aside id="notes-panel" class="notes" aria-labelledby="notes-title"><div class="notes-heading"><div><p class="eyebrow">个人学习数据</p><h2 id="notes-title" tabindex="-1">笔记</h2></div><button type="button" class="notes-close" data-action="notes" aria-label="关闭笔记">关闭</button></div><form id="note-form"><label for="note-text">写下自己的表述</label><textarea id="note-text" name="text" required maxlength="2000" placeholder="${notePlaceholder}"></textarea><button>保存笔记</button><p id="form-status" role="status"></p></form><div class="note-list">${noteList}</div><section class="export-actions" aria-labelledby="backup-title"><h3 id="backup-title">备份与恢复</h3><p>JSON 可恢复学习数据；Markdown 仅用于阅读。恢复会替换课程状态、笔记、对话、复习项和自测记录，但不会修改模型连接或私人工作区。</p><div><a href="/api/export?format=json" download>导出 JSON</a><a href="/api/export?format=markdown" download>导出 Markdown</a></div><form id="import-form"><label for="import-file">导入 JSON 备份</label><input id="import-file" name="file" type="file" accept="application/json,.json" required><button type="submit">导入并替换学习数据</button><p id="import-status" role="status"></p></form></section></aside>
      <aside id="tutor-panel" class="tutor" aria-labelledby="tutor-title" aria-describedby="tutor-evidence"><div class="tutor-resizer" role="separator" aria-label="调整学习助理宽度" aria-orientation="vertical" aria-valuemin="280" aria-valuemax="560" aria-valuenow="${tutorWidth}" tabindex="0"></div><div class="tutor-heading"><div><p class="eyebrow">本地学习助理</p><h2 id="tutor-title" tabindex="-1">一起推理</h2></div><button type="button" class="tutor-close" data-action="tutor" aria-label="关闭学习助理">关闭</button></div><p id="tutor-evidence" class="tutor-evidence">当前证据：${activeSectionTitle}；已批准的上下文理论卡。</p><details class="tutor-config"><summary>模型连接${modelConfig.model ? `：${escapeHtml(modelConfig.model)}` : "（未配置）"}</summary>${modelConfigForm}</details><div class="tutor-messages">${tutorMessagesHtml}</div><form id="tutor-form"><label for="tutor-text">向学习助理说明你的卡点</label><textarea id="tutor-text" name="text" required maxlength="4000" placeholder="${tutorPlaceholder}"></textarea><button type="submit">发送问题</button><p id="tutor-status" role="status" aria-live="polite">${escapeHtml(tutorStatus)}</p></form></aside>
    </div>`;
  document.querySelector(".reflection")?.insertAdjacentHTML("afterend", quizPanel);
  document.querySelector(".lesson .metadata")?.insertAdjacentHTML("afterend", tableOfContents(lessonContent.headings));
  document.querySelector(".topbar-actions")?.insertAdjacentHTML("beforeend", `<button type="button" class="review-toggle" data-action="review" aria-expanded="${reviewOpen}" aria-controls="review-panel">${reviewToggleLabel}</button>`);
  document.querySelector("#tutor-panel")?.insertAdjacentHTML("beforebegin", `<aside id="review-panel" class="review-panel" aria-labelledby="review-title"><div class="review-heading"><div><p class="eyebrow">个人学习数据</p><h2 id="review-title" tabindex="-1">待复习</h2></div><button type="button" class="review-close" data-action="review" aria-label="关闭待复习">关闭</button></div><p class="review-intro">将已经确认的卡点留在这里；完成回顾后再标记为已复习。</p><form id="review-item-form"><label for="review-item-text">用自己的话写下要复习的内容</label><textarea id="review-item-text" name="text" required maxlength="1000" placeholder="例如：我需要重新判断点积的正负和向量方向之间的关系。"></textarea><button>确认加入待复习</button><p id="review-item-status" role="status"></p></form>${reviewList}</aside>`);
  document.querySelector(".tutor-messages")?.insertAdjacentHTML("afterend", `<p class="tutor-review-link">已经明确了一个卡点？<button type="button" data-action="review" data-review-add="true">在待复习中确认</button></p>`);
  document.querySelector("#tutor-status")?.insertAdjacentHTML("beforebegin", '<button type="submit" class="tutor-explain" data-tutor-mode="explanation">需要完整解释</button>');
  syncPanelAccessibility();
  activateTableOfContents();
  void renderMermaidDiagrams().finally(() => {
    if (!shouldRestoreReadingPosition) return;
    window.scrollTo(0, readingPosition);
    shouldRestoreReadingPosition = false;
  });
}

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

app.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const kind = activePanelKind();
    if (kind) {
      event.preventDefault();
      toggleAuxiliaryPanel(kind);
      return;
    }
  }
  trapAuxiliaryPanelFocus(event);
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
  window.clearTimeout(readingPositionTimer);
  readingPositionTimer = window.setTimeout(saveReadingPosition, 600);
}, { passive: true });

window.addEventListener("pagehide", () => saveReadingPosition(true));

async function updateState(property) {
  state = await request(`/api/learning-state?lessonId=${encodeURIComponent(lesson.id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...state, [property]: !state[property] })
  });
  course = await request("/api/course");
  render();
}

app.addEventListener("change", (event) => {
  const select = event.target.closest("#theme-select");
  if (!select || !themePreferences.includes(select.value)) return;
  themePreference = select.value;
  try {
    localStorage.setItem(themeStorageKey, themePreference);
  } catch {
    // Theme still applies for this session when storage is unavailable.
  }
  applyThemePreference();
  render();
  window.requestAnimationFrame(() => document.querySelector("#theme-select")?.focus({ preventScroll: true }));
});

app.addEventListener("click", async (event) => {
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
      await request(`/api/review-items/${encodeURIComponent(resolveReviewItem.dataset.reviewItemId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resolved: true })
      });
      reviewItems = reviewItems.filter((item) => item.id !== Number(resolveReviewItem.dataset.reviewItemId));
      render();
    } catch (error) {
      resolveReviewItem.disabled = false;
      window.alert(error.message);
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
    render();
    if (navigatorOpen) window.requestAnimationFrame(() => document.querySelector("#course-navigator a")?.focus({ preventScroll: true }));
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
    await loadLesson(courseLink.dataset.lessonId);
    if (navigatorOpen && window.matchMedia("(max-width: 900px)").matches) navigatorOpen = false;
    return;
  }
  const navigatorLink = event.target.closest("#course-navigator a");
  if (navigatorLink && navigatorOpen && window.matchMedia("(max-width: 900px)").matches) {
    window.setTimeout(() => {
      navigatorOpen = false;
      render();
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
      await request(lessonApi(`/api/tutor/messages/${encodeURIComponent(id)}`), { method: "DELETE" });
      tutorMessages = tutorMessages.filter((message) => message.id !== Number(id));
      render();
    } catch (error) {
      tutorMessageDelete.disabled = false;
      window.alert(error.message);
    }
    return;
  }
  const clearTutor = event.target.closest("button[data-clear-tutor]");
  if (clearTutor) {
    if (!window.confirm("确定清空本课的全部对话吗？此操作无法撤销。")) return;
    clearTutor.disabled = true;
    try {
      await request(lessonApi("/api/tutor/messages"), { method: "DELETE" });
      tutorMessages = [];
      render();
    } catch (error) {
      clearTutor.disabled = false;
      window.alert(error.message);
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
    window.alert(error.message);
  }
});

app.addEventListener("submit", async (event) => {
  if (event.target.id === "quiz-form") {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector("button");
    const status = form.querySelector("#quiz-status");
    button.disabled = true;
    status.textContent = "正在核对…";
    try {
      const answers = Object.fromEntries(quiz.questions.map((question) => [
        question.id,
        Number(new FormData(form).get(`quiz-${question.id}`))
      ]));
      quizResult = await request(`/api/quiz/attempts?lessonId=${encodeURIComponent(lesson.id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers })
      });
      course = await request("/api/course");
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
      tutorStatus = "连接已保存在本机。";
    } catch (error) {
      tutorStatus = error.message;
    }
    render();
    return;
  }
  if (event.target.id === "tutor-form") {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector("button");
    button.disabled = true;
    tutorStatus = "正在依据课程证据思考…";
    document.querySelector("#tutor-status").textContent = tutorStatus;
    try {
      const result = await request(`/api/tutor/messages?lessonId=${encodeURIComponent(lesson.id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: new FormData(form).get("text"),
          context: { sectionTitle: activeSectionTitle, theoryCardSlug: activeTheoryCardSlug },
          mode: event.submitter?.dataset?.tutorMode === "explanation" ? "explanation" : "socratic"
        })
      });
      tutorMessages.push(result.userMessage, result.assistantMessage);
      tutorStatus = "";
      render();
    } catch (error) {
      button.disabled = false;
      tutorStatus = error.message;
      document.querySelector("#tutor-status").textContent = tutorStatus;
    }
    return;
  }
  if (event.target.id === "review-item-form") {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector("button");
    const status = form.querySelector("#review-item-status");
    button.disabled = true;
    status.textContent = "正在保存…";
    try {
      const reviewItem = await request(`/api/review-items?lessonId=${encodeURIComponent(lesson.id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: new FormData(form).get("text") })
      });
      reviewItems.unshift(reviewItem);
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
    if (!window.confirm("导入会替换当前学习数据，且无法撤销。模型连接和私人工作区不会受影响。是否继续？")) return;
    button.disabled = true;
    status.textContent = "正在验证并恢复备份…";
    try {
      const backup = JSON.parse(await file.text());
      const result = await request("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(backup)
      });
      window.alert(`已恢复：${result.restored.learningStates} 个课程状态、${result.restored.notes} 条笔记、${result.restored.tutorMessages} 条对话、${result.restored.reviewItems} 个复习项和 ${result.restored.quizAttempts} 次自测。`);
      await loadLesson(lesson.id);
    } catch (error) {
      button.disabled = false;
      status.textContent = error instanceof SyntaxError ? "备份不是有效的 JSON 文件。" : error.message;
    }
    return;
  }
  if (event.target.id !== "note-form") return;
  event.preventDefault();
  const form = event.target;
  const status = form.querySelector("#form-status");
  const button = form.querySelector("button");
  button.disabled = true;
  status.textContent = "正在保存…";
  try {
    const note = await request(`/api/notes?lessonId=${encodeURIComponent(lesson.id)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: new FormData(form).get("text") })
    });
    notes.unshift(note);
    course = await request("/api/course");
    render();
  } catch (error) {
    button.disabled = false;
    status.textContent = error.message;
  }
});

async function loadLesson(lessonId) {
  const [nextLesson, nextState, nextNotes, , nextContent, nextReadingPosition, nextModelConfig, nextTutorMessages, nextReviewItems, nextQuiz, nextQuizResult, nextCourse] = await Promise.all([
    request(lessonApi("/api/lesson", lessonId)),
    request(lessonApi("/api/learning-state", lessonId)),
    request(lessonApi("/api/notes", lessonId)),
    request(lessonApi("/api/tools", lessonId)),
    request(lessonApi("/api/lesson/content", lessonId)),
    request(lessonApi("/api/reading-position", lessonId)),
    request("/api/model-config"),
    request(lessonApi("/api/tutor/messages", lessonId)),
    request(lessonApi("/api/review-items", lessonId)),
    request(lessonApi("/api/quiz", lessonId)),
    request(lessonApi("/api/quiz/attempts", lessonId)),
    request("/api/course")
  ]);
  lesson = nextLesson;
  selectedLessonId = lesson.id;
  state = nextState;
  notes = nextNotes;
  content = nextContent;
  readingPosition = nextReadingPosition.position;
  modelConfig = nextModelConfig;
  tutorMessages = nextTutorMessages;
  reviewItems = nextReviewItems;
  quiz = nextQuiz;
  quizResult = nextQuizResult;
  course = nextCourse;
  activeSectionTitle = "本课概览";
  activeTheoryCardSlug = "";
  shouldRestoreReadingPosition = true;
  window.history.replaceState({}, "", `/learn?lessonId=${encodeURIComponent(lesson.id)}#lesson`);
  render();
}

loadLesson(selectedLessonId).catch((error) => {
  app.innerHTML = `<p class="error">无法打开本地学习空间：${escapeHtml(error.message)}</p>`;
});
