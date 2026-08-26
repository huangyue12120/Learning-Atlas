---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/16-mcp-security-oauth-2-1/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 5d401075eed627b1c5c7b41896b379a706364b43e397b24a0b1664ce33b8a248
status: reviewed
---

# MCP 安全 II——OAuth 2.1、资源指示器与增量作用域

> 远程 MCP 服务器需要授权，而不只是认证。2025-11-25 规范与 OAuth 2.1 + PKCE + 资源指示器（RFC 8707）+ 受保护资源元数据（RFC 9728）对齐。SEP-835 增加了增量作用域同意：服务器在 403 `WWW-Authenticate` 中要求更高作用域，执行升级授权。本课将升级流程实现为状态机，让你看清每一跳。

**类型：** 构建
**语言：** Python（标准库，OAuth 状态机模拟器）
**前置课程：** Phase 13 · 09（传输）、Phase 13 · 15（安全 I）
**时间：** 约 75 分钟

## 学习目标

- 区分资源服务器和授权服务器的职责。
- 走通受 PKCE 保护的 OAuth 2.1 授权码流程。
- 使用 `resource`（RFC 8707）和受保护资源元数据（RFC 9728）防止困惑代理攻击。
- 实现升级授权：服务器以带有 `WWW-Authenticate` 的 403 响应请求更高作用域；客户端重新请求用户同意并重试。

## 问题

早期 MCP（2025 年以前）让远程服务器使用临时 API key，甚至完全不做认证。2025-11-25 规范用完整的 OAuth 2.1 配置填补了这个缺口。

现实中有三类需求：

- **普通远程服务器。** 用户安装访问其 Notion / GitHub / Gmail 的远程 MCP 服务器。OAuth 2.1 配合 PKCE 是合适的形状。
- **作用域升级。** 获得 `notes:read` 的笔记服务器后来可能需要对某个操作使用 `notes:write`。升级授权（SEP-835）会请求新增作用域，而不必重做完整流程。
- **防止困惑代理。** 客户端持有一个面向服务器 A 的令牌。服务器 A 是恶意的，尝试把令牌呈给服务器 B。资源指示器（RFC 8707）将令牌固定到预定受众，使它只能用于目标服务器。

OAuth 2.1 本身并不新。新的是 MCP 的配置：指定的必需流程（只有授权码 + PKCE；默认不允许 implicit 和 client credentials）、每次令牌请求都必须带资源指示器，以及发布受保护资源元数据让客户端知道去哪里授权。

## 概念

### 角色

- **客户端。** MCP 客户端（Claude Desktop、Cursor 等）。
- **资源服务器。** MCP 服务器（笔记、GitHub、Postgres 等）。
- **授权服务器。** 签发令牌。它可以与资源服务器是同一服务，也可以是独立的 IdP（Auth0、Keycloak、Cognito）。

在 MCP 配置中，资源服务器和授权服务器可以位于同一个主机，但应该通过 URL 区分。

### 授权码 + PKCE

流程如下：

1. 客户端生成 `code_verifier`（随机值）和 `code_challenge`（SHA256）。
2. 客户端将用户重定向到 `/authorize?response_type=code&client_id=...&redirect_uri=...&scope=notes:read&code_challenge=...&resource=https://notes.example.com`。
3. 用户同意。授权服务器重定向到 `redirect_uri?code=...`。
4. 客户端向 `/token?grant_type=authorization_code&code=...&code_verifier=...&resource=...` 发出 POST。
5. 授权服务器根据存储的 challenge 验证 verifier 的哈希，并签发访问令牌。
6. 客户端使用令牌：每次向资源服务器请求都带上 `Authorization: Bearer ...`。

PKCE 防止授权码拦截攻击。资源指示器防止令牌在其他地方生效。

### 受保护资源元数据（RFC 9728）

资源服务器发布 `/.well-known/oauth-protected-resource` 文档：

```json
{
  "resource": "https://notes.example.com",
  "authorization_servers": ["https://auth.example.com"],
  "scopes_supported": ["notes:read", "notes:write", "notes:delete"]
}
```

客户端从资源服务器发现授权服务器。这样可以减少配置——客户端只需要资源 URL。

### 资源指示器（RFC 8707）

令牌请求中的 `resource` 参数固定令牌的预定受众。签发的令牌包含 `aud: "https://notes.example.com"`。另一个 MCP 服务器收到此令牌时，会检查 `aud` 并拒绝它。

### 作用域模型

作用域是以空格分隔的字符串。常见的 MCP 约定包括：

- `notes:read`、`notes:write`、`notes:delete`
- 管理能力使用 `admin:*`（谨慎使用）
- 身份使用 `profile:read`

作用域选择应遵循最小权限：现在需要什么就请求什么，需要更多能力时再升级。

### 升级授权（SEP-835）

用户授予 `notes:read`。后来用户要求智能体删除一条笔记。服务器响应：

```text
HTTP/1.1 403 Forbidden
WWW-Authenticate: Bearer error="insufficient_scope",
    scope="notes:delete", resource="https://notes.example.com"
```

