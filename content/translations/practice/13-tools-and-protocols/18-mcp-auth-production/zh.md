---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/18-mcp-auth-production/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: da053b84576ba4daba8561f51966376185fd250bcb8792830a9ca043845d5f4b
status: reviewed
---

# 生产环境中的 MCP Auth：按发行方绑定的注册与令牌

> 第 16 课构建了 OAuth 2.1 状态机。本课为 MCP 2026-07-28 加固生产边界：优先 Client ID Metadata Document，只在兼容性需要时使用已弃用的动态注册，校验授权响应发行方，按发行方建立客户端凭据键，刷新 JWKS，并在每个无状态请求上执行受众绑定的令牌校验。
>
> **规范提示（2026-07-28）：** Dynamic Client Registration 已被 Client ID Metadata Document 取代。DCR 仍是兼容机制；使用它时，客户端要声明正确的 `application_type`。客户端校验出现的 RFC 9207 `iss`，绝不跨授权服务器发行方复用凭据。

**类型：** 构建
**语言：** Python（标准库）
**前置课程：** Phase 13 · 第 16 课（OAuth 2.1 状态机）、Phase 13 · 第 17 课（网关）
**预计时间：** 约 90 分钟

## 学习目标

- 通过 RFC 8414 元数据发现授权服务器并校验契约。
- 通过 Client ID Metadata Document 注册，把已弃用 DCR 隔离为回退路径。
- 校验 RFC 9207 `iss`，按授权服务器发行方保存注册信息，并按发行方与资源保存令牌。
- 按计划缓存和刷新 JWKS，使签名校验能够跨越密钥轮换。
- 使用 RFC 8707 资源指示器把令牌绑定到单个 MCP 资源，拒绝困惑代理式复用。
- 在 JWT 校验与令牌 introspection 之间做选择，定义撤销新鲜度，并在身份依赖不可用时安全失败。
- 分离授权服务器、资源服务器和客户端，让各自只执行自己的校验。
- 用部署清单审计授权服务器，拒绝不安全的注册或令牌复用。

## 问题所在

第 16 课模拟器把 OAuth 2.1 放在内存中。生产环境还存在三个内存模拟器看不到的运行缺口。

第一个缺口是注册和凭据隔离。真实组织可能运行数百个 MCP 服务器和数千个 MCP 客户端。2026-07-28 版优先使用 **Client ID Metadata Document**：客户端使用自己控制的、带路径的 HTTPS URL 作为标识符，授权服务器主动获取元数据。RFC 7591 动态注册只保留为已弃用的兼容路径。不得不使用 DCR 时，请求声明正确的 `application_type`。客户端按授权服务器发行方保存注册信息，按 `(issuer, resource)` 保存访问令牌。发行方变化意味着重新注册，资源变化意味着需要另一个受众绑定令牌。

第二个缺口是密钥轮换。JWT 校验依赖授权服务器发布的 JSON Web Key Set（JWKS）。授权服务器按计划轮换密钥（通常每小时一次，事故响应时可能更快）。只在启动时获取一次 JWKS 的 MCP 服务器，在轮换窗口后会拒绝所有请求，直到重启。生产环境把 JWKS 作为带缓存的值，并安排刷新任务，在旧密钥过期前覆盖缓存；如果缓存中没有新 token 的 key，还要允许一次兜底获取。

第三个缺口是受众绑定。第 16 课引入了 RFC 8707 资源指示器。在生产中，它变成每个请求的硬性声明检查：MCP 服务器把 `token.aud` 与自己的规范资源 URL 比较，不一致就返回 HTTP 401。这是防止上游 MCP 服务器（或持有发给某服务器令牌的恶意客户端）在同一信任网格中把令牌重放到其他服务器的唯一防线。

本课把每个缺口映射到具体表面：元数据文档是 HTTP 端点，JWKS 缓存刷新是计划任务加键值缓存，JWT 校验是资源服务器在分发工具前运行的例程。保持三种角色分离：授权服务器签发并轮换密钥，资源服务器缓存并校验，客户端发现并注册。

## 范围：第 16 课之后的生产执行

