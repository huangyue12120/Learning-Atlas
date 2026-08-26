---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/06-mcp-fundamentals/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 9724abed6bec27050404bf895aa78579fb8b4d7ae70bb99a6a2edccf46eca7d6
status: reviewed
---

# MCP 基础：无状态请求与 JSON-RPC

> 现代 MCP 没有握手，也没有协议会话。每个请求都必须携带独立理解、授权、路由和重试所需的元数据。

**类型：** 学习
**语言：** Python
**前置课程：** Phase 13，第 01–05 课
**预计时间：** 约 55 分钟

## 学习目标

- 区分 MCP 的服务器原语与客户端侧功能。
- 为 MCP `2026-07-28` 构造有效的 JSON-RPC 2.0 请求和响应。
- 在每个请求上附加协议版本、客户端能力和客户端身份。
- 使用 `server/discover`，并在没有握手的情况下处理 `UnsupportedProtocolVersionError`。
- 追踪一个独立请求从校验到完整结果的全过程。

## 问题

同一个 MCP 服务器进程或 HTTP worker 可能先后收到来自不同客户端、声明了不同能力的请求。如果服务器记住上一个请求声明过什么，就可能跨请求套用错误的权限或线格式。

MCP `2026-07-28` 通过让协议核心保持无状态来消除这种歧义。服务器必须根据当前请求，而不是连接历史，决定如何处理它。

这改变了心智模型。旧顺序是先建立连接、再握手、最后执行操作；现代顺序更简单：

1. 客户端发送一个自描述请求。
2. 服务器校验该请求的版本和能力。
3. 服务器处理方法。
4. 服务器返回带类型的结果或 JSON-RPC 错误。

下一个请求重新从头执行同样的过程。

## 概念

### 服务器原语

MCP 服务器暴露三种主要原语：

1. **工具**是由模型控制的动作，通过 `tools/list` 发现、用 `tools/call` 调用。
2. **资源**是 URI 寻址的数据，通过 `resources/list` 发现、用 `resources/read` 获取。
3. **提示词**是可复用模板，通过 `prompts/list` 发现、用 `prompts/get` 渲染。

Roots、sampling 和 logging 仍为兼容性保留在 `2026-07-28` schema 中，但已经弃用。新实现应使用显式工具/资源输入代替 Roots，使用直接的模型提供商 API 代替 sampling，并用 stderr 或 OpenTelemetry 代替 logging。Elicitation 仍可通过 Multi Round-Trip Requests 使用：服务器返回输入请求，客户端再重试原操作。现代服务器绝不发起独立的 JSON-RPC 请求。

### JSON-RPC 信封

MCP 使用 JSON-RPC 2.0：

- 请求：`{jsonrpc, id, method, params}`
- 响应：`{jsonrpc, id, result}` 或 `{jsonrpc, id, error}`
- 通知：没有 `id` 的 `{jsonrpc, method, params}`

请求的 `id` 用来关联一次响应；它不会创建协议会话。

### 必需的请求元数据

每个现代请求都在 `params` 内携带 `_meta` 对象：

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/list",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {
        "name": "course-client",
        "version": "1.0.0"
      }
    }
  }
}
```

协议版本和客户端能力是必需的；客户端身份是推荐字段。它是自报的展示与调试数据，不是安全凭据。

服务器不得从更早的请求、stdio 进程、HTTP 连接或单独的传输层 header 推断这些值。

### 完整结果与服务器身份

每个成功的现代结果都包含 `resultType`。普通最终结果使用 `"complete"`；服务器还应在结果元数据中标识自己：

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "resultType": "complete",
    "tools": [],
    "ttlMs": 30000,
    "cacheScope": "public",
    "_meta": {
      "io.modelcontextprotocol/serverInfo": {
        "name": "notes-server",
        "version": "1.0.0"
      }
    }
  }
}
```

`tools/list`、`resources/list`、`prompts/list`、`resources/templates/list`、`resources/read` 和 `server/discover` 的结果可以缓存，因此包含 `ttlMs` 与 `cacheScope`。安全的默认值是 `ttlMs: 0`、`cacheScope: "private"`。列表项应有确定性顺序，以便等价响应产生稳定的缓存键和模型上下文。

### 没有握手的发现

每个现代服务器都必须实现 `server/discover`。客户端可以在调用其他方法前调用它，获取：

- `supportedVersions`
- 服务器 `capabilities`
- 可选的使用说明 `instructions`
- 结果 `_meta` 中的服务器身份
- 缓存提示

发现有用但不是门槛。由于 `tools/list` 自身已经携带协议版本和能力，客户端可以先发送 `tools/list`。

如果请求的版本不受支持，服务器返回 JSON-RPC 错误码 `-32022`：

```json
{
  "requested": "2027-01-01",
  "supported": ["2026-07-28"]
}
```

