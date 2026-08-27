---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: b081d3ff98e2096b63994d4e43ae025601085616183954e99751f4c3cb2bb6c7
status: reviewed
---

# 直接偏好优化家族

> Rafailov 等人（2023）证明，RLHF 的最优解可由偏好数据写成闭式形式，因此可以跳过显式奖励模型，直接优化策略。这一洞见催生了一个家族：IPO、KTO、SimPO、ORPO、BPO，各自针对 DPO 的一种失效模式。在 2026 年，直接对齐算法用于的前沿后训练运行次数已超过 PPO。不过第 2 课的过度优化曲线仍然成立：直接对齐算法并未逃离古德哈特，只是改变了问题出现的位置。

**类型：** 学习
**语言：** Python（标准库，六种偏好损失比较器）
**前置要求：** 第 18 阶段 · 01（InstructGPT）、第 18 阶段 · 02（奖励黑客）、第 10 阶段 · 08（DPO 基础）
**用时：** 约 75 分钟

## 学习目标

- 从带 KL 的 RLHF 最优解推导 DPO 的闭式形式。
- 说明 IPO、KTO、SimPO、ORPO、BPO 分别修复 DPO 的哪种失效模式。
- 区分“隐式奖励间隔”与“偏好强度”，并解释 IPO 的恒等映射为何重要。
- 解释为什么 Rafailov 等人（NeurIPS 2024）证明 DAA 即使没有显式 RM 仍会过度优化。

## 问题

RLHF 目标（第 1 课）：

```
max_pi E_{x,y~pi} [ r(x, y) ] - beta * KL(pi || pi_ref)
```

具有已知最优解：

```
pi*(y|x) = (1/Z(x)) * pi_ref(y|x) * exp(r(x, y) / beta)
```

因此，奖励由最优策略与参考策略的比值隐式定义：

```
r(x, y) = beta * log(pi*(y|x) / pi_ref(y|x)) + beta * log Z(x)
```

将它代入 Bradley-Terry 偏好似然。配分函数 `Z(x)` 只依赖 `x`，因此会抵消。剩下的损失只含策略参数，不需要奖励模型；这套目标称为 DPO。

这里有一个问题：推导假设最优解可达、偏好数据位于分布内、参考策略是真正的模式锚点。这些假设没有一个能完全成立。家族中的每个成员都在修复一个被违反的假设。

## 概念

### DPO（Rafailov 等，2023）

```
L_DPO = -log sigmoid(
  beta * log(pi(y_w | x) / pi_ref(y_w | x))
  - beta * log(pi(y_l | x) / pi_ref(y_l | x))
)
```

可能出现的问题：

- 隐式奖励间隔 `beta * (log(pi/pi_ref)_w - log(pi/pi_ref)_l)` 无界。很弱的偏好也能产生任意大的间隔。
- 损失会把被选和被拒回答的对数概率推向相反方向。只要被拒回答降得更快，它也可以把被选回答的绝对对数概率压低，这种现象称为被选回答退化（Degraded Chosen Response）。
- 分布外偏好，例如罕见回答与罕见回答之间的一对比较，会产生任意的隐式奖励。

### IPO（Azar 等，2024）

恒等偏好优化（Identity Preference Optimization）将对偏好概率的 log-sigmoid 替换为恒等映射。损失变成有界目标上的平方误差：

```
L_IPO = (log(pi(y_w | x) / pi_ref(y_w | x)) - log(pi(y_l | x) / pi_ref(y_l | x)) - 1/(2 beta))^2
```

间隔由 `1/(2 beta)` 限定。偏好强度和隐式奖励间隔成正比，不会爆炸。

### KTO（Ethayarajh 等，2024）

Kahneman-Tversky Optimization 完全放弃成对结构。给定一条带标签的输出和二元“理想”或“不理想”信号，它将其映射为前景理论效用：

```
v(x, y) = sigma(beta * log(pi(y|x) / pi_ref(y|x)) - z_ref)
```

它对收益和损失采用不同权重，也就是损失厌恶。优势是可以使用不成对数据，而这种数据多得多。

### SimPO（Meng 等，2024）

简单偏好优化（Simple Preference Optimization）让训练信号与生成保持一致。它移除参考策略，并以长度归一化对数似然：

```
L_SimPO = -log sigmoid(
  (beta / |y_w|) * log pi(y_w | x)
  - (beta / |y_l|) * log pi(y_l | x)
  - gamma
)
```

其中的间隔 `gamma` 用于稳定训练。长度归一化消除了利用 DPO 长度偏差的动机：按构造，更长的 `y_w` 会给出更大的对数概率间隔。

### ORPO（Hong 等，2024）

赔率比偏好优化（Odds-Ratio Preference Optimization）在标准 SFT 负对数似然中加入偏好项：

```
L_ORPO = L_NLL(y_w) + lambda * L_OR
L_OR = -log sigmoid(log(odds(y_w) / odds(y_l)))
```

它不需要参考策略，SFT 项就是正则项。可在单阶段内从基础模型训练到对齐模型，不需要单独的 SFT checkpoint。

### BPO（ICLR 2026 投稿，OpenReview id=b97EwMUWu7）

BPO 识别出被选回答退化问题：DPO 保持排序 `y_w > y_l`，但 `y_w` 的绝对对数概率仍可能下降。BPO 加入一行修正，惩罚被选回答向下移动。据报告，它相对 DPO 在 Llama-3.1-8B-Instruct 的数学推理上提升了 10.1% 准确率。

