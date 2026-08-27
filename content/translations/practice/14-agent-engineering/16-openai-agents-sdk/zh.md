---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/16-openai-agents-sdk/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 377b426042d5664c5c9cf36932d5ae56dc66c51236a1de60656ef110112eb76c
status: reviewed
---

# OpenAI Agents SDK：Handoffs、Guardrails、Tracing

> OpenAI Agents SDK 是建立在 Responses API 之上的轻量级多智能体框架。五个原语：Agent、Handoff、Guardrail、Session、Tracing。Handoff 是名为 transfer_to_<agent> 的工具；Guardrail 在输入或输出上触发；Tracing 默认开启。

**类型：** 学习 + 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 01 节（智能体循环）、第 14 阶段 · 第 06 节（工具使用）
**用时：** 约 75 分钟

## 学习目标

- 说出 OpenAI Agents SDK 的五个原语。
- 解释 handoff：为什么它们被建模为工具、模型看到的名称形状，以及上下文如何传递。
- 区分输入防护栏、输出防护栏和工具防护栏；解释 run_in_parallel 与阻塞模式的差异。
- 用标准库实现带 handoff、guardrail 和 span 风格追踪的运行时。

## 问题所在

不能干净委派的智能体，最后会把所有内容塞进一个提示词。没有防护栏的智能体会发送 PII、违反策略的输出，或无限循环。OpenAI 的 SDK 将让多智能体工作可控的三个原语编码成了标准形状。

## 核心概念

### 五个原语

1. **Agent。** LLM + 指令 + 工具 + handoff。
2. **Handoff。** 委派给另一个智能体。在模型看来，它是名为 transfer_to_<agent_name> 的工具。
3. **Guardrail。** 对输入（仅第一个智能体）、输出（仅最后一个智能体）或工具调用（每个函数工具）的验证。
4. **Session。** 跨轮次自动保存对话历史。
5. **Tracing。** 为 LLM 生成、工具调用、handoff 和 guardrail 提供内置 span。

### 将 Handoff 作为工具

模型会在工具列表中看到 transfer_to_billing_agent。调用它会告诉运行时：

1. 复制对话上下文（或通过 nest_handoff_history beta 将其压缩）。
2. 用目标智能体的指令初始化目标智能体。
3. 继续由目标智能体运行。

这是 supervisor 模式（第 13 节 / 第 28 节）的产品化。

### Guardrails

三种形式：

- **输入防护栏。** 在第一个智能体的输入上运行。在任何 LLM 调用前拒绝不安全或超范围请求。
- **输出防护栏。** 在最后一个智能体的输出上运行。捕获 PII 泄漏、策略违规和格式错误的响应。
- **工具防护栏。** 对每个函数工具运行。验证参数、检查权限、审计执行。

运行模式：

- **并行（默认）。** 防护栏 LLM 与主 LLM 同时运行，尾部延迟更低。如果触发，主 LLM 的工作会被丢弃（浪费 token）。
- **阻塞（run_in_parallel=False）。** 防护栏 LLM 先运行。如果触发，主调用不会浪费 token。

Tripwire 会抛出 InputGuardrailTripwireTriggered / OutputGuardrailTripwireTriggered。

### Tracing

默认开启。每次 LLM 生成、工具调用、handoff 和 guardrail 都会发出一个 span。设置 OPENAI_AGENTS_DISABLE_TRACING=1 可退出。add_trace_processor(processor) 会把 span 扇出到你自己的后端，同时保留发往 OpenAI 的路径。

### Sessions

Session 将对话历史保存在后端（SQLite、Redis 或自定义实现）。Runner.run(agent, input, session=session) 会自动加载并追加内容。

### 这个模式会在哪里出错

- **Handoff 漂移。** Agent A 交给 Agent B，Agent B 又交回 Agent A。增加跳转计数器。
- **防护栏绕过。** 工具防护栏只会在函数工具上触发；内置工具（文件读取、网页抓取）需要独立策略。
- **过度追踪。** span 中包含敏感内容。配合 OTel GenAI 内容捕获规则（第 23 节）——将内容外部存储，用 ID 引用。

```figure
ae-agent-handoff
```

## 动手构建

code/main.py 用标准库实现 SDK 形状：

- Agent、FunctionTool、Handoff（作为带传递语义的函数工具）。
- 带输入/输出/工具防护栏、handoff 分派和跳转计数器的 Runner。
- 用于展示轨迹形状的简单 span 发射器。
- 一个 triage 智能体：根据用户查询交给 billing 或 support；某个输入会触发防护栏。

运行：

```
python3 code/main.py
```

轨迹展示两次成功 handoff、一次输入防护栏触发，以及一棵对应真实 SDK 输出的 span 树。

## 实际使用

- **OpenAI Agents SDK** 用于 OpenAI 优先的产品。
- **Claude Agent SDK**（第 17 节）用于 Claude 优先的产品。
- **LangGraph**（第 13 节）用于需要显式状态和持久化恢复的场景。
- **自定义实现**用于需要精确控制（语音、多提供方、联邦部署）的场景。

## 交付

outputs/skill-agents-sdk-scaffold.md 会搭建一个 Agents SDK 应用，包含 triage 智能体、handoff、输入/输出/工具防护栏、session store 和 trace processor。

## 练习

1. 增加 handoff 跳转计数器：超过 N 次 transfer 就拒绝。追踪行为。
2. 将 nest_handoff_history 实现为可选项——传递前把之前的消息压缩成一条摘要。
3. 编写阻塞式输出防护栏。比较会触发防护栏的提示词与通过提示词的延迟。
4. 将 add_trace_processor 接到 JSON logger。每个 span 发出的形状是什么？
5. 阅读 SDK 文档。将标准库玩具迁移到 openai-agents-python。哪些地方建模错了？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Agent | “LLM + 指令” | SDK 中的 Agent 类型；拥有工具和 handoff |
| Handoff | “转移” | 模型调用来委派给另一个智能体的工具 |
| Guardrail | “策略检查” | 对输入 / 输出 / 工具调用的验证 |
| Tripwire | “防护栏触发” | 防护栏拒绝时抛出的异常 |
| Session | “历史存储” | 在运行之间持久化的对话记忆 |
| Tracing | “Spans” | 对 LLM + 工具 + handoff + guardrail 的内置可观测性 |
| Blocking guardrail | “顺序检查” | 防护栏先运行；触发时不浪费 token |
| Parallel guardrail | “并发检查” | 防护栏并行运行；触发时会浪费 token，但延迟更低 |

## 延伸阅读

- [OpenAI Agents SDK 文档](https://openai.github.io/openai-agents-python/)——原语、handoff、防护栏、追踪
- [Claude Agent SDK 概览](https://platform.claude.com/docs/en/agent-sdk/overview)——Claude 风格的对应方案
- [Anthropic，构建有效的智能体](https://www.anthropic.com/research/building-effective-agents)——何时应使用 handoff
- [OpenTelemetry GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/)——Agents SDK span 所映射的标准
