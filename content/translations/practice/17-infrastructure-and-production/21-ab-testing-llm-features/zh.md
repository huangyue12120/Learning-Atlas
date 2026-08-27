---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/21-ab-testing-llm-features/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: cb52fba426116a636f2d13ad6accb8c7237a8e973b0dba6da39ab8124249b1c6
status: reviewed
---

# LLM 功能的 A/B 测试：GrowthBook、Statsig 与“感觉”问题

> 传统 A/B 测试并非为非确定性 LLM 而生。关键区分是：评估回答“模型能完成任务吗？”；A/B 测试回答“用户在乎吗？”。二者都必不可少；凭感觉检查后上线的时代结束了。2026 年测试什么：提示词工程（措辞）、模型选择（GPT-4 对 GPT-3.5 对 OSS；准确率对成本对延迟）、生成参数（temperature、top-p）。真实案例：一种聊天机器人奖励模型变体使对话长度 +70%、留存 +30%；Nextdoor 的 AI 标题实验在优化奖励函数后带来 +1% CTR；Khan Academy 的 Khanmigo 围绕延迟与数学准确率轴迭代。平台分化：**Statsig**（2025 年 9 月被 OpenAI 以 $1.1B 收购）——序贯测试、CUPED、一体化。**GrowthBook**——开源、仓库原生、Bayesian + Frequentist + Sequential 引擎、CUPED、SRM 检查、Benjamini-Hochberg + Bonferroni 校正。选择取决于你是否偏好仓库 SQL，以及“被 OpenAI 收购”是否对组织重要。

**类型：** 学习
**语言：** Python（标准库，用于模拟序贯测试的玩具程序）
**前置要求：** 第 17 阶段 · 13（可观测性），第 17 阶段 · 20（渐进式部署）
**用时：** 约 60 分钟

## 学习目标

- 区分评估（“模型能完成任务吗”）和 A/B 测试（“用户在乎吗”）。
- 枚举三个可测试轴（提示词、模型、参数），并为每个选择指标。
- 解释 CUPED、序贯测试和 Benjamini-Hochberg 多重比较校正。
- 根据仓库 SQL 立场和企业收购立场选择 Statsig 或 GrowthBook。

## 问题

你手工调优了系统提示词，感觉更好，便上线了。转化率只是随机变化，你责怪指标。或者你上线一个新模型，转化没有变化——模型变差了，还是改动太小、无法检测？你不知道，因为上线前没有进行 A/B。

评估回答模型能否在带标签集合上完成任务，它们不能回答用户是否偏好输出。只有受控在线实验可以回答，而前提是实验有足够统计功效、控制非确定性，并校正多重比较。

## 概念

### 评估与 A/B 测试

**评估**——离线、带标签集合、评审器（量规或 LLM-as-judge 或人工）。回答：“在这个固定分布上，输出正确 / 有帮助 / 安全吗？”

**A/B 测试**——在线、真实用户、随机化。回答：“新变体是否改变了重要的用户级指标？”

两者都必不可少。评估在暴露前捕获回归，A/B 在之后确认产品影响。

### 测什么

1. **提示词工程**——措辞、系统提示词结构、示例。指标：任务成功、用户留存、每请求成本。
2. **模型选择**——GPT-4 对 GPT-3.5-Turbo 对 Llama-OSS。指标：准确率（任务）+ 每请求成本 + P99 延迟，多目标。
3. **生成参数**——temperature、top-p、max_tokens。指标：任务专属（输出多样性与确定性）。

### CUPED——方差降低

Controlled-experiments Using Pre-Experiment Data。在比较后期之前先回归掉前期方差，典型方差降低为 30–70%，有效样本量可免费提高。

实现：Statsig 和 GrowthBook 均支持。

### 序贯测试

经典 A/B 假设固定样本量。序贯测试（“查看并决定”）控制多次查看下的假阳性率。始终有效的序贯程序（mSPRT、Howard 的置信序列）允许在明显胜者出现时提前停止。

### 多重比较校正

在 95% 置信度下运行 20 个 A/B 测试，随机情况下会出现一个假阳性。Bonferroni 校正收紧每次测试的 α；Benjamini-Hochberg 控制假发现率。GrowthBook 两者皆有。

### SRM——样本比例失配

