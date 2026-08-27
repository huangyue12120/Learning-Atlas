---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/04-tree-of-thoughts-lats/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: c0d4e1af4425b9cc2a97b944e4b538fb2bcef90e4469acab0d547c69e317e92f
status: reviewed
---

# 思维树与 LATS：有意搜索

> 单条思维链轨迹没有回溯空间。ToT（Yao 等，2023）将推理变成一棵树，并在每个节点上进行自评估。LATS（Zhou 等，2024）用蒙特卡洛树搜索将 ToT、ReAct 和 Reflexion 统一起来。Game of 24 的结果从 CoT 的 4% 提升到 ToT 的 74%；LATS 在 HumanEval 上达到 92.7% 的 pass@1。

**类型：** 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 01 节（智能体循环）、第 14 阶段 · 第 03 节（Reflexion）
**用时：** 约 75 分钟

## 学习目标

- 将推理描述为搜索：节点是“思维”，边是“扩展”，值是“有多大希望”。
- 用标准库实现带自评打分的 ToT 风格 BFS 树搜索。
- 扩展到包含选择 / 扩展 / 模拟 / 反向传播的玩具 LATS MCTS 循环。
- 判断何时值得支付 token 倍增的搜索成本（Game of 24、代码生成），以及何时一条轨迹就够了（简单问答）。

## 问题所在

思维链是一条线性路径。如果第一步错了，之后每一步都会建立在错误前提上。在 Game of 24 中（用四个数字和 `+ − × ÷` 运算得到 24），GPT-4 的 CoT 准确率只有 4%。模型很早就选错了子表达式，无法恢复。

推理需要提出多个候选、评估它们、选出有希望的候选，并在出现死路时回溯。这类过程属于搜索，思维树和 LATS 是两种经典表达。

## 核心概念

### 思维树（Yao 等，NeurIPS 2023）

每个节点都是一个连贯的中间步骤（“一个思维”）。每个节点可以扩展出 K 个子思维。LLM 使用打分提示词对每个节点自评。搜索可以采用 BFS、DFS 或 beam。

```
                     (根：“用 4 6 4 1 得到 24”)
                    /                 |             \
           (“6 - 4 = 2”)    (“4 + 1 = 5”)    (“4 * 6 = 24”)  <- 分数：高
              /   \              |                  |
          ...    ...          ...                完成
```

自评是其中不可或缺的部分。论文展示了三种变体：`sure / likely / impossible` 分类、`1..10` 数值分数，以及在候选项之间投票。三种方式在 Game of 24 上都显著超过 CoT（GPT-4 从 4% 提升到 74%）。

### LATS（Zhou 等，ICML 2024）

LATS 用 MCTS 统一 ToT、ReAct 和 Reflexion。LLM 扮演三个角色：

- **策略（Policy）**：提出下一个候选行动（ReAct 风格）。
- **价值函数（Value function）**：为部分轨迹打分（ToT 风格自评）。
- **自我反思器（Self-reflector）**：失败时写自然语言反思（Reflexion 风格），并用它重新播种未来的 rollout。

环境反馈会混入价值函数，使搜索依据真实工具结果，而不只是模型意见。论文发表时的结果是：GPT-4 在 HumanEval 上 pass@1 达到 92.7%（SOTA）；GPT-3.5 在 WebShop 上平均得分 75.9，接近基于梯度的微调。

### 最小化理解 MCTS

每次迭代包含四个阶段：

1. **选择（Select）**——使用 UCT（树的上置信界）从根走到叶节点。
2. **扩展（Expand）**——通过策略生成 K 个子节点。
3. **模拟（Simulate）**——从某个子节点使用策略进行 rollout，并用价值函数（或环境奖励）为叶节点打分。
4. **反向传播（Backpropagate）**——沿路径向上更新访问次数和值估计。

UCT 公式：`Q(s, a) + c * sqrt(ln N(s) / N(s, a))`。第一项是利用，第二项是探索。应针对任务调节 `c`。

### 成本现实

搜索会让 token 爆炸。ToT 在 Game of 24 上使用的 token 是 CoT 的 100–1000 倍，LATS 也类似。这不是免费的；应把搜索保留给：

