---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/10-llms-from-scratch/21-jamba-hybrid-ssm-transformer/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: cc5b0d19b7cb44011c94c603517e7a8eb659df2e2b58043e5d89cd1299191ab8
status: reviewed
---

# Jamba——SSM-Transformer 混合架构

> 状态空间模型（SSM）和 Transformer 追求不同的目标。Transformer 以二次复杂度换取注意力质量；SSM 通过递归获得线性时间推理和常数内存，但质量稍逊。AI21 的 Jamba（2024 年 3 月）和 Jamba 1.5（2024 年 8 月）把二者放进同一个模型：每 7 个 Mamba 层配 1 个 Transformer 层，每隔一个块使用 MoE，并让 256k 上下文适配单张 80GB GPU。Mamba-3（ICLR 2026）用复数值状态空间和 MIMO 投影进一步强化 SSM 一侧。本课完整阅读两种架构，并解释为什么这一混合配方在纯 SSM 和纯 Transformer 的长上下文尝试都没有坚持下来时，仍经历了三年的扩展。

**类型：** 学习  
**语言：** Python（标准库，层混合计算器）  
**前置课程：** 第 10 阶段 · 14（开放模型架构）、第 10 阶段 · 17（原生稀疏注意力）  
**用时：** 约 60 分钟

## 学习目标

- 解释 Jamba 块的三个原语——Transformer 层、Mamba 层和 MoE——以及 1:7:隔层交错配方。
- 在高层次上说明 SSM 的递归形式，以及它为何支持常数内存推理。
- 计算 Jamba 模型在 256k 上下文下的 KV 缓存占用，并与纯 Transformer 的需求比较。
- 说出 Mamba-3 的三个创新（指数–梯形离散化、复数值状态更新、MIMO）以及每一项针对的问题。

## 问题

注意力关于序列长度呈二次复杂度，状态空间模型则是线性的。这种差异会不断放大：在 256k 词元时，Transformer 的每个头有 65B 个注意力图条目，而 SSM 的递归状态无论序列多长都保持固定大小。

纯 SSM 模型（Mamba、Mamba-2）在小规模上能匹敌 Transformer 的困惑度，但在状态跟踪任务上落后，并且会在某些上下文内检索类别上失败。直觉是：SSM 将历史压缩到固定状态，历史变长时信息会泄漏；注意力能精确记住一切，却付出二次成本。

直接的修复办法是两者都用：在需要精确召回的位置放 Transformer 层，其余位置使用 SSM 层，再调节比例。Jamba 是第一个以生产级规模交付这种混合配方的模型（总参数 52B、激活参数 12B、256k 上下文、单张 80GB GPU）。Jamba 1.5 将家族扩展到总参数 398B、激活参数 94B。Mamba-3（ICLR 2026）是当前最好的纯 SSM 基线，可以围绕它重新设计混合模型。

本课阅读三篇论文，建立“选择正确比例”的心智模型。

## 概念

### 一页看懂 SSM

状态空间模型通过固定大小的状态 `h` 处理序列 `x_1, ..., x_N`：

```
h_t = A h_{t-1} + B x_t
y_t = C h_t
```

每一步都通过线性动力学 `A` 更新状态，接收输入 `B x_t`，并输出 `C h_t`。`A, B, C` 都可以学习。关键性质是：计算 `y_t` 只需要 `h_{t-1}` 和 `x_t`，不需要任何更早的 `x`。内存是常数，推理每个词元的复杂度为 O(1)。

影响建模质量的诀窍在于 `A` 的结构。S4（Gu，2021）使用高度结构化的矩阵，训练时可以作为长卷积高效计算。Mamba（Gu、Dao，2023）用依赖数据的 `A, B, C` 替换固定参数，引入了“选择性”。Mamba-2（2024）进一步简化结构。Mamba-3（2026）在特定位置重新增加了复杂性。

对于解码器 LLM，核心性质是：SSM 层可以直接替代注意力层，每层使用固定大小的状态，而不是不断增长的 KV 缓存。

### Jamba 块

Jamba 按两个数字交错排列层：

- `l`：注意力与 Mamba 的比例。Jamba 使用 `l = 8`，即每 7 个 Mamba 层配 1 个 Transformer 层（7 个 Mamba + 1 个 Attention = 每组 8 层）。
- `e`：MoE 的频率。Jamba 使用 `e = 2`，即每隔一层应用一次 MoE。

一个块中的层序列为：

```
M  M  M  M  M  M  M  A    (7 Mamba + 1 Attention)
|  M  |  M  |  M  |  M    (where | marks MoE applied)
```

每个 Jamba 块有 8 层。深度为 4 个块（共 32 层）时，有 28 个 Mamba 层和 4 个注意力层，其中 16 层使用 MoE。

### 为什么是 1:7

AI21 做了消融实验：在长上下文评估中，什么注意力–Mamba 比例能同时获得最好的每参数困惑度和上下文内召回？

- 注意力太多（1:1）：质量提升，但内存与速度变差。
- 注意力太少（1:15）：内存表现很好，但上下文内检索失败。
- 甜蜜点：1:7 或 1:8。

