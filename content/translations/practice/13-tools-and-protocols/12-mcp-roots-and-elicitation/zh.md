---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 5b061e2bec0962f9a1bcf881f7886fbe16426236f428311f30199f398c1af6bd
status: reviewed
---

# 显式范围与无状态 Elicitation

> Roots 在 MCP 2026-07-28 中已弃用，而且从来不是安全沙箱。把范围放进可见的工具参数或资源 URI，由服务器执行授权；工具确实需要用户输入时，使用 MRTR。用户看得到决策，模型拿到句柄，任意服务器实例都能处理重试。

**类型：** 构建
**语言：** Python
**前置课程：** Phase 13 · 第 07 课（MCP 服务器）、Phase 13 · 第 11 课（无状态 MRTR）
**预计时间：** 约 60 分钟

## 学习目标

- 用显式工作区参数、资源 URI 或服务器配置替代已弃用的 Roots。
- 区分范围提示、授权、路径包含关系和操作系统沙箱。
- 通过 MRTR 的 `input_required` 结果传递表单模式的 `elicitation/create`。
- 在逐请求客户端能力中声明 elicitation 支持，并拒绝未支持的模式。
- 把 `accept`、`decline` 和 `cancel` 作为不同结果校验。
- 将破坏性确认绑定到认证主体、原始参数、候选集合和过期时间。

## 两个看起来相似的问题

一个笔记工具收到请求：“删除旧的 TPS report。”

服务器必须回答两个不同的问题：

1. 这次操作可以触碰哪个工作区？
2. 三篇匹配的笔记中，用户指的是哪一篇？

第一个是范围与授权，第二个是交互式消歧。把两者混在一起，就会出现危险设计，例如把客户端提供的文件夹误当成调用者可以删除其中所有内容的证明。

## Roots 是迁移面

早期 MCP 版本允许客户端公布 Roots，并在列表变化时通知服务器。Roots 只是信息性指引：它们不限制服务器进程能读取什么，不授权调用者，也不创建操作系统沙箱。

MCP 2026-07-28 已将 `roots/list` 和 `notifications/roots/list_changed` 标记为新设计不应使用的功能。优先采用以下显式替代方案：

- 范围按调用变化时，使用 `workspaceUri` 或 `directory` 工具参数；
- 操作本来就针对资源时，使用资源 URI；
- 一次部署只拥有一个固定工作区时，使用服务器配置；
- 代码必须在技术上无法逃逸时，使用进程沙箱或受限文件系统。

如果现有 2026-07-28 集成在弃用窗口内仍需要 `roots/list`，服务器应把它嵌入 MRTR 的 `inputRequests`，不能发送实时反向请求。这是迁移适配器；新的处理器应直接接受显式范围。

模型可以看见并复述显式句柄。隐藏在传输会话中的范围更难检查、重放、审计和路由。

### 三层规则

显式 URI 仍不会自行获得授权。必须同时执行三层检查：

1. **授权：** 这个认证主体是否有权使用该工作区？
2. **包含关系：** 规范化后的目标 URI 是否仍在授权工作区边界内？
3. **沙箱：** 即使服务器被攻破，操作系统是否仍能阻止它逃逸？

可运行服务器维护已授权工作区 URI 的 allowlist，规范化百分号编码的路径，检查真正的路径组件边界，并在删除前立即再次检查包含关系。

朴素的字符串前缀检查是错误的：

```text
allowed:   file:///work/notes
attacker:  file:///work/notes-evil/secret.md
traversal: file:///work/notes/%2e%2e/private.md
```

两条恶意路径都以容易误导的字符串开头。应先规范化，再比较路径组件。生产文件系统服务器还必须防御符号链接竞态和平台特有的路径语义。

## Elicitation 仍然存在，但传递方式变了

Elicitation 是当前用于在 `tools/call`、`prompts/get` 或 `resources/read` 期间收集用户输入的客户端功能。方法名仍是 `elicitation/create`，变化的是线上流向。

2026-07-28 服务器不会发送反向 JSON-RPC 请求，而是返回 `InputRequiredResult`：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "input_required",
    "inputRequests": {
      "delete_choice": {
        "method": "elicitation/create",
        "params": {
          "mode": "form",
          "message": "Choose one matching note and confirm deletion.",
          "requestedSchema": {
            "type": "object",
            "properties": {
              "note_id": {
                "type": "string",
                "enum": ["note-3", "note-7", "note-14"]
              },
              "confirm": {"type": "boolean"}
            },
            "required": ["note_id", "confirm"]
          }
        }
      }
    },
    "requestState": "integrity-protected-delete-state"
  }
}
```

宿主渲染表单。用户可以接受、明确拒绝或关闭它。客户端随后用新的 id 重试原来的 `tools/call`：

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "notes_delete",
    "arguments": {
      "workspaceUri": "file:///Users/alice/Documents/Notes",
      "title": "TPS report"
    },
    "inputResponses": {
      "delete_choice": {
        "action": "accept",
        "content": {"note_id": "note-14", "confirm": true}
      }
    },
    "requestState": "integrity-protected-delete-state",
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "elicitation": {"form": {}}
      }
    }
  }
}
```

