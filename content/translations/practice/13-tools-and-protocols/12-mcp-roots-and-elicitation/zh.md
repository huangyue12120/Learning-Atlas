---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 9cbc7f73be8836e7fb41c6019564e9124e02c4befd2a7247360252be66a65a2c
status: reviewed
---

# Roots 与 Elicitation——范围控制和执行中的用户输入

> 硬编码路径会在用户打开另一个项目时立即失效。预填的工具参数也会在用户提供的信息不足时失效。Roots 将服务器限制在用户控制的一组 URI 内；elicitation 会在工具调用中途暂停，通过表单或 URL 请求用户提供结构化输入。两种客户端原语，解决 MCP 的两类常见失败。SEP-1036（URL 模式 elicitation，2025-11-25）在 2026 年上半年仍是实验性的；依赖它之前请检查 SDK 版本。

**类型：** 构建
**语言：** Python（标准库、roots + elicitation 演示）
**前置课程：** Phase 13 · 07（MCP 服务器）
**时间：** 约 45 分钟

## 学习目标

- 声明 `roots` 并响应 `notifications/roots/list_changed`。
- 将服务器文件操作限制在已声明根集合中的 URI 内。
- 使用 `elicitation/create` 在工具调用中途请求用户确认或结构化输入。
- 在表单模式与 URL 模式 elicitation 之间选择（后者是实验性的，需注意漂移风险）。

## 问题

一个笔记 MCP 服务器在生产中会遇到两个具体失败。

**路径假设损坏。** 服务器针对 `~/notes` 编写。用户在另一台机器上，笔记位于 `~/Documents/Notes`，于是工具调用静默失败（找不到文件），更糟时还会写错地方。

**用户知道、模型不知道的缺失参数。** 用户说“删除旧的 TPS report 笔记”。模型调用 `notes_delete(title: "TPS report")`，但 2023、2024、2025 年有三条匹配笔记。工具无法猜测。返回“有歧义”很烦人；在三条上全部执行则是灾难性的。

Roots 解决第一个问题：客户端在 `initialize` 时声明服务器可以接触的 URI 集合。Elicitation 解决第二个问题：服务器暂停工具调用，发送 `elicitation/create`，请用户选择具体的一条。

## 概念

### Roots

客户端在 `initialize` 时声明根列表：

```json
{
  "capabilities": {"roots": {"listChanged": true}}
}
```

服务器随后可以调用 `roots/list`：

```json
{"roots": [{"uri": "file:///Users/alice/Documents/Notes", "name": "Notes"}]}
```

服务器必须将 roots 作为边界：根集合之外的任何文件读取或写入都要拒绝。这不是客户端强制的（服务器仍然是用户信任的代码），但符合规范的服务器会遵守。

用户增加或删除根时，客户端发送 `notifications/roots/list_changed`。服务器重新调用 `roots/list`，更新自己的边界。

### Roots 为什么是客户端原语

Roots 由客户端声明，因为它们代表用户的同意模型。用户告诉 Claude Desktop“让这个笔记服务器访问这两个目录”。服务器不能扩大这个范围。

### Elicitation：默认的表单模式

`elicitation/create` 接收一个表单 schema 和自然语言提示：

```json
{
  "method": "elicitation/create",
  "params": {
    "message": "Delete 'TPS report'? Multiple notes match; pick one.",
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
```

客户端渲染表单，收集用户回答，然后返回：

```json
{
  "action": "accept",
  "content": {"note_id": "note-14", "confirm": true}
}
```

有三种可能的动作：`accept`（用户填写完成）、`decline`（用户关闭表单）、`cancel`（用户取消整个工具调用）。

表单 schema 是扁平的——v1 不支持嵌套对象。SDK 通常会拒绝比单层复杂的结构。

### Elicitation：URL 模式（SEP-1036，实验性）

2025-11-25 新增。不发送 schema，服务器改为发送 URL：

```json
{
  "method": "elicitation/create",
  "params": {
    "message": "Sign in to GitHub",
    "url": "https://github.com/login/oauth/authorize?client_id=..."
  }
}
```

客户端在浏览器中打开 URL，等待完成，用户返回后再返回结果。在表单不足以处理的场景中很有用，例如 OAuth 流程、支付授权和文档签名。

漂移风险提示：SEP-1036 的响应形状仍在稳定；一些 SDK 返回回调 URL，另一些返回完成 token。生产环境使用 URL 模式前请阅读 SDK 的发布说明。

