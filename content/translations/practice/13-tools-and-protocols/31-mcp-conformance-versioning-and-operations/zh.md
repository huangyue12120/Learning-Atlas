---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: fa7b16e90177a54f5ee0adb5c8a0d471a454074dda0ba277dc93b0e6abe28d57
status: reviewed
---

# MCP 一致性工程：版本、证据与运维

> 服务器并不会因为一次 SDK 快乐路径成功就符合规范。一致性存在于线上字节、版本边界、中间层以及回滚过程之中。

**类型：** 构建
**语言：** Python
**前置课程：** Phase 13 · 第 09 课（传输）、第 17 课（网关）、第 30 课（Registry 准入）
**预计时间：** 约 100 分钟

## 学习目标

- 将 MCP 的规范性规则转化为正向和负向线上记录。
- 将严格的 `2026-07-28` 行为与有界的旧版回退分开。
- 区分可加性的未知字段与无效的未知 `resultType`。
- 对比原始 JSON-RPC 证据与 SDK 归一化视图。
- 通过真实代理边界证明 header 与 body 的完整性。
- 使用脱敏的 transcript、健康和回滚证据控制发布。

## 问题所在

你的客户端通过 SDK 调用 `tools/list` 并得到工具，集成测试通过了。

这个结果没有回答几个重要问题：

- 请求是否携带了现代的逐请求协议元数据？
- `MCP-Protocol-Version`、`Mcp-Method` 和 `Mcp-Name` 是否与 JSON-RPC body 一致？
- 线上响应是否包含有效的 `resultType`，还是 SDK 自己补出来的？
- 客户端是否会保留未来新增的字段？
- 已识别的现代错误是否会意外触发旧版握手？
- 代理是否保留了 origin 的状态码和 JSON-RPC 错误？
- 通知序列化器是否发出了不允许的响应？
- 运维是否能在不保存 secret 的情况下证明为何发布被提升或回滚？

一致性是一组可观察的不变量。应在生产流量必须发现这些问题之前，构建一个捕获这些不变量的 harness。

```figure
mcp-conformance-operations
```

## 从版本时代开始

MCP `2026-07-28` 使用自包含的逐请求元数据。现代请求携带 `params._meta.io.modelcontextprotocol/protocolVersion` 和 `params._meta.io.modelcontextprotocol/clientCapabilities`。命名空间 key 必须完全匹配；裸的 `protocolVersion` 或 `clientCapabilities` 别名属于格式错误。当 HTTP 边界存在镜像路由 header 时，header 值必须与 JSON-RPC body 一致。现代成功结果携带 `resultType`。

截至 `2025-11-25` 的版本使用较早的初始化时代。只有在客户端选择了那个较早时代后，不带 `resultType` 的旧版结果才会被解释为 complete。

不要创建一个同时宽松接受两种形状的 validator。使用两条分支：

| 分支 | 入口证据 | 缺少 `resultType` | 初始化 |
|---|---|---|---|
| Modern | 成功的 `server/discover` 或已识别的现代响应 | 无效 | 不是默认路径 |
| Legacy | 配置的 allowlist，加上现代探测没有结论后得到的有效旧版 `initialize` 结果 | 解释为 complete | 该时代要求 |

分开校验可以防止格式错误的现代 peer 因较弱的校验而获得好处。

### 严格模式

严格模式要求现代行为的证明。成功的 `server/discover` 证明现代分支；已识别的现代 JSON-RPC 错误也能证明现代分支。此时应修正请求或停止，绝不能因为服务器返回 `-32020`、`-32021` 或 `-32022` 就降级。

### 回退模式

回退模式只进行一次有界的现代探测。超时、空响应、连接关闭或无法识别的响应都属于没有结论，但不能证明 peer 是旧版。只有显式配置或加入兼容 allowlist 的 endpoint 才可以随后接受有界的旧版探测；而且只有验证了该探测的 `initialize` 结果和协商出的旧版 revision 后，客户端才能选择旧版分支。

