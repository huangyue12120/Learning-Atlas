import { gsap } from "/vendor/gsap/index.js";
import { ScrollTrigger } from "/vendor/gsap/ScrollTrigger.js";
import { escapeHtml } from "/markdown.js";
import { applyTheme, observeSystemTheme, saveTheme, themePreference, themeSelect } from "/theme.js";

gsap.registerPlugin(ScrollTrigger);

const app = document.querySelector("#app");
let phaseIndex = 0;
let phaseVisibleCount = 1;
let curriculum;
let motionContext;

applyTheme();
observeSystemTheme(() => ScrollTrigger.refresh());

async function request(path) {
  const response = await fetch(path);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "请求失败");
  return data;
}

function phaseCards(phases) {
  if (!phases.length) return '<div class="home-empty"><h3>课程地图还没有内容</h3><p>刷新目录后再试。</p></div>';
  return phases.map((phase) => {
    const available = phase.status === "available";
    const title = `${phase.position}. ${phase.title}`;
    return `<article class="phase-card${available ? "" : " staged"}" data-phase-card>
      <div class="phase-card-top"><span>${available ? "可学习" : "已审核，待接入"}</span><strong>${escapeHtml(phase.position)}</strong></div>
      <h3>${escapeHtml(phase.title)}</h3>
      <p>${phase.lessonCount} 节课程${available ? `，${phase.availableLessonCount} 节已发布` : "，本轮不开放阅读"}</p>
      ${available && phase.firstLessonId ? `<a href="/learn?lessonId=${encodeURIComponent(phase.firstLessonId)}" aria-label="进入${escapeHtml(title)}">进入本阶段</a>` : '<span class="phase-staged-note">待后续版本开放</span>'}
    </article>`;
  }).join("");
}

function theoryDirectory(chapters) {
  if (!chapters.length) return '<div class="home-empty"><h3>理论目录还没有内容</h3><p>刷新目录后再试。</p></div>';
  return chapters.map((chapter, chapterIndex) => {
    const notes = chapter.notes.map((note) => {
      const external = note.readKind === "external";
      return `<a href="${escapeHtml(note.readUrl)}"${external ? ' target="_blank" rel="noreferrer"' : ""}><span>${escapeHtml(note.position)} ${escapeHtml(note.title)}</span><small>${note.readLanguage === "zh" ? "已审核中文" : "English main"}</small></a>`;
    }).join("");
    return `<details class="home-theory-chapter"${chapterIndex === 3 ? " open" : ""}><summary><span>${escapeHtml(chapter.position)}</span><strong>${escapeHtml(chapter.title)}</strong><small>${chapter.notes.length} 节</small></summary><div class="home-theory-notes">${notes}</div></details>`;
  }).join("");
}

function courseMarquee(phases, chapters) {
  const fields = [
    ...phases.slice(0, 14).map((phase) => phase.title),
    ...chapters.map((chapter) => chapter.title)
  ];
  const content = fields.map((field) => `<span>${escapeHtml(field)}</span>`).join("");
  return `<div class="course-marquee" aria-label="课程领域"><div>${content}${content}</div></div>`;
}

function updateCarousel(nextIndex, announce = true) {
  const cards = [...document.querySelectorAll("[data-phase-card]")];
  const viewport = document.querySelector(".phase-viewport");
  const track = document.querySelector(".phase-track");
  if (!cards.length || !viewport || !track) return;
  phaseIndex = Math.max(0, Math.min(nextIndex, cards.length - 1));
  const cardWidth = cards[0].getBoundingClientRect().width;
  const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
  const visible = Math.max(1, Math.floor((viewport.clientWidth + gap) / (cardWidth + gap)));
  phaseVisibleCount = visible;
  const maximumIndex = Math.max(0, cards.length - visible);
  phaseIndex = Math.min(phaseIndex, maximumIndex);
  track.style.transform = `translate3d(${-phaseIndex * (cardWidth + gap)}px, 0, 0)`;
  cards.forEach((card, index) => {
    const visibleCard = index >= phaseIndex && index < phaseIndex + visible;
    card.toggleAttribute("aria-hidden", !visibleCard);
    card.querySelectorAll("a").forEach((link) => {
      if (visibleCard) link.removeAttribute("tabindex");
      else link.setAttribute("tabindex", "-1");
    });
  });
  document.querySelector("[data-phase-prev]")?.toggleAttribute("disabled", phaseIndex === 0);
  document.querySelector("[data-phase-next]")?.toggleAttribute("disabled", phaseIndex === maximumIndex);
  const status = document.querySelector("#phase-carousel-status");
  if (status && announce) {
    const first = cards[phaseIndex]?.querySelector(".phase-card-top strong")?.textContent ?? "00";
    const last = cards[Math.min(cards.length - 1, phaseIndex + visible - 1)]?.querySelector(".phase-card-top strong")?.textContent ?? first;
    status.textContent = first === last ? `当前显示 Phase ${first}` : `当前显示 Phase ${first}–${last}`;
  }
  const jump = document.querySelector("[data-phase-jump]");
  if (jump) jump.value = String(phaseIndex);
}

