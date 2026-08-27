---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/18-ethics-safety-alignment/12-red-teaming-pair-automated-attacks/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 24dbc68c56b3c9903ecfd86f7237b014e57811bdf00ee62305650b87930ec7ba
status: reviewed
---

# 红队测试：PAIR 与自动化攻击

> Chao、Robey、Dobriban、Hassani、Pappas、Wong（NeurIPS 2023，arXiv:2310.08419）。PAIR，即 Prompt Automatic Iterative Refinement，是经典的自动化黑盒越狱方法。带有红队系统提示词的攻击者 LLM 为目标 LLM 迭代提出越狱提示词，并将尝试和响应累积在自己的聊天历史中，作为上下文反馈。PAIR 通常在 20 次查询内成功，比 GCG（Zou 等人的 token 级梯度搜索）高效几个数量级，而且不需要白盒访问。如今，PAIR 已成为 JailbreakBench（arXiv:2404.01318）和 HarmBench 的标准基线，与 GCG、AutoDAN、TAP、Persuasive Adversarial Prompt 并列。

**类型：** 构建
**语言：** Python（标准库，针对玩具目标的模拟 PAIR 循环）
**前置要求：** 第 18 阶段 · 01（指令遵循）、第 14 阶段（智能体工程）
**用时：** 约 75 分钟

## 学习目标

- 描述 PAIR 算法：攻击者系统提示词、迭代细化和上下文反馈。
- 解释目标为黑盒时，PAIR 为何严格比 GCG 高效。
- 说出另外四种自动化攻击基线，即 GCG、AutoDAN、TAP、PAP，并分别指出一项区分特征。
- 描述 JailbreakBench 和 HarmBench 的评估协议，以及各自语境中“攻击成功率”的含义。

## 问题

过去，红队测试是一项手工工作。少量专家测试者构造对抗提示词，记录哪些提示词有效。这种方式无法规模化：攻击成功率需要统计样本，而每次模型发布都会让目标发生变化。PAIR 将红队测试转化为一个针对黑盒目标的优化问题。

## 概念

### PAIR 算法

输入：

- 目标 LLM T，即被攻击的模型。
- 裁判 LLM J，即判断响应是否越狱的评分器。
- 攻击者 LLM A，即红队优化器。
- 目标字符串 G：“回复 [有害指令]。”
- 预算 K，通常为 20 次查询。

当 k 从 1 到 K 循环：

1. 用目标 G 以及目前已有的（提示词、响应）历史提示 A。
2. A 输出新提示词 p_k。
3. 将 p_k 提交给 T，收到响应 r_k。
4. J 根据目标为（p_k、r_k）评分。
5. 若分数 ≥ 阈值，则停止，找到越狱。
6. 否则，将（p_k、r_k）追加到 A 的历史并继续。

实证结果（NeurIPS 2023）：针对 GPT-3.5-turbo 和 Llama-2-7B-chat，攻击成功率超过 50%，成功平均查询次数约为 10–20。

### PAIR 为何高效

GCG（Zou 等，2023）通过梯度在对抗 token 后缀上搜索，需要白盒模型访问，并生成不可读的后缀。PAIR 是黑盒方法，生成自然语言攻击，还能跨模型迁移。PAIR 的上下文反馈让攻击者从每次拒绝中学习；GCG 没有等价机制，每次 token 更新都必须重新发现此前的进展。

### 相关自动化攻击

- **GCG（Zou 等，2023，arXiv:2307.15043）。** 针对对抗后缀的 token 级梯度搜索，白盒、可迁移，生成不可读字符串。
- **AutoDAN（Liu 等，2023）。** 在提示词上做进化搜索，由层级目标引导。
- **TAP（Mehrotra 等，2024）。** 带剪枝的攻击树，会对多个 PAIR 风格的展开分支。
- **PAP（Zeng 等，2024）。** Persuasive Adversarial Prompts，把人类说服技巧编码为提示词模板。

### JailbreakBench 与 HarmBench

两者都在 2024 年将评估标准化：

