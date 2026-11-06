import assert from "node:assert/strict";
import { test } from "node:test";
import { eventStream } from "../public/event-stream.js";
import { boundedHistory, sectionEvidence } from "../src/tutor-context.ts";

test("SSE parser handles split UTF-8, CRLF, comments, event types and multi-line data", async () => {
  const bytes = new TextEncoder().encode(': ping\r\nevent: delta\r\ndata: 中文\r\ndata: 第二行\r\n\r\nevent: done\ndata: {}\n\n');
  const response = new Response(new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); } }));
  const events = [];
  for await (const event of eventStream(response)) events.push(event);
  assert.deepEqual(events, [{ event: "delta", data: "中文\n第二行" }, { event: "done", data: "{}" }]);
});

test("evidence prioritizes the active section and bounds source and history without orphan replies", () => {
  const markdown = '# 课程\n导语\n## 第一节\n旧内容\n## 当前节\n当前证据\n```python\n## 不是标题\n```\n## 后一节\n相邻证据\n## 远处\n' + '不应发送'.repeat(10000);
  const result = sectionEvidence(markdown, "当前节", 200);
  assert.match(result, /当前证据/); assert.match(result, /相邻证据/); assert.doesNotMatch(result, /不应发送/);
  assert.ok(sectionEvidence(markdown, "远处", 100).length < 220);
  const history: any = [{ role: "user", text: "old" }, { role: "assistant", text: "long".repeat(100) }, { role: "user", text: "最近问题" }, { role: "assistant", text: "最近回复" }];
  assert.deepEqual(boundedHistory([...history, { role: "user", text: "孤立消息" }], 20).map(item => item.content), ["最近问题", "最近回复"]);
  assert.deepEqual(boundedHistory(history, 20).map(item => item.content), ["最近问题", "最近回复"]);
});
