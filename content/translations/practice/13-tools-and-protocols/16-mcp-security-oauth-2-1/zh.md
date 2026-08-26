---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/16-mcp-security-oauth-2-1/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 74e8633388346ce360cc53b8aca33dcf3be056362c1111c54c367c257a32dde0
status: reviewed
---

# MCP 授权：CIMD、发行方绑定、PKCE 与升级授权

> 远程 MCP 请求是无状态的，但授权并不是匿名的。每项凭据都要绑定到创建它的发行方，每个令牌都要绑定到接收它的资源。

**类型：** 构建
**语言：** Python
**前置课程：** Phase 13 · 第 09 课（传输）、Phase 13 · 第 15 课（安全）
**预计时间：** 约 90 分钟

## 学习目标

- 通过受保护资源元数据发现授权服务器。
- 在已弃用的 Dynamic Client Registration 之外，优先使用 Client ID Metadata Document。
- 在不得不使用 DCR 兼容路径时声明正确的 `application_type`。
- 校验授权响应中的 `iss`，并按发行方隔离凭据。
- 使用 PKCE、资源指示器、受众校验和增量作用域。
- 发送没有协议会话的 MCP 2026-07-28 授权请求。

## 问题所在

远程 MCP 服务器可能读取私有记录、写入外部系统或触发昂贵工作。认证告诉服务器是谁提交了凭据，但授权还必须回答：

- 凭据由哪个授权服务器签发？
- 令牌针对的是哪个 MCP 资源？
- 哪个客户端和重定向 URI 完成了流程？
- 用户批准了哪些操作？
- 这次精确请求是否仍在批准范围内？

2026-07-28 授权 profile 加强了客户端注册和发行方处理：优先 Client ID Metadata Document，弃用 Dynamic Client Registration，DCR 时要求正确的 `application_type`，校验 RFC 9207 的发行方响应，并禁止跨发行方复用凭据。

这些规则与无状态核心互补，不会恢复核心握手或 `Mcp-Session-Id`。

## 核心概念

### 认识三个角色

- **MCP 客户端：** 代表资源所有者发送请求；
- **MCP 资源服务器：** 接受访问令牌并提供 MCP 端点；
- **授权服务器：** 认证资源所有者、收集同意并签发令牌。

资源服务器和授权服务器可以由同一组织运行，但要分开维护它们的标识符和校验职责。

### 授权适用于 HTTP

MCP 授权规范针对基于 HTTP 的传输。本地 stdio 服务器运行在进程和操作系统信任边界内，不要为了保持形式一致而给 stdio 添加假的浏览器 OAuth 流程。

对于远程 Streamable HTTP，在每个请求的 `Authorization` header 中发送 bearer token，绝不要把它放入 URL。

### 从受保护资源元数据开始

资源服务器发布 RFC 9728 元数据：

```json
{
  "resource": "https://notes.example.com/mcp",
  "authorization_servers": ["https://auth.example.com"],
  "scopes_supported": ["notes:delete", "notes:read", "notes:write"]
}
```

客户端从 MCP 资源 URL 出发，获取这份文档，选择一个公布的授权服务器，再获取该服务器的 OAuth 或 OpenID Connect 元数据。

构造 RFC 9728 well-known URL 时要保留资源路径。对于 `https://notes.example.com/mcp`，本课使用 `https://notes.example.com/.well-known/oauth-protected-resource/mcp`。丢掉 `/mcp` 后缀可能会选中同一 origin 上另一个受保护资源的元数据。

不要从 hostname 猜授权服务器，也不要跟随未经校验的错误体中发现的发行方。客户端要明确哪些发行方值得信任。

### 校验授权服务器元数据

