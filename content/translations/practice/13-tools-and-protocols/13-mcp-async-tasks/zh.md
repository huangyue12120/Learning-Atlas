---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/13-mcp-async-tasks/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 6987b0cabf06d9f37c5f42b31a76889ad26b36b3571aeaae6629ceb2cd0f7314
status: reviewed
---

# MCP Tasks 扩展：无状态核心上的持久工作

> 无状态 MCP 不意味着每个操作都必须在一次请求中结束。官方 Tasks 扩展为长时工作提供显式的持久句柄。服务器可以从 `tools/call` 返回该句柄，任意实例都能响应 `tasks/get`，客户端输入则通过 `tasks/update` 到达，而不必复活协议会话。

**类型：** 构建
**语言：** Python
**前置课程：** Phase 13 · 第 09 课（传输）、Phase 13 · 第 11 课（无状态 MRTR）、Phase 13 · 第 12 课（Elicitation）
**预计时间：** 约 90 分钟

## 学习目标

- 区分无状态协议传输与持久的应用任务状态。
- 在逐请求能力和 `server/discover` 中协商 `io.modelcontextprotocol/tasks` 扩展。
- 只有在持久创建完成后，才返回带 `resultType: "task"` 的服务器决定的 `CreateTaskResult`。
- 使用 `tasks/get` 轮询，通过 `tasks/update` 满足任务输入，并用 `tasks/cancel` 请求协作式取消。
- 移除对旧 `tasks/status`、`tasks/result` 和 `tasks/list` 的假设。
- 通过 POST 响应 SSE 流上的 `subscriptions/listen` 订阅可选任务通知。
- 正确建模任务过期、重启恢复、输入键去重和执行错误。

## 为什么 Tasks 是扩展

Tasks 最早在 2025-11-25 作为实验性核心功能出现。2026 年 7 月的重设计把它移入官方 `io.modelcontextprotocol/tasks` 扩展，让客户端和服务器可以选择额外的生命周期，而不会把核心协议扩大到所有人。

即使扩展规范仍是 draft，它仍是当前 Tasks 的官方归属。固定 SDK 支持的扩展版本，运行一致性场景，并把线协议适配器与 worker、存储领域隔离。

当操作具备以下一个或多个特征时使用任务：

- 可能超过普通请求超时；
- 已经由 worker 队列或外部作业系统执行；
- 客户端需要在自己重启后恢复；
- 执行期间可能暂停等待用户或模型输入；
- 取消和持久结果获取是产品需求。

廉价的确定性查询不应创建任务。句柄、持久化、轮询、过期和取消都是真实的复杂度。

## 无状态核心，有状态应用

MCP 2026-07-28 移除了 `initialize`、`notifications/initialized`、协议会话和 `Mcp-Session-Id`，但这不禁止有状态产品。

任务 ID 是显式的应用状态：

- 服务器在返回前持久化它；
- 客户端可以保存它，在重启后再次轮询；
- 由同一个持久存储支撑时，它可以路由到任意副本；
- 每个任务方法都会重新检查授权；
- 过期和删除由任务字段定义，而不是由传输生命周期定义。

这与附着在连接上的隐藏状态在运维上完全不同。

把四种生命周期分开：

| 状态 | 生命周期 | 所在位置 |
|---|---|---|
| 协议元数据 | 一次请求 | `params._meta`，每次调用重新校验 |
| 传输工作 | 一次 stdio 请求或 HTTP 响应 | 带有有界 deadline 的进行中协调器 |
| MRTR 续接 | 一次重试序列 | 完整性保护的 `requestState`，必要时加重放控制 |
| 持久任务 | 跨请求、副本、重启和重连 | 由授权的 `taskId` 为键的共享应用存储 |

把任务记录放进进程内存不会让 MCP 变成有状态，只会让应用不可靠。协议仍然无状态，但稍后的 `tasks/get` 如果被路由到另一个副本，就无法恢复该记录。返回句柄前先持久化，之后每个任务方法都在租户和主体检查下解析同一份共享记录。

