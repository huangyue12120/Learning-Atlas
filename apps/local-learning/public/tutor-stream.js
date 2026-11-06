import { eventStream } from "./event-stream.js";

export async function streamTutor(path, body, signal, onDelta) {
  const response = await fetch(path, { method: "POST", signal, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok || !response.headers.get("content-type")?.includes("text/event-stream")) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? "无法读取学习助理的流式响应。");
  }
  for await (const event of eventStream(response)) {
    const data = JSON.parse(event.data);
    if (event.event === "error") throw new Error(data.error);
    if (event.event === "delta") onDelta(data.text);
    if (event.event === "done") return data;
  }
  throw new Error("学习助理连接中断，回复未保存，草稿已保留。");
}