回退不是“任何错误后都试旧版”。已识别的现代错误包含有用的修正信息；在此之后降级会掩盖 header 不匹配、能力声明缺失或版本不支持。

这可以防止攻击者、故障或过滤代理通过丢弃现代响应来强迫降级。应把 endpoint 策略、现代探测的无结论观察、精确的旧版正向证据和选中的时代一起记录。

在每份 transcript 旁记录选中的时代。没有这个事实，同一个缺失字段在一次测试中可能看似可接受，在另一次测试中却是无效。

## 构建 transcript 语料库

transcript fixture 记录跨过边界的内容，而不只是 SDK 调用：

```json
{
  "name": "golden-modern-list",
  "era": "modern",
  "headers": {
    "MCP-Protocol-Version": "2026-07-28",
    "Mcp-Method": "tools/list"
  },
  "request": {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {
      "_meta": {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": {}
      }
    }
  },
  "responseStatus": 200,
  "responseBody": {
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
      "resultType": "complete",
      "tools": []
    }
  }
}
```

保留两类 fixture。

### 正向 transcript

正向 transcript 证明行为被接受：

- 带匹配元数据和 header 的现代发现或方法请求；
- 包含必需字段的 complete 结果；
- 方法能够请求更多输入时的 `input_required` 结果；
- 只有在对应能力已声明后出现的扩展结果；
- 已选择旧版时代下不带 `resultType` 的旧版结果；
- 没有 JSON-RPC 响应的通知处理。

正向 transcript 应精确而不是庞大。将易变的 ID 和时间戳设为确定值，或在比较前归一化。

### 负向 transcript

负向 transcript 证明拒绝行为：

- header 与 body 不匹配；
- 缺少逐请求能力；
- 匹配但不支持的协议版本；
- 现代结果缺少 `resultType`；
- 未知或未声明的 `resultType`；
- 响应 `jsonrpc` 不是 `2.0`，或 ID 的值或 JSON 类型不同；
- 同时包含 `result` 和 `error`，或两者都没有的响应；
- error 没有整数 `code` 或字符串 `message`；
- 已知协议错误映射到了错误的 HTTP 状态；
- 为通知发出了响应；
- 格式错误的 JSON-RPC envelope；
- 代理吞掉协议错误。

对每个负向 case 断言拒绝边界和稳定错误码。“调用失败了”太弱。代理生成的 500 与 origin 的 `-32020` 都可能看起来像失败，但它们给运维的信息完全不同。

header mismatch fixture 必须包含服务器实际发出的 HTTP 400 JSON-RPC 响应，其中 request ID 匹配，错误码为 `-32020`。只要本地 validator 观察到 `HeaderMismatch`，就自动强制执行这一点，不要把响应检查做成可选 fixture flag。即使本地拒绝码正确，HTTP 500 且没有 body 的 case 仍然失败。在抛出自己的请求验证异常后就停止的 harness，只测试了自己，并没有测试服务器线上行为。

官方 MCP 一致性项目可作为外部套件和版本化参考，但本地 transcript 仍要保留。它们捕获你的代理、SDK、认证、扩展和发布路径，这是通用套件无法知道的。

## Header 值必须与 RPC body 一致

在现代 Streamable HTTP 中，中间层可以使用镜像 header 路由或执行策略。JSON-RPC body 仍是协议真相源。不匹配是完整性失败，不是从两个值中任选一个的提示。

按以下顺序校验：

1. 解析并校验 JSON-RPC envelope 及元数据类型。
2. 将 `MCP-Protocol-Version` 与 `params._meta.io.modelcontextprotocol/protocolVersion` 比较。
3. 将 `Mcp-Method` 与 `method` 比较。
4. 方法具有路由名称时，将 `Mcp-Name` 与 body 中对应值比较。
5. 确认相等后，再判断匹配的版本和能力集合是否受支持。

这个顺序可以区分 mismatch `-32020` 与不支持的版本 `-32022`，也能阻止网关根据 header 名称授权、却让 origin 执行另一个 body 名称。

