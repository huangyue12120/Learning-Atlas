---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/10-multi-agent-software-team/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: ec2980b3248cd2ef9cbf3e151ba443bdf3751b5324306cd5d37caecf279c1cce
status: reviewed
---

# 毕业项目 10——多智能体软件工程团队

> 2026 年，多智能体工程团队的形态已经收敛：架构师规划，N 个编码者在并行 worktree 中工作，审阅者把关，测试者验证。SWE-AF 的工厂架构、MetaGPT 的角色提示、AutoGen 0.4 的有类型 actor 图、Cognition 的 Devin 和 Factory 的 Droids 都独立落到了这个形态。并行 worktree 把墙上时间转化为吞吐量，共享状态和交接协议成为失败面。本毕业项目要求你构建这支团队，在 SWE-bench Pro 上评测，并报告哪些交接会出问题、频率如何。

**类型：** 毕业项目
**语言：** Python / TypeScript（智能体）、Shell（worktree 脚本）
**前置课程：** 第 11 阶段（LLM 工程）、第 13 阶段（工具）、第 14 阶段（智能体）、第 15 阶段（自治系统）、第 16 阶段（多智能体）、第 17 阶段（基础设施）
**涉及阶段：** P11 · P13 · P14 · P15 · P16 · P17
**用时：** 40 小时

## 问题

单智能体编码工作台在大型任务上会遇到上限。不是因为某个智能体不够强，而是因为 20 万词元的上下文无法同时容纳架构计划、四个并行代码库切片、审阅者意见和测试输出。多智能体工厂拆分问题：架构师负责计划，编码者在并行 worktree 中负责实现，审阅者把关，测试者验证。SWE-AF 的“工厂”架构、MetaGPT 的角色和 AutoGen 的有类型 actor 图，三个说法描述的是同一种形态。

失败面在交接。架构师规划了编码者无法实现的内容，编码者产出相互冲突的 diff，审阅者批准了幻觉式修复，测试者与仍在写入的编码者发生竞态。你将构建这样一支团队，在 50 个 SWE-bench Pro issue 上运行，追踪每次交接，并发布事后复盘。

## 概念

角色是带类型的智能体。**架构师**（Claude Opus 4.7）读取 issue、写出计划，并把任务拆成带明确接口的子任务。**编码者**（Claude Sonnet 4.7，N 个并行实例，每个都在 git worktree + Daytona 沙箱中）独立实现子任务。**审阅者**（GPT-5.4）读取合并后的 diff，并批准或提出具体修改。**测试者**（Gemini 2.5 Pro）在隔离环境中运行测试套件，并带产物报告通过/失败。

通过共享任务板（文件后端或 Redis）通信。每个角色只消费自己获准处理的任务。交接是 A2A 协议类型化的消息。协调关注点包括：合并冲突解决（协调器角色或自动三方合并）、共享状态同步（编码者开始后计划冻结，重规划是独立事件），以及审阅门（审阅者不能批准自己作出的改动或自己提出的改动）。

词元放大是隐藏成本。每个角色边界都会增加摘要提示和交接上下文。一次单智能体 40 回合的运行，可能变成四个角色共 160 个回合。评分标准特别衡量相对于单智能体基线的词元效率，因为问题不是“多智能体能不能工作”，而是“它是否以每美元更高的效率取胜”。

## 架构

```text
GitHub issue URL
      |
      v
架构师（Opus 4.7）
   读取 issue，产出带子任务 + 接口的计划
      |
      v
任务板（文件 / Redis）
      |
   +-- 子任务 1 ---+-- 子任务 2 ---+-- 子任务 3 ---+-- 子任务 4 ---+
   v                v                v                v                v
编码者 A          编码者 B          编码者 C          编码者 D          （4 个并行）
（Sonnet）        （Sonnet）        （Sonnet）        （Sonnet）
worktree A       worktree B       worktree C       worktree D
Daytona          Daytona          Daytona          Daytona
      |                |                |                |
      +--------+-------+-------+--------+
               v
          合并协调器（三方合并 + 冲突解决）
               |
               v
           审阅者（GPT-5.4）
               |
               v
           测试者（Gemini 2.5 Pro） -> 通过？ -> 打开 PR
                                  -> 失败？ -> 路由回编码者
```

## 技术栈

- 编排：带共享状态和按智能体划分子图的 LangGraph
- 消息：A2A 协议（Google 2025），用于有类型的智能体间消息
- 模型：架构师使用 Opus 4.7，编码者使用 Sonnet 4.7，审阅者使用 GPT-5.4，测试者使用 Gemini 2.5 Pro
- Worktree 隔离：每个编码者执行 git worktree add + Daytona 沙箱
- 合并协调器：自定义三方合并 + LLM 介入的冲突解决
- 评测：SWE-bench Pro（50 个 issue）、SWE-AF 场景、用于单元测试的 HumanEval++
- 可观测性：Langfuse，带角色标签的 span，按智能体记账词元
- 部署：K8s，每个角色一个 Deployment，并按 backlog 设置 HPA

```figure
ce-team-handoff
```

## 动手构建

1. **任务板。** 使用带类型消息的文件后端 JSONL：plan_request、subtask、diff_ready、review_needed、test_needed、approved、rejected、replan_needed。智能体订阅标签。

