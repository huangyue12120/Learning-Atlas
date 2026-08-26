---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/10-mcp-resources-and-prompts/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 34d186c38dea5a28accfab115201bb022dd41ca9a24c0385488821e5982a3108
status: reviewed
---

# MCP 资源与提示词：无状态服务器中的可寻址上下文

> 工具执行操作，资源暴露可寻址内容，提示词封装用户选择的消息模板。好的 MCP 服务器会让这几种契约彼此分离且行为可预测。

**类型：** 构建
**语言：** Python
**前置课程：** Phase 13，第 07 课（构建 MCP 服务器）、Phase 13，第 09 课（MCP 传输）
**预计时间：** 约 60 分钟

## 学习目标

- 根据消费者意图在工具、资源和提示词之间做选择。
- 通过必需的 `server/discover` 公布资源和提示词面。
- 构造确定性的 `resources/list` 和 `prompts/list` 结果。
- 使用 `ttlMs` 和 `cacheScope`，同时避免泄露用户专属数据。
- 对无效或未知资源 URI 返回 JSON-RPC 错误 `-32602`。
- 在 POST 响应 SSE 流上打开 `subscriptions/listen`，并通过 subscription ID 关联每个事件。
- 把资源内容和提示词模板视为不受信任的服务器输出。

## 从消费者开始

最容易误用 MCP 的方式，是一上来就写实现代码。数据库查询因为函数很熟悉而被做成工具；可复用工作流因为存放在文件里而被做成资源；提示词又可能因为宿主能注入而变成隐藏策略。

先问清楚谁来选择，以及消费者期待什么。

| 原语 | 主要意图 | 选择者 | 典型结果 |
|---|---|---|---|
| Tool | 执行操作 | 模型或应用 | 结构化动作结果 |
| Resource | 读取 URI 下的内容 | 宿主、应用或用户 | 文本或二进制内容 |
| Prompt | 启动可复用的消息工作流 | 通过宿主 UI 的用户 | 一条或多条提示词消息 |

`notes://note-1` 是资源，因为它是可寻址内容；`delete_note` 是工具，因为它会改变状态；`review_note` 是提示词，因为用户选择了一个准备好的复核工作流。

不要为了看起来完整，就把同一个操作同时暴露成三种原语。每增加一个面，就要增加对应的发现、授权、缓存、错误处理、测试和文档成本。

## 2026-07-28 无状态信封

本课针对 MCP 协议版本 `2026-07-28`。这个 profile 没有初始化握手，也没有协议会话。每个请求都在保留的 `_meta` 键中携带协议版本和客户端能力。

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientInfo": {
        "name": "course-client",
        "version": "1.0.0"
      },
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

服务器必须实现 `server/discover`。它的结果公布支持的版本、资源和提示词能力、实现身份以及缓存提示。客户端可以直接调用其他方法，但先发现能在构造 UI 前获得一份稳定快照。

```json
{
  "resultType": "complete",
  "supportedVersions": ["2026-07-28"],
  "capabilities": {
    "resources": {"listChanged": true, "subscribe": true},
    "prompts": {"listChanged": true}
  },
  "ttlMs": 3600000,
  "cacheScope": "public"
}
```

普通结果声明 `"resultType": "complete"`。响应 `_meta` 用 `io.modelcontextprotocol/serverInfo` 标识提供服务的实现，这个信息适合诊断，却不是认证身份。请求携带不支持的版本时，返回 `-32022`，同时给出请求版本和服务器支持的版本。

无状态契约会改变设计直觉：列表不能依赖同一连接上的上一次调用。凭据是请求输入，因此授权可能改变可见集合；但连接历史不能改变结果的解释方式。

## 资源是稳定的 URI 契约

资源是由 URI 标识的内容。先设计 URI，再写处理器。

好的 URI 应该：

- 足够稳定，可以加入书签或在请求间传递；
- 带有服务器域名的命名空间；
- 不依赖进程 ID 或连接；
- 在访问存储前先完成校验；
- 每次读取都重新授权。

`notes://note-1` 优于 `note-1`，因为命名空间是显式的。文件服务器可以使用 `file://` URI，但解析符号链接和相对片段后，仍必须检查配置的目录边界。

`resources/list` 返回当前调用者可见的资源。按 URI 等稳定键排序。确定性顺序可以避免无意义的缓存未命中、变化的快照，以及宿主 UI 在刷新时跳动。

```json
{
  "resultType": "complete",
  "resources": [
    {
      "uri": "notes://note-1",
      "name": "Architecture decision",
      "description": "Why the service uses a stateless boundary",
      "mimeType": "text/markdown"
    }
  ],
  "ttlMs": 300000,
  "cacheScope": "public",
  "_meta": {
    "io.modelcontextprotocol/serverInfo": {
      "name": "notes-server",
      "version": "2.0.0"
    }
  }
}
```

