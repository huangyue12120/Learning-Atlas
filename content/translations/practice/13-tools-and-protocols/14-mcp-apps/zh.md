---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/14-mcp-apps/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 8b21c65a9d041f5d028610144c2516b3882d69bea9a10645699ba8af29a5c05a
status: reviewed
---

# MCP Apps——通过 `ui://` 提供交互式 UI 资源

> 纯文本工具输出限制了智能体能展示的内容。MCP Apps（SEP-1724，于 2026-01-26 正式发布）允许工具返回沙箱化的交互式 HTML，并在 Claude Desktop、ChatGPT、Cursor、Goose 和 VS Code 中内嵌渲染。仪表盘、表单、地图、3D 场景，都可以通过同一个扩展提供。本课将讲解 `ui://` 资源方案、`text/html;profile=mcp-app` MIME、iframe 沙箱的 postMessage 协议，以及让服务器渲染 HTML 后随之出现的安全面。

**类型：** 构建
**语言：** Python（标准库，UI 资源发射器）、HTML（示例应用）
**前置课程：** Phase 13 · 07（MCP 服务器）、Phase 13 · 10（资源）
**时间：** 约 75 分钟

## 学习目标

- 从工具调用返回一个 `ui://` 资源，并设置正确的 MIME 和元数据。
- 使用 `_meta.ui.resourceUri`、`_meta.ui.csp` 和 `_meta.ui.permissions` 声明工具关联的 UI。
- 实现 UI 到主机通信所需的 iframe 沙箱 postMessage JSON-RPC。
- 应用能够抵御 UI 发起攻击的 CSP 和 permissions-policy 默认值。

## 问题

2025 年风格的 `visualize_timeline` 工具可能返回：“这里有 14 条按时间顺序整理的笔记：……”。这只是一个段落。用户真正想要的是交互式时间线。在 MCP Apps 之前，选择只有客户端专用的 widget API（Claude artifacts、OpenAI Custom GPT HTML），或者完全没有 UI。

MCP Apps（SEP-1724，于 2026-01-26 发布）将这一契约标准化。工具结果包含一个 URI 为 `ui://...` 的 `resource`，其 MIME 是 `text/html;profile=mcp-app`。主机会在受沙箱保护的 iframe 中渲染它，并使用受限 CSP；除非明确授予权限，否则不能访问网络。iframe 内的 UI 通过一种精简的 postMessage JSON-RPC 方言向主机发送消息。

每个兼容客户端（Claude Desktop、ChatGPT、Goose、VS Code）都会用相同方式渲染同一个 `ui://` 资源。一个服务器、一个 HTML bundle、通用 UI。

## 概念

### `ui://` 资源方案

工具返回：

```json
{
  "content": [
    {"type": "text", "text": "Here is your notes timeline:"},
    {"type": "ui_resource", "uri": "ui://notes/timeline"}
  ],
  "_meta": {
    "ui": {
      "resourceUri": "ui://notes/timeline",
      "csp": {
        "defaultSrc": "'self'",
        "scriptSrc": "'self' 'unsafe-inline'",
        "connectSrc": "'self'"
      },
      "permissions": []
    }
  }
}
```

随后，主机会对 `ui://notes/timeline` URI 调用 `resources/read`，得到：

```json
{
  "contents": [{
    "uri": "ui://notes/timeline",
    "mimeType": "text/html;profile=mcp-app",
    "text": "<!doctype html>..."
  }]
}
```

### iframe 沙箱

主机会在带沙箱的 `<iframe>` 中渲染 HTML，其中包括：

- `sandbox="allow-scripts allow-same-origin"`（也可以根据服务器声明设置得更严格）。
- 通过响应头应用服务器声明的 CSP。
- 不能访问主机 origin 的 cookies 和 localStorage。
- 网络访问受 CSP 中 `connectSrc` 的限制。

### postMessage 协议

iframe 通过 `window.postMessage` 与主机通信。这里使用一种精简的 JSON-RPC 2.0 方言：

始终将 `targetOrigin` 固定为对端的精确 origin；接收端处理任何 payload 之前，也要根据允许列表验证 `event.origin`。两端都不能使用 `"*"`——消息体携带工具调用和资源读取请求。

<!-- learning-atlas: upstream-non-python omitted=js -->

