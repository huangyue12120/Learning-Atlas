// Compare a temporary local copy of the same catalog inputs; no learner data.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(app, "../..");
const temporary = mkdtempSync(join(tmpdir(), "atlas-storage-benchmark-"));
const targetApp = join(temporary, "apps/local-learning");
try {
  for (const relative of ["src", "package.json", "runtime.env", "public/event-stream.js", "scripts/benchmark-course.ts"]) {
    const target = join(targetApp, relative); mkdirSync(dirname(target), { recursive: true });
    cpSync(join(app, relative), target, { recursive: true });
  }
  cpSync(join(root, "content/translations/practice"), join(temporary, "content/translations/practice"), { recursive: true });
  const phases = join(root, "ai-engineering-from-scratch/phases");
  let sourceFiles = 0;
  for (const phase of readdirSync(phases, { withFileTypes: true }).filter(entry => entry.isDirectory() && /^\d{2}-/.test(entry.name))) {
    for (const lesson of readdirSync(join(phases, phase.name), { withFileTypes: true }).filter(entry => entry.isDirectory() && /^\d{2}-/.test(entry.name))) {
      const relative = join(phase.name, lesson.name, "docs/en.md");
      if (!existsSync(join(phases, relative))) continue;
      const target = join(temporary, "ai-engineering-from-scratch/phases", relative);
      mkdirSync(dirname(target), { recursive: true }); cpSync(join(phases, relative), target); sourceFiles += 1;
    }
  }
  const result = spawnSync(process.execPath, ["--env-file=runtime.env", "--experimental-strip-types", "scripts/benchmark-course.ts"], { cwd: targetApp, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || "Local storage benchmark failed");
  console.log(JSON.stringify({ storage: "temporary local copy; diagnostic only", sourceFiles, benchmark: JSON.parse(result.stdout) }, null, 2));
} finally { rmSync(temporary, { recursive: true, force: true }); }
