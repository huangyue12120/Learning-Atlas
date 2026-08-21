---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/09-reinforcement-learning/08-ppo/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 73a716e026da377584800f445b20d711310c81d4513df6f8f161b4afc62083e1
status: reviewed
---

# 近端策略优化（PPO）

> A2C 每次更新后都会丢弃展开。PPO 用裁剪后的重要性比率包装策略梯度，使同一批数据可以训练 10 轮以上，而不会让策略爆炸。Schulman 等（2017）提出了它。到 2026 年，它仍是默认的策略梯度算法。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 9 第 06 课（REINFORCE）、Phase 9 第 07 课（Actor-Critic）  
**预计时间：** 约 75 分钟

## 问题

A2C（第 07 课）是同策略方法：梯度 `E_{π_θ}[A · ∇ log π_θ]` 要求数据从*当前* `π_θ` 采样。执行一次更新后，`π_θ` 就会改变，刚才使用的数据也随即变成离策略数据。再次使用它会使梯度产生偏差。

展开的代价很高。在 Atari 上，8 个环境 × 128 步的一次展开包含 1024 条转移，需要十几秒的环境运行时间。只执行一个梯度步骤就丢弃这些数据很浪费。

信赖域策略优化（TRPO，Schulman，2015）最先解决了这个问题：限制每次更新，使新旧策略之间的 KL 散度低于 `δ`。它的理论很简洁，但每次更新都要求解一次共轭梯度。2026 年已经没人运行 TRPO。

PPO（Schulman 等，2017）用简单的裁剪目标替代硬性的信赖域约束。只多一行代码，每次展开可以训练十轮，不需要共轭梯度，并提供足够好的理论保证。九年后，从 MuJoCo 到 RLHF，PPO 仍是默认的策略梯度算法。

## 概念

![PPO 裁剪代理目标：在 1 ± ε 处裁剪比率](../assets/ppo.svg)

**重要性比率。**

`r_t(θ) = π_θ(a_t | s_t) / π_{θ_old}(a_t | s_t)`

它是新策略与采集数据的策略之间的似然比。`r_t = 1` 表示没有变化；`r_t = 2` 表示新策略采取 `a_t` 的概率是旧策略的两倍。

**裁剪代理目标。**

`L^{CLIP}(θ) = E_t [ min( r_t(θ) A_t, clip(r_t(θ), 1-ε, 1+ε) A_t ) ]`

它包含两项：

- 如果优势 `A_t > 0`，且比率试图超过 `1 + ε`，裁剪会把梯度变平：不要把好动作的概率推到比旧概率高出 `+ε` 以上。
- 如果优势 `A_t < 0`，且比率试图越过 `1 - ε`（也就是相对于裁剪后的降低幅度，我们会让坏动作更可能出现），裁剪会限制梯度：不要把坏动作推到 `-ε` 以下。

`min` 会处理另一个方向：如果比率朝*有利*方向移动，你仍会得到梯度（不会在会造成损害的那一侧裁剪）。

典型值是 `ε = 0.2`。以 `r_t` 为横轴绘制目标函数，可以得到一条分段线性曲线：“好的一侧”有平坦的顶部，“坏的一侧”有平坦的底部。

**完整 PPO 损失。**

`L(θ, φ) = L^{CLIP}(θ) - c_v · (V_φ(s_t) - V_t^{target})² + c_e · H(π_θ(·|s_t))`

它与 A2C 使用相同的 Actor-Critic 结构。三个系数通常取 `c_v = 0.5`、`c_e = 0.01`、`ε = 0.2`。

**训练循环。**

1. 在 `N` 个并行环境中各运行 `T` 步，共收集 `N × T` 条转移。
2. 计算优势（GAE），并把它们冻结为常数。
3. 把当前 `π_θ` 快照冻结为 `π_{θ_old}`。
4. 训练 `K` 轮；每轮针对 `(s, a, A, V_target, log π_old(a|s))` 的每个小批量执行：
   - 计算 `r_t(θ) = exp(log π_θ(a|s) - log π_old(a|s))`。
   - 应用 `L^{CLIP}` + 价值损失 + 熵。
   - 执行梯度更新。
5. 丢弃本次展开，回到第 1 步。

`K = 10`、小批量大小为 64 是一套标准超参数。PPO 很稳健，具体数值在 ±50% 范围内通常影响不大。

**KL 惩罚变体。** 原论文还提出一种使用自适应 KL 惩罚的替代方案：`L = L^{PG} - β · KL(π_θ || π_old)`，根据观察到的 KL 调整 `β`。裁剪版本成为主流；KL 版本仍用于 RLHF，因为 RLHF 无论如何都需要把相对于参考策略的 KL 作为单独约束。

