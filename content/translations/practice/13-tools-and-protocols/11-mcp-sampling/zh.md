---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/11-mcp-sampling/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: a205ee1e92a30eb61080e980620eaf0c5dbd1772db8b35da65a453273ed4fd71
status: reviewed
---

# MCP 模型输入：Sampling 迁移与无状态 MRTR

> MCP 2026-07-28 已将 Sampling 标记为弃用，并移除了服务器到客户端的请求通道。已有工作流如果仍需要客户端的模型，服务器就返回 `input_required` 结果，客户端带着模型输出重试原请求。推理循环因此变得显式、有界，并且在协议层保持无状态。

**类型：** 构建
**语言：** Python
**前置课程：** Phase 13 · 第 07 课（MCP 服务器）、Phase 13 · 第 10 课（资源与提示词）
**预计时间：** 约 75 分钟

## 学习目标

- 解释 Sampling 为何在 MCP 2026-07-28 中弃用，并为新服务器选择直接集成模型的默认方案。
- 实现兼容工作流，把 `sampling/createMessage` 放进 Multi Round-Trip Requests（MRTR）。
- 在每个请求的 `_meta` 对象中放入协议版本和客户端能力。
- 返回 `resultType: "input_required"`，并用新的 JSON-RPC id 重试原方法。
- 保护 `requestState` 的完整性，并将其绑定到主体、方法、参数和过期时间。
- 用能力检查、审批、响应校验和轮次上限约束模型辅助循环。

## 协议之前的决策

例如，`summarize_repo` 这样的工具需要两类工作：

1. 确定性工作：列出文件、读取允许的文件、校验路径并组装内容。
2. 模型工作：选择有代表性的文件并综合摘要。

现在有两种有效架构。

### 新服务器：直接集成模型提供商

这是当前默认方案。服务器负责模型选择、凭据、预算、重试和可观测性，并向 MCP 客户端返回一个普通的 `tools/call` 结果。

当服务器本来就是托管服务，或可预测的模型行为比使用宿主模型更重要时，选择这个方案。

### 已有 Sampling 工作流：迁移到 MRTR

Sampling 在弃用窗口内仍然存在。面向 2026-07-28 的服务器不能再向客户端实时发送 `sampling/createMessage` 请求，而是把它嵌入 `InputRequiredResult`。

只有在使用客户端模型和凭据是实际产品需求时，才选择这条兼容路径。记录移除计划，因为新实现不应采用已弃用的 Sampling。

## 无状态契约

2026 年 7 月协议没有 `initialize` 交换、没有 `notifications/initialized`，也没有 `Mcp-Session-Id`。过去放在握手里的信息，现在随每个请求传递：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "summarize_repo",
    "arguments": {"audience": "developer"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {"sampling": {}},
      "io.modelcontextprotocol/clientInfo": {
        "name": "lesson-client",
        "version": "1.0.0"
      }
    }
  }
}
```

服务器在每个请求上校验版本。缺少版本或版本不是字符串时返回 Invalid Params（`-32602`）；不支持的字符串返回 `-32022`，数据必须精确为 `{"supported":["2026-07-28"],"requested":"<client version>"}`。缺少 Sampling 能力返回 `-32021`，且 `data.requiredCapabilities` 为 `{"sampling":{}}`。

没有 JSON-RPC `id` 的信封是通知。接收方可以处理它，但既不返回成功响应，也不返回错误响应。Streamable HTTP 适配器对接受的通知返回没有响应体的 `202 Accepted`。

服务器还实现 `server/discover`，以 `supportedVersions`、能力、`ttlMs` 和 `cacheScope` 让客户端在调用工具前学习并缓存服务器契约。由于 discovery 公布了 `tools`，服务器也实现必需的 `tools/list`。其确定性的 `summarize_repo` 描述包含合法的对象型 `inputSchema`、`resultType: "complete"`、服务器身份元数据和公开缓存提示。

每个成功的现代结果都有一个判别字段：

- `resultType: "complete"` 表示操作结束。
- `resultType: "input_required"` 表示客户端要完成嵌入式请求并重试。
- 扩展可以定义更多结果类型；第 13 课的 Tasks 扩展增加了 `"task"`。

## 一轮 MRTR

服务器在处理请求时不能直接调用客户端，而是返回这个结果：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "input_required",
    "inputRequests": {
      "pick_files": {
        "method": "sampling/createMessage",
        "params": {
          "messages": [
            {
              "role": "user",
              "content": {
                "type": "text",
                "text": "Choose three representative files and return a JSON array."
              }
            }
          ],
          "systemPrompt": "Return only the requested value.",
          "modelPreferences": {
            "costPriority": 0.8,
            "intelligencePriority": 0.2
          },
          "maxTokens": 400
        }
      }
    },
    "requestState": "opaque-integrity-protected-value"
  }
}
```

