---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/18-ethics-safety-alignment/29-moderation-systems-openai-perspective-llamaguard/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: ad0da963675b3addadb37f2d439e28b60efebcc0dbd4c4292bb4ef57a39820ef
status: reviewed
---

# 内容审核系统：OpenAI、Perspective、Llama Guard

> 生产审核系统把第 12–16 课定义的安全策略落地。OpenAI Moderation API：`omni-moderation-latest`（2024）基于 GPT-4o，在一次调用中分类文本和图像；在多语言测试集上比前一版本好 42%；响应模式返回 13 个类别布尔值——骚扰、骚扰/威胁、仇恨、仇恨/威胁、非法、非法/暴力、自残、自残/意图、自残/指导、色情、色情/未成年人、暴力、暴力/血腥；对大多数开发者免费。分层模式包括：输入审核（生成前）、输出审核（生成后）和自定义审核（领域规则）。异步并行调用可以隐藏延迟；命中时返回占位响应。Llama Guard 3/4（第 16 课）：14 类 MLCommons 危害、代码解释器滥用、8 种语言（v3）、多图像（v4）。Perspective API（Google Jigsaw）：早于 LLM 审核时代的毒性评分，主要是单维毒性及严重毒性/侮辱/脏话变体，是内容审核研究的基线。弃用时间线：Azure Content Moderator 于 2024 年 2 月弃用、2027 年 2 月退役，由 Azure AI Content Safety 替代。

**类型：** 构建
**语言：** Python（标准库，三层审核工具）
**前置要求：** 第 18 阶段 · 16（Llama Guard / Garak / PyRIT）
**用时：** 约 60 分钟

## 学习目标

- 描述 OpenAI Moderation API 的类别体系，并说明它与 Llama Guard 3 的 MLCommons 集合有何不同。
- 描述三层审核模式（输入、输出、自定义），并为每层说出一种失效模式。
- 描述 Perspective API 作为 LLM 时代前基线的位置，以及它为何仍用于研究。
- 说出 Azure 的弃用时间线。

## 问题

第 12–16 课介绍攻击和防御工具。第 29 课讨论在用户接触产品的表层落地这些防御的审核系统。三层模式是 2026 年的默认配置。

## 概念

### OpenAI Moderation API

`omni-moderation-latest`（2024）基于 GPT-4o，在一次调用中分类文本和图像，对大多数开发者免费。

响应模式中的 13 个布尔类别：

- harassment、harassment/threatening
- hate、hate/threatening
- self-harm、self-harm/intent、self-harm/instructions
- sexual、sexual/minors
- violence、violence/graphic
- illicit、illicit/violent

多模态支持适用于 `violence`、`self-harm` 和 `sexual`，不适用于 `sexual/minors`；其余类别仅支持文本。

在 `code/main.py` 的工具中，为便于教学，我们把 `/threatening`、`/intent`、`/instructions` 和 `/graphic` 子类别折叠到各自的顶层类别。生产代码应使用完整的 13 类模式。

在多语言测试集上比上一代审核端点好 42%。它返回每类分数，由应用设置阈值。

### Llama Guard 3/4

第 16 课已介绍。它有 14 类 MLCommons 危害（组织方式不同于 OpenAI 的 13 个响应布尔类别），v3 支持 8 种语言，Llama Guard 4（2025 年 4 月）为原生多模态 12B 模型。

OpenAI 与 Llama Guard 的分类体系有重叠也有差异。OpenAI 将 `illicit` 作为宽泛类别，而 Llama Guard 分开列出“暴力犯罪”和“非暴力犯罪”。部署方应根据策略分类体系的匹配程度选择。

### Perspective API（Google Jigsaw）

早于 LLM 作为裁判潮流的毒性评分系统（2020 年前）。类别包括 TOXICITY、SEVERE_TOXICITY、INSULT、PROFANITY、THREAT、IDENTITY_ATTACK。主要分数是单维的 TOXICITY，并提供子维度变体。

它广泛用作内容审核研究基线，因为 API 稳定、有文档，且拥有多年校准数据。在现代、接近 LLM 的场景中，Llama Guard 或 OpenAI Moderation 通常更合适。

