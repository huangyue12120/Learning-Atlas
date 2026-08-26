---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/03-parallel-and-streaming-tool-calls/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 6339e746eb414f03ab0421f9ed1d654809753f39bdac5283fe0f3a3712a1c5b2
status: reviewed
---

# 并行工具调用与工具流式传输

> 三个独立的天气查询如果串行执行，就要经历三次往返。并行运行它们，总时间会降到最慢的单次调用。如今每家前沿提供商都会在一个回合中输出多个工具调用。收益是真实的，但管线细节很微妙。本课覆盖两部分：并行扇出和流式参数重组，重点说明 ID 关联陷阱。

**类型：** 构建
**语言：** Python（标准库、线程池 + 流式测试工具）
**前置课程：** Phase 13 · 02（函数调用深潜）
**时间：** 约 75 分钟

## 学习目标

- 解释 `parallel_tool_calls: true` 存在的原因，以及何时应该禁用它。
- 在并行扇出期间，将流式参数块关联到正确的工具调用 ID。
- 在不提前解析的情况下，把部分 `arguments` 字符串重组为完整 JSON。
- 运行一个三城市天气基准，展示串行与并行的延迟差异。

## 问题

没有并行调用时，一个回答“班加罗尔、东京和苏黎世的天气怎么样”的智能体会这样做：

```
user -> LLM
LLM -> call get_weather(Bengaluru)
host -> run executor, reply with result
LLM -> call get_weather(Tokyo)
host -> run executor, reply with result
LLM -> call get_weather(Zurich)
host -> run executor, reply with result
LLM -> final text answer
```

三次 LLM 往返，每一次还要加上执行器延迟。总耗时大约是理想墙钟时间的 4 倍。

使用并行调用时：

```
user -> LLM
LLM -> call get_weather(Bengaluru); call get_weather(Tokyo); call get_weather(Zurich)
host -> run all three executors concurrently, reply with three results
LLM -> final text answer
```

只需一次 LLM 往返。执行器耗时取三次调用中的最大值，而不是总和。OpenAI、Anthropic 和 Gemini 的生产基准显示，在扇出型工作负载上墙钟时间可减少 60% 到 70%。

代价是关联复杂度。当三个调用乱序完成时，结果必须携带匹配的 `tool_call_id`，这样模型才能将它们对应起来。当结果以流式到达时，还必须先把部分参数片段组装成完整 JSON，才能执行。Gemini 3 加入唯一 ID，部分原因就是解决两个并行调用同一个工具时无法区分的真实问题。

## 概念

### 启用并行

- **OpenAI。** 默认开启 `parallel_tool_calls: true`。设置为 `false` 以强制串行。
- **Anthropic。** 通过 `disable_parallel_tool_use: false` 并行（Claude 3.5 及以上默认开启）。设置为 `true` 以串行。
- **Gemini。** 始终具备并行能力；`tool_config.function_calling_config.mode = "AUTO"` 让模型自行决定。

当工具存在顺序依赖（`create_file` 然后 `write_file`）、一个调用的输出会决定另一个调用的输入，或者速率限制器无法承受扇出时，应禁用并行。

### ID 关联

模型输出的每个调用都有一个 `id`。宿主返回的每个结果都必须包含相同的 id。没有它们，结果就是有歧义的。

- **OpenAI。** 每条 tool 角色消息上的 `tool_call_id`。
- **Anthropic。** 每个 `tool_result` 块上的 `tool_use_id`。
- **Gemini。** 每个 `functionResponse` 上的 `id`（Gemini 3 及以上）；Gemini 2 按名称匹配，而这在同名并行调用时会出问题。

### 并发运行调用

宿主让每个调用的执行器运行在自己的线程、协程或远程工作进程上。最简单的测试工具使用线程池；生产环境使用 `asyncio` 配合 `asyncio.gather` 或结构化并发。完成顺序不可预测——id 才是标识符。

一个常见错误是按照调用列表顺序而不是完成顺序回复结果。通常这仍然有效，因为模型只关心 `tool_call_id`；但如果某个结果丢失或重复，乱序提交会让调试更困难。最好按照完成顺序回复，并明确带上 id。

### 流式工具调用

模型进行流式输出时，`arguments` 会分片到达。三个并行调用的三条 chunk 流会在传输线上交错。你需要为每个 id 设置一个累加器。

各提供商的形状如下：

- **OpenAI。** 每个 chunk 是 `choices[0].delta.tool_calls[i].function.arguments`（部分字符串）。chunk 携带调用列表中的 `index`（位置）。按 index 累积，首次出现时读取 `id`，并在 `finish_reason = "tool_calls"` 时解析 JSON。
- **Anthropic。** 流事件依次是 `message_start`，然后每个块一个 `content_block_start` 事件，类型为 `tool_use`（包含 id、名称和空 input）。`content_block_delta` 事件携带 `input_json_delta` 块。`content_block_stop` 关闭每个块。
- **Gemini。** `streamFunctionCallArguments`（Gemini 3 及以上）会携带 `functionCallId` 输出块，让调用可以干净地交错。Gemini 3 之前，流式结果每次只返回一个完整调用。

### 部分 JSON 与提前解析陷阱

在 `arguments` 完整之前不能解析它。像 `{"city": "Beng` 这样的部分 JSON 无效，会抛出异常。正确的闸门是提供商的调用结束信号：OpenAI 的 `finish_reason = "tool_calls"`、Anthropic 的 `content_block_stop` 或 Gemini 的流结束事件。只有这时才尝试 `json.loads`。更稳健的做法是使用增量 JSON 解析器，在结构完成时产生事件；OpenAI 的流式指南建议这样做，以便实现实时显示“思考中”指示器的体验。用大括号计数判断是否完整并不可靠（字符串中的大括号或转义内容会造成误判），只能作为非正式调试启发式。

