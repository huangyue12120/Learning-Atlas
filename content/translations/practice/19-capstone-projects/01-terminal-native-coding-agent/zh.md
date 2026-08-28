---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/01-terminal-native-coding-agent/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: fbe91598394614c9e50a3f02fe376aa1d7086d381f34f63223795345bf59f0a9
status: reviewed
---

# 毕业项目 01——终端原生编码智能体

> 到 2026 年，编码智能体的形态已经基本确定：TUI 工作台、有状态计划、沙箱化工具面，以及负责规划、行动、观察和恢复的循环。从几十英尺外看，Claude Code、Cursor 3 和 OpenCode 都很相似。本毕业项目要求你端到端构建其中一个——从 CLI 输入到拉取请求输出——并在 SWE-bench Pro 上与 mini-swe-agent 和 Live-SWE-agent 做比较。你会看到，难点不在模型调用，而在工具循环、沙箱，以及一次 50 回合运行的成本上限。

**类型：** 毕业项目
**语言：** TypeScript / Bun（工作台）、Python（评测脚本）
**前置课程：** 第 11 阶段（LLM 工程）、第 13 阶段（工具与协议）、第 14 阶段（智能体）、第 15 阶段（自治系统）、第 17 阶段（基础设施）
**涉及阶段：** P0 · P5 · P7 · P10 · P11 · P13 · P14 · P15 · P17 · P18
**用时：** 35 小时

## 问题

到 2026 年，编码智能体已经成为主流 AI 应用类别。Claude Code（Anthropic）、配备 Composer 2 和 Agent Tabs 的 Cursor 3（Cursor）、Amp（Sourcegraph）、OpenCode（11.2 万颗星）、Factory Droids，以及 Google Jules，都在交付同一种架构的不同变体：终端工作台、经过权限控制的工具面、沙箱，以及围绕前沿模型构建的规划—行动—观察循环。前沿结果很集中——Live-SWE-agent 配合 Opus 4.5 在 SWE-bench Verified 上达到 79.2%——但工程实践面很广。多数失败模式并非模型犯错，而是工具循环不稳定、上下文中毒、词元成本失控，以及破坏性的文件系统操作。

你无法只从外部推理这些智能体。你必须亲手构建一个，亲眼看着它在第 47 回合因 ripgrep 返回 8 MB 匹配结果而崩溃，再重建截断层。这正是本毕业项目的意义。

## 概念

工作台有四个面。**规划（Plan）**维护一个 TodoWrite 风格的状态对象，模型每回合都会重写它。**行动（Act）**分派工具调用（读取、编辑、运行、搜索、git）。**观察（Observe）**捕获 stdout / stderr / 退出码，执行截断，然后把摘要送回模型。**恢复（Recover）**处理工具错误，既不撑爆上下文窗口，也不无限循环。2026 年的形态还增加了一个要素：**钩子（hooks）**。`PreToolUse`、`PostToolUse`、`SessionStart`、`SessionEnd`、`UserPromptSubmit`、`Notification`、`Stop` 和 `PreCompact` 是可配置的扩展点，操作员可以在这里注入策略、遥测和防护栏。

沙箱使用 E2B 或 Daytona。每个任务都在一个全新的开发容器中运行，并挂载一个可读写的 git worktree。工作台绝不触碰宿主文件系统。任务成功或失败后，worktree 都会被拆除。成本控制分三层执行：每回合词元上限、每会话美元预算，以及硬性的回合数上限（通常为 50）。可观测性层使用带 GenAI 语义约定的 OpenTelemetry span，并发送到自托管 Langfuse。

## 架构

