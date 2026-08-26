---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/09-mcp-transports/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 8b35336a155283e509f16008a3acd65caedd87c443bde2c86c7836d615f6bb4e
status: reviewed
---

# MCP 传输：stdio 与无状态 Streamable HTTP

> 传输负责承载 MCP 消息，但不会补齐缺失的协议状态。在 `2026-07-28` 中，本地 stdio 和远程 Streamable HTTP 都承载自描述请求。

**类型：** 学习
**语言：** Python
**前置课程：** Phase 13，第 07、08 课
**预计时间：** 约 65 分钟

## 学习目标

- 为本地子进程选择 stdio，为网络服务选择 Streamable HTTP。
- 实现现代单端点、仅 POST 的 Streamable HTTP 契约。
- 将 MCP 版本、方法和名称 header 与 JSON-RPC body 对照校验。
- 正确提供请求作用域 SSE 和长生命周期 `subscriptions/listen` 流。
- 迁移基于会话和旧版 HTTP+SSE 的部署，同时不把旧行为描述为现代行为。

## 问题

早期 Streamable HTTP 版本把协议协商与连接、会话行为混在一起。服务器可以生成 `Mcp-Session-Id`，暴露独立 GET 流，接受 DELETE 终止会话，并用 `Last-Event-ID` 恢复 SSE。

MCP `2026-07-28` 从现代 wire 中移除了这些机制。每个请求都可以落到任意健康 worker，因为协议版本和客户端能力随请求 body 一起发送。HTTP header 镜像用于路由和策略，但服务器必须先把它们与 body 对照，再执行请求。

这样更容易扩展，也更容易推理；因此把 2025 传输教成当前行为，会同时教错失败模型和安全模型。

## 概念

### stdio

stdio 用于由客户端启动的子进程：

- 客户端向 stdin 每行写一个 UTF-8 JSON-RPC 消息。
- 服务器向 stdout 每行写一个 UTF-8 JSON-RPC 消息。
- 诊断信息写入 stderr。
- stdin 到 EOF 时服务器及时退出。
- 每个现代请求都在 `params._meta` 中携带版本和客户端能力。

进程可以处理很多次调用，但它不是现代协议会话。进程异常退出会丢失在途请求；应重启进程、重新发现、重新列出、重新打开订阅，并用新的请求 ID 安全重试。

### 2026-07-28 的 Streamable HTTP

现代服务器暴露一个 MCP 端点（例如 `/mcp`），接受 POST。每个 JSON-RPC 请求或通知都是新的 HTTP POST，body 只有一条 JSON-RPC 消息；客户端不会把 JSON-RPC 响应发送给服务器。

请求的响应可以是：

- `Content-Type: application/json`，包含一个 JSON-RPC 响应；或
- `Content-Type: text/event-stream`，先发送与本次请求有关的通知，最后发送 JSON-RPC 响应。

接受的通知返回无 body 的 `202 Accepted`。客户端同时声明两种响应类型：

```http
Accept: application/json, text/event-stream
```

### 仅 POST 就是仅 POST

现代 Streamable HTTP 没有独立 GET 流，也没有 DELETE 会话端点：

- `GET /mcp` 返回 `405 Method Not Allowed`。
- `DELETE /mcp` 返回 `405 Method Not Allowed`。
- `Mcp-Session-Id` 会被忽略，绝不会生成或回显。
- `Last-Event-ID` 会被忽略，因为现代流不可恢复。

请求作用域的流在最终响应前断开时，本次在途请求已经丢失。只有重试安全时，客户端才可以用新的请求 ID 发起新请求，不能恢复旧流。

### Origin 校验

服务器校验进入连接的 `Origin` 以防 DNS rebinding。如果 header 存在但不在显式 allowlist 中，返回 `403 Forbidden`。非浏览器客户端可以省略 `Origin`，这符合官方传输规则。

本地服务器应绑定 `127.0.0.1`，而不是所有网卡；网络服务仍需逐请求认证和授权。Origin 校验不是身份认证。规范化配置后要做精确 origin 匹配，不要用 `origin.startswith(...)` 这类可能接受攻击者后缀的前缀判断。

### 必需的 HTTP 元数据 header

每个现代 POST 请求包括：

```http
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: notes_search
```

规则如下：

- `MCP-Protocol-Version` 必须存在，且等于 `params._meta.io.modelcontextprotocol/protocolVersion`。
- `Mcp-Method` 必须存在，且等于 JSON-RPC `method`。
- `Mcp-Name` 在 `tools/call`、`resources/read` 和 `prompts/get` 中必需。
- `Mcp-Name` 等于 `params.name`；读取资源时等于 `params.uri`。
- header 名大小写不敏感，但 header 值大小写敏感。

不安全或非 ASCII 的 `Mcp-Name` 使用精确的 UTF-8 Base64 sentinel：

```text
=?base64?{Base64EncodedValue}?=
```

服务器先解码再与 body 比较。缺失、格式错误或不一致的镜像 header 返回 HTTP 400 和 JSON-RPC `-32020`。如果两处版本一致但服务器不支持，返回 HTTP 400、`-32022` 及 `{"supported":["2026-07-28"],"requested":"2027-01-01"}`。未知现代方法返回 HTTP 404 和 `-32601`；body 让双时代客户端能够区分现代错误与旧版端点不存在。

### 请求作用域 SSE

服务器可以为一个长请求选择 SSE：

```text
POST tools/call id=41
  <- notifications/progress related to id=41
  <- notifications/progress related to id=41
  <- JSON-RPC response id=41
stream closes
```

