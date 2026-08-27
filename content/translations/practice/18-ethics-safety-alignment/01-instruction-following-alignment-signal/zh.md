---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/18-ethics-safety-alignment/01-instruction-following-alignment-signal/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: b44320de740d56cf3ef7e2a639064e74d75f3f3e9186098b04f11edc5ee39173
status: reviewed
---

# 将指令遵循视为对齐信号

> 后续所有对 RLHF 的批评都指向这条流水线。学习优化压力如何扭曲代理信号之前，你必须先看清这个代理。InstructGPT（Ouyang 等，2022）定义了参考架构：在指令-回答对上做监督微调，使用成对偏好排序训练奖励模型，再针对奖励模型执行 PPO，并以 SFT 策略的 KL 惩罚约束更新。1.3B 参数的 InstructGPT 比 175B 的 GPT-3 更受偏好。这一结果解释了为什么到了 2026 年，每个前沿实验室仍在交付 RLHF 形态的后训练流水线。

**类型：** 学习
**语言：** Python（标准库，玩具三阶段流水线）
**前置要求：** 第 10 阶段 · 06（SFT）、第 10 阶段 · 07（RLHF）、第 10 阶段 · 08（DPO）
**用时：** 约 45 分钟

## 学习目标

- 说出 InstructGPT 流水线的三个阶段及各阶段使用的损失。
- 解释为什么 1.3B 的指令微调模型能在人类偏好评估中胜过原始 175B GPT-3。
- 说明第 3 阶段的 KL 惩罚在防护什么，以及移除它为何会坍缩为寻模行为。
- 描述对齐税（alignment tax）及 Ouyang 等人用来缓解它的 PPO-ptx。

## 问题

预训练语言模型擅长续写文本，并不天然会回答问题。让 GPT-3“写一个反转列表的 Python 函数”时，它常会返回另一段提示词，因为训练分布的大部分是会继续延展的网页文本。模型完成了训练目标，问题在于目标不对。

所有严肃实验室用来修正这一点的代理是人类偏好。两段补全交给标注者，标注者选出较好的一段，奖励模型学习标注者的判断。随后，强化学习循环把策略推向奖励模型给出高分的输出。三句话概括了 InstructGPT 的论点，其余内容都是工程实现。

## 概念

### 阶段 1：监督微调（SFT）

收集提示词-回答对，回答应当是认真遵循指令的人会写出的内容。Ouyang 等人使用了来自标注者和 OpenAI API 的 13k 条提示词，并以标准交叉熵损失在这些数据上微调基础模型。

SFT 带来的改变是模型开始回答问题，而非继续补全问题。它没有提供的信号是：当多种回答都合理时，标注者更喜欢哪一种。

### 阶段 2：奖励模型（RM）

对每个提示词，从 SFT 模型采样 K 个补全，由标注者排序。训练一个奖励模型，为任意提示词-回答对评分；对于标注者偏好 `y_w` 而非 `y_l` 的一对样本：

```
L_RM = -log sigmoid(r(x, y_w) - r(x, y_l))
```

这里使用 Bradley-Terry 成对偏好损失。RM 通常以 SFT 模型初始化，再将 LM head 替换为标量 head。

奖励模型可以很小：对 175B InstructGPT 而言，6B 已经足够。它们也很脆弱，论文第 5 节的大部分内容都在讨论小规模训练中出现的奖励黑客行为。

### 阶段 3：带 KL 惩罚的 PPO

定义目标：

```
J(pi) = E_{x~D, y~pi(.|x)} [ r(x, y) ] - beta * KL(pi(.|x) || pi_SFT(.|x))
```

用 PPO 最大化该目标。KL 项让 `pi` 不会偏离 SFT 策略太远。没有它，优化器会找到对抗性样本：这些字符串在 RM 下得高分，是因为 RM 从未见过它们，并非因为人类真的更喜欢它们。

KL 系数 `beta` 是 RLHF 最重要的超参数。太低会导致奖励黑客；太高则不会比 SFT 有明显改进。

### 对齐税

经过 RLHF 后，模型更受人类偏好，却会在标准基准（SQuAD、HellaSwag、DROP）上退步。Ouyang 等人将此称为对齐税，并使用 PPO-ptx 修复：将预训练梯度混入 RL 目标，使模型不会遗忘那些从未得到奖励的下游任务。

```
J_ptx(pi) = J(pi) + gamma * E_{x~D_pretrain} [ log pi(x) ]
```

PPO-ptx 已成为标准做法。Anthropic、DeepMind 和 Meta 都使用其某种变体。

### 结果

带有 SFT、RM 和 PPO-ptx 的 1.3B InstructGPT，在约 70% 的情况下比 175B 基础 GPT-3 更受标注者偏好。在来自生产流量的隐藏测试提示词上，差距更大。这个数字说明两件事：

