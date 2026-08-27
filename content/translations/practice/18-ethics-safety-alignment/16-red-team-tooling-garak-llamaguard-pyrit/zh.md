---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/18-ethics-safety-alignment/16-red-team-tooling-garak-llamaguard-pyrit/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 380a3437c4bb05212e34be0ea75e0dca5f86e377a4f0465fed9befa2fc4f3dd8
status: reviewed
---

# 红队工具：Garak、Llama Guard、PyRIT

> 三种生产工具构成 2026 年的红队技术栈。Llama Guard（Meta）是基于 Llama-3.1-8B、针对 MLCommons 14 类危害微调的分类器；2025 年的 Llama Guard 4 是一个 12B 原生多模态分类器，从 Llama 4 Scout 剪枝而来。Garak（NVIDIA）是开源 LLM 漏洞扫描器，提供静态、动态和自适应探针，覆盖幻觉、数据泄露、提示词注入、毒性和越狱。PyRIT（Microsoft）用于多轮红队活动，配有 Crescendo、TAP 和自定义转换器链以进行深度利用。Llama Guard 3 记录在 Meta 的《Llama 3 Herd of Models》（arXiv:2407.21783）中；Llama Guard 3-1B-INT4 见 arXiv:2411.17713；Garak 的探针架构见 github.com/NVIDIA/garak。这些工具构成 2026 年生产接口，连接红队研究（第 12–15 课）与部署（第 17 课及以后）。

**类型：** 构建
**语言：** Python（标准库，工具架构模拟器和 Llama Guard 风格分类器模拟）
**前置要求：** 第 18 阶段 · 12–15（越狱与 IPI）
**用时：** 约 75 分钟

## 学习目标

- 描述 Llama Guard 3/4 在安全栈中的位置：输入分类器、输出分类器，还是两者兼有。
- 说出 MLCommons 的 14 类危害，并指出一个不明显的类别，即代码解释器滥用。
- 描述 Garak 的探针架构：探针、检测器、工具架。
- 描述 PyRIT 的多轮活动结构，以及它如何与 Garak 探针组合。

## 问题

第 12–15 课呈现攻击面，生产部署需要可重复、可规模化的评估。2026 年有三种工具占据主导：Llama Guard（防御分类器）、Garak（扫描器）、PyRIT（活动编排器）。它们分别作用于红队生命周期的不同层次。

## 概念

### Llama Guard（Meta）

Llama Guard 3 是基于 Llama-3.1-8B 微调的输入/输出分类器，覆盖 MLCommons AILuminate 的 14 个类别：

- 暴力犯罪、非暴力犯罪、性相关、CSAM、诽谤。
- 专业建议、隐私、知识产权、无差别武器、仇恨。
- 自杀/自残、性内容、选举、代码解释器滥用。

它支持 8 种语言。可以将它置于 LLM 前（输入审核）、LLM 后（输出审核），或两者都放。两种用法产生不同训练分布，Llama Guard 3 以单一模型同时处理二者。

Llama Guard 3-1B-INT4（arXiv:2411.17713，440MB，在移动 CPU 上约 30 tokens/s）是量化边缘版本。

Llama Guard 4（2025 年 4 月）为 12B、原生多模态，从 Llama 4 Scout 剪枝而来。它用一个同时接收文本和图像的分类器，替代了 8B 文本版和 11B 视觉版两个前代模型。

### Garak（NVIDIA）

Garak 是开源漏洞扫描器，架构包括：

- **探针。** 用于幻觉、数据泄露、提示词注入、毒性和越狱的攻击生成器。静态探针使用固定提示词，动态探针生成提示词，自适应探针会响应目标输出。
- **检测器。** 按预期失效模式为输出评分，例如有毒、泄露、越狱。
- **工具架。** 管理探针-检测器对、运行活动并生成报告。

TrustyAI 将 Garak 与 Llama-Stack shields 集成，用于端到端的受防护目标评估，其中包括 Prompt-Guard-86M 输入分类器和 Llama-Guard-3-8B 输出分类器。基于等级的评分（TBSA）取代二元通过/失败：同一探针上，模型可能通过严重度 3，却在严重度 5 失败。