直觉是：Transformer 层负责精确召回与状态跟踪，Mamba 层负责低成本地处理大量常规信息。

### 位置编码

Mamba 层本身通过递归感知位置。在最初的基于 Mamba 的混合模型中，注意力层没有使用 RoPE，因为 SSM 层已经提供了位置信息。Jamba 1.5 为注意力层增加 RoPE，以改善更长上下文的泛化；这是基于长上下文评估结果的事后改进。

### 内存预算

对于 Jamba-1 形状（32 层：28 个 Mamba + 4 个 Attention，隐藏维度 4096，32 个注意力头）：

- KV 缓存（仅注意力层）：在 256k BF16 上下文下为 `2 * 4 * 32 * 128 * 256k * 2 = 8.4 GB`。只有 4 个注意力层贡献 KV 缓存。
- SSM 状态：每个前缀的 `28 * hidden * state_size`，但它是每层固定大小，不随序列长度增长。典型 Mamba 状态每个特征为 16，隐藏维度为 4096：`28 * 4096 * 16 * 2 = 3.7 MB`。

比较同样隐藏维度、32 层、完整 MHA 的纯 Transformer：在 256k BF16 下，`2 * 32 * 32 * 128 * 256k * 2 = 128 GB`。KV 缓存减少了 8 倍。即使与大多数 2024 模型采用的 GQA(8) 基线比较（`2 * 32 * 8 * 128 * 256k * 2 = 32 GB`），Jamba 的 1:7 混合架构约 16GB 的缓存仍小 2 倍。

这对应 AI21 所说的“单张 80GB GPU 上支持 256k 上下文”。完整 MHA 的纯 Transformer KV 缓存无法装下；即使是 GQA 基线，也会不给权重和激活留下空间；Jamba 则可以。

### Mamba-3：2026 年的纯 SSM 基线

Mamba-3（ICLR 2026，arXiv:2603.15569）在纯 SSM 一侧引入三项创新：

1. **指数–梯形离散化。** 用更具表达力的递归替换 Mamba-2 中的欧拉方法离散化。卷积式操作被应用于核心递归中的状态–输入，而不是对 `x_t` 做外层卷积。

2. **复数值状态更新。** 之前的 Mamba 从 S4 的复数状态矩阵简化为 Mamba 的实对角矩阵，再简化为 Mamba-2 的缩放单位阵。Mamba-3 重新加入复数值，相当于对状态施加依赖数据的旋转嵌入，恢复了此前实数简化牺牲的状态跟踪能力。

3. **多输入多输出（MIMO）投影。** 不再使用每个特征一个标量投影，而使用矩阵值投影。在不增加解码延迟的情况下提升建模能力与推理硬件利用率。

在 1.5B 参数规模上，Mamba-3 的平均下游准确率比 Gated DeltaNet 高 0.6 个百分点；MIMO 变体再高 1.2 个百分点，总提升 1.8 个百分点。在相同状态大小下，Mamba-3 用一半状态达到了 Mamba-2 的效果。

Mamba-3 尚未以生产级规模交付于混合模型，但它是下一代 Jamba 类模型很有竞争力的 SSM 候选。

### 什么时候选择混合架构

以下情况混合模型占优：

- 上下文足够长，纯 Transformer 的 KV 缓存变得棘手（64k+）。
- 任务同时包含适合 SSM 的短程结构和需要 Transformer 的长程召回。
- 你希望在单 GPU 内存预算中部署，而纯 Transformer 的 KV 缓存本身就放不下。

以下情况混合模型处于劣势：

- 上下文较短（低于 16k）。SSM 开销被浪费，纯 Transformer 已经足够。
- 任务需要处处进行全连接注意力（深度推理、多文档交叉引用）。混合模型中稀疏的注意力层会造成损失。
- 你正在扩展到万亿参数的前沿模型。目前纯 Transformer + MLA + MoE（DeepSeek-V3 风格）仍在能力竞赛中领先。

### 竞争格局

| 模型 | 家族 | 规模 | 独特主张 |
|-------|-------|------|-------------|
| Mamba-2 | 纯 SSM | 3B | 线性时间、常数内存 |
| Jamba | 混合 | 52B/12B | 80GB 上支持 256k |
| Jamba 1.5 Large | 混合 | 398B/94B | 企业级长上下文 |
| Mamba-3 | 纯 SSM | 1.5B（论文） | 恢复状态跟踪 |
| DeepSeek-V3 | 纯 Transformer + MoE | 671B/37B | 前沿能力 |

2026 年的格局是：纯 Transformer MoE 主导前沿，但混合模型占据 256k 以上上下文的细分领域。Mamba-3 的状态跟踪优势可能会让下一代模型采用更低的混合比例（更多 SSM、更少注意力）。

```figure
swiglu-ffn
```

## 使用它

`code/main.py` 是一个混合架构的内存计算器。给定 SSM–Transformer 比例和隐藏维度/层数配置，它会计算：

- 目标上下文下的 KV 缓存。
- SSM 状态内存。
- 一系列模型形状在上下文长度 N 下的总内存。

