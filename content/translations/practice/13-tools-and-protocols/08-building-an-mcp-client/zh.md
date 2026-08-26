---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/08-building-an-mcp-client/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: e2c5694b1476f72efa4528cf30d52cc2b20ba64618cbef7563c80fbab8430275
status: reviewed
---

# 构建 MCP 客户端——发现、调用与会话管理

> 大多数 MCP 内容都会发布服务器教程，然后对客户端一笔带过。真正困难的编排发生在客户端代码中：进程启动、能力协商、跨多个服务器合并工具列表、sampling 回调、重连和命名空间冲突处理。本课构建一个多服务器客户端，将三个不同的 MCP 服务器提升为供模型使用的一个扁平工具命名空间。

**类型：** 构建
**语言：** Python（标准库、多服务器 MCP 客户端）
**前置课程：** Phase 13 · 07（构建 MCP 服务器）
**时间：** 约 75 分钟

## 学习目标

- 将 MCP 服务器作为子进程启动，完成 `initialize`，并发送 `notifications/initialized`。
- 维护每个服务器的会话状态（能力、工具列表、最近看到的通知 ID）。
- 将多个服务器的工具列表合并到一个命名空间，并处理冲突。
- 将工具调用路由到拥有它的服务器，并重组响应。

## 问题

真正的智能体宿主（Claude Desktop、Cursor、Goose、Gemini CLI）会同时加载多个 MCP 服务器。用户可能会同时运行文件系统服务器、Postgres 服务器和 GitHub 服务器。客户端的任务是：

1. 启动每个服务器。
2. 分别完成握手。
3. 对每个服务器调用 `tools/list`，并将结果展平。
4. 当模型输出 `notes_search` 时，在合并后的命名空间中查找它，并路由到正确的服务器。
5. 非阻塞地处理任何服务器的通知（`tools/list_changed`）。
6. 在传输失败时重连。

手工实现这些内容，就是区分“玩具”和“可用服务”的地方。官方 SDK 会封装它们，但心智模型必须属于你。

## 概念

### 启动子进程

使用 `stdin=PIPE`、`stdout=PIPE`、`stderr=PIPE` 的 `subprocess.Popen`。设置 `bufsize=1`，并使用文本模式逐行读取。每个服务器对应一个进程；客户端为每个服务器持有一个 `Popen` 句柄。

### 每服务器会话状态

每个服务器对应一个 `Session` 对象，其中保存：

- `process`——Popen 句柄。
- `capabilities`——服务器在 `initialize` 时声明的能力。
- `tools`——最近一次 `tools/list` 的结果。
- `pending`——请求 id 到等待响应的 promise/future 的映射。

请求天然是异步的；向服务器 A 发送 `tools/call` 时，服务器 B 正在调用不能阻塞。可以使用带队列的线程或 asyncio。

### 合并后的命名空间

客户端看到聚合工具列表时，名称可能冲突。两个服务器都可能暴露 `search`。客户端有三个选择：

1. **按服务器名称添加前缀。** `notes/search`、`files/search`。清楚但不美观。
2. **静默地先到先得。** 后来的服务器的 `search` 覆盖先前的。风险较高，会隐藏冲突。
3. **拒绝冲突。** 拒绝加载第二个服务器，并通知用户。对安全敏感的宿主最安全。

Claude Desktop 使用按服务器添加前缀。Cursor 使用冲突拒绝并给出清晰错误。VS Code MCP 也采用按服务器添加前缀。

### 路由

合并后，分发表将 `tool_name` 映射到 `session`。模型按名称输出调用；客户端找到会话，将 `tools/call` 消息写入该服务器的 stdin，然后等待响应。

### Sampling 回调

如果服务器在 `initialize` 时声明了 `sampling` 能力，它就可以发送 `sampling/createMessage`，请求客户端运行 LLM。客户端必须：

1. 阻塞发往该服务器的后续请求，直到 sampling 解析；如果实现支持并发，也可以流水线处理。
2. 调用自己的 LLM 提供商。
3. 将响应发回服务器。

第 11 课会端到端介绍 sampling。本课为了完整性只提供桩实现。

### 通知处理

`notifications/tools/list_changed` 表示需要重新调用 `tools/list`。`notifications/resources/updated` 表示如果资源正在使用，需要重新读取它。通知不能产生响应——不要尝试给它们发送确认。

一个常见的客户端错误是：在 `tools/call` 上阻塞读取循环，而这时通知已经在流中等待。使用后台读取线程，将每条消息推入队列；主线程从队列取出消息并分发。

### 重连

