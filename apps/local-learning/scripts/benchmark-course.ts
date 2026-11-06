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
  const url = `http://127.0.0.1:${port}/api/course`;
  await (await fetch(url)).json();
  const rounds: Array<{ samples: number; medianMs: number; minMs: number; maxMs: number }> = [];
  for (let round = 0; round < 3; round += 1) {
    const times: number[] = [];
    for (let index = 0; index < 20; index += 1) {
      const start = performance.now();
      await (await fetch(url)).json();
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    rounds.push({ samples: 20, medianMs: (times[9] + times[10]) / 2, minMs: times[0], maxMs: times[19] });
  }
  console.log(JSON.stringify({ node: process.version, ioThreads: process.env.UV_THREADPOOL_SIZE ?? "4", targetMs: 100,
    targetMet: rounds.every(round => round.medianMs < 100), rounds }, null, 2));
} finally {
  server.close(); app.close(); rmSync(directory, { recursive: true, force: true });
}
