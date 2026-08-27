---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/11-planning-htn-and-evolutionary/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: f4999bbfd5e356debc4193581fc9a9b6df991366783c41110c5296781eeeb020
status: reviewed
---

# 使用 HTN 与进化搜索进行规划

> 符号规划处理计划可以被证明正确的情况；进化式代码搜索处理适应度函数可由机器检查的情况。ChatHTN（2025）和 AlphaEvolve（2025）展示了当二者与 LLM 结合时各自能解锁什么。

**类型：** 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 02 节（ReWOO 与 Plan-and-Execute）
**用时：** 约 75 分钟

## 学习目标

- 解释分层任务网络（Hierarchical Task Networks）：任务、方法、算子、前置条件、效果。
- 描述 ChatHTN 的混合循环——符号搜索与 LLM 备用分解。
- 解释 AlphaEvolve 的进化循环，以及它为什么只有在存在程序化评估器时才有效。
- 用标准库实现一个玩具 HTN 规划器和一个玩具进化搜索。

## 问题所在

ReWOO（第 02 节）、Plan-and-Execute 与 ReAct 覆盖了大多数智能体规划场景，但以下两种情况处理得不好：

1. **需要可证明正确的计划。** 调度、航线规划、合规工作流——计划必须从构造上就可靠。一个偶尔会幻觉出某一步的流畅 LLM 计划不可接受。
2. **适应度函数可由机器检查的优化。** 矩阵乘法、调度启发式、编译器 pass——目标不是“一个正确计划”，而是“最佳计划”。

HTN 规划和 AlphaEvolve 解决的是两个不同问题。它们都把 LLM 当作放大器，而不是替代品。

## 核心概念

### 分层任务网络

HTN 包含：

- **任务**——复合任务（需要分解）和原始任务（可以直接执行）。
- **方法**——在带前置条件的情况下，将复合任务分解成子任务的方式。
- **算子**——带前置条件和效果的原始行动。
- **状态**——事实集合。

规划过程是：给定目标任务和初始状态，找到一个原始算子分解，使每个算子的前置条件按顺序都得到满足。

HTN 比 LLM 更早出现，但直到今天仍然是可证明正确规划的参考。

### ChatHTN（Gopalakrishnan 等，2025）

ChatHTN（arXiv:2505.11814）让符号 HTN 与 LLM 查询交错：

1. 尝试用已有方法分解当前复合任务。
2. 如果没有方法适用，就询问 LLM：“在状态 s 中，你会如何分解 task？”
3. 将 LLM 响应转换为候选子任务。
4. 根据算子 schema 验证；拒绝无效分解。
5. 递归执行。

论文的中心主张是：每个生成的计划都可以证明是可靠的，因为 LLM 建议只作为候选分解进入，绝不会直接修改计划。符号层掌握正确性；LLM 扩展方法库。

在线方法学习（OpenReview gwYEDY9j2x，2025 年后续工作）增加了一个学习器，通过回归泛化 LLM 生成的分解，使 LLM 查询频率最多降低 75%。

### AlphaEvolve（Novikov 等，2025）

AlphaEvolve（arXiv:2506.13131，DeepMind，2025 年 6 月）是另一种东西：由 Gemini 2.0 Flash/Pro 集成编排的进化式代码搜索。

循环是：

1. 从一个种子程序和一个程序化评估器开始（返回适应度分数）。
2. LLM 集成提出变异。
3. 让变异通过评估器运行。
4. 保留最佳结果；再次变异。

已发布的成果包括：

- 56 年来首次超越 Strassen 的 4×4 复数矩阵乘法改进（48 次标量乘法）。
- 通过 Borg 调度启发式恢复 Google 计算资源的 0.7%。
- 在前沿工作负载上让 FlashAttention 加速 32%。

硬性约束是：适应度函数必须可以由机器检查。对散文答案做进化搜索不会收敛。

### 何时使用哪一种