传输可能失败：服务器崩溃、操作系统杀死进程、stdio 管道断开。客户端检测 stdout 上的 EOF，并将会话视为死亡。可以选择：

- 静默重启服务器并重新握手。适用于纯只读服务器。
- 将失败呈现给用户。适用于带有用户可见会话的有状态服务器。

Phase 13 · 09 会介绍 Streamable HTTP 的重连语义；stdio 更简单。

### Keepalive 与会话 ID

Streamable HTTP 使用 `Mcp-Session-Id` 请求头。Stdio 没有会话 ID——进程身份就是会话。Keepalive ping 可选；stdio 管道不会因为空闲而断开。

```figure
tp-client-merge
```

## 动手使用

`code/main.py` 启动三个模拟的 MCP 服务器作为子进程，分别完成握手，合并工具列表，并将工具调用路由到正确的服务器。“服务器”实际上是运行玩具响应器的其他 Python 进程（没有真实 LLM）。运行它可以看到：

- 三次初始化，每次都有自己的能力集合。
- 三个 `tools/list` 结果合并成一个含 7 个工具的命名空间。
- 根据工具名称做出的路由决策。
- 通过命名空间添加前缀来阻止冲突。

请重点观察：

- `Session` 数据类干净地保存每服务器状态。
- 后台读取线程取出 stdout 的每一行，不阻塞主线程。
- 分发表只是一个简单的 `dict[str, Session]`。
- 冲突处理是显式的：两个服务器声明同名时，后者会被加上前缀重命名。

## 交付物

本课会生成 `outputs/skill-mcp-client-harness.md`。给定声明式的 MCP 服务器列表（名称、命令、参数），这个 skill 会生成启动它们、合并工具列表并提供带冲突解决的路由函数的测试工具。

## 练习

1. 运行 `code/main.py` 并观察服务器启动日志。用 SIGTERM 杀死一个模拟服务器进程，观察客户端如何检测 EOF，并将该会话标记为死亡。

2. 实现命名空间前缀。当两个服务器暴露 `search` 时，将第二个重命名为 `<server>/search`。更新分发表，核验工具调用可以正确路由。

3. 为服务器重启加入连接池式退避：连续失败时采用指数退避，上限 30 秒，失败三次后向用户发送通知。

4. 画出一个支持 100 个并发 MCP 服务器的客户端。什么数据结构可以替换简单的分发字典？（提示：用于前缀命名空间的 trie，加上每服务器工具数量指标。）

5. 将客户端迁移到官方 MCP Python SDK。SDK 会封装 `stdio_client` 和 `ClientSession`。在保持多服务器路由的同时，代码应从约 200 行缩减到约 40 行。

## 术语

| 术语 | 人们常说 | 实际含义 |
|------|----------------|------------------------|
| MCP 客户端 | “智能体宿主” | 启动服务器并编排工具调用的进程 |
| 会话 | “每服务器状态” | 能力、工具列表和待处理请求记录 |
| 合并后的命名空间 | “一张工具列表” | 所有活动服务器工具名称组成的扁平集合 |
| 命名空间冲突 | “两个服务器有同名工具” | 客户端必须给重复项加前缀、拒绝或按先到先得处理 |
| 路由 | “这个调用给谁？” | 将工具名称分发到拥有它的服务器 |
| 后台读取器 | “非阻塞 stdout” | 将服务器 stdout 排空并写入队列的线程或任务 |
| Sampling 回调 | “LLM 即服务” | 客户端处理服务器发来的 `sampling/createMessage` |
| `notifications/*_changed` | “原语已变更” | 客户端必须重新发现或重新读取的信号 |
| 重连策略 | “服务器死掉时怎么办” | 传输失败时的重启语义 |
| Stdio 会话 | “进程就是会话” | 没有会话 ID；子进程生命周期就是会话 |

## 延伸阅读

- [Model Context Protocol — Client spec](https://modelcontextprotocol.io/specification/2025-11-25/client) — 权威客户端行为
- [MCP — Quickstart client guide](https://modelcontextprotocol.io/quickstart/client) — 使用 Python SDK 的 hello-world 客户端教程
- [MCP Python SDK — client module](https://github.com/modelcontextprotocol/python-sdk) — `ClientSession` 与 `stdio_client` 参考
- [MCP TypeScript SDK — Client](https://github.com/modelcontextprotocol/typescript-sdk) — TypeScript 对应实现
- [VS Code — MCP in extensions](https://code.visualstudio.com/api/extension-guides/ai/mcp) — VS Code 如何在单一编辑器宿主中复用多个 MCP 服务器