```figure
ppo-clip
```

## 动手构建

### 第 1 步：展开时记录 `log π_old(a | s)`

```python
for step in range(T):
    probs = softmax(logits(theta, state_features(s)))
    a = sample(probs, rng)
    s_next, r, done = env.step(s, a)
    buffer.append({
        "s": s, "a": a, "r": r, "done": done,
        "v_old": value(w, state_features(s)),
        "log_pi_old": log(probs[a] + 1e-12),
    })
    s = s_next
```

快照只在展开时获取一次，在随后的各轮更新中保持不变。

### 第 2 步：计算 GAE 优势（第 07 课）

与 A2C 相同。对整个批次进行规范化。

### 第 3 步：裁剪代理更新

```python
for _ in range(K_EPOCHS):
    for mb in minibatches(buffer, size=64):
        for rec in mb:
            x = state_features(rec["s"])
            probs = softmax(logits(theta, x))
            logp = log(probs[rec["a"]] + 1e-12)
            ratio = exp(logp - rec["log_pi_old"])
            adv = rec["advantage"]
            surrogate = min(
                ratio * adv,
                clamp(ratio, 1 - EPS, 1 + EPS) * adv,
            )
            # backprop -surrogate, add value loss, subtract entropy
            grad_logpi = onehot(rec["a"]) - probs
            if (adv > 0 and ratio >= 1 + EPS) or (adv < 0 and ratio <= 1 - EPS):
                pg_grad = 0.0  # clipped
            else:
                pg_grad = ratio * adv
            for i in range(N_ACTIONS):
                for j in range(N_FEAT):
                    theta[i][j] += LR * pg_grad * grad_logpi[i] * x[j]
```

“裁剪后梯度归零”是 PPO 的核心模式。如果新策略已经沿有利方向偏移过远，更新就会停止。

### 第 4 步：价值与熵

与 A2C 相同，为 critic 目标加入标准 MSE，为 actor 加入熵奖励。

### 第 5 步：诊断

每次更新都要观察三项指标：

- **平均 KL** `E[log π_old - log π_θ]`。应保持在 `[0, 0.02]`。如果超过 `0.1`，降低 `K_EPOCHS` 或 `LR`。
- **裁剪比例**：比率落在 `[1-ε, 1+ε]` 之外的样本占比。它应约为 `0.1-0.3`。如果约为 `0`，说明裁剪从不触发，应提高 `LR` 或 `K_EPOCHS`；如果达到约 `0.5` 以上，说明你正在对展开过拟合，应降低它们。
- **解释方差** `1 - Var(V_target - V_pred) / Var(V_target)`。它衡量 critic 质量。随着 critic 学习，该值应逐渐接近 1。

## 常见问题

- **裁剪系数设置不当。** `ε = 0.2` 是事实上的标准值。降到 `0.1` 会使更新过于保守；提高到 `0.3` 以上会引入不稳定性。
- **训练轮数过多。** `K > 20` 经常导致训练不稳定，因为策略会偏离 `π_old` 太远。请限制轮数，尤其对大型网络。
- **没有规范化奖励。** 较大的奖励尺度会侵蚀裁剪范围。计算优势之前，用运行标准差规范化奖励。
- **忘记规范化优势。** 标准做法是在每个批次中规范化到均值为零、标准差为一。跳过这一步会毁掉 PPO 在多数基准上的表现。
- **学习率不衰减。** PPO 适合把学习率线性衰减到零。常数学习率通常表现更差。
- **重要性比率计算错误。** 为了数值稳定，始终使用 `exp(log_new - log_old)`，不要使用 `new / old`。
- **梯度符号错误。** 最大化代理目标等价于*最小化* `-L^{CLIP}`。符号翻转是最常见的 PPO 错误。

## 使用方法

PPO 是 2026 年多个领域的默认强化学习算法，覆盖范围十分广：

| 用例 | PPO 变体 |
|------|----------|
| MuJoCo / 机器人控制 | 使用高斯策略与 GAE(0.95) 的 PPO |
| Atari / 离散游戏 | 使用分类策略与滚动 128 步展开的 PPO |
| 大语言模型 RLHF | 相对于参考模型加入 KL 惩罚的 PPO，回答结束时由 RM 给出奖励 |
| 大规模游戏智能体 | IMPALA + PPO（AlphaStar、OpenAI Five） |
| 推理大语言模型 | GRPO（第 12 课）：不使用 critic 的 PPO 变体 |
| 只有偏好数据的场景 | DPO：PPO+KL 的闭式压缩，不需要在线采样 |

