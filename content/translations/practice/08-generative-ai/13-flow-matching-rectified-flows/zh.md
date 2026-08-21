---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/08-generative-ai/13-flow-matching-rectified-flows/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 3b092712de5baa4726f5b090215c3d6e259e1858c7dcc512cc0bc81fea3a8a60
status: reviewed
---

# 流匹配与修正流

> 扩散模型需要 20～50 个采样步骤，因为它们从噪声到数据走的是曲线路径。流匹配（Lipman 等，2023）和修正流（Liu 等，2022）会训练直线路径。路径越直，所需步骤越少，推理越快。Stable Diffusion 3、Flux.1 和 AudioCraft 2 都在 2024 年转向流匹配。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 8 第 06 课（DDPM）、Phase 1（微积分）  
**预计时间：** 约 45 分钟

## 问题

DDPM 的反向过程是一场从 `N(0, I)` 回到数据分布的 1000 步随机游走。DDIM 将其压缩为 20～50 个确定性步骤。你还想使用更少步骤，最好只用一步。阻碍在于，求解反向过程的 ODE 具有刚性，路径也是弯曲的。

如果能训练模型，让噪声到数据之间的路径成为*直线*，从 `t=1` 到 `t=0` 的单个 Euler 步就能奏效。流匹配直接构造这条路径：定义从 `x_1 ∼ N(0, I)` 到 `x_0 ∼ data` 的直线插值，训练向量场 `v_θ(x, t)` 匹配其时间导数，再在推理时进行积分。

修正流（Liu，2022）更进一步：使用 reflow 过程反复拉直路径，使 ODE 逐渐趋近线性。经过两次 reflow 迭代后，2 步采样器便能达到 50 步 DDPM 的质量。

## 概念

![流匹配：噪声与数据之间的直线插值](../assets/flow-matching.svg)

### 直线流

定义：

```
x_t = t · x_1 + (1 - t) · x_0,   t ∈ [0, 1]
```

其中 `x_0 ~ data`，`x_1 ~ N(0, I)`。沿这条直线的时间导数为常数：

```
dx_t / dt = x_1 - x_0
```

定义神经向量场 `v_θ(x_t, t)`，训练它匹配该导数：

```
L = E_{x_0, x_1, t} || v_θ(x_t, t) - (x_1 - x_0) ||²
```

这项损失称为 **条件流匹配** 损失（Lipman，2023）。训练无需仿真：永远不用展开 ODE，只需采样 `(x_0, x_1, t)` 并回归。

### 采样

推理时，沿时间*反向*积分学习到的向量场：

```
x_{t-Δt} = x_t - Δt · v_θ(x_t, t)
```

从 `x_1 ~ N(0, I)` 开始，使用 Euler 步递减到 `t=0`。

### 修正流（Liu，2022）

直线流可以奏效，但学习到的路径*并不直*，因为多个 `x_0` 可能映射到同一个 `x_1`。修正流的 reflow 步骤如下：

1. 使用随机配对训练流模型 v_1。
2. 通过对 v_1 从 `x_1` 积分到其落点 `x_0`，采样 N 对 `(x_1, x_0)`。
3. 在这些配对样本上训练 v_2。配对现在已经与 ODE 匹配，两点之间的直线插值会真正变得更平坦。
4. 重复上述过程。

实际使用中，2 次 reflow 迭代便能得到近似线性的路径，并支持 2～4 步推理。SDXL-Turbo、SD3-Turbo、LCM 都是从流匹配模型蒸馏而来。

### 它为何在 2024 年赢得图像领域

原因有三点：

1. **训练无需仿真：** 训练期间不展开 ODE，实现很简单。
2. **损失几何更好：** 直线路径的信噪比一致；DDPM ε 损失在调度两端的信噪比很差。
3. **推理更快：** 4～8 步就能达到 SDXL-Turbo 的质量；配合一致性蒸馏可降为 1 步。

## 流匹配与 DDPM——精确联系

采用高斯条件路径的流匹配，就是使用*特定噪声调度*的扩散。选择 `x_t = α(t) x_0 + σ(t) x_1` 调度后，流匹配会恢复以 Stratonovich 形式重写的扩散，其中 `v = α'·x_0 - σ'·x_1`。对于高斯路径，两者在代数上等价。

流匹配带来了三项新内容：普通速度这一更清楚的目标、更干净的损失，以及试验非高斯插值的空间。

```figure
normalizing-flow
```

## 动手构建

`code/main.py` 在双峰高斯混合上实现一维流匹配。向量场 `v_θ(x, t)` 是一个微型 MLP，使用直线目标训练。推理时分别积分 1、2、4 和 20 个 Euler 步，再比较样本质量。

### 第 1 步：训练损失

```python
def train_step(x0, net, rng, lr):
    x1 = rng.gauss(0, 1)
    t = rng.random()
    x_t = t * x1 + (1 - t) * x0
    target = x1 - x0
    pred = net_forward(x_t, t)
    loss = (pred - target) ** 2
    # 反向传播 + 更新
```

### 第 2 步：多步推理

```python
def sample(net, num_steps):
    x = rng.gauss(0, 1)
    for i in range(num_steps):
        t = 1.0 - i / num_steps
        dt = 1.0 / num_steps
        x -= dt * net_forward(x, t)
    return x
```

### 第 3 步：比较步数

4 步采样器应当已经能达到 20 步的质量。这会显著改善延迟。

## 常见问题