- 单条轨迹明显不够的任务（Game of 24、复杂代码）。
- 墙钟时间不如正确性重要的任务。
- 价值函数便宜且可靠的任务（代码的单元测试、数学的明确目标）。

如果任务只有一个正确答案而评估器有噪声，搜索往往会让结果更糟——它会找到一个“得分不错”但实际错误的答案。

### 2026 年的定位

多数生产智能体并不运行 LATS，而是运行带工具依据验证的 ReAct（CRITIC，第 05 节）。搜索只出现在专门领域：

- 把测试作为价值函数的编码智能体（HumanEval 风格）。
- 探索多条查询路径的深度研究智能体。
- LangGraph 子图中的规划密集型工作流。

AlphaEvolve（第 11 节）是 2025 年的极端案例：对代码进行进化搜索，用机器可检查的适应度评估，带来前沿改进（56 年来第一次改进 4×4 矩阵乘法）。

```figure
tree-of-thoughts
```

## 动手构建

`code/main.py` 实现了：

- 在“选择算术运算”风格任务上的小型 ToT BFS。
- 在同一任务上的玩具 LATS MCTS 循环（选择 / 扩展 / 模拟 / 反向传播），使用 UCT 选择。
- 将符号分数与自评分数组合起来的价值函数。

运行：

```
python3 code/main.py
```

轨迹展示 ToT 如何用 BFS 为每个节点扩展三个候选，以及 LATS 如何通过 MCTS 收敛到最佳 rollout；两者的 token 数都会打印出来。

## 实际使用

LangGraph 以子图模式提供 ToT 风格的探索；LangChain 团队关于 LATS 的博客（2024 年 5 月）是参考教程。LlamaIndex 提供 `TreeOfThoughts` 智能体。对于多数 2026 年生产智能体，这种模式位于 `if task_complexity > threshold: use_search()` 这样的门控之后——参见第 05 节的 evaluator-optimizer 模式。

## 交付

`outputs/skill-search-policy.md` 会根据任务形状、预算和评估器保真度，在线性 ReAct、ToT、LATS 和进化搜索之间进行选择。

## 练习

1. 用 UCT `c=0.1` 与 `c=2.0` 运行玩具 LATS。轨迹有什么变化？
2. 换用噪声更大的评分器（加入随机扰动）。MCTS 仍能找到最佳叶节点吗？它能容忍的最小信噪比是多少？
3. 实现 beam-search ToT（每一层保留 top-k），并与 BFS 比较。在 token 预算紧张时，哪种更好？
4. 阅读 LATS 第 5.1 节。复现 HumanEval 轨迹数量：达到报告的 pass@1 需要多少次 rollout？
5. 阅读 LATS 论文关于“LATS 帮助较小的情况”的讨论。写一段决策规则，将任务形状映射到搜索策略。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Tree of Thoughts | “分支式 CoT” | Yao 等提出的带自评估的思维节点树 |
| LATS | “LLM 的 MCTS” | Zhou 等提出的在 MCTS 下统一 ToT + ReAct + Reflexion |
| UCT | “上置信界” | 在利用（Q）与探索（ln N / n）之间平衡的选择公式 |
| Value function | “这个状态有多好” | 由提示词得到的 LLM 分数或环境奖励；用于反向传播 |
| Policy | “行动提议器” | ReAct 风格生成器；输出下一个候选思维/行动 |
| Rollout | “模拟轨迹” | 使用策略从节点走到叶节点，再用价值函数打分 |
| Backpropagate | “更新祖先节点” | 沿路径向上推送叶节点奖励，更新访问次数和 Q |
| Search cost | “token 爆炸” | Game of 24 上是 CoT 的 100–1000 倍；采用前先设预算 |

## 延伸阅读

- [Yao 等，Tree of Thoughts（arXiv:2305.10601）](https://arxiv.org/abs/2305.10601)——经典论文
- [Zhou 等，LATS（arXiv:2310.04406）](https://arxiv.org/abs/2310.04406)——带 Reflexion 反馈的 MCTS
- [LangGraph 概览](https://docs.langchain.com/oss/python/langgraph/overview)——用于搜索的子图模式
- [AlphaEvolve（arXiv:2506.13131）](https://arxiv.org/abs/2506.13131)——带程序化评估器的进化搜索
