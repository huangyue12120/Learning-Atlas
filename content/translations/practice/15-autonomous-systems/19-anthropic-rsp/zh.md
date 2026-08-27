---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/15-autonomous-systems/19-anthropic-rsp/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 239697bb9af9a03e89c8272cab896bbe338000655fb809de8628a40ddeba0d12
status: reviewed
---

# Anthropic Responsible Scaling Policy v3.0

> RSP v3.0 于 2026 年 2 月 24 日生效，取代了 2023 年政策。它采用双层缓解：Anthropic 将单方面做什么，以及作为行业范围建议提出什么（含 RAND SL-4 安全标准）。它将 Frontier Safety Roadmaps 和 Risk Reports 设为常设文档，而非一次性交付物；移除了 2023 年暂停承诺；引入 AI R&D-4 阈值：一旦跨越，Anthropic 必须发布识别失配风险和缓解措施的肯定性论证。Claude Opus 4.6 尚未跨越它。Anthropic 在 v3.0 公告中称，“自信地排除这一点正变得困难”。SaferAI 给 2023 年 RSP 评分为 2.2；他们将 v3.0 降至 1.9，使 Anthropic 与 OpenAI、DeepMind 一同归入“弱”RSP 类别。定性阈值取代了 2023 年定量承诺；删除暂停条款是最尖锐的退步。

**类型：** 学习
**语言：** Python（标准库，RSP 阈值决策引擎）
**前置要求：** 第 15 阶段 · 06（AAR）、第 15 阶段 · 07（RSI）
**用时：** 约 45 分钟

## 问题所在

前沿实验室发布的扩展政策既是技术文档，也是治理文档，同时还是面向监管者的信号。RSP v3.0 是当前 Anthropic 文档。仔细阅读它的重要性不在于遵守它有约束力（没有），而在于其框架会塑造实验室如何理解灾难性风险，以及如何向公众传达权衡。

v3.0 与 v2.0 的差异是有用单位。新增的内容：Frontier Safety Roadmaps、Risk Reports、AI R&D-4 阈值。删除的内容：2023 年暂停承诺。重新框定的内容：在 Anthropic 单方行动与行业建议之间划分的双层缓解时间表。外部审查 SaferAI 将分数从 v2 的 2.2 降到 v3.0 的 1.9。这正是扩展政策如何在看起来更精致的同时变得不那么严谨。

## 核心概念

### 双层缓解时间表

- **Anthropic 单方行动：** 无论其他实验室做什么，Anthropic 都会做的事情。如超过阈值时停止训练、具体安全措施、具体部署闸门。
- **行业范围建议：** Anthropic 认为行业应集体做的事情，包括 RAND SL-4 安全标准。这些不是 Anthropic 一方的承诺，而是政策倡导。

双层结构在 v2 中不存在。读者需要查看每项承诺位于哪一列。“行业范围建议”列中的安全措施并非 Anthropic 的承诺，而是 Anthropic 的希望。

### AI R&D-4 阈值

RSP v3.0 将该能力级别命名为下一个重要门槛：以相对于人类 + AI 工具的竞争性成本，自动化 AI 研究的实质部分。一旦 Anthropic 认为模型跨越该阈值，就必须在继续扩展之前发布一份肯定性论证，识别失配风险与缓解措施。

根据 v3.0 公告，Claude Opus 4.6 尚未跨越它。文档补充：“自信地排除这一点正变得困难。”这种措辞很重要：它承认该阈值已足够接近，是现实关切而非推测性边界。

第 6 课（自动化对齐研究）和第 7 课（递归式自我改进）直接流向这一阈值。自动化对齐研究员跨过研究质量门槛，是 AI R&D-4 正在接近的证据。

### Frontier Safety Roadmaps 与 Risk Reports

v3.0 将两类产物提升为常设文档：

- **Frontier Safety Roadmap：** 前瞻性文档，说明计划中的安全工作、能力预期和缓解研究。
- **Risk Report：** 在特定模型发布后的回顾性文档，说明已观察能力和残余风险。

两者均公开，并按声明的节奏更新。它们的效用是：读者可追踪 Anthropic 在 Roadmap 中称将做什么，与其在 Risk Report 中报告什么之间的差别。

### 删除暂停条款

2023 年 RSP 含有明确暂停承诺：若模型跨过指定能力阈值，训练会暂停，直到缓解措施就位。v3.0 以较软表述替代明确暂停（发布肯定性论证，若缓解充分则继续）。SaferAI 与其他分析者直接指出这是新文档中最强的退步。