2. **架构师。** 读取 GitHub issue，让 Opus 4.7 使用要求明确子任务接口（触碰文件、公开函数、测试影响）的计划模板。发出一条带子任务 DAG 的 plan_request。

3. **编码者。** N 个并行 worker，每个从任务板认领一个子任务。每个 worker 生成一条新的 git worktree add 分支和一个 Daytona 沙箱，实现子任务，并以 patch + 测试差异发出 diff_ready。

4. **合并协调器。** 所有编码者完成后，将 N 个分支三方合并到 staging 分支。只有文件级存在重叠时才允许 LLM 介入冲突解决。

5. **审阅者。** GPT-5.4 读取合并后的 diff，不能批准自己编写的 diff。它发出 approved（无操作）或带具体改动请求的 review_feedback，并将请求路由给相关编码者。

6. **测试者。** Gemini 2.5 Pro 在干净沙箱中运行测试套件，捕获产物，发出 test_passed 或带 stacktrace 的 test_failed。失败测试回到负责该子任务的编码者。

7. **交接记账。** 每条跨越角色边界的消息都在 Langfuse 中生成 span，记录载荷大小和所用模型。计算每个子任务的词元放大（coder_tokens + reviewer_tokens + tester_tokens + architect_share / coder_tokens）。

8. **评测。** 在 50 个 SWE-bench Pro issue 上运行。与单智能体基线（单 worktree 中的一个 Sonnet 4.7）比较 pass@1 和每个已解决 issue 的美元成本。

9. **事后复盘。** 对每个失败 issue 找出出问题的交接（计划太含糊、合并冲突、审阅者误批准、测试 flaky）。生成交接失败直方图。

## 实际使用

```text
$ team run --issue https://github.com/acme/widget/issues/842
[architect] plan: 4 subtasks (parser, cache, api, migration)
[board]     dispatched to 4 coders in parallel worktrees
[coder-A]   subtask parser  -> 42 lines, tests pass locally
[coder-B]   subtask cache   -> 88 lines, tests pass locally
[coder-C]   subtask api     -> 31 lines, tests pass locally
[coder-D]   subtask migration -> 19 lines, tests pass locally
[merge]     3-way merge: 0 conflicts
[reviewer]  comments on cache (thread pool sizing); routed to coder-B
[coder-B]   revision: 92 lines; submits
[reviewer]  approved
[tester]    all 412 tests pass
[pr]        opened #3382   4 coders, 1 revision, $4.90, 18m
```

## 交付

交付物是 outputs/skill-multi-agent-team.md。给定 issue URL 和并行度，团队会生成可合并的 PR，并提供按角色记账的词元数据。

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | SWE-bench Pro pass@1 | 匹配的 50 issue 子集，测量 pass@1 |
| 20 | 并行加速 | 与单智能体基线比较墙上时间 |
| 20 | 审阅质量 | 注入 bug 探针上的误批准率 |
| 20 | 词元效率 | 每个已解决 issue 的总词元与单智能体比较 |
| 15 | 协调工程 | 合并冲突解决和交接失败直方图 |
| **100** | | |

## 练习

1. 在运行中途向 diff 注入一个明显 bug（在主体之前额外加入 return None）。测量审阅者的误批准率。调优审阅提示，直到误批准率低于 5%。

2. 减少到两个编码者（架构师 + 编码者 + 审阅者 + 测试者，编码者依次运行两个子任务）。比较墙上时间和通过率。

3. 用单写入者约束替代合并协调器（子任务触碰互不相交的文件集）。测量这给架构师带来的规划负担。

4. 将审阅者从 GPT-5.4 换成 Claude Opus 4.7。测量误批准率和词元成本差值。

5. 增加第五个角色：文档编写者（Haiku 4.5）。审阅后生成 changelog 条目。测量文档质量是否值得额外词元开销。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Parallel worktree | “隔离分支” | 通过 git worktree add 为每个编码者生成独立工作树 |
| Task board | “共享消息总线” | 由文件或 Redis 存储的有类型消息，智能体订阅这些消息 |
| Handoff | “角色边界” | 从一个角色上下文跨到另一个角色上下文的任何消息 |
| Token amplification | “多智能体开销” | 所有角色的总词元数 / 同一任务单智能体的词元数 |
| A2A protocol | “智能体对智能体” | Google 2025 年关于有类型智能体间消息的规范 |
| Merge coordinator | “集成者” | 运行三方合并并调解冲突的组件 |
| False approval | “审阅者幻觉” | 审阅者批准带已知 bug 的 diff |

## 延伸阅读

- [SWE-AF 工厂架构](https://github.com/Agent-Field/SWE-AF)——2026 年多智能体工厂参考
- [MetaGPT](https://github.com/FoundationAgents/MetaGPT)——基于角色的多智能体框架
- [AutoGen v0.4](https://github.com/microsoft/autogen)——微软的有类型 actor 框架
- [Cognition AI（Devin）](https://cognition.ai)——参考产品
- [Factory Droids](https://www.factory.ai)——另一种参考产品
- [Google A2A 协议](https://a2a-protocol.org/latest/)——智能体间消息规范
- [git worktree 文档](https://git-scm.com/docs/git-worktree)——隔离底座
- [SWE-bench Pro](https://www.swebench.com)——评测目标