计算器支持：

- 纯 Transformer 基线（KV 缓存随 N 增长）。
- Jamba 风格的 1:7 混合。
- 纯 SSM（完全没有 KV 缓存）。

对于已发布形状，数字直接来自 Jamba-1 和 Jamba-1.5 论文；对于假设变体则是外推值。

真实部署时需要考虑：

- 大多数生产推理服务器（vLLM、SGLang）支持 Jamba 和 Mamba，但要检查具体版本。
- 在 256k 上下文下，Jamba 的内存优势会体现在并发请求吞吐量上。同样 VRAM 下，Jamba 能容纳比 Transformer 更多的序列。
- Mamba-3 作为独立模型还未在生产中交付，目前是 1.5B 规模的研究预览。

## 交付

本课产出 `outputs/skill-hybrid-picker.md`。给定工作负载规格（上下文长度分布、任务组合和内存预算），它会在纯 Transformer、Jamba 风格混合模型和纯 SSM 之间做推荐，并明确说明内存与质量权衡。

## 练习

1. 运行 `code/main.py`，计算 32 层纯 Transformer（隐藏维度 4096、32 个头）与相同形状 Jamba-1 混合模型在 256k 上下文下的 KV 缓存。验证 AI21 论文声称的约 8 倍内存减少。

2. 修改计算器，模拟 1:3 混合（4 Mamba : 1 Attention）和 1:15 混合（14 Mamba : 1 Attention），绘制 KV 缓存随比例变化的图。在哪个比例下 KV 缓存等于 SSM 状态内存？

3. 阅读 Jamba 论文（arXiv:2403.19887）第 3 节。解释 AI21 为什么使用 Mamba-1 而不是更快的 Mamba-2。提示：混合消融部分记录了原因。

4. 计算 Jamba 1.5 Large 中“每隔一层 MoE”的参数开销（总 398B、激活 94B）。将激活比例与 DeepSeek-V3（37B/671B）比较，解释为什么 Jamba 架构会让激活比例更高。

5. 阅读 Mamba-3 论文（arXiv:2603.15569）第 3 节，用三句话解释为什么复数值状态更新等价于依赖数据的旋转嵌入，并将答案联系到第 7 阶段 · 第 04 课的 RoPE 推导。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| 状态空间模型（SSM） | “带固定状态的递归” | 使用可学习递归 `h_t = A h_{t-1} + B x_t` 的层；每个词元的内存为常数 |
| 选择性 SSM | “Mamba 的技巧” | 依赖数据的 A、B、C 参数，使模型在线性时间内获得类似门控的选择性 |
| 注意力–Mamba 比例 | “有多少注意力层” | 在 Jamba 中，`l = 8` 表示每 7 个 Mamba 层配 1 个注意力层 |
| Jamba 块 | “8 层分组” | 一个注意力层 + 七个 Mamba 层 + 交替位置上的 MoE |
| SSM 状态 | “隐藏缓冲区” | 替代 Mamba 层 KV 缓存的固定大小、逐层状态 |
| 256k 上下文 | “Jamba 的旗舰数字” | Jamba-1 可以放入单张 80GB GPU 的序列长度；相同规模纯 Transformer 不行 |
| Mamba-3 | “2026 纯 SSM” | 当前最佳纯 SSM 架构，具有复数状态 + MIMO，是混合模型重建的基线 |
| MIMO | “多输入多输出” | Mamba-3 的创新，用矩阵值投影替代逐特征标量投影 |
| 指数–梯形离散化 | “Mamba-3 的递归” | 更有表达力的递归，涵盖 Mamba-2 的欧拉方法离散化 |
| 混合架构 | “混合注意力与 SSM” | 交错 Transformer 与 SSM 层的任意模型；Jamba 是生产级范例 |

## 延伸阅读

- [Lieber et al. — Jamba: A Hybrid Transformer-Mamba Language Model (arXiv:2403.19887)](https://arxiv.org/abs/2403.19887) — 原始 Jamba 论文、比例消融与 256k 上下文主张
- [AI21 — Jamba 1.5: Hybrid Transformer-Mamba at Scale (arXiv:2408.12570)](https://arxiv.org/abs/2408.12570) — 扩展家族、398B/94B 与 12B/52B 公开版本
- [Gu, Dao — Mamba: Linear-Time Sequence Modeling with Selective State Spaces (arXiv:2312.00752)](https://arxiv.org/abs/2312.00752) — Jamba 构建于其上的选择性 SSM 论文
- [Dao, Gu — Mamba-2 (arXiv:2405.21060)](https://arxiv.org/abs/2405.21060) — 简化的结构化状态空间后继者
- [Lahoti et al. — Mamba-3 (arXiv:2603.15569, ICLR 2026)](https://arxiv.org/abs/2603.15569) — 复数状态、MIMO 与 2026 年纯 SSM 前沿
- [Gu et al. — Efficiently Modeling Long Sequences with Structured State Spaces (arXiv:2111.00396)](https://arxiv.org/abs/2111.00396) — S4 论文，LLM 的 SSM 谱系起点
