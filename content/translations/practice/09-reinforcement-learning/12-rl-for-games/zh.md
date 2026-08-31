---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/09-reinforcement-learning/12-rl-for-games/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: fbd5ca23db373b9902bdde62d877b231a4096787a4485183971891812fcf1f35
status: reviewed
---

# 游戏强化学习——AlphaZero、MuZero 与大语言模型推理时代

> 1992 年，TD-Gammon 只用 TD 就在西洋双陆棋中击败了人类冠军。2016 年，AlphaGo 击败李世石。2017 年，AlphaZero 从零开始统治国际象棋、将棋与围棋。2024 年，DeepSeek-R1 证明了同一套配方把 PPO 换成 GRPO 后，也适用于推理。游戏基准推动了本阶段的每项突破。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 9 第 05 课（DQN）、Phase 9 第 08 课（PPO）、Phase 9 第 09 课（RLHF）、Phase 9 第 10 课（MARL）  
**预计时间：** 约 120 分钟

## 问题

游戏具备强化学习所需的一切：清晰的奖励（胜/负）、无限回合（自我对弈后重置）、完美仿真（游戏*本身就是*仿真器）、离散或较小的连续动作空间，以及迫使智能体具备对抗鲁棒性的多智能体结构。

每项重大的强化学习突破也都通过游戏接受检验：TD-Gammon（西洋双陆棋，1992）、Atari-DQN（2013）、AlphaGo（2016）、AlphaZero（2017）、OpenAI Five（Dota 2，2019）、AlphaStar（StarCraft II，2019）、MuZero（学习型模型，2019）、AlphaTensor（矩阵乘法，2022）、AlphaDev（排序算法，2023）、DeepSeek-R1（数学推理，2025）。DeepSeek-R1 是游戏强化学习技术适用于文本的最新例证。

本综合课程通过一个统一视角介绍三个里程碑式架构 AlphaZero、MuZero 与 GRPO：**自我对弈 + 搜索 + 策略改进**。每种架构都推广了前一种；GRPO 尤其像是把 AlphaZero 配方用于大语言模型推理，把词元作为动作，把数学验证结果作为胜负信号。

## 概念 <!-- learning-atlas: the-concept -->

![AlphaZero ↔ MuZero ↔ GRPO：同一循环，不同环境](../assets/rl-games.svg)

**统一循环。**

```
while True:
    trajectory = self_play(current_policy, search)     # play game against self
    policy_target = search.improved_policy(trajectory) # search improves raw policy
    policy_net.update(policy_target, value_target)     # supervised on search output
```

**AlphaZero（2017）。** Silver 等提出。给定规则已知的游戏（国际象棋、将棋、围棋）：

- 策略—价值网络：一个主干 `f_θ(s) → (p, v)`。`p` 是合法着法的先验分布，`v` 是预期游戏结果。
- 蒙特卡洛树搜索（MCTS）：每一步都展开一棵包含可能后续局面的树。使用 `(p, v)` 作为先验 + 自举。通过 UCB（PUCT）选择节点：`a* = argmax Q(s, a) + c · p(a|s) · √N(s) / (1 + N(s, a))`。
- 自我对弈：智能体与自己进行游戏。在步骤 `t`，MCTS 访问分布 `π_t` 成为策略训练目标。
- 损失：`L = (v - z)² - π · log p + c · ||θ||²`。`z` 是游戏结果（+1 / 0 / -1）。

不使用人类知识，也没有手写启发式。单一配方分别经过数千万局自我对弈，就掌握了国际象棋、将棋和围棋。

**MuZero（2019）。** Schrittwieser 等提出。它去掉了规则必须已知的要求。

- 不使用固定环境，而是学习一个*潜在动力学模型* `(h, g, f)`：
  - `h(s)`：把观测编码为潜在状态。
  - `g(s_latent, a)`：预测下一个潜在状态 + 奖励。
  - `f(s_latent)`：预测策略先验 + 价值。
- MCTS 在*学习得到的潜在空间*中运行。搜索与训练循环保持不变。
- 它适用于围棋、国际象棋、将棋*以及* Atari：同一个算法，不需要规则知识。

**Stochastic MuZero（2022）。** 加入随机动力学和机会节点，扩展到西洋双陆棋一类的游戏。

**Muesli、Gumbel MuZero（2022–2024）。** 改进样本效率和确定性搜索。

**GRPO（2024–2025）。** DeepSeek-R1 配方。它把形状类似 AlphaZero 的循环用于语言模型推理：