服务器不能在此流上发送独立 JSON-RPC 请求。Sampling、elicitation 和 Roots 交互使用 Multi Round-Trip Request 结果；关闭响应流会取消该请求。不要添加用于重放的 SSE event id，现代版本不包含 `Last-Event-ID` 恢复。

### 长生命周期变更使用 subscriptions/listen

变更通知使用客户端打开的请求，而不是独立 GET：

```json
{
  "jsonrpc": "2.0",
  "id": "listen-1",
  "method": "subscriptions/listen",
  "params": {
    "notifications": {
      "toolsListChanged": true,
      "resourceSubscriptions": ["notes://note-1"]
    },
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

POST 响应是长生命周期 SSE 流；第一条协议消息是 `notifications/subscriptions/acknowledged`。确认、每条变更通知和最终结果都在 `_meta` 中带 `io.modelcontextprotocol/subscriptionId`，值等于 listen 请求 ID。流断开时，客户端用新 ID 重新发起 `subscriptions/listen` 并重新获取受影响数据。`resources/subscribe` 和 `resources/unsubscribe` 属于旧版时代。

### 显式的应用状态

删除协议会话不等于禁止有状态产品。服务器可以生成不透明状态句柄，并作为普通工具结果返回；客户端在后续调用中把句柄作为显式参数发送。

句柄必须绑定认证主体、不可猜测、会过期，并且每次使用都重新授权。这样状态位于应用层，而不是藏在传输亲和性中。

隐藏副本状态导致的故障是机械性的：请求 A 到副本 1，在内存创建草稿却不返回句柄；请求 B 是新的 POST，到了副本 2，协议元数据有效却找不到草稿。粘性路由只能暂时掩盖问题，重启、发布、调度或故障转移都会再次暴露它。

正确边界是：协议上下文留在每个请求里；持久应用状态放入共享存储，并用服务器生成的句柄关联。后续请求带上句柄，任意副本都能加载同一记录，授权绑定认证主体和租户。副本内存可以缓存记录，但不能成为正确性所依赖的唯一副本。

按生命周期选择机制：请求局部变量只服务一次调用；短 MRTR continuation 可使用受完整性保护的 `requestState`；草稿或持久任务需要显式句柄、共享持久化、过期、并发控制和幂等性。它们都不是 MCP 协议会话。

### HTTP 双时代兼容

同时支持现代和旧版服务器的客户端先尝试现代 POST。收到 HTTP 400、404 或 405 后检查 body：已识别的现代 JSON-RPC 错误证明对端是现代服务器，应修正或重试版本，不能降级；空 body 或未识别响应可能是旧版 HTTP+SSE 服务器，此时才尝试旧版 GET，并期待它的 `endpoint` 事件。

服务器迁移期可以同时支持两种时代：将现代元数据路由到现代仅 POST 实现，为旧客户端保留独立旧版端点。不要把旧版 GET、DELETE、session id 或 replay 行为描述成 `2026-07-28` 的一部分。

```figure
tp-transport-handshake
```

## 使用

`code/main.py` 用 Python 标准库实现有限的现代 Streamable HTTP 服务器：校验 Origin 和镜像 header，忽略已删除的会话 header，为普通调用返回 JSON，并展示有限的 `subscriptions/listen` SSE 流。

```bash
cd code
python3 main.py --probe
python3 -m unittest discover tests -v
```

probe 会检查：非法 Origin 被拒绝；无需 session id 即可发现；`Mcp-Session-Id` 与 `Last-Event-ID` 被忽略；header 不一致返回 `-32020`；不支持版本返回精确的 `-32022` 数据；无 ID 通知返回无 body 的 HTTP 202；GET/DELETE 返回 405；订阅确认、通知和最终结果都带 subscription id。

## 交付

本课交付 `outputs/skill-mcp-transport-migrator.md`：移除现代协议会话，增加 header-body 校验，用 `subscriptions/listen` 替代独立 GET，并让旧版桥接保持明确隔离。

## 练习

1. 从 POST 移除 `Mcp-Method`，确认 HTTP 400 与 `-32020`。
2. 发送 body/header 都为 `2027-01-01` 的版本，确认 HTTP 400、`-32022` 及精确的 supported/requested 数据。
3. 为非 ASCII 资源 URI 发送 Base64 sentinel `Mcp-Name`，确认解码值与 `params.uri` 比较。
4. 在最终响应前断开有限 listen 流，用新 JSON-RPC ID 重新发起并重新获取工具。
5. 给 ping 工具增加显式工作流句柄，并将它绑定到授权 subject，不使用连接亲和性。

## 关键术语

| 术语 | 含义 |
|------|------|
| stdio | 客户端启动子进程，通过换行分隔 JSON-RPC |
| Streamable HTTP | 每条现代消息都是新 POST 的单端点传输 |
| 请求作用域 SSE | 含相关通知和最终响应的 POST 响应流 |
| `subscriptions/listen` | 用于长期变更通知的客户端发起 POST |
| Header mismatch | 镜像 header 与 body 不一致时的 HTTP 400 / `-32020` |
| Origin 校验 | 防 DNS rebinding，不等于认证 |
| 显式状态句柄 | 作为普通参数传递、替代隐藏会话状态的应用 token |
| 旧版桥接 | 只用于早期版本兼容的独立行为边界 |

## 延伸阅读

- [MCP Transport Overview](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)
- [MCP stdio Transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [MCP Subscriptions](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions)
- [MCP 2026-07-28 Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
