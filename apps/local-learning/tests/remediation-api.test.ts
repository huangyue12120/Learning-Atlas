import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createApp, selectedQuizAnswers } from "../src/server.ts";
import { createUndoStore } from "../src/undo.ts";

async function fixture(t: any) {
  const directory = mkdtempSync(join(tmpdir(), "atlas-remediation-"));
  const app = createApp(directory), server = createServer((q, s) => void app.handler(q, s));
  await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
  t.after(() => { server.close(); app.close(); rmSync(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const api = async (path: string, method = "GET", body?: unknown) => {
    const response = await fetch(base + path, { method, ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json() };
  };
  return { api, directory };
}
const emptyV3 = () => ({ schemaVersion: 3, learningStates: [], notes: [], tutorMessages: [], reviewItems: [], quizAttempts: [] });
const dataOnly = ({ exportedAt, ...data }: any) => data;

test("v3/v4 backup retains unknown lessons and drafts; invalid and failed imports roll back", async t => {
  const { api } = await fixture(t);
  await api("/api/notes", "POST", { text: "原笔记" });
  const original = dataOnly((await api("/api/export?format=json")).data);
  const backup: any = emptyV3();
  backup.notes.push({ lessonId: "practice/removed-phase/01-removed-lesson", text: "旧课笔记", createdAt: new Date().toISOString() });
  const imported = await api("/api/import", "POST", backup);
  assert.equal(imported.status, 200); assert.equal(imported.data.restored.unknownLessonRecords, 1);
  assert.equal((await api("/api/export?format=json")).data.notes[0].text, "旧课笔记");
  assert.equal((await api("/api/undo", "POST", imported.data.undo)).status, 200);
  assert.deepEqual(dataOnly((await api("/api/export?format=json")).data), original);
  const invalid = { ...backup, notes: [{ text: 4 }] };
  assert.equal((await api("/api/import", "POST", invalid)).status, 400);
  const duplicate = { lessonId: "practice/missing/01-lesson", completed: false, review: false, readingPosition: 0 };
  assert.equal((await api("/api/import", "POST", { ...emptyV3(), learningStates: [duplicate, duplicate] })).status, 400);
  assert.deepEqual(dataOnly((await api("/api/export?format=json")).data), original);
  const draft = (await api("/api/reader-draft")).data;
  assert.equal((await api("/api/reader-draft", "PUT", { ...draft, noteText: "v4 草稿" })).status, 200);
  const v4 = (await api("/api/export?format=json")).data;
  assert.equal(v4.schemaVersion, 4); assert.equal(v4.readerDrafts[0].data.noteText, "v4 草稿");
  await api("/api/import", "POST", v4);
  assert.equal((await api("/api/reader-draft")).data.noteText, "v4 草稿");
  const op = await api("/api/import", "POST", emptyV3());
  await api("/api/notes", "POST", { text: "导入后的新记录" });
  assert.equal((await api("/api/undo", "POST", op.data.undo)).status, 409);
  assert.equal((await api("/api/notes")).data[0].text, "导入后的新记录");
});

test("delete undo is scoped, single use, expires server-side, and never overwrites reused ids", async t => {
  const { api, directory } = await fixture(t);
  const note = (await api("/api/notes", "POST", { text: "可撤销笔记" })).data;
  const wrongLesson = "practice/01-math-foundations/01-linear-algebra-intuition";
  assert.equal((await api(`/api/notes/${note.id}?lessonId=${wrongLesson}`, "DELETE")).status, 404);
  const deleted = (await api(`/api/notes/${note.id}`, "DELETE")).data;
  assert.equal((await api("/api/undo", "POST", { ...deleted.undo, scope: "import" })).status, 404);
  assert.equal((await api("/api/undo", "POST", deleted.undo)).status, 200);
  assert.equal((await api("/api/undo", "POST", deleted.undo)).status, 404);
  const again = (await api(`/api/notes/${note.id}`, "DELETE")).data;
  await api("/api/notes", "POST", { text: "新笔记" });
  assert.equal((await api("/api/undo", "POST", again.undo)).status, 409);
  const database = new DatabaseSync(join(directory, "learning-atlas.sqlite"));
  let time = 1000;
  const undo = createUndoStore(database, () => time);
  const operation = undo.perform("notes:test", [{ table: "notes", lessonId: "test" }], () => {});
  time += 60_001;
  assert.throws(() => undo.restore(operation.undo.token, "notes:test"), /超过 60 秒/);
  database.close();
});

test("prediction drafts neither score nor change mastery; review insertion requires explicit request and is idempotent", async t => {
  const { api } = await fixture(t);
  const quiz = (await api("/api/quiz")).data;
  assert.ok(quiz.questions.every((q: any) => ["pre", "check", "post"].includes(q.stage) && q.correct === undefined));
  const draft = (await api("/api/reader-draft")).data;
  const pre = quiz.questions.find((q: any) => q.stage === "pre");
  await api("/api/reader-draft", "PUT", { ...draft, predictions: { [pre.id]: 0 } });
  assert.deepEqual((await api("/api/learning-state")).data, { completed: false, review: false });
  assert.equal((await api("/api/quiz/attempts")).data, null);
  assert.deepEqual((await api("/api/review-items")).data, []);
  const answers = Object.fromEntries(quiz.questions.map((q: any) => [q.id, 0]));
  const result = (await api("/api/quiz/attempts", "POST", { answers })).data;
  assert.ok(result.results.every((r: any) => Number.isInteger(r.correctOption)));
  const text = "确认复习本题";
  const first = (await api("/api/review-items", "POST", { text })).data;
  const second = (await api("/api/review-items", "POST", { text })).data;
  assert.equal(first.id, second.id); assert.equal((await api("/api/review-items")).data.length, 1);
});

test("quiz answer validation follows each question's actual option count", () => {
  const quiz: any = { status: "reviewed", questions: [{ id: "two", options: ["a", "b"] }, { id: "five", options: ["a", "b", "c", "d", "e"] }] };
  assert.deepEqual(selectedQuizAnswers(quiz, { two: 1, five: 4 }), [1, 4]);
  assert.throws(() => selectedQuizAnswers(quiz, { two: 2, five: 3 }), /完成每一道/);
});