- “游戏”：回答数学 / 编码 / 推理问题。“获胜”表示验证器返回 1，例如测试用例通过、数值答案匹配。
- 策略：大语言模型。动作：词元。状态：提示 + 当前已经生成的回答。
- 不使用 critic（PPO 风格的 `V_φ`）。对于每个提示，从策略采样 `G` 个补全，计算每个补全的奖励，再把 **组相对优势** `A_i = (r_i - mean_r) / std_r` 作为 REINFORCE 风格更新的信号。
- 相对于参考策略加入 KL 惩罚，以防止漂移，与 RLHF 相同。
- 完整损失：

  `L_GRPO(θ) = -E_{q, {o_i}} [ (1/G) Σ_i A_i · log π_θ(o_i | q) ] + β · KL(π_θ || π_ref)`

不需要奖励模型、critic 或 MCTS。组相对基线取代了这三者。它只用一小部分计算量，就能在推理基准上达到或超过 PPO-RLHF 的质量。

**完整 R1 配方。** DeepSeek-R1（DeepSeek，2025）的一篇论文中包含两个模型：

- **R1-Zero。** 从 DeepSeek-V3 基础模型开始，不做 SFT。直接使用 GRPO 和两个奖励分量：*准确率奖励*（基于规则，最终答案是否能解析为正确数字 / 代码是否通过单元测试）和*格式奖励*（补全是否把思维链放在 `<think>…</think>` 标签中）。经过数千步训练，平均回答长度从约 100 增长到约 10,000 个词元，数学基准分数上升到接近 o1-preview 的水平。模型从零开始学会推理。缺点是思维链往往难以阅读、混合多种语言，而且缺少风格润色。
- **R1。** 用四阶段流水线修正 R1-Zero 的可读性问题：
  1. **冷启动 SFT。** 收集几千条格式清晰的长思维链示范，用它们对基础模型进行监督微调，提供可读的起点。
  2. **面向推理的 GRPO。** 使用准确率 + 格式奖励运行 GRPO，并加入*语言一致性*奖励，防止语言切换。
  3. **拒绝采样 + 第二轮 SFT。** 从强化学习检查点采样约 600K 条推理轨迹，只保留最终答案正确且思维链可读的轨迹，再与约 200K 条非推理 SFT 示例（写作、问答、自我认知）合并，重新微调基础模型。
  4. **全谱 GRPO。** 再执行一轮强化学习，同时覆盖推理任务（基于规则的奖励）和一般对齐任务（基于有帮助/无害偏好的奖励）。

最终模型以开放权重在 AIME 与 MATH-500 上追平 o1，而且体量允许蒸馏。同一篇论文还发布了六个经过蒸馏的稠密模型，从 Qwen-1.5B 到 Llama-70B；它们只在 R1 的推理轨迹上做 SFT，学生模型本身不运行强化学习。在学生模型的规模下，从强大的强化学习教师蒸馏，始终优于从零开始运行强化学习。

**推理任务为何用 GRPO 而不是 PPO。** DeepSeekMath 论文（2024 年 2 月）给出三个原因：（1）不需要训练价值网络，显存占用减半；（2）组基线天然适合推理任务产生的稀疏轨迹末端奖励；（3）按提示规范化，使不同难度问题的优势可以比较，而 PPO 的单一 critic 无法做到这一点。

**无搜索与基于搜索的方法。** 游戏强化学习已经分成两条路线：

- *长视野完美信息游戏*（围棋、国际象棋）仍以搜索为基础，由 AlphaZero / MuZero 主导。
- *大语言模型推理*尚未在生产中使用 MCTS，而是对完整展开运行 GRPO，并使用 Best-of-N 增加推理计算。过程奖励模型（PRM）表明，步骤级搜索可能会重新加入。

```figure
f3-selfplay-ladder
```

## 动手构建

`code/main.py` 实现了 **微型 GRPO**：包含多组样本的老虎机。它使用的算法与大语言模型相同，只是策略和环境更简单。代码重点展示*损失*与*组相对优势*，也就是 2025 年的创新。

### 第 1 步：小型验证器环境

```python
QUESTIONS = [
    {"prompt": "q1", "correct": 3},
    {"prompt": "q2", "correct": 1},
]

def verify(prompt_idx, answer_token):
    return 1.0 if answer_token == QUESTIONS[prompt_idx]["correct"] else 0.0
```

真实 GRPO 中的验证器会运行单元测试或检查数学等式。

### 第 2 步：策略，即每个提示上的 K 个答案词元 softmax

```python
def policy_probs(theta, p_idx):
    return softmax(theta[p_idx])
```

