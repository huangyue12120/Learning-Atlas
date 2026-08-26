---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/13-mcp-async-tasks/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 06ebaeaa5d2c0bdf02903f0b23005f69afb6886124bb8b526563720af195fa1d
status: reviewed
---

# 异步任务（SEP-1686）——长时工作现在调用、稍后获取

> 真正的智能体工作可能持续几分钟到几小时：CI 运行、深度研究综合、批量导出。同步工具调用会丢失连接、超时或阻塞界面。SEP-1686 于 2025-11-25 合并，引入了 Tasks 原语：任何请求都可以增强为一个任务，结果稍后获取，或者通过状态通知流式传送。漂移风险提示：截至 2026 年上半年，Tasks 仍是实验性功能，SDK 接口仍在围绕规范设计。

**类型：** 构建
**语言：** Python（标准库，异步任务状态机）
**前置课程：** Phase 13 · 07（MCP 服务器）、Phase 13 · 09（传输）
**时间：** 约 75 分钟

## 学习目标

- 判断何时应将工具从同步调用提升为任务增强调用（服务器端工作超过 30 秒）。
- 走通任务生命周期：`working` → `input_required` → `completed` / `failed` / `cancelled`。
- 持久化任务状态，使崩溃不会丢失进行中的工作。
- 正确轮询 `tasks/status`，并在完成后获取 `tasks/result`。

## 问题

一个 `generate_report` 工具运行一个耗时数分钟的抽取流水线。在同步模型下有几种选择：

1. 将连接保持三分钟。远程传输会断开；客户端会超时；UI 会冻结。
2. 立即返回占位符；要求客户端轮询自定义端点。这破坏了 MCP 的统一性。
3. 发出后不再等待；没有结果。

这些方案都不好。SEP-1686 增加了第四种方案：任务增强。任何请求（通常是 `tools/call`）都可以标记为任务。服务器立即返回任务 ID。客户端轮询 `tasks/status`，完成后获取 `tasks/result`。服务器端状态可以跨重启保留。

## 概念

### 任务增强

将 `params._meta.task.required: true`（或 `optional: true`，由服务器决定）写入请求，就会把请求变成任务。服务器立即响应：

```json
{
  "jsonrpc": "2.0", "id": 1,
  "result": {
    "_meta": {
      "task": {
        "id": "tsk_9f7b...",
        "state": "working",
        "ttl": 900000
      }
    }
  }
}
```

`ttl` 是服务器承诺保留状态的时间；超过 ttl 后，任务结果会被丢弃。

### 按工具选择加入

工具注解可以声明任务支持情况：

- `taskSupport: "forbidden"`——此工具始终同步运行。适合快速工具。
- `taskSupport: "optional"`——客户端可以请求任务增强。
- `taskSupport: "required"`——客户端必须使用任务增强。

`generate_report` 工具会设置为 `required`。`notes_search` 工具会设置为 `forbidden`。

### 状态

```text
working  -> input_required -> working  (loop via elicitation)
working  -> completed
working  -> failed
working  -> cancelled
```

状态机只追加状态：一旦进入 `completed`、`failed` 或 `cancelled`，任务就处于终止状态。

### 方法

- `tasks/status {taskId}`——返回当前状态和进度提示。
- `tasks/result {taskId}`——尚未完成时阻塞或返回 404。
- `tasks/cancel {taskId}`——幂等；终止状态会忽略该请求。
- `tasks/list`——可选；枚举活跃任务和最近完成的任务。

### 流式状态变化

服务器支持时，客户端可以订阅状态通知：

```text
server -> notifications/tasks/updated {taskId, state, progress?}
```

相比轮询，使用流式通知的客户端能提供更好的 UX。轮询始终作为最小支持面可用。

### 持久化状态

规范要求声明支持任务的服务器持久化状态。崩溃不应丢失 ttl 内已经完成的结果。存储可以是 SQLite、Redis 或文件系统等。第 13 课的 harness 使用文件系统。

### 取消语义

`tasks/cancel` 是幂等的。如果任务正在执行，服务器会尝试停止它（检查执行器是否协作式取消）。如果任务已经终止，该请求不产生任何作用。

### 崩溃恢复

服务器进程重启时：

