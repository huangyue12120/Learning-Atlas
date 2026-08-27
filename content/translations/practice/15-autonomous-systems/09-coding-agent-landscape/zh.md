---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/15-autonomous-systems/09-coding-agent-landscape/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 62d80c824129f6f23833be3473421afaa99330f4dfa617f49108013fe76bfeb3
status: reviewed
---

# 自主编程智能体全景（2026）

> SWE-bench Verified 在不到三年间从 4% 提升到 80.9%。同一 Claude Sonnet 4.5 在 SWE-agent v1 上为 43.2%，在 Cline autonomous 上为 59.8%——模型周围的脚手架如今与模型本身同样重要。OpenHands（原 OpenDevin）是最活跃的 MIT 许可平台，其 CodeAct 循环直接在沙箱中执行 Python 行动，而非 JSON 工具调用。头条数字掩盖了一个方法论问题：500 个 SWE-bench Verified 任务中有 161 个只需 1–2 行变更；同一批前沿模型在 SWE-bench Pro（10 行以上任务）上只有 23–59%。

**类型：** 学习
**语言：** Python（标准库，CodeAct 与 JSON 工具调用的比较）
**前置要求：** 第 14 阶段 · 07（工具使用）、第 15 阶段 · 01（长时程智能体）
**用时：** 约 45 分钟

## 问题所在

“哪个编程智能体最好”是错误的问题。正确问题是：在匹配我工作内容的任务分布上，使用将要在生产中运行的脚手架，我能得到怎样的端到端可靠性？

2022 至 2026 年间，这个领域认识到脚手架——检索层、规划器、沙箱、编辑—验证循环、反馈格式——是承重结构。同一个 Claude Sonnet 4.5 在 SWE-agent v1 上的 SWE-bench Verified 分数是 43.2%，而在 Cline 自主脚手架中是 59.8%。相同权重，绝对差 16.6 个百分点。基座模型只是一个组件；循环才是产品。

伴随的问题是基准饱和会掩盖回归。SWE-bench Verified 接近饱和，简单任务的长尾（500 个任务中有 161 个只需 ≤2 行）抬高了最高分。真实世界质量更适合在 SWE-bench Pro（10 行以上变更）这类分布上衡量，同一批领先系统在其中仍只有 23–59%。

## 核心概念

### 用一段话理解 SWE-bench

SWE-bench（Jimenez 等）从带有真实补丁的 GitHub issue 出发，要求智能体生成能让测试套件通过的补丁。SWE-bench Verified（OpenAI，2024）是一个经人类筛选的 500 任务子集，移除了歧义和损坏任务。SWE-bench Pro 是更难的继任者——要求 10 行以上变更，当前前沿智能体仅有 23–59%。

### 2022 → 2026 曲线真正表明什么

- **2022：** 研究模型在原始 SWE-bench 上约为 4%。
- **2024：** GPT-4 加 Devin 式脚手架约为 14%；SWE-agent 约为 12%。
- **2025：** 位于 Aider 和 SWE-agent 内的 Claude 3.5/3.7 Sonnet 推升至 40–55% 区间。
- **2026：** Claude Sonnet 4.5 和前沿竞争者在 SWE-bench Verified 上达到 70–80% 以上。Epoch AI 的排行榜实时追踪这一数据。

曲线的斜率来自三个复合来源：更好的基座模型、更好的脚手架（CodeAct、反思、验证器循环）与更好的基准（Verified 去除噪声）。

### CodeAct 与 JSON 工具调用

OpenHands（All-Hands-AI，arXiv:2407.16741，原 OpenDevin）押注了一种具体架构：模型不再发出由宿主解码执行的 JSON 工具调用，而是发出 Python 代码，由 Jupyter 风格内核在沙箱中运行。智能体可以在一个动作中遍历文件、串联工具，并捕获自身异常。

权衡如下：

- **JSON 工具调用：** 每个动作一轮；易审计；组合能力有限；默认更安全，因为每次调用都经过显式验证器。
- **CodeAct：** 一个动作可以是一整个程序；可组合；需要加固沙箱（OpenHands 使用 Docker 隔离）；失效模式包含沙箱运行时允许的一切。

两种架构都已在生产中使用。CodeAct 在开放平台（OpenHands、smolagents）中占主导；JSON 工具调用仍在托管服务（Anthropic Managed Agents、OpenAI Assistants）中占主导，因为提供方控制执行器。

### 2026 全景中的脚手架

