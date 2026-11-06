import type { DatabaseSync } from "node:sqlite";
import { RequestError } from "./security.ts";

export function emptyDraft() {
  return { noteText: "", tutorText: "", reviewText: "", answers: {} as Record<string, number>, predictions: {} as Record<string, number>, openCards: [] as string[] };
}
export function validatedDraft(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RequestError(400, "阅读草稿必须是对象。");
  const data = value as Record<string, unknown>;
  const draft = emptyDraft();
  for (const [key, limit] of [["noteText", 2000], ["tutorText", 4000], ["reviewText", 1000]] as const) {
    if (typeof data[key] !== "string" || data[key].length > limit) throw new RequestError(400, "阅读草稿文本长度无效。");
    draft[key] = data[key];
  }
  for (const key of ["answers", "predictions"] as const) {
    const choices = data[key];
    if (!choices || typeof choices !== "object" || Array.isArray(choices) || Object.keys(choices).length > 100) throw new RequestError(400, "测验草稿无效。");
    for (const [id, choice] of Object.entries(choices)) {
      if (!/^[a-zA-Z0-9_-]{1,150}$/.test(id) || !Number.isInteger(choice) || choice < 0 || choice > 99) throw new RequestError(400, "测验草稿选项无效。");
      draft[key][id] = choice;
    }
  }
  if (!Array.isArray(data.openCards) || data.openCards.length > 200 || !data.openCards.every(slug => typeof slug === "string" && /^[a-z0-9-]{1,150}$/.test(slug))) throw new RequestError(400, "理论卡草稿无效。");
  draft.openCards = data.openCards;
  return draft;
}
export function readerDraft(database: DatabaseSync, lessonId: string, fingerprint: string) {
  const row = database.prepare("SELECT data, quiz_fingerprint AS fingerprint FROM reader_drafts WHERE lesson_id = ?").get(lessonId) as { data: string; fingerprint: string } | undefined;
  const draft = row ? validatedDraft(JSON.parse(row.data)) : emptyDraft();
  if (row?.fingerprint !== fingerprint) { draft.answers = {}; draft.predictions = {}; }
  return { ...draft, fingerprint };
}
export function saveReaderDraft(database: DatabaseSync, lessonId: string, value: unknown, fingerprint: string, questions: Array<{ id: string; options: string[] }>) {
  const draft = validatedDraft(value);
  if ((value as Record<string, unknown>).fingerprint !== fingerprint) { draft.answers = {}; draft.predictions = {}; }
  for (const key of ["answers", "predictions"] as const) for (const [id, choice] of Object.entries(draft[key])) {
    const question = questions.find(question => question.id === id);
    if (!question || choice >= question.options.length) throw new RequestError(400, "测验草稿与当前题目不一致。");
  }
  database.prepare(`INSERT INTO reader_drafts (lesson_id, data, quiz_fingerprint, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(lesson_id) DO UPDATE SET data = excluded.data, quiz_fingerprint = excluded.quiz_fingerprint, updated_at = excluded.updated_at`)
    .run(lessonId, JSON.stringify(draft), fingerprint, new Date().toISOString());
  return { ...draft, fingerprint };
}