`resources/read` 返回一个或多个内容项。未知 URI 不是“成功但内容为空”的读取；当前 Resources 规范把无效或未知资源 URI 归为 JSON-RPC Invalid Params，错误码为 `-32602`。

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "error": {
    "code": -32602,
    "message": "Unknown or invalid resource URI",
    "data": {
      "uri": "notes://missing"
    }
  }
}
```

这种区分让客户端能够分辨“资源不存在”和“合法的空文档”，也能防止意外回退到更宽泛的查找。

### 资源模板

资源模板描述一族带参数的 URI。如果列出每个具体项成本太高或数量无界，就使用模板。例如，`notes://projects/{project}/decisions/{decision}` 告诉客户端如何形成合法地址，而不必返回每一条决策。

模板不会削弱校验。解析变量、执行授权、限制长度和字符范围，并用类型化参数构造存储查询。绝不能把任意 URI 尾部直接拼进文件路径或数据库语句。

### 内容不是受信任指令

资源文本可能含有提示注入、秘密、误导性命令或格式错误的标记。宿主应保留来源信息，把资源内容当作数据。服务器应限制内容大小，返回准确 MIME 类型，遮蔽调用者无权访问的字段，并避免返回无关记录。

## 提示词是用户控制的模板

MCP 提示词专为用户显式选择而设计。宿主可以把它们显示成斜杠命令、菜单项或工作流按钮，协议并不要求某一种 UI。

对于相同的请求授权，`prompts/list` 应保持确定性。每个提示词都需要稳定名称、有用描述以及参数声明，以便宿主在 `prompts/get` 前收集输入。

```json
{
  "resultType": "complete",
  "prompts": [
    {
      "name": "review_note",
      "title": "Review a note",
      "description": "Review one note for a named concern",
      "arguments": [
        {
          "name": "uri",
          "description": "The note resource URI",
          "required": true
        }
      ]
    }
  ],
  "ttlMs": 600000,
  "cacheScope": "public"
}
```

`prompts/get` 会把参数解析成消息，但不会替代宿主的系统指令。宿主决定返回的消息如何进入模型上下文，并让自己的受信策略保持更高优先级。

在服务器边界校验提示词参数。提示词里的 URI 必须通过与直接读取资源相同的授权检查。不要让提示词绕过资源访问控制，形成旁路。

## 缓存提示也是正确性的一部分

`ttlMs` 告诉客户端结果可以复用多久，`cacheScope` 说明谁可以共享该缓存值。

| 范围 | 含义 | 典型用途 |
|---|---|---|
| `public` | 只要授权允许，就可以跨用户复用 | 公共提示词目录 |
| `private` | 绑定到请求用户或凭据上下文 | 用户自己的笔记内容 |

根据数据变化速度和过时数据的损害来选择 TTL。公共提示词目录可以用五分钟；私有笔记读取可以用一分钟。

MCP 只定义 `public` 和 `private` 两种 `cacheScope` 值。含有秘密或变化很快的结果，应返回 `cacheScope: "private"` 与 `ttlMs: 0`，然后在宿主缓存策略中执行更严格的 no-store 规则；`no-store` 本身不是 MCP 的 `cacheScope` 值。

缓存提示永远不能替代授权。缓存键必须包含所有会改变可见性的请求维度，包括租户、用户、作用域、语言环境和分页游标。如果共享缓存无法安全表达这些维度，就使用 `private` 加零 TTL，并在宿主层采用 no-store 策略。

## 订阅使用客户端打开的响应流

现代订阅模式取代旧的 `resources/subscribe` RPC 和旧 HTTP GET 事件端点。

客户端把 `subscriptions/listen` 作为普通 JSON-RPC 请求发送。在 Streamable HTTP 上，它是一个响应保持打开的 POST，响应内容为 SSE 流。`notifications` 对象是允许列表；服务器不得发送未被请求的通知类型。

```json
{
  "jsonrpc": "2.0",
  "id": 17,
  "method": "subscriptions/listen",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {
        "name": "course-client",
        "version": "1.0.0"
      }
    },
    "notifications": {
      "resourcesListChanged": true,
      "promptsListChanged": true,
      "resourceSubscriptions": [
        "notes://note-1"
      ]
    }
  }
}
```

请求 ID 就是 subscription ID。在任何请求的事件之前，服务器会发送 `notifications/subscriptions/acknowledged`。其中的过滤器只包含服务器接受的子集。

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/subscriptions/acknowledged",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/subscriptionId": 17
    },
    "notifications": {
      "resourcesListChanged": true,
      "resourceSubscriptions": [
        "notes://note-1"
      ]
    }
  }
}
```

该流上之后的每个事件都携带相同的元数据。

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/subscriptionId": 17
    },
    "uri": "notes://note-1"
  }
}
```

