---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/17-claude-agent-sdk/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: f1fb3653f42b54dd9267aa3bd20bb56714567f56c71a8b92972d725f0948b9bd
status: reviewed
---

# 将 Harness 作为库——子智能体与 Session Store

> 可以导入的 harness：内置工具、用于上下文隔离的子智能体、钩子、W3C 追踪传播、session 持久化。Claude Agent SDK 是参考示例——它是 Claude Code harness 的库形态；Claude Managed Agents 是面向长期异步工作的托管替代方案。

**类型：** 学习 + 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 01 节（智能体循环）、第 14 阶段 · 第 10 节（Skill 库）
**用时：** 约 75 分钟

## 学习目标

- 解释 Anthropic Client SDK（原始 API）和 Claude Agent SDK（harness 形态）的区别。
- 描述子智能体——并行化和上下文隔离——以及何时应该使用它们。
- 说出 Python SDK 的 session store 界面（append、load、list_sessions、delete、list_subkeys）和 --session-mirror 的作用。
- 用标准库实现一个 harness：包含内置工具、隔离上下文的子智能体生成、生命周期钩子和 session store。

## 问题所在

原始 LLM API 只提供一次往返。生产智能体需要工具执行、MCP 服务器、生命周期钩子、子智能体生成、session 持久化和追踪传播。Claude Agent SDK 将这种形状作为库提供——它就是 Claude Code 使用的同一个 harness，并向自定义智能体开放。

## 核心概念

### Client SDK 与 Agent SDK

- **Client SDK（anthropic）。** 原始 Messages API。循环、工具和状态都由你负责。
- **Agent SDK（claude-agent-sdk）。** 内置工具执行、MCP 连接、钩子、子智能体生成和 session store。作为库提供的 Claude Code 循环。

### 内置工具

SDK 开箱提供 10 多种工具：文件读写、shell、grep、glob、网页抓取等。自定义工具通过标准工具 schema 界面注册。

### 子智能体

Anthropic 文档说明了两种用途：

1. **并行化。** 并发运行独立工作。“为这 20 个模块分别找到测试文件”就是 20 个并行的子智能体任务。
2. **上下文隔离。** 子智能体使用自己的上下文窗口；只有结果返回给编排器，从而保留编排器的预算。

Python SDK 的近期新增能力包括 list_subagents()、get_subagent_messages()，可用来读取子智能体 transcript。

### Session Store

与 TypeScript 保持协议对等：

- append(session_id, message)——添加一轮。
- load(session_id)——恢复对话。
- list_sessions()——枚举会话。
- delete(session_id)——级联删除子智能体会话。
- list_subkeys(session_id)——列出子智能体键。

--session-mirror（CLI 标志）会在 transcript 流式输出时，将它镜像到外部文件，便于调试。

### 钩子

可以注册的生命周期钩子：

- PreToolUse、PostToolUse——拦截或审计工具调用。
- SessionStart、SessionEnd——设置和清理。
- UserPromptSubmit——在模型看到用户输入前处理它。
- PreCompact——在上下文压缩前运行。
- Stop——智能体退出时清理。
- Notification——旁路告警。

钩子是 pro-workflow（第 14 阶段课程参考）和类似系统添加横切行为的方式。

### W3C 追踪上下文

调用方上处于活动状态的 OTel span 会通过 W3C 追踪上下文 header 传播到 CLI 子进程。整个多进程轨迹会在后端显示为一条 trace。

### Claude Managed Agents

托管替代方案（beta header managed-agents-2026-04-01）适合长期异步工作，提供内置提示词缓存和内置压缩。它用托管基础设施换取控制权。

### 这个模式会在哪里出错

- **子智能体过度生成。** 为 100 个小任务生成 100 个子智能体，开销占主导。应改为批处理。
- **钩子蔓延。** 每个团队都添加钩子，启动时间膨胀。每季度复查钩子。
- **Session 膨胀。** 会话不断累积，尺寸增长。使用 list_sessions 加过期策略。

```figure
ae-subagent-isolation
```

## 动手构建

code/main.py 用标准库实现 SDK 形状：

- Tool、ToolRegistry，以及内置的 read_file、write_file、list_dir。
- Subagent——私有上下文、隔离运行、返回结果。
- SessionStore——append、load、list、delete、list_subkeys。
- Hooks——pre_tool_use、post_tool_use、session_start、session_end。
- 一个 demo：主智能体并行生成 3 个子智能体（每个都隔离），聚合结果并持久化 session。

运行：

```
python3 code/main.py
```

轨迹展示子智能体上下文隔离（编排器上下文大小保持有界）、钩子执行和 session 持久化。

## 实际使用

- **Claude Agent SDK** 适合希望采用 Claude Code harness 形态的 Claude 优先产品。
- **Claude Managed Agents** 适合托管的长期异步工作。
- **OpenAI Agents SDK**（第 16 节）是 OpenAI 优先的对应方案。
- **LangGraph + 自定义工具**适合希望使用图形状状态机的场景。

## 交付

outputs/skill-claude-agent-scaffold.md 会搭建一个 Claude Agent SDK 应用，包含子智能体、钩子、session store、MCP 服务器连接和 W3C 追踪传播。

## 练习

1. 增加子智能体生成器：把 20 个任务分成每组 5 个的并行子智能体。比较编排器上下文大小与每个任务一个子智能体的方案。
2. 实现 PreToolUse 钩子，限制每个 session 每分钟最多 5 次 write_file 调用。追踪行为。
3. 将 list_subkeys 接到子智能体树渲染器。深层嵌套是什么样？
4. 将玩具实现迁移到真正的 claude-agent-sdk Python 包。工具注册有什么变化？
5. 阅读 Claude Managed Agents 文档。何时会从自托管切换到托管？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Agent SDK | “作为库的 Claude Code” | Harness 形状：工具、MCP、钩子、子智能体、session store |
| Subagent | “子智能体” | 独立上下文、独立预算；结果向上返回 |
| Session store | “对话数据库” | 带子智能体级联的轮次持久化、加载、列举和删除 |
| Hook | “生命周期回调” | 工具前后、session、提示词提交、压缩、停止 |
| W3C trace context | “跨进程 trace” | 父 span 传播到 CLI 子进程 |
| Managed Agents | “托管 harness” | Anthropic 托管的长期异步工作 |
| --session-mirror | “Transcript 镜像” | 流式传输时将 session 轮次写入外部文件 |
| MCP server | “工具界面” | 挂接到智能体的外部工具/资源来源 |

## 延伸阅读

- [Claude Agent SDK 概览](https://platform.claude.com/docs/en/agent-sdk/overview)——Claude Code 的库形态
- [Anthropic，使用 Claude Agent SDK 构建智能体](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)——生产模式
- [Claude Managed Agents 概览](https://platform.claude.com/docs/en/managed-agents/overview)——托管替代方案
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)——对应方案
