---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 713a0c2c7a28774c61b59756221528c57dbae1361521967d95ac7647a98f7864
status: reviewed
---

# MCP 工具契约与内容

> 只有当发现、参数、结果、分页和传输元数据共同遵守同一份契约时，工具才适合自动化。

**类型：** 构建
**语言：** Python
**前置课程：** Phase 13 · 第 07、09、10 课
**预计时间：** 约 120 分钟

## 学习目标

- 使用 JSON Schema 2020-12 定义工具输入和输出。
- 在不假设结果一定是 JSON 对象的情况下校验结构化结果。
- 在 text、image、audio、resource link 和 embedded resource 之间做选择。
- 在工具到达模型前拒绝不安全的 `x-mcp-header` 定义。
- 编码参数头的值，并验证 header 与 body 完全一致。
- 遍历游标分页，但不解释游标值。
- 对 `completion/complete` 建议进行范围限制和授权。

## 问题所在

调用 Python 函数很容易；通过 AI 宿主调用远程能力，则是一个契约问题。

服务器发布描述符，客户端把描述符变成模型上下文和用户界面，模型生成参数，网关可能根据镜像 header 路由请求，服务器执行工具，客户端最后决定结果是否安全且有效到足以返回模型。

任意一个边界薄弱，整条链路都会被污染。

常见失败包括：

- 描述符说结果是对象，但服务器返回数组；
- 客户端在 `nextCursor` 为空字符串时停止分页；
- token 参数被镜像到 HTTP header，因而暴露给中间层；
- Unicode 路由值以原始 header 发送，网关和 origin 解释出不同字节；
- completion endpoint 向没有权限的调用方建议 production 环境。

更好的提示词不能修复这些问题，它们需要显式的协议和应用契约。

## 契约流水线

把每次工具调用视为五道门：

1. **发现：** 读取确定性、带分页的工具列表。
2. **准入：** 校验每个描述符并应用本地安全策略。
3. **调用：** 校验参数并构建传输元数据。
4. **执行：** 运行 handler，并正确分类失败。
5. **消费：** 在模型使用前校验内容块和结构化输出。

```figure
mcp-contract-pipeline
```

宿主拥有准入和消费两道门。服务器不能强迫客户端信任自己的注解、schema 或输出。

## JSON Schema 是运行时边界

在 MCP `2026-07-28` 中，`inputSchema` 和 `outputSchema` 使用 JSON Schema；没有 `$schema` 时，默认方言是 2020-12。

输入 schema 必须是 schema 对象。即使工具没有参数，也要精确声明接受什么：

```json
{
  "type": "object",
  "additionalProperties": false
}
```

这比 `{ "type": "object" }` 更严格，后者接受任意属性。

输出 schema 是可选的。一旦服务器发布了它，每个完整工具结果都承诺返回符合 schema 的 `structuredContent`，包括 `isError: true` 的结果。错误标志用于分类执行结果，并不会豁免发布的输出契约。客户端应该校验结果，而不是盲目信任描述符。

### 结构化内容可以是任意 JSON 值

不要把 `structuredContent` 写死为字典。它可以是：

- 对象；
- 数组；
- 字符串；
- 数字；
- 布尔值；
- `null`。

以下工具返回一个数组：

```json
{
  "name": "tag_catalog",
  "inputSchema": {
    "type": "object",
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "array",
    "items": {"type": "string"}
  }
}
```

它的成功结果是合法的：

```json
{
  "resultType": "complete",
  "content": [
    {
      "type": "text",
      "text": "[\"contracts\", \"mcp\", \"stateless\"]"
    }
  ],
  "structuredContent": ["contracts", "mcp", "stateless"],
  "isError": false
}
```

为兼容性考虑，结构化结果也应在 text block 中包含序列化 JSON。text 不是校验来源，`structuredContent` 才是。

### 小型校验器仍能说明边界

由于课程坚持 Python 标准库，实验使用有意缩小的 JSON Schema 子集。它检查示例工具用到的机制：object、array、string、integer、number、boolean、null 类型；必需属性；`additionalProperties: false`；数组 items；枚举值；以及字符串最小长度。

这不是完整的生产校验器。可复用的重点是校验时机：发现后校验描述符，执行前校验参数，消费前校验结构化结果。

## 内容块的成本不同

`content` 数组可以组合多种内容类型。

| 类型 | 用途 | 主要边界 |
|------|------|----------|
| `text` | 人和模型可读的摘要 | 将文本当作不受信任输出 |
| `image` | base64 编码的视觉证据 | 校验媒体类型和大小 |
| `audio` | base64 编码的语音或录音输出 | 校验媒体类型和时长限制 |
| `resource_link` | 客户端之后可以获取的 URI | 后续读取资源时重新授权 |
| `resource` | 直接嵌入结果的数据 | 现在就执行 payload 和内容限制 |

