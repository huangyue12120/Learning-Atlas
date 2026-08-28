---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/16-github-issue-to-pr-agent/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 1010fdc42aed583ae6fd290ed639480fdc1aa41615ddc58a0e5cdb958605b7f1
status: reviewed
---

# 毕业项目 16——从 GitHub Issue 到 PR 的自治智能体

> 给 Issue 加一个标签，就得到一个 PR——这是 2026 年自治编码智能体的产品形态：在云端沙盒中运行智能体，验证测试通过，并发布一份带理由、可供审查的 PR。AWS Remote SWE Agents、Cursor Background Agents、OpenAI Codex cloud 和 Google Jules 都在交付这种形态。真正困难的是自动复现代码库的构建环境、防止凭证泄漏、执行每个仓库的预算，以及确保智能体不能强制推送。本毕业项目构建自托管版本，并在成本与通过率上和托管替代方案比较。

**类型：** 毕业项目
**语言：** Python（智能体）、TypeScript（GitHub App）、YAML（Actions）
**前置课程：** 第 11 阶段（LLM 工程）、第 13 阶段（工具）、第 14 阶段（智能体）、第 15 阶段（自治）、第 17 阶段（基础设施）
**涉及阶段：** P11 · P13 · P14 · P15 · P17
**用时：** 30 小时

## 问题

异步云端编码智能体与交互式编码智能体（毕业项目 01）是两个不同的产品类别。它的 UX 是一个 GitHub 标签：你给 Issue 加上 `@agent fix this` 标签，worker 在云端沙盒中启动，克隆仓库、运行测试、编辑文件、验证结果，然后打开一份 PR，并把智能体的理由写进正文。没有交互式循环，也没有终端。AWS Remote SWE Agents、Cursor Background Agents、OpenAI Codex cloud、Google Jules 和 Factory Droids 都在朝这个方向收敛。

工程挑战是具体的：环境复现（智能体必须从零构建仓库，不能依赖缓存的开发镜像）、不稳定测试（必须重跑或隔离）、凭证范围（使用最小细粒度权限的 GitHub App）、按仓库按日执行预算，以及禁止强制推送。毕业项目会相对于托管替代方案测量通过率、成本和安全性。

## 概念

触发器是 GitHub webhook（Issue 标签或 PR 评论）。dispatcher 将工作加入 ECS Fargate 或 Lambda。worker 把仓库拉进 Daytona 或 E2B 沙盒，并根据仓库推断出的语言和框架使用通用 Dockerfile。智能体基于 Claude Opus 4.7 或 GPT-5.4-Codex，运行 mini-swe-agent 或 SWE-agent v2 循环。它不断迭代：读取代码、提出修复、应用补丁、运行测试。

验证是门控步骤。PR 打开前，沙盒中的完整 CI 必须通过。系统计算覆盖率差值；如果下降超过阈值，仍然打开 PR，但加上 `needs-review` 标签。智能体把理由作为 PR 描述发布，并在 PR 中加入一个 `@agent` 线程，审查者可以在其中请求后续处理。

安全性通过两个不同的 GitHub 面来限定：App 提供带有 `workflows: read` 以及窄范围仓库内容/PR 权限的短期 installation token；分支保护（而不是 App 权限）强制执行“不能直接写入 `main`”和“不能强制推送”——绝不把该 App 加入绕过列表。GitHub App 没有按路径限定 `.github/workflows` 的真实原语，因此 worker 必须通过自身的文件编辑 allow-list 执行这一规则。dispatcher 按仓库按日执行预算上限（例如每天每仓库最多 5 个 PR、每个 PR 20 美元）。

## 架构

```text
GitHub Issue 加上 `@agent fix` 标签，或发表 PR 评论
            |
            v
    GitHub App webhook -> AWS Lambda dispatcher
            |
            v
    ECS Fargate 任务（或 GitHub Actions 自托管 runner）
       - 拉取仓库
       - 推断 Dockerfile（语言、包管理器）
       - 使用目标运行时的 Daytona / E2B 沙盒
       - clone -> git worktree -> 智能体分支
            |
            v
    mini-swe-agent / SWE-agent v2 循环
       Claude Opus 4.7 或 GPT-5.4-Codex
       工具：ripgrep、tree-sitter、读取/编辑、run_tests、git
            |
            v
    在沙盒中验证 CI 通过 + 覆盖率差值检查
            |
            v（已验证）
    git push + 通过 GitHub App 打开 PR
       PR 正文 = 理由 + diff 摘要 + trace URL
       标签：needs-review
            |
            v
    操作者审查；可以 @ 提及智能体请求后续处理
```

## 技术栈

- 触发器：带细粒度 token 的 GitHub App；通过 Lambda 或 Fly.io 接收 webhook
- Worker：ECS Fargate 任务（或 GitHub Actions 自托管 runner）
- 沙盒：每项任务一个 Daytona devcontainer 或 E2B sandbox
- 智能体循环：以 Claude Opus 4.7 / GPT-5.4-Codex 为后端的 mini-swe-agent 基线或 SWE-agent v2
- 检索：tree-sitter repo-map + ripgrep
- 验证：沙盒内完整 CI + 覆盖率差值门
- 可观测性：Langfuse；PR 正文链接到每个 PR 的 trace 归档
- 预算：按仓库的每日美元上限；按仓库的每日 PR 数上限

```figure
cf-issue-to-pr
```