### 乱序完成

```
call_A: fast API, returns first
call_B: slow API, returns second
call_C: median API, returns third
```

宿主的回复仍然必须引用这些 id：

```
[{role: "tool", tool_call_id: "call_A", content: ...},
 {role: "tool", tool_call_id: "call_B", content: ...},
 {role: "tool", tool_call_id: "call_C", content: ...}]
```

在 OpenAI 或 Anthropic 上，回复中的顺序不影响正确性。Gemini 也接受任意顺序，只要 id 匹配即可。

### 基准：串行与并行

`code/main.py` 用 400、600 和 800 毫秒的延迟模拟三个执行器。串行运行总计 1800 毫秒；并行运行取 `max(400, 600, 800) = 800` 毫秒。差异是常数而不是比例，因此工具越多，节省越明显。

现实中的注意事项：并行调用会给下游 API 带来压力。向受速率限制的服务进行十路扇出会失败。Phase 13 · 17 会介绍网关层面的背压；重试语义计划放在未来的 Phase 中。

### 流式扇出的墙钟时间

如果模型本身在流式输出，可以在某个调用的参数完成后立即开始执行，而不必等待所有调用结束。这是 OpenAI 记录的一种优化，但并非所有 SDK 都暴露它。本课的测试工具实现了它：模拟流一产生完整的参数对象，宿主就启动该调用。

```figure
tp-parallel-fanout
```

## 动手使用

`code/main.py` 分为两半。第一半使用 `concurrent.futures.ThreadPoolExecutor`，分别串行和并行运行三个模拟天气调用，并打印墙钟时间。第二半重放一个假的流式响应——三个并行调用的 `arguments` 块交错出现在一条流上——并使用 `StreamAccumulator` 按 ID 重组它们。没有 LLM，没有网络，只有重组逻辑。

请重点观察：

- 串行计时达到 1.8 秒；在相同的假延迟下，并行计时达到 0.8 秒。
- 累加器通过按 ID 缓冲来处理乱序到达的块，并且只在每个调用的 JSON 完整时解析。
- 执行器在某个 ID 的参数完成时立即启动，而不是等到所有流结束。

## 交付物

本课会生成 `outputs/skill-parallel-call-safety-check.md`。给定一个工具注册表，这个 skill 会审查哪些工具可以安全并行化、哪些存在顺序依赖、哪些会压垮下游速率限制，并返回带有各工具 `parallel_safe` 标志的修订注册表。

## 练习

1. 运行 `code/main.py` 并改变模拟延迟。确认并行/串行比率大约为 `max/sum`（真实运行会因为线程调度、序列化和测试工具开销而略偏离理想值）。延迟分布在什么情况下会让并行失去意义？

2. 扩展累加器，处理“调用在流式传输中途被取消”的情况：丢弃其缓冲区并发出 `cancelled` 事件。哪家提供商明确记录了这个情况？检查 Anthropic 的 `content_block_stop` 语义和 OpenAI 的 `finish_reason: "length"` 行为。

3. 用 `asyncio.gather` 替换线程池。对两者做基准比较。如果执行器确实进行 I/O，你应该会看到 async 因上下文切换开销更低而略有收益。

4. 选出两个不应该并行的工具（例如先 `create_file` 再 `write_file`）。在注册表中添加一个 `ordering_dependency` 图，并让并行扇出受该图控制。这是依赖感知调度所需的最小机制，未来的智能体工程 Phase 会将其形式化。

5. 阅读 OpenAI 的并行函数调用章节和 Anthropic 的 `disable_parallel_tool_use` 文档。找出一种 Anthropic 建议禁用并行的真实工具类型。（提示：对同一资源进行后果性修改。）

## 术语

| 术语 | 人们常说 | 实际含义 |
|------|----------------|------------------------|
| 并行工具调用 | “一个回合内扇出” | 模型在一条 assistant 消息中输出多个工具调用 |
| `parallel_tool_calls` | “OpenAI 的标志” | 启用或禁用多调用输出 |
| `disable_parallel_tool_use` | “Anthropic 的反向标志” | 选择退出；默认启用并行 |
| 工具调用 ID | “关联句柄” | 结果消息必须回显的每调用标识符 |
| 累加器 | “流缓冲区” | 为部分 `arguments` 块按 ID 保存的字符串缓冲区 |
| 乱序完成 | “谁快谁先” | 并行调用以不可预测的顺序完成；id 是连接它们的胶水 |
| 依赖图 | “顺序约束” | 输出会作为其他工具输入的工具关系；不能并行化 |
| 提前解析陷阱 | “JSON.parse 爆了” | 尝试解析未完成的 `arguments` 字符串 |
| `streamFunctionCallArguments` | “Gemini 3 特性” | 带每调用唯一 ID 的流式参数块 |
| 按完成顺序回复 | “不要等全部完成” | 结果到达即按 id 回复 |

## 延伸阅读

- [OpenAI — Parallel function calling](https://platform.openai.com/docs/guides/function-calling#parallel-function-calling) — 默认行为与退出选择标志
- [Anthropic — Tool use: implementing tool use](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implementing-tool-use) — `disable_parallel_tool_use` 与结果批处理
- [Google — Gemini function calling parallel section](https://ai.google.dev/gemini-api/docs/function-calling) — Gemini 3 中带 ID 关联的并行调用
- [OpenAI — Streaming responses with tools](https://platform.openai.com/docs/api-reference/responses-streaming) — OpenAI 的分块参数重组
- [Anthropic — Streaming messages](https://docs.anthropic.com/en/api/messages-streaming) — 带 `input_json_delta` 的 `content_block_delta`
