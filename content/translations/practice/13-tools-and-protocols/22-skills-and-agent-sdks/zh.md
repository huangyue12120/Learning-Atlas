---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/22-skills-and-agent-sdks/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 48242f46e157c9744205b41e33ddb17a5f57d0df6c64a626d97ac19bfb7f6488
status: reviewed
---

# Skills 与智能体 SDK——Anthropic Skills、AGENTS.md、OpenAI Apps SDK

> MCP 说明“有哪些工具”。Skills 说明“如何完成任务”。2026 年的技术栈将二者叠加。Anthropic 的 Agent Skills（开放标准，2025 年 12 月）以 SKILL.md 形式发布，并采用渐进式披露。AGENTS.md（如今已出现在 60,000 多个仓库中）位于仓库根目录，作为项目级智能体上下文。OpenAI 的 Apps SDK 是 MCP 加 widget 元数据。本课命名每一层的覆盖范围，并构建一个最小的 SKILL.md + AGENTS.md bundle，让它可以跨智能体使用。

**类型：** 学习
**语言：** Python（标准库，SKILL.md 解析器与加载器）
**前置课程：** Phase 13 · 07（MCP 服务器）
**时间：** 约 45 分钟

## 学习目标

- 区分三层：AGENTS.md（项目上下文）、SKILL.md（可复用知识）、MCP（工具）。
- 编写带 YAML frontmatter 和渐进式披露的 SKILL.md。
- 像加载文件系统一样将 skills 加载到智能体运行时。
- 将 skill 与 MCP 服务器和 AGENTS.md 组合起来，使一个 package 可以在 Claude Code、Cursor 和 Codex 中工作。

## 问题

一名工程师将一套发布说明写作流程提炼成多步提示词：“阅读最近合并的 PR。按领域分组。分别总结。遵循团队风格写一条 changelog。发布到 Slack 草稿。”他们把它放在 Notion 文档中供团队使用。

现在他们想从 Claude Code、Cursor 和 Codex CLI 使用这套流程。每个智能体加载指令的方式不同：Claude Code slash-command、Cursor rules、Codex `.codex.md`。工程师复制三份流程，并维护三份副本。

AGENTS.md 和 SKILL.md 一起解决这个问题：

- **AGENTS.md** 位于仓库根目录。每个兼容的智能体在会话开始时读取它。“这个项目如何工作？约定是什么？运行哪些命令来测试？”
- **SKILL.md** 是一个可移植 bundle：YAML frontmatter（name、description）+ Markdown 正文 + 可选资源。支持 skills 的智能体按名称按需加载它。
- **MCP**（Phase 13 · 06–14）负责 skill 需要调用的工具。

三层，一个可移植 artifact。

## 概念

### AGENTS.md（agents.md）

它于 2025 年底出现，到 2026 年 4 月已被 60,000 多个仓库采用。它是仓库根目录的一个文件。格式如下：

```markdown
# Project: my-service

## Conventions
- 使用严格模式的 TypeScript。
- Python 侧的模型使用 Pydantic。
- 测试使用 `pnpm test` 运行。

## Build and run
- 使用 `pnpm dev` 启动本地开发服务器。
- 使用 `pnpm build` 构建生产 bundle。
```

智能体在会话开始时读取它，并据此校准针对该项目的行为。2026 年的每个编码智能体都支持 AGENTS.md：Claude Code、Cursor、Codex、Copilot Workspace、opencode、Windsurf、Zed。

### SKILL.md 格式

Anthropic 的 Agent Skills（2025 年 12 月作为开放标准发布）：

