// SSE is UTF-8 and a blank line commits an event. Keep partial lines across
// network chunks, including a CR split from the following LF.
export async function* eventStream(response) {
  if (!response.body) throw new Error("接口没有返回可读取的内容。");
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = "", data = [], event = "message", ended = false, dataSize = 0;
  try {
    while (!ended) {
      const chunk = await reader.read(); ended = chunk.done;
      buffer += decoder.decode(chunk.value, { stream: !ended });
      if (buffer.length > 1_000_000) throw new Error("模型返回的单条事件过大。");
      let match;
      while ((match = /\r\n|\r|\n/.exec(buffer))) {
        if (!ended && match[0] === "\r" && match.index === buffer.length - 1) break;
        const line = buffer.slice(0, match.index); buffer = buffer.slice(match.index + match[0].length);
        if (line === "") {
          if (data.length) yield { event, data: data.join("\n") };
          data = []; event = "message"; dataSize = 0;
        } else if (!line.startsWith(":")) {
          const colon = line.indexOf(":"), field = colon < 0 ? line : line.slice(0, colon);
          const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
          if (field === "data") {
            dataSize += value.length;
            if (dataSize > 1_000_000) throw new Error("模型返回的单条事件过大。");
            data.push(value);
          }
          if (field === "event") event = value;
        }
      }
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