改变的政策论点是：2023 年的定量阈值到 2026 年能力基准上已不可达，因为基准本身被重新标度。反方论点是：扩展政策中的暂停条款是承诺装置，移除它就移除了政策可信度。

### SaferAI 的降级

SaferAI 是为 RSP 类文档评分的独立组织。其公开评分为：2023 年 Anthropic RSP 为 2.2（量表中 4.0 是当前最佳 RSP，1.0 为名义程度），v3.0 为 1.9。这让 Anthropic 从“中等”降至“弱”，与 OpenAI 和 DeepMind 同属弱类别。

SaferAI 指出的降级因素：

- 定性阈值取代了定量阈值。
- 暂停承诺被移除。
- AI R&D-4 阈值的缓解被描述为“肯定性论证”，而非具体措施。
- 审查机制依赖 Anthropic Safety Advisory Group，独立监督有限。

### 本课不是什么

这不是一堂合规课程。RSP v3.0 不是法规；没有东西强制 Anthropic 遵循它。本课学习的是以应有的具体性和怀疑态度阅读文档。扩展政策是前沿实验室就灾难性风险姿态发出的主要公共信号。对任何依赖前沿能力的人而言，读懂它们是一项实际技能。

```figure
a5-rsp-ladder
```

## 实际运行

`code/main.py` 实现一个小型决策引擎，映射 RSP 的阈值评估形状：给定候选模型和一组能力测量，返回是否跨过 AI R&D-4 阈值、所需肯定性论证的部分，以及部署能否继续。它刻意简单；重点是将文档逻辑显式化。

## 交付物

`outputs/skill-scaling-policy-review.md` 依据 v3.0 参考审阅扩展政策（Anthropic、OpenAI、DeepMind 或内部政策）：双层结构、阈值、暂停承诺、独立审查。

## 练习

1. 运行 `code/main.py`。输入三个不同能力等级的合成模型。确认阈值评估器按预期工作，且产生正确肯定性论证模板。

2. 完整阅读 RSP v3.0（32 页）。找出“行业范围建议”层中的每项承诺。其中哪些在 v2 中本应是“Anthropic 单方行动”？

3. 阅读 SaferAI 的 RSP 评分方法。将其量表应用到文档，以复现 v3.0 的 1.9 分。哪一行量表最推动降级？

4. 2023 年暂停承诺已被移除。提出一项替代承诺：在承认 2026 年基准重标度问题的同时，保持政策可信度。

5. 将 RSP v3.0 与 OpenAI Preparedness Framework v2（第 20 课）比较。选一个 v3.0 更强的领域，再选一个 Preparedness Framework 更强的领域。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|---|---|---|
| RSP | “Anthropic 的扩展政策” | Responsible Scaling Policy；v3.0 于 2026 年 2 月 24 日生效 |
| AI R&D-4 | “研究自动化阈值” | 以竞争性成本自动化实质性 AI 研究的能力 |
| 肯定性论证 | “安全理由” | 已发布的论证：风险已被识别且缓解充分 |
| Frontier Safety Roadmap | “前瞻计划” | 关于计划安全工作与预期能力的常设文档 |
| Risk Report | “模型回顾” | 模型发布后关于已观测能力与残余风险的常设文档 |
| 双层缓解 | “单方与行业” | Anthropic 承诺与行业建议被分开 |
| 暂停承诺 | “2023 条款” | 暂停训练的明确承诺；在 v3.0 中移除 |
| SaferAI 评分 | “独立 RSP 成绩” | 第三方量表；v3.0 为 1.9（v2 为 2.2） |

## 延伸阅读

- [Anthropic——Responsible Scaling Policy v3.0](https://anthropic.com/responsible-scaling-policy/rsp-v3-0)——完整 32 页政策。
- [Anthropic——RSP v3.0 公告](https://www.anthropic.com/news/responsible-scaling-policy-v3)——从 v2 起的变更摘要。
- [Anthropic——Frontier Safety Roadmap](https://www.anthropic.com/research/frontier-safety)——RSP v3.0 链接的常设文档。
- [Anthropic——Risk Report：Claude Opus 4.6](https://www.anthropic.com/research/risk-report-claude-opus-4-6)——当前前沿模型的回顾。
- [Anthropic——在实践中衡量智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)——将 AI R&D-4 与已测自治联系。