- JailbreakBench（arXiv:2404.01318）：10 个 OpenAI 政策类别中的 100 种有害行为。攻击成功率（ASR）是主要指标，需要裁判（GPT-4-turbo、Llama Guard 或 StrongREJECT）。
- HarmBench（Mazeika 等，2024）：7 个类别中的 510 种行为，包含语义伤害和功能伤害测试，比较 18 种攻击与 33 个模型。

ASR 通常在固定查询预算下报告。比较攻击方法必须匹配预算；200 次查询达到 90% ASR，与 20 次查询达到 85% ASR 不可直接比较。

### 这对 2026 年部署为何重要

现在每个前沿实验室都会在发布前对生产模型运行 PAIR 和 TAP。ASR 轨迹会出现在模型卡（第 26 课）和安全论证附录（第 18 课）中。攻击并不奇特，而是标准基础设施。

### 它在第 18 阶段主线中的位置

第 12 课是自动化攻击基础；第 13 课（多样本越狱）利用长度；第 14 课（ASCII 艺术 / 视觉）是编码攻击；第 15 课（间接提示词注入）是 2026 年生产攻击面；第 16 课讨论防御工具对应项，即 Llama Guard、Garak、PyRIT。

```figure
al-pair-loop
```

## 使用

`code/main.py` 构建一个玩具 PAIR 循环。目标是一个会拒绝“明显”有害提示词的模拟分类器，即关键词过滤器。攻击者是基于规则的细化器，尝试释义、角色扮演框架和编码。裁判为响应评分。你会看到攻击者在约 5–15 次迭代中攻破关键词过滤器，却无法攻破语义过滤器。

## 交付

本课产出 `outputs/skill-attack-audit.md`。给定一份红队评估报告，它会审查：运行了哪些攻击（PAIR、GCG、TAP、AutoDAN、PAP），每种攻击使用什么预算和裁判，针对哪套有害行为集合（JailbreakBench、HarmBench、内部集合）。

## 练习

1. 运行 `code/main.py`。测量三个内置攻击策略的成功平均查询次数。解释每种策略利用了目标防御的哪项假设。

2. 实现第四种攻击策略，例如翻译成另一种语言或使用 base64 编码。报告它针对关键词过滤目标和语义过滤目标的成功平均查询次数。

3. 阅读 Chao 等人 2023 年图 5，即 PAIR 与 GCG 的比较。描述两种尽管 PAIR 更高效仍会偏好 GCG 的情景。

4. JailbreakBench 针对固定目标集报告 ASR。设计一个衡量攻击多样性的附加指标，例如成功提示词的方差，并解释多样性为何对防御评估重要。

5. TAP（Mehrotra 2024）通过分支加剪枝扩展 PAIR。为 `code/main.py` 勾勒 TAP 风格扩展，并描述计算成本与成功率之间的权衡。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|------------|----------|
| PAIR | “自动化越狱” | Prompt Automatic Iterative Refinement，攻击者 LLM 加裁判 LLM 的循环 |
| GCG | “梯度越狱” | 针对对抗后缀的白盒 token 级梯度搜索 |
| 攻击成功率（ASR） | “k 次查询中的越狱百分比” | 主要指标，必须同时报告查询预算和裁判身份 |
| 裁判 LLM | “评分器” | 判断响应是否满足有害目标的 LLM |
| JailbreakBench | “评估集” | 带类别标签的标准化有害行为集合 |
| HarmBench | “更广的基准” | 510 种行为，功能伤害加语义伤害测试 |
| TAP | “攻击树” | 带分支和剪枝的 PAIR，在更高计算成本下取得更高 ASR |

## 延伸阅读

- [Chao et al. — Jailbreaking Black Box LLMs in Twenty Queries (arXiv:2310.08419)](https://arxiv.org/abs/2310.08419) — NeurIPS 2023 的 PAIR 论文
- [Zou et al. — Universal and Transferable Adversarial Attacks on Aligned LLMs (arXiv:2307.15043)](https://arxiv.org/abs/2307.15043) — GCG 论文
- [Chao et al. — JailbreakBench (arXiv:2404.01318)](https://arxiv.org/abs/2404.01318) — 标准化评估
- [Mazeika et al. — HarmBench (ICML 2024)](https://arxiv.org/abs/2402.04249) — 更广泛的评估
