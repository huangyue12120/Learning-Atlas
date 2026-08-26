---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/18-mcp-auth-production/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: d94a6a3a1333d2ab28e16f157eb863fe80740bc489de29f2314567a16866c1af
status: reviewed
---

# 生产环境中的 MCP 认证——注册、JWKS 刷新与受众固定令牌

> 第 16 课在内存中搭建了 OAuth 2.1 状态机。到了 2026 年，真正交付给组织的每个 MCP 服务器都要位于生产认证之后：能够扩展到无限客户端规模的客户端注册（优先使用 Client ID Metadata Documents，动态客户端注册作为向后兼容的回退）、授权服务器元数据发现（RFC 8414 *或* OpenID Connect Discovery）、不会让凌晨 3 点的令牌验证失效的 JWKS 缓存刷新，以及拒绝跨资源重放的受众固定令牌。本课用三个角色建模完整表面——授权服务器、资源服务器（即 MCP 服务器）和客户端——让你追踪从发现到验证工具调用的每一跳。
>
> **规范提示（2025-11-25）：** 2025 年 11 月的 MCP 授权规范将动态客户端注册从 `SHOULD` 降为 `MAY`，并将 **Client ID Metadata Documents（CIMD）** 设为推荐的默认注册机制。本课按规范规定的优先级讲解二者；代码仍为 walkthrough 保留 DCR，因为它可以在单个进程内完全自包含。

**类型：** 构建
**语言：** Python（标准库）
**前置课程：** Phase 13 · 16（OAuth 2.1 状态机）、Phase 13 · 17（网关）
**时间：** 约 90 分钟

## 学习目标

- 通过 RFC 8414 元数据发现授权服务器，并验证其契约。
- 实现 RFC 7591 动态客户端注册，使 MCP 客户端无需管理员介入即可注册。
- 按计划缓存并刷新 JWKS 密钥，让签名验证在密钥轮换后仍然有效。
- 使用 RFC 8707 资源指示器将令牌固定到单个 MCP 资源，并拒绝困惑代理复用。
- 清晰分离三个角色——授权服务器、资源服务器和客户端——让每个角色只执行属于自己的检查。
- 阅读 IdP 能力矩阵；当 IdP 无法满足 MCP 认证配置时拒绝部署。

## 问题

第 16 课的模拟器在内存中运行 OAuth 2.1。生产环境会暴露出内存模拟器看不到的三个运维缺口。

第一个缺口是注册。一家真实组织可能运行数百个 MCP 服务器和数千个 MCP 客户端。运维人员不会手工将每个 Cursor 用户注册为 OAuth 客户端。2025-11-25 规范为客户端规定了优先顺序：如果有预注册的 `client_id` 就使用它；否则使用 **Client ID Metadata Document**（客户端用自己控制的 HTTPS URL 标识自己，授权服务器主动拉取元数据）；再否则回退到 **RFC 7591 动态客户端注册**（客户端主动 `POST /register`，当场获得 `client_id`）；最后才提示用户。CIMD 是推荐默认值，因为它在保持以 DNS 为根的信任模型的同时完全移除了逐服务器注册；DCR 为向后兼容而保留。二者都从授权服务器元数据中发现入口：CIMD 使用 `client_id_metadata_document_supported`，DCR 使用 `registration_endpoint`。

第二个缺口是密钥轮换。JWT 验证依赖授权服务器的签名密钥，这些密钥以 JSON Web Key Set（JWKS）形式发布。授权服务器会按计划轮换密钥（通常每小时一次，事件响应时有时更快）。如果 MCP 服务器只在启动时获取一次 JWKS，那么在轮换窗口到来后验证会正常工作，直到轮换发生——之后每个请求都会失败，除非重启。生产系统会把 JWKS 接入缓存值和刷新任务：在旧密钥过期前覆盖缓存；如果带有新密钥签名的令牌先于缓存刷新到达，再在缓存未命中时回退获取。

