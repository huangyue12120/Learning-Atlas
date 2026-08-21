---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/11-llm-engineering/14-model-context-protocol/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 0fca0b7198240b7feb7aea83ccecd30bbfe0285f140be211a5e038975ba21c55
status: reviewed
---

# 模型上下文协议（MCP）

> 2025 年之前构建的每个 LLM 应用都自定义了一套工具模式。后来 Anthropic 发布了 MCP，Claude 采用了它，OpenAI 也采用了它；到 2026 年，它已经成为把任意 LLM 连接到任意工具、数据源或智能体的默认线格式。编写一个 MCP 服务器，所有 host 都能与它通信。

**类型：** 构建
**语言：** Python
**前置要求：** 第 11 阶段 · 第 09 课（函数调用）、第 11 阶段 · 第 03 课（结构化输出）
**用时：** 约 75 分钟

## 问题所在

你要交付一个聊天机器人，它需要三个工具：数据库查询、日历 API 和文件读取器。你先为 Claude 写三套 JSON Schema。然后销售团队希望在 ChatGPT 中使用同样的工具——你又要按 OpenAI 的 `tools` 参数重写一遍。接着还要加入 Cursor、Zed 和 Claude Code——再重写三遍，每一遍的 JSON 约定都略有不同。一周后，Anthropic 增加了一个新字段；你要更新六套 schema。

2025 年之前，每个 host（运行 LLM 的东西）和每个 server（暴露工具与数据的东西）都自带专用协议，扩展时要面对 N×M 的集成矩阵。

模型上下文协议把这张矩阵压扁成了一条协议：基于 JSON-RPC 的规范。一个服务器暴露工具、资源和提示词；任何兼容的 host——Claude Desktop、ChatGPT、Cursor、Claude Code、Zed，以及大量智能体框架——都可以发现并调用它们，无需定制胶水代码。

截至 2026 年初，MCP 已成为三大厂商（Anthropic、OpenAI、Google）以及各大智能体 harness 之间默认的工具与上下文协议。

## 核心概念

![MCP：一个 host、一个 server、三种能力](../assets/mcp-architecture.svg)

**三种原语。** 一个 MCP 服务器恰好暴露三类东西。

1. **工具（Tools）**——模型可以调用的函数，类似 OpenAI 的 `tools` 或 Anthropic 的 `tool_use`。每个工具都有名称、描述、JSON Schema 输入和处理器。
2. **资源（Resources）**——模型或用户可以请求的只读内容（文件、数据库行、API 响应），通过 URI 寻址。
3. **提示词（Prompts）**——用户可以作为快捷方式调用的可复用模板。

**线格式。** 在 stdio、WebSocket 或可流式 HTTP 之上运行 JSON-RPC 2.0。每条消息都是 `{"jsonrpc": "2.0", "method": "...", "params": {...}, "id": N}`。发现方法包括 `tools/list`、`resources/list`、`prompts/list`；调用方法包括 `tools/call`、`resources/read`、`prompts/get`。

**Host、client 与 server。** host 是 LLM 应用（例如 Claude Desktop）。client 是 host 中负责与恰好一个 server 通信的子组件。server 是你的代码。一个 host 可以同时挂载多个 server。

### 握手

每个会话都从 `initialize` 开始。client 发送协议版本和自身能力；server 返回自己的版本、名称，以及它支持的能力集合（`tools`、`resources`、`prompts`、`logging`、`roots`）。此后的所有通信都会依据这些能力协商。

### MCP 不是什么

- 它不是检索 API。RAG（第 11 阶段 · 第 06 课）仍然决定要拉取什么；MCP 只是把检索结果作为资源暴露出来的传输层。
- 它不是智能体框架。MCP 是管道；LangGraph、PydanticAI 和 OpenAI Agents SDK 等框架位于它之上。
- 它不属于 Anthropic。规范和参考实现都以开源形式放在 `modelcontextprotocol` 组织下。

```figure
mcp-nxm-collapse
```

## 动手构建

### 第 1 步：最小 MCP 服务器

官方 Python SDK 是 `mcp`（以前叫 `mcp-python`）。高层 `FastMCP` 助手用装饰器注册处理器。

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("demo-server")

