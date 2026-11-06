import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cachedFiles, existsSync, readFileSync, readdirSync } from "../src/content-cache.ts";

test("file cache invalidates translations, source fingerprints, associations and directory membership immediately", () => {
  const root = mkdtempSync(join(tmpdir(), "atlas-content-"));
  try {
    const source = join(root, "source.md"), translation = join(root, "zh.md"), links = join(root, "links");
    mkdirSync(links);
    writeFileSync(source, "source"); writeFileSync(translation, "reviewed");
    let runs = 0;
    const read = () => cachedFiles(root, () => {
      runs += 1;
      return [readFileSync(source, "utf8"), readFileSync(translation, "utf8"), readdirSync(links).map((file: string) => readFileSync(join(links, file), "utf8")), existsSync(join(root, "new.md"))];
    });
    assert.deepEqual(read(), read()); assert.equal(runs, 1);
    for (const path of [source, translation]) { writeFileSync(path, "changed"); read(); }
    writeFileSync(join(links, "card.yaml"), "approved"); read();
    writeFileSync(join(links, "card.yaml"), "unapproved"); read();
    rmSync(join(links, "card.yaml")); read();
    writeFileSync(join(root, "new.md"), "lesson"); read();
    assert.equal(runs, 7);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
