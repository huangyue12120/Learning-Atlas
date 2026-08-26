---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/14-mcp-apps/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 40f058cda91f1ed151492d82de0578ec39a8df5ded405087c2824c4d885abdcc
status: reviewed
---

# 无状态协议上的 MCP Apps

> 交互式结果仍然是一次 MCP 工具与资源交换。2026-07-28 核心协议让这次交换自包含，Apps 扩展则增加了带沙箱的浏览器表面。

**类型：** 构建
**语言：** Python
**前置课程：** Phase 13 · 第 07 课（MCP 服务器）、Phase 13 · 第 10 课（资源）
**预计时间：** 约 75 分钟

## 学习目标

- 通过 `server/discover` 和逐请求扩展能力公布 MCP Apps。
- 在工具调用之前为工具声明 `ui://` 资源。
- 在 2026-07-28 无状态线上返回完整的工具和资源结果。
- 区分 Apps 的 `ui/initialize` 桥接消息和已经移除的 MCP 核心握手。
- 应用 Origin 校验、沙箱、CSP 和最小权限。

## 问题所在

文本结果可以描述时间线，却无法给用户一条可过滤、可检查、可操作的时间线。

MCP Apps 用一个可选扩展解决展示问题。工具定义指向 `ui://` 资源；宿主可以在工具运行前获取并审核资源，把它渲染进沙箱 iframe，再通过 JSON-RPC 桥接器中介所有 App 动作。

核心协议在 2026-07-28 发生了变化。不要用旧的连接生命周期包裹 App：

- 没有核心 `initialize` 请求或 `notifications/initialized` 通知；
- 没有 `Mcp-Session-Id` header；
- 每个请求都在 `params._meta` 中携带协议版本和客户端能力；
- 服务器实现 `server/discover`，让客户端检查版本、核心能力和扩展；
- 每个成功结果都有 `resultType` 判别字段；
- Streamable HTTP 每个请求使用一个 POST；现代 GET 和 DELETE 入口返回 405。

Apps 桥接器仍有一个名为 `ui/initialize` 的方法，但它属于 iframe 的 postMessage 方言，不会重新创建核心 MCP 会话。

## 核心概念

### 两套协议，一个功能

保持各层边界清晰：

1. MCP 核心承载 `server/discover`、`tools/list`、`tools/call`、`resources/list` 和 `resources/read`。
2. MCP Apps 扩展声明 UI，并定义 iframe 到宿主的桥接。
3. 浏览器沙箱规则限制 UI 可以访问的范围。

