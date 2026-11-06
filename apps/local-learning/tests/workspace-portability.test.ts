import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { prepareWorkspace } from "../src/server.ts";

test("reverse-engineering workspace runs its upstream suite and preserves learner edits", () => {
  const directory = mkdtempSync(join(tmpdir(), "atlas-portable-workspace-"));
  const lesson = "practice/13-tools-and-protocols/45-ai-assisted-reverse-engineering";
  const upstream = resolve("../../ai-engineering-from-scratch/phases/13-tools-and-protocols/45-ai-assisted-reverse-engineering/code/tests/test_main.py");
  const original = readFileSync(upstream, "utf8");
  try {
    const workspace = prepareWorkspace(directory, lesson);
    const file = join(workspace.directory, "tests/test_main.py");
    const adapted = readFileSync(file, "utf8");
    assert.equal(adapted.replace(/^SITE_MODULE = .+$/m, original.match(/^SITE_MODULE = .+$/m)![0])
      .replace(/^LESSON_36_OBJECT = .+$/m, original.match(/^LESSON_36_OBJECT = .+$/m)![0]), original);
    const result = spawnSync("python3", ["-m", "unittest", "discover", "-s", "tests"], {
      cwd: workspace.directory, encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /Ran 39 tests/);
    writeFileSync(file, adapted + "\n# learner edit\n");
    prepareWorkspace(directory, lesson);
    assert.equal(readFileSync(file, "utf8"), adapted + "\n# learner edit\n");
    assert.equal(readFileSync(upstream, "utf8"), original);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
