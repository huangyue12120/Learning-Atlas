---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/19-benchmarks-swebench-gaia/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: b2a282a875e13aa30bea25d2a937ce1e26c422e14e7f4d675808675de1cd6f76
status: reviewed
---

# 基准：SWE-bench、GAIA、AgentBench

> 三个基准在 2026 年锚定了智能体评估。SWE-bench 测试代码修补，GAIA 测试通用工具使用，AgentBench 测试跨环境推理。要了解它们的组成、污染问题以及它们没有衡量的内容。

**类型：** 学习
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 06 节（工具使用）
**用时：** 约 60 分钟

## 学习目标

- 说出 SWE-bench 的测试 harness（FAIL_TO_PASS），并解释为什么它以单元测试作为门控。
- 解释为什么会有 SWE-bench Verified（OpenAI，500 个任务），以及它移除了什么。
- 描述 GAIA 的设计：对人类简单、对 AI 困难；三个难度等级。
- 说出 AgentBench 的八个环境，以及开源 LLM 的主要阻碍。
- 总结 SWE-bench+ 的污染发现及其影响。

## 问题所在

排行榜告诉你哪个模型在某个基准上胜出，但不会告诉你：

- 基准是否受到污染（解决方案在训练数据中、测试泄漏）。
- 基准是否测量了你关心的内容（代码、浏览还是通用能力）。
- 评估器是否稳健（AST 匹配、状态检查、人工复核）。

在引用一个数字之前，先了解这三个锚定基准及其失败模式。

## 核心概念 <!-- learning-atlas: the-concept -->

### SWE-bench（Jimenez 等，ICLR 2024 oral）

- 来自 12 个热门 Python 仓库的 2,294 个真实 GitHub issue。
- 智能体获得：修复前提交的代码库 + 自然语言 issue 描述。
- 智能体产出：补丁。
- 评估器：应用补丁，运行仓库的测试套件。补丁必须让 FAIL_TO_PASS 测试（之前失败、现在通过）翻转为通过，同时不能破坏 PASS_TO_PASS 测试。

SWE-agent（Yang 等，2024）发布时达到 12.5%，其重点是智能体–计算机接口（文件编辑命令、模型能理解的搜索语法）。

### SWE-bench Verified

OpenAI 于 2024 年 8 月发布。它是由人类整理的 500 任务子集，移除了含义不清的问题、不可靠测试以及修复方式不明确的任务。它是衡量“你的智能体能否交付真实补丁”的主要基准。

### 污染

- 超过 94% 的 SWE-bench issue 早于大多数模型的知识截止时间。
- **SWE-bench+** 发现成功补丁中有 32.67% 的解决方案泄漏在 issue 文本中（模型在描述里看到了修复），另有 31.08% 因测试覆盖不足而可疑。
- Verified 更干净，但并非没有污染。

实际含义是：SWE-bench 得分 50% 的模型，在 SWE-bench+ 上可能只有 35%。如果声称 SWE-bench 性能，始终同时报告两者。

### GAIA（Mialon 等，2023 年 11 月）

- 466 个问题；其中 300 个保留给 huggingface.co/gaia-benchmark 的私有排行榜。
- 设计理念：“对人类在概念上很简单（92%），但对 AI 很难（带插件的 GPT-4：15%）。”
- 测试推理、多模态、网页和工具使用。
- 三个难度等级；Level 3 要求跨模态的长工具链。

GAIA 是用来测量“通用能力”的基准。不要将它与代码专项基准混淆。

### AgentBench（Liu 等，ICLR 2024）

- 8 个环境，涵盖代码（Bash、DB、KG）、游戏（Alfworld、LTP）、网页（WebShop、Mind2Web）和开放式生成。
- 多轮，每个 split 约 4k–13k 轮。
- 主要发现是：长时程推理、决策和指令遵循，是开源 LLM 追上商业模型的阻碍。

### 这些基准没有衡量什么

- 真实运行成本（token、墙钟时间）。
- 对抗条件下的安全行为。
- 你的领域上的表现（使用自己的评估，第 30 节）。
- 尾部失败（基准计算平均值；生产运维人员关心最差的 1%）。

### 基准测试会在哪里出错

- **执着于单一数字。** SWE-bench 50% 不如 P50/P75/P95 成本和步数分布有信息量。
- **污染后的声明。** 报告 SWE-bench 却不提 Verified 或 SWE-bench+，会误导读者。
- **把基准当开发目标。** 针对基准优化会偏离生产实用性。

```figure
ae-swebench-gate
```

## 动手构建

code/main.py 实现一个类似 SWE-bench 的玩具 harness：

- 合成的 bug 修复任务（3 个任务）。
- 一个提出补丁的脚本化“智能体”。
- 检查 FAIL_TO_PASS（bug 已修复）和 PASS_TO_PASS（没有破坏任何内容）的测试运行器。
- 一个根据问题分解深度进行 GAIA 风格难度分类器。

运行：

```
python3 code/main.py
```

输出展示每个任务及每个难度的解决率，并将评估器规则具体化。

## 实际使用

- **SWE-bench Verified** 用于代码智能体；始终报告 Verified 分数。
- **GAIA** 用于通用智能体；使用私有排行榜 split。
- **AgentBench** 用于跨环境比较。
- **自定义评估**（第 30 节）用于你的产品实际形状。

## 交付

outputs/skill-benchmark-harness.md 会为任意代码库–任务对构建类似 SWE-bench 的 harness，并用 FAIL_TO_PASS / PASS_TO_PASS 做门控。

## 练习

1. 将玩具 harness 迁移到真实仓库（选一个自己的仓库）。为已知 bug 编写 3 个 FAIL_TO_PASS 测试。
2. 增加步数指标。在你的 3 个任务上，每个解决需要多少智能体步数？
3. 阅读 SWE-bench+ 论文。实现解决方案泄漏检查（将 issue 文本与 diff 做模式匹配）。
4. 从公开 split 下载一个 GAIA 问题。追踪一个 GPT-4 级智能体会如何处理。它需要哪些工具？
5. 阅读 AgentBench 的各环境拆分。哪个环境最像你的产品界面？在那里“SOTA”是什么样？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| SWE-bench | “代码智能体基准” | 2,294 个 GitHub issue；补丁必须让 FAIL_TO_PASS 测试翻转 |
| SWE-bench Verified | “干净的 SWE-bench” | OpenAI 整理的 500 个任务 |
| FAIL_TO_PASS | “修复门控” | 之前失败、补丁后必须通过的测试 |
| PASS_TO_PASS | “无回归门控” | 之前通过、补丁后仍必须通过的测试 |
| GAIA | “通用基准” | 466 个对人类简单、对 AI 困难的多工具问题 |
| AgentBench | “跨环境基准” | 8 个环境；长时程多轮 |
| Contamination | “训练集泄漏” | 基准任务出现在模型训练数据中 |
| SWE-bench+ | “污染审计” | 在成功 SWE-bench 补丁中发现 32.67% 的解决方案泄漏 |

## 延伸阅读

- [Jimenez 等，SWE-bench（arXiv:2310.06770）](https://arxiv.org/abs/2310.06770)——原始基准
- [OpenAI，SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/)——人工整理的子集
- [Mialon 等，GAIA（arXiv:2311.12983）](https://arxiv.org/abs/2311.12983)——通用基准
- [Liu 等，AgentBench（arXiv:2308.03688）](https://arxiv.org/abs/2308.03688)——跨环境套件