扩展标识符是 `io.modelcontextprotocol/ui`，双方都要选择加入。客户端在每个请求的能力对象中声明扩展支持：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "server/discover",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/ui": {}
        }
      },
      "io.modelcontextprotocol/clientInfo": {
        "name": "timeline-host",
        "version": "1.0.0"
      }
    }
  }
}
```

`clientInfo` 推荐用于诊断，是自报数据，不是授权身份。

### 渲染前先发现

服务器的 discovery 结果公布该扩展：

```json
{
  "resultType": "complete",
  "supportedVersions": ["2026-07-28"],
  "capabilities": {
    "tools": {},
    "resources": {},
    "extensions": {
      "io.modelcontextprotocol/ui": {}
    }
  },
  "ttlMs": 300000,
  "cacheScope": "public",
  "_meta": {
    "io.modelcontextprotocol/serverInfo": {
      "name": "timeline-app-server",
      "version": "2.0.0"
    }
  }
}
```

服务器必须支持 discovery。客户端不必在每次动作前调用 discovery，因为每个动作自身都带有能力。

### 在工具定义上声明 UI

现代 Apps 契约在 `tools/list` 中把 UI 绑定到工具：

```json
{
  "name": "notes_timeline",
  "description": "Render a timeline of notes.",
  "inputSchema": {
    "type": "object",
    "properties": {}
  },
  "_meta": {
    "ui": {
      "resourceUri": "ui://notes/timeline.html"
    }
  }
}
```

这是调用前的元数据。宿主可以在结果要求展示 UI 之前预加载、缓存并审核 HTML。旧的扁平元数据键可以由兼容代码接受，但新服务器应发送嵌套的 `_meta.ui.resourceUri` 形式。

当前核心允许缓存 `tools/list`。加入确定性排序、`ttlMs` 和 `cacheScope`。如果可见工具随用户或令牌变化，使用 `private`。

### 先返回数据，再让宿主绑定视图

工具调用返回普通内容和结构化数据：

```json
{
  "resultType": "complete",
  "content": [
    {"type": "text", "text": "Timeline ready."}
  ],
  "structuredContent": {
    "notes": [
      {"id": "note-1", "title": "Discover", "created": "2026-07-28"}
    ]
  },
  "isError": false
}
```

宿主已经知道哪个视图属于该工具。不要为了重复 URI 而创造新的内容块。

### 把 App 作为资源提供

服务器在 discovery 中公布 `resources`，因此也必须实现 `resources/list`。确定性列表项包含规范 URI、稳定名称、描述和 MIME 类型。列表结果像确定性的工具列表一样，包含 `resultType`、服务器身份元数据、`ttlMs` 和 `cacheScope`。

宿主发送 `resources/read`。在 Streamable HTTP 上，请求包含：

```text
POST /mcp
MCP-Protocol-Version: 2026-07-28
Mcp-Method: resources/read
Mcp-Name: ui://notes/timeline.html
```

header 值和 JSON-RPC 请求体必须一致。不一致是 `-32020` 协议错误。

结果包含 HTML 资源和缓存提示：

```json
{
  "resultType": "complete",
  "contents": [
    {
      "uri": "ui://notes/timeline.html",
      "mimeType": "text/html;profile=mcp-app",
      "text": "<!doctype html>...",
      "_meta": {
        "ui": {
          "csp": {
            "connectDomains": [],
            "resourceDomains": [],
            "frameDomains": [],
            "baseUriDomains": []
          },
          "permissions": {}
        }
      }
    }
  ],
  "ttlMs": 60000,
  "cacheScope": "public"
}
```

### 把 UI 资源缓存为可执行内容

App 资源不能和普通散文互换。缓存条目可以执行桥接代码、渲染工具数据并请求宿主代办的动作。缓存键应包含规范化的 `ui://` URI、已准入的服务器身份和版本、资源内容摘要，以及 `cacheScope` 为 private 时的授权上下文。即使 URI 相同，也不能跨主体复用私有 App 资源，因为 HTML 或策略元数据可能不同。

在 `ttlMs` 到期、工具的 `_meta.ui.resourceUri` 绑定变化、服务器版本或已准入描述 pin 变化，或确认的资源变更订阅指向该 URI 时，使条目失效。重新获取并重新执行 CSP 和权限审核后再挂载。新版本资源尚未加载时，旧 iframe 不能仅因为缓存而继续拥有更宽权限。

### 在功能策略前拒绝线上歧义

校验顺序是有意设计的。先校验 JSON-RPC 形状，要求协议元数据为字符串、客户端能力图为对象；接着比较路由 header 和请求体；最后才决定匹配后的协议版本是否支持。这样可以防止代理和服务器解释不同请求。

| 条件 | HTTP | JSON-RPC 错误 |
|-----------|------|----------------|
| header 与请求体的版本、方法或名称不一致 | 400 | `-32020` |
| header 与请求体一致但版本不支持 | 400 | `-32022`，`data` 精确为 `{"supported":["2026-07-28"],"requested":"<actual>"}` |
| `resources/read` 缺少 Apps 扩展能力 | 400 | `-32021`，`data.requiredCapabilities.extensions.io.modelcontextprotocol/ui` |
| 方法未知 | 404 | `-32601` |

JSON-RPC 通知没有 `id`，所以服务器不为它发送 JSON-RPC 响应。接受的 HTTP 通知返回空响应体的 202。错误可以改变 HTTP 状态，但不能为通知凭空创建 JSON-RPC 错误体。

