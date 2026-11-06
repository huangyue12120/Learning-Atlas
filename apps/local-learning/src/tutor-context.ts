export type Message = { role: "user" | "assistant"; text: string };

export function boundedHistory(messages: Message[], maximumCharacters = 4000) {
  const selected: Array<{ role: string; content: string }> = [];
  let size = 0;
  // Pair adjacent messages first: deleting one message must not cause an
  // orphan at the end to hide all earlier complete turns.
  const turns: Message[][] = [];
  for (let index = 0; index < messages.length - 1; index += 1) {
    if (messages[index].role === "user" && messages[index + 1].role === "assistant") {
      turns.push(messages.slice(index, index + 2)); index += 1;
    }
  }
  for (const pair of turns.reverse()) {
    const length = pair.reduce((total, message) => total + message.text.length, 0);
    if (size + length > maximumCharacters || selected.length >= 10) break;
    selected.unshift(...pair.map(message => ({ role: message.role, content: message.text }))); size += length;
  }
  return selected;
}

export function sectionEvidence(markdown: string, sectionTitle: string, maximumCharacters = 6000) {
  const sections: Array<{ title: string; start: number }> = [];
  let offset = 0, fence = "";
  for (const line of markdown.split("\n")) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) fence = fence ? "" : marker[1][0];
    if (!fence) {
      const heading = line.match(/^#{1,6}\s+(.+?)(?:\s+<!--.*?-->)?$/);
      if (heading) sections.push({ title: heading[1].replace(/[`*]/g, "").trim(), start: offset });
    }
    offset += line.length + 1;
  }
  const index = Math.max(0, sections.findIndex(section => section.title === sectionTitle));
  const currentStart = sections[index]?.start ?? 0;
  const currentEnd = sections[index + 1]?.start ?? markdown.length;
  const current = markdown.slice(currentStart, currentEnd);
  const following = markdown.slice(currentEnd, sections[index + 2]?.start ?? currentEnd);
  const preceding = index ? markdown.slice(sections[index - 1].start, currentStart) : "";
  const excerpt = [current, following, preceding].filter(Boolean).join("\n").slice(0, maximumCharacters);
  return `节选顺序：当前小节、后一小节、前一小节；其余内容未发送，不能假设已阅读。\n${excerpt}${excerpt.length >= maximumCharacters ? "\n[节选到达字符预算，后续内容省略]" : ""}`;
}
