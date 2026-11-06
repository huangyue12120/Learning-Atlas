import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

test("capstone workspaces preserve code layout, root tests, fixtures and learner edits in dependencies", () => {
  const directory = mkdtempSync(join(tmpdir(), "atlas-capstone-workspace-"));
  const phase = "19-capstone-projects";
  const upstream = resolve("../../ai-engineering-from-scratch/phases", phase);
  const lessons = readdirSync(upstream).filter(name => /^\d{2}-/.test(name));
  try {
    assert.equal(lessons.length, 85);
    for (const slug of lessons) {
      const workspace = prepareWorkspace(directory, `practice/${phase}/${slug}`);
      assert.equal(workspace.sourceFile, join(workspace.directory, "code/main.py"));
      if (["76-collective-ops-from-scratch", "81-end-to-end-distributed-train"].includes(slug)) {
        const code = readFileSync(workspace.sourceFile, "utf8");
        assert.notEqual(code, readFileSync(join(upstream, slug, "code/main.py"), "utf8"));
        writeFileSync(workspace.sourceFile, "# learner distributed implementation\n");
        prepareWorkspace(directory, `practice/${phase}/${slug}`);
        assert.equal(readFileSync(workspace.sourceFile, "utf8"), "# learner distributed implementation\n");
      } else {
        assert.equal(readFileSync(workspace.sourceFile, "utf8"), readFileSync(join(upstream, slug, "code/main.py"), "utf8"));
      }
      assert.ok(existsSync(workspace.exercisesGuide!));
      assert.equal(existsSync(join(workspace.directory, "code/ts")), false);
      if (existsSync(join(upstream, slug, "tests"))) {
        for (const name of readdirSync(join(upstream, slug, "tests"))) {
          assert.equal(readFileSync(join(workspace.directory, "tests", name), "utf8"), readFileSync(join(upstream, slug, "tests", name), "utf8"));
        }
      }
    }
    const phaseDirectory = join(directory, "workspaces", phase);
    assert.ok(existsSync(join(phaseDirectory, "27-eval-harness-fixture-tasks/code/tasks/task_005_linked_list_traversal/buggy/linked_list.py")));
    assert.ok(existsSync(join(phaseDirectory, "29-end-to-end-coding-task-demo/code/fixture_repo")));
    assert.ok(existsSync(join(phaseDirectory, "52-experiment-runner/code/experiments")));
    const run = spawnSync("python3", ["code/main.py"], {
      cwd: join(phaseDirectory, "29-end-to-end-coding-task-demo"), encoding: "utf8",
      timeout: 30000, env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }
    });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /solved=True/);
  } finally { rmSync(directory, { recursive: true, force: true }); }

  // Start from an empty phase directory so sibling copies cannot be masked by the all-lesson loop.
  const fresh = mkdtempSync(join(tmpdir(), "atlas-capstone-dependencies-"));
  try {
    for (const [slug, dependencies] of [
      ["57-end-to-end-research-demo", ["54-paper-writer", "55-critic-loop", "56-iteration-scheduler"]],
      ["63-multimodal-eval", ["58-vision-encoder-patches", "59-vit-transformer", "60-projection-layer-modality-align", "61-cross-attention-fusion", "62-vision-language-pretraining"]],
      ["75-end-to-end-eval-runner", ["70-task-spec-format", "71-classical-metrics", "72-code-exec-metric", "73-perplexity-calibration", "74-leaderboard-aggregation"]],
      ["87-end-to-end-safety-gate", ["82-jailbreak-taxonomy", "83-prompt-injection-detector", "85-content-classifier-integration", "86-constitutional-rules-engine"]]
    ] as const) {
      const workspace = prepareWorkspace(fresh, `practice/${phase}/${slug}`);
      for (const dependency of dependencies) {
        const source = join(workspace.directory, "..", dependency, "code/main.py");
        assert.equal(readFileSync(source, "utf8"), readFileSync(join(upstream, dependency, "code/main.py"), "utf8"));
      }
      writeFileSync(workspace.sourceFile, "# learner implementation\n");
      writeFileSync(workspace.exercisesGuide!, "# learner guide\n");
      const dependencyFile = join(workspace.directory, "..", dependencies[0], "code/main.py");
      writeFileSync(dependencyFile, "# learner dependency\n");
      prepareWorkspace(fresh, `practice/${phase}/${slug}`);
      assert.equal(readFileSync(workspace.sourceFile, "utf8"), "# learner implementation\n");
      assert.equal(readFileSync(workspace.exercisesGuide!, "utf8"), "# learner guide\n");
      assert.equal(readFileSync(dependencyFile, "utf8"), "# learner dependency\n");
    }
    const taxonomy = join(fresh, "workspaces", phase, "82-jailbreak-taxonomy/outputs/taxonomy.json");
    assert.equal(readFileSync(taxonomy, "utf8"), readFileSync(join(upstream, "82-jailbreak-taxonomy/outputs/taxonomy.json"), "utf8"));
    writeFileSync(taxonomy, "learner taxonomy\n");
    prepareWorkspace(fresh, `practice/${phase}/83-prompt-injection-detector`);
    assert.equal(readFileSync(taxonomy, "utf8"), "learner taxonomy\n");
    rmSync(taxonomy);
    prepareWorkspace(fresh, `practice/${phase}/83-prompt-injection-detector`);
    assert.equal(readFileSync(taxonomy, "utf8"), readFileSync(join(upstream, "82-jailbreak-taxonomy/outputs/taxonomy.json"), "utf8"));
  } finally { rmSync(fresh, { recursive: true, force: true }); }
});
