---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/25-multi-agent-debate/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 4dcb50b8b599fd3666f1a8ff1930ecec21a5dcd27ec5262deabad5a375aff61c
status: reviewed
---

# 多智能体辩论与协作

> Du 等（ICML 2024，《Society of Minds》）运行 N 个模型实例，独立提出答案，然后在 R 轮中反复相互批评，逐渐收敛。它能改善事实性、规则遵循和推理。稀疏拓扑的 token 成本优于全网格。

**类型：** 学习 + 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 12 节（工作流模式）、第 14 阶段 · 第 05 节（Self-Refine 与 CRITIC）
**用时：** 约 60 分钟

## 学习目标

- 解释辩论协议：N 个提议者、R 轮，以及收敛到共享答案。
- 描述辩论为什么能改善事实性、规则遵循和推理。
- 解释稀疏拓扑：不是每个辩手都需要看到其他所有辩手。
- 用标准库针对脚本化 LLM 实现全网格与稀疏两种辩论，并测量 token 成本与准确率。

## 问题所在

Self-Refine（第 05 节）是一个模型批评自己，存在群体思维风险。CRITIC（第 05 节）将批评建立在外部工具上，但外部工具并不总是可用。辩论引入第三种模式：多个实例、交叉批评、通过分歧实现收敛。

## 核心概念

### Society of Minds（Du 等，ICML 2024）

- N 个模型实例独立回答同一个问题。
- 在 R 轮中，每个模型读取其他模型的提议并进行批评。
- 模型根据批评更新答案。
- R 轮结束后，返回收敛的答案。

原始实验由于成本限制使用 N=3、R=2。在困难问题上（MMLU、GSM8K、Chess Move Validity、传记生成），增加智能体数量和轮数会提高准确率。

跨模型组合优于单模型辩论：ChatGPT + Bard 一起使用时优于任一模型单独使用。

### 稀疏拓扑

《Improving Multi-Agent Debate with Sparse Communication Topology》（arXiv:2406.11776，2024–2025）说明全网格辩论并不总是最佳。稀疏拓扑（星形、环形、中心–辐射）可以用更低 token 成本达到相近准确率。每个辩手只看到一部分同伴。

含义是：

- 全网格 N=5、R=3 = 5 × 3 = 15 个提议；每个提议读取 4 个同伴 = 60 次批评操作。
- 星形 N=5、R=3（1 个中心 + 4 个辐射）= 15 个提议；辐射只读取中心 = 12 次批评操作。

### 辩论有帮助的地方

- **事实性。** N 个独立提议，交叉检查可以减少幻觉。
- **规则遵循。** 在棋步有效性上，一个模型漏掉规则，其他模型可以发现。
- **开放式推理。** 多种框架逐渐收敛到正确答案。

### 辩论有害的地方

- **对延迟敏感的 UX。** N × R 个串行轮次可能超出延迟预算。
- **对成本敏感的规模。** 每个问题需要 N × R 个 token。
- **简单事实查询。** 一次查询比五轮辩论便宜。

### 2026 年的实际实例

- **Anthropic 编排器–worker**（第 12 节）——带综合步骤的一种辩论变体。
- **LangGraph supervisor**（第 13 节）——中央路由 + 专家智能体，可以把辩论实现为一个节点。
- **OpenAI Agents SDK**（第 16 节）——智能体来回 handoff，进行迭代式批评。
- **多智能体评估**——将辩论 + evaluator-optimizer 结合起来获得评估信号。

### 这个模式会在哪里出错

- **收敛坍塌。** 所有智能体收敛到第一个错误答案。用强制分歧轮缓解。
- **中心节点失败。** 星形拓扑中，一个糟糕的中心会污染所有人。轮换中心或使用多个中心。
- **提示词同质化。** 所有智能体用同一提示词，产生相同答案。使用多样化提示词和/或模型。

```figure
debate-converge
```

## 动手构建

code/main.py 用标准库实现辩论：

- Debater 类（带每个辩手意见漂移的脚本化 LLM）。
- FullMeshDebate 与 SparseDebate 运行器。
- 三个问题：一个事实题、一个规则题、一个推理题。
- 指标：收敛答案、收敛所需轮数、批评操作总数。

运行：

```
python3 code/main.py
```

输出协议级准确率和成本；在 3 个问题中的 2 个上，稀疏拓扑以更低成本匹配全网格。

## 实际使用

- **Anthropic 编排器–worker** 用于简单的 2–3 worker 辩论。
- **LangGraph** 用于带检查点的有状态多轮辩论。
- **自定义实现** 用于研究或需要精确正确性保证的场景。

## 交付

outputs/skill-debate.md 会搭建可配置拓扑、N、R 和收敛规则的多智能体辩论。

## 练习

1. 实现“强制分歧”规则：第 1 轮每个辩手必须提出不同的方案。测量对收敛速度的影响。
2. 增加置信度加权聚合：辩手返回（答案、置信度），聚合器按置信度加权。它有帮助吗？
3. 将一个“智能体”替换为拥有不同意见的脚本化 LLM。异质性会改善准确率吗？
4. 在 3 个问题上测量全网格与稀疏拓扑的 token 成本。绘制成本与准确率的关系。
5. 阅读 Society of Minds 论文。将玩具实现迁移为 N=5、R=3。什么会坏？什么会变好？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Debate | “多智能体批评” | N 个提议者，R 轮交叉批评，逐渐收敛 |
| Full mesh | “每个人都读每个人” | 每一轮每个辩手读取每个同伴 |
| Sparse topology | “有限同伴视图” | 辩手只读取同伴的子集 |
| Hub-and-spoke | “星形拓扑” | 一个中心辩手，N-1 个辐射只读取中心 |
| Convergence | “达成一致” | 辩手收敛到共同答案 |
| Society of Minds | “Du 等人的辩论论文” | ICML 2024 多智能体辩论方法 |

## 延伸阅读

- [Du 等，Society of Minds（arXiv:2305.14325）](https://arxiv.org/abs/2305.14325)——经典多智能体辩论
- [Sparse Communication Topology（arXiv:2406.11776）](https://arxiv.org/abs/2406.11776)——稀疏拓扑结果
- [Anthropic，构建有效的智能体](https://www.anthropic.com/research/building-effective-agents)——编排器–worker 作为辩论变体
- [Madaan 等，Self-Refine（arXiv:2303.17651）](https://arxiv.org/abs/2303.17651)——单模型自我批评对应方案