### 何时应该使用 Elicitation

- 破坏性动作前的用户确认（破坏性提示 + elicitation）。
- 消除歧义（从 N 个匹配项中选择一个）。
- 首次设置（API key、目录、偏好）。
- OAuth 风格流程（URL 模式）。

### 何时不该使用 Elicitation

- 填写模型本可以在文本中询问的工具必填参数。使用普通的重新提示，不要用 elicitation 对话框。
- 高频调用。Elicitation 会打断对话，不要在循环内触发它。
- 服务器可以事后校验的任何内容。校验后返回错误，让模型用文本询问用户。

### 人在回路桥接

Elicitation 与 sampling 结合，就实现了 MCP 的“人在回路”模式。服务器智能体循环可以因为用户输入（elicitation）或模型推理（sampling）而暂停。Phase 13 · 11 介绍 sampling，本课介绍 elicitation。将两者组合起来，就得到完整的循环中控制。

```figure
t3-roots-boundary
```

## 动手使用

`code/main.py` 在笔记服务器上增加：

- `roots/list` 响应，服务器在根列表变更通知之后重新查询它。
- 当多个笔记匹配时，使用 `elicitation/create` 消除歧义的 `notes_delete` 工具。
- 使用 URL 模式 elicitation 打开首次配置页面（模拟）的 `notes_setup` 工具。
- 边界检查：拒绝对声明根之外 URI 的操作。

演示运行三个场景：顺利路径（一个匹配）、消歧（三个匹配，触发 elicitation）、根外写入（拒绝）。

## 交付物

本课会生成 `outputs/skill-elicitation-form-designer.md`。给定一个可能需要用户确认或消歧的工具，这个 skill 会设计 elicitation 表单 schema 和消息模板。

## 练习

1. 运行 `code/main.py`。触发消歧路径，确认模拟用户回答被路由回工具。

2. 添加一个 `notes_archive` 工具，每次都需要 elicitation 确认（破坏性提示）。检查 UX：它与让模型用文本再次询问相比如何？

3. 为首次 OAuth 流程实现 URL 模式 elicitation。记录漂移风险，并加入 SDK 版本守卫。

4. 扩展 `roots/list` 处理：收到通知时，服务器应原子地重新读取并重新扫描可能已经超出范围的打开文件句柄。

5. 阅读 GitHub 上 SEP-1036 的 issue 讨论串。找出一个会影响服务器处理 URL 模式回调方式的开放问题。

## 术语

| 术语 | 人们常说 | 实际含义 |
|------|----------------|------------------------|
| Root | “同意边界” | 客户端允许服务器接触的 URI |
| `roots/list` | “服务器请求范围” | 客户端返回当前根集合 |
| `notifications/roots/list_changed` | “用户改变范围” | 客户端表示根集合发生变化 |
| Elicitation | “调用中途询问用户” | 服务器发起的结构化用户输入请求 |
| `elicitation/create` | “那个方法” | Elicitation 请求的 JSON-RPC 方法 |
| 表单模式 | “Schema 驱动的表单” | 在客户端 UI 中渲染为表单的扁平 JSON Schema |
| URL 模式 | “浏览器重定向” | SEP-1036 实验性模式；打开 URL 并等待 |
| `accept` / `decline` / `cancel` | “用户响应结果” | 服务器需要处理的三条分支 |
| 消歧 | “挑一个” | 工具有 N 个候选项时的常见 elicitation 用例 |
| 扁平表单 | “仅顶层属性” | Elicitation schema 不能嵌套 |

## 延伸阅读

- [MCP — Client roots spec](https://modelcontextprotocol.io/specification/draft/client/roots) — roots 权威参考
- [MCP — Client elicitation spec](https://modelcontextprotocol.io/specification/draft/client/elicitation) — elicitation 权威参考
- [Cisco — What's new in MCP elicitation, structured content, OAuth enhancements](https://blogs.cisco.com/developer/whats-new-in-mcp-elicitation-structured-content-and-oauth-enhancements) — 2025-11-25 新增内容演练
- [MCP — GitHub SEP-1036](https://github.com/modelcontextprotocol/modelcontextprotocol) — URL 模式 elicitation 提案（实验性，有漂移风险）
- [The New Stack — How elicitation brings human-in-the-loop to AI tools](https://thenewstack.io/how-elicitation-in-mcp-brings-human-in-the-loop-to-ai-tools/) — UX 演练
