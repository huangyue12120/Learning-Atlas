---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/17-mcp-gateways-and-registries/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 6c72285350d087babd97ec9907f94137be217337999ed1b4e44f299b4e3b1692
status: reviewed
---

# 无状态 MCP 网关与注册表准入

> 网关应该让每条路由都显式可见。2026-07-28 协议为它提供方法、名称、版本、能力、身份、缓存和追踪边界，而不需要传输会话。

**类型：** 学习
**语言：** Python
**前置课程：** Phase 13 · 第 15 课（安全）、Phase 13 · 第 16 课（授权）
**预计时间：** 约 75 分钟

## 学习目标

- 在没有会话亲和性的情况下，把多个 MCP 服务器聚合到一个 2026-07-28 端点后面。
- 在策略或转发前校验逐请求元数据和路由 header。
- 用稳定命名空间、确定性排序、描述 pin、RBAC 和私有缓存合并工具。
- 把注册表记录当作仍需准入策略的发现证据。
- 正确路由请求级 SSE、`subscriptions/listen`、MRTR 重试和 Tasks 扩展调用。
- 将旧版握手与会话支持隔离在现代路径之外。

## 问题所在

一个客户端直接连接一个服务器很简单。更大的部署需要对以下难题给出一致答案：

- 哪些服务器允许进入？
- 哪个主体可以看见并调用每个工具？
- 两个后端暴露同名工具时怎么办？
- 如何审核描述变化？
- 在哪里应用限流和审计事件？
- 下一次请求可以由任意实例处理吗？

网关位于客户端和后端 MCP 服务器之间，提供一个 MCP 端点，应用跨系统策略，并转发获准请求。

旧网关常把一个客户端会话复用到多个后端会话，并重写 `Mcp-Session-Id`。那是旧版兼容设计；2026-07-28 核心协议没有协议会话。

## 核心概念

### 现代网关路径 <!-- learning-atlas: the-modern-gateway-path -->

对每个请求：

1. 从传输授权中认证主体；
2. 校验 `MCP-Protocol-Version`、`Mcp-Method`、`Mcp-Name` 和 `params._meta`；
3. 授权主体、资源、方法、工具和参数；
4. 应用描述、注册表、限流和数据策略；
5. 为选定后端创建新的自包含请求；
6. 校验后端结果并返回网关结果；
7. 记录审计事件，但不记录秘密。

其中没有一步需要隐藏的协议会话。应用状态仍可以存在于数据库、显式句柄、Tasks 或完整性保护的 MRTR 状态中。

### 运行时策略是网关的主要决定

准入决定哪个后端版本可以进入网关，但不授权实时调用。对每个请求，网关都根据认证主体、发行方和资源、租户、匹配的方法和名称、规范化参数、已准入描述 pin、当前后端健康状态、能力交集、数据分类、限流状态和动作绑定审批重新计算策略。

这份顺序很重要。注册表记录可能仍为 active，但用户角色已经撤销；描述可以仍然 pin 住，但目的地参数可能跨越租户边界；后端可以仍然获准，但事故策略可能隔离状态变更调用。因此运行时策略才是主要的允许或拒绝决定，注册表和描述证据只是输入。

不要把允许决定缓存到连接或已移除的会话 ID 下。策略不可用时，按操作类别采用预先声明的失败策略。安全默认值是对状态变更和敏感读取 fail closed；经过明确批准的公开读取路径，只有在风险模型允许时才能使用短时的 last-known 策略。记录作出决定的策略版本和失败路径，并在返回前校验后端结果。

### 一个 POST 端点

现代 Streamable HTTP 通过 POST 发送每条 JSON-RPC 消息：

```text
POST /mcp
Authorization: Bearer <gateway-token>
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: notes.search
Accept: application/json, text/event-stream
```

网关可以为该 POST 返回 JSON 或请求级 SSE。现代请求中 GET 和 DELETE 返回 405；`Mcp-Session-Id` 和 `Last-Event-ID` 不创建权限、亲和性或重放行为。

header 与请求体的值必须一致。在查找后端前先以 `-32020` 拒绝不一致。这样负载均衡器、网关和限流器无需解析完整请求体也能路由，同时保持端到端完整性。