| 问题类别 | 使用 | 原因 |
|----------|------|------|
| 带硬约束的调度 | HTN + ChatHTN | 可证明的可靠性 |
| 编译器优化 | AlphaEvolve | 适应度可由机器检查 |
| 多步任务执行 | ReAct / ReWOO | LLM 处于循环中，没有形式化保证 |
| 带测试的代码改进 | AlphaEvolve | 测试就是评估器 |
| 受策略约束的自动化 | HTN | 用前置条件编码策略 |

### 这个模式会在哪里出错

- **没有算子的 HTN。** 没有前置条件/效果 schema，可证明可靠性的说法就会崩溃。ChatHTN 的“LLM 建议分解”要求 schema 拒绝无效动作。
- **没有真实评估器的 AlphaEvolve。** “问 LLM 代码是否更好”不是适应度函数。评估器必须确定且快速。
- **过度工程化。** 大多数智能体任务不需要二者。先使用 ReAct 或 ReWOO。

```figure
htn-tree-expand
```

## 动手构建

code/main.py 实现两个玩具：

- 一个标准库 HTN 规划器：包含算子、方法、前置条件、效果，以及当没有方法匹配复合任务时启动的 LLMFallback。“LLM”是脚本化分解器，因此规划器可以离线运行。
- 一个在算术程序上做标准库进化搜索的实现：生成表达式，使其在测试集上最小化 |f(x) - target|。评估器是确定性的。

运行：

```
python3 code/main.py
```

轨迹展示 HTN 规划器如何分解复合任务（计划中途使用 LLM 备用分解），以及进化循环如何收敛到目标表达式。

## 实际使用

- **HTN 规划器**——使用 pyhop、SHOP3，或自行构建领域专用规划器来执行策略。
- **ChatHTN**——研究代码；其模式（符号 + LLM 备用分解）可以干净地迁移到任意 HTN 规划器。
- **AlphaEvolve**——DeepMind 论文；其模式（集成 + 评估器）可以复现。OpenEvolve 及类似开源分支正在出现。
- **智能体框架**——目前没有框架原生提供 HTN 或 AlphaEvolve。把它构建成子智能体或后台 worker。

## 交付

outputs/skill-hybrid-planner.md 会生成混合规划器脚手架（HTN 或进化式），并明确限定 LLM 的角色。

## 练习

1. 为 HTN 规划器增加回溯：某个算子的后置条件在运行时失败时，回滚并尝试下一个方法。
2. 为 ChatHTN 增加 LLM 方法缓存：LLM 在状态模式 P 下分解任务 T 时，保存结果；下次调用先检查方法库。
3. 将进化搜索评估器换成真实测试套件。进化一个能通过 20 个测试用例的排序函数；报告收敛所需的代数。
4. 阅读 AlphaEvolve 的评估器设计说明。为你关心的领域设计一个评估器（SQL 查询优化、测试套件最小化、部署 YAML）。
5. 组合二者：用 HTN 将复合任务分解为子任务，再对每个子任务的原始算子使用进化搜索。它在哪些地方有优势，在哪些地方过度工程化？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| HTN | “分层规划器” | 使用算子、前置条件和效果进行任务分解 |
| Method | “分解规则” | 将复合任务拆成子任务的方法 |
| Operator | “原始行动” | 带前置条件和效果的具体步骤 |
| ChatHTN | “LLM + HTN” | 没有方法匹配时由符号规划器询问 LLM |
| AlphaEvolve | “进化式代码搜索” | LLM 集成变异代码；确定性评估器进行选择 |
| Fitness function | “评估器” | 对输出进行确定、可机器检查的评分 |
| Online method learning | “缓存的 LLM 分解” | 保存并泛化 LLM 计划，减少查询成本 |

## 延伸阅读

- [Gopalakrishnan 等，ChatHTN（arXiv:2505.11814）](https://arxiv.org/abs/2505.11814)——符号 + LLM 混合规划器
- [Novikov 等，AlphaEvolve（arXiv:2506.13131）](https://arxiv.org/abs/2506.13131)——使用 LLM 变异的进化式代码搜索
- [Anthropic，构建有效的智能体](https://www.anthropic.com/research/building-effective-agents)——何时使用规划器，何时使用简单循环