### 沙箱是边界，不是信任判决

宿主控制 iframe。App 不能直接读取宿主 cookie、local storage 或页面 DOM；所有特权工作都必须经过桥接。

默认采用以下策略：

- 先让所有 CSP 域名列表为空，只添加 App 真正需要的 origin。`connectDomains` 用于 fetch、XHR 和 WebSocket；`resourceDomains` 用于脚本、样式、图片和字体。
- 能打包代码和数据时就打包。
- 除非可见功能确实需要，否则不申请摄像头、麦克风或位置权限。
- `postMessage` 只允许精确的对端 origin，拒绝其他 origin 的事件。
- 将工具参数、工具结果、资源文本和桥接消息视为不受信任输入。
- 把用户同意保留在宿主中，iframe 不能批准自己的重要动作。

不要从教程复制一个固定的 `sandbox` 属性到每个宿主。宿主必须根据 App 的 origin 模型和自身隔离设计选择标志。

允许的域名仍然可能成为外泄路径。`connectDomains: ["https://api.example.com"]` 意味着 App 中运行的任何脚本都可以向那里发送获准的数据。精确 origin 匹配能防止目的地混淆，却不能判断 payload 是否合适。默认保持 connect 访问为空，避免把 bearer token 放进 iframe；可行时让宿主代理窄操作，限制请求和响应大小，并审计哪个用户动作触发了每个外发请求。要把 `resourceDomains` 与 `connectDomains` 分开考虑：加载字体或脚本的权限不应自动授予任意数据上传权限。

### Apps 桥有自己的生命周期

Apps 桥是运行在 `postMessage` 之上的 JSON-RPC 方言。它可以交换 `ui/initialize` 和 `ui/*` 通知，也可以代理类似核心的 `tools/call` 方法。

View 发送带 `appInfo` 和 `appCapabilities` 对象的 `ui/initialize`。宿主返回自己的能力和宿主上下文。只有收到该响应后，View 才发送 `ui/notifications/initialized`。宿主必须等到这个 Apps 通知后，才能向 View 发送消息。

这个本地握手只在一个 iframe 和一个宿主 frame 之间创建桥接。它不会协商 MCP 协议版本、创建服务器状态或生成传输会话。注意精确前缀：核心的 `notifications/initialized` 已移除，但 Apps 的 `ui/notifications/initialized` 仍保留。桥接工具调用生成的核心请求，是带全套请求元数据和新 JSON-RPC id 的新自包含请求。

### 宿主上下文、动作与撤销

桥接初始化后，宿主仍是权威方。View 只能通过宿主公布的能力请求工具动作、导航、剪贴板使用或其他特权效果。宿主校验类型化请求、当前用户、目标和参数，应用审批策略，也可以拒绝请求。按钮点击和合法桥接消息只表达意图，不授予权限。

把主题、尺寸和可访问性当作会变化的宿主上下文，而不是一次性渲染输入：

- 应用宿主提供的颜色和字体 token，并在主题或对比度偏好变化时响应；
- 允许 View 报告期望尺寸，但由宿主限制并应用 iframe 尺寸，防止内容逃出布局或制造欺骗性覆盖层；
- 在 iframe 内保留键盘顺序、可见焦点、可访问名称、屏幕阅读器状态、足够对比度、缩放和减少动效行为；
- resize 和重新渲染后重新测试宿主控件与 View 控件之间的焦点转移。

App 打开期间能力可能被撤销：用户切换账号、策略变化、服务器被隔离或宿主收窄同意范围。应在动作发生时检查能力和授权，而不只在 `ui/initialize` 时检查。撤销后，拒绝待处理特权调用，停止不再符合策略的网络活动，清除敏感渲染状态；如果 UI 资源本身不再准入，则重新挂载或回退到文本。View 应把拒绝当作普通结果处理，不能不断重试直到宿主让步。

### 回退也是契约的一部分

支持 Apps 的服务器仍可以服务未声明 UI 扩展的宿主：