按一个精确顺序校验：JSON-RPC 和元数据类型，header 与请求体一致性，最后检查匹配版本是否受支持。不一致返回 HTTP 400 和 `-32020`；若双方一致但版本不支持，返回 HTTP 400 和 `-32022`，`data` 精确为 `{"supported":["2026-07-28"],"requested":"<actual>"}`。未知方法返回 HTTP 404 和 `-32601`。

`ProtocolError` 携带可选 `data`，网关把它序列化进 JSON-RPC 错误对象。通知没有 `id`，因此不接收 JSON-RPC 成功或错误响应。接受的 HTTP 通知返回 202 和空响应体。

### 在每一层实现 discovery

网关为客户端实现 `server/discover`，也发现每个后端，以获知版本、能力和扩展。

网关结果示例：

```json
{
  "resultType": "complete",
  "supportedVersions": ["2026-07-28"],
  "capabilities": {
    "tools": {"listChanged": true}
  },
  "ttlMs": 30000,
  "cacheScope": "private",
  "_meta": {
    "io.modelcontextprotocol/serverInfo": {
      "name": "enterprise-gateway",
      "version": "2.0.0"
    }
  }
}
```

只公布网关能够端到端履行的能力交集。后端功能不自动等于安全可暴露；网关功能如果没有后端路径，也没有公布意义。

`serverInfo` 是服务器自报的展示和诊断数据。不要把它当作注册表或发布者证明。

### 逐请求客户端能力

每个转发请求都需要当前的 `_meta` 信封：

```json
{
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientCapabilities": {},
  "io.modelcontextprotocol/clientInfo": {
    "name": "enterprise-gateway",
    "version": "1.0.0"
  }
}
```

不要把外层客户端能力原样复制给后端。对于后端来说，网关才是客户端；只公布网关会正确代办的功能。

### 确定性命名空间

在稳定的公开名称下合并后端工具：

```text
notes.search
notes.create
issues.list
issues.open
```

维护公开名称到后端及原始工具名的映射。绝不能用第一个或最后一个碰撞项。公开名称是审批和审计契约的一部分，改变它就是一次迁移。

`tools/list` 必须是确定性的。当不同主体的可见性不同，使用 `cacheScope: private`。有界 `ttlMs` 可以减少后端发现负载，同时避免用户专属列表跨授权上下文泄露。

每个暴露的工具描述都包含稳定名称、描述和对象根 `inputSchema`。命名空间不能移除必需描述字段。完整列表结果还包含 `resultType`、服务器身份元数据和缓存提示。

### Pin 已批准描述

准入时规范化完整描述，并把摘要存到限定的公开名称下。在列表和调用时，将实时描述与已批准摘要比较。

如果发生变化：

- 从 `tools/list` 移除；
- 拒绝直接调用；
- 发出审计事件；
- 更新 pin 前要求策略或人工重新批准。

网关是有用的集中执行点，但不会把首次看到的描述变安全。仍然需要初始审核。

### 注册表帮助发现，不负责决策