两次调用之间没有协议会话。服务器验证回显的状态，按预期 schema 校验响应，确认选中的笔记在签名候选集合中，重新授权工作区，再次检查包含关系，然后才删除。

## 能力协商是逐请求的

支持表单模式 elicitation 的客户端声明：

```json
{
  "io.modelcontextprotocol/clientCapabilities": {
    "elicitation": {"form": {}}
  }
}
```

为了兼容，空的 elicitation 能力 `"elicitation": {}` 仍等价于仅支持表单。显式的 `"elicitation": {"form": {}}` 也支持表单。只有 URL 的声明 `"elicitation": {"url": {}}` 则不支持表单。即使更早请求声明过某项能力，服务器也不能在当前请求能力缺失时嵌入该模式。

每个请求还携带 `io.modelcontextprotocol/protocolVersion`。版本缺失或不是字符串返回 `-32602`；不支持的字符串返回 `-32022`，数据中精确包含 `supported` 和 `requested`。缺少表单支持或只有 URL 支持时，返回 `-32021`，并把 `data.requiredCapabilities` 设为 `{"elicitation":{"form":{}}}`。

没有 JSON-RPC `id` 的信封是通知。服务器处理它，但不发送 JSON-RPC 成功或错误响应。Streamable HTTP 上，接受的通知返回没有响应体的 `202 Accepted`。

`clientInfo` 可以用于诊断，但它是自报信息，不能用来识别授权用户。

服务器实现 `server/discover`，返回带 `resultType: "complete"` 的 `supportedVersions`、能力、`ttlMs` 和 `cacheScope`。现代设计不公布 Roots。由于它公布了工具，也实现必需的 `tools/list`；该结果返回确定性的 `notes_delete` 描述、合法对象型 `inputSchema`、服务器身份元数据和公开缓存提示。

## 表单模式

表单模式使用为可用对话框设计的受限 JSON Schema。根必须是对象，属性必须是扁平的基本类型字段或受支持的枚举数组。深层嵌套对象和通用文档 schema 不适合确认对话框。

表单模式适合：

- 从多个候选项中选一个；
- 确认破坏性操作；
- 收集不敏感偏好；
- 收集必须由用户而非模型决定的少量值。

不要使用表单模式收集密码、API key、访问令牌或支付凭据。这些秘密会经过 MCP 客户端，也可能进入日志或模型上下文。

服务器必须再次校验返回内容。客户端的表单校验能改善体验，但不能产生信任。

## URL 模式

URL 模式发送一个安全网页 URL，用于带外交互：

```json
{
  "method": "elicitation/create",
  "params": {
    "mode": "url",
    "message": "Connect the report service to continue.",
    "url": "https://mcp.example.com/connect/report-service"
  }
}
```

当敏感信息必须直接进入服务器控制的网页流程（例如第三方授权）时使用它。客户端应展示完整目标，并在打开前征得同意；不能预取 URL。

`accept` 表示用户同意打开 URL，并不证明外部流程已经完成。重试时，服务器检查自己的状态；如果未完成，就完成操作或再次返回 `input_required`。

URL elicitation 不能替代 MCP 客户端与 MCP 服务器之间的授权。它用于 MCP 服务器代表用户执行的外部交互。服务器必须把浏览器用户绑定到发起 MCP 操作的同一个认证主体。

## 响应分支

把这些动作当作产品决策，而不是别名：

| 动作 | 含义 | 安全的服务器行为 |
|--------|------|----------------|
| `accept` | 用户提交了交互结果 | 校验内容并继续 |
| `decline` | 用户明确拒绝 | 返回完整、非错误的拒绝结果 |
| `cancel` | 用户关闭或未能完成 | 安全停止，允许稍后重试 |

绝不要把缺少内容解释为同意，也不要把 decline 转化为重复提示循环。

## 保护破坏性 MRTR 状态

候选列表不能只存在于提示词或未签名的 Base64 值中，因为客户端控制它发回的全部内容。

本课签名的状态载荷包含：

- 认证主体；
- 发起方法；
- `workspaceUri` 和 `title` 的摘要；
- 表单中展示的允许笔记 ID；
- 操作阶段；
- 较短的过期时间。

变更前，服务器还会检查实时笔记记录，以捕获删除竞态，以及表单展示后目标移出工作区的情况。