它等价于大语言模型在给定提示条件下最终层的输出。

### 第 3 步：组采样与组相对优势

```python
def grpo_step(theta, p_idx, G=8, beta=0.01, lr=0.1, rng=None):
    probs = policy_probs(theta, p_idx)
    samples = [sample(probs, rng) for _ in range(G)]
    rewards = [verify(p_idx, s) for s in samples]
    mean_r = sum(rewards) / G
    std_r = stddev(rewards) + 1e-8
    advs = [(r - mean_r) / std_r for r in rewards]

    for a, A in zip(samples, advs):
        grad = onehot(a) - probs
        for i in range(len(probs)):
            theta[p_idx][i] += lr * A * grad[i]
    # KL penalty: pull theta toward reference
    for i in range(len(probs)):
        theta[p_idx][i] -= beta * (theta[p_idx][i] - reference[p_idx][i])
```

组相对优势是 DeepSeek 在 2024 年提出的技巧。它不需要 critic。“基线”是组均值，规范化使用组标准差。

### 第 4 步：与 REINFORCE 基线比较（无价值函数）

使用相同设置与相同计算量运行原始 REINFORCE。GRPO 收敛得更快、更稳定。

### 第 5 步：观察熵与 KL

使用与 RLHF 相同的诊断指标：相对于参考策略的平均 KL、策略熵、奖励随时间的变化。这些指标稳定后，训练就完成了。

## 常见问题

- **通过攻击验证器进行奖励投机。** GRPO 继承了 RLHF 的风险：如果验证器错误或可以利用，大语言模型就会找到漏洞。必须使用稳健验证器，例如多个测试用例或形式化证明。
- **组太小。** 组基线的方差按 `1/√G` 变化。低于 `G = 4` 时，优势信号噪声很大；标准选择为 `G = 8` 到 `64`。
- **长度偏差。** 不同长度的大语言模型补全具有不同的对数概率。可以按词元数规范化，使用序列级对数概率，或截断到最大长度。
- **纯自我对弈循环。** 在一般和游戏上，AlphaZero 风格训练可能陷入优势循环。可以使用多样化对手池缓解，例如第 10 课的联赛训练。
- **搜索—策略不匹配。** AlphaZero 训练策略去模仿搜索输出。如果策略网络太小，无法表示搜索分布，训练就会停滞。
- **计算门槛。** MuZero / AlphaZero 需要大量计算。一次消融通常就需要数百 GPU 小时。用于学习的微型演示也存在，例如在四子棋上运行 AlphaZero。
- **验证器覆盖不足。** 如果单元测试允许错误解法通过，训练会强化该错误。设计能够捕获边缘情况的验证器。

## 使用方法

2026 年不同领域的游戏强化学习图谱如下：

| 领域 | 主流方法 |
|------|----------|
| 双人零和棋盘游戏（围棋、国际象棋、将棋） | AlphaZero / MuZero / KataGo |
| 不完美信息牌类游戏（扑克） | CFR + 深度学习（DeepStack、Libratus、Pluribus） |
| Atari / 像素游戏 | Muesli / MuZero / IMPALA-PPO |
| 大型多人策略游戏（Dota、StarCraft） | PPO + 自我对弈 + 联赛（OpenAI Five、AlphaStar） |
| 大语言模型数学/代码推理 | GRPO（DeepSeek-R1、Qwen-RL、开放复现） |
| 大语言模型对齐 | DPO / RLHF-PPO（不是 GRPO；验证信号是偏好，而非可验证结果） |
| 机器人 | PPO + DR（不属于游戏强化学习，但使用相同的策略梯度工具） |
| 组合问题 | AlphaZero 变体（AlphaTensor、AlphaDev） |

这套*配方*包含自我对弈、搜索增强的改进与策略蒸馏，横跨文本、像素和物理控制。GRPO 是其中最年轻的一种，未来还会出现更多实例。

## 交付成果

保存为 `outputs/skill-game-rl-designer.md`：