注册表 `server.json` 提供发布元数据。一个包支持的记录可能是：

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "com.example/notes",
  "description": "Example notes MCP server.",
  "version": "1.0.0",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "@example/notes-mcp",
      "version": "1.0.0",
      "transport": {"type": "stdio"}
    }
  ]
}
```

发布元数据不携带网关的安全决定。将已验证发布者和来源证据放到独立的准入状态中：

```json
{
  "registryName": "com.example/notes",
  "registryVersion": "1.0.0",
  "publisher": {"namespace": "com.example", "status": "verified"},
  "provenance": {
    "source": "registry.modelcontextprotocol.io",
    "recordId": "com.example/notes@1.0.0"
  },
  "admission": {"status": "approved", "reviewedBy": "gateway-policy"}
}
```

网关校验 `server.json` 形状，并将它与外部状态关联；但网关仍然需要准入策略。

对每个已准入后端记录：

- 精确注册表和记录标识符；
- 已验证的发布者命名空间或域名证据；
- 允许的传输和端点；
- pin 的版本或批准的升级策略；
- 产物或描述摘要；
- 授权发行方和资源；
- 审核者、批准时间和过期时间。

不要因为服务器展示名称像熟悉产品就接受它，也不要把出现在注册表中当作运营安全审查。即使私有服务器从未出现在公共注册表，也可以用相同证据 schema 准入。

本课实现网关接缝：在后端变得可路由前，把发布证据接入本地准入。[第 30 课：MCP 注册表供应链、准入、漂移与回滚](../../30-mcp-registry-supply-chain-and-drift/docs/en.md)会构建完整控制平面，包括精确命名空间证明、产物来源、不可变 pin、实时描述漂移、注册表状态对账、抗篡改准入台账和有证据的回滚。供应链状态应与上面的逐请求运行时决策分开。

### 凭据代办

网关认证调用者，并单独向后端认证。后端凭据不能发送给客户端。

显式保持这些绑定：

```text
outer principal -> gateway role and policy
backend issuer + resource -> backend registration and token
```

绝不要把外层网关令牌传给后端，也不要在不同发行方或资源间复用后端令牌。如果工具代表终端用户行动，应通过设计好的交换或 claims 模型保存这种委托，而不是用共享服务凭据冒充用户。

### 没有会话的限流

按认证主体、发行方、资源、公开工具、成本类别和时间窗口建立限流键。会话 ID 不存在，即使存在也很容易轮换。

在消耗昂贵工作前先执行廉价校验。明确被拒调用是否计入滥用限制、业务配额，或两者都计入。

### 审计决定链

记录足够重建调用的信息：

- 请求和 trace 标识符；
- 认证主体和发行方；
- 公开工具和后端路由；
- 描述 pin 版本；
- 策略决定和原因；
- 延迟和结果类别；
- 适用时的 MRTR 轮次或任务标识符。

遮蔽 bearer token、授权 code、refresh token、原始秘密和不必要的敏感参数。

### 请求级 SSE

普通 POST 在一次请求内流式工作时可以返回请求级 SSE。关闭响应流会取消进行中的现代 HTTP 请求。

不要创建独立 GET 流，也不要承诺 Last-Event-ID 重放；那是旧传输假设。

### 长生命周期变更通知

对于列表和资源变更通知，当前客户端通过 POST 发送 `subscriptions/listen`，获得 SSE 响应。通知过滤器使用精确的扁平字段 `toolsListChanged`、`promptsListChanged`、`resourcesListChanged` 和 `resourceSubscriptions`：

```json
{
  "jsonrpc": "2.0",
  "id": "listen-tools",
  "method": "subscriptions/listen",
  "params": {
    "notifications": {
      "toolsListChanged": true
    },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

第一项事件确认支持的子集。subscription 标识符是打开流的请求 JSON-RPC id：

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/subscriptions/acknowledged",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/subscriptionId": "listen-tools"
    },
    "notifications": {
      "toolsListChanged": true
    }
  }
}
```

网关随后只转发确认过的变更类型。该流的每个通知都在 `params._meta` 中携带相同的 `io.modelcontextprotocol/subscriptionId`。不存在自动重放或自动重新监听；重连时客户端重新打开订阅，并刷新依赖的列表。服务器主动平稳关闭时，返回带同一 subscription ID 的最终 complete 结果。

现代路径取代 `resources/subscribe`、`resources/unsubscribe` 和未经请求的独立 GET 流。这些只应留在按版本选择的旧路径中。

### 经网关传递 MRTR

后端返回 `resultType: input_required` 时，只有外层客户端支持所需输入，网关才能转发。除非网关有意终止并重新发起交互，否则要逐字节保留 `requestState`。

客户端以新的 JSON-RPC id 和 `inputResponses` 重试原始公开工具。网关重新授权重试，检查公开路由相同，然后转发新的后端请求。不能假设前一轮已经授予无限审批。

### Tasks 扩展路由

Tasks 是由 `io.modelcontextprotocol/tasks` 标识的官方扩展，不是核心会话替代品。

客户端在逐请求能力中声明扩展，只有在网关能端到端保持生命周期时，网关才在 discovery 中公布它。对受支持的 `tools/call`，由后端决定返回普通结果还是 `resultType: task`。任务结果直接携带 `taskId`、状态、时间戳、`ttlMs` 和可选的 `pollIntervalMs`，并且任务必须在发送结果前已经可持久读取。

网关为不透明任务标识符记录认证主体和后端路由。后续 `tasks/get`、`tasks/update` 和 `tasks/cancel` 调用以 `params.taskId` 作为 `Mcp-Name`，为中间件提供路由键。`tasks/get` 返回 `resultType: complete` 与当前任务状态，并在终态中嵌入最终结果或协议错误。`tasks/update` 为未完成任务输入发送带键的 `inputResponses`，返回空的 complete 确认。`tasks/cancel` 是协作式意图，返回空的 complete 确认，并不保证工作停止。

不要实现新的 `tasks/list` 或 `tasks/result`；它们属于旧实验模型。需要输入的任务通过 `tasks/get` 暴露完整嵌入请求，客户端通过 `tasks/update` 回答，而不是重试原始工具调用。客户端仍按建议间隔轮询，任务创建仍由服务器决定。

持久任务路由状态是以任务句柄为键的应用数据，不是协议会话。

### 兼容边界

如果网关必须服务旧客户端或后端：

- 显式检测协议时代；
- 把初始化、传输会话、GET 流、资源订阅和旧任务词汇都放进旧版适配器；
- 绝不让旧会话 ID 泄露到现代路由或授权；
- 比起静默降级，优先采用有界 discovery 探测和明确的回退策略。

```figure
t3-gateway-funnel
```

## 动手构建

`code/main.py` 实现进程内协议网关和两个后端服务器。每个后端都会收到新的当前协议请求。网关提供 discovery、按用户过滤的确定性 `tools/list`、命名空间路由、注册表 `server.json` 与外部准入状态、描述 pin、RBAC、按主体限流、审计决策以及建模的 `subscriptions/listen` SSE 确认。

模型接收已解析的请求体、路由 header 和认证 bearer 身份，不是完整 HTTP 适配器，不解析 `Content-Type` 和完整 `Accept` 契约。将它接入第 09 课的 Streamable HTTP 适配器；该适配器要求 `Content-Type: application/json`，且 `Accept` 同时包含 `application/json` 和 `text/event-stream`。

运行：

```bash
cd phases/13-tools-and-protocols/17-mcp-gateways-and-registries
python3 code/main.py
python3 -m unittest discover code/tests -v
```

示例会打印外层请求 ID 和新的后端请求 ID，让无状态跳转清晰可见。

## 使用

把进程内后端对象替换成真实的当前协议客户端，保留这些接缝：

- 连接前先有准入记录；
- 暴露能力前先发现后端；
- 授权前先确定限定公开名称；
- 列表或调用前先检查描述 pin；
- 转发前构造新的逐请求元数据；
- 返回前校验结果。

## 交付

本课交付 `outputs/skill-gateway-bootstrap.md`。它生成涵盖入口、发现、准入、命名空间、授权、缓存、流式传输、订阅、MRTR、Tasks、可观测性和旧版隔离的现代网关设计。

## 练习

1. 给外层和转发请求元数据增加 trace context，并在审计事件中记录关联关系。
2. 增加支持 Tasks 的后端，并在 `Mcp-Name` 中按任务 ID 路由 `tasks/get`。
3. 改变一个后端描述，证明 discovery 和直接调用都会被阻断。
4. 增加主体专属服务器能力，解释为什么 discovery 必须使用私有缓存。
5. 写一个旧版适配器接口，但不要把任何旧状态加入现代 `Gateway` 类。

## 关键术语

| 术语 | 含义 |
|------|------|
| MCP 网关 | 位于客户端和后端 MCP 服务器之间的策略与路由服务器 |
| 准入记录 | 允许一个后端进入网关的证据和策略决定 |
| 限定工具名 | `notes.search` 这样的稳定公开路由 |
| 描述 pin | 在发现和分发期间检查的已批准摘要 |
| 私有缓存范围 | 限制在一个授权上下文内的缓存结果 |
| 请求级 SSE | 附属于一次 POST 请求的流式响应 |
| `subscriptions/listen` | 客户端打开、用于选择性长期变更通知的 SSE 流 |
| 任务路由 | 从不透明任务 ID 到后端的应用映射 |
| 旧版适配器 | 对旧握手和会话行为进行显式版本隔离的边界 |

## 延伸阅读

- [Streamable HTTP 传输](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [服务器发现](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [官方注册表 server.json 要求](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md)
- [MCP Tasks 扩展](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks)
