import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer, request as httpRequest } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/server.ts";

async function fixture(t: any) {
  const directory = mkdtempSync(join(tmpdir(), "atlas-security-"));
  const app = createApp(directory);
  const server = createServer((q, s) => void app.handler(q, s));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => { server.close(); app.close(); rmSync(directory, { recursive: true, force: true }); });
  return `http://127.0.0.1:${(server.address() as any).port}`;
}
const json = (method: string, data: unknown) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(data) });

test("local boundary checks all API reads and writes against actual listening port", async (t) => {
  const base = await fixture(t);
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  assert.equal(await new Promise((resolve, reject) => {
    httpRequest(`${base}/api/export?format=json`, { headers: { host: "evil.example" } }, r => { r.resume(); resolve(r.statusCode); }).on("error", reject).end();
  }), 421);
  assert.equal((await fetch(`${base}/api/export?format=json`, { headers: { origin: "https://evil.example" } })).status, 403);
  for (const path of ["/api/import", "/api/workspace/open", "/api/model-config/models"]) {
    assert.equal((await fetch(base + path, { ...json("POST", {}), headers: { "content-type": "application/json", origin: "https://evil.example" } })).status, 403);
  }
  assert.equal((await fetch(`${base}/api/import`, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" })).status, 415);
  assert.equal((await fetch(`${base}/api/notes`, { method: "POST", headers: { "content-type": "application/json" }, body: "{" })).status, 400);
  assert.equal((await fetch(`${base}/api/notes`, json("POST", { text: "x".repeat(40_000) }))).status, 413);
  assert.equal((await fetch(`${base}/api/import`, json("POST", { text: "x".repeat(5_000_001) }))).status, 413);
  assert.equal((await fetch(`${base}/api/tutor/messages`, { method: "DELETE" })).status, 200);
  const health = await fetch(`${base}/api/health`, { headers: { origin: base } });
  assert.match(health.headers.get("content-security-policy")!, /frame-ancestors 'none'/);
  assert.equal(health.headers.get("x-content-type-options"), "nosniff");
});

test("model discovery and saving only reuse keys for the normalized same endpoint", async (t) => {
  const base = await fixture(t);
  const received: string[] = [];
  const modelServer = createServer((q, s) => { received.push(q.headers.authorization ?? ""); s.setHeader("content-type", "application/json"); s.end('{"data":[{"id":"local"}]}'); });
  await new Promise<void>((r) => modelServer.listen(0, "127.0.0.1", r));
  t.after(() => modelServer.close());
  const endpoint = `http://127.0.0.1:${(modelServer.address() as any).port}/v1`;
  assert.equal((await fetch(`${base}/api/model-config`, json("PUT", { baseUrl: endpoint, model: "m", apiKey: "secret" }))).status, 200);
  await fetch(`${base}/api/model-config/models`, json("POST", { baseUrl: endpoint + "/" }));
  await fetch(`${base}/api/model-config/models`, json("POST", { baseUrl: endpoint + "/different" }));
  assert.deepEqual(received, ["Bearer secret", ""]);
  const changed = await fetch(`${base}/api/model-config`, json("PUT", { baseUrl: endpoint + "/different", model: "m" })).then(r => r.json());
  assert.equal(changed.apiKeyConfigured, false);
});

test("default lesson starts at Phase 0 and staged lessons stay blocked", async (t) => {
  const base = await fixture(t);
  const lesson = await fetch(base + "/api/lesson").then(r => r.json());
  assert.equal(lesson.id, "practice/00-setup-and-tooling/01-dev-environment");
  assert.match(lesson.sourceUrl, /^https:\/\/github.com\/rohitg00\//);
  const course = await fetch(base + "/api/course").then(r => r.json());
  const staged = course.at(-1).lessons[0];
  assert.equal(staged.publicationStatus, "staged");
  assert.match(staged.title, /[\u4e00-\u9fff]/);
  assert.equal(staged.available, false);
  assert.equal((await fetch(base + "/api/lesson?lessonId=" + encodeURIComponent(staged.id))).status, 404);
});


test("practice images are served locally while text and staged phase assets remain blocked", async t => {
  const base = await fixture(t);
  const image = await fetch(base + "/api/practice/assets/11-llm-engineering/17-agent-framework-tradeoffs/assets/framework-matrix.svg");
  assert.equal(image.status, 200); assert.match(image.headers.get("content-type")!, /image\/svg/);
  assert.equal((await fetch(base + "/api/practice/assets/11-llm-engineering/17-agent-framework-tradeoffs/docs/en.md")).status, 403);
  assert.equal((await fetch(base + "/api/practice/assets/19-capstone-projects/01-terminal-native-coding-agent/assets/image.svg")).status, 403);
});
