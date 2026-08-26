---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/15-mcp-security-tool-poisoning/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 8df9c5d03680ae24853c738c8c3876eb8e95decd5932e8356ac7c3b2915820e6
status: reviewed
---

# MCP 安全：被投毒的元数据、路由与 MRTR 状态

> 无状态不等于无信任。它意味着每个请求都暴露出服务器和网关独立校验调用所需的证据。

**类型：** 学习
**语言：** Python
**前置课程：** Phase 13 · 第 07 课（MCP 服务器）、Phase 13 · 第 08 课（MCP 客户端）
**预计时间：** 约 60 分钟

## 学习目标

- 把工具描述、注解、客户端信息和服务器信息视为不受信任数据。
- 检测元数据投毒、描述变化和跨服务器名称冲突。
- 校验 2026-07-28 请求元数据和 Streamable HTTP 路由 header。
- 防止 MRTR `requestState` 被篡改，并把确认绑定到精确参数。
- 按主体而不是已移除的协议会话应用授权和限流。

## 问题所在

模型读取工具描述来决定调用什么；路由器读取工具名称来决定请求去哪里；用户读取标签来决定批准什么。一份恶意描述可能同时影响这三者。

官方 MCP 安全指导说得很直接：除非描述和注解来自受信服务器，否则应视为不受信任。即使初始部署信任它，信任也可能变化。服务器更新、被攻破的包、注册表错误或网关合并，都可能改变模型看到的内容。

当前协议也改变了安全边界。2026-07-28 没有核心握手，也没有传输会话。只用 `Mcp-Session-Id` 作为审批、限流或审计历史的键，已经不是当前设计。

## 核心概念

### 值得检查的七个攻击面

不要停留在“注意安全”这种模糊要求，使用具体清单：

1. **元数据投毒。** 描述包含与声明行为无关的指令。
2. **描述 Rug Pull。** 已批准的名称、描述、schema 或注解发生变化。
3. **跨服务器遮蔽。** 两个后端暴露同一个未限定工具名，路由却静默选择其中一个。
4. **Header 与请求体混淆。** `Mcp-Method` 或 `Mcp-Name` 与 JSON-RPC 请求不一致。
5. **能力升级。** 对端声称有某项扩展或客户端功能，服务器却把声明误当成授权。
6. **MRTR 状态篡改。** 客户端修改 `requestState`、回答不同问题，或用不同参数重用确认。
7. **供应链身份混淆。** 把熟悉的展示名称当成发布者或服务器身份的证明。

这些攻击面会重叠。哈希 pin 能发现描述变化，却不能证明第一份描述本来就安全；静态扫描能抓住明显短语，却抓不住隐蔽指令；命名空间能避免一类冲突，却挡不住恶意的命名空间服务器。要叠加控制措施。

### 当前请求信封是证据，不是身份

每个 2026-07-28 请求都包含：

```json
{
  "_meta": {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientCapabilities": {
      "elicitation": {"form": {}}
    },
    "io.modelcontextprotocol/clientInfo": {
      "name": "security-lab",
      "version": "1.0.0"
    }
  }
}
```

每个请求都校验版本和能力形状，并用能力来选择兼容的响应形状。不要把 `clientInfo` 当作认证主体，它是自报信息。

同样的警告适用于结果元数据中的 `io.modelcontextprotocol/serverInfo`。它适合日志和调试，不是证书、注册表证明或授权决策。

### 在策略前校验路由

对于 `tools/call`，Streamable HTTP 包含：

```text
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: notes.export
```

Header 方法必须等于请求体方法，header 名称必须等于 `params.name`。在选择后端、应用 RBAC 或消耗限流令牌前，以 `-32020` 拒绝不一致。

这个顺序可以关闭一种常见歧义：一个组件按请求体授权，另一个组件却按 header 路由。

线上校验按一个精确顺序执行：先校验 JSON-RPC 和元数据类型，再比较 header 与请求体，最后检查匹配的版本是否受支持。header 不一致返回 HTTP 400 和 `-32020`；如果 header 与请求体一致但版本不支持，返回 HTTP 400 和 `-32022`，`data` 精确为 `{"supported":["2026-07-28"],"requested":"<actual>"}`。未知方法返回 HTTP 404 和 `-32601`。

错误对象在契约需要结构化恢复信息时才加入可选 `data`。通知没有 `id`，因此永远不会收到 JSON-RPC 成功或错误响应。接受的 HTTP 通知返回 202 和空响应体。

### Pin 完整描述

只哈希描述会遗漏 schema 和注解的变化。应规范化并哈希用户批准的完整描述字段：

```python
normalized = json.dumps(tool, sort_keys=True, separators=(",", ":"))
digest = hashlib.sha256(normalized.encode()).hexdigest()
```

在这个玩具示例之外，把摘要与发布者证据、审批时间一起存到 `notes.export` 这样的限定键下。

每次刷新时：

