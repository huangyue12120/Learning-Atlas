---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 52938057ecc955bf7b5bb45f449a469de2edde2f8390cf64e207f5625d4fc126
status: reviewed
---

# 奖励建模与 RLHF

> 人类无法为“优秀的助手回答”手写奖励函数，却可以比较两个回答并选出更好的一个。用这些比较数据拟合奖励模型，再针对该模型对语言模型进行强化学习。Christiano，2017；InstructGPT，2022。这套配方把 GPT-3 变成了 ChatGPT。到 2026 年，DPO 正在取代其中的大部分流程，但它建立的思维模型仍然适用。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 05 课（情感分析）、Phase 9 第 08 课（PPO）  
**预计时间：** 约 45 分钟

## 问题

你已经用下一词元预测目标训练了语言模型。它能写出符合语法的英语，也会撒谎、啰嗦，并在该拒绝时不拒绝。增加预训练无法解决这些问题，因为问题来自网络文本，继续使用网络文本也不会成为解药。

你需要一个*标量奖励*，表达“对于指令 X，回答 A 比回答 B 更好”。这种奖励函数无法手写。“有帮助”不是关于词元的闭式表达式。但人类可以比较两个输出并标记偏好，而且可以低成本地大规模收集这类数据。

RLHF（Christiano 等，2017；Ouyang 等，2022）把偏好转化为奖励模型，再用 PPO 根据该奖励优化语言模型。它分为三个阶段：SFT → RM → PPO。ChatGPT、Claude、Gemini 以及 2023–2025 年间其他经过对齐的大语言模型都采用了这套配方。

到 2026 年，DPO（Phase 10 第 08 课）已经取代了大部分 PPO 阶段，因为它成本更低，在对齐微调上的效果几乎相同。不过，*奖励模型*仍支撑着每种 Best-of-N 采样器、每条从可验证奖励进行强化学习的流水线，以及每个使用过程奖励模型的推理模型。理解 RLHF，就能理解整个对齐技术栈。

## 概念

![RLHF 三阶段：SFT、基于成对偏好训练 RM、带 KL 惩罚的 PPO](../assets/rlhf.svg)

**阶段 1：监督微调（SFT）。** 从预训练基础模型开始，在人工编写的目标行为示范上微调，例如遵循指令的回答和有帮助的回复。得到模型 `π_SFT`，它*倾向于良好行为*，但动作空间仍然没有边界。

**阶段 2：训练奖励模型。**

- 针对提示 `x` 收集回答对 `(y_+, y_-)`，由人类标记“相比 y_-，更偏好 y_+”。
- 训练奖励模型 `R_φ(x, y)`，让它为 `y_+` 分配更高分数。
- 损失使用 **Bradley-Terry 成对逻辑回归**：

  `L(φ) = -E[ log σ(R_φ(x, y_+) - R_φ(x, y_-)) ]`

  σ 是 sigmoid。奖励差表示偏好的对数几率。BT 自 1952 年（Bradley-Terry）以来一直是标准方法，也是现代 RLHF 的主流选择。

- `R_φ` 通常从 SFT 模型初始化，并在顶部增加标量头。它使用同一个 Transformer 主干，由单个线性层输出奖励。

**阶段 3：针对 RM 运行带 KL 惩罚的 PPO。**

- 从 `π_SFT` 初始化可训练策略 `π_θ`。保留一个冻结的*参考策略* `π_ref = π_SFT`。
- 回答 `y` 结束时的奖励为：

  `r_total(x, y) = R_φ(x, y) - β · KL(π_θ(·|x) || π_ref(·|x))`

  KL 惩罚防止 `π_θ` 任意偏离 `π_SFT`。它是*正则项*，不是硬性信赖域。`β` 通常取 `0.01`–`0.05`。
- 使用该奖励运行 PPO（第 08 课）。优势在词元级轨迹上计算，但 RM 只对完整回答评分。

**为什么需要 KL？** 没有它，PPO 会主动寻找奖励投机策略，因为 RM 只在分布内补全上训练。某个分布外回答可能获得比所有人工回答都高的分数。KL 把 `π_θ` 约束在 RM 训练数据所在的流形附近。它是 RLHF 中最重要的一个旋钮。

**2026 年的现状：**