HTTP field name 不区分大小写，但 value 仍区分大小写。查找前先归一化 header name，并拒绝冲突的重复项。对于不安全、非 ASCII 或首尾带空白的 `Mcp-Name`，比较 body 前先准确解码 `=?base64?{Base64EncodedValue}?=` UTF-8 sentinel。sentinel 不完整、Base64 无效、UTF-8 无效或直接传输不安全原值，都要以 `-32020` 拒绝。即使 body 也包含同样的空白，原始外围空白仍无效，因为该值在传输前必须使用 sentinel 编码。

中间层可能在请求抵达 MCP 服务器前就拒绝格式错误的 HTTP，因此它的失败可能只有 HTTP 错误而没有 JSON-RPC。要记录拒绝来自中间层还是 origin。origin MCP 服务器处理了有效 JSON-RPC 请求时，应使用协议错误契约。

## 未知字段不等于未知结果

向前兼容需要两条不同规则。

### 可加的未知字段

结果对象和 `_meta` map 可以新增字段。除非新增字段违反保留契约，validator 应按字段角色保留或忽略它。示例会在证据中保留完整原始结果，并接受已知结果旁的 `futureHint`。

如果你是透明代理，保留未知字段通常比删除更安全；如果你是应用客户端，忽略它可能合法。但差分测试仍应揭示 SDK 丢弃了它，使这一行为成为明确决定。

### 未知 `resultType`

`resultType` 是 discriminator。现代核心结果使用 `complete` 或 `input_required`。扩展只有在相应能力已声明时才能增加另一个值；例如 Tasks 扩展可以在协商出的能力上下文中增加 `task`。

未知或未声明的 discriminator 不能安全地当作 complete。客户端不知道自己会丢弃哪一种生命周期，因此应拒绝。

所以，同一个原始响应可以同时含有可接受的未知字段和不可接受的未知结果类型。两种情况都要测试。

discriminator 只是第一层。之后还要校验方法特定的 payload。完整的 `tools/list` 结果需要 `tools` 数组，其中 descriptor 的名称非空且唯一、描述有用，并且 `inputSchema` 根为 object。`task` 结果只有在启用了 Tasks 能力且方法是合格的 `tools/call` 时才有效，并要求 `taskId`、已知状态、创建及更新时间戳、`ttlMs`，以及合法的可选轮询间隔。完整的 `completion/complete` 结果需要 `completion` 对象、最多 100 个字符串值、可选的非负整数 `total`（不能小于返回值数量）和可选 Boolean `hasMore`。拼写正确的 `resultType` 不能让格式错误的 payload 变得符合规范。

## 通知不变量

JSON-RPC 通知没有 `id`。接收方不得发送 JSON-RPC 成功或错误响应。

对于接受的 HTTP 通知形状，harness 期待 HTTP `202` 和空 body。MCP `2026-07-28` 没有定义基于 Streamable HTTP 的核心客户端到服务器通知。示例只使用命名空间化的课程扩展通知来测试单向序列化不变量，不要把它描述为新的核心方法。

测试 serializer，而不只是 handler。handler 可以返回 `None`，但 middleware 仍可能包成 JSON success object。要捕获最终发出的字节。

## 增加 SDK 差分

SDK 往往将线上对象转换为方便的语言类型。这很有用，但归一化对象不能证明线上实际收到的内容。

对每个高风险 fixture，捕获：

1. SDK 解码前的原始状态、header 和响应 body；
2. SDK 归一化后的返回值或异常；
3. 所选时代对应的预期语义投影；
4. 被 SDK 提取、合成、删除或改变的字段。

示例在比较应用 payload 时允许 SDK 删除已知线上 bookkeeping，如 `resultType`、`_meta`、`ttlMs` 和 `cacheScope`，但会报告 `futureHint` 被删除，因为它是未知语义字段。

不要假设每个差异都是 SDK bug。重点是让转换可见。决定你的组件是可以忽略新增字段的应用 endpoint，还是必须保留字段的透明中间层。