1. 对齐和能力是不同的维度。175B 模型的能力更强；1.3B 模型的对齐更好；标注者偏好经过对齐的模型。
2. 能力下限由基础模型设定。你不能靠 RLHF 让基础模型掌握它从未见过的事实。

### 为什么它是第 18 阶段的参照点

后续课程的每一项批评，包括奖励黑客（第 2 课）、DPO（第 3 课）、谄媚（第 4 课）、CAI（第 5 课）、休眠智能体（第 7 课）和对齐伪装（第 9 课），都在质疑这条流水线的一部分。奖励黑客攻击第 2 阶段；DPO 将第 2、3 阶段合并；CAI 替换人类标注者；谄媚说明标注者是有偏的信号；对齐伪装则说明策略可以完全绕开第 3 阶段。没有先把这条流水线记在脑中，你就无法理解这些批评。

```figure
al-instruct-pipeline
```

## 使用

`code/main.py` 用玩具偏好数据模拟三个阶段。基础“策略”是在动作 {A, B, C} 上带偏差的硬币：阶段 1 的 SFT 在 200 个提示词上模仿标注者动作；阶段 2 从 500 个成对排序中拟合 Bradley-Terry 奖励模型；阶段 3 以 SFT 策略为锚，执行带 KL 惩罚的简化 PPO 更新。你可以观察奖励上升、KL 散度增大、策略漂移，也可以关闭 KL 项，在 50 次更新内看到奖励黑客出现。

请关注：

- `beta = 0.1` 与 `beta = 0.0` 下的奖励轨迹。
- 训练步数上的 KL(pi || pi_SFT)。
- 最终动作分布与标注者偏好的比较。

## 交付

本课产出 `outputs/skill-instructgpt-explainer.md`。给定一条 RLHF 流水线描述或论文摘要，它会识别修改了三个阶段中的哪一个、每个阶段使用的损失，以及是否存在 KL 惩罚或等价正则项。

## 练习

1. 运行 `code/main.py`。将 `beta = 0.0`，报告 200 个 PPO 步骤后的动作分布，并用一段话解释寻模行为。

2. 将奖励模型修改为对动作 B 有 +0.5 偏差，模拟奖励 bug。以 `beta = 0.1` 运行 PPO。KL 惩罚能否阻止策略利用这一偏差？在什么 `beta` 下利用开始显现？

3. 阅读 Ouyang 等人（arXiv:2203.02155）的图 1。分别运行 1、5、20、100 个 PPO 步骤，并测量相对 SFT 模型的偏好，以复现标注者偏好曲线。

4. 论文第 4.3 节报告 1.3B InstructGPT 在约 70% 的情况下胜过 175B GPT-3。为什么这个比例在隐藏的生产提示词上会高于标注者自己的提示词？

5. 在同一偏好数据上，将 PPO 损失替换为 DPO（第 10 阶段 · 08）。比较最终策略漂移（相对 SFT 的 KL）与最终奖励。在奖励匹配时，哪种方法漂移得更远？

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|------------|----------|
| SFT | “指令微调” | 阶段 1：在提示词-回答对上以交叉熵微调 |
| 奖励模型 | “RM” | 对（提示词、回答）进行标量回归，使用 Bradley-Terry 在成对标签上训练 |
| Bradley-Terry | “成对偏好损失” | -log sigmoid(r_w - r_l)；将成对排序化为二元分类 |
| KL 惩罚 | “正则项” | `beta * KL(pi \|\| pi_SFT)`，让 RL 策略靠近 SFT 锚点 |
| PPO-ptx | “混合预训练的 PPO” | 在 PPO 目标中加入一部分预训练对数似然，以抵消对齐税 |
| 对齐税 | “RLHF 回归” | RLHF 后，在 RLHF 未瞄准的标准基准上下降 |
| 标注者偏好 | “真实值” | 人类排序的样本；RM 是它的统计代理，并非“人类价值观”的代理 |

## 延伸阅读

- [Ouyang et al. — Training language models to follow instructions with human feedback (arXiv:2203.02155)](https://arxiv.org/abs/2203.02155) — InstructGPT 论文，后续所有 RLHF 流水线的基础
- [Stiennon et al. — Learning to summarize from human feedback (arXiv:2009.01325)](https://arxiv.org/abs/2009.01325) — RLHF 用于摘要的前身
- [Christiano et al. — Deep reinforcement learning from human preferences (arXiv:1706.03741)](https://arxiv.org/abs/1706.03741) — 最初的基于偏好的 RL 公式
- [Bai et al. — Training a Helpful and Harmless Assistant with RLHF (arXiv:2204.05862)](https://arxiv.org/abs/2204.05862) — Anthropic 对 InstructGPT 流水线的 HH 扩展