客户端选择双方都支持的现代版本，并用新的 JSON-RPC 请求 ID 重试。

### 一次请求的生命周期

按以下顺序追踪现代请求：

1. 解析一个 JSON-RPC 信封。
2. 确认 `jsonrpc` 为 `"2.0"`、存在 `id`、`method` 是字符串、`params` 是对象。
3. 要求 `params._meta` 中存在版本字符串和能力对象；元数据缺失或格式错误返回 `-32602`。
4. 在 HTTP 边界比较版本、方法和适用的名称 header 与 body；不一致即使版本不受支持也返回 `-32020`。
5. 确认两处一致后，再以 `-32022` 拒绝一致但不支持的版本。
6. 检查所需能力，按 `method` 路由并校验方法参数。
7. 在处理器运行前认证并授权具体操作。
8. 返回带服务器身份的完整结果。
9. 忘记请求作用域的协议元数据。

这样的顺序可以防止组件对不同请求产生不同解释。网关不能授权 `Mcp-Name: notes.read`，却让源服务器执行 `params.name: notes.delete`。它也将格式错误、header 混淆、版本协商、能力失败、授权失败和处理器失败保留为不同证据。

关闭 stdin 或 HTTP 响应只会结束传输活动；它不会终止协议会话，因为现代 MCP 没有协议会话。

### 明确的旧版兼容

截至 `2025-11-25` 的版本使用 `initialize`、`notifications/initialized`、连接级能力，以及较早 Streamable HTTP 中可选的协议会话。双时代客户端与旧服务器通信时仍可能遇到这些行为。

必须隔离两个时代。现代请求以必需的逐请求元数据为标志；只有通过文档化的回退路径才选择旧版连接。不要把 `initialize` 作为 `2026-07-28` 服务器的默认请求。

因此，“无状态”取决于协议时代：在 `2026-07-28` 中，每个普通请求都可独立解释，不存在 MCP 会话；在 `2025-11-25` 及更早版本中，初始化和协商能力属于连接，兼容适配器可以保留旧版连接状态。双时代实现不是一个宽松状态机，而是现代无状态核心旁边的隔离旧版适配器，并在解析器运行前做出明确选择。

这两种含义都不禁止持久化应用状态。工作流、任务或草稿可以放在共享存储中，由不透明句柄指向；客户端把句柄作为普通输入发送，所有副本都认证并授权其使用。协议上下文不能泄露进该存储，不能用它冒充已删除的会话。

```figure
mcp-tool-call
```

## 使用

`code/main.py` 不依赖框架，负责构造、校验、追踪并分发现代 MCP 消息。运行：

```bash
python3 code/main.py
python3 -m unittest discover code/tests -v
```

留意三个不变量：

- 每个请求都重复自己的 `_meta` 字段。
- 每个成功结果都是 `resultType: "complete"`，并包含服务器身份。
- 列表结果具有确定性顺序和明确的缓存提示。

## 交付

本课交付 `outputs/skill-mcp-handshake-tracer.md`。历史文件名保持不变，但产物现在是无状态请求追踪器：它独立审计每条消息，并且只在确实存在旧版握手流量时标记它。

## 练习

1. 把一个请求的协议版本改为 `2027-01-01`，确认错误码是 `-32022`，且数据中声明了受支持版本。
2. 删除第二个请求的 `io.modelcontextprotocol/clientCapabilities`，确认服务器不会复用第一个请求的能力。
3. 反转内存中的工具注册表，确认 `tools/list` 仍返回相同的确定性顺序。
4. 把 `cacheScope` 从 `public` 改为 `private`，解释两种情况下哪些授权上下文可以复用响应。
5. 增加可选的 `clientInfo` 缺失测试。因为客户端身份是推荐而非必需字段，请求仍应有效。

## 关键术语

| 术语 | 含义 |
|------|------|
| 无状态协议 | 每个请求都提供解释自身所需的元数据 |
| 请求元数据 | `params._meta` 中的版本、客户端能力和推荐的客户端身份 |
| `server/discover` | 声明版本、能力、说明和身份的必需服务器方法 |
| `resultType` | 每个成功的现代结果上的判别字段 |
| 可缓存结果 | 包含必需 `ttlMs` 与 `cacheScope` 提示的结果 |
| 协议时代 | 现代逐请求元数据或旧版连接级初始化 |
| 传输生命周期 | 进程、连接或响应流生命周期，不等于协议会话状态 |
| `-32022` | 带有 requested/supported 版本信息的不支持协议版本错误 |

## 延伸阅读

- [MCP Architecture](https://modelcontextprotocol.io/specification/2026-07-28/architecture)
- [MCP Base Protocol](https://modelcontextprotocol.io/specification/2026-07-28/basic)
- [MCP Server Discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [MCP 2026-07-28 Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