function splitScrubText() {
  const element = document.querySelector("[data-scrub-copy]");
  if (!element || element.dataset.split === "true") return;
  const words = element.textContent.trim().split(/(\s+)/);
  element.innerHTML = words.map((word) => /^\s+$/.test(word) ? word : `<span>${escapeHtml(word)}</span>`).join("");
  element.dataset.split = "true";
}

function initMotion() {
  motionContext?.revert();
  splitScrubText();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = window.matchMedia("(min-width: 1024px)").matches;
  const lowPerformance = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const words = gsap.utils.toArray("[data-scrub-copy] span");
  const staticMotion = reduce || !desktop || lowPerformance;
  document.body.classList.toggle("home-static-motion", staticMotion);
  gsap.set(words, { opacity: 1 });
  if (staticMotion) return;
  motionContext = gsap.context(() => {
    const mapSection = document.querySelector(".practice-map-section");
    const mapHeading = document.querySelector(".practice-map-heading");
    if (mapSection && mapHeading) {
      ScrollTrigger.create({
        trigger: mapHeading,
        start: "top top",
        endTrigger: document.querySelector(".phase-carousel") ?? mapSection,
        end: () => `top ${Math.min(mapHeading.offsetHeight + 16, window.innerHeight - 96)}px`,
        pin: mapHeading,
        pinSpacing: false
      });
    }
    if (words.length) {
      gsap.fromTo(words, { opacity: 0.18 }, {
        opacity: 1,
        stagger: 0.08,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-scrub-copy]",
          start: "top 90%",
          end: "top 68%",
          scrub: 0.2,
          onLeave: () => gsap.set(words, { opacity: 1 }),
          onEnterBack: () => gsap.set(words, { opacity: 0.18 })
        }
      });
    }
  }, app);
}

