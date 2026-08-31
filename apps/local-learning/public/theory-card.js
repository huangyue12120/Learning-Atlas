const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
}[character]));

export function normalizedTheoryDestination(value) {
  try {
    return new URL(value, "http://learning-atlas.local").href;
  } catch {
    return String(value ?? "").trim();
  }
}

function externalDestination(value) {
  return /^https?:\/\//i.test(value);
}

export function theoryCardActions(card) {
  const candidates = card.readKind === "internal"
    ? [
      { href: card.readUrl, label: "阅读完整中文理论", kind: "primary" },
      { href: card.latestSourceUrl || card.sourceUrl, label: "查看英文原文", kind: "secondary" }
    ]
    : [
      { href: card.readUrl || card.latestSourceUrl || card.sourceUrl, label: "阅读英文原文", kind: "primary" }
    ];
  const destinations = new Set();
  return candidates.filter(({ href }) => {
    if (!href) return false;
    const normalized = normalizedTheoryDestination(href);
    if (!normalized || destinations.has(normalized)) return false;
    destinations.add(normalized);
    return true;
  }).map((action) => ({ ...action, external: externalDestination(action.href) }));
}

function actionHtml(action) {
  const target = action.external ? " target=\"_blank\" rel=\"noreferrer\"" : "";
  return `<a class="theory-card-action ${action.kind}" href="${escapeHtml(action.href)}"${target}>${escapeHtml(action.label)}</a>`;
}

function detailBlock(label, content, className = "") {
  return `<div class="theory-card-detail${className ? ` ${className}` : ""}"><p class="theory-card-detail-label">${label}</p><p>${escapeHtml(content)}</p></div>`;
}

export function renderTheoryCard(card) {
  const languageLabel = card.readKind === "internal" ? "中文全文可读" : "英文原文";
  const sourceNote = card.readKind === "internal"
    ? "中文全文按本地同步快照审核；英文入口始终跟随官方上游 main。"
    : "中文全文尚未发布；当前入口打开官方上游 main。";
  const actions = theoryCardActions(card).map(actionHtml).join("");
  const header = `
    <summary>
      <span class="theory-card-topline"><span class="theory-card-kicker">上下文理论</span><span class="theory-card-language">${languageLabel}</span></span>
      <strong>${escapeHtml(card.title)}</strong>
      <small class="theory-card-summary">${escapeHtml(card.summary)}</small>
    </summary>`;
  const footer = `<div class="theory-card-footer"><div class="theory-card-actions">${actions}</div><small>${sourceNote}</small></div>`;
  const hasRichContent = Boolean(card.context && card.intuition && Array.isArray(card.keyPoints) && card.keyPoints.length >= 2 && card.keyPoints.length <= 4 && card.application && card.checkQuestion);
  if (!hasRichContent) {
    return `<details class="theory-card">${header}
    <div class="theory-card-body">
      <div class="theory-card-legacy"><p class="theory-card-detail-label">扩展内容待迁移</p><p>当前只展示已审核的标题与摘要；不会自动补写未经审核的理论解释。</p></div>
      ${footer}
    </div>
  </details>`;
  }
  const keyPoints = card.keyPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("");
  return `<details class="theory-card">
    ${header}
    <div class="theory-card-body">
      ${detailBlock("为什么现在需要", card.context, "context")}
      <div class="theory-card-detail-grid">
        ${detailBlock("核心直觉", card.intuition)}
        <div class="theory-card-detail"><p class="theory-card-detail-label">关键点</p><ul>${keyPoints}</ul></div>
      </div>
      ${detailBlock("在本课中怎么用", card.application, "application")}
      <div class="theory-card-check"><p class="theory-card-detail-label">先想一想</p><p>${escapeHtml(card.checkQuestion)}</p></div>
      ${footer}
    </div>
  </details>`;
}
