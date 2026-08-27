---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/26-failure-modes-agentic/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 588b80e7011058fe627db20be59a8ccb2fea5d54940340c4ba226b67d1209dd3
status: reviewed
---

# 失败模式：智能体为什么会崩

> MASFT（Berkeley，2025）将多智能体失败分为 3 类、14 种模式。Microsoft 的 Taxonomy 记录了既有 AI 失败如何在智能体环境中放大。行业现场数据汇聚为五种反复出现的模式：幻觉行动、范围蔓延、级联错误、上下文丢失、工具误用。

**类型：** 学习 + 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 05 节（Self-Refine 与 CRITIC）、第 14 阶段 · 第 24 节（可观测性）
**用时：** 约 60 分钟

## 学习目标

- 说出 MASFT 的三个失败类别，并在每类中至少说出四种具体模式。
- 解释为什么智能体失败会放大既有 AI 失败模式（偏差、幻觉）。
- 描述五种行业反复出现的模式及其缓解方法。
- 用标准库实现一个为智能体轨迹标记失败模式标签的检测器。

## 问题所在

团队发布的智能体在 90% 的轨迹上工作。剩余 10% 的失败集中在少数反复出现的类别中。为这些类别命名后，团队就能监控并修复它们。

## 核心概念

### MASFT（Berkeley，arXiv:2503.13657）

Multi-Agent System Failure Taxonomy。14 种失败模式聚成 3 类。标注者间 Cohen’s Kappa 为 0.88，说明这些类别可以可靠地区分。

中心主张是：失败是多智能体系统的根本设计缺陷，而不是可以靠更好的基础模型修复的 LLM 局限。

### Microsoft 的 Agentic AI System 失败模式分类

- 既有 AI 失败（偏差、幻觉、数据泄漏）会在智能体环境中放大。
- 自治性会产生新失败：规模化的非预期行动、工具误用、任务漂移。
- 白皮书就是智能体产品的风险登记册。

### Characterizing Faults in Agentic AI（arXiv:2603.06847）

- 失败来自编排、内部状态演化和环境交互。
- 不只是“坏代码”或“坏模型输出”。

### LLM Agent Hallucinations Survey（arXiv:2509.18970）

两种主要表现：

1. **指令遵循偏离。** 智能体不遵循系统提示词。
2. **远程上下文误用。** 智能体忘记或错误使用早先轮次的上下文。

子意图错误包括：遗漏（漏掉步骤）、冗余（重复步骤）、次序错误（步骤顺序错误）。

### 五种行业反复出现的模式

Arize、Galileo、NimbleBrain 在 2024–2026 年的现场分析汇聚为：

1. **幻觉行动。** 智能体调用不存在的工具，或编造参数。
2. **范围蔓延。** 智能体把任务扩展到用户要求之外（创建额外 PR、发送额外邮件）。
3. **级联错误。** 一个错误调用触发下游影响。幻觉 SKU 触发四次 API 调用，造成多系统事故。
4. **上下文丢失。** 长时程任务忘掉早期轮次的约束。
5. **工具误用。** 调用了正确工具但参数错误，或者完全调用了错误工具。

级联是最致命的。智能体无法区分“我失败了”和“任务不可能完成”，经常在 400 错误上幻觉出成功消息来结束循环。

### 缓解：每一步都加门

在推理链的每一步设置自动验证门，根据环境状态检查事实依据。具体包括：

- 逐步安全分类器（第 21 节）。
- 工具调用参数验证（第 06 节）。
- 将检索内容与已知事实交叉检查（第 05 节，CRITIC）。
- 通过重新探测状态检测成功幻觉（文件真的创建了吗？）。

### 失败监控会在哪里出错

- **只标记崩溃。** 大多数智能体失败会产生看起来有效的输出，因此需要内容级检查。
- **没有基线。** 漂移检测需要最后已知良好状态；没有它就无法说“这变差了”。
- **过度告警。** 每个失败都触发页面。应聚类并限速。

```figure
failure-cascade
```

## 动手构建

code/main.py 实现一个标准库失败模式标记器：

- 覆盖五种模式的合成轨迹数据集。
- 每种模式一个检测器函数（工具调用、输出、重复行动的特征模式）。
- 为每条轨迹打标签并报告模式分布的标记器。

运行：

```
python3 code/main.py
```

输出每条轨迹的标签 + 汇总分布，这是对 Phoenix 轨迹聚类结果的廉价复现。

## 实际使用

- **Phoenix** 用于生产漂移聚类（第 24 节）。
- **Langfuse** 用于 session 重放 + 标注。
- **自定义实现** 用于可观测性平台无法检测的领域专用特征。

## 交付

outputs/skill-failure-detector.md 会生成针对你的领域、并连接轨迹存储的失败模式检测器。

## 练习

1. 增加“成功幻觉”检测器：智能体返回成功，但目标状态没有改变。
2. 为你构建过的产品标记 100 条真实轨迹。哪种模式占主导？修复它的成本是什么？
3. 实现“级联半径”指标：给定第 N 步的失败，它影响了多少个下游步骤？
4. 阅读 MASFT 的 14 种失败模式。选择适用于产品的三种并编写检测器。
5. 将一个检测器接入 CI：如果至少 5% 的轨迹带有某模式，就让构建失败。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| MASFT | “多智能体失败分类” | Berkeley 的 14 模式分类 |
| Cascading error | “连锁失败” | 一个早期错误传播到 N 个步骤 |
| Context loss | “忘了约束” | 长时程轮次丢弃早期事实 |
| Tool misuse | “错误工具 / 错误参数” | 调用有效，但使用方式错误 |
| Success hallucination | “伪造完成” | 智能体在 400 错误上声称成功；状态未改变 |
| Scope creep | “越界” | 智能体做了要求之外的事 |
| Instruction-following deviation | “不服从” | 忽略系统提示词或用户约束 |
| Sub-intention errors | “计划 bug” | 执行计划时遗漏、冗余、次序错误 |

## 延伸阅读

- [Cemri 等，MASFT（arXiv:2503.13657）](https://arxiv.org/abs/2503.13657)——14 种失败模式、3 个类别
- [Microsoft，Agentic AI System 失败模式分类](https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/final/en-us/microsoft-brand/documents/Taxonomy-of-Failure-Mode-in-Agentic-AI-Systems-Whitepaper.pdf)——风险登记册
- [Arize Phoenix](https://docs.arize.com/phoenix)——实践中的漂移聚类
- [Anthropic，构建有效的智能体](https://www.anthropic.com/research/building-effective-agents)——更简单的模式何时可以避免失败
