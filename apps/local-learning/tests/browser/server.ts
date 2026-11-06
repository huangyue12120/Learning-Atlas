import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../../src/server.ts";
const directory = mkdtempSync(join(tmpdir(), "atlas-browser-"));
const app = createApp(directory);
const modelRequests: any[] = [];
const modelServer = createServer(async (q, s) => {
  s.setHeader("content-type", "application/json");
  if (q.url === "/requests") return s.end(JSON.stringify(modelRequests));
  if (q.url === "/v1/models") return s.end(JSON.stringify({ data: [{ id: "atlas-fixture" }] }));
  const chunks: Buffer[] = [];
  for await (const chunk of q) chunks.push(Buffer.from(chunk));
  modelRequests.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  s.end(JSON.stringify({ choices: [{ message: { content: "你能指出本课哪个证据支持你的判断吗？" } }] }));
});
modelServer.listen(4176, "127.0.0.1");
const server = createServer((q, s) => void app.handler(q, s));
server.listen(4175, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => server.close(() => {
  modelServer.close(); app.close(); rmSync(directory, { recursive: true, force: true }); process.exit();
}));