本项目采用 Python-first 实作策略，因此不在中文学习路径中维护这段 JavaScript 的 postMessage 实现；可在锁定版本的[原始课程对应位置](https://github.com/huangyue12120/ai-engineering-from-scratch/blob/7c3323508a5186739feecd76838ba1ae962c736f/phases/13-tools-and-protocols/14-mcp-apps/docs/en.md#postmessage-protocol)查看完整代码。

UI 可以调用的主机侧方法包括：

- `host.callTool(name, arguments)`——调用服务器工具。
- `host.readResource(uri)`——读取 MCP 资源。
- `host.getPrompt(name, arguments)`——获取提示词模板。
- `host.close()`——关闭 UI。

每次调用仍会经过 MCP 协议，并继承服务器的权限。

### 权限

`_meta.ui.permissions` 列表用于请求额外能力：

- `camera`——访问用户摄像头（用于扫描文档的 UI）。
- `microphone`——语音输入。
- `geolocation`——地理位置。
- `network:*`——比单独使用 `connectSrc` 更宽的网络访问。

每个权限都会在 UI 渲染前以提示的方式展示给用户。

### 安全风险

iframe 中的 HTML 仍然是 HTML，因此会出现新的攻击面：

- **通过 UI 进行提示注入。** 恶意服务器 UI 可以显示看起来像系统消息的文本来欺骗用户。主机在视觉上应将服务器 UI 与主机 UI 明确区分。
- **通过 `connectSrc` 外泄数据。** 如果 CSP 允许 `connect-src: *`，UI 就可以向任意位置发送数据。默认值应严格限制。
- **点击劫持。** UI 会覆盖主机的 chrome。主机必须防止 z-index 操纵并执行透明度规则。
- **窃取焦点。** UI 会夺取键盘焦点并捕获下一条消息。主机必须拦截这一行为。

Phase 13 · 15 会把这些内容作为 MCP 安全的一部分深入讲解；本课先介绍它们。

### `ui/initialize` 握手

iframe 加载后，会通过 postMessage 发送 `ui/initialize`：

```json
{"jsonrpc": "2.0", "id": 0, "method": "ui/initialize",
 "params": {"theme": "dark", "locale": "en-US", "sessionId": "..."}}
```

主机用能力和 session token 响应。UI 在后续每次主机调用中都使用这个 session token。

### AppRenderer / AppFrame SDK 原语

ext-apps SDK 暴露了两个便捷原语：

- `AppRenderer`（服务器侧）——包装 React / Vue / Solid 组件，并以正确的 MIME 和元数据发出 `ui://` 资源。
- `AppFrame`（客户端侧）——接收资源、挂载 iframe，并协调 postMessage。

可以使用它们，也可以自己编写 HTML 和 JSON-RPC。

### 生态状态

MCP Apps 于 2026-01-26 发布。截至 2026 年 4 月，客户端支持情况如下：

- **Claude Desktop。** 自 2026 年 1 月起完整支持。
- **ChatGPT。** 通过 Apps SDK 完整支持（底层使用同一个 MCP Apps 协议）。
- **Cursor。** Beta；需在设置中启用。
- **VS Code。** 仅 Insider 构建支持。
- **Goose。** 完整支持。
- **Zed、Windsurf。** 已列入路线图。

生产中的服务器用途包括：仪表盘、地图可视化、数据表格、图表构建器、沙箱 IDE 预览。

```figure
t3-ui-sandbox
```

## 动手使用

`code/main.py` 为笔记服务器增加一个 `visualize_timeline` 工具。它返回 `ui://notes/timeline` 资源，并为该 URI 提供 `resources/read` 处理器；处理器返回一个带 SVG 时间线的小型但完整的 HTML bundle。HTML 使用标准库模板化，不需要构建系统。由于标准库不能驱动浏览器，postMessage 会写在 JS 注释中作为示意，但不会实际运行。

注意观察：

- 工具响应中的 `_meta.ui` 携带 resourceUri、CSP 和权限。
- HTML 不访问网络即可渲染；所有数据都内联其中。
- JS 通过 `window.parent.postMessage` 调用 `host.callTool`（在这个标准库演示中有文档说明，但不会执行）。

## 交付物

本课产出 `outputs/skill-mcp-apps-spec.md`。给定一个适合交互式 UI 的工具，该 skill 会产出完整的 MCP Apps 契约：`ui://` URI、CSP、权限、postMessage 入口以及安全检查清单。

## 练习

1. 运行 `code/main.py` 并检查输出的 HTML。直接在浏览器中打开 HTML，验证 SVG 能够渲染。然后勾画 UI 调用 `host.callTool("notes_update", ...)` 时采用的 postMessage 契约。

2. 收紧 CSP：移除 `'unsafe-inline'`，改用基于 nonce 的脚本策略。HTML 生成代码需要怎样变化？

3. 增加第二个 UI 资源 `ui://notes/editor`，提供一个就地编辑笔记的表单。用户提交时，iframe 调用 `host.callTool("notes_update", ...)`。

4. 审计 UI 的攻击面。恶意服务器可以在哪里注入内容？iframe 沙箱能防御什么、不能防御什么？

5. 阅读 SEP-1724 规范，找出 MCP Apps SDK 中 toy 实现没有使用的一项能力。（提示：组件级状态同步。）

## 术语

| 术语 | 人们会怎么说 | 它实际表示什么 |
|------|----------------|------------------------|
| MCP Apps | “交互式 UI 资源” | 于 2026-01-26 发布的 SEP-1724 扩展 |
| `ui://` | “App URI 方案” | UI bundle 使用的资源方案 |
| `text/html;profile=mcp-app` | “那个 MIME” | MCP App HTML 使用的 Content-Type |
| iframe 沙箱 | “渲染容器” | 通过 CSP 和权限对 UI 进行浏览器沙箱化 |
| postMessage JSON-RPC | “UI 到主机的线路” | 用于主机调用的精简 JSON-RPC-over-postMessage 方言 |
| `_meta.ui` | “工具—UI 绑定” | 将工具结果连接到 UI 资源的元数据 |
| CSP | “Content-Security-Policy” | 声明脚本、网络和样式的允许来源 |
| AppRenderer | “服务器 SDK 原语” | 将框架组件转换为 `ui://` 资源 |
| AppFrame | “客户端 SDK 原语” | 协调 postMessage 的 iframe 挂载辅助器 |
| `ui/initialize` | “握手” | UI 发给主机的第一条 postMessage |

## 延伸阅读

- [MCP ext-apps — GitHub](https://github.com/modelcontextprotocol/ext-apps)——参考实现与 SDK
- [MCP Apps specification 2026-01-26](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)——正式规范文档
- [MCP — Apps extension overview](https://modelcontextprotocol.io/extensions/apps/overview)——高层文档
- [MCP blog — MCP Apps launch](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/)——2026 年 1 月发布文章
- [MCP Apps API reference](https://apps.extensions.modelcontextprotocol.io/api/)——JSDoc 风格的 SDK API 参考
