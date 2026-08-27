---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/18-ethics-safety-alignment/28-alignment-research-ecosystem/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 43652e0255c4dca0af153c4c29d35002b32c7bef5235637b18e6a4fd95617ee7
status: reviewed
---

# 对齐研究生态：MATS、Redwood、Apollo、METR

> 五个组织构成 2026 年非实验室对齐研究层。MATS（ML Alignment & Theory Scholars）：自 2021 年末以来已有 527+ 名研究者、发表 180+ 篇论文、获得 1 万+ 次引用，h 指数为 47；2024 年夏季队列以 501(c)(3) 注册，约有 90 名学者和 40 名导师；2025 年前校友中 80% 从事安全/安保工作，其中 200+ 人在 Anthropic、DeepMind、OpenAI、英国 AISI、RAND、Redwood、METR、Apollo 工作。Redwood Research：由 Buck Shlegeris 创办的应用对齐实验室；提出 AI Control（第 10 课），并与英国 AISI 合作控制安全论证。Apollo Research：面向前沿实验室的部署前欺骗评估；撰写《In-Context Scheming》（第 8 课）和《Towards Safety Cases for AI Scheming》。METR（Model Evaluation and Threat Research）：基于任务的能力评估和自主任务时间范围研究；《Common Elements of Frontier AI Safety Policies》比较各实验室框架。Eleos AI Research：模型福利部署前评估（第 19 课）；开展了 Claude Opus 4 的福利评估。

**类型：** 学习
**语言：** 无
**前置要求：** 第 18 阶段 · 01–27（此前的第 18 阶段课程）
**用时：** 约 45 分钟

## 学习目标

- 识别非实验室对齐研究生态中的五个组织及其核心产出。
- 描述 MATS 的规模（学者、论文、h 指数）及其人才管道角色。
- 描述 Redwood 的 AI Control 议程及其与英国 AISI 的合作。
- 描述 METR 基于任务的评估方法。

## 问题

前沿实验室（第 18 课）在内部开展安全评估并发布选定结果。实验室之外的生态负责验证这些评估、最先发现新的失效模式，并培养人才。理解这一生态，有助于判断谁会信任哪些研究发现。

## 概念

### MATS（ML Alignment & Theory Scholars）

项目始于 2021 年末，学者与一名资深研究者共同用 10–12 周研究一个具体的对齐问题。

规模（2026 年）：

- 成立以来 527+ 名研究者。
- 发表 180+ 篇论文。
- 1 万+ 次引用。
- h 指数 47。
- 2024 年夏季：90 名学者 + 40 名导师；注册为 501(c)(3)。

职业去向：2025 年前校友中约 80% 从事安全/安保工作。在 Anthropic、DeepMind、OpenAI、英国 AISI、RAND、Redwood、METR、Apollo 工作的校友超过 200 人。

### Redwood Research

应用对齐实验室，由 Buck Shlegeris 创办。提出 AI Control 议程（第 10 课），与英国 AISI 合作控制安全论证，并为 DeepMind 和 Anthropic 提供评估设计建议。

代表性论文：Greenblatt、Shlegeris 等，《AI Control》（arXiv:2312.06942，ICML 2024）；《Alignment Faking》（Greenblatt、Denison、Wright 等，arXiv:2412.14093，与 Anthropic 合作）。

风格：明确的威胁模型、最坏情况对手，以及可进行压力测试的具体协议。

### Apollo Research

为前沿实验室开展部署前欺骗评估。撰写《In-Context Scheming》（第 8 课，arXiv:2412.04984），参与 2025 年 OpenAI 反欺骗训练合作，并产出《Towards Safety Cases for AI Scheming》（2024）。

风格：在可能出现欺骗的智能体环境中进行评估；分解为三根支柱：错位、目标导向性和情境觉知。

### METR（Model Evaluation and Threat Research）

开展基于任务的能力评估和自主任务完成时间范围研究。《Common Elements of Frontier AI Safety Policies》（metr.org/common-elements，2025）比较各实验室框架。

