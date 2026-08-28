const DECISION_LABELS = {
  unreviewed: "待审核",
  approved: "通过 · 待转正式",
  proposed: "暂缓 · 保留候选",
  rejected: "不通过 · 标记拒绝"
};

const STORAGE_KEY = "learning-atlas-theory-link-review-backup-v1";
const state = {
  candidates: [],
  reviews: {},
  phase: "all",
  decision: "all",
  query: "",
  page: 1,
  pageSize: 15,
  saveTimer: null,
  saving: false
};

const elements = {};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function decisionFor(candidateId) {
  const record = state.reviews[candidateId];
  if (typeof record === "string") return record;
  return record?.decision && DECISION_LABELS[record.decision] ? record.decision : "unreviewed";
}

function setSaveStatus(message, kind = "") {
  elements.saveStatus.textContent = message;
  elements.saveStatus.dataset.state = kind;
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function normalizedRecord(value) {
  const decision = typeof value === "string" ? value : value?.decision;
  return DECISION_LABELS[decision] ? { decision } : null;
}

function loadLocalBackup() {
  try {
    const backup = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!backup || typeof backup !== "object" || !backup.reviews) return null;
    return Object.fromEntries(
      Object.entries(backup.reviews)
        .map(([id, value]) => [id, normalizedRecord(value)])
        .filter(([, value]) => value)
    );
  } catch {
    return null;
  }
}

function writeLocalBackup() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), reviews: state.reviews }));
  } catch {
    // The server-side file remains the source of truth when browser storage is unavailable.
  }
}

async function loadData() {
  const [candidateResponse, reviewResponse] = await Promise.all([
    fetch("/api/candidates", { cache: "no-store" }),
    fetch("/api/reviews", { cache: "no-store" })
  ]);
  if (!candidateResponse.ok || !reviewResponse.ok) throw new Error("无法读取审核数据，请重启本地审核服务后重试。");
  const candidatePayload = await candidateResponse.json();
  const reviewPayload = await reviewResponse.json();
  state.candidates = Array.isArray(candidatePayload.candidates) ? candidatePayload.candidates : [];
  const serverReviews = reviewPayload.reviews && typeof reviewPayload.reviews === "object" ? reviewPayload.reviews : {};
  const localBackup = loadLocalBackup();
  state.reviews = Object.fromEntries(
    Object.entries(Object.keys(serverReviews).length ? serverReviews : (localBackup || {}))
      .map(([id, value]) => [id, normalizedRecord(value)])
      .filter(([, value]) => value)
  );
  elements.introTotal.textContent = String(state.candidates.length);
  setSaveStatus(reviewPayload.savedAt ? `已加载上次保存：${formatTime(reviewPayload.savedAt)}` : "尚未保存审核选择");
  populatePhaseFilter();
  render();
  if (!Object.keys(serverReviews).length && localBackup && Object.keys(localBackup).length) scheduleSave();
}

function populatePhaseFilter() {
  const phases = new Map();
  for (const candidate of state.candidates) {
    phases.set(candidate.phase, (phases.get(candidate.phase) || 0) + 1);
  }
  elements.phaseFilter.innerHTML = '<option value="all">全部 Phase</option>';
  for (const [phase, count] of phases) {
    const candidate = state.candidates.find((item) => item.phase === phase);
    const option = document.createElement("option");
    option.value = phase;
    option.textContent = `${candidate?.phaseTitle || phase} · ${count} 条`;
    elements.phaseFilter.append(option);
  }
}

function matchesCandidate(candidate) {
  if (state.phase !== "all" && candidate.phase !== state.phase) return false;
  if (state.decision !== "all" && decisionFor(candidate.id) !== state.decision) return false;
  if (!state.query) return true;
  const haystack = [
    candidate.cardTitle,
    candidate.candidateReason,
    candidate.phaseTitle,
    candidate.lesson,
    candidate.filePath,
    candidate.practice?.path,
    candidate.practice?.heading,
    candidate.theory?.path,
    candidate.theory?.heading,
    candidate.automaticAudit?.reason
  ].join(" ").toLocaleLowerCase();
  return haystack.includes(state.query.toLocaleLowerCase());
}

function filteredCandidates() {
  return state.candidates.filter(matchesCandidate);
}

function renderStats() {
  const total = state.candidates.length;
  const counts = { approved: 0, proposed: 0, rejected: 0, unreviewed: 0 };
  for (const candidate of state.candidates) counts[decisionFor(candidate.id)] += 1;
  const reviewed = total - counts.unreviewed;
  elements.statTotal.textContent = String(total);
  elements.statReviewed.textContent = `${reviewed} / ${total}`;
  elements.statReviewedDetail.textContent = total ? `${Math.round((reviewed / total) * 100)}% 已有决定` : "暂无候选";
  elements.statApproved.textContent = String(counts.approved);
  elements.statPending.textContent = String(counts.unreviewed);
}