## 能力协商

客户端在每个符合条件的请求上声明支持：

```json
{
  "_meta": {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientCapabilities": {
      "extensions": {
        "io.modelcontextprotocol/tasks": {}
      }
    },
    "io.modelcontextprotocol/clientInfo": {
      "name": "lesson-client",
      "version": "1.0.0"
    }
  }
}
```

服务器从 `server/discover` 返回精确的 `supportedVersions`、能力、`ttlMs` 和 `cacheScope`，并在能力中带上同一个扩展。由于它公布了工具，也实现必需的 `tools/list`；该结果返回确定性的 `generate_report` 描述、合法对象型 `inputSchema`、`resultType: "complete"`、服务器身份元数据和公开缓存提示。

未声明扩展的客户端调用任务方法时，返回 `-32021`（Missing Required Client Capability），并把 `data.requiredCapabilities` 设为 `{"extensions":{"io.modelcontextprotocol/tasks":{}}}`。不支持的协议字符串返回 `-32022`，数据精确包含 `supported` 和 `requested`；缺少版本或版本非字符串返回 `-32602`。

没有 JSON-RPC `id` 的信封是通知。接收方可以处理它，但不发出 JSON-RPC 结果或错误。Streamable HTTP 适配器对接受的通知返回无响应体的 `202 Accepted`。

目前只有 `tools/call` 支持任务增强。内部抽象应提前留出空间，避免未来其他请求类型需要重写存储层。

## 服务器决定创建任务

旧的客户端标记 `params._meta.task.required` 已移除。客户端声明扩展支持，服务器再决定某个具体的 `tools/call` 是否变成任务。

请求：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "generate_report",
    "arguments": {"size": "large"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/tasks": {}
        }
      }
    }
  }
}
```

响应：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "task",
    "taskId": "tsk_786512e29e0d",
    "status": "working",
    "statusMessage": "Preparing report outline.",
    "createdAt": "2026-08-21T10:30:00Z",
    "lastUpdatedAt": "2026-08-21T10:30:00Z",
    "ttlMs": 900000,
    "pollIntervalMs": 1000
  }
}
```

服务器在 `tasks/get` 已经能够解析该 ID 之前，不得返回这个句柄。在最终一致存储中，应先等待读取可见；否则客户端会收到一个看似有效的 ID，随即得到“找不到”。

任务响应在“是否进入任务模式”这件事上是由服务器主动决定的，因为客户端没有请求任务模式；但它并不是未经协商的：当前请求仍必须声明扩展。

## 任务形状

每个任务包含：

- `taskId`：服务器生成的稳定标识符；
- `status`：`working`、`input_required`、`completed`、`cancelled` 或 `failed`；
- `createdAt` 和 `lastUpdatedAt`：ISO 8601 时间戳；
- `ttlMs`：从创建时刻开始计算的过期时长，或 `null` 表示不公布限制；
- 可选的 `pollIntervalMs`：服务器当前建议的最小轮询间隔；
- 可选的 `statusMessage`：面向用户或模型的上下文。

只有相关时才出现状态专属字段：

- `input_required` 包含 `inputRequests`；
- `completed` 包含原始请求的 `result` 形状；
- `failed` 包含 JSON-RPC `error` 对象。

客户端应遵守 `pollIntervalMs`。服务器可以限制更频繁的轮询，也可以在任务生命周期中改变间隔。

## 使用 `tasks/get` 轮询

客户端请求当前快照：