### 普适结论：DAA 仍会过度优化

Rafailov 等人的《Scaling Laws for Reward Model Overoptimization in Direct Alignment Algorithms》（NeurIPS 2024）在多个数据集、多个 KL 预算上，使用 DPO、IPO、SLiC 训练策略。金标准奖励相对 KL 的曲线与 Gao 等人的先到峰后坍缩形状相同。隐式奖励会在训练时查询分布外样本，KL 正则化无法使其稳定。

DAA 没有逃离古德哈特。它们将受冲击的表面从“过度优化奖励模型”换为“过度优化参考策略比值”。通用修复方式，包括更好的数据、集成和早停，对两者同样适用。

### 如何在 2026 年选择

- 拥有大量成对偏好数据时，使用保守 `beta` 的 DPO；若长度偏差明显，使用 SimPO。
- 拥有不成对二元反馈时，使用 KTO。
- 想从基础模型完成单阶段流水线时，使用 ORPO。
- 在 DPO 日志中看到被选回答对数概率退化时，使用 BPO。
- 偏好强度变化很大且 DPO 已饱和时，使用 IPO。

每个实验室都应在一组基准上运行全部五种方法，并按任务选择胜者。数学推理和安全任务的最优方法没有理由相同。

```figure
dpo-margin
```

## 使用

`code/main.py` 在一个玩具偏好数据集上比较六种损失，即 DPO、IPO、KTO、SimPO、ORPO、BPO；数据集中的真实偏好强度会随样本对而变化。每种损失都在相同的 500 对样本上，以小型 softmax 策略优化。程序绘制每种方法的最终胜率、被选回答对数概率漂移和隐式奖励跨度。

## 交付

本课产出 `outputs/skill-preference-loss-selector.md`。给定数据集统计信息，包括成对或不成对、偏好强度是否变化、长度分布，以及目标是单阶段还是先 SFT 后偏好训练，它会推荐一种偏好损失，并报告其防护的失效模式。

## 练习

1. 运行 `code/main.py`。报告 DPO 与 BPO 最终被选回答对数概率的下降量。BPO 应保留更高的被选回答绝对概率，请验证这一点。

2. 修改偏好数据，使全部样本对具有相同强度。六种方法中哪一种最稳健？哪一种退化？解释 IPO 在此的优势。

3. 使被拒回答的平均长度是被选回答的 2 倍。不要改变其他设置，数值展示 DPO 对长度的利用以及 SimPO 的修复。

4. Rafailov 等人（NeurIPS 2024）声称 DAA 会过度优化。复现一个单点版本：绘制被选减被拒的 KL 散度，并观察 DPO 在较大 `beta` 下的过度优化。

5. 阅读 BPO 论文摘要（OpenReview b97EwMUWu7）。写下 BPO 对 DPO 加入的那一行修正，并用 `code/main.py` 中的实现确认。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|------------|----------|
| DPO | “没有奖励模型的 RLHF” | 从闭式 RLHF 最优解导出的损失，只含策略参数 |
| 隐式奖励 | “对数比” | `beta * log(pi(y\|x) / pi_ref(y\|x))`，DPO 隐含的奖励 |
| IPO | “有界 DPO” | 用恒等映射替换 log-sigmoid；隐式奖励间隔上限为 `1/(2 beta)` |
| KTO | “不成对的 DPO” | 在单条标签上使用具有损失厌恶的前景理论效用 |
| SimPO | “无参考策略的 DPO” | 长度归一化对数似然加间隔；不需要参考策略 |
| ORPO | “单阶段 DPO” | NLL 加赔率比偏好项；一次训练即可从基础模型完成 |
| BPO | “保留被选回答的 DPO” | DPO 加上惩罚，防止被选回答绝对对数概率下降 |
| 被选回答退化 | “被选项变差” | 只要被拒项下降更快，DPO 就会降低被选项的对数概率 |
| DAA | “直接对齐算法” | 跳过显式 RM 的任意偏好损失方法 |

## 延伸阅读

- [Rafailov et al. — Direct Preference Optimization (NeurIPS 2023, arXiv:2305.18290)](https://arxiv.org/abs/2305.18290)
- [Azar et al. — A General Theoretical Paradigm to Understand Learning from Human Preferences (AISTATS 2024, arXiv:2310.12036)](https://arxiv.org/abs/2310.12036) — IPO
- [Ethayarajh et al. — KTO: Model Alignment as Prospect Theoretic Optimization (arXiv:2402.01306)](https://arxiv.org/abs/2402.01306)
- [Meng, Xia, Chen — SimPO (NeurIPS 2024, arXiv:2405.14734)](https://arxiv.org/abs/2405.14734)
- [Hong, Lee, Thorne — ORPO (EMNLP 2024, arXiv:2403.07691)](https://arxiv.org/abs/2403.07691)
- [BPO — Behavior Preservation Optimization (ICLR 2026 OpenReview b97EwMUWu7)](https://openreview.net/forum?id=b97EwMUWu7)
- [Rafailov et al. — Scaling Laws for RM Overoptimization in DAAs (NeurIPS 2024, arXiv:2406.02900)](https://arxiv.org/abs/2406.02900)