客户端看到 `insufficient_scope` 错误后，会通过同意对话框请求用户批准新增作用域，针对它执行一次小型 OAuth 流程，再使用新令牌重试请求。

### 令牌受众验证

每次请求中，服务器都检查 `token.aud == self.resource_url`。不匹配即返回 401。这会阻止跨服务器复用令牌。

### 短时令牌与轮换

访问令牌应该是短时的（默认 1 小时）。每次刷新时都轮换刷新令牌。客户端在后台处理静默刷新。

### 不透传令牌

采样服务器（Phase 13 · 11）不得将客户端令牌传递给其他服务。采样请求就是边界。

### 防止困惑代理

令牌绑定到 `aud`。客户端绑定到 `client_id`。每个请求都要针对二者进行验证。规范明确禁止早期远程工具生态中常见的“传递令牌”模式。

### 客户端 ID 发现

每个 MCP 客户端都在固定 URL 发布自己的元数据。授权服务器可以获取客户端的元数据文档，以发现重定向 URI 和联系信息。这样就不需要手动注册客户端。

### 网关与 OAuth

Phase 13 · 17 展示企业网关如何处理 OAuth：网关持有上游服务器的凭据，发给客户端的令牌由网关签发，上游令牌不会离开网关。这会翻转信任模型——用户只需向网关认证一次；网关处理 N 个服务器的授权。

```figure
t3-scope-stepup
```

## 动手使用

`code/main.py` 将完整的 OAuth 2.1 升级流程模拟为状态机。它实现：

- PKCE code-verifier / challenge 生成。
- 带资源指示器的授权码流程。
- 受保护资源元数据端点。
- 带受众检查的令牌验证。
- `insufficient_scope` 时的升级授权。

本课没有 HTTP 服务器；状态机在内存中运行，以便你追踪每一跳。Phase 13 · 17 的网关课程会将它接入真正的传输。

## 交付物

本课产出 `outputs/skill-oauth-scope-planner.md`。给定一个包含若干工具的远程 MCP 服务器，该 skill 会设计作用域集合、固定规则和升级策略。

## 练习

1. 运行 `code/main.py`。追踪双作用域升级流程，注意升级时哪些跳转会重复。

2. 添加刷新令牌轮换：每次刷新都签发一个新的刷新令牌并使旧令牌失效。模拟被窃取的刷新令牌在轮换后被使用，并确认失败。

3. 用标准库 `http.server` 将受保护资源元数据端点实现为真正的 HTTP 响应。参照第 09 课的 `/mcp` 端点。

4. 为 GitHub MCP 服务器设计作用域层级：读取仓库、写入 PR、批准 PR、合并 PR、管理员。使用升级授权逐级提高权限。

5. 阅读 RFC 8707 和 RFC 9728。找出 9728 中 MCP 使用方式不同于 RFC 示例的一个字段。（提示：与 `scopes_supported` 有关。）

## 术语

| 术语 | 人们会怎么说 | 它实际表示什么 |
|------|----------------|------------------------|
| OAuth 2.1 | “现代 OAuth” | 强制 PKCE 并禁止 implicit 流程的整合 RFC |
| PKCE | “持有者证明” | 由 code verifier + challenge 组成，用来阻止授权码拦截 |
| 资源指示器 | “令牌受众” | RFC 8707 的 `resource` 参数，将令牌固定到一个服务器 |
| 受保护资源元数据 | “发现文档” | RFC 9728 的 `/.well-known/oauth-protected-resource` |
| 升级授权 | “增量同意” | 按需增加作用域的 SEP-835 流程 |
| `insufficient_scope` | “带 WWW-Authenticate 的 403” | 服务器要求重新同意更大作用域的信号 |
| 困惑代理 | “服务间复用令牌” | 可信持有者不当转发令牌的攻击 |
| 短时令牌 | “访问令牌 TTL” | 很快过期、由刷新令牌续期的 Bearer 令牌 |
| 作用域层级 | “最小权限栈” | 逐级增加权限、各级之间使用升级授权的作用域集合 |
| 客户端 ID 元数据 | “客户端发现文档” | 客户端发布自身 OAuth 元数据的 URL |

## 延伸阅读

- [MCP — Authorization spec](https://modelcontextprotocol.io/specification/draft/basic/authorization)——MCP OAuth 配置的权威规范
- [den.dev — MCP November authorization spec](https://den.dev/blog/mcp-november-authorization-spec/)——2025-11-25 变更 walkthrough
- [RFC 8707 — Resource indicators for OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc8707)——固定受众的 RFC
- [RFC 9728 — OAuth 2.0 protected resource metadata](https://datatracker.ietf.org/doc/html/rfc9728)——发现文档的 RFC
- [Aembit — MCP OAuth 2.1, PKCE and the future of AI authorization](https://aembit.io/blog/mcp-oauth-2-1-pkce-and-the-future-of-ai-authorization/)——升级流程的实践 walkthrough
