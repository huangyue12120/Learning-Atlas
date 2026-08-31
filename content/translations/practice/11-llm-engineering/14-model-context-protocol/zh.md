---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/11-llm-engineering/14-model-context-protocol/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 26356da586c4f90922e0ab61af4ea47d81deaf3c9b2cc91e4ae8ac44efaadd7b
status: reviewed
---

# 模型上下文协议（MCP）

> MCP 为 AI 宿主提供一套发现并调用工具、资源和提示词的协议。2026-07-28 版让协议变成无状态：能力和版本上下文随每个请求传递，而不再依附于连接级握手。

**类型：** 构建
**语言：** Python
**前置课程：** Phase 11 · 第 09 课（函数调用）、Phase 11 · 第 03 课（结构化输出）
**预计时间：** 约 75 分钟

## 学习目标

- 区分 MCP 宿主、客户端、服务器、传输和服务器原语。
- 构造包含 MCP 2026-07-28 所需元数据的 JSON-RPC 请求。
- 使用 `server/discover` 检查版本、身份和能力。
- 从工具、资源和提示词返回带类型且带缓存提示的结果。
- 解释现代无状态 MCP 如何与带握手的旧时代服务器互操作。
- 为服务器选择安全的状态、传输和审批边界。

## 问题所在

你的应用需要数据库查询、日历操作和文件读取。如果没有共享协议，每个 AI 宿主都要为这些能力分别实现发现、调用、错误、传输和授权胶水。

MCP 缩小了这张集成矩阵。服务器发布标准 JSON-RPC 面，兼容客户端可以发现这个面，把它呈现给模型或用户，调用它并解释结果，而不需要每个服务器各写一个适配器。

容易忽略的关键边界是：MCP 标准化通信，但不决定模型应该调用哪个工具，不会自动使不受信任内容变安全，也不会把无状态请求变成持久应用状态。这些决策仍由你的宿主和服务器负责。

## 核心概念

![MCP 宿主、无状态请求与服务器原语](../assets/mcp-architecture.svg)

### 三种服务器原语

1. **工具（Tools）**是可调用的动作。每个工具都有名称、描述、JSON Schema 输入和处理器。
2. **资源（Resources）**是客户端可以读取的、有名称且由 URI 寻址的内容。
3. **提示词（Prompts）**是宿主可以呈现给用户的可复用模板。

宿主是 AI 应用。宿主中的 MCP 客户端与一个服务器通信，传输层负责在两者之间承载 JSON-RPC 消息。

### 无状态请求取代握手 <!-- learning-atlas: stateless-requests-replace-the-handshake -->

MCP 2026-07-28 移除了 `initialize` 和 `notifications/initialized`，也移除了协议级会话。每个请求都在 `params._meta` 中携带解释自身所需的上下文：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {
        "name": "lesson-client",
        "version": "1.0.0"
      }
    }
  }
}
```

协议版本和客户端能力是必需字段，客户端身份是推荐字段。缺少 `_meta`、缺少必需字段，或必需字段类型错误，都会被视为格式错误并返回 Invalid Params（`-32602`）。格式正确但服务器不支持的版本返回 `UnsupportedProtocolVersionError`（`-32022`）。服务器可以处理有效请求，不需要恢复上一次协商记录。

无状态不代表应用永远不能维护状态，而是状态不能隐藏在 MCP 连接或 `Mcp-Session-Id` 背后。如果工作流需要连续性，服务器生成一个不透明句柄，客户端在后续调用中把句柄作为普通工具参数传回。每个请求仍必须重新检查授权。

### 发现与版本选择

每个现代服务器都实现 `server/discover`，其结果会公布支持的版本、能力和服务器身份：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "complete",
    "supportedVersions": ["2026-07-28"],
    "capabilities": {
      "tools": {},
      "resources": {},
      "prompts": {}
    },
    "ttlMs": 3600000,
    "cacheScope": "public",
    "_meta": {
      "io.modelcontextprotocol/serverInfo": {
        "name": "demo-server",
        "version": "1.0.0"
      }
    }
  }
}
```

客户端可以直接调用其他方法并处理版本错误，但先发现能明确能力展示和版本选择。不支持的版本返回代码为 `-32022` 的 `UnsupportedProtocolVersionError`，数据中包含服务器支持版本数组 `supported` 和被拒绝的版本 `requested`。

在 stdio 上，双时代客户端先用 `server/discover` 探测。发现结果，或能识别为现代协议的错误（例如 `UnsupportedProtocolVersionError`），都说明对端是现代服务器。任何无法识别为现代协议的错误或超时，才允许回退到 2025-11-25 的 `initialize` 流程。旧版行为是兼容代码，不是现代默认值。

### 结果是显式的

