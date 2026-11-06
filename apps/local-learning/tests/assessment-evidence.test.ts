import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { assessmentEvidence } from "../src/assessment-evidence.ts";

test("only reviewed evidence with matching lesson and assessment fingerprints can be published", () => {
  const root = mkdtempSync(join(tmpdir(), "atlas-evidence-"));
  try {
    const id = "practice/fixture/01-lesson", relative = "fixture/01-lesson";
    const source = join(root, "content/translations/practice", relative, "zh.md");
    const quiz = join(root, "content/assessments/practice", relative, "zh.json");
    const mapping = join(root, "content/assessment-links/practice", relative, "links.json");
    for (const path of [source, quiz, mapping]) mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(source, "## 概念\n\n这是逐题核对过的证据段落。\n"); writeFileSync(quiz, "{}");
    const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex");
    const data = { lessonId: id, translationSha256: hash(source), assessmentSha256: hash(quiz), links: [{ id: "q", status: "draft", headingId: "概念", quote: "这是逐题核对过的证据段落。" }] };
    const save = () => writeFileSync(mapping, JSON.stringify(data));
    save(); assert.equal(assessmentEvidence(root, id).size, 0);
    data.links[0].status = "reviewed"; save(); assert.equal(assessmentEvidence(root, id).size, 1);
    writeFileSync(source, "## 概念\n新来源\n"); assert.equal(assessmentEvidence(root, id).size, 0);
    data.translationSha256 = hash(source); save(); assert.equal(assessmentEvidence(root, id).size, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
