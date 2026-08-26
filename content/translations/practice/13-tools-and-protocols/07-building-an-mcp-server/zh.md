---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/07-building-an-mcp-server/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 8acac5ca68ac5a3057d94199905e5f26743fda4624b4eea05087a84e2857a76e
status: reviewed
---

# 构建 MCP 服务器：无状态 Python 与 TypeScript

> 现代 MCP 服务器不会记住握手。它会在每个请求上校验元数据，运行一个处理器，并返回一个带类型的结果。

**类型：** 构建
**语言：** Python、TypeScript
**前置课程：** Phase 13，第 06 课
**预计时间：** 约 85 分钟

## 学习目标

- 为 MCP `2026-07-28` 实现必需的 `server/discover`。
- 在每个请求上校验协议版本和客户端能力。
- 以确定性顺序暴露工具、资源和提示词。
- 在正确的结果上返回 `resultType`、服务器身份和缓存提示。
- 在 Python 与 TypeScript 中通过换行分隔的 stdio 提供相同的无状态契约。

## 问题

在第一条消息后保存客户端能力的服务器很容易写，却很难运行。同一个进程可能服务先后到来的客户端；远程请求可能落到另一台 worker；过期的能力声明会把行为泄露到不同授权边界。

MCP `2026-07-28` 通过让每个请求自描述来解决协议层的问题。应用仍可以保存持久化笔记、作业或显式状态句柄，但不能保存改变后续请求解码方式的隐藏协议状态。

本课构建两份 notes server。Python 和 TypeScript 版本只用各自标准库实现协议核心；两者暴露相同的方法，并执行相同的线契约。

## 概念

### 现代分发循环

```text
read one JSON-RPC line
parse the envelope
if it is a notification, do not respond
validate params._meta for this request
route by method
wrap success with resultType and serverInfo
write one JSON-RPC response line
forget request-scoped metadata
```

stdio 仍有三条重要规则：

- stdout 只能写 JSON-RPC 消息；诊断信息写 stderr。
- 用换行分隔消息，并 flush 每个响应。
- stdin 到达 EOF 时及时退出。

进程生命周期是传输生命周期，不是现代 MCP 会话。

### 请求校验

每个请求都必须包含：

```json
{
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {
        "name": "notes-client",
        "version": "1.0.0"
      }
    }
  }
}
```

前两个字段必需，`clientInfo` 推荐。若存在身份对象，应校验其形状，但不能把它当认证。

不支持的版本返回 `-32022` 以及 `requested`、`supported`；缺失请求元数据是 `-32602`。绝不能从上一个调用补齐字段。

### 必需的发现

现代服务器必须实现 `server/discover`。完整的发现结果包括支持的现代版本、能力、可选说明、缓存提示和结果 `_meta` 中的服务器身份：

```json
{
  "resultType": "complete",
  "supportedVersions": ["2026-07-28"],
  "capabilities": {
    "tools": {"listChanged": false},
    "resources": {"listChanged": false, "subscribe": false},
    "prompts": {"listChanged": false}
  },
  "ttlMs": 3600000,
  "cacheScope": "public",
  "_meta": {
    "io.modelcontextprotocol/serverInfo": {
      "name": "notes-server",
      "version": "2.0.0"
    }
  }
}
```

发现不会解锁服务器。由于 `tools/list` 已经携带同样的请求元数据，客户端可以不先发现就调用它。

### 工具

`tools/list` 返回确定性排列的工具描述。稳定顺序有助于缓存，并保持模型上下文稳定；结果还必须有 `ttlMs` 和 `cacheScope`。

`tools/call` 返回内容块和 `isError`。协议信封或方法参数无效时使用 JSON-RPC 错误；有效调用执行后工具自身失败时，返回 `isError: true`。

工具注解仍是提示而非强制机制：`readOnlyHint`、`destructiveHint`、`idempotentHint`、`openWorldHint`。host 可用它们做确认和展示，但服务器仍必须执行真正的授权。

### 资源