每个核心 2026-07-28 结果都有 `resultType`：

- `complete` 表示操作已经结束。
- `input_required` 表示服务器需要通过 Multi Round-Trip Requests 模式再进行一轮往返。核心服务器只能从 `tools/call`、`resources/read` 或 `prompts/get` 返回它。

客户端必须把没有 `resultType` 的旧版结果当作 complete 处理。

服务器应在每个结果的 `_meta` 中加入 `io.modelcontextprotocol/serverInfo`。这个身份由服务器自报，只用于展示、日志和调试，不用于安全决策。

列表和读取结果还带有 `ttlMs` 与 `cacheScope`。确定性的 `tools/list` 顺序配合新鲜度提示，可以让客户端安全缓存发现结果，并提高 prompt 缓存稳定性。`cacheScope: public` 允许共享缓存，`private` 则把复用限制在调用上下文内。

### 线格式与传输

MCP 在 stdio 或 Streamable HTTP 之上使用 JSON-RPC 2.0。

- 请求包含 `jsonrpc`、`id`、`method` 和 `params`。
- 响应包含匹配的 `id`，以及 `result` 或 `error`。
- 通知没有 `id`，也不期待响应。

现代 Streamable HTTP 暴露一个接收 POST 的端点。每条 JSON-RPC 消息都有自己的 POST。请求 POST 会收到一个 JSON 对象，或一个只属于该请求、并以最终响应结束的 Server-Sent Events 流。接收通知的 POST 返回没有响应体的 HTTP 202；当前核心版本不定义 Streamable HTTP 上客户端到服务器的通知。

2026-07-28 没有独立的 MCP GET 流、DELETE 会话端点、`Mcp-Session-Id` 或 `Last-Event-ID` 重放。长生命周期的变更通知使用 `subscriptions/listen` POST，响应保持为 SSE 流。

### 没有服务器主动请求时的客户端输入

旧版允许服务器在流上发送 `sampling/createMessage`、`roots/list` 或 `elicitation/create` 等请求。当前协议改用 Multi Round-Trip Requests。符合条件的工具调用、资源读取或提示词获取会返回 `resultType: input_required`，并至少包含 `inputRequests` 或 `requestState` 之一。客户端收集所需输入，以新的 JSON-RPC ID 重试原方法，并带上相应的 `inputResponses`；若服务器提供了 `requestState`，客户端必须逐字回显。如果没有 `inputRequests`，重试时不带 `inputResponses`。

Roots、Sampling 和 Logging 仍可用，但已弃用，因此新实现不应采用它们。现有 Roots 或 Sampling 请求必须放在 MRTR 的 `inputRequests` 内，绝不能作为独立的服务器到客户端 JSON-RPC 请求。优先使用显式文件或目录参数、资源 URI、服务器配置和直接的模型提供商集成。stdio 诊断写入 stderr，生产遥测使用 OpenTelemetry。

```figure
mcp-nxm-collapse
```

## 动手构建

### 第 1 步：注册服务器面

尽管请求契约变了，注册仍然简单：

```python
server = MCPServer("demo-server")

@server.tool(
    "add",
    "Add two integers.",
    {
        "type": "object",
        "properties": {
            "a": {"type": "integer"},
            "b": {"type": "integer"}
        },
        "required": ["a", "b"]
    }
)
def add(a: int, b: int) -> dict:
    return {"sum": a + b}
```

随附的 `code/main.py` 还注册了一个资源和一个提示词。它刻意只使用标准库，让你能看见每个信封，而不是把协议交给 SDK 隐藏起来。

### 第 2 步：给每个请求附加元数据

```python
def request(method, params=None):
    body_params = dict(params or {})
    body_params["_meta"] = {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": {},
        "io.modelcontextprotocol/clientInfo": {
            "name": "demo-client",
            "version": "1.0.0"
        }
    }
    return {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": body_params
    }
```

不要只在连接对象中缓存这些元数据。服务器要在每个请求上校验它们。

### 第 3 步：可选地在列举前先发现

调用 `server/discover`，选择支持的版本，再调用 `tools/list`。如果你已经知道版本并能处理 `-32022`，直接调用 `tools/list` 也有效。

示例会按名称顺序返回工具列表，并附加 `ttlMs`、`cacheScope`、`resultType` 和服务器身份。工具调用返回完整、不可缓存的结果，因为结果可能依赖当前状态。

### 第 4 步：把同一请求映射到 HTTP

远程 `tools/call` POST 包含与 JSON-RPC 请求体对应的 header：

```http
POST /mcp HTTP/1.1
Content-Type: application/json
Accept: application/json, text/event-stream
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: add
```