第三个缺口是受众绑定。第 16 课介绍了 RFC 8707 资源指示器。在生产环境中，这个指示器会成为每个请求上的硬性声明检查。MCP 服务器将 `token.aud` 与自己的规范资源 URL 比较，不匹配就返回 HTTP 401。这是防止上游 MCP 服务器（或持有某个服务器令牌的恶意客户端）在同一信任网格中把令牌重放给另一服务器的唯一防线。

本课把每个缺口映射到表面上的一个具体部分。元数据文档是 HTTP 端点；JWKS 缓存刷新是计划任务加键值缓存；JWT 验证是资源服务器在分发任何工具前运行的例程。保持三个角色分离，让每个角色只执行自己拥有的检查：授权服务器签发并轮换密钥，资源服务器缓存和验证，客户端发现并注册。

## 概念

### RFC 8414——OAuth 授权服务器元数据

`/.well-known/oauth-authorization-server` 处的文档描述了客户端所需的一切：

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
  "registration_endpoint": "https://auth.example.com/register",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "scopes_supported": ["mcp:tools.read", "mcp:tools.invoke"],
  "token_endpoint_auth_methods_supported": ["none", "private_key_jwt"]
}
```

客户端得到 MCP 资源 URL 后会串联发现：RFC 9728 的 `oauth-protected-resource`（资源服务器的文档）给出 issuer，然后 `oauth-authorization-server`（本 RFC）给出所有端点。客户端不需要硬编码授权 URL。

在信任某个 IdP 用于 MCP 之前，要验证以下契约：

- `code_challenge_methods_supported` 包含 `S256`（RFC 7636 的 PKCE）。规范明确规定：如果该字段**不存在**，授权服务器不支持 PKCE，客户端**必须**拒绝继续。
- `grant_types_supported` 包含 `authorization_code`，并拒绝 `password` 和 `implicit`。
- 至少公布一条注册路径：`client_id_metadata_document_supported: true`（首选 CIMD）**或** `registration_endpoint`（RFC 7591 DCR，回退）。任一条都满足契约；不再强制要求 DCR。
- 对 OAuth 2.1 而言，`response_types_supported` 必须正好是 `["code"]`。

如果缺少 `S256`，MCP 服务器就拒绝针对该 IdP 部署——PKCE 没有降级模式。如果既没有公布任何注册路径，又没有预注册的 `client_id`，同样无法注册；这说明部署清单错误，而不是代码错误。

### RFC 9728（回顾）——受保护资源元数据

第 16 课介绍过 RFC 9728。生产环境的变化在于：该文档是客户端用来查找“这个 MCP 服务器”信任的授权服务器的唯一位置。单个 MCP 服务器可能接受多个 IdP 的令牌（一个供员工，一个供合作伙伴）。RFC 9728 声明这个集合；RFC 8414 记录每个 IdP 支持什么。

```json
{
  "resource": "https://notes.example.com",
  "authorization_servers": ["https://auth.example.com", "https://partners.example.com"],
  "scopes_supported": ["mcp:tools.invoke"],
  "bearer_methods_supported": ["header"],
  "resource_documentation": "https://notes.example.com/docs"
}
```

### Client ID Metadata Documents（推荐默认值）

CIMD 将注册从“推送”反转为“拉取”。客户端不再请求授权服务器生成 `client_id`，而是把自己控制的 HTTPS URL **作为** `client_id`。该 URL 会解析到一个 JSON 元数据文档，授权服务器在 OAuth 流程中按需获取它。信任以 DNS 为根：如果服务器运营者信任 `app.example.com`，就信任由 `https://app.example.com/client.json` 提供服务的客户端。无需注册往返，无需耗尽 `client_id` 命名空间，也没有要保持同步的逐服务器状态。

客户端托管的元数据文档：