[第 16 课：MCP OAuth 2.1 安全](../../16-mcp-security-oauth-2-1/docs/en.md)负责授权码状态机、PKCE、受保护资源发现、资源指示器和作用域决策。本课不定义第二套 OAuth 流程，而是从这些契约已经存在开始，讨论部署后的资源服务器如何在密钥轮换、不透明令牌校验、撤销、依赖失败、上线和事故响应期间持续执行它们。

生产边界更窄，也更偏运维：

- JWT 路径在每个请求上验证 pin 住的发行方、算法、签名密钥、受众、时间声明和作用域，并安全刷新 JWKS；
- 不透明令牌路径调用发行方经过认证的 introspection 端点，校验返回的 active、受众或资源、过期时间、主体和作用域；
- 撤销策略定义凭据必须多快停止生效，以及哪种缓存会延迟这一事实；
- 失败策略定义 discovery、JWKS、introspection 或撤销基础设施不可用时怎么做；
- 证据记录是哪份发行方元数据、密钥集或 introspection 响应、令牌声明、策略版本和拒绝理由驱动了决定，但不保存令牌本身。

这个区分让课程可以组合：第 16 课证明流程，第 18 课证明令牌到达真实 MCP 请求路径后，在轮换、撤销和故障场景下仍可信，否则就被拒绝。

## 核心概念

### RFC 8414——OAuth 授权服务器元数据

位于 `/.well-known/oauth-authorization-server` 的文档描述客户端所需的一切：

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
  "client_id_metadata_document_supported": true,
  "registration_endpoint": "https://auth.example.com/register",
  "authorization_response_iss_parameter_supported": true,
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "scopes_supported": ["mcp:tools.read", "mcp:tools.invoke"],
  "token_endpoint_auth_methods_supported": ["none", "private_key_jwt"]
}
```

拿到 MCP 资源 URL 的客户端会串联 discovery：RFC 9728 的 `oauth-protected-resource`（资源服务器文档）命名发行方，然后由本 RFC 的 `oauth-authorization-server` 说明每个端点。客户端永远不要硬编码授权 URL。

对于带路径的资源标识符，要把 well-known 片段插入该路径之前。例如 `https://mcp.example.com/team/server` 的受保护资源元数据地址是 `https://mcp.example.com/.well-known/oauth-protected-resource/team/server`；把 `/.well-known/...` 追加在资源路径之后是错误的。

信任 IdP 前要校验这些契约：

- `code_challenge_methods_supported` 包含 S256（RFC 7636 PKCE）。规范很明确：如果字段**缺失**，授权服务器就不支持 PKCE，客户端**必须**拒绝继续；
- `grant_types_supported` 包含 `authorization_code`，并拒绝 `password` 和 `implicit`；
- 至少存在一条注册路径：`client_id_metadata_document_supported: true`（优先的 CIMD）、预注册客户端，或 `registration_endpoint`（已弃用的 RFC 7591 兼容路径）；
- 若 `authorization_response_iss_parameter_supported` 为 true，客户端要求返回 RFC 9207 `iss`，并与重定向前记录的发行方精确比较；
- OAuth 2.1 中 `response_types_supported` 精确为 `["code"]`。

如果没有 S256，MCP 服务器应拒绝部署到该 IdP，没有 PKCE 降级模式。如果没有公布任何注册路径且没有预注册 `client_id`，也无法注册；这表示部署清单错误，而不是代码需要猜测。

### RFC 9728（回顾）——受保护资源元数据

第 16 课介绍过 RFC 9728。生产差异在于：这是客户端寻找“该 MCP 服务器信任哪些授权服务器”的唯一位置。一个 MCP 服务器可以接受多个 IdP（例如员工一个、合作伙伴一个），RFC 9728 声明这组服务器，RFC 8414 描述每个 IdP 的能力。

```json
{
  "resource": "https://notes.example.com",
  "authorization_servers": ["https://auth.example.com", "https://partners.example.com"],
  "scopes_supported": ["mcp:tools.invoke"],
  "bearer_methods_supported": ["header"],
  "resource_documentation": "https://notes.example.com/docs"
}
```

### Client ID Metadata Document（推荐默认值）