function render() {
  const target = curriculum.target;
  const targetHref = target.url ?? "#practice-course";
  document.title = "Learning Atlas | 从原理走到运行";
  app.innerHTML = `
    <div class="home-shell">
      <header class="home-nav">
        <a class="brand" href="/" aria-current="page">Learning Atlas</a>
        <nav aria-label="主要导航"><a href="#practice-course">实践主线</a><a href="#theory-course">理论课程</a></nav>
        ${themeSelect(themePreference(), "home-theme-select")}
      </header>
      <main id="main-content">
        <section class="home-hero" aria-labelledby="home-title">
          <div class="home-hero-backdrop" aria-hidden="true"></div>
          <div class="home-hero-copy">
            <p class="home-kicker">理论建立坐标，实践验证理解</p>
            <div class="home-hero-main">
              <h1 id="home-title">从原理，走到能运行的 AI 系统</h1>
              <div class="home-hero-side">
                <p>沿实践主线动手构建，也可独立浏览完整理论课程。</p>
                <div class="home-hero-actions"><a class="primary-action" href="${escapeHtml(targetHref)}">${escapeHtml(target.label)}</a><a class="secondary-action" href="#practice-course">浏览全部课程</a></div>
              </div>
            </div>
          </div>
          <div class="hero-atlas-grid" aria-label="Learning Atlas 学习概念插画">
            <figure class="hero-visual hero-visual-main"><img src="/assets/hero/sampling-uncertainty.webp" alt="抽样点汇聚成分布曲线的编辑式统计插画" width="1672" height="941"><figcaption>统计学：从抽样到分布</figcaption></figure>
            <figure class="hero-visual"><img src="/assets/hero/transformer-attention.webp" alt="层叠 token 通过注意力窗口汇聚的编辑式插画" width="1672" height="941"><figcaption>模型：注意力与 Transformer</figcaption></figure>
            <figure class="hero-visual"><img src="/assets/hero/retrieval-knowledge.webp" alt="知识卡片经由一条琥珀路径检索到生成框架的编辑式插画" width="1672" height="941"><figcaption>系统：检索与生成</figcaption></figure>
          </div>
        </section>
        ${courseMarquee(curriculum.practice, curriculum.theory)}
        <section id="practice-course" class="practice-map-section" aria-labelledby="practice-title">
          <div class="practice-map-heading">
            <h2 id="practice-title">20 个 Phase，一条实践主线</h2>
            <p>Phase 0-13 可进入学习。Phase 14-19 已审核，等待接入阅读器。</p>
          </div>
          <div class="phase-carousel" aria-roledescription="carousel" aria-label="实践课程 Phase">
            <div class="phase-carousel-controls"><button type="button" data-phase-prev aria-label="查看上一组 Phase">上一组</button><p id="phase-carousel-status" role="status" aria-live="polite">当前显示 Phase 00</p><button type="button" data-phase-next aria-label="查看下一组 Phase">下一组</button></div>
            <label class="phase-jump"><span>直接跳到</span><select data-phase-jump aria-label="直接跳到 Phase">${curriculum.practice.map((phase, index) => `<option value="${index}">Phase ${escapeHtml(phase.position)} · ${escapeHtml(phase.title.replace(/^Phase\s*\d+\s*[·.]?\s*/, ""))}</option>`).join("")}</select></label>
            <div class="phase-viewport" tabindex="0"><div class="phase-track">${phaseCards(curriculum.practice)}</div></div>
          </div>
        </section>
        <section id="theory-course" class="theory-directory-section" aria-labelledby="theory-title">
          <div class="theory-directory-intro"><h2 id="theory-title">20 章完整理论课程</h2><p>有审核中文全文时在应用内阅读；其余条目打开官方上游最新英文原文。</p></div>
          <div class="home-theory-directory">${theoryDirectory(curriculum.theory)}</div>
        </section>
        <section class="course-relationship" aria-labelledby="relationship-title">
          <p id="relationship-title" data-scrub-copy>实践主线回答怎样构建，理论课程回答为什么成立。上下文理论卡把两者连接在当前任务需要的位置。</p>
          <div class="course-relationship-grid"><article><h2>实践优先</h2><p>学习状态、笔记、自测、助理和工作区继续属于实践课程。</p></article><article><h2>理论独立</h2><p>理论课程可以完整浏览，但本轮不记录个人进度，也不制造掌握感。</p></article></div>
        </section>
        <section class="home-action" aria-labelledby="action-title"><h2 id="action-title">从第一节可运行课程开始</h2><p>你的学习数据只保存在本机。</p><a class="primary-action" href="${escapeHtml(targetHref)}">${escapeHtml(target.label)}</a></section>
      </main>
      <footer class="home-footer"><a class="brand" href="/">Learning Atlas</a><p>理论与实践，共用一张可追溯的学习地图。</p><a href="#home-title">回到顶部</a></footer>
    </div>`;
  updateCarousel(0);
  initMotion();
}

function renderError(message) {
  document.title = "Learning Atlas";
  app.innerHTML = `<main class="page-state" id="main-content"><p>课程目录暂时无法加载。</p><h1>${escapeHtml(message)}</h1><div class="page-state-actions"><button type="button" data-retry>重试</button><a href="/learn">直接进入实践课程</a></div></main>`;
}

app.addEventListener("change", (event) => {
  if (event.target.id === "home-theme-select") saveTheme(event.target.value);
  if (event.target.matches("[data-phase-jump]")) updateCarousel(Number(event.target.value));
});

app.addEventListener("click", (event) => {
  if (event.target.closest("[data-retry]")) {
    window.location.reload();
    return;
  }
  if (event.target.closest("[data-phase-prev]")) updateCarousel(phaseIndex - phaseVisibleCount);
  if (event.target.closest("[data-phase-next]")) updateCarousel(phaseIndex + phaseVisibleCount);
});

app.addEventListener("keydown", (event) => {
  if (!event.target.closest(".phase-viewport")) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    updateCarousel(phaseIndex - phaseVisibleCount);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    updateCarousel(phaseIndex + phaseVisibleCount);
  }
});

window.addEventListener("resize", () => {
  updateCarousel(phaseIndex, false);
  initMotion();
});

request("/api/curriculum")
  .then((data) => {
    curriculum = data;
    render();
  })
  .catch((error) => renderError(error.message));