PPO 的*损失形状*，即裁剪代理目标 + 价值项 + 熵项，为 DPO、GRPO 和几乎每条 RLHF 流水线提供了脚手架。

## 交付成果

保存为 `outputs/skill-ppo-trainer.md`：

```markdown
---
name: ppo-trainer
description: 针对给定环境生成 PPO 训练配置和诊断计划。
version: 1.0.0
phase: 9
lesson: 8
tags: [rl, ppo, policy-gradient]
---

给定一个环境和训练预算，输出：

1. 展开规模。`N` 个环境 × `T` 步。
2. 更新调度。`K` 轮、小批量大小和学习率调度。
3. 代理目标参数。`ε`（裁剪）、`c_v`、`c_e`，并启用优势规范化。
4. 优势。GAE(`λ`)，明确写出 `γ` 和 `λ`。
5. 诊断计划。KL、裁剪比例和解释方差的阈值与警报。

拒绝使用 `K > 30` 或 `ε > 0.3`，因为信赖域不安全。任何没有优势规范化或 KL/裁剪监控的 PPO 运行都拒绝执行。裁剪比例持续高于 0.4 时，将其标记为策略漂移。
```

## 练习

1. **简单。** 在 4×4 GridWorld 上用 `ε=0.2, K=4` 运行 PPO。在环境步数相同的条件下，把样本效率与 A2C（每次展开训练一轮）比较。
2. **中等。** 扫描 `K ∈ {1, 4, 10, 30}`。绘制回报随环境步数的变化，并跟踪每次更新的平均 KL。在这个任务中，KL 从哪个 `K` 开始爆炸？
3. **困难。** 用自适应 KL 惩罚替代裁剪代理目标（如果 `KL > 2·target`，则把 `β` 加倍；如果 `KL < target/2`，则把 `β` 减半）。比较最终回报、稳定性和不使用裁剪时的表现。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 重要性比率 | “r_t(θ)” | `π_θ(a\|s) / π_old(a\|s)`；相对于采集数据的策略发生的偏移。 |
| 裁剪代理目标 | “PPO 的核心技巧” | `min(r·A, clip(r, 1-ε, 1+ε)·A)`；在有利一侧越过裁剪阈值后，梯度变平。 |
| 信赖域 | “TRPO / PPO 的目标” | 限制每次更新的 KL，以保证单调改进。 |
| KL 惩罚 | “软信赖域” | PPO 的替代形式：`L - β · KL(π_θ \|\| π_old)`，使用自适应 `β`。 |
| 裁剪比例 | “裁剪多久触发一次” | 诊断指标，应为 0.1–0.3；超出范围表示参数设置不当。 |
| 多轮训练 | “数据重用” | 在每次展开上训练 K 轮；以方差代价换取样本效率。 |
| 近似同策略 | “大体上属于同策略” | PPO 名义上是同策略算法，但 K>1 轮会安全地使用略微离策略的数据。 |
| PPO-KL | “另一种 PPO” | KL 惩罚变体；用于已将相对参考模型的 KL 作为约束的 RLHF。 |

## 延伸阅读

- [Schulman 等（2017），《Proximal Policy Optimization Algorithms》](https://arxiv.org/abs/1707.06347)——原论文。
- [Schulman 等（2015），《Trust Region Policy Optimization》](https://arxiv.org/abs/1502.05477)——PPO 的前身 TRPO。
- [Andrychowicz 等（2021），《What Matters In On-Policy RL? A Large-Scale Empirical Study》](https://arxiv.org/abs/2006.05990)——对每个 PPO 超参数进行消融。
- [Ouyang 等（2022），《Training language models to follow instructions with human feedback》](https://arxiv.org/abs/2203.02155)——InstructGPT 与 RLHF 中的 PPO 配方。
- [OpenAI Spinning Up——PPO](https://spinningup.openai.com/en/latest/algorithms/ppo.html)——配有 PyTorch 的清晰现代讲解。
- [CleanRL PPO 实现](https://github.com/vwxyzjn/cleanrl)——许多论文采用的单文件 PPO 参考实现。
- [Hugging Face TRL——PPOTrainer](https://huggingface.co/docs/trl/main/en/ppo_trainer)——在语言模型上使用 PPO 的生产配方，适合与第 09 课（RLHF）对照阅读。
- [Engstrom 等（2020），《Implementation Matters in Deep Policy Gradients》](https://arxiv.org/abs/2005.12729)——研究“37 项代码级优化”的论文，分析哪些 PPO 技巧不可或缺，哪些只是经验传说。