```text
  用户 CLI  ->  工作台（Bun + Ink TUI）
                  |
                  v
           规划 / 行动 / 观察循环  <--->  Claude Sonnet 4.7 / GPT-5.4-Codex / Gemini 3 Pro
                  |                          （通过 OpenRouter，与模型无关）
                  v
           工具分派器（MCP StreamableHTTP 客户端）
                  |
     +------------+------------+----------+
     v            v            v          v
  读取/编辑    ripgrep     tree-sitter   git/运行
     |            |            |          |
     +------------+------------+----------+
                  |
                  v
           E2B / Daytona 沙箱（隔离的 worktree）
                  |
                  v
           钩子：Pre/Post、Session、Prompt、Compact
                  |
                  v
           OpenTelemetry -> Langfuse（span、词元、$）
                  |
                  v
           通过 GitHub app 创建 PR
```

## 技术栈

- 工作台运行时：Bun 1.2 + Ink 5（终端中的 React）
- 模型访问：OpenRouter 统一 API，使用 Claude Sonnet 4.7、GPT-5.4-Codex、Gemini 3 Pro，以及最困难任务使用的 Opus 4.5
- 工具传输：Model Context Protocol StreamableHTTP（MCP 2026 修订版）
- 沙箱：E2B 沙箱（JS SDK）或 Daytona 开发容器
- 代码搜索：ripgrep 子进程，面向 17 种语言的 tree-sitter 解析器（预编译）
- 隔离：每个任务执行一次 `git worktree add`，成功/失败后清理
- 评测工作台：SWE-bench Pro（verified 子集）+ Terminal-Bench 2.0 + 自建的 30 个任务留出集
- 可观测性：带 `gen_ai.*` 语义约定的 OpenTelemetry SDK → 自托管 Langfuse
- 提交 PR：GitHub App，使用细粒度 token，权限范围限制在目标仓库

```figure
ce-agent-loop
```

## 动手构建

1. **TUI 与命令循环。** 使用 Ink 搭建 Bun 项目。接受 `agent run <repo> "<task>"`。打印分栏视图：顶部为计划窗格，中部为工具调用流，底部为词元预算。增加 Ctrl-C 取消功能，退出前触发 `SessionEnd` 钩子。

2. **计划状态。** 定义带类型的 TodoWrite schema（包含 pending / in_progress / done 项和 notes）。模型每回合通过一次工具调用重写完整状态——不要允许它增量修改。将计划持久化到 `.agent/state.json`，使崩溃后能够恢复。

3. **工具面。** 定义六个工具：`read_file`、`edit_file`（带 diff 预览）、`ripgrep`、`tree_sitter_symbols`、`run_shell`（带超时）和 `git`（status / diff / commit / push）。通过 MCP StreamableHTTP 暴露它们，使工作台与传输解耦。每个工具都返回截断后的输出（每次调用最多 4k 词元）。

4. **包装沙箱。** 每个任务都生成一个 E2B 沙箱。使用 `git worktree add -b agent/$TASK_ID` 创建新分支。所有工具调用都在沙箱内部执行，无法访问宿主文件系统。

5. **钩子。** 实现全部八种 2026 钩子类型。接入至少四个用户编写的钩子：(a) `PreToolUse` 破坏性命令防护，在 worktree 外阻止 `rm -rf`；(b) `PostToolUse` 词元记账；(c) `SessionStart` 预算初始化；(d) `Stop` 写出最终 trace bundle。

6. **评测循环。** 克隆 SWE-bench Pro Python 的 30 个 issue 子集。让工作台逐个运行。与 mini-swe-agent（最小基线）比较 pass@1、每任务回合数和每任务美元成本。将结果写入 `eval/results.jsonl`。

7. **成本控制。** 硬限制为 50 回合、200k 上下文和每任务 $5。`PreCompact` 钩子在达到 150k 时把较早回合压缩为 prior-state 块，释放空间容纳新的观察，同时不丢失计划。

8. **提交 PR。** 成功时，最后一步是 `git push`，再调用 GitHub API 打开一个 PR，并在正文中放入计划和 diff 摘要。

## 实际使用