function statusChip(decision) {
  return `<span class="status-chip ${escapeHtml(decision)}">${escapeHtml(DECISION_LABELS[decision])}</span>`;
}

function sourceLink(url, label) {
  if (!url) return "";
  return `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)} ↗</a>`;
}

function auditMarkup(candidate) {
  const audit = candidate.automaticAudit || { status: "attention", reason: "没有自动核验结果。", checks: [] };
  const passed = audit.status === "passed";
  const checks = Array.isArray(audit.checks) ? audit.checks : [];
  return `
    <div class="audit-box ${passed ? "audit-passed" : "audit-attention"}">
      <div class="audit-heading">
        <strong>自动审核说明</strong>
        <span class="audit-result ${passed ? "passed" : "attention"}">${passed ? "来源与锚点核验通过" : "需要注意自动核验结果"}</span>
      </div>
      <p>${escapeHtml(audit.reason)}</p>
      <ul class="audit-checks">
        ${checks.map((check) => `<li class="${check.status === "passed" ? "" : "attention"}"><span>${escapeHtml(check.label)}</span><span>${escapeHtml(check.detail)}</span></li>`).join("")}
      </ul>
    </div>`;
}

function decisionOptions(selected) {
  return Object.entries(DECISION_LABELS)
    .map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`)
    .join("");
}

function candidateMarkup(candidate, index) {
  const decision = decisionFor(candidate.id);
  const cardId = `candidate-card-${index}`;
  return `
    <article class="candidate-card status-${escapeHtml(decision)}" id="${cardId}">
      <header class="card-header">
        <div class="card-header-main">
          <span class="card-index">CANDIDATE ${String(index + 1).padStart(3, "0")}</span>
          <div class="card-title">${escapeHtml(candidate.cardTitle || "未命名候选关联")}</div>
          <span class="card-phase">${escapeHtml(candidate.phaseTitle)} · ${escapeHtml(candidate.lesson)}</span>
        </div>
        ${statusChip(decision)}
      </header>
      <div class="card-body">
        <dl class="field field-wide">
          <dt>候选关联</dt>
          <dd>
            <strong>${escapeHtml(candidate.cardTitle || "未命名候选关联")}</strong>
            <span class="file-path">${escapeHtml(candidate.filePath)}</span>
          </dd>
        </dl>
        <dl class="field">
          <dt>关联章节</dt>
          <dd>
            <strong>${escapeHtml(candidate.theory?.heading || "未提供章节锚点")}</strong>
            <span class="file-path">${escapeHtml(candidate.theory?.path || "")}</span>
            ${sourceLink(candidate.theory?.sourceUrl, "查看锁定理论原文")}
          </dd>
        </dl>
        <dl class="field">
          <dt>位置</dt>
          <dd>
            <strong>${escapeHtml(candidate.practice?.heading || "未提供课程锚点")}</strong>
            <span class="file-path">${escapeHtml(candidate.practice?.path || "")}</span>
            ${sourceLink(candidate.practice?.sourceUrl, "查看锁定课程原文")}
          </dd>
        </dl>
        <dl class="field field-wide">
          <dt>候选原因</dt>
          <dd>${escapeHtml(candidate.candidateReason || "候选文件没有提供摘要。")}</dd>
        </dl>
        <div class="field field-wide">
          <div class="field dt">未通过自动审核原因</div>
          ${auditMarkup(candidate)}
        </div>
      </div>
      <div class="decision-panel">
        <label class="decision-label" for="decision-${index}">
          是否通过审核
          <select class="decision-select" id="decision-${index}" data-candidate-id="${escapeHtml(candidate.id)}">
            ${decisionOptions(decision)}
          </select>
        </label>
        <p class="decision-help">“通过”只记录你的决定；你审核完全部条目后，Codex 才会把对应 YAML 的 <code>status</code> 更新为 <code>approved</code>。</p>
      </div>
    </article>`;
}

function renderPagination(total, maxPage) {
  if (maxPage <= 1) {
    elements.pagination.hidden = true;
    elements.pagination.innerHTML = "";
    return;
  }
  elements.pagination.hidden = false;
  elements.pagination.innerHTML = `
    <button type="button" data-page="prev" ${state.page === 1 ? "disabled" : ""}>上一页</button>
    <span>第 ${state.page} / ${maxPage} 页 · 共 ${total} 条</span>
    <button type="button" data-page="next" ${state.page === maxPage ? "disabled" : ""}>下一页</button>`;
}

function render() {
  renderStats();
  const filtered = filteredCandidates();
  const maxPage = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  if (state.page > maxPage) state.page = maxPage;
  const start = (state.page - 1) * state.pageSize;
  const pageItems = filtered.slice(start, start + state.pageSize);
  elements.pageStatus.textContent = filtered.length
    ? `显示 ${start + 1}–${Math.min(start + state.pageSize, filtered.length)} / ${filtered.length} 条；每页 ${state.pageSize} 条`
    : "没有符合当前筛选条件的条目";
  elements.candidateList.innerHTML = pageItems.map((candidate, index) => candidateMarkup(candidate, start + index)).join("");
  elements.emptyState.hidden = filtered.length !== 0;
  renderPagination(filtered.length, maxPage);
}

async function saveToServer() {
  if (state.saving) return;
  state.saving = true;
  setSaveStatus("保存中…");
  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviews: state.reviews })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "保存失败。");
    setSaveStatus(`已保存：${formatTime(payload.savedAt)}`, "saved");
  } catch (error) {
    setSaveStatus(`保存失败：${error.message}；已保留浏览器备份。`, "error");
  } finally {
    state.saving = false;
  }
}

function scheduleSave() {
  writeLocalBackup();
  window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(saveToServer, 280);
}

function exportReviews() {
  const payload = {
    kind: "learning-atlas-theory-link-review",
    version: 1,
    exportedAt: new Date().toISOString(),
    candidateCount: state.candidates.length,
    reviews: state.reviews
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "theory-link-review-results.json";
  link.click();
  URL.revokeObjectURL(url);
  setSaveStatus("已导出审核结果文件。", "saved");
}

async function importReviews(file) {
  const payload = JSON.parse(await file.text());
  const incoming = payload?.reviews;
  if (!incoming || typeof incoming !== "object") throw new Error("文件中没有找到 reviews 对象。");
  const validIds = new Set(state.candidates.map((candidate) => candidate.id));
  state.reviews = Object.fromEntries(
    Object.entries(incoming)
      .filter(([id]) => validIds.has(id))
      .map(([id, value]) => [id, normalizedRecord(value)])
      .filter(([, value]) => value)
  );
  render();
  scheduleSave();
  setSaveStatus("已导入并保存审核结果。", "saved");
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    state.page = 1;
    render();
  });
  elements.phaseFilter.addEventListener("change", (event) => {
    state.phase = event.target.value;
    state.page = 1;
    render();
  });
  elements.decisionFilter.addEventListener("change", (event) => {
    state.decision = event.target.value;
    state.page = 1;
    render();
  });
  elements.candidateList.addEventListener("change", (event) => {
    if (!event.target.matches("select[data-candidate-id]")) return;
    const id = event.target.dataset.candidateId;
    const decision = event.target.value;
    state.reviews[id] = { decision, updatedAt: new Date().toISOString() };
    render();
    scheduleSave();
  });
  elements.pagination.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page]");
    if (!button) return;
    const filtered = filteredCandidates();
    const maxPage = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    if (button.dataset.page === "prev") state.page = Math.max(1, state.page - 1);
    if (button.dataset.page === "next") state.page = Math.min(maxPage, state.page + 1);
    render();
    elements.candidateList.focus({ preventScroll: true });
  });
  elements.exportButton.addEventListener("click", exportReviews);
  elements.importInput.addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    try {
      await importReviews(file);
    } catch (error) {
      setSaveStatus(`导入失败：${error.message}`, "error");
    } finally {
      event.target.value = "";
    }
  });
}

function cacheElements() {
  elements.introTotal = document.querySelector("#intro-total");
  elements.statTotal = document.querySelector("#stat-total");
  elements.statReviewed = document.querySelector("#stat-reviewed");
  elements.statReviewedDetail = document.querySelector("#stat-reviewed-detail");
  elements.statApproved = document.querySelector("#stat-approved");
  elements.statPending = document.querySelector("#stat-pending");
  elements.saveStatus = document.querySelector("#save-status");
  elements.searchInput = document.querySelector("#search-input");
  elements.phaseFilter = document.querySelector("#phase-filter");
  elements.decisionFilter = document.querySelector("#decision-filter");
  elements.pageStatus = document.querySelector("#page-status");
  elements.candidateList = document.querySelector("#candidate-list");
  elements.emptyState = document.querySelector("#empty-state");
  elements.pagination = document.querySelector("#pagination");
  elements.exportButton = document.querySelector("#export-button");
  elements.importInput = document.querySelector("#import-input");
}

async function init() {
  cacheElements();
  bindEvents();
  try {
    await loadData();
  } catch (error) {
    setSaveStatus(error.message, "error");
    elements.candidateList.innerHTML = `<div class="empty-state"><h2>无法加载候选关联</h2><p>${escapeHtml(error.message)}</p></div>`;
  }
}

init();