@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two integers."""
    return a + b

@mcp.resource("config://app")
def app_config() -> str:
    """Return the app's current JSON config."""
    return '{"env": "prod", "region": "us-east-1"}'

@mcp.prompt()
def code_review(language: str, code: str) -> str:
    """Review code for correctness and style."""
    return f"You are a senior {language} reviewer. Review:\n\n{code}"

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

三个装饰器分别注册三种原语。类型提示会变成 host 能看到的 JSON Schema。让 Claude Desktop 或 Claude Code 运行它，只需把 server 入口指向这个文件。

### 第 2 步：从 host 调用 MCP 服务器

官方 Python client 会说 JSON-RPC。把它和 Anthropic SDK 组合起来，只需要十几行代码。

```python
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp import ClientSession

params = StdioServerParameters(command="python", args=["server.py"])

async def call_add(a: int, b: int) -> int:
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            result = await session.call_tool("add", {"a": a, "b": b})
            return int(result.content[0].text)
```

`session.list_tools()` 返回的就是 LLM 会看到的那套 schema。生产 host 会在每一轮对话中注入这些 schema，让模型发出 `tool_use` 块，再由 client 把调用转发到 server。

### 第 3 步：可流式 HTTP 传输

stdio 适合本地开发。对于远程工具，使用可流式 HTTP——每个请求一个 POST，可选用 Server-Sent Events 传递进度；它从 2025-06-18 版本的规范起得到支持。

```python
# Inside the server entrypoint
mcp.run(transport="streamable-http", host="0.0.0.0", port=8765)
```

Host 配置（Claude Desktop 的 `mcp.json` 或 Claude Code 的 `~/.mcp.json`）：

```json
{
  "mcpServers": {
    "demo": {
      "type": "http",
      "url": "https://tools.example.com/mcp"
    }
  }
}
```

server 仍然使用同样的装饰器；变化的只有传输方式。

### 第 4 步：范围控制与安全

MCP 工具是在他人信任边界上运行的任意代码。下面三种模式是强制要求。

- **能力白名单。** host 暴露 `roots` 能力，让 server 只能看到允许的路径。在工具处理器中强制执行，不要信任模型提供的路径。
- **会改变状态的操作必须有人在环。** 只读工具可以自动执行；写入/删除工具必须请求确认——当 server 在工具元数据中设置 `destructiveHint: true` 时，host 会展示审批界面。
- **工具投毒防御。** 恶意资源可能包含隐藏的提示注入指令（“总结时还要调用 `exfil`”）。把资源内容当作不受信任的数据；绝不能让它越过边界进入系统消息语境。参见第 11 阶段 · 第 12 课（Guardrails）。

参见 `code/main.py`，其中有一个可运行的 server + client 配对示例，演示了上述全部内容。

## 2026 年仍在上线的常见坑

- **Schema 漂移。** 模型在第 1 轮看到了 `tools/list`，第 5 轮工具集合发生变化，模型却调用了已消失的工具。host 应在收到 `notifications/tools/list_changed` 时重新列出工具。
- **资源大块倾倒。** 把 2MB 文件作为资源一次性倒入会浪费上下文，应在 server 侧分页或摘要。
- **服务器太多。** 挂载 50 个 MCP server 会耗尽工具预算（第 11 阶段 · 第 05 课）。大多数前沿模型在超过约 40 个工具后都会退化。
- **版本错位。** 规范修订版（2024-11、2025-03、2025-06、2025-12）会引入破坏性字段。在 CI 中固定协议版本。
- **stdio 死锁。** 向 stdout 写日志的 server 会破坏 JSON-RPC 流。日志只能写到 stderr。

## 使用方法

2026 年的 MCP 技术栈：

| 场景 | 选择 |
|-----------|------|
| 本地开发、单用户工具 | Python `FastMCP`、stdio 传输 |
| 远程团队工具 / SaaS 集成 | 可流式 HTTP、OAuth 2.1 认证 |
| TypeScript host（VS Code 扩展、Web 应用） | `@modelcontextprotocol/sdk` |
| 高吞吐服务器、类型化访问 | 官方 Rust SDK（`modelcontextprotocol/rust-sdk`） |
| 探索生态服务器 | `modelcontextprotocol/servers` monorepo（Filesystem、GitHub、Postgres、Slack、Puppeteer） |

