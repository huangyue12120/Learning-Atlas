---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/07-building-an-mcp-server/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 16de84e7ae2bbd0b39d49348339371cdfeff198e81fa6e92ad3a80edb9f90700
status: reviewed
---

# 构建 MCP 服务器——Python + TypeScript SDK

> 大多数 MCP 教程只展示 stdio hello-world。真正的服务器会同时暴露工具、资源和 prompt，处理能力协商，输出结构化错误，并且在不同 SDK 中行为一致。本课端到端构建一个笔记服务器：标准库 stdio 传输、JSON-RPC 分发、三种服务器原语，以及一种在升级时可以直接放入 Python SDK 的 FastMCP 或 TypeScript SDK 的纯函数风格。

**类型：** 构建
**语言：** Python（标准库、stdio MCP 服务器）
**前置课程：** Phase 13 · 06（MCP 基础）
**时间：** 约 75 分钟

## 学习目标

- 实现 `initialize`、`tools/list`、`tools/call`、`resources/list`、`resources/read`、`prompts/list` 和 `prompts/get` 方法。
- 编写一个从 stdin 读取 JSON-RPC 消息、向 stdout 写入响应的分发循环。
- 按 JSON-RPC 2.0 规范及 MCP 的附加错误码输出结构化错误响应。
- 将标准库实现升级为 FastMCP（Python SDK）或 TypeScript SDK，而无需重写工具逻辑。

## 问题

在使用远程传输（Phase 13 · 09）或认证层（Phase 13 · 16）之前，需要先有一个干净的本地服务器。本地意味着 stdio：客户端以子进程方式启动服务器，消息通过 stdin/stdout 按行分隔流动。

2025-11-25 规范规定，stdio 消息编码为 JSON 对象，并使用显式的 `\n` 分隔符。这里没有 SSE；SSE 是旧的远程模式，计划在 2026 年年中移除（Atlassian 的 Rovo MCP 服务器于 2026 年 6 月 30 日弃用；Keboola 于 2026 年 4 月 1 日弃用）。对 stdio 来说，每行一个 JSON 对象就是全部线上格式。

笔记服务器是很好的练习形状，因为它覆盖三种服务器原语。工具执行修改（`notes_create`），资源暴露数据（`notes://{id}`），prompt 提供模板（`review_note`）。本课的形状可以推广到任意领域。

## 概念

### 分发循环

```
loop:
  line = stdin.readline()
  msg = json.loads(line)
  if has id:
    handle request -> write response
  else:
    handle notification -> no response
```

三条规则：

- 不要向 stdout 打印任何不是 JSON-RPC 封装的内容。调试日志写到 stderr。
- 每个请求都必须匹配一个带有相同 `id` 的响应。
- 绝不能响应通知。

### 实现 `initialize`

```python
def initialize(params):
    return {
        "protocolVersion": "2025-11-25",
        "capabilities": {
            "tools": {"listChanged": True},
            "resources": {"listChanged": True, "subscribe": False},
            "prompts": {"listChanged": False},
        },
        "serverInfo": {"name": "notes", "version": "1.0.0"},
    }
```

只声明你支持的能力。客户端依赖能力集合来限制功能。

### 实现 `tools/list` 和 `tools/call`

`tools/list` 返回 `{tools: [...]}`，每个条目包含 `name`、`description`、`inputSchema`。`tools/call` 接收 `{name, arguments}`，返回 `{content: [blocks], isError: bool}`。

内容块带有类型。最常见的形式是：

```json
{"type": "text", "text": "Found 2 notes"}
{"type": "resource", "resource": {"uri": "notes://14", "text": "..."}}
{"type": "image", "data": "<base64>", "mimeType": "image/png"}
```

工具错误有两种形状。协议级错误（未知方法、错误参数）是 JSON-RPC 错误。工具级错误（调用有效但工具失败）返回 `{content: [...], isError: true}`。这样模型可以在上下文中看到失败。

### 实现资源

资源从设计上就是只读的。`resources/list` 返回清单；`resources/read` 返回内容。URI 可以是 `file://...`、`http://...` 或 `notes://` 这样的自定义 scheme。

将数据暴露为资源而不是工具时：

- 模型不会“调用”它；客户端可以根据用户请求将它注入上下文。
- 当资源发生变化时，订阅让服务器推送更新（Phase 13 · 10）。
- Phase 13 · 14 用 `ui://` 为交互式资源扩展这一机制。

### 实现 prompt

Prompt 是带有命名参数的模板。宿主会将它们作为 slash command 呈现。`review_note` prompt 可以接收 `note_id` 参数，生成多消息 prompt 模板，再由客户端送入模型。

