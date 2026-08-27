---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/30-eval-driven-agent-development/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 7f1772928ead5688466ea0b7178d2cbd7bd10f0fa2e3568656e76dc4e8fcf891
status: reviewed
---

# 评估驱动的智能体开发

> Anthropic 的建议是：“从简单提示词开始，用全面评估优化它们，只有在需要时才加入多步智能体系统。”评估不是最后一步，而是驱动第 14 阶段所有其他选择的外层循环。

**类型：** 学习 + 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段全部内容
**用时：** 约 60 分钟

## 学习目标

- 说出三层评估——静态基准、自定义离线、在线生产——以及每一层的用途。
- 解释 evaluator-optimizer 紧循环。
- 描述 2026 年最佳实践：评估与代码放在一起，在 CI 中运行，并为 PR 设置门控。
- 将第 14 阶段的每一节连接到它生成的评估用例。

## 问题所在

智能体能通过 demo，却会以 demo 无法预测的方式在生产中失败。基准回答的是“这个模型总体上有能力吗”，而不是“这个智能体是否在为我的产品交付正确补丁”。答案是三层持续运行的评估，并将每个防护栏和习得规则映射到评估用例。

## 核心概念

### 三层评估

1. **静态基准**——代码使用 SWE-bench Verified（第 19 节），浏览/桌面使用 WebArena/OSWorld（第 20 节），通用能力使用 GAIA（第 19 节），工具使用使用 BFCL V4（第 06 节）。用于跨模型比较和回归门控。污染是真实问题：SWE-bench+ 发现 32.67% 的解决方案泄漏。始终报告 Verified / 经过审计的分数。

2. **自定义离线评估**——你的产品形状：
   - LLM-as-judge（Langfuse、Phoenix、Opik——第 24 节）。
   - 基于执行（运行补丁，检查测试）。
   - 基于轨迹（将行动序列与黄金轨迹比较；OSWorld-Human 显示顶尖智能体使用黄金轨迹 1.4–2.7 倍的步数）。

3. **在线评估**——生产环境：
   - Session 重放（Langfuse）。
   - 防护栏触发告警（第 16、21 节）。
   - 每一步的成本/延迟追踪（第 23 节 OTel span）。

### Evaluator-optimizer（Anthropic）

紧循环是：

1. Proposer 生成输出。
2. Evaluator 评判。
3. 迭代改进，直到 evaluator 通过。

这是 Self-Refine（第 05 节）的泛化。任何你关心的智能体流程都可以包在 evaluator-optimizer 中来提高可靠性。

### 2026 年最佳实践

- 评估与代码放在一起。
- 每个 PR 在 CI 中运行评估。
- 根据评估分数决定是否合并（例如“相对 main 不得回归超过 5%”）。
- 每个防护栏都映射到一个评估用例。
- 每条习得规则（Reflexion、pro-workflow learn-rule）都映射到一个失败用例。

### 将第 14 阶段串起来

第 14 阶段的每一节都会生成评估用例：

| 课程 | 它生成的评估用例 |
|------|------------------|
| 01 智能体循环 | 预算耗尽、无限循环防护 |
| 02 ReWOO | 工具失败时规划器正确重规划 |
| 03 Reflexion | 重试时应用已学反思 |
| 05 Self-Refine/CRITIC | 评判者通过改进后的输出 |
| 06 工具使用 | 参数强制转换有效；拒绝未知工具 |
| 07–10 记忆 | 检索引用与来源匹配；过时事实失效 |
| 12 工作流模式 | 每种模式生成正确输出 |
| 13 LangGraph | 恢复准确重现状态 |
| 14 AutoGen Actors | DLQ 捕获崩溃处理器 |
| 16 OpenAI Agents SDK | 防护栏在正确输入上触发 |
| 17 Claude Agent SDK | 子智能体结果返回编排器 |
| 19–20 基准 | SWE-bench Verified 分数、WebArena 成功率、OSWorld 效率 |
| 21 计算机使用 | 逐步安全捕获注入 DOM |
| 23 OTel | Span 发出必需属性 |
| 26 失败模式 | 检测器标记已知失败 |
| 27 提示词注入 | PVE 拒绝有毒检索 |
| 28 编排 | Supervisor 路由到正确专家 |
| 29 运行时形状 | DLQ 处理 N% 的失败 |

如果评估套件包含每一种用例，就覆盖了第 14 阶段。

### 评估驱动开发会在哪里失败

- **没有基线。** 没有最后已知良好的评估无法阅读。保存基线。
- **没有依据的 LLM-judge。** 评判者也会幻觉。使用 CRITIC 模式（第 05 节），让评判者以外部工具为依据。
- **对评估过拟合。** 针对评估优化会偏离生产实用性。轮换用例。
- **不稳定评估。** 非确定性用例会产生误报。固定种子，快照状态。

```figure
ae-eval-three-layers
```

## 动手构建

code/main.py 是一个标准库评估 harness：

- 带类别的用例注册表（benchmark、custom、online）。
- 一个接受测试的脚本化智能体。
- evaluator-optimizer 循环：提议、评判、改进，直到通过或达到最大轮数。
- CI 门控：汇总通过率，并与基线比较回归。

运行：

```
python3 code/main.py
```

输出每个用例的通过/失败、回归标志和 CI 门控结论。

## 实际使用

- 将评估用例与智能体代码放在同一个仓库。
- 通过 CI 在每个 PR 上运行。
- 回归时让构建失败。
- 随时间追踪通过率。
- 将每次生产失败都关联到一个新用例。

## 交付

outputs/skill-eval-suite.md 会为智能体产品构建三层评估套件，带 CI 门控和回归追踪。

## 练习

1. 取一次生产失败，编写能复现它的评估用例。你的智能体现在能通过吗？
2. 为你的领域构建一个包含三个维度（事实、语气、范围）的 LLM-judge rubric。为 50 个 session 打分。
3. 将评估套件接入 CI。回归达到或超过 5% 时让构建失败。
4. 增加轨迹效率指标：智能体相对黄金轨迹走了多少步？
5. 将第 14 阶段每一节映射到套件中的评估用例。有没有遗漏？那就是需要补齐的缺口。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Static benchmark | “现成评估” | SWE-bench、GAIA、AgentBench、WebArena、OSWorld |
| Custom offline eval | “领域评估” | 针对产品形状的 LLM-as-judge / 执行 / 轨迹评估 |
| Online eval | “生产评估” | Session 重放、防护栏告警、成本/延迟追踪 |
| Evaluator-optimizer | “提议–评判–改进” | 迭代直到评判者通过 |
| CI gate | “合并阻塞器” | 评估回归时让构建失败 |
| Baseline | “最后已知良好” | 用于检测回归的参考分数 |
| Trajectory efficiency | “相对黄金轨迹的步数” | 智能体步数除以人类专家最少步数 |

## 延伸阅读

- [Anthropic，构建有效的智能体](https://www.anthropic.com/research/building-effective-agents)——“从简单开始，用评估优化”
- [OpenAI，SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/)——整理后的基准
- [Berkeley Function Calling Leaderboard](https://gorilla.cs.berkeley.edu/leaderboard.html)——工具使用基准
- [Langfuse 文档](https://langfuse.com/)——实践中的评估 + session 重放