- 在 `tools/list` 中返回不带 `_meta.ui` 的同一个工具；
- 保留有用的 `tools/call` 文本结果；
- 对 UI 的 `resources/read` 返回缺少能力错误；
- 决定工具是否完成时，绝不假设 iframe 存在。

```figure
t3-ui-sandbox
```

## 动手构建

`code/main.py` 用无 SDK 的进程内协议模型构建一个小型示例。它校验当前请求信封和 Streamable HTTP 路由值，通过 `server/discover` 公布 Apps，列出工具和资源，执行工具并提供自包含 HTML 资源。

模型接收已经解析的请求体和路由 header。它不是完整的 HTTP 适配器，不解析 `Content-Type` 或 `Accept`。需要完整 Streamable HTTP 适配器时参见第 09 课：该适配器要求 `Content-Type: application/json`，且 `Accept` 同时包含 `application/json` 和 `text/event-stream`。

运行：

```bash
cd phases/13-tools-and-protocols/14-mcp-apps
python3 code/main.py
python3 -m unittest discover code/tests -v
```

检查输出中的五点：

1. 每次调用都是独立的。
2. 每个请求都有 `_meta` 能力。
3. `resources/list` 在读取资源前返回稳定描述。
4. 每个结果都有 `resultType` 和服务器身份元数据。
5. 不出现核心会话标识符。

## 使用

先调用 `server/discover`，确认服务器扩展映射中出现 `io.modelcontextprotocol/ui`。然后带 Apps 能力和不带 Apps 能力各调用一次 `tools/list`。前者声明资源，后者仍是可用的纯文本工具。

读取 `ui://notes/timeline.html`，搜索 HTML 中的 `hostOrigin` 和 `event.origin` guard。这两行是证明桥接没有使用通配目标的最低可见证据。

## 交付

本课交付 `outputs/skill-mcp-apps-spec.md`。使用它在写框架代码前评审 App 契约。它要求作者说明当前核心信封、扩展协商、回退、UI 资源、缓存策略、CSP、权限、桥接方法和同意边界。

## 练习

1. 把客户端能力改为空扩展映射，确认 `tools/list` 保留工具但移除 UI 绑定。
2. 发送 `Mcp-Name: ui://notes/other.html`，但请求体读取时间线，确认错误为 `-32020`。
3. 把资源改成 `cacheScope: private`，说明支持这一设置的用户专属条件。
4. 把脚本移到 `https://static.example.com/app.js`，将该 origin 加入 `resourceDomains`，并解释新的供应链风险。
5. 增加 `notes_open` 工具，让按钮点击通过宿主路由，并把用户审批保留在宿主中。

## 关键术语

| 术语 | 含义 |
|------|------|
| MCP Apps | 由 MCP 宿主渲染交互式 HTML 的可选扩展 |
| `io.modelcontextprotocol/ui` | 双方公布的扩展标识符 |
| `ui://` | App UI 模板使用的资源 scheme |
| `text/html;profile=mcp-app` | MCP App HTML 的 MIME 类型 |
| `server/discover` | 当前用于协议和能力发现的 RPC |
| `resources/list` | 服务器公布 resources 能力时必需的资源列表方法 |
| `resultType` | 现代成功结果必需的判别字段 |
| `ui/initialize` | Apps 桥的第一个请求，与已移除的核心初始化分离 |
| `ui/notifications/initialized` | 宿主响应后由 Apps View 发送的就绪通知 |
| CSP | 限制脚本、样式、图片和网络来源的浏览器策略 |
| 文本回退 | 对不支持 Apps 的宿主保留的工具行为 |

## 延伸阅读

- [MCP 2026-07-28 基础协议](https://modelcontextprotocol.io/specification/2026-07-28/basic)
- [MCP Apps 概览](https://modelcontextprotocol.io/extensions/apps/overview)
- [MCP Apps 构建指南](https://modelcontextprotocol.io/extensions/apps/build)
- [官方扩展支持矩阵](https://modelcontextprotocol.io/extensions/client-matrix)