- **DPO**（Rafailov，2023）：通过闭式代数把阶段 2+3 压缩为偏好数据上的单个监督损失。不需要 RM，也不需要 PPO，只用一小部分计算量就能在对齐基准上达到相同质量。Phase 10 第 08 课会介绍它。
- **GRPO**（DeepSeek，2024–2025）：使用组相对基线而非 critic 的 PPO；奖励来自*验证器*（运行代码 / 数学答案匹配），而不是人工训练的 RM。它是推理模型的主流方法。Phase 9 第 12 课会介绍它。
- **过程奖励模型（PRM）：** 对部分解答（每个推理步骤）评分，用于面向推理的 RLHF 与 GRPO 变体。
- **Constitutional AI / RLAIF：** 使用经过对齐的大语言模型代替人类生成偏好，从而扩展偏好数据预算。

```figure
reward-model
```

## 动手构建

本课使用由字符串表示的小型合成“提示”和“回答”。RM 是基于词袋表示的线性评分器。我们不会使用真正的大语言模型，关键是理解流水线的*结构*，而不是规模。代码见 `code/main.py`。

### 第 1 步：合成偏好数据

```python
PROMPTS = ["help me", "answer me", "explain this"]
GOOD_WORDS = {"clear", "specific", "kind", "thorough"}
BAD_WORDS = {"vague", "rude", "wrong", "short"}

def make_pair(rng):
    x = rng.choice(PROMPTS)
    y_good = rng.choice(list(GOOD_WORDS)) + " " + rng.choice(list(GOOD_WORDS))
    y_bad = rng.choice(list(BAD_WORDS)) + " " + rng.choice(list(BAD_WORDS))
    return (x, y_good, y_bad)
```

在真实 RLHF 中，人工标注者会取代这段代码。数据结构 `(prompt, preferred_response, rejected_response)` 完全相同。

### 第 2 步：Bradley-Terry 奖励模型

线性分数为 `R(x, y) = w · bag(y)`。通过最小化 BT 成对对数损失进行训练：

```python
def rm_train_step(w, x, y_pos, y_neg, lr):
    r_pos = dot(w, bag(y_pos))
    r_neg = dot(w, bag(y_neg))
    p = sigmoid(r_pos - r_neg)
    for tok, cnt in bag(y_pos).items():
        w[tok] += lr * (1 - p) * cnt
    for tok, cnt in bag(y_neg).items():
        w[tok] -= lr * (1 - p) * cnt
```

几百次更新后，`w` 会为好词元分配正权重，为坏词元分配负权重。

### 第 3 步：基于 RM 的类 PPO 策略

我们的玩具策略从词表中生成一个词元。用 RM 为该词元评分，计算 `log π_θ(token | prompt)`，加入相对于参考策略的 KL 惩罚，再应用裁剪后的 PPO 代理目标。

```python
def rlhf_step(theta, ref, w, prompt, rng, eps=0.2, beta=0.1, lr=0.05):
    logits_theta = policy_logits(theta, prompt)
    probs = softmax(logits_theta)
    token = sample(probs, rng)
    logits_ref = policy_logits(ref, prompt)
    probs_ref = softmax(logits_ref)
    reward = dot(w, bag([token])) - beta * kl(probs, probs_ref)
    # ppo-style update on theta, treating reward as the return
    ...
```

### 第 4 步：监控 KL

每次更新都跟踪平均 `KL(π_θ || π_ref)`。如果它逐渐超过 `约 5-10`，策略已经偏离 `π_SFT` 太远，说明 `β` 过低或奖励投机已经开始。这是实际 RLHF 中最重要的诊断指标。

### 第 5 步：使用 TRL 的生产配方

