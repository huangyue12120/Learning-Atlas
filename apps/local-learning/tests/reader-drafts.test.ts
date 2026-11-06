import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../src/server.ts";
import { emptyDraft, saveReaderDraft, readerDraft } from "../src/reader-drafts.ts";

test("drafts survive database restart and invalidate only choices on changed questions", () => {
  const directory = mkdtempSync(join(tmpdir(), "atlas-drafts-"));
  try {
    const app = createApp(directory); app.close();
    let database = new DatabaseSync(join(directory, "learning-atlas.sqlite"));
    const value = { ...emptyDraft(), noteText: "草稿", tutorText: "问题", reviewText: "回顾", answers: { q: 1 }, openCards: ["concept"], fingerprint: "v1", apiKey: "never-save" };
    saveReaderDraft(database, "lesson", value, "v1", [{ id: "q", options: ["a", "b"] }]); database.close();
    database = new DatabaseSync(join(directory, "learning-atlas.sqlite"));
    const restored = readerDraft(database, "lesson", "v1");
    assert.equal(restored.noteText, "草稿"); assert.deepEqual(restored.answers, { q: 1 });
    assert.equal(JSON.stringify(restored).includes("never-save"), false);
    assert.deepEqual(readerDraft(database, "lesson", "v2").answers, {});
    assert.equal(readerDraft(database, "lesson", "v2").noteText, "草稿");
    assert.throws(() => saveReaderDraft(database, "lesson", { ...value, answers: { q: 2 } }, "v1", [{ id: "q", options: ["a", "b"] }]), /不一致/);
    assert.throws(() => saveReaderDraft(database, "lesson", { ...value, noteText: "x".repeat(2001) }, "v1", []), /长度/);
    database.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
