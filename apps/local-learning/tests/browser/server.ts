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
  const packet = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  modelRequests.push(packet);
  if (packet.messages?.at(-1)?.content.includes("HTML验收")) {
    s.setHeader("content-type", "text/html"); s.end("<html>provider error</html>"); return;
  }
  if (packet.stream) {
    s.setHeader("content-type", "text/event-stream; charset=utf-8");
    s.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "你能指出" } }] })}\n\n`);
    if (packet.messages?.at(-1)?.content.includes("断流验收")) { s.end(); return; }
    await new Promise(resolve => setTimeout(resolve, packet.messages?.at(-1)?.content.includes("验收") ? 1500 : 500));
    if (s.destroyed) return;
    s.end(`data: ${JSON.stringify({ choices: [{ delta: { content: "本课哪个证据支持你的判断吗？" }, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`);
    return;
  }
  s.end(JSON.stringify({ choices: [{ message: { content: "你能指出本课哪个证据支持你的判断吗？" } }] }));
});
modelServer.listen(4176, "127.0.0.1");
const server = createServer((q, s) => void app.handler(q, s));
server.listen(4175, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => server.close(() => {
  modelServer.close(); app.close(); rmSync(directory, { recursive: true, force: true }); process.exit();
}));