元数据应公布端点和支持的控制项：

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "code_challenge_methods_supported": ["S256"],
  "authorization_response_iss_parameter_supported": true,
  "client_id_metadata_document_supported": true
}
```

要求 PKCE 的 S256，记录精确的发行方字符串。这个精确值会成为注册信息和令牌存储的键。

### 遵循注册优先级

如果客户端已经和选定发行方建立显式关系，使用预注册客户端信息。否则，在授权服务器公布支持时优先使用 Client ID Metadata Document。只有这些机制都不可用时，才把 DCR 作为已弃用的兼容回退，并提示获取客户端信息。

### 优先使用 Client ID Metadata Document

Client ID Metadata Document 让授权服务器获得一个同时作为客户端标识和元数据位置的 HTTPS URL：

```json
{
  "client_id": "https://client.example.com/oauth/metadata.json",
  "client_name": "Notes desktop client",
  "application_type": "native",
  "redirect_uris": ["http://127.0.0.1:8765/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"]
}
```

授权服务器会获取并校验文档。`client_id` 必须是带路径的 HTTPS URL，文档内部的值必须与该 URL 精确相等。必需字段是 `client_id`、`client_name` 和 `redirect_uris`；示例中的 `application_type` 不是 CIMD 要求，它的新强制用途只在 DCR 路径。

把获取文档当作 SSRF 敏感操作：解析并校验目标，拒绝环回、私有、链路本地和其他不允许地址；重定向和 DNS 变化后再次检查；限制重定向次数、字节数和时间；要求 JSON；只按经过校验的 HTTP 缓存控制缓存。`client_name` 等展示字段也要视为不受信任文本。

CIMD 不需要为每次首次接触生成动态标识符，但不会取消重定向 URI 校验、发行方策略或用户同意。

### DCR 是兼容路径

Dynamic Client Registration 对旧授权服务器仍可用，但对新的 MCP 实现已经弃用。

使用 DCR 时声明 `application_type`：

```json
{
  "client_name": "Notes desktop client",
  "application_type": "native",
  "redirect_uris": ["http://127.0.0.1:8765/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"]
}
```

- 桌面、移动、命令行和环回客户端使用 `native`；
- 远程托管的浏览器应用使用 `web` 和远程 HTTPS 重定向。

在 OpenID Connect 注册实现中，省略该字段可能默认成 `web`，从而让合法的环回重定向失败。

把 DCR 代码放在显式回退决策后面。不要在任意 CIMD 校验失败后静默回退，否则安全失败可能被转化成更弱的注册路径。

### 将凭据绑定到发行方

按精确发行方存放由发行方生成的注册材料：

```text
issuer_credentials[issuer] = pre_registered_or_dcr_client
tokens[(issuer, resource)] = access_token
```

如果受保护资源发现从 `https://auth-one.example` 变成 `https://auth-two.example`，就重新评估信任。绝不要把第一发行方的 client secret、DCR client id、注册访问令牌、refresh token 或 access token 发给第二发行方。预注册和 DCR 客户端都必须使用新发行方签发的凭据。

CIMD client id 不同：它是自托管 HTTPS URL，而不是授权服务器签发的凭据。同一个 CIMD URL 可以迁移到新的受信发行方，由其获取并校验文档，不必进行 DCR 重新注册；授权响应和令牌仍要按新发行方校验并存储。

### 带 PKCE 的授权码

交互流程是：

1. 生成高熵 `code_verifier`；
2. 计算 S256 `code_challenge`；
3. 带精确的 `client_id`、`redirect_uri`、`scope`、`code_challenge` 和 `resource` 发送授权请求；
4. 接收包含 `code` 以及（如果提供）`iss` 的授权响应；
5. 在使用任何响应字段之前，将 `iss` 与重定向前记录的精确发行方比较；
6. 使用 `code_verifier`、相同的重定向 URI 和相同的 `resource` 兑换 code；
7. 把新令牌存储在 `(issuer, resource)` 下。

RFC 8707 的 `resource` 参数同时出现在授权请求和令牌请求中，用于标识规范 MCP 服务器 URI。

### 精确校验 `iss`

RFC 9207 防止一个发行方的授权响应被误认为另一个发行方的响应。

如果存在 `iss`，就和记录的发行方比较，不能大小写折叠、改变尾部斜杠、移除默认端口或规范化百分号编码。若不匹配，不要处理 code，甚至不要展示该响应中攻击者控制的错误细节。

带 `iss` 的授权服务器会公布 `authorization_response_iss_parameter_supported: true`。即使缺少该声明，当前客户端也要校验实际出现的 `iss`。

### 在 MCP 服务器校验受众

资源服务器只接受为自己签发的令牌：

```text
token.issuer == configured_authorization_server
token.audience == canonical_mcp_resource
```

无效、过期、错误发行方或错误受众的令牌返回 401。MCP 服务器不得接受或转发面向其他服务的令牌。

### 请求最小的当前作用域

先请求当前需要的作用域。如果后续工具需要更多权限，服务器返回 403 以及权威的作用域挑战：

```text
WWW-Authenticate: Bearer error="insufficient_scope",
  scope="notes:delete",
  resource_metadata="https://notes.example.com/.well-known/oauth-protected-resource/mcp"
```

客户端解释新的权限，取得同意，用合并后的作用域重新授权，再以新的 JSON-RPC id 重试 MCP 请求。

不要假设挑战的作用域是 `scopes_supported` 的子集；当前操作的挑战本身是权威信息。

### 授权与无状态 MCP 线

已授权的工具调用仍携带完整的当前请求信封：

