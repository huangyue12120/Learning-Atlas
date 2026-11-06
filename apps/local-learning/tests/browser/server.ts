import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../../src/server.ts";
const directory = mkdtempSync(join(tmpdir(), "atlas-browser-"));
const app = createApp(directory);
const server = createServer((q, s) => void app.handler(q, s));
server.listen(4175, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => server.close(() => {
  app.close(); rmSync(directory, { recursive: true, force: true }); process.exit();
}));