```http
POST /mcp HTTP/1.1
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tasks/get
Mcp-Name: tsk_786512e29e0d
```

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tasks/get",
  "params": {
    "taskId": "tsk_786512e29e0d",
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/tasks": {}
        }
      }
    }
  }
}
```

`tasks/get` 自身已经完成，所以它的结果总有 `resultType: "complete"`；嵌套任务仍可能处于 `status: "working"` 或 `status: "input_required"`。

这个区别可以避免常见的解析器错误：

```text
result.resultType = complete    means the tasks/get RPC finished
result.status = working        means the represented job is still running
```

没有 `tasks/result` 调用。任务完成后，下一次 `tasks/get` 响应会把原始 `CallToolResult` 放在 `result` 中：

```json
{
  "resultType": "complete",
  "taskId": "tsk_786512e29e0d",
  "status": "completed",
  "createdAt": "2026-08-21T10:30:00Z",
  "lastUpdatedAt": "2026-08-21T10:34:12Z",
  "ttlMs": 900000,
  "result": {
    "resultType": "complete",
    "content": [
      {"type": "text", "text": "Generated large report with approved outline."}
    ],
    "structuredContent": {"size": "large", "approved": true},
    "isError": false,
    "_meta": {
      "io.modelcontextprotocol/serverInfo": {
        "name": "tasks-demo",
        "version": "1.0.0"
      }
    }
  },
  "_meta": {
    "io.modelcontextprotocol/serverInfo": {
      "name": "tasks-demo",
      "version": "1.0.0"
    }
  }
}
```

外层 `resultType` 表示 `tasks/get` RPC 已完成，内层 `result.resultType` 表示原始工具调用已完成。这个嵌套判别字段是必需的。嵌套的 `CallToolResult` 也应带有自己的 `io.modelcontextprotocol/serverInfo`；本课保留它，而不是存放无类型 payload。

没有 `tasks/list`。无会话服务器无法安全推断连接级列表中属于谁。需要历史记录的应用，应使用带显式过滤器和所有权规则的授权领域工具。

## 任务执行期间的输入

任务输入和核心 MRTR 看起来相似，但续接方式不同。

### 创建任务之前需要输入

从原始 `tools/call` 返回核心的 `resultType: "input_required"`。客户端完成输入并重试原调用；只有这些同步 MRTR 轮次结束后才创建任务。

### 创建任务之后需要输入

把任务置为 `input_required`。`tasks/get` 暴露待处理的 `inputRequests`，客户端通过 `tasks/update` 发送响应，不能重试原始 `tools/call`。

快照：

```json
{
  "resultType": "complete",
  "taskId": "tsk_786512e29e0d",
  "status": "input_required",
  "createdAt": "2026-08-21T10:30:00Z",
  "lastUpdatedAt": "2026-08-21T10:31:00Z",
  "ttlMs": 900000,
  "inputRequests": {
    "approve_outline": {
      "method": "elicitation/create",
      "params": {
        "mode": "form",
        "message": "Approve the generated report outline?",
        "requestedSchema": {
          "type": "object",
          "properties": {"approved": {"type": "boolean"}},
          "required": ["approved"]
        }
      }
    }
  }
}
```

更新：

```http
POST /mcp HTTP/1.1
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tasks/update
Mcp-Name: tsk_786512e29e0d
```

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tasks/update",
  "params": {
    "taskId": "tsk_786512e29e0d",
    "inputResponses": {
      "approve_outline": {
        "action": "accept",
        "content": {"approved": true}
      }
    },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/tasks": {}
        }
      }
    }
  }
}
```

成功响应是带 `resultType: "complete"` 的空确认。状态变化可能最终一致，因此客户端继续轮询或监听。

整个任务生命周期中，每个 `inputRequests` 键必须唯一。重复的 `tasks/get` 快照可以显示同一个待处理键；客户端应对 UI 去重，服务器忽略未知、已替代或已经完成的键。部分更新可能让任务继续处于 `input_required`，直到所有必需键都得到回答。

## 取消是协作式的

`tasks/cancel` 表示取消意图，并返回空的 complete 确认；确认不保证 worker 已停止。工作可能先完成、忽略取消，或稍后再转换状态。