- 未知键：隔离，等待审核；
- 同一键但摘要不同：作为 Rug Pull 隔离，直到重新批准；
- 未限定工具名重复：要求确定性的命名空间；
- 扫描命中：阻断，并审核完整描述。

哈希相等只能证明稳定，不能证明安全。被投毒的描述即使完美 pin，仍然是被投毒的。

### 静态扫描是触发器

简单模式可以标记角色标签、指令覆盖、隐藏、秘密访问和被遮蔽的网络目的地。它们足够便宜，可以在安装时和 CI 中运行。

但它们不是语义证明。安全描述可能在合法警告中包含被标记短语，恶意描述也可能避开所有短语。把扫描结果当作审核证据，不要当作自动无罪分数。

### 合并前先命名空间化

假设两个服务器都暴露 `search`。绝不能让发现顺序决定谁胜出。

```text
notes.search
issues.search
```

限定名称就是网关的公开名称，另行记录公开名称到后端的映射。稳定名称让审批、审计、哈希 pin 和 `Mcp-Name` 路由指向同一个对象。

### 能力是兼容性声明

逐请求的 `clientCapabilities` 告诉服务器客户端能处理哪些协议功能，但不会授予客户端工具、数据或动作的访问权。

授权仍来自认证主体和资源策略。顺序是：

1. 认证传输凭据；
2. 校验版本、header 和请求形状；
3. 检查能力兼容性；
4. 授权主体、工具、资源和参数；
5. 执行，或请求用户输入。

### 保护无状态 MRTR 确认

重要工具可能需要用户确认。当前 MCP 使用 Multi Round-Trip Requests 代替服务器到客户端的回调。

第一次响应：

```json
{
  "resultType": "input_required",
  "inputRequests": {
    "confirm": {
      "method": "elicitation/create",
      "params": {
        "mode": "form",
        "message": "Export notes to archive?",
        "requestedSchema": {
          "type": "object",
          "properties": {
            "confirm": {"type": "boolean"}
          },
          "required": ["confirm"]
        }
      }
    }
  },
  "requestState": "opaque-integrity-protected-value"
}
```