1. 加载所有持久化的任务状态。
2. 将进程死亡时处于 `working` 的任务标记为 `failed`，错误为 `CRASH_RECOVERY`。
3. 在 ttl 内保留 `completed` / `failed` / `cancelled` 状态。

### 异步任务与采样

任务本身可以调用 `sampling/createMessage`。长时研究任务正是这样工作的：服务器的任务线程按需对客户端模型进行采样，同时客户端 UI 将任务显示为 `working`，并定期更新进度。

### 为什么它仍是实验性的

SEP-1686 于 2025-11-25 发布，但更广泛的路线图仍列出三个开放问题：持久订阅原语、子任务（父子任务关系）以及结果 TTL 标准化。预计规范在 2026 年继续演进。生产代码只能将 Tasks 的常见用例视为稳定，并应针对子任务的未来 SDK 变化设置防护。

```figure
tp-task-lifecycle
```

## 动手使用

`code/main.py` 实现了一个持久化任务存储（基于文件系统），以及一个在后台线程运行的 `generate_report` 工具。客户端调用工具后立即得到任务 ID，在工作线程更新进度时轮询 `tasks/status`，完成后获取 `tasks/result`。支持取消；通过终止工作线程并重新加载状态来模拟崩溃恢复。

注意观察：

- 任务状态 JSON 持久化到 `/tmp/lesson-13-tasks/<id>.json`。
- 工作线程更新 `progress` 字段；轮询会显示它不断推进。
- 客户端取消会设置一个事件；工作线程检查它并提前退出。
- “崩溃”时重新加载状态会将进行中的任务标记为 `failed`，错误为 `CRASH_RECOVERY`。

## 交付物

本课产出 `outputs/skill-task-store-designer.md`。给定一个长时工具（研究、构建、导出），该 skill 会设计任务存储（状态形状、ttl、持久性）、选择合适的 `taskSupport` 标志，并勾画进度通知。

## 练习

1. 运行 `code/main.py`。启动一个 `generate_report` 任务，轮询状态，然后获取结果。

2. 添加一次运行中的 `tasks/cancel` 调用。验证工作线程遵守取消，并且状态变为 `cancelled`。

3. 模拟崩溃恢复：终止工作线程，重启加载器，观察 `CRASH_RECOVERY` 失败模式。

4. 将存储扩展为 SQLite。持久性收益相同；查询选项更多（列出会话 X 的全部任务）。

5. 阅读 2026 年 MCP 路线图文章。找出一个最可能在下一年影响 SDK API 设计的 Tasks 开放问题。

## 术语

| 术语 | 人们会怎么说 | 它实际表示什么 |
|------|----------------|------------------------|
| Task | “长时工具调用” | 使用 `_meta.task` 增强、以异步方式执行的请求 |
| SEP-1686 | “Tasks 规范” | 在 2025-11-25 加入 Tasks 的规范演进提案 |
| `_meta.task` | “任务信封” | 包含 ID、状态、ttl 的逐请求元数据 |
| taskSupport | “工具标志” | 每个工具的 `forbidden` / `optional` / `required` 设置 |
| `tasks/status` | “轮询方法” | 获取当前状态和可选的进度提示 |
| `tasks/result` | “获取结果” | 返回已完成的载荷，或在尚未完成时返回 404 |
| `tasks/cancel` | “停止它” | 幂等的取消请求 |
| ttl | “保留预算” | 服务器承诺保留任务状态的毫秒数 |
| `notifications/tasks/updated` | “状态推送” | 服务器发起的状态变化事件 |
| 持久化存储 | “抗崩溃状态” | 文件系统 / SQLite / Redis 持久化层 |

## 延伸阅读

- [MCP — GitHub SEP-1686 issue](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1686)——起始提案及完整讨论
- [WorkOS — MCP async tasks for AI agent workflows](https://workos.com/blog/mcp-async-tasks-ai-agent-workflows)——带设计理由的 walkthrough
- [DeepWiki — MCP task system and async operations](https://deepwiki.com/modelcontextprotocol/modelcontextprotocol/2.7-task-system-and-async-operations)——机制与状态机
- [FastMCP — Tasks](https://gofastmcp.com/servers/tasks)——SDK 层任务实现模式
- [MCP blog — 2026 roadmap](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/)——包括子任务在内的开放问题与 2026 年优先事项