- **时间参数化。** 流匹配使用 `t ∈ [0, 1]`，数据位于 `t=0`，噪声位于 `t=1`。DDPM 使用 `t ∈ [0, T]`，数据位于 `t=0`，噪声位于 `t=T`。方向相同，尺度不同。论文经常写错这一点。
- **调度选择。** 修正流的直线是“标准”流匹配调度，但也可以使用余弦或 logit-normal 时间采样（SD3 如此处理），以获得更好的尺度覆盖。
- **Reflow 成本。** 为 reflow 生成配对数据集，相当于对每个样本完整执行一次推理。只有确实需要 1～2 步推理时才应使用 reflow。
- **无分类器引导仍然适用。** 在线性组合中把 ε 换成 v 即可：`v_cfg = (1+w) v_cond - w v_uncond`。

## 使用方法

| 用例 | 2026 年技术栈 |
|------|---------------|
| 最高质量文生图 | 流匹配：SD3、Flux.1-dev |
| 1～4 步文生图 | 蒸馏流匹配：Flux.1-schnell、SD3-Turbo、SDXL-Turbo |
| 实时推理 | 从流匹配基础模型执行一致性蒸馏（LCM、PCM） |
| 音频生成 | 流匹配：Stable Audio 2.5、AudioCraft 2 |
| 视频生成 | 流匹配与扩散混合（Sora、Veo、Stable Video） |
| 科学 / 物理（粒子轨迹、分子） | 流匹配 + 等变向量场 |

2025—2026 年的论文只要声称“比扩散更快”，几乎都会采用流匹配 + 蒸馏。

## 交付成果

保存为 `outputs/skill-fm-tuner.md`。该技能接收扩散式模型规范，并将其转换为流匹配训练配置：调度选择、时间采样分布（均匀 / logit-normal）、优化器、reflow 计划、目标步数和评估方案。

## 练习

1. **简单。** 运行 `code/main.py`，比较 1 步与 20 步相对于真实数据分布的 MSE。
2. **中等。** 把均匀 `t` 采样改为 logit-normal，使采样集中在中间 t。模型质量是否改善？
3. **困难。** 实现一次 reflow 迭代：通过对第一个模型积分生成配对 `(x_0, x_1)`，在配对数据上训练第二个模型，再比较 1 步采样质量。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 流匹配 | “直线扩散” | 训练 `v_θ(x, t)`，使其沿插值路径匹配 `x_1 - x_0`。 |
| 修正流 | “Reflow” | 反复拉直学习流的过程。 |
| 速度场 | “v_θ” | 模型输出，也就是 `x_t` 应移动的方向。 |
| 直线插值 | “那条路径” | `x_t = (1-t)·x_0 + t·x_1`；目标导数很简单。 |
| Euler 采样器 | “一阶 ODE 求解器” | 最简单的积分器；路径较直时效果很好。 |
| Logit-normal t | “SD3 采样” | 把 `t` 采样集中到梯度最强的中间取值。 |
| 一致性蒸馏 | “一步采样器” | 训练学生模型，把任意 `x_t` 直接映射到 `x_0`。 |
| 速度 CFG | “v-CFG” | `v_cfg = (1+w) v_cond - w v_uncond`；同一技巧，更换变量。 |

## 生产说明：Flux.1-schnell 把流匹配加速到极致

流匹配的生产优势集中体现在 Flux.1-schnell：通过蒸馏，把流匹配 DiT 降至 1～4 个推理步骤，同时保持 Flux-dev 级质量。Niels 的“在 8GB 机器上运行 Flux”笔记本给出了参考部署方案：T5 + CLIP 编码、量化 MMDiT 去噪（schnell 用 4 步，dev 用 50 步）、VAE 解码。成本如下：

| 变体 | 步数 | L4 上处理 1024² 的延迟 | 总 FLOPs（相对值） |
|------|------|-------------------------|--------------------|
| Flux.1-dev（原始版） | 50 | 约 15 s | 1.0× |
| Flux.1-schnell | 4 | 约 1.2 s | 0.08×（快 12 倍） |
| SDXL-base | 30 | 约 4 s | 0.25× |
| SDXL-Lightning 2-step | 2 | 约 0.3 s | 0.03× |

生产规则是：**流匹配基础模型 + 蒸馏 = 2026 年快速文生图的默认方案。** 各大厂商都提供这种组合：SD3-Turbo（SD3 + 流 + 蒸馏）、Flux-schnell（Flux-dev + 修正流拉直）、CogView-4-Flash。纯扩散基础模型只存在于旧检查点中。

## 延伸阅读

- [Liu、Gong、Liu（2022），《Flow Straight and Fast: Learning to Generate and Transfer Data with Rectified Flow》](https://arxiv.org/abs/2209.03003)——修正流。
- [Lipman 等（2023），《Flow Matching for Generative Modeling》](https://arxiv.org/abs/2210.02747)——流匹配。
- [Esser 等（2024），《Scaling Rectified Flow Transformers for High-Resolution Image Synthesis》](https://arxiv.org/abs/2403.03206)——SD3，大规模修正流。
- [Albergo、Vanden-Eijnden（2023），《Stochastic Interpolants》](https://arxiv.org/abs/2303.08797)——覆盖流匹配 + 扩散的通用框架。
- [Song 等（2023），《Consistency Models》](https://arxiv.org/abs/2303.01469)——对扩散 / 流进行一步蒸馏。
- [Sauer 等（2023），《Adversarial Diffusion Distillation (SDXL-Turbo)》](https://arxiv.org/abs/2311.17042)——Turbo 变体。
- [Black Forest Labs（2024），《Flux.1 models》](https://blackforestlabs.ai/announcing-black-forest-labs/)——生产中的流匹配。
