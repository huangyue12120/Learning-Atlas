---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/09-mcp-transports/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 60dbddcf450e90103d34a0d30d1309738c5fefe76e4d83b17dafca036fcff410
status: reviewed
---

# MCP 传输——stdio、Streamable HTTP 与 SSE 迁移

> stdio 只适用于本地，除此之外无处可用。Streamable HTTP（2025-03-26）是远程标准。旧的 HTTP+SSE 传输已弃用，并将在 2026 年年中移除。选错传输会付出迁移成本；选对传输则能得到支持远程托管、保持会话连续性并防御 DNS 重绑定的 MCP 服务器。

**类型：** 学习
**语言：** Python（标准库、Streamable HTTP 端点骨架）
**前置课程：** Phase 13 · 07、08（MCP 服务器与客户端）
**时间：** 约 45 分钟

## 学习目标

- 根据部署形状（本地还是远程、单进程还是服务器集群）在 stdio 与 Streamable HTTP 之间选择。
- 实现 Streamable HTTP 单端点模式：用 POST 处理请求，用 GET 建立会话流。
- 执行 `Origin` 校验与 session-id 语义，抵御 DNS 重绑定。
- 在 2026 年年中移除期限之前，将旧的 HTTP+SSE 服务器迁移到 Streamable HTTP。

## 问题

第一种 MCP 远程传输（2024-11）是 HTTP+SSE：一个端点处理客户端的 POST，另一个 Server-Sent Events 通道处理服务器到客户端的流。它能工作，但也很笨重：每个会话需要两个端点，某些 CDN 前的缓存会失效，而且依赖长连接 SSE，而一些 WAF 会激进地终止这类连接。

2025-03-26 规范用 Streamable HTTP 替换了它：一个端点，POST 处理客户端请求，GET 建立会话流，二者共享 `Mcp-Session-Id` 请求头。此后构建或迁移的每个服务器都使用 Streamable HTTP。旧的 SSE 模式正在弃用——Atlassian Rovo 于 2026 年 6 月 30 日移除；Keboola 于 2026 年 4 月 1 日移除；大多数剩余企业服务器将在 2026 年底前移除。

而 stdio 对本地服务器仍然重要。Claude Desktop、VS Code 和所有 IDE 形态的客户端都通过 stdio 启动服务器。正确的心智模型是：stdio 对应“这台机器”，Streamable HTTP 对应“网络上”。二者不要混用。

## 概念

### stdio

- 子进程传输。客户端启动服务器，通过 stdin/stdout 通信。
- 每行一个 JSON 对象。按换行分隔。
- 没有会话 ID；进程身份就是会话。
- 不需要认证（子进程继承父进程的信任边界）。
- 永远不要用于远程服务器——你需要用 SSH 或 socat 建隧道，而那时应直接使用 Streamable HTTP。

### Streamable HTTP

使用单一端点 `/mcp`（或任意路径）。支持三种 HTTP 方法：

- **POST /mcp。** 客户端发送 JSON-RPC 消息。服务器返回单个 JSON 响应，或者返回一个包含一个或多个响应的 SSE 流（批量响应和与该请求有关的通知很适合采用后者）。
- **GET /mcp。** 客户端打开长连接 SSE 通道。服务器用它发送服务器到客户端的请求（sampling、通知、elicitation）。
- **DELETE /mcp。** 客户端显式终止会话。

会话由服务器在第一次响应中设置、客户端在之后每个请求中回显的 `Mcp-Session-Id` 请求头标识。会话 ID 必须是密码学随机的（至少 128 bit）；出于安全原因，拒绝由客户端选择的 ID。

### 单端点与双端点

旧规范中的双端点模式在 2026 年仍可调用——规范称它为“legacy compatible”。但所有新服务器都应使用单端点。官方 SDK 会输出单端点；只有在连接尚未迁移的远程服务时才使用旧模式。

### `Origin` 校验与 DNS 重绑定

浏览器目前不是 MCP 客户端，但攻击者可以制作网页，诱使浏览器向 `localhost:1234/mcp` 发 POST——用户的本地 MCP 服务器可能正在这里监听。如果服务器不检查 `Origin`，浏览器的同源策略也救不了它，因为 `Origin: http://evil.com` 是有效的跨源值。

2025-11-25 规范要求服务器拒绝 `Origin` 不在允许列表中的请求。允许列表通常包含 MCP 客户端宿主（`https://claude.ai`、`vscode-webview://*`）以及本地 UI 使用的 localhost 变体。

### 会话 ID 生命周期

1. 客户端发送不带 `Mcp-Session-Id` 的第一条请求。
2. 服务器分配随机 ID，并在响应头中设置 `Mcp-Session-Id`。
3. 客户端在之后所有请求和流的 `GET /mcp` 上回显这个请求头。
4. 服务器可以撤销会话；客户端在之后的请求中看到 404，必须重新初始化。
5. 客户端可以显式 DELETE 会话，以便干净关闭。

### Keepalive 与重连

SSE 连接会断开。客户端使用相同的 `Mcp-Session-Id` 重新发起 GET。服务器必须将中断期间错过的事件排队（不超过合理窗口），并通过客户端回显的 `last-event-id` 请求头重放。

Phase 13 · 13 会介绍 Tasks，让长时间运行的工作即使在完整会话重连后也能存活。

### 向后兼容探测

想同时支持新旧服务器的客户端可以这样做：

1. 向 `/mcp` 发 POST。
2. 如果响应是带 JSON 或 SSE 的 `200 OK`，这就是 Streamable HTTP。
3. 如果响应是 `200 OK`、`Content-Type: text/event-stream`，并且带有指向第二端点的 `Location` 请求头，这就是旧的 HTTP+SSE；跟随 `Location`。

### Cloudflare、ngrok 与托管