通知只表示资源发生了变化。客户端需要再次通过 `resources/read` 读取，并接受当前授权检查；不能假设事件中带有新文档。

多个订阅可以共用一个 stdio 通道，subscription ID 让客户端能够把它们分流。HTTP 下关闭响应流会取消订阅。服务器平稳结束流时，返回与原请求关联的最终 `resultType: "complete"` 响应。

不要把订阅流当作协议会话。之后的读取仍是一条完整请求，可以到达任何健康的服务器实例。

```figure
t3-primitive-sort
```

## 交互实验

使用图示对项目追踪器中的五种能力分类：问题详情、创建问题、迭代复盘模板、项目策略和关闭问题。然后决定哪些列表可以公开缓存，哪些读取必须保持私有，以及哪些资源值得发送更新通知。

每次分类都写明选择者。如果模型执行动作，就使用工具；如果宿主读取 URI 寻址的内容，就使用资源；如果用户启动准备好的消息工作流，就使用提示词。

## 练习实验

从仓库根目录运行模拟器：

```bash
cd phases/13-tools-and-protocols/10-mcp-resources-and-prompts/code
python3 main.py
python3 -m unittest discover tests -v
```

按以下顺序检查 transcript：

1. 确认 `server/discover` 公布当前版本和两项能力。
2. 确认两个列表结果都已排序，并使用 `resultType: "complete"`。
3. 确认列表和读取结果带有有意设置的缓存提示。
4. 把读取 URI 改为 `notes://missing`，观察 `-32602`。
5. 确认订阅确认先于资源事件。
6. 确认事件和平稳关闭都携带 subscription ID `5`。

Python 模型不会打开真正的 HTTP 连接，而是表示 SDK 应放在请求级响应流上的消息。生产环境中，传 framing 和传输应使用官方 SDK。

## 已交付产物

`outputs/skill-primitive-splitter.md` 是可复用的 MCP 原语选择设计评审。它现在检查确定性发现、缓存范围、无效 URI 行为和现代订阅过滤器。

本课还提供 `assets/primitive-split.svg`，它是原语与订阅边界的静态版本，便于离线学习。

## 验证

```bash
cd phases/13-tools-and-protocols/10-mcp-resources-and-prompts/code
python3 main.py
python3 -m unittest discover tests -v
```

预期结果：主程序打印 JSON transcript，测试命令报告至少十二个测试通过。

## Capstone 衔接

当你的 capstone 服务器要在动作旁边暴露可寻址知识时，使用本课契约。至少加入一份确定性的目录快照、一次经过授权的资源读取、一次提示词解析、一个无效 URI 案例和一份订阅 transcript。

证据应表明列表不依赖连接历史，且订阅事件本身不会授予底层资源访问权。

## 练习题

1. 增加 `notes://projects/{project}/notes/{id}` 资源模板，并校验两个变量。
2. 为 `resources/list` 增加分页，同时保持确定性顺序。
3. 把一个资源改为 `cacheScope: "private"` 和 `ttlMs: 0`，加入宿主 no-store 策略，并解释为何两层控制都必要。
4. 增加提示词列表变更订阅，证明过滤器没有 `promptsListChanged` 时不会发送该事件。
5. 创建两个同时存在的订阅，证明每个事件携带正确的请求 ID。
6. 在读取处理器中加入授权主体，证明缓存条目不能跨主体复用。

## 关键术语

- **Resource：** MCP 服务器暴露的 URI 寻址内容。
- **Prompt：** MCP 服务器暴露的、由用户控制的消息模板。
- **确定性列表：** 对相同请求输入，成员和排序稳定的发现结果。
- **`ttlMs`：** 以毫秒为单位的缓存新鲜度时长。
- **`cacheScope`：** 缓存结果的共享边界。
- **`subscriptions/listen`：** 长生命周期请求，其响应流传递经过明确过滤的通知。
- **Subscription ID：** 原始 listen 请求的 ID，在通知元数据中重复出现。
- **Invalid parameters：** JSON-RPC 错误 `-32602`，用于无效或未知资源 URI。
- **Unsupported protocol version：** JSON-RPC 错误 `-32022`，包含 `supported` 和 `requested` 版本。
- **`server/discover`：** 必需的服务器方法，返回支持版本、能力、身份和可选缓存提示。

## 延伸阅读

- [MCP 2026-07-28 Resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)
- [MCP 2026-07-28 Prompts](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts)
- [MCP 2026-07-28 Subscriptions](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions)
- [MCP 2026-07-28 Caching](https://modelcontextprotocol.io/specification/2026-07-28/basic/utilities/caching)