`MCP-Protocol-Version` header 必须与 `_meta` 中的版本一致。每个 JSON-RPC 请求都必须有 `Mcp-Method`，且它必须与 `method` 一致。只有 `tools/call`、`resources/read` 和 `prompts/get` 要求 `Mcp-Name`；它必须分别与工具名、资源 URI 或提示词名一致。缺少必需 header 或发生不一致时，返回 HTTP 400 和 `HeaderMismatch`（`-32020`）。

### 第 5 步：把安全约束放在协议状态之外

- 每个 HTTP 请求都校验授权和受众。
- 本地服务器绑定 localhost，并在 Streamable HTTP 上校验 `Origin`。
- 给会改变状态的工具标记 `destructiveHint: true`，并要求宿主审批。
- 显式传递目录和文件范围，不依赖已弃用的 Roots。
- 将资源和工具输出视为不受信任数据。
- stdio 下让 stdout 专门承载 JSON-RPC，诊断写到 stderr。

## 使用

在课程目录中运行：

```bash
python3 code/main.py
cd code
python3 -m unittest discover tests -v
```

第一行应报告在协议 `2026-07-28` 上发现 `demo-server`。然后检查 `MCPClient.request`：它会为每次调用重新构造 `_meta`。从一个请求中移除元数据，观察服务器拒绝它。

## 交付

`outputs/skill-mcp-server-designer.md` 将一个领域转换为无状态 MCP 设计。它的验收门槛要求发现结果、逐请求元数据策略、确定性且带缓存提示的列表、显式状态句柄、传输 header、授权和审批规则。

## 继续深入 MCP

本课提供协议模型。Phase 13 将四个生产边界拆成独立的构建与验证课程：

1. [MCP 工具契约与内容](../../../13-tools-and-protocols/28-mcp-tool-contracts-and-content/docs/en.md)涵盖封闭输入 schema、结构化内容、路由元数据、不透明分页、完成授权，以及协议错误与工具领域错误的区别。
2. [MCP 可靠性、取消与流控](../../../13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control/docs/en.md)涵盖请求取消、持久任务取消、截止时间、幂等性、背压、代理缓冲和重连行为。
3. [MCP 注册表供应链、准入、漂移与回滚](../../../13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift/docs/en.md)涵盖命名空间证明、产物来源、不可变 pin、实时漂移、注册表状态、准入证据和回滚。
4. [MCP 一致性工程](../../../13-tools-and-protocols/31-mcp-conformance-versioning-and-operations/docs/en.md)涵盖正负线协议 transcript、严格版本时代、SDK 差异、代理证据、脱敏、健康门禁和发布回滚。

当服务器要跨越团队或信任边界时，按顺序学习它们。它们共同把问题从“方法能工作”推进到“部署后契约仍然安全且可诊断”。

## 练习

1. 增加 `subtract` 工具，确认 `tools/list` 仍按字母顺序排列。
2. 删除协议版本键，验证 Invalid Params（`-32602`）。然后发送格式正确但不支持的版本 `2025-11-25`，验证 `-32022`，确认 `requested` 回显该版本，并从 `supported` 中选择版本。
3. 在创建操作中加入服务器生成的 `draftId`，再要求更新操作把它作为参数。解释为什么这是应用状态而不是协议会话。
4. 让某工具在需要用户确认时返回 `input_required`。使用新 ID、一个 `inputResponses` 项和原样的 `requestState` 重试原调用，不要凭空发起服务器到客户端的 JSON-RPC 请求。
5. 草拟一个双时代 stdio 客户端：把结果或可识别的现代错误视为现代协议；只有无法识别的错误或超时才允许回退到 `initialize`。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| MCP | “LLM 工具协议” | 用于服务器发现、工具、资源、提示词和扩展的 JSON-RPC 协议 |
| Host | “AI 应用” | 拥有模型和 UI，并挂载一个或多个 MCP 客户端 |
| Client | “连接器” | 代表宿主与一个服务器说 MCP |
| 无状态 MCP | “没有会话” | 每个请求携带版本和能力，不以连接为键保存协议状态 |
| `server/discover` | “能力探测” | 公布版本、能力和身份的必需服务器方法 |
| `resultType` | “结果状态” | 标记结果为 `complete` 或 `input_required` |
| 状态句柄 | “工作流 ID” | 服务器生成、作为普通参数传递的应用标识符 |
| Streamable HTTP | “远程传输” | 一个 POST 端点，以 JSON 或请求级 SSE 返回结果 |
| MRTR | “请求并重试” | 把输入请求嵌入结果，随后重试原操作 |

## 延伸阅读

- [MCP 2026-07-28 关键变更](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [MCP 服务器发现](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [MCP Multi Round-Trip Requests](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [MCP 已弃用功能](https://modelcontextprotocol.io/specification/2026-07-28/deprecated)
