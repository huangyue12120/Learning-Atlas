import { createApp } from "../src/server.ts";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = mkdtempSync(join(tmpdir(), "atlas-benchmark-"));
const app = createApp(directory);
const server = createServer((request, response) => void app.handler(request, response));
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
try {
  const port = (server.address() as { port: number }).port;
  const times: number[] = [];
  for (let index = 0; index < 21; index += 1) {
    const start = performance.now();
    await (await fetch(`http://127.0.0.1:${port}/api/course`)).json();
    if (index) times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  console.log(JSON.stringify({ node: process.version, samples: 20, medianMs: (times[9] + times[10]) / 2, minMs: times[0], maxMs: times[19] }, null, 2));
} finally {
  server.close(); app.close(); rmSync(directory, { recursive: true, force: true });
}
