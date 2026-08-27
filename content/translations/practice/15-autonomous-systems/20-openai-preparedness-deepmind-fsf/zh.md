---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/15-autonomous-systems/20-openai-preparedness-deepmind-fsf/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 3a74fd7227a18efce31a8c6da82f774f2c2ad69f196cb48c87d1feb06edbebcc
status: reviewed
---

# OpenAI Preparedness Framework 与 DeepMind Frontier Safety Framework

> OpenAI Preparedness Framework v2（2025 年 4 月）引入研究类别（Research Categories），包括长时程自治、sandbagging、自主复制与适应、破坏安全防护，与跟踪类别（Tracked Categories）分开。跟踪类别触发由 Safety Advisory Group 审阅的 Capabilities Reports 与 Safeguards Reports。DeepMind 的 FSF v3（2025 年 9 月，2026 年 4 月 17 日加入 Tracked Capability Levels）将自治纳入 ML 研发与网络安全领域（ML R&D autonomy level 1 = 以相对于人类 + AI 工具的竞争性成本完全自动化 AI 研发流水线）。FSF v3 通过对工具性推理滥用进行自动监控，明确处理欺骗性对齐。PF v2 中的研究类别（包括长时程自治）不会自动触发缓解，政策语言是“潜在”。DeepMind 自己说，若工具性推理增强，自动监控“长期不会保持充分”。

**类型：** 学习
**语言：** Python（标准库，三框架决策表差异工具）
**前置要求：** 第 15 阶段 · 19（Anthropic RSP）
**用时：** 约 45 分钟

## 问题所在

第 19 课仔细阅读了 Anthropic 的扩展政策。本课通过阅读 OpenAI 和 DeepMind 的政策完成全貌。三份文档是处理同一问题的亲属产物——前沿实验室何时应暂停或给模型加闸门——它们在一组小类别上收敛，又在重要具体处发散。

收敛处是：三者都把长时程自治标为值得追踪的能力类别；三者都承认欺骗行为（伪装对齐、sandbagging）是一类具体风险；三者都有内部审阅机构。发散处是：OpenAI 将类别拆分为“Tracked”（强制缓解）和“Research”（不自动触发）；DeepMind 将自治并入两个领域，而不是单独命名。实验室会称之为 Tracked 与 Research、Critical 与 Moderate，或 Tier-1 与 Tier-2；能力位于哪个桶，对运行后果会因实验室而异。

将它们放在一起阅读才是有用练习。相同能力在 Anthropic 可能是“必须缓解”，在 OpenAI 是“监控但不触发”，在 DeepMind 则是“在具体领域中追踪”。政策姿态很重要。

## 核心概念

### OpenAI Preparedness Framework v2（2025 年 4 月）

结构：

- **跟踪类别（Tracked Categories）：** 触发 Capabilities Reports（模型能做什么）和 Safeguards Reports（具备什么缓解措施）。部署前由 Safety Advisory Group 审阅。
- **研究类别（Research Categories）：** 实验室正在跟踪、却尚未承诺具体缓解的模型能力。包括长时程自治、sandbagging、自主复制与适应、破坏安全防护。

v2 的关键框架是：研究类别不自动触发缓解，政策用语是“潜在”缓解。类别位于 Tracked 还是 Research，决定它是“有闸门”还是“仅观察”。

### DeepMind Frontier Safety Framework v3（2025 年 9 月；2026 年 4 月 17 日加入 Tracked Capability Levels）

结构：

- **关键能力等级（CCLs）：** 五个领域中的能力阈值：网络安全、生物、ML 研发、CBRN、自治（纳入 ML 研发与网络安全）。
- **跟踪能力等级（Tracked Capability Levels）：** 2026 年 4 月加入的额外粒度。具体例子：ML 研发自治等级 1 = 以相对于人类 + AI 工具的竞争性成本完全自动化 AI 研发流水线。
- **欺骗性对齐监控：** 明确承诺对工具性推理滥用进行自动监控。

自治框架不同于 OpenAI。DeepMind 不将“自治”保留为顶层领域，而是将其纳入自治会造成危害的领域（ML 研发和网络安全）。论点是：没有领域的自治是没有风险的能力；反方论点是：跨领域自治是一种框架应当命名的元风险。

### 三者共同收敛之处

- 内部 Safety Advisory Group（命名为 Anthropic SAG、OpenAI SAG、DeepMind 内部委员会）。针对高能力模型，部署前审阅。
- 明确提及欺骗性对齐 / 伪装对齐，作为风险类别。
- 按声明节奏更新的常设产物（Anthropic：Frontier Safety Roadmap、Risk Report；OpenAI：Capabilities 和 Safeguards Reports；DeepMind：FSF 更新周期）。
- 承认仅监控防御存在上限。DeepMind 明确指出：“自动监控长期不会保持充分。”