分配哈希将用户随机分配给变体。若 50/50 拆分给出 47/53，说明有东西出错——SRM 检查会标记它。两个平台都支持。

### Statsig 对 GrowthBook

**Statsig：**

- 2025 年 9 月被 OpenAI 以 $1.1B 收购，托管 SaaS。
- 序贯测试、CUPED、保留人群。
- 一体化：feature flags + 实验 + 可观测性。
- 最适：团队想要打包产品，不介意 OpenAI 所有权。

**GrowthBook：**

- 开源（MIT），仓库原生（直接读取 Snowflake/BigQuery/Redshift）。
- 多个引擎：Bayesian、Frequentist、Sequential。
- CUPED、SRM、Bonferroni、BH 校正。
- 自托管或托管云。
- 最适：仓库 SQL 工作方式，数据团队控制指标层，且需要 OSS。

### 非确定性使功效复杂化

相同提示词产生不同输出。传统功效计算假设 IID 观察值。对于 LLM 非确定性，有效样本量低于名义样本量；以约 1.3–1.5 倍作为所需样本量的安全缓冲。

### 真实案例结果

- 聊天机器人奖励模型变体：对话长度 +70%，留存 +30%。
- Nextdoor 标题：优化奖励函数后 CTR +1%。
- Khan Academy Khanmigo：迭代延迟与数学准确率的取舍。

### 反模式：凭感觉上线

每一位资深工程师都能说出一个因为“感觉更好”而上线、却没有 A/B 的功能。大多数都让团队数月未察觉的产品指标退化。A/B 是强制机制。

### 应当记住的数字

- Statsig 被 OpenAI 收购：$1.1B，2025 年 9 月。
- GrowthBook：开源 MIT；Bayesian + Frequentist + Sequential。
- CUPED 方差降低：30–70%。
- LLM 非确定性 → 样本量多预留 30–50%。

```figure
mx-sequential-test
```

## 使用

`code/main.py` 模拟带固定和序贯边界的序贯 A/B 测试，展示序贯方式如何提前停止。

## 交付

本课产出 `outputs/skill-ab-plan.md`。给定功能改变、工作负载和基线，它会选择平台、闸门和样本量。

## 练习

1. 运行 `code/main.py`。预期提升 5%、基线转化率 3% 时，要达到 80% 功效需要多少样本？
2. 为一个医疗监管、本地部署的客户选择 Statsig 或 GrowthBook。
3. 设计一个测试 GPT-4 对 GPT-3.5 的 A/B，目标是每张已解决工单成本。主要指标、护栏指标、次要指标分别是什么？
4. 你的金丝雀通过，但 A/B 显示转化率 -1.2%。应上线吗？写出升级处理标准。
5. 将 CUPED 应用于一个前期方差为后期 60% 的时段，计算有效样本量增益。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| Eval | “离线测试” | 对模型能力进行带标签集合评估 |
| A/B 测试 | “实验” | 对用户进行在线随机比较 |
| CUPED | “方差降低” | 使用前期回归降低方差 |
| 序贯测试 | “可以查看的测试” | 允许提前停止的始终有效程序 |
| 多重比较 | “家族错误” | 运行多个测试会提高假阳性 |
| Bonferroni | “严格校正” | 用测试数除以 α |
| Benjamini-Hochberg | “BH FDR” | 假发现率控制，较不保守 |
| SRM | “错误拆分” | 样本比例失配；分配 bug |
| Statsig | “OpenAI 所有” | 商业一体化，2025 年被收购 |
| GrowthBook | “OSS 那个” | MIT、仓库原生平台 |
| mSPRT | “序贯概率比测试” | 经典序贯程序 |

## 延伸阅读

- [GrowthBook — How to A/B Test AI](https://blog.growthbook.io/how-to-a-b-test-ai-a-practical-guide/)
- [Statsig — Beyond Prompts: Data-Driven LLM Optimization](https://www.statsig.com/blog/llm-optimization-online-experimentation)
- [Statsig vs GrowthBook comparison](https://www.statsig.com/perspectives/ab-testing-feature-flags-comparison-tools)
- [Deng et al. — CUPED](https://www.exp-platform.com/Documents/2013-02-CUPED-ImprovingSensitivityOfControlledExperiments.pdf)
- [Howard — Confidence Sequences](https://arxiv.org/abs/1810.08240)