resource link 不能证明资源出现在 `resources/list` 中，它只是本次工具调用返回的引用。客户端跟随 URI 时，仍需应用资源策略。

embedded resource 不需要再次往返，但会增加当前响应大小。大型或独立变化的构件使用 link；必须与结果原子传输的小型证据使用 embedded resource。

本课的 `evidence_bundle` 结果包含全部五种类型；客户端会在接受结果前逐个校验内容块。

## `x-mcp-header` 是路由元数据

`inputSchema` 中的属性可以声明 `x-mcp-header`。通过 Streamable HTTP 时，客户端会把该参数镜像到 `Mcp-Param-{name}`。

```json
{
  "region": {
    "type": "string",
    "x-mcp-header": "Region"
  }
}
```

如果 `region: "eu-west"`，传输层可以发送：

```http
Mcp-Param-Region: eu-west
```

这个注解让负载均衡器、网关或策略引擎无需解析 JSON body 就能路由，但不是放凭据的地方。

协议对注解施加以下限制：

- header 名非空，并符合 HTTP field-name token 语法；
- 不区分大小写时 header 名仍必须唯一；
- 属性类型为 string、integer 或 boolean；
- 不允许 `number`；
- 注解只能位于 `inputSchema.properties` 的直接成员；
- integer 值必须位于 `-9007199254740991` 到 `9007199254740991`。

位置规则是语法规则，且必须 fail-closed。遍历整个 schema 树，而不只是校验器碰巧理解的 properties。拒绝嵌套对象的 `properties`、`oneOf` 分支、`items`、通过 `$ref` 到达的定义或任何 output schema 下的注解。解析引用不会把被引用节点变成顶层直接属性。

本课增加一条部署策略：拒绝镜像 `password`、`secret`、`token`、`api_key` 或 `authorization` 等名称的描述符。官方规范建议服务器作者不要镜像敏感参数；客户端可以将这个建议变成硬准入规则。

审计 header 名，不审计 header 值。示例代码记录 `Mcp-Param-Region`，但不会把 `eu-west` 写进审计事件。

### 构建 HTTP header 前先编码值

参数值只有在满足以下条件时才能作为普通文本传输：它是非空的可见 ASCII 字符串，字符范围从 `!` 到 `~`，并且看起来不像编码 sentinel。其他所有值都使用以下形式：

```text
=?base64?{Base64UTF8}?=
```

`Base64UTF8` 是对原始 UTF-8 字节执行标准 base64 的结果。不要先 trim、标准化或替换值。Unicode、空字符串、空格、tab、控制字符、CR/LF、首尾空白，以及以 `=?base64?` 开头的值都必须编码。看起来像 sentinel 的值要再次编码，这样接收端才能恢复原始字面文本，而不会把它当作传输语法解码。

布尔值编码为小写 `true` 或 `false`；整数用十进制表示，并且必须位于 JavaScript 安全整数范围内。超出范围的值要拒绝，不能任由中间层四舍五入。

### 服务器检查镜像副本

生成 header 只是客户端的一半。在 Streamable HTTP 边界，服务器必须：

1. 不区分 header 名大小写地找到已识别的 `Mcp-Param-*` 名称；
2. 若出现精确 base64 sentinel，则解码它；
3. 将解码文本与 JSON body 中对应参数精确比较；
4. 在 dispatch 前拒绝缺失、重复、意外、格式错误或不匹配的已识别 header。

拒绝应返回 HTTP `400` 和 JSON-RPC 错误码 `-32020`。body 值及其编码形式都不应写入审计记录，只记录已识别的 header 名和拒绝类别。

`code/main.py` 直接模拟这条边界。[第 09 课](../../09-mcp-transports/)介绍更广泛的 Streamable HTTP 校验顺序，包括 method 与协议版本的一致性。

## 分页游标是不透明的

MCP 列表操作使用游标分页。服务器决定页面大小和游标格式，客户端只有一个决定：

```python
if result.get("nextCursor") is None:
    break
cursor = result["nextCursor"]
```

不要这样写：

```python
if not result.get("nextCursor"):
    break
```

空字符串是合法游标；用 truthiness 会过早停止。

客户端不得解码游标、递增游标、将游标与旧值比较顺序，或推断页码。服务器可以给游标签名、将它绑定到目录版本，或把它映射到私有状态；这些都是服务器实现细节。

示例服务器会在第一页后刻意返回 `""`。客户端必须在第二个请求中原样发送它：

```text
<first request with no cursor>
<second request with cursor "">
```

无效游标产生 JSON-RPC invalid params，错误码为 `-32602`。

## Completion 是授权边界