理解玩具流水线后，可以看实际库用户编写的同一套循环。Hugging Face 的 [TRL](https://huggingface.co/docs/trl) 是参考实现：阶段 2 使用 `RewardTrainer`，阶段 3 使用内置相对参考策略 KL 的 `PPOTrainer`。

```python
# Stage 2: reward model from pairwise preferences
from trl import RewardTrainer, RewardConfig
from transformers import AutoModelForSequenceClassification, AutoTokenizer

tok = AutoTokenizer.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")
rm = AutoModelForSequenceClassification.from_pretrained(
    "meta-llama/Llama-3.1-8B-Instruct", num_labels=1
)

# dataset rows: {"prompt", "chosen", "rejected"} — Bradley-Terry format
trainer = RewardTrainer(
    model=rm,
    tokenizer=tok,
    train_dataset=preference_data,
    args=RewardConfig(output_dir="./rm", num_train_epochs=1, learning_rate=1e-5),
)
trainer.train()
```

```python
# Stage 3: PPO against the RM with KL penalty to the SFT reference
from trl import PPOTrainer, PPOConfig, AutoModelForCausalLMWithValueHead

policy = AutoModelForCausalLMWithValueHead.from_pretrained("./sft-checkpoint")
ref    = AutoModelForCausalLMWithValueHead.from_pretrained("./sft-checkpoint")  # frozen

ppo = PPOTrainer(
    config=PPOConfig(learning_rate=1.41e-5, batch_size=64, init_kl_coef=0.05,
                     target_kl=6.0, adap_kl_ctrl=True),
    model=policy, ref_model=ref, tokenizer=tok,
)

for batch in dataloader:
    responses = ppo.generate(batch["query_ids"], max_new_tokens=128)
    rewards   = rm(torch.cat([batch["query_ids"], responses], dim=-1)).logits[:, 0]
    stats     = ppo.step(batch["query_ids"], responses, rewards)
    # stats includes: mean_kl, clip_frac, value_loss — the three PPO diagnostics
```

这个库会替你完成三件事。`adap_kl_ctrl=True` 实现自适应 β 调度：观察到的 KL 超过 `target_kl` 时，β 加倍；低于一半时，β 减半。按照惯例，参考模型保持冻结，你不能让它意外地与 `policy` 共享参数。价值头位于与策略相同的主干上（`AutoModelForCausalLMWithValueHead` 会附加一个标量 MLP 头），因此 TRL 分别报告 `policy/kl` 与 `value/loss`。

## 常见问题

- **过度优化 / 奖励投机。** RM 并不完美；`π_θ` 会找到分数高但质量差的对抗性补全。症状是奖励无限上升，而人工评估分数趋于平稳或下降。解决方法是提前停止、提高 `β`、扩大 RM 训练数据的覆盖范围。
- **长度投机。** 在有帮助的回答上训练的 RM 往往会隐式奖励长度，策略因而学会填充回答。可以使用长度规范化奖励，或采用带长度感知 RM 的 RLAIF。
- **RM 太小。** RM 至少需要与策略一样大。小型 RM 无法忠实地为策略输出评分。
- **KL 调参。** β 太低会导致漂移与奖励投机，太高则让策略几乎不变。标准做法是使用*自适应* β，把每一步的 KL 控制在固定目标附近。
- **偏好数据噪声。** 约 30% 的人工标签存在噪声或歧义。可以只用标注者意见一致的数据训练 RM，或为 BT 引入温度进行校准。
- **离策略问题。** 第一轮之后，PPO 数据会略微偏离当前策略。按照第 08 课的方法监控裁剪比例。

## 使用方法

2026 年的 RLHF 分为多个层次：

| 层次 | 目标 | 方法 |
|------|------|------|
| 遵循指令、有帮助、无害 | 对齐 | 优先使用 DPO（Phase 10 第 08 课），而不是 RLHF-PPO。 |
| 推理正确性（数学、代码） | 能力 | 使用验证器奖励的 GRPO（Phase 9 第 12 课）。 |
| 长视野多步任务 | 智能体能力 | PPO / GRPO，并使用针对各步骤的过程奖励模型。 |
| 安全 / 拒绝行为 | 安全 | 使用独立安全 RM 的 RLHF-PPO，或 Constitutional AI。 |
| 推理时 Best-of-N | 快速对齐 | 解码时使用 RM，不需要训练策略。 |
| 奖励蒸馏 | 推理计算 | 在冻结的语言模型上训练小型“奖励头”。 |

RLHF 是 2022–2024 年的*主流*方法。到 2026 年，生产对齐流水线会优先使用 DPO，仅在 RM 密集或安全关键步骤中使用 PPO。

## 交付成果

保存为 `outputs/skill-rlhf-architect.md`：

```markdown
---
name: rlhf-architect
description: 为语言模型设计 RLHF / DPO / GRPO 对齐流水线，包括 RM、KL 和数据策略。
version: 1.0.0
phase: 9
lesson: 9
tags: [rl, rlhf, alignment, llm]
---

给定一个基础语言模型、目标行为（对齐 / 推理 / 拒绝 / 智能体）以及偏好或验证器预算，输出：

1. 阶段。SFT？RM？DPO？GRPO？说明理由。
2. 偏好或验证器来源。人类、AI 反馈、规则、单元测试通过情况或奖励蒸馏。
3. KL 策略。固定 β、自适应 β 或 DPO（隐式 KL）。
4. 诊断。平均 KL、奖励稳定性和防过度优化措施（留出人工评估）。
5. 安全门控。红队测试集、拒绝率，以及独立于有帮助程度 RM 的安全 RM。

没有 KL 监控时，拒绝交付 RLHF-PPO。拒绝使用小于目标策略的 RM。拒绝只按长度给出奖励。如果流水线没有保留盲测人工评估集，将其标记为缺少过度优化保护。
```

## 练习

1. **简单。** 在 500 个合成偏好对上训练 `code/main.py` 中的 Bradley-Terry 奖励模型。测量留出的 100 个偏好对上的成对准确率，结果应超过 90%。
2. **中等。** 用 `β ∈ {0.0, 0.1, 1.0}` 运行玩具 PPO-RLHF 循环。针对每个取值，绘制 RM 分数和相对参考策略 KL 随更新的变化。哪些运行发生了奖励投机？
3. **困难。** 在同一批偏好数据上实现 DPO（闭式偏好似然损失），比较它与 RLHF-PPO 流水线的计算用量和最终达到的 RM 分数。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| RLHF | “对齐强化学习” | 三阶段 SFT + RM + PPO 流水线（Christiano，2017；Ouyang，2022）。 |
| 奖励模型（RM） | “评分网络” | 通过 Bradley-Terry 在成对偏好上拟合的标量函数。 |
| Bradley-Terry | “成对逻辑损失” | `P(y_+ ≻ y_-) = σ(R(y_+) - R(y_-))`；标准 RM 目标。 |
| KL 惩罚 | “留在参考策略附近” | 奖励中的 `β · KL(π_θ \|\| π_ref)`；防止奖励投机的正则项。 |
| 奖励投机 | “Goodhart 定律” | 策略利用 RM 缺陷；症状是奖励上升、人工评估持平。 |
| RLAIF | “AI 标注的偏好” | 标签由另一个语言模型而非人类给出的 RLHF。 |
| PRM | “过程奖励模型” | 为部分推理步骤评分；用于推理流水线。 |
| Constitutional AI | “Anthropic 的方法” | 由明确规则引导、通过 AI 生成偏好。 |

## 延伸阅读

- [Christiano 等（2017），《Deep Reinforcement Learning from Human Preferences》](https://arxiv.org/abs/1706.03741)——开启 RLHF 研究的论文。
- [Ouyang 等（2022），《InstructGPT—Training language models to follow instructions with human feedback》](https://arxiv.org/abs/2203.02155)——ChatGPT 背后的配方。
- [Stiennon 等（2020），《Learning to summarize with human feedback》](https://arxiv.org/abs/2009.01325)——较早用于摘要的 RLHF。
- [Rafailov 等（2023），《Direct Preference Optimization》](https://arxiv.org/abs/2305.18290)——DPO，2026 年取代 RLHF 的默认方法。
- [Bai 等（2022），《Constitutional AI: Harmlessness from AI Feedback》](https://arxiv.org/abs/2212.08073)——RLAIF 与自我批评循环。
- [Anthropic RLHF 论文（Bai 等，2022），《Training a Helpful and Harmless Assistant》](https://arxiv.org/abs/2204.05862)——HH 论文。
- [Hugging Face TRL 库](https://huggingface.co/docs/trl)——生产级 `RewardTrainer` 与 `PPOTrainer`。阅读训练器源码，了解自适应 KL 和价值头的实现细节。
- [Hugging Face——《Illustrating Reinforcement Learning from Human Feedback》](https://huggingface.co/blog/rlhf)，作者 Lambert、Castricato、von Werra、Havrilla——带图讲解三阶段流水线的经典教程。
- [von Werra 等（2020），《TRL: Transformer Reinforcement Learning》](https://github.com/huggingface/trl)——TRL 库；`examples/` 提供面向 Llama、Mistral 和 Qwen 的端到端 RLHF 脚本。
- [Sutton 与 Barto（2018），第 17.4 节——设计奖励信号](http://incompleteideas.net/book/RLbook2020.pdf)——奖励假设视角，是理解奖励投机的必要基础。