```markdown
---
name: release-notes-writer
description: 按照本项目的风格，为最近合并的 PR 撰写 changelog 条目。
---

# 发布说明撰写器

调用时，执行以下步骤：

1. 列出上一个 tag 以来合并的 PR。使用 `gh pr list --base main --state merged`。
2. 按标签分组：feature、fix、chore、docs。
3. 对每个分组中的每个 PR 写一行：`- <title> (#<num>)`。
4. 起草发布说明，并将它们暂存到 CHANGELOG.md。

如果用户说“ship”，运行 `git tag vX.Y.Z` 和 `gh release create`。

## 备注

- 永远不要包含没有 PR 的提交。
- 从公开 changelog 中跳过“chore”条目。
```

frontmatter 声明 skill 的身份。正文是 skill 加载时展示给模型的提示词。

### 渐进式披露

Skills 可以引用智能体只在需要时才获取的子资源。示例：

```text
skills/
  release-notes-writer/
    SKILL.md
    style-guide.md
    template.md
    scripts/
      generate.sh
```

SKILL.md 会写“需要时参见 style-guide.md 获取风格规则”。只有 skill 真正运行时，智能体才读取 style-guide.md。这样可以避免用模型可能不需要的细节撑大提示词。

### 文件系统发现

智能体运行时会扫描已知目录中的 SKILL.md 文件：

- `~/.anthropic/skills/*/SKILL.md`
- 项目 `./skills/*/SKILL.md`
- `~/.claude/skills/*/SKILL.md`

加载时以文件夹名称和 frontmatter 中的 `name` 为键。Claude Code、Anthropic Claude Agent SDK 和 SkillKit（跨智能体）都遵循这种模式。

### Anthropic Claude Agent SDK

`@anthropic-ai/claude-agent-sdk`（TypeScript）和 `claude-agent-sdk`（Python）会在会话开始时加载 skills，并在运行时将它们作为可调用的 agents 暴露出来。智能体循环会在用户按名称调用 skill 时进行分发。

### OpenAI Apps SDK

它于 2025 年 10 月发布，直接构建于 MCP 之上。Apps SDK app 包括：

- 一个 MCP 服务器（tools、resources、prompts）。
- 加 widget 元数据。
- 可选的 MCP Apps `ui://` 资源，用于交互式界面。

同一个协议，更丰富的 UX。

### 通过 SkillKit 实现跨智能体可移植性

SkillKit 等工具和类似的跨智能体分发层，会将单个 SKILL.md 转换为 32 多种 AI 智能体（Claude Code、Cursor、Codex、Gemini CLI、OpenCode 等）的原生格式。一个事实来源，许多消费者。

### 三层栈

| 层 | 文件 | 何时加载 | 目的 |
|-------|------|----------|---------|
| AGENTS.md | 仓库根目录 | 会话开始 | 项目级约定 |
| SKILL.md | skills 目录 | 调用 skill 时 | 可复用工作流 |
| MCP 服务器 | 外部进程 | 需要工具时 | 可调用的操作 |

三者可以组合：智能体在会话开始时读取 AGENTS.md，用户调用 skill，skill 的指令包含 MCP 工具调用，智能体通过 MCP 客户端分发这些调用。

```figure
t3-skill-layers
```

## 动手使用

`code/main.py` 提供一个标准库 SKILL.md 解析器和加载器。它发现 `./skills/` 下的 skills，解析 YAML frontmatter 与 Markdown 正文，生成以 skill 名称为键的字典。随后它模拟一个智能体循环，按名称调用 `release-notes-writer`。

注意观察：

- 用最小的标准库解析器解析 YAML frontmatter（不依赖 `pyyaml`）。
- Skill 正文逐字存储；调用时，智能体将它前置到 system prompt。
- 通过按需拉取引用文件的 `read_subresource` 函数演示渐进式披露。

## 交付物

本课产出 `outputs/skill-agent-bundle.md`。给定一套工作流，该 skill 会产出组合后的 SKILL.md + AGENTS.md + MCP 服务器蓝图，可跨智能体使用。

## 练习

1. 运行 `code/main.py`。在 `skills/` 下添加第二个 skill，并确认加载器能够找到它。

2. 为本课程仓库编写一个 AGENTS.md。包含测试命令、代码风格约定和 Phase 13 的心智模型。

3. 将团队内部文档中的一套多步骤工作流移植到 SKILL.md。验证它能在 Claude Code 中加载。

4. 手工将这个 skill 转换为 Cursor 和 Codex 的原生规则格式。计算不同格式之间的 diff——这就是 SkillKit 自动化的转换表面。

5. 阅读 Anthropic Agent Skills 博客文章。找出 Claude Agent SDK 中、本课加载器没有覆盖的一项功能。（提示：智能体子调用。）

## 术语

| 术语 | 人们会怎么说 | 它实际表示什么 |
|------|----------------|------------------------|
| SKILL.md | “skill 文件” | 由 YAML frontmatter 加 Markdown 正文组成、由智能体运行时加载的文件 |
| AGENTS.md | “仓库根目录智能体上下文” | 会话开始时读取的项目级约定文件 |
| 渐进式披露 | “延迟加载子资源” | skill 正文引用只在需要时拉取的文件 |
| Frontmatter | “顶部的 YAML 块” | 位于 `---` 分隔符中的元数据（name、description） |
| Claude Agent SDK | “Anthropic 的 skill 运行时” | `@anthropic-ai/claude-agent-sdk`，负责加载 skills 和路由 |
| OpenAI Apps SDK | “MCP + widget 元数据” | 基于 MCP 加 ChatGPT UI hooks 构建的 OpenAI 开发者表面 |
| Skill discovery | “文件系统扫描” | 遍历已知目录中的 SKILL.md 并按名称建立索引 |
| 跨智能体可移植性 | “一个 skill，多个智能体” | 通过 SkillKit 风格工具将一个 SKILL.md 转换到 32 多种智能体 |
| Agent Skill | “可移植知识” | MCP 工具概念之外的可复用任务模板 |
| Apps SDK | “MCP 加 ChatGPT UI” | 在 MCP 上统一 Connectors 和 Custom GPTs |

## 延伸阅读

- [Anthropic — Agent Skills announcement](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)——2025 年 12 月发布
- [Anthropic — Agent Skills docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)——SKILL.md 格式参考
- [OpenAI — Apps SDK](https://developers.openai.com/apps-sdk)——面向 ChatGPT 的基于 MCP 的开发者平台
- [agents.md](https://agents.md/)——AGENTS.md 格式和采用列表
- [Anthropic — anthropics/skills GitHub](https://github.com/anthropics/skills)——官方 skill 示例