### 三层模式

1. **输入审核。** 在生成前分类用户提示词，命中则拒绝。延迟：一次分类器调用。
2. **输出审核。** 在交付前分类模型输出，命中则替换为拒答。延迟：生成后一次分类器调用。
3. **自定义审核。** 领域规则（正则、允许列表、业务策略），在输入或输出侧运行。

三层按顺序设计：输入审核必须在生成前完成，输出审核在生成后运行。并行只适用于层内：对同一文本并发运行多个分类器（例如 OpenAI Moderation、Llama Guard、Perspective）可以隐藏各分类器延迟。可选优化是输入审核期间显示“请稍候，正在检查……”占位响应，并延迟 token-1 流式输出。命中行为可配置为拒绝、清理或升级人工审核。

### 失效模式

- **只有输入。** 捕获不到输出幻觉（第 12–14 课的编码攻击可绕过输入分类器）。
- **只有输出。** 任意输入都能到达模型，增加成本，并把内部推理暴露给攻击者。
- **只有自定义。** 跨类别不稳健；正则表达式脆弱。

分层是默认方案，提供双重保险。

### Azure 弃用

Azure Content Moderator 于 2024 年 2 月弃用、2027 年 2 月退役，由基于 LLM 并与 Azure OpenAI 集成的 Azure AI Content Safety 替代。对 Azure 部署而言，迁移是 2024–2027 年的工程项目。

### 它在第 18 阶段主线中的位置

第 16 课从红队角度介绍审核工具，第 29 课介绍已部署的审核系统，第 30 课以当前双重用途能力证据收束主线。

```figure
an-moderation-layers
```

## 使用

`code/main.py` 构建三层审核工具：输入审核器（关键词 + 类别分数）、输出审核器（对输出使用同一分类器）和自定义审核器（领域规则）。运行输入后可观察每层捕获了什么。

## 交付

本课产出 `outputs/skill-moderation-stack.md`。给定一项部署，它会推荐审核栈配置：输入使用哪个分类器、输出使用哪个分类器、哪些自定义规则，以及边界案例使用什么裁判。

## 练习

1. 运行 `code/main.py`，让良性、边界和有害输入通过三层，并报告每个输入触发了哪一层。
2. 为工具加入特定类别的 Perspective API 风格毒性评分，将其阈值行为与类别分数比较。
3. 阅读 OpenAI Moderation API 文档和 Llama Guard 3 类别列表，将每个 OpenAI 类别映射到最接近的 Llama Guard 类别，并找出三个无法清晰映射的类别。
4. 为代码助手（如 GitHub Copilot）设计审核栈，指出最相关和最不相关的类别并提出自定义规则。
5. Azure Content Moderator 将于 2027 年 2 月退役。制定迁移到 Azure AI Content Safety 的计划，并指出迁移中风险最高的环节。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|------------|----------|
| OpenAI Moderation | “omni-moderation-latest” | 基于 GPT-4o、13 类（文本）并部分支持多模态的分类器 |
| Perspective API | “Google Jigsaw 毒性” | LLM 时代前的毒性评分基线 |
| Llama Guard | “MLCommons 14 类” | Meta 的危害分类器（v3：8B 文本、8 种语言；v4：12B 多模态） |
| 输入审核 | “生成前过滤器” | 模型调用前对用户提示词进行分类 |
| 输出审核 | “生成后过滤器” | 交付前对模型输出进行分类 |
| 自定义审核 | “领域规则” | 部署特定规则（正则、允许列表、策略） |
| 分层审核 | “三层全开” | 标准生产部署模式 |

## 延伸阅读

- [OpenAI Moderation API 文档](https://platform.openai.com/docs/api-reference/moderations) — omni-moderation 端点
- [Meta PurpleLlama + Llama Guard](https://github.com/meta-llama/PurpleLlama) — Llama Guard 仓库
- [Google Jigsaw Perspective API](https://perspectiveapi.com/) — 毒性评分
- [Azure AI Content Safety](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/) — Azure 替代方案