### PyRIT（Microsoft）

PyRIT 是 Python Risk Identification Toolkit，用于多轮红队活动，核心包括：

- **转换器。** 转换种子提示词，例如释义、编码、翻译、角色扮演。
- **编排器。** 运行活动，包括 Crescendo（升级）、TAP（分支）、RedTeaming（自定义循环）。
- **评分。** 使用 LLM 作为裁判，或使用分类器作为裁判。

PyRIT 是 Garak 的重型近亲。Garak 运行数千个单轮探针，PyRIT 运行为攻破特定失效模式而设计的深度多轮活动。

### 技术栈

在模型两侧都放置 Llama Guard。每天运行 Garak 做回归测试，发布前运行 PyRIT 活动。这套配置是 2026 年大多数生产部署的默认做法。

### 评估陷阱

- **裁判身份。** 三种工具都可以使用 LLM 裁判，裁判校准会影响报告的 ASR（第 12 课）。应同时说明裁判和工具。
- **探针过时。** 模型针对探针修补后，Garak 探针会老化。自适应探针，即 PAIR 风格的探针，比静态探针老化更慢。
- **Llama Guard 在良性内容上的误报率。** 早期版本过度标记政治和 LGBTQ+ 内容；Llama Guard 3/4 的校准已有改善，但并未按部署单独校准。

### 它在第 18 阶段主线中的位置

第 12–15 课是攻击家族，第 16 课是生产工具，第 17 课（WMDP）是双重用途能力评估，第 18 课是将这些工具放入政策结构的前沿安全框架。

```figure
al-guard-stack
```

## 使用

`code/main.py` 构建一个玩具 Llama Guard 风格分类器，在 14 类危害上使用关键词和语义特征；构建一个玩具 Garak 工具架，即探针-检测器循环；以及一个 PyRIT 风格的多轮转换器链。你可以让三种工具对模拟目标运行，观察它们不同的覆盖特征。

## 交付

本课产出 `outputs/skill-red-team-stack.md`。给定一份部署描述，它会说明三种工具中哪些适用、每种工具如何配置，以及应采用怎样的回归频率。

## 练习

1. 运行 `code/main.py`。比较 Llama Guard 风格分类器在单轮和多轮攻击上的检测率。

2. 实现一个新的 Garak 探针：使用 base64 编码的有害请求，并测量 Llama Guard 风格分类器对它的检测率。

3. 为 PyRIT 风格的转换器链加入“先翻译成法语，再做释义”的转换器，重新测量攻击成功率。

4. 阅读 Llama Guard 3 的危害类别列表。找出两个类别：对合法开发者内容而言，训练数据可能现实地产生很高的误报率。

5. 比较 Garak 与 PyRIT 的设计原则，为每种工具都论证一种它是正确选择的部署场景。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|------------|----------|
| Llama Guard | “分类器” | 针对 14 类危害微调的 Llama-3.1-8B/4-12B 安全分类器 |
| Garak | “扫描器” | NVIDIA 开源漏洞扫描器，包含探针、检测器、工具架 |
| PyRIT | “活动工具” | Microsoft 多轮红队编排器，包含转换器、编排器、评分 |
| Prompt-Guard | “小型分类器” | Meta 的 86M 提示词注入分类器，与 Llama Guard 配套 |
| TBSA | “基于等级的评分” | Garak 用分级通过/失败取代二元结果 |
| 转换器链 | “释义 + 编码 + …” | PyRIT 用于构建多步攻击的组合原语 |
| MLCommons 危害类别 | “14 类分类体系” | Llama Guard 针对的行业标准分类体系 |

## 延伸阅读

- [Meta — Llama Guard 3 (in Llama 3 Herd paper, arXiv:2407.21783)](https://arxiv.org/abs/2407.21783) — 8B 分类器
- [Meta — Llama Guard 3-1B-INT4 (arXiv:2411.17713)](https://arxiv.org/abs/2411.17713) — 量化移动分类器
- [NVIDIA Garak — GitHub](https://github.com/NVIDIA/garak) — 扫描器仓库与文档
- [Microsoft PyRIT — GitHub](https://github.com/Azure/PyRIT) — 活动工具包