`completion/complete` 为 prompt 参数和 resource-template 参数提供建议。它对交互式表单很有用，但可能泄漏普通 list 方法会保护的名称。

completion 请求指定要补全的引用和参数：

```json
{
  "method": "completion/complete",
  "params": {
    "ref": {
      "type": "ref/prompt",
      "name": "deployment_review"
    },
    "argument": {
      "name": "environment",
      "value": "st"
    }
  }
}
```

结果最多返回 100 个值，也可以报告 `total` 和 `hasMore`。

使用与被引用 prompt 或资源相同的授权边界。示例中的 analyst 能得到 `development` 和 `staging`，只有 operator 能得到 `production`。

生产 completion 还需要输入校验、面向调用方的过滤、客户端请求去抖、服务器限流、有界的结果数量，以及不暴露敏感建议值的日志。

Completion 是辅助，不是绕过发现和授权的入口。

## 两层错误

将协议错误与工具执行错误分开。

当 MCP 请求无法正确 dispatch 时，使用 JSON-RPC error，例如未知工具名称、请求形状错误、缺少请求元数据或无效游标。

当调用已经到达工具，而工具报告了可处理失败时，使用带 `isError: true` 的完整工具结果，例如报告来源不可用、日期超出支持范围或业务规则拒绝操作。

模型通常能修复工具执行错误，却不能修复服务器违反自身输出 schema 的问题。

如果工具声明了 output schema，就在该 schema 内表示可处理失败。示例 `route_report` 失败会返回请求的 region 和 `accepted: false`，同时附带人类可读的错误文本与 `isError: true`。

## 动手构建

`code/main.py` 用 Python 标准库构建边界两侧。

服务器实现：每请求 MCP 元数据校验、带 tools 和 completions 能力的 `server/discover`、确定性的 `tools/list` 分页、四个工具描述符（其中一个必须被拒绝）、数组结构化输出、当前所有工具内容块类型，以及 Streamable HTTP parity gate。该 gate 会解码已识别参数 header，在不匹配时返回 HTTP `400` 和 JSON-RPC `-32020`，并提供已授权且限流的 completion。

客户端实现：描述符准入、完整 schema 树中的 `x-mcp-header` 位置校验与敏感字段策略、普通可见 ASCII 或 base64 UTF-8 的精确编码、跟随空字符串的不透明游标循环、参数和结果校验、内容块校验，以及只含名称不含值的 header 审计事件。

故意不安全的描述符只是教学数据，它证明一个被拒绝的工具不会阻止其他合法工具加载。

## 使用

在仓库根目录运行：

```bash
cd phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content/code
python3 main.py
python3 -m unittest discover tests -v
```

demo 会打印准入工具、被拒绝的描述符、两次分页请求、数组结构化内容、内容块类型、镜像 header 名、值是否需要编码、HTTP parity 状态以及按调用方过滤后的 completion 值。

## 交互实验

打开 `code/main.py`，找到 `TOOLS`。

1. 将 `tag_catalog.outputSchema.type` 从 `array` 改成 `object`。
2. 运行 demo；客户端应拒绝返回的数组。
3. 恢复 schema。
4. 保持第一页的 `nextCursor` 为 `""`，再让最后一页返回 `nextCursor: None`，而不是省略字段。
5. 运行测试并比较游标 trace。
6. 给字符串属性增加 `x-mcp-header: "Authorization"`。
7. 确认描述符在调用前被拒绝。
8. 尝试包含 Unicode、换行、首尾空白和字面文本 `=?base64?SGVsbG8=?=` 的 `region` 值。解码每个输出 header，证明原值精确保留。
9. 将注解移到 `oneOf`、`items` 或 `$ref` 定义下。确认即使 demo 从未使用该分支，每个描述符仍会被拒绝。
10. 删除已识别 header 或改变解码后的值。确认 HTTP 边界返回状态 `400` 和 JSON-RPC `-32020`。

重点不是背 JSON 形状，而是观察每道门在自己拥有的边界上失败。

## 实践实验

用 `search_evidence` 工具扩展契约实验。

要求：

1. 输入 schema 接受 `query`、`limit` 和安全的 `region` 路由字段。
2. 输出 schema 是由 `uri`、`title` 和 `score` 组成的对象数组。
3. 结果包含兼容文本，并为每项包含 resource link。
4. 参数拒绝未知属性。
5. `limit` 由应用校验限制范围。
6. 没有某个 URI 访问权限的调用方，不能通过 completion 或工具输出看到它。
7. 测试不符合 schema 的 score、无效 header 注解和两页列表。
8. header 值测试覆盖可见 ASCII、Unicode、控制字符、空白、看起来像 sentinel 的文本，以及 JavaScript 安全整数的两个边界。
9. HTTP fixture 接受不区分大小写的 header 名，但以状态 `400` 和错误码 `-32020` 拒绝缺失或不匹配的已识别值。

