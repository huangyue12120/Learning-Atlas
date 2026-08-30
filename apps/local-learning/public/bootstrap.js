const app = document.querySelector("#app");
const skipLink = document.querySelector(".skip-link");
const params = new URLSearchParams(window.location.search);
const practice = window.location.pathname === "/learn" || (window.location.pathname === "/" && params.has("lessonId"));
const theory = window.location.pathname === "/theory";
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
}[character]));

function homeSkeleton() {
  return `<div class="home-skeleton" aria-label="正在加载课程首页" aria-busy="true"><div class="skeleton-nav skeleton-block"></div><div class="skeleton-copy"><div class="skeleton-line wide skeleton-block"></div><div class="skeleton-line skeleton-block"></div><div class="skeleton-actions"><span class="skeleton-block"></span><span class="skeleton-block"></span></div></div><div class="skeleton-visual-grid"><span class="skeleton-block"></span><span class="skeleton-block"></span><span class="skeleton-block"></span></div></div>`;
}

function readerSkeleton(kind) {
  return `<div class="reader-skeleton ${kind}" aria-label="正在加载阅读器" aria-busy="true"><aside class="skeleton-block"></aside><main><div class="skeleton-line short skeleton-block"></div><div class="skeleton-line wide skeleton-block"></div><div class="skeleton-line skeleton-block"></div><div class="skeleton-paragraph skeleton-block"></div><div class="skeleton-paragraph skeleton-block"></div></main></div>`;
}

async function start() {
  if (theory) {
    document.body.className = "theory-page";
    skipLink.setAttribute("href", "#main-content");
    app.innerHTML = readerSkeleton("theory");
    await import("/theory.js");
    return;
  }
  if (practice) {
    document.body.className = "practice-page";
    skipLink.setAttribute("href", "#lesson");
    app.innerHTML = readerSkeleton("practice");
    await import("/app.js");
    return;
  }
  document.body.className = "home-page";
  skipLink.setAttribute("href", "#main-content");
  app.innerHTML = homeSkeleton();
  await import("/home.js");
}

start().catch((error) => {
  app.innerHTML = `<main class="page-state" id="main-content"><p>页面模块无法加载。</p><h1>${escapeHtml(error.message ?? error)}</h1><div class="page-state-actions"><button type="button" data-bootstrap-retry>重试</button><a href="/">返回首页</a></div></main>`;
  app.querySelector("[data-bootstrap-retry]")?.addEventListener("click", () => window.location.reload());
});