对实际发布的每个 SDK 和版本运行差分。如果两个 SDK 对同一 transcript 的归一化不同，发布策略应说明哪种行为可接受，而不是在事后选择最方便的输出。

## 捕获代理证据

多数生产 MCP 故障跨越不止一个进程。记录三个视角：

| 视角 | 最低证据 |
|---|---|
| Ingress | 请求 header、JSON-RPC body、content type、已认证路由、接收时间 |
| Origin | 转发的 header 和 body 摘要、origin 状态、响应 header 和 body |
| Egress | 客户端可见的状态、header、body、发送时间 |

示例检测两种常见转换：

- origin HTTP 400 或 404 JSON-RPC 错误变成普通代理 500；
- egress JSON-RPC body 与 origin body 不同。

根据部署增加对 content type、`Accept`、压缩、逐请求 SSE、缓存 header 和 trace 关联的断言。在策略允许时捕获 TLS 终止两侧。不要仅为证明路径而记录凭据。

## 证据离开内存前先脱敏

脱敏属于一致性运维，而不是事后清理。应在序列化、哈希、日志、测试 artifact 或失败上传之前执行。

示例对 key 名称折叠大小写并移除分隔符后再匹配，然后递归替换 `Authorization`、`Cookie`、`Set-Cookie`、`X-Api-Key`、`accessToken`、`clientSecret`、`registrationAccessToken`、`token`、`password`、`secret` 和 `api_key` 等 key 下的值。规范化和 denylist 必须使用同样的形式，确保 camelCase、连字符、下划线和点号变体不能互相绕过。生产 collector 还应加入方法特定的参数策略，因为看似无害的 `query` 也可能包含个人或受监管数据。

对脱敏后的证据包哈希。只有在特定调查需要时，才在获批的短期系统中保留原始捕获。摘要能证明哪一份脱敏包驱动了决策，但不会泄露被删除的值。

## 让健康与回滚成为门禁的一部分

协议一致性是发布必要条件，但不是充分条件。符合规范的候选版本仍可能超时、泄漏内存或压垮依赖。

发布前定义健康窗口：

- 最小样本量；
- 最大错误率；
- 最大延迟分位数；
- 饱和度或资源限制；
- 观察时长；
- 与已准入基线的比较。

发布前也要定义回滚证据：

- 精确的前一版本；
- 准入证据摘要；
- 构件和 descriptor 的 SHA-256 pin；
- 当前 Registry 状态；
- 当前健康结果；
- 路由恢复过程；
- 可信 release-controller 身份对这些精确字段的证明。

要求回滚目标在提升前就已经验证且健康，而不只是在候选失败后才验证。没有可用恢复路径的成功发布不是生产就绪。

如果候选失败而回滚目标缺少证据，应暂停流量，不要猜测。“回滚到之前那个东西”不是运维控制。

不要把 readiness 简化为非空版本、`healthy: "yes"` 或任意非空 evidence string 这样的 truthiness 检查。示例要求精确类型、active 状态、三个 SHA-256 摘要、可信签名者，以及针对完整回滚 payload 的有效 HMAC-SHA-256 证明。示例中的确定性 demo key 是非 secret fixture；生产环境应在发布边界注入受保护 key、KMS 验证结果或公钥证明验证器。

发布门禁也会拒绝空的 transcript、SDK 差分或代理证据。每个来源都必须携带有效的证据摘要。绿色健康窗口不能补齐从未观察到的边界。

## 构建它

运行标准库 harness：

```bash
cd phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations
python3 code/main.py
```

演示会运行恰好十五个正向和负向 transcript，包括有效及格式错误的 completion 结果；比较原始结果与 SDK 视图；检查吞掉 origin 错误的代理；评估健康情况；验证回滚证据；并选择该目标。

预期形状：

```json
{
  "transcriptsPassed": 15,
  "transcriptsTotal": 15,
  "sdkDroppedFields": ["futureHint"],
  "proxyIssues": [
    "proxy collapsed a protocol error into HTTP 500",
    "proxy changed the origin JSON-RPC body"
  ],
  "releaseAction": "rollback",
  "evidenceDigest": "..."
}
```