```json
{
  "client_id": "https://app.example.com/oauth/client.json",
  "client_name": "Example MCP Client",
  "client_uri": "https://app.example.com",
  "redirect_uris": ["http://127.0.0.1:7333/callback", "http://localhost:7333/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

文档中的 `client_id` 值**必须**等于提供文档的 URL（授权服务器会验证这一点；不匹配就拒绝）。授权服务器在 RFC 8414 元数据中以 `client_id_metadata_document_supported: true` 宣布支持。

规范对两个安全事实说得很直接：

- **SSRF。** 授权服务器会获取攻击者提供的 URL，因此必须防御服务端请求伪造（不能获取内部 / 管理端点）。
- **localhost 冒充。** CIMD 单独无法阻止本地攻击者声称拥有合法客户端的元数据 URL 并绑定任意 `localhost` 重定向。授权服务器**必须**在同意页面清楚显示重定向 URI 的主机名，并且**应该**对仅使用 `localhost` 的重定向发出警告。

CIMD 不需要服务器端状态，因此不必像 DCR 那样搭建注册器。客户端一侧是只读的：将元数据文档从静态 HTTPS 端点提供出来，让授权服务器主动拉取。

### RFC 7591——动态客户端注册（回退 / 向后兼容）

DCR 现在是 `MAY`，为兼容 2025-11-25 以前的部署以及尚未支持 CIMD 的 IdP 而保留。如果没有 DCR（也没有 CIMD 或预注册），每个 MCP 客户端（Cursor、Claude Desktop、自定义智能体）都需要与 IdP 管理员进行带外交换。有了 DCR，客户端可以发送：

```json
POST /register
Content-Type: application/json