客户端确认自己支持 Sampling，应用审批和模型策略，并得到模型响应。之后它用不同的 JSON-RPC id 发送新请求：

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "summarize_repo",
    "arguments": {"audience": "developer"},
    "inputResponses": {
      "pick_files": {
        "role": "assistant",
        "content": {
          "type": "text",
          "text": "[\"README.md\", \"server.py\", \"docs/intro.md\"]"
        },
        "model": "host-model",
        "stopReason": "endTurn"
      }
    },
    "requestState": "opaque-integrity-protected-value",
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {"sampling": {}}
    }
  }
}
```

这次重试不是协议会话的延续。它是一个新请求，重复原来的方法和参数，只添加当前轮的 `inputResponses`，并逐字节回显 `requestState`。

MRTR 只允许用于 `tools/call`、`prompts/get` 和 `resources/read`。服务器不得从无关方法返回 `input_required`。

## 多轮状态

本课需要两次模型调用：

1. `pick_files` 返回 JSON 数组。
2. `summary` 返回最终散文摘要。

每次重试只携带该轮的响应。因此服务器把阶段和经过校验的中间数据放进下一个 `requestState`。

把这个值视为攻击者控制的输入。仅签名原始阶段名称还不够，状态还要绑定到：

- 认证主体，而不是自报的 `clientInfo`；
- 发起方法；
- 原始参数的摘要；
- 较短的过期时间；
- 当前阶段和经过校验的中间值。

不需要保密时使用 HMAC；客户端不能读取状态时使用认证加密。错误签名、过期、主体变化或参数变化，都应以 `-32602` 拒绝。

客户端不能解析或修改 `requestState`，唯一职责是在重试时原样回显字符串。

## 模型偏好是提示

`costPriority`、`speedPriority` 和 `intelligencePriority` 是彼此独立的偏好，不是概率分布，也不要求总和为 1。客户端拥有模型策略，因此可以忽略它们。

如果维护旧版 Sampling 流程，把 `includeContext` 保持为 `"none"`。其他上下文模式会增加泄露风险，而且本身也已弃用。只在请求中传递最少的显式上下文。

## 安全不变量

客户端是嵌入式 Sampling 请求的信任边界。

- 在策略要求审批时，向用户展示服务器要求模型做什么。
- 限制 MRTR 轮数，否则恶意服务器可以制造模型消费循环。
- 使用采样响应作为文件名、URL 或工具输入前，校验每一条响应。
- 限制每轮的字节数和 token 数。
- 拒绝当前客户端能力没有声明的输入请求。
- 不要把模型输出放进授权决策。
- 记录发起方法和输入请求键，但不要记录敏感提示词内容。

`clientInfo` 和 `serverInfo` 是展示及诊断元数据。绝不能把任一项当作认证身份。

```figure
t3-sampling-flip
```

## 动手构建

`code/main.py` 用标准库实现完整的两轮流程，不依赖第三方包：

- `server/discover` 返回 `supportedVersions`，公布工具支持，并返回缓存提示。
- `tools/list` 返回带对象输入 schema、确定性且可缓存的 `summarize_repo` 描述。
- `tools/call` 校验逐请求元数据。
- 第一份结果嵌入 `sampling/createMessage` 以选择文件。
- 第一次重试校验模型结果，并嵌入第二个请求。
- HMAC 保护的 `requestState` 在独立请求间携带阶段。
- 最终结果使用 `resultType: "complete"`。

伪造的宿主模型让示例保持确定性。接入真实宿主时只替换 `fake_host_model`；服务器端状态机应保持确定且可测试。

## 使用

从仓库根目录运行：

```bash
cd phases/13-tools-and-protocols/11-mcp-sampling/code
python3 main.py
python3 -m unittest discover tests -v
```

预期检查点：

- Discovery 返回带 `ttlMs` 与 `cacheScope` 的 complete 结果。
- 工具发现返回相同的排序描述，包含 `resultType`、服务器身份和缓存提示。
- 缺少能力与不支持版本分别使用精确的 `-32021` 和 `-32022` 错误数据。
- 没有 id 的通知不会产生 JSON-RPC 响应。
- 请求 id 为 `[1, 2, 3]`，证明每轮 MRTR 都是独立请求。
- 前两个结果是 `input_required`。
- 最终结果是 `complete`，包含选中文件和摘要。
- 在重试时改变原始参数会导致 request-state 校验失败。

## 交付

`outputs/skill-sampling-loop-designer.md` 现在是迁移规划器。它先判断是否应移除 Sampling、改为直接集成模型；如果需要兼容，就生成 MRTR 轮次、状态绑定、能力门禁、预算、校验和移除计划。

## 练习

1. 把文件选择响应改成无效 JSON，确认服务器返回 `-32602`，而不是信任模型输出。
2. 在第一次调用和重试之间改变 `audience`，解释为什么封存状态会阻止跨请求复用。
3. 增加第三轮，让宿主批评摘要；把前面的摘要放入签名状态，并把整个流程限制为三轮。
4. 移除 Sampling，把伪造宿主回调替换成服务器自有的模型适配器。列出哪些审批、计费和可观测性职责转移到了服务器。
5. 使用刚过期一秒的状态值增加过期测试。

## 关键术语

| 术语 | 2026-07-28 中的含义 |
|------|--------------------|
| Sampling | 请求客户端模型补全的已弃用功能 |
| MRTR | 请求过程中需要客户端输入时使用的无状态重试模式 |
| `InputRequiredResult` | `resultType: "input_required"` 的结果 |
| `inputRequests` | 服务器分配的嵌入式询问映射，可包含 elicitation、sampling 或 roots 请求 |
| `inputResponses` | 当前轮客户端的结果，键与 `inputRequests` 对应 |
| `requestState` | 客户端原样回显、服务器验证的不透明服务器状态 |
| `resultType` | 现代 MCP 结果必需的判别字段 |
| 直接集成模型 | 新服务器需要模型推理时推荐的替代方案 |
| 能力门禁 | 防止向未声明能力的客户端发送嵌入式请求的规则 |
| 循环预算 | 操作允许的最大轮数、token、字节数、时间和花费 |

## 旧版兼容

固定在 2025-11-25 的客户端仍可能在活动连接上使用旧的、服务器主动发起的 `sampling/createMessage` 流程。只在按版本隔离的适配器中保留该行为，不要把有会话的路径当作 2026-07-28 服务器的架构。

官方 SDK 可以为旧对端转换现代 `input_required` 处理器。这个 shim 是兼容边界，不代表可以新增依赖会话的逻辑。

## 延伸阅读

- [MCP 2026-07-28 Multi Round-Trip Requests](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [MCP 2026-07-28 变更日志](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [MCP Sampling 弃用说明](https://modelcontextprotocol.io/seps/2577-deprecate-roots-sampling-and-logging)
- [MCP 2026-07-28 服务器发现](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