2026 年的生产级远程 MCP 服务器运行在 Cloudflare Workers（带 MCP Agents SDK）、Vercel Functions 或容器化的 Node/Python 上。关键点是：托管平台必须支持 SSE GET 的长连接 HTTP。Vercel 免费层上限为 10 秒，不适合此用途。Cloudflare Workers 支持无限时长的流。

### 网关组合

当用网关（Phase 13 · 17）置于多个 MCP 服务器前面时，网关就是一个重写会话 ID 并复用上游的 Streamable HTTP 单端点。工具在网关层合并；客户端看到的是一个逻辑服务器。

### 传输失败模式

- **stdio SIGPIPE。** 子进程在写入中途死亡会引发 SIGPIPE；服务器应干净退出。客户端应检测 EOF 并将会话标记为死亡。
- **HTTP 502 / 504。** Cloudflare、nginx 和其他代理会在上游失败时发出这些状态码。Streamable HTTP 客户端应在短暂退避后重试一次。
- **SSE 连接断开。** TCP RST、代理超时或客户端网络变化会关闭流。客户端使用 `Mcp-Session-Id` 和可选的 `last-event-id` 重连以继续。
- **会话撤销。** 服务器使会话 ID 失效；客户端在下一次请求中看到 404。客户端必须重新握手。
- **时钟偏差。** 客户端与服务器的资源 TTL 计算不一致。客户端应将服务器时间戳视为权威。

### 何时绕过 Streamable HTTP

一些企业在自己的网络中将 MCP 服务器部署在 gRPC 或消息队列传输之后。这不是标准做法——MCP 规范没有正式定义它们。网关可以向 MCP 客户端暴露 Streamable HTTP 表面，同时内部使用 gRPC。保持外部表面符合规范；网关负责转换。

```figure
tp-transport-handshake
```

## 动手使用

`code/main.py` 使用 `http.server`（标准库）实现一个最小 Streamable HTTP 端点。它处理 `/mcp` 上的 POST、GET 和 DELETE，在第一次响应中设置 `Mcp-Session-Id`，校验 `Origin`，并拒绝不在允许列表中的来源请求。处理器复用了第 07 课笔记服务器的分发逻辑。

请重点观察：

- POST 处理器读取 JSON-RPC body，分发并写出 JSON 响应（单响应变体；SSE 变体的结构类似）。
- `Origin` 检查拒绝默认的 `http://evil.example` 探测，但接受 `http://localhost`。
- 会话 ID 是随机的 128-bit 十六进制字符串；服务器在内存中保存每会话状态。

## 交付物

本课会生成 `outputs/skill-mcp-transport-migrator.md`。给定一个旧的 HTTP+SSE MCP 服务器，这个 skill 会生成迁移到 Streamable HTTP 的计划，包括会话 ID 连续性、Origin 检查和向后兼容探测支持。

## 练习

1. 运行 `code/main.py`。用 `curl` POST 一个 `initialize`，观察响应头中的 `Mcp-Session-Id`。再 POST 第二个请求并回显该请求头，验证会话连续性。

2. 添加打开 SSE 流的 GET 处理器。每五秒发送一个 `notifications/progress` 事件。使用相同的会话 ID 重新 GET，确认服务器接受它。

3. 实现 `last-event-id` 重放逻辑。重连时，重放自该 ID 以来生成的全部事件。

4. 扩展 `Origin` 校验以支持通配符模式（`https://*.example.com`），确认它接受 `https://app.example.com`，但拒绝 `https://evil.example.com.attacker.net`。

5. 从官方注册表中找一个旧 HTTP+SSE 服务器（有好几个），勾勒迁移方案：端点处理、会话 ID 生成和请求头语义会怎样变化？

## 术语

| 术语 | 人们常说 | 实际含义 |
|------|----------------|------------------------|
| stdio 传输 | “本地子进程” | 通过 stdin/stdout、按换行分隔的 JSON-RPC |
| Streamable HTTP | “远程传输” | 单端点 POST + GET + 可选 SSE，2025-03-26 规范 |
| HTTP+SSE | “旧模式” | 将在 2026 年年中移除的双端点模型 |
| `Mcp-Session-Id` | “会话请求头” | 服务器分配、后续每个请求都会回显的随机 ID |
| `Origin` 允许列表 | “DNS 重绑定防御” | 拒绝 Origin 未获批准的请求 |
| 单端点 | “一个 URL” | `/mcp` 处理所有会话操作的 POST / GET / DELETE |
| `last-event-id` | “SSE 重放” | 在不漏掉事件的情况下恢复断开流的请求头 |
| 向后兼容探测 | “新旧检测” | 根据客户端响应形状自动选择传输 |
| 长连接 HTTP | “SSE 流” | 在一条 TCP 连接上推送数分钟或数小时的事件 |
| 会话撤销 | “强制重新初始化” | 服务器使会话 ID 失效；客户端必须重新握手 |

## 延伸阅读

- [MCP — Basic transports spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) — stdio 与 Streamable HTTP 的权威参考
- [MCP — Basic transports spec 2025-03-26](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) — 引入 Streamable HTTP 的版本
- [Cloudflare — MCP transport](https://developers.cloudflare.com/agents/model-context-protocol/transport/) — Workers 托管的 Streamable HTTP 模式
- [AWS — MCP transport mechanisms](https://builder.aws.com/content/35A0IphCeLvYzly9Sw40G1dVNzc/mcp-transport-mechanisms-stdio-vs-streamable-http) — 不同部署形状的比较
- [Atlassian — HTTP+SSE deprecation notice](https://community.atlassian.com/forums/Atlassian-Remote-MCP-Server/HTTP-SSE-Deprecation-Notice/ba-p/3205484) — 具体的迁移期限示例