### Stdio 传输的细节

- 按换行分隔的 JSON。没有长度前缀 framing。
- 不要缓冲。每次写入后调用 `sys.stdout.flush()`。
- 生命周期由客户端控制。stdin 关闭（EOF）时，干净退出。
- 不要静默处理 SIGPIPE；记录日志并退出。

### 注解

每个工具都可以携带描述安全属性的 `annotations`：

- `readOnlyHint: true`——纯读取，重试安全。
- `destructiveHint: true`——不可逆副作用；客户端应确认。
- `idempotentHint: true`——相同输入产生相同输出。
- `openWorldHint: true`——与外部系统交互。

客户端使用这些信息决定 UX（确认对话框、状态指示器）与路由（Phase 13 · 17）。

### 升级路径

`code/main.py` 中的标准库服务器大约 180 行。FastMCP（Python）通过装饰器风格将相同逻辑压缩为：

```python
from fastmcp import FastMCP
app = FastMCP("notes")

@app.tool()
def notes_search(query: str, limit: int = 10) -> list[dict]:
    ...
```

TypeScript SDK 有等价的形状。准备好时可以直接升级；能力、分发和内容块这些概念都相同。

```figure
t3-dispatch-loop
```

## 动手使用

`code/main.py` 是一个完整的、仅使用标准库的 stdio 笔记 MCP 服务器。它处理 `initialize`、`tools/list`、针对三个工具（`notes_list`、`notes_search`、`notes_create`）的 `tools/call`、针对每条笔记的 `resources/list` 和 `resources/read`，以及 `review_note` prompt。可以通过管道传入 JSON-RPC 消息来驱动它：

```
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | python main.py
```

请重点观察：

- 分发器是一个按方法名索引的 `dict[str, Callable]`。
- 每个工具执行器返回内容块列表，而不是裸字符串。
- 执行器抛出异常时会设置 `isError: true`。

## 交付物

本课会生成 `outputs/skill-mcp-server-scaffolder.md`。给定一个领域（笔记、工单、文件、数据库），这个 skill 会搭建具有正确工具 / 资源 / prompt 拆分和 SDK 升级路径的 MCP 服务器。

## 练习

1. 运行 `code/main.py`，用手写的 JSON-RPC 消息驱动它。执行 `notes_create`，再执行 `resources/read` 取回新笔记。

2. 添加一个带有 `annotations: {destructiveHint: true}` 的 `notes_delete` 工具。确认客户端会呈现确认对话框（这需要真实宿主；Claude Desktop 可以使用）。

3. 实现 `resources/subscribe`：每当笔记被修改时，服务器推送 `notifications/resources/updated`。加入 keepalive 任务。

4. 将服务器迁移到 FastMCP。Python 文件应缩减到 80 行以内。线上行为必须一致；使用同一 JSON-RPC 测试工具核验。

5. 阅读规范的 `server/tools` 章节，找出本课服务器尚未实现的工具定义字段。（提示：有好几个；挑一个加入。）

## 术语

| 术语 | 人们常说 | 实际含义 |
|------|----------------|------------------------|
| MCP 服务器 | “暴露工具的东西” | 通过 stdio 或 HTTP 使用 MCP JSON-RPC 通信的进程 |
| stdio 传输 | “子进程模型” | 服务器由客户端启动，通过 stdin/stdout 通信 |
| 分发器 | “方法路由器” | JSON-RPC 方法名到处理函数的映射 |
| 内容块 | “工具结果块” | 工具响应 `content` 数组中的类型化元素 |
| `isError` | “工具级失败” | 表示工具失败；区别于 JSON-RPC 错误 |
| 注解 | “安全提示” | readOnly / destructive / idempotent / openWorld 标志 |
| FastMCP | “Python SDK” | 构建在 MCP 协议之上的装饰器式高阶框架 |
| 资源 URI | “可寻址数据” | 标识资源的 `file://`、`db://` 或自定义 scheme |
| Prompt 模板 | “Slash command 简报” | 服务器提供、带参数槽位的宿主 UI 模板 |
| 能力声明 | “功能开关” | 在 `initialize` 中声明的按原语能力标志 |

## 延伸阅读

- [Model Context Protocol — Python SDK](https://github.com/modelcontextprotocol/python-sdk) — 参考 Python 实现
- [Model Context Protocol — TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — 对应的 TypeScript 实现
- [FastMCP — server framework](https://gofastmcp.com/) — 装饰器式 Python MCP API
- [MCP — Quickstart server guide](https://modelcontextprotocol.io/quickstart/server) — 使用任一 SDK 的端到端教程
- [MCP — Server tools spec](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) — tools/* 消息的完整参考