经验法则：如果一个工具是只读的、可缓存的，并且会被两个或更多 host 调用，就把它做成 MCP server。如果只是一次性的内联逻辑，就保留为本地函数（第 11 阶段 · 第 09 课）。

## 交付

保存 `outputs/skill-mcp-server-designer.md`：

```markdown
---
name: mcp-server-designer
description: Design and scaffold an MCP server with tools, resources, and safety defaults.
version: 1.0.0
phase: 11
lesson: 14
tags: [llm-engineering, mcp, tool-use]
---

Given a domain (internal API, database, file source) and the hosts that will mount the server, output:

1. Primitive map. Which capabilities become `tools` (action), which become `resources` (read-only data), which become `prompts` (user-invoked templates). One line per primitive.
2. Auth plan. Stdio (trusted local), streamable HTTP with API key, or OAuth 2.1 with PKCE. Pick and justify.
3. Schema draft. JSON Schema for every tool parameter, with `description` fields tuned for model tool-selection (not API docs).
4. Destructive-action list. Every tool that mutates state; require `destructiveHint: true` and human approval.
5. Test plan. Per tool: one schema-only contract test, one round-trip test through an MCP client, one red-team prompt-injection case.

Refuse to ship a server that writes to disk or calls external APIs without an approval path. Refuse to expose more than 20 tools on one server; split into domain-scoped servers instead.
```

## 练习

1. **简单。** 给 `demo-server` 增加一个 `subtract` 工具。从 Claude Desktop 连接它。通过发出 `tools/list_changed` 通知，确认 host 无需重启就能发现新工具。
2. **中等。** 增加一个暴露 `/var/log/app.log` 最后 100 行的 `resource`。强制执行 roots 白名单，即使模型要求访问 `../etc/passwd` 也必须阻断。
3. **困难。** 构建一个 MCP proxy，把三个上游服务器（Filesystem、GitHub、Postgres）复用为一个聚合接口。处理名称冲突，并干净地转发 `notifications/tools/list_changed`。

## 关键术语

| 术语 | 人们口中的说法 | 它实际指什么 |
|------|-----------------|-------|
| MCP | “LLM 的工具协议” | 用于向任意 LLM host 暴露工具、资源和提示词的 JSON-RPC 2.0 规范。 |
| Host | “Claude Desktop” | LLM 应用——拥有模型和用户界面，并挂载一个或多个 client。 |
| Client | “连接” | host 内部针对每个 server 的连接，使用 JSON-RPC 与恰好一个 server 通信。 |
| Server | “装着工具的东西” | 你的代码；它公布工具/资源/提示词并处理调用。 |
| Tool | “函数调用” | 模型可调用的动作，输入是 JSON Schema，结果是文本/JSON。 |
| Resource | “只读数据” | 通过 URI 寻址的内容（文件、行、API 响应），host 可以请求它。 |
| Prompt | “保存的提示词” | 用户可调用的模板（通常带参数），以斜杠命令的形式呈现。 |
| Stdio 传输 | “本地开发模式” | 父 host 启动 server 子进程；JSON-RPC 通过 stdin/stdout 传输。 |
| 可流式 HTTP | “2025-06 远程传输” | 请求使用 POST，可选 SSE 传递 server 主动发起的消息；取代旧的仅 SSE 传输。 |

## 延伸阅读

- [Model Context Protocol 规范](https://modelcontextprotocol.io/specification) — 权威参考，按日期进行版本化。
- [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) — Filesystem、GitHub、Postgres、Slack、Puppeteer 参考服务器。
- [Anthropic：Introducing MCP（2024 年 11 月）](https://www.anthropic.com/news/model-context-protocol) — 包含设计取舍的发布文章。
- [Python SDK](https://github.com/modelcontextprotocol/python-sdk) — 本课使用的官方 SDK。
- [MCP 安全注意事项](https://modelcontextprotocol.io/docs/concepts/security) — roots、destructive hints 和工具投毒。
- [Google A2A 规范](https://a2a-protocol.org/latest/) — Agent2Agent 协议；它是与 MCP 的智能体—工具范围互补的智能体—智能体标准。
- [Anthropic：Building effective agents（2024 年 12 月）](https://www.anthropic.com/research/building-effective-agents) — MCP 在更广泛的智能体设计模式库（增强型 LLM、工作流、自主智能体）中的位置。