CIMD 把注册从“推送”反转为“拉取”。客户端不再请求授权服务器生成 `client_id`，而是使用自己控制的 HTTPS URL **作为** `client_id`。该 URL 解析到 JSON 元数据文档，授权服务器在 OAuth 流程中按需获取它。信任根在 DNS：如果服务器运营者信任 `app.example.com`，就信任来自 `https://app.example.com/client.json` 的客户端。不需要注册往返，不会耗尽 `client_id` 命名空间，也没有每台服务器要同步的注册状态。

客户端托管的元数据文档：

```json
{
  "client_id": "https://app.example.com/oauth/client.json",
  "client_name": "Example MCP Client",
  "client_uri": "https://app.example.com",
  "application_type": "native",
  "redirect_uris": ["http://127.0.0.1:7333/callback", "http://localhost:7333/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

文档中的 `client_id` **必须**等于它实际提供服务的 URL；授权服务器会验证这一点，不一致就拒绝。授权服务器通过 RFC 8414 元数据中的 `client_id_metadata_document_supported: true` 公布支持。

当前 CIMD 契约要求 `client_id`、`client_name` 和非空 `redirect_uris` 数组。客户端标识符必须是带路径的绝对 HTTPS URL。`application_type` 可以出现，但不是 CIMD 必填字段；不要把 DCR 对它的要求复制到 CIMD 路径。

规范明确指出两个安全事实：

- **SSRF：** 授权服务器获取攻击者提供的 URL，必须防止服务器端请求伪造（不能获取内部或管理端点）；
- **localhost 冒充：** CIMD 本身不能阻止本地攻击者冒用合法客户端的元数据 URL 并绑定任意 `localhost` 重定向。授权服务器**必须**在同意界面清楚展示重定向 URI 主机名，并且**应当**警告仅使用 localhost 的重定向。

CIMD 不需要像 DCR 那样搭建注册器，因为它不依赖服务器端状态。客户端一侧是只读的：从静态 HTTPS 端点提供元数据文档，授权服务器负责拉取。

如果授权服务器运营者已经提供客户端标识符，先使用该发行方下的预注册信息；否则优先 CIMD。只有发行方既不支持预注册也不支持 CIMD 时，才使用已弃用的 DCR。

### RFC 7591：已弃用的兼容注册

2026-07-28 版已弃用 DCR。只有在授权服务器无法消费 CIMD、且预注册不现实的情况下才保留它。兼容客户端发送：

```json
POST /register
Content-Type: application/json