## 动手构建

1. **GitHub App。** 细粒度 installation token：issues read+write、pull_requests write、contents read+write、workflows read。分支保护（唯一能执行此规则的面）强制“不能直接推送到 `main`”和“不能强制推送”；App 不在绕过列表中。由于 GitHub App 权限不是按路径限定的，worker 通过对提议 diff 做 allow-list 检查，强制“不能写入 `.github/workflows`”。

2. **Webhook 接收器。** Lambda 函数接收 Issue 标签 / PR 评论 webhook。筛选标签 `@agent fix this`，并加入 SQS。

3. **Dispatcher。** 从 SQS 取出任务，执行按仓库按日的预算限制。启动带有仓库 URL、Issue 正文和全新 Daytona 沙盒的 ECS Fargate 任务。

4. **环境推断。** 检测语言（Python、Node、Go、Rust）与包管理器（uv、pnpm、go mod、cargo）。如果仓库中没有 Dockerfile，就动态生成一个。

5. **智能体循环。** 使用 Claude Opus 4.7 的 mini-swe-agent 或 SWE-agent v2。工具包括 ripgrep、tree-sitter repo-map、read_file、edit_file、run_tests、git。硬限制：成本 20 美元、墙钟时间 30 分钟、智能体回合 30 次。

6. **验证。** 循环结束后，在沙盒中运行完整测试套件。通过 jacoco / coverage.py 计算覆盖率差值。如果 CI 为红色：停止，不打开 PR。如果覆盖率下降超过 2%：打开 PR 并加上 `needs-review` 标签。

7. **发布 PR。** 推送智能体分支。通过 GitHub API 打开 PR，包含：标题、理由、diff 摘要、trace URL、成本、回合数。

8. **凭证卫生。** Worker 使用短期 GitHub App installation token 运行。归档前对日志进行秘密清洗。

9. **评测。** 准备 30 个不同难度的内部种子 Issue。测量通过率、PR 质量（diff 大小、风格、覆盖率）、成本和延迟，并用同一批 Issue 与 Cursor Background Agents 和 AWS Remote SWE Agents 比较。

## 实际使用

```text
# on github.com
  - 用户给 issue #842 加上 `@agent fix this` 标签
  - PR #1903 在 14 分钟后出现
  - 正文：
    > 修复了由空 comparator 条目导致的 widget.dedupe() NPE。
    > 添加回归测试 widget_test.go::TestDedupeNullComparator。
    > 覆盖率差值：+0.12%
    > 回合数：7  成本：$1.80  Trace：langfuse:...
    > 标签：needs-review
```

## 交付

交付物 `outputs/skill-issue-to-pr.md` 是一个 GitHub App + 异步云端 worker：它把带标签的 Issue 转换为可供审查的 PR，并具备有界成本和范围明确的凭证。

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | 30 个 Issue 上的通过率 | 端到端成功（CI 为绿且覆盖率达标） |
| 20 | PR 质量 | Diff 大小、覆盖率差值、风格一致性 |
| 20 | 每个解决 Issue 的成本与延迟 | 每个 PR 的美元成本和墙钟时间 |
| 20 | 安全性 | 范围明确的 token、每仓库预算、禁止强制推送、凭证卫生 |
| 15 | 操作者 UX | 理由评论、重试入口、@ 提及后续处理 |
| **100** | | |

## 练习

1. 增加“修复不稳定测试”模式：标签 `@agent stabilize-flake TestX` 会在沙盒中运行该测试 50 次，并提出能稳定它的最小改动。

2. 在三个共同 Issue 上比较成本与 Cursor Background Agents。报告不同场景下哪个工具胜出。

3. 实现预算仪表盘：按仓库按日成本、按用户成本，并在异常时告警。

4. 构建“dry-run”模式：不运行 CI，直接打开草稿 PR，让审查者低成本检查计划。

5. 添加保留策略：自动删除超过 7 天仍未合并的 PR 分支。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| GitHub App | “范围明确的机器人身份” | 具有细粒度权限和短期 installation token 的 App |
| Async cloud agent | “后台智能体” | 在云端沙盒中运行而非终端中运行的非交互式 worker |
| Environment inference | “Dockerfile 合成” | 检测语言与包管理器；不存在时生成 Dockerfile |
| Verification | “沙盒内 CI” | 打开 PR 前在 worker 内运行完整测试套件 |
| Coverage delta | “保持覆盖率” | 基线分支与智能体分支之间的测试覆盖率变化 |
| Per-repo budget | “每日上限” | dispatcher 执行的美元与 PR 数上限 |
| Rationale | “PR 正文解释” | 智能体对改动内容和原因的总结；PR 正文必需包含 |

## 延伸阅读

- [AWS Remote SWE Agents](https://github.com/aws-samples/remote-swe-agents)——异步云端智能体的规范参考
- [SWE-agent](https://github.com/SWE-agent/SWE-agent)——CLI 参考
- [Cursor Background Agents](https://docs.cursor.com/background-agent)——商业替代方案
- [OpenAI Codex（cloud）](https://openai.com/codex)——托管竞品
- [Google Jules](https://jules.google)——Google 的托管版本
- [Factory Droids](https://www.factory.ai)——另一种商业参考
- [GitHub App 文档](https://docs.github.com/en/apps)——范围明确的机器人身份
- [Daytona cloud sandboxes](https://daytona.io)——参考沙盒