对于一次性金融操作或不可逆操作，HMAC 本身不能阻止有效状态在过期前重放。应在所有处理器实例共享的重放存储中保存并只消费一次 nonce。课程注入了一个有界且会清理过期项的存储，并在执行内存删除时持有原子 claim。生产数据库应在同一事务或等价的条件写边界中完成 nonce claim 和变更。

在 claim nonce 之前先校验交互。格式错误的响应或 `cancel` 不执行变更，并让状态在过期前可重试。明确的 `decline` 是终态，因此会消费 nonce，但不删除任何内容。

```figure
t3-roots-boundary
```

## 动手构建

`code/main.py` 演示一个现代的 `notes_delete` 工具：

- `tools/list` 返回带必需工作区和标题 schema 的确定性、可缓存描述。
- 范围由显式的 `workspaceUri` 参数指定。
- 服务器配置为课程主体授权该工作区。
- URI 规范化会拒绝前缀混淆和编码后的路径穿越。
- 每次破坏性删除都要求表单模式 elicitation。
- elicitation 被放在 `resultType: "input_required"` 中传递。
- 签名的 `requestState` 绑定完整候选集合和原始参数。
- 注入的重放存储会阻止同一确认状态在多个服务器实例上执行。
- 重试使用新的请求 ID，并返回 `resultType: "complete"`。

数据存储放在内存中，便于检查协议行为；换成数据库后安全规则仍然相同。

## 使用

从仓库根目录运行：

```bash
cd phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/code
python3 main.py
python3 -m unittest discover tests -v
```

预期检查点：

- Discovery 公布工具，但不公布 Roots。
- 工具发现返回带 `resultType`、服务器身份和缓存提示的 `notes_delete`。
- 请求 ID `1` 在 `inputRequests.delete_choice` 中返回表单。
- 请求 ID `2` 回显签名状态并完成删除。
- 前缀路径和编码后的穿越路径都无法通过包含关系检查。
- 改变标题后不能复用原确认状态。
- decline 不会改变笔记。
- 共享笔记和重放状态的两个服务器对象不能都执行同一确认。
- 空声明和显式表单声明都有效，而只有 URL 的支持会返回精确的 `-32021` 表单要求。
- 不支持版本的错误使用精确的 `-32022` 数据形状。
- 没有 id 的通知不会产生 JSON-RPC 响应。

## 交付

`outputs/skill-elicitation-form-designer.md` 设计显式范围、授权检查、MRTR 表单、响应分支和状态绑定。它拒绝把已弃用的 Roots 当作沙箱，也拒绝通过表单模式收集秘密。

## 练习

1. 用 SQLite 替换内存重放存储，在一个事务中 claim nonce 并删除笔记，然后证明两个进程不能同时提交。
2. 增加 `url` 能力协商和带外设置流程。不要让第三方凭据进入 `inputResponses`。
3. 用临时 SQLite 数据库替换内存笔记映射，在变更事务内部重新检查授权和包含关系。
4. 为真正的文件系统实现加入符号链接策略。解释为什么仅靠 URI 词法包含关系不能阻止符号链接逃逸。
5. 设计一个 2025-11-25 适配器，把现代 MRTR 处理器输出映射为旧版服务器主动发起的 elicitation，并与当前处理器隔离。

## 关键术语

| 术语 | 2026-07-28 中的含义 |
|------|--------------------|
| Roots | 已弃用的信息性工作区提示，不是授权或沙箱 |
| 显式范围 | 请求参数中可见的工作区、目录或资源句柄 |
| 包含关系 | 规范化的路径组件检查，保证目标位于边界内 |
| Elicitation | 在 MCP 操作期间获取用户输入的客户端功能 |
| 表单模式 | 使用受限扁平 schema 的带内结构化用户输入 |
| URL 模式 | 面向敏感或外部工作流的带外交互 |
| MRTR | 无状态的 input-required 结果，随后以新请求重试 |
| `requestState` | 由客户端原样回显、由服务器做完整性检查的不透明状态 |
| Decline | 用户明确拒绝 |
| Cancel | 关闭或未完成交互，没有产生批准 |

## 旧版兼容

对于固定在 2025-11-25 的对端，`roots/list`、`notifications/roots/list_changed` 和服务器主动发起的 `elicitation/create` 仍可能存在。将它们标记为旧版适配器。不要让旧版 Root 列表绕过服务器授权，也不要把协议会话假设带进现代处理器。

## 延伸阅读

- [MCP 2026-07-28 Elicitation](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation)
- [MCP 2026-07-28 Multi Round-Trip Requests](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [MCP 2026-07-28 Roots 弃用说明](https://modelcontextprotocol.io/specification/2026-07-28/client/roots)
- [MCP 2026-07-28 服务器发现](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