客户端取得输入后，以新的 JSON-RPC id 重试原方法：

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "notes.export",
    "arguments": {"query": "private", "destination": "archive"},
    "requestState": "opaque-integrity-protected-value",
    "inputResponses": {
      "confirm": {
        "action": "accept",
        "content": {"confirm": true}
      }
    },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "elicitation": {"form": {}}
      }
    }
  }
}
```

每个 `inputRequests` 值都是带 `method` 和 `params` 的完整嵌入式请求，键必须与对应 `inputResponses` 匹配。表单 elicitation 使用对象根的 `requestedSchema`，且客户端必须在服务器请求之前声明表单能力。

当前能力有两种有效表单声明。`{"elicitation":{}}` 隐式支持表单，`{"elicitation":{"form":{}}}` 显式支持表单。只有 URL 的声明（如 `{"elicitation":{"url":{}}}`）不支持表单请求。服务器返回 HTTP 400、`-32021`，并把 `data.requiredCapabilities` 设为 `{"elicitation":{"form":{}}}`。

把 `requestState` 视为恶意输入。签名或加密它，校验它，并在需要防重放时把它绑定到方法、工具、精确参数、用途、过期时间、主体和一次性 nonce。课程代码用 HMAC 和精确参数匹配展示边界。

nonce 台账不能只放在一个网关对象里。可运行模型注入了有界、会清理过期项、并可由多个网关实例共享的重放存储。原子 claim 是执行边界：只有经过校验的接受或明确的终态拒绝才消费状态。格式错误的响应或 `cancel` 不执行任何操作，在过期前仍可重试。生产集群需要在共享持久存储中使用相同的条件 claim。

不要把隐藏确认上下文放进协议会话。任意服务器实例都应能校验重试。

### 高风险调用的 Rule of Two

沿三个维度分类调用：

- 它是否消耗不受信任输入；
- 它是否能访问敏感数据；
- 它是否会造成重要的外部动作。

单个自动步骤不应同时具备三者。应拆分、降低权限，或通过 MRTR 请求显式用户输入。这是设计启发式，而非协议能力。

### 执行前降低权限

无状态本身并不安全。它移除了隐藏协议历史，但自包含请求仍可能要求一个权限过大的处理器泄露数据或执行不可逆变化。安全来自在每个边界降低权限：

1. **类型化动词。** 暴露 `archive_note` 这样的有界操作，而不是能表达无关权限的通用 `run` 或 `request` 工具。
2. **校验参数。** 尽可能使用封闭 schema，拒绝未知字段，只规范化一次标识符，限制大小，并在策略评估前校验目标、租户和资源所有权。
3. **当前授权。** 把认证主体绑定到精确的动词、资源、环境和规范化参数。工具注解与客户端能力不授予权限。
4. **动作绑定的审批。** 对重要调用，把批准绑定到类型化动词和规范化参数的摘要、主体、过期时间及一次性策略。任何字段变化都需要新的决定。
5. **一等拒绝结果。** 把拒绝、审批过期、用户拒绝和不安全目的地建模为不执行副作用的普通结果。不要把拒绝转换为权限更弱的备用工具。
6. **脱敏审计证据。** 记录谁发起、使用了哪个已准入描述和策略版本、授权了哪个规范化目标、为何允许或拒绝，以及是否开始执行。用摘要或脱敏值替代秘密。

每一步都缩小下一个组件可以执行的范围。最终处理器应该接收已经校验的领域命令，而不是原始模型文本和宽泛凭据。MRTR 重试、任务更新或网关转发调用都要重复整条链路；先前的审批不会把后续请求变成可信会话流量。

### 当前路径与旧版路径

Roots、Sampling 和 Logging 对新的 2026-07-28 实现都已弃用。网关可以保留旧的请求通道代码，但只能放在按版本选择的兼容路径中。

不要围绕每会话 Sampling 限流器设计新防御。应按认证主体、发行方、资源、工具和时间窗口应用配额。当前交互工作检查 MRTR 输入请求和响应。

### 无状态传输检查

- 在单一 POST 端点接受现代 MCP 消息；
- 对现代 GET 和 DELETE 返回 405；
- 不生成也不依赖 `Mcp-Session-Id`；
- 不把旧版会话和重放 header 当作授权输入；
- 对该 POST 返回 JSON 或请求级 SSE；
- 仅对选择加入的长期变更通知使用 `subscriptions/listen`。

```figure
tp-tool-poisoning
```

## 动手构建

`code/main.py` 实现一个小型进程内安全网关模型。它规范化并 pin 完整工具描述，报告元数据投毒和遮蔽，校验现代请求信封及路由值，并使用注入的共享重放存储执行带签名 `requestState` 的两轮确认导出。

模型从 HTTP 适配器已经解析好的 JSON 请求体和路由 header 开始，不校验 `Content-Type` 或 `Accept`。将同一个 dispatcher 接入第 09 课的完整 Streamable HTTP 适配器；该适配器要求 `Content-Type: application/json`，且 `Accept` 同时包含 `application/json` 和 `text/event-stream`。

运行：

```bash
cd phases/13-tools-and-protocols/15-mcp-security-tool-poisoning
python3 code/main.py
python3 -m unittest discover code/tests -v
```

示例会刻意修改一个描述。扫描器和摘要比较会产生相互独立的发现，随后导出流程演示 `input_required` 响应和无状态重试。

## 使用

用自己已批准服务器的规范化快照替换 `SAFE_TOOLS`，不要把凭据和秘密放进快照。每次新增或变更描述，都要在更新摘要前审核。

在网关中，发现期间和分发前都运行同一套检查。缓存可以减少发现开销，但描述变化时，缓存的审批必须过期或失效。

## 交付

本课交付 `outputs/skill-mcp-threat-model.md`。它针对元数据、路由、能力、授权、MRTR、缓存、注册表和兼容性边界生成当前协议威胁模型。

## 练习

1. 将认证主体和当前授权决策绑定到封存的 MRTR 状态，然后拒绝不同主体下的重试。
2. 用持久化条件插入替换内存重放存储，证明两个进程不能同时 claim 一个 nonce。
3. 模拟重放 claim 后、导出前失败的情况。定义并测试事务或幂等规则，让恢复过程安全。
4. 改变工具的 `inputSchema` 但不改变描述，确认完整描述 pin 能捕获变化。
5. 增加策略：当 `tools/list` 因主体而异时，拒绝公开缓存。
6. 在网关后方建模一个旧版服务器，把所有握手和会话行为放进显式的 `2025-11-25` 兼容分支。

## 关键术语

| 术语 | 含义 |
|------|------|
| 元数据投毒 | 工具描述中嵌入的指令或欺骗性声明 |
| Rug Pull | 已批准描述发生变化 |
| 工具遮蔽 | 重复未限定名称造成的路由歧义 |
| Header 不匹配 | 路由 header 与 JSON-RPC 请求体不一致，错误 `-32020` |
| 哈希 pin | 完整已批准描述的摘要 |
| MRTR | 服务器请求输入时使用的无状态响应与重试模式 |
| `requestState` | 必须视为不受信任输入的不透明往返值 |
| 能力声明 | 协议兼容性声明，不是授权 |
| 隐式表单支持 | 空的 `elicitation` 能力对象，等价于表单支持 |
| 限定工具名 | `notes.search` 这样的稳定网关名称 |

## 延伸阅读

- [MCP 安全与信任指导](https://modelcontextprotocol.io/specification/2026-07-28#security-and-trust--safety)
- [Multi Round-Trip Requests](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [Streamable HTTP 传输](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [已弃用功能](https://modelcontextprotocol.io/specification/2026-07-28/deprecated)