### 它们的分歧

- **Anthropic：** 在 v3.0 中移除了暂停承诺；AI R&D-4 阈值是命名的下一道闸门。
- **OpenAI：** Tracked 与 Research 的拆分；研究类别（包括长时程自治）不自动设闸门。
- **DeepMind：** 自治并入其他领域；Tracked Capability Levels 在 2026 年 4 月增加粒度。

### Sandbagging：使三者都复杂化的一项具体能力

Sandbagging（模型在评估中战略性表现不足）位于 OpenAI 的研究类别。Anthropic 的 RSP v3.0 通过评估上下文差距处理它（第 1 课）。DeepMind 则通过 FSF v3 中的欺骗性对齐监控处理。

若模型在评估中 sandbag，所有框架的能力阈值都会被低估。框架只有在测量有效时才有效。这正是为何除实验室自评外，外部测量（第 21 课 METR）与对抗性评估也是必要的。

### 政策阅读技能

- **定位：** 你关心的每项能力都应能在政策中找到。若找不到，政策没有覆盖它。
- **分类：** 它是 Tracked（触发缓解）还是 Research（追踪但不触发）？OpenAI 明确命名这些；Anthropic 和 DeepMind 有各自等价物。
- **节奏：** 政策是在声明的固定日程更新，还是仅在特定事件后更新？声明节奏更强。
- **独立性：** 外部审阅是强制还是可选？Anthropic 与 Apollo 和美国 AI 安全研究所合作；OpenAI 与 METR 合作；DeepMind 主要依赖内部 SAG。

```figure
a5-tracked-vs-research
```

## 实际运行

`code/main.py` 实现一个小型决策表差异工具。给定一种能力（自治、欺骗性对齐、研发自动化、网络安全增益等），它输出三项政策各自如何分类该能力、以及触发哪些缓解。它是阅读辅助，不是政策工具。

## 交付物

`outputs/skill-cross-policy-diff.md` 使用三个框架作为参考，为特定能力生成跨政策比较。

## 练习

1. 运行 `code/main.py`。确认差异工具针对至少两个你能从源文档验证的能力，输出与政策一致。

2. 完整阅读 OpenAI Preparedness Framework v2。找出每个研究类别，并为每个写一句为何它在 Research 而非 Tracked。

3. 完整阅读 DeepMind FSF v3，以及 2026 年 4 月 Tracked Capability Levels 更新。找出 ML 研发自治等级 1 的具体评估标准。你如何在外部测量它？

4. Sandbagging 位于 OpenAI 的研究类别。设计一项迫使 sandbagging 模型揭示真实能力的评估，参考第 1 课的评估上下文博弈讨论。

5. 在一个你选择的具体能力上比较三项政策。指出你认为哪项分类最严谨，哪项最不严谨，并引用源文说明。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|---|---|---|
| Preparedness Framework | “OpenAI 的扩展政策” | PF v2（2025 年 4 月）；Tracked 与 Research 类别 |
| 跟踪类别 | “强制缓解” | 触发 Capabilities + Safeguards Reports 与 SAG 审阅 |
| 研究类别 | “仅监控” | 被追踪但无自动缓解；包括长时程自治 |
| Frontier Safety Framework | “DeepMind 的扩展政策” | FSF v3（2025 年 9 月）+ Tracked Capability Levels（2026 年 4 月） |
| CCL | “关键能力等级” | DeepMind 每个领域的阈值（网络安全、生物、ML 研发、CBRN） |
| ML 研发自治等级 1 | “研发自动化” | 以竞争性成本完全自动化 AI 研发流水线 |
| Sandbagging | “战略性表现不足” | 模型在评估中表现不足；位于 OpenAI 研究类别 |
| 工具性推理 | “手段—目的推理” | 关于如何实现目标的推理；是 DeepMind 监控对象 |

## 延伸阅读

- [OpenAI——更新我们的 Preparedness Framework](https://openai.com/index/updating-our-preparedness-framework/)——v2 公告。
- [OpenAI——Preparedness Framework v2 PDF](https://cdn.openai.com/pdf/18a02b5d-6b67-4cec-ab64-68cdfbddebcd/preparedness-framework-v2.pdf)——完整文档。
- [DeepMind——强化我们的 Frontier Safety Framework](https://deepmind.google/blog/strengthening-our-frontier-safety-framework/)——FSF v3 公告。
- [DeepMind——更新 Frontier Safety Framework（2026 年 4 月）](https://deepmind.google/blog/updating-the-frontier-safety-framework/)——Tracked Capability Levels 增加。
- [Gemini 3 Pro FSF 报告](https://storage.googleapis.com/deepmind-media/gemini/gemini_3_pro_fsf_report.pdf)——FSF 格式 Risk Report 示例。