{
  "application_type": "native",
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

服务器返回 `client_id` 和用于之后更新的 `registration_access_token`：

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

`application_type` 不是装饰字段。环回桌面客户端声明 `native`；服务器托管客户端声明 `web` 并使用 HTTPS 重定向。`token_endpoint_auth_method: none` 是公共 native 客户端的正确默认值：它只获得 `client_id`，用 PKCE 提供持有证明。

三个生产陷阱：

- 注册端点必须按源 IP 限流，否则攻击者可以脚本化创建数百万假注册，耗尽 `client_id` 命名空间。注册器处理请求前先做限流检查；
- 一些企业 IdP 要求 `software_statement`（为客户端背书的签名 JWT）。本课 mock 跳过它；生产接入验证步骤，拒绝除 localhost 重定向外的未签名注册；
- `registration_access_token` 必须以哈希保存，不能明文保存。它被窃取后，攻击者可以重写客户端重定向 URI。

### RFC 8707（回顾）——资源指示器

第 16 课已经建立了形状。生产规则是：每个令牌请求都带 `resource=<canonical-mcp-url>`，MCP 服务器在每次调用上验证 `token.aud` 匹配自己的资源 URL。规范 URI 是服务器最具体的标识符：scheme 和 host 使用小写，不含 fragment，通常没有尾部斜杠。路径组件**不按规则删除**，需要用它区分单个 MCP 服务器时应保留。`https://mcp.example.com`、`https://mcp.example.com/mcp`、`https://mcp.example.com:8443` 和 `https://mcp.example.com/server/mcp` 都可以是合法规范 URI。每台服务器选择一个并把 `aud` 精确 pin 到它。（本课 mock 为简洁使用 `https://notes.example.com` 这样的裸 host audience；同一 origin 托管多个 MCP 服务器时，应通过路径区分。）

### RFC 7636（回顾）——PKCE

PKCE 是 OAuth 2.1 的必需项。本课授权码流程总是携带 `code_challenge` 和 `code_verifier`。服务器拒绝缺少 verifier，或 verifier 哈希后不匹配已存 challenge 的令牌请求。

### MCP 2026-07-28 授权 profile <!-- learning-atlas: mcp-2026-07-28-authorization-profile -->

当前 MCP 版本保留 OAuth 资源服务器边界，同时让 MCP 传输无状态。没有可用于缓存身份决定的协议会话，因此授权层独立校验每个请求：

- 实现 RFC 9728 受保护资源元数据，并通过 401 的 `WWW-Authenticate: Bearer resource_metadata="..."` header **或** well-known URI `/.well-known/oauth-protected-resource` 提供其位置（SEP-985 让 header 变为可选，并增加 well-known 回退）。元数据的 `authorization_servers` 字段**必须**至少列出一个服务器；
- 每个请求只接受 `Authorization: Bearer ...` 中的令牌，绝不接受 query string，也不能只在会话开始时校验；
- 每个请求校验 `aud`、`iss`、`exp` 和必需作用域。服务器**必须**验证令牌确实发给自己；缺失或不匹配的 `aud` 都拒绝，绝不能当作通配符；
- 401/403 返回带 `error=...`、`resource_metadata="<PRM-URL>"` 的 `WWW-Authenticate: Bearer`；403 的 `insufficient_scope` 还带 `scope="..."`。注意参数名是 `resource_metadata`，它指向元数据文档，而不是裸资源，挑战中没有 `resource` 参数；
- 授权服务器发现既接受 RFC 8414 OAuth 元数据，也接受 OpenID Connect Discovery 1.0；客户端按优先级尝试两种 well-known 后缀；
- 由客户端而不是服务器防御 mix-up 攻击：重定向前记录预期 `issuer`，在兑换 code 前校验实际授权响应中的 `iss`（RFC 9207）。仅 PKCE 不能阻止 mix-up，因为客户端会把 `code_verifier` 交给被引导到的 token 端点；
- 客户端凭据属于一个授权服务器发行方。如果 discovery 解析出不同发行方，客户端重新注册，而不是提交旧的 `client_id`、注册令牌或访问令牌；
- CIMD 是优先注册机制，DCR 已弃用；兼容 DCR 请求仍要声明正确的 `application_type`。

OAuth 2.1 draft 是底层基础，RFC 8414/7591/8707/9728/9207、RFC 7636 和 CIMD 是表面，MCP 规范是 profile。

### 部署能力清单

厂商功能表很快会过时。应检查实际部署的授权服务器返回的元数据。门禁是机械的：

| 检查 | 必需决定 |
|---|---|
| 发现的发行方 | 策略期望的精确 HTTPS 发行方 |
| PKCE | 公布 S256；否则停止 |
| 注册 | 优先 CIMD，接受预注册，DCR 只作为已弃用兼容 |
| 授权响应 | 出现或公布 RFC 9207 `iss` 时校验 |
| 资源绑定 | 令牌请求携带 `resource`，资源服务器要求匹配的 `aud` |
| 凭据存储 | client ID 和注册凭据按发行方建立键；访问令牌按发行方加资源建立键 |
| DCR 兼容性 | 声明 `native` 或 `web`；拒绝不符合应用类型的重定向 URI |

不要从产品名或价格档位推断支持。把发现的文档纳入部署证据；强制字段缺失时 fail closed。

### JWKS 模式（授权服务器轮换，资源服务器刷新）

把两个动词分开，因为混淆它们是实际生产 bug：

- **Rotate（轮换）**是*授权服务器*做的：生成新的签名密钥，将其发布到 JWKS，稍后再退役旧密钥。资源服务器不参与，也不能做这件事，因为它没有 IdP 的私钥；
- **Refresh（刷新）**是*资源服务器*做的：重新 GET 已发布的 JWKS 并写入缓存。资源服务器只执行这一种 JWKS 动作。

生产故障模式是缓存过期。用计划刷新任务加键值缓存解决：资源服务器按固定间隔获取 `<issuer>/.well-known/jwks.json`，覆盖 `cache[issuer] = {keys, fetched_at}`。校验器从缓存读取。缓存缺少 token 的 `kid` 时，同步刷新一次再检查。这同时处理计划刷新，以及新 key 签发的令牌在下一次计划刷新之前到达的重叠窗口。

兜底路径**必须重新获取，绝不能轮换**。如果缓存 miss 路径连接到 rotate-and-mint，会出现两种问题：（1）新生成的 key 的 `kid` 仍与令牌不匹配，查找照样失败；（2）攻击者发送随机 `kid` 的令牌时，会触发无限创建密钥，造成自我 DoS。重新获取是幂等的，伪造 `kid` 最多只浪费一次获取。

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

同时存在两把 key 是稳定状态。授权服务器先引入下一把 key（`k_2026_04`），再退役上一把（`k_2026_03`），所以旧 key 签发的令牌在过期前仍有效。缓存保存两者的并集，校验器按 `kid` 选择。

### 校验例程

MCP 服务器在分发工具前执行校验。本课 `code/main.py` 使用的形状是：

```python
result = server.validate(bearer_token, required_scope="mcp:tools.invoke")
if not result["valid"]:
    return {"status": result["status"], "WWW-Authenticate": result["www_authenticate"]}
```

`validate` 解码 JWT，从 JWKS 缓存解析签名 key（miss 时刷新一次），验证签名，然后检查发行方 allow-list、受众、`exp` 和必需作用域，并在第一次失败时返回 `WWW-Authenticate` challenge。把它作为资源服务器上的单一例程，可以让每个入口（每次工具调用、每种传输）走同一套检查；没有路径能跳过校验直接到工具处理器。

### 不透明令牌使用 introspection，而非猜测

并非每个访问令牌都是 JWT。如果发行方文档说明令牌是不透明的，资源服务器就不能把它解码成可信声明。它通过经过认证的后端通道把令牌发给发行方的 RFC 7662 introspection 端点，并要求 `active: true`、正确的发行方上下文、精确 MCP 受众或资源、未过期时间声明，以及具体工具需要的作用域。

按发行方、单向令牌摘要和 MCP 资源缓存 introspection。绝不把明文令牌当作日志或缓存标签。正缓存的期限取令牌过期、发行方缓存指导和部署撤销新鲜度目标三者中最早者。负缓存要足够短，避免新发令牌长期被错误认为 inactive。一个资源的结果不能授权另一个资源，即便不透明令牌字符串相同。

不要从攻击者控制的令牌内容决定校验模式。JWT 还是 introspection，应固定在经过验证的发行方元数据和部署配置上。JWT 路径 pin 住接受的算法和可信 `jwks_uri`，绝不跟随仅由令牌 header 指定的 key URL 或算法。

### 撤销是新鲜度契约

RFC 7009 允许客户端请求授权服务器撤销令牌，但这不会删除每个资源服务器已经缓存的副本。定义可接受的最大撤销延迟，让每个缓存都遵守它。

不透明令牌部署可以在每次高风险调用时 introspect，或使用很短的正缓存，以获得更紧的撤销效果。自包含 JWT 部署通常组合短生命周期访问令牌、refresh token 撤销、事故时退役发行方 key，以及可选的主体、会话或 token-id denylist 来紧急拒绝。签名 JWT 在过期前保持密码学有效，除非资源服务器拥有当前的外部撤销证据。

退出登录、禁用账号、撤回同意和事故响应是不同触发器，但必须汇聚为一条可测量的承诺：最多经过声明的撤销窗口后，每个副本都拒绝该凭据。要通过负载均衡器测试它，而不只是测试一个温热进程。

### 依赖失败需要声明决策

不要在异常处理器里临时发明可用性策略。

| 失败 | 安全的生产行为 |
|---|---|
| 计划 JWKS 刷新失败，但已知 `kid` 仍在有界且未过期的缓存中 | 只在声明的 stale-on-error 窗口内继续，并发出降级健康证据 |
| token 有未知 `kid`，且唯一一次刷新失败 | 拒绝；绝不接受无法验证的签名 |
| introspection 不可用 | 对受保护调用 fail closed；不能把网络失败变成 `active: true` |
| 受保护资源或发行方元数据意外变化 | 停止新的注册和令牌获取；只在有界事故策略下保留显式 pin 且未过期的配置 |
| 撤销端点不可用 | 报告退出或撤销未完成；可行时在本地把凭据标记为不可用；不要声称全局撤销成功 |
| 时钟源或声明类型无效 | 拒绝，不要不断放宽时间偏差直到令牌通过 |

把依赖中断和无效凭据分开分类。依赖中断是带健康检查和重试策略的运维错误；坏签名、错误发行方、错误受众、过期或作用域不足是授权拒绝。两者都不能到达工具处理器，也不应把令牌内容写入审计证据。

### 受众重放演练（访问令牌权限限制）

服务器 A（`notes.example.com`）和服务器 B（`tasks.example.com`）都向同一授权服务器注册。服务器 A 被攻破，攻击者拿到用户的 notes 令牌并重放到服务器 B。

服务器 B 的校验器：

1. 解码 JWT，按 `kid` 获取 JWKS，验证签名；
2. 按受保护资源元数据中的 `authorization_servers` 检查 `iss`（通过——是同一个 IdP）；
3. 检查 `aud == "https://tasks.example.com"`（失败——令牌的 `aud` 是 `https://notes.example.com`）；
4. 返回 401，并带 `WWW-Authenticate: Bearer error="invalid_token", error_description="audience mismatch", resource_metadata="https://tasks.example.com/.well-known/oauth-protected-resource"`。

受众声明是协议层抵御此攻击的唯一防线。为了性能跳过它是最常见的生产错误；校验器必须在每个请求上运行，而不只在会话开始时运行。规范把它称为**访问令牌权限限制**：MCP 服务器**必须**拒绝任何没有在受众中指向自己的令牌。

> **命名说明。** 规范把 *confused deputy* 保留给相关但不同的问题：MCP 服务器作为 OAuth **代理**使用静态 client ID 调用第三方 API，却在没有取得每客户端用户同意的情况下转发令牌。受众绑定解决上面的重放问题；困惑代理问题需要每客户端同意，且不能把入站令牌传给上游 API（MCP 服务器**必须**取得自己的独立上游令牌）。

### Mix-up 攻击（服务器无法提供的客户端防御）

客户端在生命周期内会与多个授权服务器通信。恶意 AS 可能诱导客户端把诚实 AS 的授权 code 交给攻击者的 token 端点。受众绑定对此无能为力，因为攻击发生在令牌出现之前。防御在客户端（RFC 9207）：

1. 重定向前，客户端记录经过校验的 AS 元数据中的预期 `issuer`；
2. 收到授权响应时，在向任何地方发送 code 前，把返回的 `iss` 与记录的发行方比较（简单字符串比较，不规范化）；
3. 不匹配（或 AS 公布 `authorization_response_iss_parameter_supported` 但缺少 `iss`）就拒绝，甚至不要展示 `error` 字段。

仅 PKCE 不能阻止 mix-up，因为客户端会把 `code_verifier` 交给被引导到的 token 端点。这就是为什么规范把发行方和 PKCE verifier、`state` 一起按请求记录。

### 失败模式

- **JWKS 过期。** AS 轮换 key 后校验器拒绝有效令牌。修复方式是定时刷新加缓存 miss 重新获取；绝不要没有刷新任务地缓存 JWKS。
- **轮换作为兜底。** 把缓存 miss 路径连接到 rotate-and-mint 而非重新获取，是实际 bug：它不会产生缺失的 `kid`，还会把攻击者控制的 `kid` 变成密钥创建 DoS。兜底必须是幂等的 `refresh-jwks`。
- **缺失 `aud` 声明。** 一些 IdP 只有在令牌请求带 `resource` 时才加入 `aud`。校验器必须拒绝没有 `aud` 的令牌，而不是把缺失当作通配符。
- **缺少 `iss` 校验造成 mix-up。** 客户端如果不把 RFC 9207 授权响应参数 `iss` 与重定向前记录的发行方比较，就可能被引导到攻击者 token 端点兑换诚实 AS 的 code；资源服务器无法补救这个客户端故障。
- **作用域升级竞态。** 同一用户的两个并发升级流程可能都成功，生成不同作用域的访问令牌。校验器必须使用请求上提交的令牌，不能查“用户当前作用域”，否则会形成 TOCTOU 窗口。
- **注册令牌被盗。** 泄露的 `registration_access_token` 允许攻击者重写重定向 URI。静态存储时做哈希；每次更新要求客户端提交明文，并在怀疑泄露时轮换。
- **未 pin `iss`。** 接受任意 `iss` 的校验器允许攻击者搭建自己的授权服务器，为目标受众注册客户端并签发令牌。受保护资源元数据的 `authorization_servers` 列表就是 allow-list，必须执行。
- **凭据或令牌缓存碰撞。** 只按资源建立注册键的客户端可能把一个授权服务器的身份提交给另一个；只按发行方建立访问令牌键的客户端可能把令牌重放到错误受众。注册按经过验证的发行方建立键，访问令牌按 `(issuer, resource)` 建立键，发行方变化时重新注册。

```figure
t3-jwks-rotate
```

## 使用

`code/main.py` 用标准库 Python 和三个角色（`AuthorizationServer`、`ResourceServer`、`Client`）演示完整生产流程：

从仓库根目录运行：

```bash
cd phases/13-tools-and-protocols/18-mcp-auth-production
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

第一条命令打印按发行方绑定的注册和令牌校验 transcript，第二条报告十八项检查通过。两条命令都不会打开网络监听器，也不会写入凭据。

1. 授权服务器在 `/.well-known/oauth-authorization-server` 发布 RFC 8414 元数据；
2. MCP 客户端调用元数据端点，检查注册选项（CIMD 的 `client_id_metadata_document_supported`、DCR 的 `registration_endpoint`）和 S256 PKCE 支持；
3. 客户端检查发行方范围内的预注册，否则用 HTTPS Client ID Metadata Document 注册；已弃用 DCR 仍是可单独测试的兼容方法；
4. 客户端记录经过校验的发行方，创建 S256 challenge，收到一次性授权 code 和 `iss`，验证返回发行方，再使用原始 verifier 和 RFC 8707 `resource` 指示器兑换 code；
5. MCP 客户端带 `Authorization: Bearer ...` 调用 MCP 服务器工具；
6. MCP 服务器运行 `validate`，从 JWKS 缓存解析签名 key；
7. IdP 轮换 key，计划刷新把已发布集合重新拉入缓存；
8. 下一次调用在无需重启的情况下按刷新后的 key 校验，旧令牌在重叠窗口内仍可通过；
9. 对另一个 MCP 资源的受众重放尝试返回带 `audience mismatch` 和 `resource_metadata` 指针的 401。

本课 JWT 使用共享秘密的 HS256，确保只用标准库即可运行。生产使用带 JWKS 模式的 RS256 或 EdDSA，其他校验逻辑相同。因为 IdP 和资源服务器在同一进程中，`refresh_jwks` 直接读取授权服务器的 key 列表；实际网络中它应当是对 `jwks_uri` 的 HTTP `GET`。

## 交付

本课交付 `outputs/skill-mcp-auth.md`。给定 MCP 服务器配置和 IdP 能力集合，该 skill 生成需要搭建的授权面：受保护资源元数据、注册路径（CIMD、预注册或 DCR 回退）、JWKS 刷新计划、作用域映射，以及 IdP 不支持完整 RFC profile 时的拒绝规则。

## 练习

1. 运行 `code/main.py` 并追踪流程。注意第 6 步 IdP 轮换 key，计划 `refresh_jwks` 重新拉取已发布集合，旧令牌（重叠窗口）和新令牌都无需重启即可校验。
2. 把新的 IdP 加入受保护资源元数据的 `authorization_servers`，用新 IdP 签发令牌并确认校验器接受；再用未列出的 IdP 签发令牌，确认校验器以 `WWW-Authenticate: Bearer error="invalid_token", error_description="iss not allowed"` 拒绝。
3. 给 `register_client` 增加限流检查，在注册器接受请求前运行。用按 IP 存在小字典里的 token bucket。
4. 阅读 RFC 7591，找出本课 `/register` 处理器没有校验的两个字段并补上校验。（提示：`software_statement` 和 `redirect_uris` URI scheme。）
5. 增加第二个授权服务器，确认客户端分别存储发行方注册信息，拒绝复用第一发行方的令牌或 `client_id`。
6. 证明 DoS 修复：给校验器发送随机 `kid` 的令牌，确认 `refresh_jwks` 最多运行一次，授权服务器密钥数量不增长；再故意把兜底改回 rotate-and-mint，观察每个伪造令牌都会增加 key 数量，之后恢复重新获取。
7. 用 `native` 和 `web` 客户端都练习已弃用的 DCR，确认带 HTTP 重定向 URI 的 web 客户端，以及没有精确环回重定向的 native 客户端都会被拒绝。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| ASM | “OAuth 元数据文档” | RFC 8414 `/.well-known/oauth-authorization-server` JSON |
| CIMD | “客户端元数据 URL” | Client ID Metadata Document：作为 `client_id` 的 HTTPS URL，由 AS 拉取 JSON；MCP 2026-07-28 推荐的注册方式 |
| DCR | “自助客户端注册” | RFC 7591 `POST /register`，当前 MCP 已弃用，只保留兼容性 |
| JWKS | “JWT 校验公钥” | 从 `jwks_uri` 获取、按 `kid` 索引的 JSON Web Key Set |
| 轮换与刷新 | “更新 key” | *轮换* = AS 生成/退役签名 key；*刷新* = 资源服务器重新获取已发布集合。资源服务器只做刷新 |
| 资源指示器 | “受众参数” | RFC 8707 `resource` 参数，把令牌 pin 到一台服务器 |
| `aud` 声明 | “受众” | 校验器与规范资源 URL 比较的 JWT 声明 |
| 受众重放 | “令牌重放” | 给服务器 A 的令牌提交到服务器 B；由受众校验防御（规范称访问令牌权限限制） |
| 困惑代理 | “代理令牌滥用” | MCP 代理用静态 client ID 在没有逐客户端同意时转发令牌；不同于受众重放 |
| Mix-up 攻击 | “错误 token 端点” | 客户端被引导把诚实 AS 的 code 交给攻击者端点；客户端用 RFC 9207 `iss` 防御 |
| `iss` allow-list | “可信授权服务器” | 受保护资源元数据中的 `authorization_servers` 集合 |
| `resource_metadata` | “PRM 文档地址” | 401/403 的 `WWW-Authenticate` 参数，指向 RFC 9728 元数据 URL |
| 公共客户端 | “Native 或浏览器客户端” | 没有 `client_secret` 的 OAuth 客户端，由 PKCE 提供补偿保护 |
| `WWW-Authenticate` | “401/403 响应 header” | 携带 `Bearer error=...` 指令，驱动客户端恢复 |

## 延伸阅读

- [MCP 授权规范（2026-07-28）](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)——当前 MCP 授权 profile
- [MCP 2026-07-28 变更日志](https://modelcontextprotocol.io/specification/2026-07-28/changelog)——CIMD、发行方校验、DCR 弃用和按发行方建立凭据键的变化
- [OAuth Client ID Metadata Document（draft-ietf-oauth-client-id-metadata-document-00）](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-client-id-metadata-document-00)——CIMD
- [RFC 8414——OAuth 2.0 授权服务器元数据](https://datatracker.ietf.org/doc/html/rfc8414)——发现契约
- [RFC 7591——OAuth 2.0 动态客户端注册协议](https://datatracker.ietf.org/doc/html/rfc7591)——DCR（回退路径）
- [RFC 7636——Proof Key for Code Exchange（PKCE）](https://datatracker.ietf.org/doc/html/rfc7636)——公共客户端持有证明
- [RFC 8707——OAuth 2.0 资源指示器](https://datatracker.ietf.org/doc/html/rfc8707)——受众绑定
- [RFC 9728——OAuth 2.0 受保护资源元数据](https://datatracker.ietf.org/doc/html/rfc9728)——资源服务器发现
- [RFC 9207——OAuth 2.0 授权服务器发行方标识](https://datatracker.ietf.org/doc/html/rfc9207)——防御 mix-up 的 `iss` 参数
- [RFC 7662：OAuth 2.0 令牌 introspection](https://datatracker.ietf.org/doc/html/rfc7662)
- [RFC 7009：OAuth 2.0 令牌撤销](https://datatracker.ietf.org/doc/html/rfc7009)