{
  "redirect_uris": ["http://127.0.0.1:7333/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "scope": "mcp:tools.invoke",
  "client_name": "Cursor",
  "software_id": "com.cursor.cursor",
  "software_version": "0.42.0"
}
```

服务器返回 `client_id` 和供后续更新使用的 `registration_access_token`：

```json
{
  "client_id": "c_3e7f1a",
  "client_id_issued_at": 1769472000,
  "redirect_uris": ["http://127.0.0.1:7333/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "registration_access_token": "regt_b2...",
  "registration_client_uri": "https://auth.example.com/register/c_3e7f1a"
}
```

对于运行在用户设备上的 MCP 客户端，`token_endpoint_auth_method: none` 是正确默认值。它们只获得一个 `client_id`，没有可被外泄的 `client_secret`。PKCE 为公共客户端提供所需的持有者证明。

生产环境有三个陷阱：

- 注册端点必须按源 IP 限流。否则恶意方可以脚本化创建数百万个假注册，耗尽 `client_id` 命名空间。在注册器处理请求之前执行限流检查。
- 一些企业 IdP 要求 `software_statement`（为客户端背书的签名 JWT）。本课的 mock 跳过它；生产环境应接入验证步骤，拒绝除 localhost 重定向 URI 之外的未签名注册。
- `registration_access_token` 必须以哈希形式存储，而不是明文。令牌被窃取意味着攻击者可以改写客户端的重定向 URI。

### RFC 8707（回顾）——资源指示器

第 16 课建立了其形状。生产规则是：每次令牌请求都带上 `resource=<canonical-mcp-url>`，MCP 服务器在每次调用时验证 `token.aud` 与自己的资源 URL 匹配。规范 URI 是服务器的**最具体**标识：scheme 和 host 使用小写，不带 fragment，通常不带结尾斜杠。规范并不规定去掉路径——如果路径用于标识一个独立 MCP 服务器，就保留它。`https://mcp.example.com`、`https://mcp.example.com/mcp`、`https://mcp.example.com:8443` 和 `https://mcp.example.com/server/mcp` 都是有效的规范 URI。每个服务器选定一个并将 `aud` 固定为完全相同的值。（为了简洁，本课 mock 使用类似 `https://notes.example.com` 的裸主机受众；如果多个 MCP 服务器共用一个 origin，部署会用路径区分它们。）

### RFC 7636（回顾）——PKCE

PKCE 是 OAuth 2.1 的强制要求。本课的授权码流程始终携带 `code_challenge` 和 `code_verifier`。服务器拒绝任何不带 verifier，或者 verifier 的哈希与存储的 challenge 不匹配的令牌请求。

### MCP 规范 2025-11-25 认证配置

MCP 规范（2025-11-25）精确规定了 MCP 服务器的授权层必须做什么：

- 实现 RFC 9728 受保护资源元数据，并通过 401 响应上的 `WWW-Authenticate: Bearer resource_metadata="..."` 头，**或** well-known URI `/.well-known/oauth-protected-resource` 提供其位置（SEP-985 使该响应头可选，并提供 well-known 回退）。元数据的 `authorization_servers` 字段**必须**至少命名一个服务器。
- 每个请求只能通过 `Authorization: Bearer ...` 接受令牌——绝不能放在 query string 中，也不能只在会话开始时验证。
- 每次请求都验证 `aud`、`iss`、`exp` 和所需作用域。服务器**必须**验证令牌确实专门签发给自己（受众）；缺失或不匹配的 `aud` 要拒绝，不能当作通配符。
- 在 401/403 时返回 `WWW-Authenticate: Bearer`，携带 `error=...`、`resource_metadata="<PRM-URL>"` 参数（这是元数据文档的 URL，**不是**裸资源 URL）；在 `insufficient_scope`（403）时携带 `scope="..."`。注意参数名是 `resource_metadata`，它是发现指针——挑战中没有 `resource` 参数。
- 授权服务器发现可以接受 RFC 8414 OAuth 元数据，**或** OpenID Connect Discovery 1.0；客户端必须按优先顺序尝试两种 well-known 后缀。
- 防御 mix-up 攻击的是客户端（不是服务器）：客户端在重定向前记录预期 `issuer`，并在兑换代码前验证 `iss` 授权响应参数（RFC 9207）。PKCE 单独不能阻止 mix-up，因为客户端会把 `code_verifier` 交给被引导到的任意令牌端点。

OAuth 2.1 draft 是底层基座；RFC 8414/7591/8707/9728/9207 + RFC 7636 + CIMD 是表面；MCP 规范是配置。

### IdP 能力矩阵

并非每个 IdP 都支持完整的 MCP 配置。下表记录的是截至 2025-11-25 规范的事实性能力声明，是一个**部署门槛**，不是推荐。

CIMD 随 2025-11-25 规范发布，而底层 OAuth draft 只在 2025 年 10 月被采用，因此供应商支持仍在到来——把下面的 “CIMD” 理解为“目前的状态，请在自己的 tenant 中验证”，而不是永久声明。

| IdP 类别 | AS 元数据（8414/OIDC） | CIMD | RFC 7591 DCR | RFC 8707 resource | RFC 7636 S256 PKCE | 备注 |
|---|---|---|---|---|---|---|
| 自托管（Keycloak） | yes | emerging | yes | yes（24.x 起） | yes | 本课 MCP 配置的参考 IdP；DCR 路径端到端完整，CIMD 正在跟进新规范。 |
| 企业 SSO（Microsoft Entra ID） | yes | emerging | yes（高级层） | yes | yes | DCR 是否可用取决于 tenant 层级；部署前要在目标 tenant 验证。 |
| 企业 SSO（Okta） | yes | emerging | yes（Okta CIC / Auth0） | yes | yes | Auth0（现为 Okta CIC）可用 DCR；传统 Okta 组织需要管理员预注册。 |
| 社交登录 IdP（通用） | varies | no | rarely | rarely | yes | 大多数社交 IdP 将客户端视为静态合作方，没有自助注册。只把它作为身份来源，在其上叠加自己的 MCP 感知授权服务器。 |
| 自定义 / 自建 | depends | depends | depends | depends | depends | 如果自行交付，就交付完整配置并优先使用 CIMD。跳过 PKCE 或受众绑定会破坏 MCP 认证契约。 |

部署清单的拒绝规则是：如果所选 IdP 没有在 `code_challenge_methods_supported` 中列出 `S256`，MCP 服务器就拒绝启动——PKCE 没有降级模式。注册是较软的门槛：需要至少一条可用路径（预注册的 `client_id`、`client_id_metadata_document_supported: true` 或 `registration_endpoint`）。单独缺少 DCR 不再触发拒绝，因为 CIMD 或预注册可以覆盖它。

### JWKS 刷新模式（AS 轮换，资源服务器刷新）

要把两个动词分开，因为混淆它们是一个真实的生产 bug：

- **Rotate（轮换）**是*授权服务器*做的事：生成新的签名密钥，将它发布到 JWKS，稍后再退役旧密钥。资源服务器不参与，也不能做这件事——它不持有 IdP 的私钥。
- **Refresh（刷新）**是*资源服务器*做的事：重新 `GET` 已发布的 JWKS 并放入缓存。这是资源服务器唯一会执行的 JWKS 操作。

生产故障模式是缓存过期。使用计划刷新任务加键值缓存解决它。资源服务器运行一个任务（cron、timer 或运行时提供的任何机制），按固定间隔获取 `<issuer>/.well-known/jwks.json`，并覆盖 `cache[issuer] = {keys, fetched_at}`。验证器从该缓存读取。如果令牌的 `kid` 不在缓存中，就触发**一次**同步刷新作为回退，然后重新检查。这同时处理两种情况：计划刷新，以及带全新密钥签名的令牌在下一次计划刷新之前到达的密钥重叠窗口。

回退**必须是重新获取，绝不能是轮换**。如果把缓存未命中路径接到 rotate-and-mint，会破坏两件事：（1）生成的新密钥的 `kid` 仍然不会匹配令牌，因此查找依然失败；（2）攻击者发送带随机 `kid` 的令牌时，会迫使系统无限创建密钥，造成自发的 DoS。重新获取是幂等的，因此一个伪造 `kid` 最多只会造成一次浪费的获取。

缓存形状：

```json
{
  "https://auth.example.com": {
    "keys": [
      {"kid": "k_2026_03", "kty": "RSA", "n": "...", "e": "AQAB", "alg": "RS256", "use": "sig"},
      {"kid": "k_2026_04", "kty": "RSA", "n": "...", "e": "AQAB", "alg": "RS256", "use": "sig"}
    ],
    "fetched_at": 1772668800
  }
}
```

同时存在两个密钥是稳定状态。授权服务器会在退役旧密钥（`k_2026_03`）之前引入下一个密钥（`k_2026_04`），这样由旧密钥签发的令牌在过期前仍然有效。缓存持有二者的并集；验证器按 `kid` 选择。

### 验证例程

MCP 服务器在分发任何工具之前运行验证。本课 `code/main.py` 使用的形状是：

```python
result = server.validate(bearer_token, required_scope="mcp:tools.invoke")
if not result["valid"]:
    return {"status": result["status"], "WWW-Authenticate": result["www_authenticate"]}
```

`validate` 解码 JWT，从 JWKS 缓存解析签名密钥（未命中时刷新一次），验证签名，然后检查 `iss` 是否在允许列表中、`aud` 是否是该服务器的规范资源、`exp` 以及所需作用域——首次失败时返回 `WWW-Authenticate` 挑战。将它作为资源服务器上的单一例程，意味着每个入口（每个工具调用、每种传输）都会经过相同的检查；不存在一条未经验证就能到达工具的路径。

### 受众重放 walkthrough（访问令牌权限限制）

服务器 A（`notes.example.com`）和服务器 B（`tasks.example.com`）都向同一个授权服务器注册。服务器 A 被入侵。攻击者拿到用户的 notes 令牌，并把它重放给服务器 B。

服务器 B 的验证器：

1. 按 `kid` 解码 JWT、获取 JWKS、验证签名。
2. 对照受保护资源元数据的 `authorization_servers` 检查 `iss`。（通过——是同一个 IdP。）
3. 检查 `aud == "https://tasks.example.com"`。（失败——令牌的 `aud` 是 `https://notes.example.com`。）
4. 返回 401，并带有 `WWW-Authenticate: Bearer error="invalid_token", error_description="audience mismatch", resource_metadata="https://tasks.example.com/.well-known/oauth-protected-resource"`。

受众声明是协议层面抵御此攻击的唯一防线。为了性能而跳过它是最常见的生产错误；验证器必须在每个请求上运行，而不只是会话开始时运行。规范称之为**访问令牌权限限制**：MCP 服务器**必须**拒绝没有将自身命名为受众的令牌。

> **命名提示。** 规范将“困惑代理”保留给一个相关但不同的问题：MCP 服务器充当第三方 API 的 OAuth **代理**，使用静态 client ID，在没有获得逐客户端用户同意的情况下转发令牌。受众绑定修复上面的重放问题；困惑代理的修复方式是逐客户端同意，**并且**永远不要将入站令牌透传给上游 API（MCP 服务器**必须**获得自己的独立上游令牌）。

### Mix-up 攻击（服务器无法提供的客户端防御）

客户端在其生命周期中会与许多授权服务器通信。恶意 AS 可以尝试让客户端在攻击者的令牌端点兑换诚实 AS 的授权码。受众绑定对此无能为力——攻击发生在令牌存在之前。防御位于客户端（RFC 9207）：

1. 在重定向前，客户端记录从已验证 AS 元数据中得到的预期 `issuer`。
2. 收到授权响应时，客户端将返回的 `iss` 参数与记录的 issuer 比较（简单字符串比较，不做规范化），然后才把代码发送到任何地方。
3. 不匹配（或者 AS 宣布支持 `authorization_response_iss_parameter_supported` 时 `iss` 缺失）→ 拒绝，并且连 `error` 字段也不要展示。

PKCE 单独不能阻止 mix-up，因为客户端会把 `code_verifier` 交给被引导到的任意令牌端点。这就是规范要求客户端在每个请求中连同 PKCE verifier 和 `state` 一起记录 issuer 的原因。

### 失败模式

- **JWKS 过期。** AS 轮换密钥后验证器拒绝有效令牌。修复方式是上面的定时刷新 + 缓存未命中重新获取模式。没有刷新任务就不要缓存 JWKS。
- **以轮换作为回退。** 将缓存未命中路径接到 rotate-and-mint 而非重新获取是一个真实 bug：它不会产生缺失的 `kid`，还会将攻击者控制的 `kid` 变成创建密钥的 DoS。回退必须是幂等的 `refresh-jwks`。
- **缺少 `aud` 声明。** 一些 IdP 只有在令牌请求带有 `resource` 时才默认加入 `aud`。验证器必须拒绝缺失 `aud` 的令牌，不能把缺失当作通配符。
- **缺少 `iss` 检查导致 mix-up。** 未针对重定向前记录的 issuer 验证 RFC 9207 `iss` 授权响应参数的客户端，可能被引导到攻击者的令牌端点去兑换诚实 AS 的代码。这是客户端故障；资源服务器无法补救。
- **作用域升级竞态。** 同一用户的两个并发升级流程可能都成功，并产生作用域不同的两个访问令牌。验证器必须使用请求中呈现的令牌，而不是查找“用户当前的作用域”——后者会造成 TOCTOU 窗口。
- **注册令牌被盗。** 泄露的 `registration_access_token` 允许攻击者改写重定向 URI。在静态存储时对它哈希；每次更新要求客户端呈现明文；一旦怀疑泄露就轮换。
- **`iss` 未固定。** 接受任意 `iss` 的验证器允许攻击者搭建自己的授权服务器，为目标受众注册客户端并签发令牌。受保护资源元数据中的 `authorization_servers` 列表就是允许列表，必须执行它。

```figure
t3-jwks-rotate
```

## 动手使用

`code/main.py` 使用标准库 Python 和三个角色——`AuthorizationServer`、`ResourceServer`、`Client`——走过完整生产流程。流程如下：

1. 授权服务器在 `/.well-known/oauth-authorization-server` 发布 RFC 8414 元数据。
2. MCP 客户端调用元数据端点，检查其注册选项（CIMD 的 `client_id_metadata_document_supported`、DCR 的 `registration_endpoint`）和 S256 PKCE 支持。
3. walkthrough 采用 DCR 回退路径：客户端向 `/register`（RFC 7591）发 POST 并获得 `client_id`。（CIMD 客户端则呈现自己的 HTTPS `client_id` URL，跳过这一步。）
4. MCP 客户端使用带资源指示器（RFC 8707）的 PKCE 授权码流程（RFC 7636）。
5. MCP 客户端带 `Authorization: Bearer ...` 调用 MCP 服务器上的工具。
6. MCP 服务器运行 `validate`，从 JWKS 缓存解析签名密钥。
7. IdP 轮换一个密钥；计划刷新重新将 JWKS 拉入缓存。
8. 下一次调用无需重启即可使用刷新后的密钥验证，旧令牌也会在重叠窗口中继续有效。
9. 对另一个 MCP 资源的受众重放尝试得到 401，错误为 `audience mismatch`，并带有 `resource_metadata` 指针。

这里的 JWT 使用带共享密钥的 HS256（因此课程只需标准库即可运行）。生产环境使用 RS256 或 EdDSA，并采用上述 JWKS 模式；其他验证逻辑相同。由于 IdP 和资源服务器运行在同一进程中，`refresh_jwks` 直接读取授权服务器的密钥列表；在线上它会对 `jwks_uri` 发 HTTP `GET`。

## 交付物

本课产出 `outputs/skill-mcp-auth.md`。给定 MCP 服务器配置和 IdP 能力集合，该 skill 会产出需要搭建的认证表面：受保护资源元数据、应使用的注册路径（CIMD、预注册或 DCR 回退）、JWKS 刷新计划、作用域映射，以及 IdP 不支持完整 RFC 配置时应执行的拒绝规则。

## 练习

1. 运行 `code/main.py` 并追踪流程。注意 IdP 如何在第 6 步轮换密钥，计划任务 `refresh_jwks` 如何重新拉取已发布集合，以及旧令牌（重叠窗口）和新令牌如何在无需重启的情况下都验证成功。

2. 将一个新的 IdP 添加到受保护资源元数据的 `authorization_servers` 列表。用新 IdP 签发令牌并确认验证器接受它。再用未列出的 IdP 签发令牌，确认验证器以 `WWW-Authenticate: Bearer error="invalid_token", error_description="iss not allowed"` 拒绝。

3. 在 `register_client` 中添加一个限流检查，让它在注册器接受请求之前运行。使用一个以 IP 为键、保存在小字典中的源 IP 令牌桶。

4. 阅读 RFC 7591，找出本课 `/register` 处理器没有验证的两个字段。添加验证。（提示：`software_statement` 和 `redirect_uris` URI scheme。）

5. 增加 Client ID Metadata Document 路径。提供一个 `client.json`，使其 `client_id` 等于自身 URL，并让授权服务器获取和验证它（若 `client_id` ≠ URL 就拒绝）。确认 CIMD 客户端无需调用 `register_client` 即可注册。

6. 证明 DoS 修复有效。给验证器发送带随机 `kid` 的令牌，确认 `refresh_jwks` 至多运行一次，且授权服务器的密钥数量不增加。然后故意把回退重新接到 rotate-and-mint，观察每个伪造令牌使密钥数量增加——之后恢复重新获取。

7. 实现 mix-up 小节中的客户端 RFC 9207 `iss` 检查：在授权请求前记录预期 issuer，然后拒绝 `iss` 不匹配的授权响应。

## 术语

| 术语 | 人们会怎么说 | 它实际表示什么 |
|------|----------------|------------------------|
| ASM | “OAuth 元数据文档” | RFC 8414 的 `/.well-known/oauth-authorization-server` JSON |
| CIMD | “客户端元数据 URL” | Client ID Metadata Document——作为 `client_id` 的 HTTPS URL；AS 拉取 JSON。自 2025-11-25 起的推荐默认值 |
| DCR | “自助客户端注册” | RFC 7591 `POST /register` 流程；在 2025-11-25 中降为 `MAY` 回退 |
| JWKS | “用于 JWT 验证的公钥” | 从 `jwks_uri` 获取、按 `kid` 索引的 JSON Web Key Set |
| Rotate 与 refresh | “更新密钥” | *rotate* = AS 生成 / 退役签名密钥；*refresh* = 资源服务器重新获取已发布集合。资源服务器只会 refresh |
| 资源指示器 | “受众参数” | RFC 8707 的 `resource` 参数，将令牌固定到一个服务器 |
| `aud` 声明 | “受众” | 验证器与规范资源 URL 比较的 JWT 声明 |
| 受众重放 | “令牌重放” | 将为服务器 A 签发的令牌呈给服务器 B；通过受众验证防御（规范称访问令牌权限限制） |
| 困惑代理 | “代理令牌滥用” | 使用静态客户端 ID 的 MCP 代理未获得逐客户端同意就转发令牌；与受众重放不同 |
| Mix-up 攻击 | “错误的令牌端点” | 客户端被引导到攻击者端点兑换诚实 AS 的代码；客户端通过 RFC 9207 `iss` 防御 |
| `iss` 允许列表 | “受信任授权服务器” | 受保护资源元数据 `authorization_servers` 中列出的集合 |
| `resource_metadata` | “去哪里找 PRM 文档” | 401/403 上的 `WWW-Authenticate` 参数，命名 RFC 9728 元数据 URL |
| 公共客户端 | “原生或浏览器客户端” | 没有 `client_secret` 的 OAuth 客户端；由 PKCE 补偿 |
| `WWW-Authenticate` | “401/403 响应头” | 携带驱动客户端恢复流程的 `Bearer error=...` 指令 |

## 延伸阅读

- [MCP — Authorization spec (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)——本课实现的 MCP 认证配置
- [MCP blog — One Year of MCP: November 2025 Spec Release](https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/)——2025-11-25 的变化（CIMD、XAA、DCR 降级）
- [Aaron Parecki — Client Registration in the November 2025 MCP Authorization Spec](https://aaronparecki.com/2025/11/25/1/mcp-authorization-spec-update)——CIMD 优先于 DCR 的理由
- [OAuth Client ID Metadata Document (draft-ietf-oauth-client-id-metadata-document-00)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-client-id-metadata-document-00)——CIMD
- [RFC 8414 — OAuth 2.0 Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)——发现契约
- [RFC 7591 — OAuth 2.0 Dynamic Client Registration Protocol](https://datatracker.ietf.org/doc/html/rfc7591)——DCR（回退路径）
- [RFC 7636 — Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)——公共客户端的持有者证明
- [RFC 8707 — Resource Indicators for OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc8707)——受众固定
- [RFC 9728 — OAuth 2.0 Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)——资源服务器发现
- [RFC 9207 — OAuth 2.0 Authorization Server Issuer Identification](https://datatracker.ietf.org/doc/html/rfc9207)——防御 mix-up 攻击的 `iss` 参数
- [OAuth 2.1 draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)——整合后的 OAuth 基座