## 交付物

`outputs/skill-mcp-contract-reviewer.md` 是一个扁平、可复用的审查技能。给它工具描述符、示例结果、分页行为和 completion 策略，它会返回准入决定、结果校验计划、header 策略和具体失败测试。

## 验证

满足以下条件时，本课完成：

- `tools/list` 重复调用返回相同的逻辑顺序；
- `nextCursor` 为 `""` 时客户端执行第二次请求；
- 不安全的敏感 header 描述符被排除，同时其他工具仍可用；
- 数组通过其数组 output schema；
- 对象不能通过同一个数组 schema；
- 错误结果不能省略或违反已发布 output schema；
- text、image、audio、resource link 和 embedded resource 内容块都能校验；
- header 审计事件含名称、不含值；
- 普通可见 ASCII 保持原样，Unicode、控制字符、带空白、空值和 sentinel-looking 值都能通过精确 base64 UTF-8 往返；
- 超出 JavaScript 安全范围的镜像整数被拒绝；
- `oneOf`、`items`、嵌套对象、`$ref` 定义或 output schema 下的注解在准入时被拒绝；
- 不区分大小写的已识别 header 只有在解码值精确匹配 body 时才通过；缺失或不匹配会产生 HTTP `400` 和 JSON-RPC `-32020`；
- analyst 的 completion 永远不返回 `production`；
- 工具失败使用 `isError: true`，格式错误的协议调用使用 JSON-RPC `error`。

## 生产失败模式

| 失败 | 学习者看到的现象 | 正确响应 |
|---------|-----------------------|------------------|
| 客户端假设对象输出 | 合法数组失败或被静默包装 | 按发布 schema 校验，不使用只支持对象的类型 |
| 把空游标当 false | 最后一页消失 | 只要 `nextCursor` 存在且非 null 就继续 |
| 镜像敏感值 | secret 出现在代理、WAF 或 trace 数据中 | 拒绝描述符，将 secret 留在受保护的请求数据中 |
| 镜像原始 Unicode/空白 | 网关和 origin 意见不一致，或值被标准化 | 使用精确 base64 UTF-8 sentinel 编码，解码后比较 |
| schema 分支隐藏注解 | 客户端准入时漏掉路由元数据 | 遍历整个 schema 树，只允许直接顶层属性 |
| 镜像大整数 | JavaScript 中间层舍入路由值 | 拒绝超出 JavaScript 安全范围的值 |
| header 与 body 不一致 | 网关路由到一个目标，origin 执行另一个目标 | dispatch 前以 HTTP `400` 与 `-32020` 拒绝 |
| 忽略 output schema | 下游消费损坏结构 | 在模型或应用使用前校验 |
| 自动信任 resource link | 调用方跟随未授权 URI | 每次资源读取都重新授权 |
| completion 共享全局建议 | 隐藏租户名称泄漏 | 按调用方、引用和授权过滤 |
| 把工具注解当策略 | 破坏性操作绕过确认 | 在注解之外执行授权和审批 |
| 一个坏工具破坏发现 | 整个服务器不可用 | 拒绝坏描述符，独立准入合法工具 |

## 与 Capstone 的连接

Phase 13 capstone 需要一个能合并多个服务器工具的网关。本课提供其准入核心。

使用本课 artifact 评估 capstone 的四类证据：确定且完整的分页发现；模型暴露前的描述符校验；经过校验的结构化输出与有界内容块；以及保持授权边界的 completion 和路由元数据。

不要仅凭成功的 `tools/call` 声称网关兼容。捕获描述符、页面 trace、准入工具集、被拒绝工具集和一个经过校验的结果。

## 关键术语

| 术语 | 含义 |
|------|---------|
| `inputSchema` | 定义工具可接受参数的 JSON Schema 对象 |
| `outputSchema` | 可选的、定义 `structuredContent` 的 JSON Schema |
| `structuredContent` | 工具结果产生的任意 JSON 值 |
| 内容块 | 类型化的文本、图像、音频、资源链接或嵌入资源 |
| `x-mcp-header` | 将原始参数镜像到 Streamable HTTP 元数据的 schema 注解 |
| 不透明游标 | 客户端不解释其值的服务器分页 token |
| Completion 引用 | 正在补全参数的 prompt 名称或资源 URI/template |
| 准入 | 客户端决定暴露还是拒绝发现到的描述符 |

## 延伸阅读

- [MCP Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP Completion](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/completion)
- [MCP Pagination](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/pagination)
- [MCP Streamable HTTP Parameter Headers](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#custom-headers-from-tool-parameters)