```text
$ agent run ./my-repo "Fix the race condition in worker.rs"
[plan]  1 locate worker.rs and enumerate mutex uses
        2 identify shared state under contention
        3 propose fix, verify tests
[tool]  ripgrep mutex.*lock -t rust           (44 matches, truncated)
[tool]  read_file src/worker.rs 120..180
[tool]  edit_file src/worker.rs (+8 -3)
[tool]  run_shell cargo test worker::          (passed)
[plan]  1 done · 2 done · 3 done
[done]  PR opened: #482   turns=9   tokens=38k   cost=$0.41
```

## 交付

交付物 skill 位于 `outputs/skill-terminal-coding-agent.md`。给定仓库路径和任务描述，它会在沙箱中运行完整的规划—行动—观察循环，并返回 PR URL 和 trace bundle。本毕业项目的评分标准如下：

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | SWE-bench Pro pass@1 与基线的比较 | 在 30 个匹配的 Python 任务上比较你的工作台与 mini-swe-agent |
| 20 | 架构清晰度 | 对照 Live-SWE-agent 布局审查规划/行动/观察分离、钩子面和工具 schema |
| 20 | 安全性 | 沙箱逃逸测试、权限提示、破坏性命令防护通过红队测试 |
| 20 | 可观测性 | 工具调用 span 完整率 100%，并按回合记账词元 |
| 15 | 开发者体验 | 冷启动 < 2 秒、崩溃恢复可继续计划、Ctrl-C 能干净取消进行中的工具 |
| **100** | | |

## 练习

1. 将后端模型从 Claude Sonnet 4.7 换成通过 vLLM 提供的 Qwen3-Coder-30B。比较 pass@1 和每任务美元成本，报告开源模型表现较弱的地方。

2. 增加一个 `reviewer` 子智能体，在提交 PR 前读取 diff，并可以要求进入修订循环。测量误报式审查是否会使 SWE-bench 通过率低于单智能体基线（提示：通常会）。

3. 对沙箱做压力测试：编写一个尝试 `curl` 外部 URL 的任务，以及一个尝试写入 worktree 外部的任务。确认两者都被 `PreToolUse` 钩子阻止，并记录尝试。

4. 使用更小的模型（Haiku 4.5）实现 `PreCompact` 摘要。测量压缩 3 次后计划保真度损失了多少。

5. 将 MCP StreamableHTTP 传输换成 stdio。基准测试冷启动和每次调用延迟，为仅本地使用选择胜者。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Harness | “智能体循环” | 围绕模型编写的代码，负责分派工具、维护计划状态和执行预算 |
| Hook | “智能体事件监听器” | 工作台在八种生命周期事件之一上运行的用户脚本 |
| Worktree | “Git 沙箱” | 位于独立路径的链接式 git checkout；不触碰主克隆即可丢弃 |
| TodoWrite | “计划状态” | 模型每回合重写的、带类型的 pending/in-progress/done 列表 |
| StreamableHTTP | “MCP 传输” | 2026 MCP 修订版：带双向流的长连接 HTTP；取代 SSE |
| Token ceiling | “上下文预算” | 每回合或每会话对输入 + 输出词元的上限；达到后触发压缩或终止 |
| pass@1 | “单次尝试通过率” | SWE-bench 任务第一次运行、未重试且未窥探测试集就解决的比例 |

## 延伸阅读

- [Claude Code 文档](https://docs.anthropic.com/en/docs/claude-code)——Anthropic 的参考工作台
- [Cursor 3 更新日志](https://cursor.com/changelog)——Agent Tabs 和 Composer 2 产品说明
- [mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent)——用于 SWE-bench 工作台比较的最小基线
- [Live-SWE-agent](https://github.com/OpenAutoCoder/live-swe-agent)——配合 Opus 4.5 在 SWE-bench Verified 上达到 79.2%
- [OpenCode](https://opencode.ai)——拥有 11.2 万颗星的开放工作台
- [SWE-bench Pro 排行榜](https://www.swebench.com)——本毕业项目针对的评测
- [Model Context Protocol 2026 路线图](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/)——StreamableHTTP、能力元数据
- [OpenTelemetry GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/)——工具调用和词元使用的 span schema