按以下顺序阅读 `code/main.py`：

1. `validate_request()` 执行按时代区分的请求和 header 规则。
2. `validate_result()` 区分缺失的旧版 discriminator、有效现代值、扩展和未知值。
3. `select_era()` 实现严格和有界的回退策略。
4. `run_transcript()` 评估正向与负向 fixture。
5. `compare_sdk_view()` 暴露归一化差异。
6. `inspect_proxy()` 比较 ingress、origin 和 egress 证据。
7. `redact()` 在证据哈希前删除明显 secret。
8. `rollback_evidence_ready()` 校验精确 pin 字段和可信发布证明。
9. `ReleaseGate.evaluate()` 汇合非空的一致性、SDK、代理、健康和回滚证据。

## 使用它

在四个时点运行 harness：

1. 每次实现变化时，用进程内测试 adapter；
2. 通过真实传输运行构建出的客户端和服务器 binary；
3. 在 staging 环境通过已部署的代理或网关；
4. 在 canary 发布期间结合实时健康和回滚证据。

在各层使用相同的稳定 case 名称。`negative-header-body-mismatch` 在单元测试、端到端、代理和 canary 报告中应代表同一个不变量。证据摘要会因边界改变而不同，但要求不应改变。

将 fixture schema 纳入版本控制，将脱敏运行证据保存到发布系统，原始短期捕获只放在事故访问控制之下。

## 交互实验

### 实验 A：证明时代边界

从 code 目录打开 Python：

```bash
cd phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations/code
python3 -q
```

运行：

```python
from main import *
validate_result({"tools": []}, "legacy")
validate_result({"tools": []}, "modern")
```

旧版调用会推断 `complete`；现代调用会抛出 `ProtocolViolation`。然后测试回退：

```python
select_era({"kind": "timeout"}, "fallback")
select_era(
    {"kind": "timeout"},
    "fallback",
    legacy_allowed=True,
    legacy_evidence={"kind": "initialize_success", "protocolVersion": LEGACY_VERSION},
)
select_era({"kind": "jsonrpc_error", "code": -32021}, "fallback")
```

第一次超时会 fail closed，因为沉默不是旧版证据。第二次调用只有在配置允许且观察到有效旧版初始化结果时才选择旧版。已识别的现代错误证明现代分支。

### 实验 B：新增字段与 discriminator

```python
validate_result({"resultType": "complete", "tools": [], "futureHint": True}, "modern")
validate_result({"resultType": "future_mode", "tools": []}, "modern")
```

第一个结果会保留 `futureHint`；第二个会被拒绝，因为生命周期 discriminator 未知。

### 实验 C：检查 SDK 转换

```python
compare_sdk_view(
    {"resultType": "complete", "tools": [], "futureHint": {"mode": "new"}},
    {"tools": []},
)
```

决定你的组件可以忽略 `futureHint`，还是必须转发它，并把选择写入发布策略。不要静默删除差分。

### 实验 D：修复代理

修改 demo exchange，让 egress 保留 origin 状态和 body。再次运行 `python3 main.py`。代理问题应消失，但 SDK 差分仍会阻止提升。然后把 `futureHint` 加入 SDK 视图；当每个证据来源都通过时，观察 action 变为 `promote`。

## 实践实验

为 harness 增加逐请求 SSE transcript。

要求：

- 捕获响应状态、content type、有序 SSE 事件和流终止；
- 证明每个 JSON-RPC 事件都有有效的、符合时代的结果或错误；
- 为在转发前缓存完整流的代理增加负向 case；
- 为 JSON-RPC id 与请求不同的 SSE 事件增加负向 case；
- 在写入证据前脱敏事件数据；
- 在健康窗口中加入流时长、首事件延迟和事件数量；
- 流失败时让发布门禁只选择有证据的回滚目标。