| 脚手架 | 许可证 | 执行模型 | 显著特性 |
|---|---|---|---|
| OpenHands（OpenDevin） | MIT | Docker 中的 CodeAct | 最活跃的开放平台；事件流可回放 |
| SWE-agent | MIT | Agent-Computer Interface（ACI） | 第一个端到端 SWE-bench 脚手架 |
| Aider | Apache-2 | 本地仓库中通过 diff 编辑 | 极简脚手架，回归稳定性强 |
| Cline | Apache-2 | 带工具策略的 VS Code 智能体 | Sonnet 4.5 上得分最高的开放脚手架 |
| Devin（Cognition） | 专有 | 托管 VM + 规划器 | 首个“AI 软件工程师”产品类别 |
| Claude Code | 专有 | 权限模式 + 例程 | 第 10 课详细介绍其智能体循环 |

### 为什么脚手架占主导

一次编程运行是一条长时程轨迹（第 1 课），可靠性会跨步骤复合。脚手架能带来分数的三个位置：

1. **检索：** 找到应读的文件是隐性瓶颈。SWE-agent 的 ACI、OpenHands 的文件索引和 Aider 的仓库映射都在解决它。
2. **验证器循环：** 运行测试、阅读堆栈追踪、再次尝试，可在 SWE-bench 上带来 10 个以上百分点的增量。
3. **失败遏制：** 出错时回滚的沙箱能防止损害复合。带或不带验证器循环的同一模型，看起来像两个不同产品。

### 基准饱和与真实分布

OpenHands 作者与 Epoch AI 都指出，SWE-bench Verified 有一个简单任务长尾：500 个任务中有 161 个只需 1–2 行变更。高分部分由此长尾驱动。SWE-bench Pro 限制为 10 行以上变更，即使对前沿系统也给出 23–59% 的分数。你的生产分布几乎肯定更接近 Pro，而非 Verified。

选择智能体的含义是：从自己的 bug 积压中抽取一个 Pro 式子集。真正重要的分数是它在你交付内容的代表性任务上的分数。

```figure
a5-scaffold-delta
```

## 实际运行

`code/main.py` 在一个固定小型任务分布上比较两种玩具智能体脚手架：

1. 每轮只执行一个动作的 **JSON 工具调用**脚手架。
2. 每个动作可发出一小段 Python 代码的 **CodeAct** 脚手架。

两者都使用存根“模型”（确定性规则），因此比较隔离了脚手架与模型质量。输出表明 CodeAct 脚手架以更少轮次解决更多任务，代价是每个动作的爆炸半径更大。

## 交付物

`outputs/skill-scaffold-audit.md` 帮助你在采纳前审计拟议的编程智能体脚手架：检索质量、验证器是否存在、沙箱隔离，以及基准与分布是否契合。

## 练习

1. 运行 `code/main.py`。两个脚手架在同一任务集上各需要多少轮？每种的单动作爆炸半径是什么？

2. 阅读 OpenHands 论文（arXiv:2407.16741）。论文称 CodeAct 在复杂任务上优于 JSON 工具调用。指出论文承认的一种失效模式，并用一句话说明它在何时会主导生产风险。

3. 从你的 bug 积压中选择一个需要跨两个文件、10 行以上变更的任务。估计前沿模型在 (a) JSON 工具调用和 (b) CodeAct 下的端到端成功概率，并解释差异。

4. SWE-bench Verified 有 161 个单文件、1–2 行任务。构造一个排除它们的分数，排行榜会如何洗牌？

5. 阅读“Introducing SWE-bench Verified”（OpenAI）。解释其移除歧义任务的具体方法，并列出这种筛选会遗漏的一类任务。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|---|---|---|
| SWE-bench | “编程基准” | 带有真实补丁和测试套件的 GitHub issue |
| SWE-bench Verified | “清洗后的子集” | 500 个人工筛选任务，仍存在简单任务长尾 |
| SWE-bench Pro | “更难的子集” | 10 行以上变更；前沿得分为 23–59% |
| CodeAct | “代码即动作” | 智能体发出 Python；Jupyter 风格内核在沙箱中执行 |
| JSON 工具调用 | “函数调用” | 每个动作都是执行前经过验证的结构化 JSON 负载 |
| 脚手架 | “智能体框架” | 围绕基座模型的检索 + 规划器 + 执行器 + 验证器循环 |
| ACI（Agent-Computer Interface） | “SWE-agent 的格式” | 为 LLM 易用性而非人类 shell 设计的命令集 |
| 验证器循环 | “测试并重试” | 运行测试、读取输出、修改补丁；最大的非模型可靠性增益 |

## 延伸阅读

- [Jimenez 等——SWE-bench](https://www.swebench.com/)——原始基准与方法。
- [OpenAI——介绍 SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/)——经筛选子集的构建方法。
- [Wang 等——OpenHands：面向 AI 软件开发者的开放平台](https://arxiv.org/abs/2407.16741)——CodeAct 架构与事件流设计。
- [Epoch AI——SWE-bench 排行榜](https://epoch.ai/benchmarks)——实时追踪的分数。
- [Anthropic——衡量智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)——长时程编程智能体可靠性的框架。