```markdown
---
name: game-rl-designer
description: 针对给定领域设计游戏强化学习或推理强化学习流水线（AlphaZero / MuZero / GRPO）。
version: 1.0.0
phase: 9
lesson: 12
tags: [rl, alphazero, muzero, grpo, self-play]
---

给定一个目标（完美信息游戏 / 不完美信息游戏 / Atari / 大语言模型推理 / 组合问题），输出：

1. 环境匹配。规则是否已知？是否满足 Markov 性？是否随机？是否为多智能体？据此选择 AlphaZero、MuZero 或 GRPO。
2. 搜索策略。MCTS（使用学习型先验的 PUCT）、Gumbel 采样、Best-of-N 或不搜索。
3. 自我对弈计划。对称自我对弈 / 联赛 / 离线数据 / 验证器生成。
4. 目标信号。游戏结果 / 验证器奖励 / 偏好 / 学习型模型。包括鲁棒性计划。
5. 诊断。相对基线的胜率、ELO 曲线、验证器通过率和相对参考策略的 KL。

不完美信息游戏不得使用 AlphaZero，应转用 CFR。没有可信验证器时不得使用 GRPO。如果游戏强化学习流水线没有固定基线对手集合，拒绝交付，因为自我对弈 ELO 在这种情况下未经过校准。
```

## 练习

1. **简单。** 实现 `code/main.py` 中的 GRPO 老虎机。针对 2 个提示 × 每个提示 4 个答案词元进行训练，使用 `G=8`，在少于 1,000 次更新内收敛。
2. **中等。** 接入 PPO（裁剪版本）和原始 REINFORCE。在同一个老虎机上比较它们与 GRPO 的样本效率及奖励方差。
3. **困难。** 扩展为长度为 2 的“推理链”：智能体发出两个词元，验证器对这个词元对给出奖励。测量 GRPO 如何处理两步序列上的信用分配。（提示：按*完整序列*计算组优势，并把它传播到两个词元位置。）

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| MCTS | “使用学习型网络的树搜索” | 蒙特卡洛树搜索；使用学习到的 `(p, v)` 先验进行 UCB1/PUCT 选择。 |
| AlphaZero | “自我对弈 + MCTS” | 训练策略—价值网络，使其匹配 MCTS 访问次数与游戏结果。 |
| MuZero | “使用学习型模型的 AlphaZero” | 循环相同，但通过学习得到的动力学在潜在空间中运行。 |
| GRPO | “不使用 critic 的 PPO” | 组相对策略优化；使用组均值基线 + KL 的 REINFORCE。 |
| PUCT | “AlphaZero 的 UCB” | `Q + c · p · √N / (1 + N_a)`：平衡价值估计与先验。 |
| 自我对弈 | “智能体对过去的自己” | 零和游戏的标准方法；训练信号对称。 |
| 联赛训练 | “基于种群的自我对弈” | 从历史策略、当前策略和 exploiters 中采样对手。 |
| 验证器奖励 | “可验证强化学习” | 奖励来自确定性检查器（测试通过、答案匹配）。 |
| 过程奖励 | “PRM” | 对每个推理步骤而非仅最终答案评分。 |

## 延伸阅读

- [Silver 等（2017），《Mastering the game of Go without human knowledge (AlphaGo Zero)》](https://www.nature.com/articles/nature24270)。
- [Silver 等（2018），《A general reinforcement learning algorithm that masters chess, shogi, and Go through self-play (AlphaZero)》](https://www.science.org/doi/10.1126/science.aar6404)。
- [Schrittwieser 等（2020），《Mastering Atari, Go, chess and shogi by planning with a learned model (MuZero)》](https://www.nature.com/articles/s41586-020-03051-4)。
- [Vinyals 等（2019），《Grandmaster level in StarCraft II (AlphaStar)》](https://www.nature.com/articles/s41586-019-1724-z)。
- [DeepSeek-AI（2024），《DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models (GRPO)》](https://arxiv.org/abs/2402.03300)——提出 GRPO 和组相对基线的论文。
- [DeepSeek-AI（2025），《DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning》](https://arxiv.org/abs/2501.12948)——完整的四阶段 R1 配方与 R1-Zero 消融。
- [Brown 等（2019），《Superhuman AI for multiplayer poker (Pluribus)》](https://www.science.org/doi/10.1126/science.aay2400)——大规模 CFR + 深度学习。
- [Tesauro（1995），《Temporal Difference Learning and TD-Gammon》](https://dl.acm.org/doi/10.1145/203330.203343)——一切的起点。
- [Hugging Face TRL——GRPOTrainer](https://huggingface.co/docs/trl/main/en/grpo_trainer)——使用自定义奖励函数应用 GRPO 的生产级参考实现。
- [Qwen 团队（2024），《Qwen2.5-Math——GRPO replication》](https://github.com/QwenLM/Qwen2.5-Math)——在多种规模上开放复现 R1 配方。
- [Sutton 与 Barto（2018），第 17 章——强化学习前沿](http://incompleteideas.net/book/RLbook2020.pdf)——教材对自我对弈、搜索和“设计奖励”的阐释；R1 在大语言模型规模上实现了这些思想。