```http
POST /mcp HTTP/1.1
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tasks/cancel
Mcp-Name: tsk_786512e29e0d
```

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tasks/cancel",
  "params": {
    "taskId": "tsk_786512e29e0d",
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/tasks": {}
        }
      }
    }
  }
}
```

三个任务方法的 `Mcp-Name` 都映射 `params.taskId`，不会重复 JSON-RPC 方法名。`code/main.py` 在 `make_http_request` 中集中实现这条规则。

本课 worker 会立即遵守取消，使重复调用具有幂等性。生产客户端仍必须把取消视为协作式意图，不能从确认响应推断最终任务状态。

不要使用 `notifications/cancelled` 取消任务。该通知属于请求取消，而不是持久 Tasks。

这一区分在路由边界很重要。请求取消针对一次进行中的 JSON-RPC 操作或请求级 HTTP 响应。如果 `tools/call` 已经返回 `resultType: "task"`，那次请求就结束了，关闭其传输不能指名或停止持久作业。`tasks/cancel` 是新的、经过授权的 RPC，携带 `params.taskId`，在 `Mcp-Name` 中回显该 ID，解析任务所属后端，记录协作式取消意图，并返回确认，但不声称 worker 已停止。

因此，网关必须把请求协调器和任务路由放在不同表中。响应完成后请求表可以消失；任务路由必须一直存在到终态和保留期结束。[第 29 课：MCP 可靠性、取消与流控](../../29-mcp-reliability-cancellation-and-flow-control/docs/en.md)会构建两条路径的竞态、超时、幂等、背压和重试规则。

## 可选通知

轮询是基础方案。想要推送更新的客户端用任务 ID 发送 `subscriptions/listen`。对 Streamable HTTP，这是一个响应为请求级 SSE 流的 POST，没有独立 GET 事件流，也没有需要维持的协议会话。

服务器用 `notifications/subscriptions/acknowledged` 确认接受的 ID，然后可以通过 `notifications/tasks` 发送完整快照。确认和每个任务通知都在 `_meta` 中携带 `io.modelcontextprotocol/subscriptionId`，其值等于 `subscriptions/listen` 请求 ID。每个任务通知在当时都与 `tasks/get` 返回的内容等价。

客户端仍必须声明 Tasks 扩展。重连时应依据持久任务 ID 恢复，而不是依赖事件重放或 `Last-Event-ID`。

## 失败语义

正确使用两层错误。

### 协议错误

无效的方法参数或未知任务 ID 返回 JSON-RPC 错误，通常是 `-32602`。缺少扩展支持返回 `-32021`，并带所需能力对象。

### 任务执行结果

- 具有 `isError: true` 的普通工具结果仍是 `completed` 任务，因为工具调用产生了其定义的结果。
- 延迟执行期间的 JSON-RPC 错误让任务变为 `failed`，并把该 JSON-RPC 错误存入 `error`。
- 用户拒绝可以产生 `cancelled`、带拒绝结果的 completed，或其他领域定义的安全结果；需要把选择写清楚。

## 持久性、过期与所有权

至少持久化任务 ID、状态、时间戳、TTL、轮询间隔、原始操作所有权、结果或错误、未完成的输入请求，以及所有已发出的输入键。

存储键必须包含或解析权威租户和主体。知道任务 ID 不应自动获得访问权。每次 `tasks/get`、`tasks/update`、`tasks/cancel` 和订阅都要检查所有权。

`ttlMs` 从创建时刻计算，也可能发生变化。客户端可以在任务不再产生可观察更新时把它当作后备期限。服务器可以先失败、稍后删除过期任务；不要把它描述成“完成后仍保证保留这么多毫秒”的承诺。

使用原子写入或事务。本课写临时文件并原子重命名。多副本服务应使用共享持久存储和 worker lease 或等价并发控制。

```figure
tp-task-lifecycle
```

## 动手构建

`code/main.py` 实现确定性的任务服务：

- `server/discover` 返回 `supportedVersions`、缓存提示和 Tasks 扩展；
- `tools/list` 返回带合法输入 schema 的确定性、可缓存 `generate_report` 描述；
- `tools/call` 在返回 `resultType: "task"` 前创建并持久化任务；
- 新服务实例重新加载同一任务，演示重启恢复；
- `tasks/get` 返回完整任务快照；
- worker 从 `working` 移动到 `input_required`；
- `tasks/update` 接受表单响应并返回空的 complete 确认；
- worker 保存带自身 `resultType` 和服务器身份的嵌套 `CallToolResult`，再转为 `completed`；
- `tasks/cancel` 在本实现中具有幂等性；
- HTTP 构造器为 `tasks/get`、`tasks/update` 和 `tasks/cancel` 把 `Mcp-Name` 设为 `params.taskId`；
- 通知辅助函数使用 `notifications/subscriptions/acknowledged` 和 `notifications/tasks`，两者都标记 listen 请求 ID；
- 没有 id 的通知不会产生 JSON-RPC 响应。

worker 显式推进状态，而不是在后台线程中 sleep。这样每个状态转换都是确定的，也把协议示例与队列机制分开。

## 使用

从仓库根目录运行：

```bash
cd phases/13-tools-and-protocols/13-mcp-async-tasks/code
python3 main.py
python3 -m unittest discover tests -v
```

预期结果序列：

```text
id=0 resultType=complete status=ack
id=1 resultType=task status=working
id=2 resultType=complete status=working
id=3 resultType=complete status=input_required
id=4 resultType=complete status=ack
id=5 resultType=complete status=completed
```

还要确认现代服务对 `tasks/status`、`tasks/result` 和 `tasks/list` 返回 method-not-found；确认 `tools/list` 是确定性的，且当前每个 HTTP 任务方法都通过 `Mcp-Name` 回显任务 ID。

## 交付

`outputs/skill-task-store-designer.md` 现在生成面向扩展的设计：能力协商、返回前持久化创建、当前方法、输入更新流程、所有权、过期、取消、订阅，以及从已删除实验方法迁移的策略。

## 练习

1. 增加第二个待处理输入键。发送部分 `tasks/update`，证明两个键都回答前任务仍保持 `input_required`。
2. 给存储加入租户所有权，拒绝错误认证主体提交的有效任务 ID。
3. 加入带过期时间的 worker lease，演示两个服务实例不能并发完成同一任务。
4. 为 `subscriptions/listen` 实现 POST 响应 SSE 适配器，不要加入 GET、`Last-Event-ID` 或会话 header。
5. 增加过期清理，区分过期任务和格式错误的任务 ID，同时不泄露跨租户存在性。

## 关键术语

| 术语 | 当前扩展中的含义 |
|------|----------------|
| Tasks 扩展 | 用于持久异步工作的可选 `io.modelcontextprotocol/tasks` 能力 |
| `CreateTaskResult` | 对符合条件的请求返回的、服务器决定的 `resultType: "task"` 响应 |
| `tasks/get` | 轮询完整的当前任务快照，包括终态结果或待处理输入 |
| `tasks/update` | 提交任务未完成 `inputRequests` 的响应 |
| `tasks/cancel` | 确认协作式取消意图 |
| `input_required` | 表示等待客户端输入的任务状态 |
| `pollIntervalMs` | 服务器建议的下一次轮询最小延迟 |
| `ttlMs` | 从任务创建开始计算的过期时长 |
| 返回前持久化 | 发送句柄之前，任务 ID 必须已经可解析 |
| `notifications/tasks` | 在订阅 SSE 响应中传递的可选完整任务快照 |

## 旧版兼容

2025-11-25 的实验性面使用客户端请求的任务增强、`tasks/status`、`tasks/result` 和可选的 `tasks/list`。这些名称只能保留在固定版本的旧版适配器中。当前客户端使用扩展能力，接受服务器决定的句柄，轮询 `tasks/get`，通过 `tasks/update` 提交输入，并从任务快照读取最终结果。

## 延伸阅读

- [官方 MCP Tasks 扩展](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks)
- [MCP 2026-07-28 Multi Round-Trip Requests](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [MCP 2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