```text
POST /mcp
Authorization: Bearer <access-token>
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: notes.delete
```

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "notes.delete",
    "arguments": {"id": "note-7"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {
        "name": "oauth-lesson-client",
        "version": "1.0.0"
      }
    }
  }
}
```

令牌授权主体，请求元数据协商协议行为，两者不能相互替代。

线上校验使用固定顺序：JSON-RPC 和元数据类型，header 与请求体一致性，最后协议支持性。路由或版本 header 不一致返回 HTTP 400 和 `-32020`；header 与请求体一致但版本不支持时返回 HTTP 400 和 `-32022`，`data` 精确为 `{"supported":["2026-07-28"],"requested":"<actual>"}`。未知方法返回 HTTP 404 和 `-32601`。

每个请求错误（包括无效令牌的 401 和作用域不足的 403）都用带原始请求 `id` 的 JSON-RPC 错误信封。结构化恢复信息可放进可选错误 `data`，`WWW-Authenticate` 仍是 HTTP 响应 header。通知没有 `id`，所以没有 JSON-RPC 响应体；接受的 HTTP 通知返回 202 和空响应体。

服务器实现 `server/discover` 并公布工具，因此也实现必需的 `tools/list`。工具描述有稳定名称、描述和对象根 `inputSchema`；列表是确定性的，并返回 `resultType`、服务器身份元数据、有界 `ttlMs` 和 `cacheScope`。在授权前可以提供 discovery 和与用户无关的工具列表；若任一项随主体变化，就使用正常策略和私有缓存。

### 不转发令牌

MCP 服务器不得把客户端的 MCP 访问令牌转发给下游 API。应为正确受众获取单独的下游令牌，或使用显式的令牌交换设计。只有当服务拒绝为其他服务签发的令牌时，受众校验才有效。

### Refresh token

Refresh token 是可选的。签发时要机密存储，并按发行方和资源建立键。不要假设它一定存在；授权服务器支持轮换时就轮换，并检测已失效值的重用。

```figure
t3-scope-stepup
```

## 动手构建

`code/main.py` 是进程内协议与授权模拟器。它实现受保护资源发现、授权服务器元数据、CIMD 注册、按版本选择的 DCR 回退、应用类型检查、PKCE、发行方校验、资源绑定令牌、作用域升级、`server/discover`、`tools/list` 和无状态工具请求。

模型接收已解析的请求体和路由 header，不是完整 HTTP 适配器，也不解析 `Content-Type` 或 `Accept`。将它接入第 09 课的 Streamable HTTP 适配器；该适配器要求 `Content-Type: application/json`，且 `Accept` 同时包含 `application/json` 和 `text/event-stream`。

运行：

```bash
cd phases/13-tools-and-protocols/16-mcp-security-oauth-2-1
python3 code/main.py
python3 -m unittest discover code/tests -v
```

输出会依次展示 discovery、CIMD 注册、普通读取、两次独立的作用域升级以及按发行方建立键的凭据存储。

## 使用

把模拟器对象映射到生产组件：

- `ResourceServer.protected_resource_metadata` 对应 RFC 9728 端点；
- `AuthorizationServer.metadata` 对应 RFC 8414 或 OpenID Connect discovery；
- `Client.enroll` 对应 CIMD 解析加显式 DCR 兼容分支；
- 发行方签发的客户端凭据和 `tokens_by_issuer_resource` 应成为加密记录。CIMD URL 可以保持可迁移，但授权结果仍须绑定发行方；
- `ResourceServer.handle` 对应中间件：在分发前校验当前 MCP header、令牌和工具作用域，并让每个请求错误都放在匹配的 JSON-RPC 信封中。

## 交付

本课交付 `outputs/skill-oauth-scope-planner.md`。它设计注册优先级、发行方绑定的凭据存储、应用类型、PKCE、资源指示器、作用域挑战和当前无状态请求边界。

## 练习

1. 增加 refresh token 轮换，并拒绝重用之前的 refresh token。
2. 增加发行方 allowlist。发行方改变时，只复用可迁移的 CIMD URL；拒绝所有旧发行方签发的凭据和令牌。
3. 给授权 code 增加过期时间，确认过晚兑换失败。
4. 构建远程 HTTPS 重定向的 web 客户端变体，将它的 DCR 元数据与 native 客户端比较。
5. 在同一个发行方下增加第二个资源，确认它的访问令牌不能在第一个资源使用。

## 关键术语

| 术语 | 含义 |
|------|------|
| 受保护资源元数据 | RFC 9728 文档，标识资源和授权服务器 |
| CIMD | URL 作为 OAuth client identifier 的 HTTPS 元数据文档 |
| DCR | 为兼容性保留的已弃用动态客户端注册 |
| `application_type` | `native` 或 `web`，用于校验重定向 URI 规则 |
| PKCE | 保护被拦截授权码的 verifier 与 S256 challenge |
| `iss` | RFC 9207 授权响应发行方标识符 |
| 资源指示器 | RFC 8707 参数，把令牌请求绑定到 MCP 资源 |
| 受众 | 令牌有效的资源 |
| 升级授权 | 为额外的当前操作作用域重新取得同意并签发令牌 |
| 发行方绑定凭据 | 按精确授权服务器发行方隔离的注册和令牌记录 |

## 延伸阅读

- [MCP 2026-07-28 授权规范](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [RFC 9728：OAuth 2.0 受保护资源元数据](https://www.rfc-editor.org/rfc/rfc9728)
- [RFC 8707：OAuth 2.0 资源指示器](https://www.rfc-editor.org/rfc/rfc8707)
- [RFC 9207：OAuth 2.0 授权服务器发行方标识](https://www.rfc-editor.org/rfc/rfc9207)
- [OAuth Client ID Metadata Document 草案](https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/)