`resources/list` 返回稳定的 URI 描述，`resources/read` 返回带类型的内容。两者在 `2026-07-28` 中都可缓存，因此都包含 `ttlMs` 与 `cacheScope`。

用户专属笔记应使用 `cacheScope: "private"`。共享缓存不得跨授权上下文复用私有响应。

现代变更传递不使用 `resources/subscribe`。客户端会打开 `subscriptions/listen`，请求资源或列表变更类别；第 10 课会构建这条流程。

### 提示词

`prompts/list` 应确定性地返回可缓存列表；`prompts/get` 用参数渲染命名提示词。渲染结果是完整结果，但不是必须附带缓存提示的 list/read 结果。

### 每个成功结果都有类型

示例对每个成功响应使用同一个包装器：

```python
def complete(payload):
    return {
        "resultType": "complete",
        **payload,
        "_meta": {SERVER_INFO_KEY: SERVER_INFO},
    }
```

列表、读取和发现处理器再加上 `ttlMs` 与 `cacheScope`。集中包装可以防止某个处理器悄悄漏掉现代结果字段。

### 不发起服务器主动请求

现代服务器可以发送与客户端请求相关的通知，或发送到客户端打开的 `subscriptions/listen` 流上的通知，但不能发送自己的 JSON-RPC 请求。

处理器需要 sampling、elicitation 或 Roots 输入时，应返回 `input_required` 结果。客户端完成内嵌输入后，以新的请求 ID 重试原方法。第 11 课会讲 Multi Round-Trip Request。

### 明确的旧版兼容

双时代服务器可以在清楚隔离的旧版分支中实现 `2025-11-25` 握手。检测到完整的现代 `_meta` 时走现代行为，收到 `initialize` 时才走旧版行为。

不要让 `2026-07-28` 请求进入旧版握手路径，也不要把现代 `resultType` 写入旧版初始化响应。本课代码刻意只实现现代分支，让不变量保持可见。

```figure
t3-dispatch-loop
```

## 使用

运行 Python 服务器的有限 demo 和测试：

```bash
cd code
python3 main.py --demo
python3 -m unittest discover tests -v
```

用 TypeScript runner 运行 TypeScript 版本：

```bash
npx tsx main.ts --demo
```

demo 会发送 `server/discover`，列出每种原语，调用工具并展示不支持版本错误。每个现代请求都重复元数据，每个成功结果都包含服务器身份。

## 交付

本课交付 `outputs/skill-mcp-server-scaffolder.md`，用于生成包含发现契约、逐请求校验、确定性可缓存列表和可选隔离旧版适配器的现代服务器方案。

## 练习

1. 删除某个请求的能力，证明服务器不会复用上一个请求的声明。
2. 反转 `TOOLS`、`PROMPTS` 和笔记插入顺序，确认所有列表结果仍稳定。
3. 增加 destructive `notes_delete` 工具，并在执行器内部做授权检查；保留 `destructiveHint` 作为 UX 提示。
4. 增加带 `ttlMs`、`cacheScope` 和确定性顺序的 `resources/templates/list`。
5. 为 `2025-11-25` 构建独立旧版适配器，并测试现代请求绝不会进入该适配器。

## 关键术语

| 术语 | 含义 |
|------|------|
| 无状态服务器 | 从自己的请求元数据处理请求，不依赖协议会话内存 |
| `server/discover` | 声明版本和能力的必需现代方法 |
| 完整结果 | 带 `resultType: "complete"` 的成功现代结果 |
| 可缓存结果 | 带 `ttlMs` 和 `cacheScope` 的发现、列表或资源读取结果 |
| 确定性列表 | 同一逻辑注册表总是返回相同顺序 |
| 服务器身份 | 结果 `_meta` 中推荐的 `io.modelcontextprotocol/serverInfo` |
| 工具错误 | 有效工具调用返回 `isError: true` |
| 协议错误 | 通过 `error` 返回的无效 JSON-RPC 或 MCP 请求 |

## 延伸阅读

- [MCP Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/)
- [MCP Server Discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [MCP Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP Resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)
- [MCP Prompts](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts)
- [MCP stdio Transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