与 Apollo 共同撰写 AI 欺骗安全论证草案。

风格：长时间范围任务评估、实证能力测量和框架综合。

### Eleos AI Research

开展模型福利部署前评估。进行了系统卡第 5.3 节记录的 Claude Opus 4 福利评估，为第 19 课涉及福利的主张提供外部方法学核查。

### 流程

MATS 培养研究者。毕业生进入 Anthropic、DeepMind、OpenAI（实验室安全团队），或 Redwood、Apollo、METR、Eleos（外部评估机构）。外部评估者与实验室以及英国 AISI / CAISI 合作。发表成果再反馈给 MATS，为下一届队列提供基础。

### 这一层为何重要

单一来源的评估并不可靠：实验室评估自己的模型存在结构性利益冲突。外部评估者可以提出并验证实验室可能少报的失效模式。2024 年的《Sleeper Agents》（第 7 课）由 Anthropic 与 Redwood 合作；《Alignment Faking》也由 Anthropic 与 Redwood 合作；《In-Context Scheming》来自 Apollo；反欺骗工作由 Apollo 与 OpenAI 合作。多组织结构就是质量控制。

### 它在第 18 阶段主线中的位置

第 7–11 课引用 Redwood 和 Apollo 的工作；第 18 课引用 METR 的框架比较；第 19 课引用 Eleos。第 28 课明确绘出本阶段其余部分所依赖的生态组织图。

```figure
sae-features
```

## 使用

本课无代码。阅读 METR 的《Common Elements of Frontier AI Safety Policies》，将其作为外部综合如何为实验室内部政策工作增加价值的例子。

## 交付

本课产出 `outputs/skill-ecosystem-map.md`。给定一项对齐主张或评估，它会识别相关组织、发表渠道和方法学风格，并与已知的对应组织交叉核对。

## 练习

1. 从第 7–15 课中选择一篇论文，识别参与的组织。将作者与 MATS 校友及当前生态归属交叉核对。

2. 阅读 METR 的《Common Elements of Frontier AI Safety Policies》，找出其强调的三个跨实验室共识和两个最大分歧。

3. MATS 的职业去向中约 80% 是安全/安保工作。论证这种选择压力是适应性的（训练该领域）还是有偏的（筛掉异端立场）。

4. Redwood 和 Apollo 都研究控制/欺骗，但风格不同。选择一种失效模式，描述二者会如何调查。

5. Eleos AI 是唯一纯粹的模型福利组织。设计第二个专注于不同福利相邻问题（认知自由、机器人具身性等）的假想组织，并阐明其方法。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|------------|----------|
| MATS | “导师项目” | ML Alignment & Theory Scholars；自 2021 年以来 527+ 名研究者 |
| Redwood Research | “控制实验室” | 应用对齐；AI Control 作者；英国 AISI 合作方 |
| Apollo Research | “欺骗评估” | 面向前沿实验室的部署前欺骗评估 |
| METR | “任务时间范围评估” | 基于任务的能力评估；框架综合 |
| Eleos AI | “福利实验室” | 模型福利部署前评估 |
| 人才管道 | “MATS → 实验室” | MATS 毕业生流向 Anthropic、DeepMind、OpenAI、Redwood、Apollo、METR |
| 外部评估 | “非实验室核查” | 不是模型生产者进行的评估；增加可信度 |

## 延伸阅读

- [MATS（ML Alignment & Theory Scholars）](https://www.matsprogram.org/) — 导师项目
- [Redwood Research](https://www.redwoodresearch.org/) — AI Control 论文
- [Apollo Research](https://www.apolloresearch.ai/) — 欺骗评估
- [METR — Common Elements of Frontier AI Safety Policies](https://metr.org/blog/2025-03-26-common-elements-of-frontier-ai-safety-policies/) — 框架比较
- [Eleos AI Research](https://www.eleosai.org/research) — 模型福利方法
