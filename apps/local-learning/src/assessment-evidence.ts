import { createHash } from "node:crypto";
import { join } from "node:path";
import { cachedFiles, existsSync, readFileSync } from "./content-cache.ts";

export function normalizeEvidence(text: string) { return text.replace(/[`*_\s]/g, ""); }

export function assessmentEvidence(root: string, lessonId: string): Map<string, { headingId: string; quote: string }> {
  return cachedFiles(`assessment-evidence:${root}:${lessonId}`, () => {
    const relative = lessonId.replace(/^practice\//, "");
    const mappingPath = join(root, "content/assessment-links/practice", relative, "links.json");
    if (!existsSync(mappingPath)) return new Map();
    const lessonPath = join(root, "content/translations/practice", relative, "zh.md");
    const assessmentPath = join(root, "content/assessments/practice", relative, "zh.json");
    try {
      const metadata = JSON.parse(readFileSync(mappingPath, "utf8"));
      const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
      if (metadata.lessonId !== lessonId || metadata.translationSha256 !== hash(lessonPath) || metadata.assessmentSha256 !== hash(assessmentPath)) return new Map();
      const body = normalizeEvidence(readFileSync(lessonPath, "utf8"));
      return new Map(metadata.links.filter((link: any) => link.status === "reviewed" && typeof link.id === "string" &&
        /^[\p{Letter}\p{Number}-]+$/u.test(link.headingId) && typeof link.quote === "string" && link.quote.length >= 8 && body.includes(normalizeEvidence(link.quote)))
        .map((link: any) => [link.id, { headingId: link.headingId, quote: link.quote }]));
    } catch { return new Map(); }
  });
}