成功标准是：同一 case 能直接运行，也能经代理运行，并且报告能指出行为发生变化的精确边界。

## 随课交付物

本课提供 `outputs/skill-mcp-conformance-release-gate.md`。用它把服务器、客户端、网关或 SDK 变化转化为版本化一致性矩阵和发布决策。该 artifact 要求原始线上证据、负向 case、显式时代选择、SDK 差分、代理证明、脱敏、健康阈值和回滚证据。

## 验证它

运行 demo 和确定性测试：

```bash
cd phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应证明：

- 每个包含的正向和负向 transcript 都得到预期结果；
- 现代请求要求精确的命名空间元数据 key；
- HTTP header name 不区分大小写，编码的 `Mcp-Name` 值会被准确解码；
- header 与 body 不匹配时返回现代 mismatch code；
- 校验响应版本、ID、result/error 互斥性、error 形状及 HTTP 映射；
- 强制工具列表、Task 和 completion payload 的方法特定要求；
- 每个观察到的 `HeaderMismatch` 都要求真实 HTTP 400 JSON-RPC `-32020` 响应；
- 拒绝原始 `Mcp-Name` 空白，而精确 sentinel 编码的空白可以往返；
- 缺失 `resultType` 只在选中的旧版时代有效；
- 原始校验保留新增字段，同时拒绝未知结果类型；
- 扩展结果类型需要已声明的能力；
- 已识别的现代错误绝不会触发旧版回退；
- 通知不会产生 JSON-RPC 响应；
- 区分 SDK 删除 bookkeeping 与丢失语义字段；
- 检测代理吞掉错误，并对 camelCase 和各种分隔符变体递归脱敏凭据；
- 提升需要非空的 transcript、SDK、代理和健康运维证据；
- 提升和回滚都需要经过认证、已 pin、active 且健康的回滚目标。

## 生产失败模式

| 失败 | 弱测试报告 | harness 必须证明 |
|---|---|---|
| SDK 合成缺失的 discriminator | “tools/list 通过了” | 原始现代结果缺少 `resultType`，因此无效 |
| 客户端在 `-32021` 后降级 | “旧版重试成功了” | 已识别的现代错误禁止回退 |
| 把未知结果类型当作 complete | “响应已解析” | 未声明的生命周期 discriminator 被拒绝 |
| 代理授权一个工具、origin 执行另一个 | “请求抵达服务器” | 每一跳的 `Mcp-Name` 都等于 body 路由名称 |
| harness 在读取服务器响应前抛异常 | “header mismatch 测试通过” | 捕获并校验 HTTP 400 和 JSON-RPC `-32020` 响应 |
| 代理把 origin 400 变为普通 500 | “上游错误” | 保留 origin 和 egress 的状态及 JSON-RPC body |
| 通知 middleware 发出 `{result: null}` | “handler 返回 none” | 最终 egress body 为空且没有 JSON-RPC 响应 |
| SDK 删除新增字段 | “类型化对象相同” | 原始和归一化视图显示被删除的精确字段 |
| 失败 artifact 泄漏 bearer token | “调试包已上传” | 哈希、日志或上传前已经脱敏 |
| 凭据 key 写法绕过脱敏 | “denylist 有 api_key” | camelCase 和分隔符变体使用同一规范化 denylist |
| canary 没有样本却看似健康 | “错误数为零” | 强制最小样本量 |
| 回滚选择未知构建 | “已恢复之前部署” | 目标版本、准入摘要、pin、状态和健康证据都存在 |

## 运维规则

测试你发出的字节、每个中间层转发的字节、每个 SDK 暴露的语义，以及运维在压力下会使用的证据。兼容性必须是显式分支，回滚必须是有证据的发布动作；两者都不应成为宽松解析器的意外副作用。

## 延伸阅读

- [MCP 2026-07-28 base protocol](https://modelcontextprotocol.io/specification/2026-07-28/basic)
- [MCP version negotiation](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [Official MCP conformance project](https://github.com/modelcontextprotocol/conformance)
