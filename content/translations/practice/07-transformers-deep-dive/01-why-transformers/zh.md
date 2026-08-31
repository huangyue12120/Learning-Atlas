---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/07-transformers-deep-dive/01-why-transformers/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: a1112a1e30e5eb677b718e7e663972f6a487641feaf023c701c1a87c8b18db39
status: reviewed
---

# 为什么是 Transformer——RNN 的问题

> RNN 一次处理一个词元，Transformer 一次处理所有词元。这项架构赌注改变了 2017 年后深度学习中的每条扩展曲线。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 3（深度学习核心）、Phase 5 第 09 课（序列到序列）、Phase 5 第 10 课（注意力机制）  
**预计时间：** 约 45 分钟

## 问题

2017 年以前，地球上每个最先进的序列模型——语言、翻译、语音——都是循环神经网络。LSTM 和 GRU 连续五年赢下相当于 ImageNet 地位的翻译基准。它们是当时唯一可用的工具。

它们有三项致命弱点。顺序计算意味着无法沿时间轴并行：词元 `t+1` 需要词元 `t` 的隐藏状态。长度为 1,024 的序列意味着在每周期可执行 1,000,000 次浮点运算的 GPU 上做 1,024 个串行步骤。训练实际时间随序列长度线性增长，而硬件却是为并行计算设计的。

梯度消失意味着向前追溯 50 个词元的信息已经被压过 50 层非线性。门控循环单元（LSTM、GRU）缓解了这种挤压，却从未彻底消除。长距离依赖——“the book I read last summer on a plane to Kyoto was…”——经常失败。

固定宽度隐藏状态意味着，解码器看到任何信息前，编码器必须把整个源序列压进一个向量。无论源序列有 5 个还是 500 个词元，瓶颈形状都一样。

2017 年论文《Attention Is All You Need》提出了一个激进方案：完全去掉循环，让每个位置并行关注其他所有位置。用一次大型矩阵乘法训练，而不是执行 1,024 次串行计算。

到 2026 年，该成果主导了每一种模态：语言（GPT-5、Claude 4、Llama 4）、视觉（ViT、DINOv2、SAM 3）、音频（Whisper）、生物学（AlphaFold 3）、机器人（RT-2）。同一个块，不同的输入。

## 概念 <!-- learning-atlas: the-concept -->

![RNN 串行计算与 Transformer 并行注意力](../assets/rnn-vs-transformer.svg)

**循环是一种瓶颈。** RNN 计算 `h_t = f(h_{t-1}, x_t)`，每一步依赖前一步，无法在 `h_4` 前计算 `h_5`。现代 GPU 有超过 10,000 个并行核心；处理长序列时，这会浪费 99% 的硅片。

**注意力是一种广播。** 自注意力针对每一对 `(i, j)` 同时计算 `output_i = sum_j(a_ij * v_j)`。整个 N×N 注意力矩阵通过一次批量矩阵乘法填充，不存在某一步依赖另一步的情况。GPU 很喜欢它。

**加速不是一个常数。** 它是 `O(N)` 串行深度与 `O(1)` 串行深度的差别。实践中，在 N=512 且硬件相同的条件下，Transformer 每轮训练速度快 5–10 倍；随着序列变长，差距会继续扩大，直到撞上注意力的 `O(N²)` 内存墙（Flash Attention 后来修复了它——见第 12 课）。

**Transformer 的代价。** 注意力内存按 `O(N²)` 增长。2K 上下文没有问题；128K 上下文则需要滑动窗口、RoPE 外推、Flash Attention 分块，或线性注意力变体。循环在时间和内存上都是 `O(N)`；Transformer 用内存换时间，再通过并行把时间优势赢回来。

**归纳偏置的转变。** RNN 假设局部性和近期性，Transformer 不做假设——每一对位置都可能互相关注。因此，Transformer 需要更多数据才能训练好，但数据充足后可以扩展得更远。Chinchilla（2022）将其形式化：给定足够词元，Transformer 总会击败参数量相同的 RNN。

```figure
rnn-vs-parallel
```

## 动手实现

这里没有神经网络——我们用数值方式模拟核心瓶颈，让你在自己的笔记本电脑上直观感受差距。

### 步骤 1：测量串行深度

参见 `code/main.py`。我们构建两个函数：一个把序列编码为加法链（串行，类似 RNN），另一个把它编码为并行归约（广播，类似注意力）。数学相同，依赖图不同。

```python
def rnn_style(xs):
    h = 0.0
    for x in xs:
        h = 0.9 * h + x   # can't parallelize: h depends on previous h
    return h

def attention_style(xs):
    return sum(xs) / len(xs)  # every x is independent
```

我们对长度最高为 100,000 的序列计时。RNN 版本为 O(N)，并且只能使用单条 CPU 流水线。即使在纯 Python 中，当长度 ≥ 1,000 时，注意力风格的归约也会胜出，因为 Python 的 `sum()` 在 C 中实现，迭代时没有每一步的解释器开销。

### 步骤 2：计算理论操作数

两种算法都执行 N 次加法。区别在于*依赖深度*：下一个操作开始前，必须顺序完成多少个操作。RNN 深度 = N。采用树形归约时注意力深度 = log(N)，采用并行扫描时为 1。决定 GPU 时间的是深度，而不是操作数。

### 步骤 3：长序列上的经验扩展

我们打印一张计时表，让 O(N) 差距显现出来。在 2026 年的 Mac 笔记本电脑上，长度低于 1,000 的序列快得无法测量；长度为 100,000 时则呈现清晰的线性扫描。把它扩展到 16,384 词元的 Transformer，并想象一个 12 层 LSTM 等价模型，就能理解实际训练时间为何在 2016 年成为阻碍。

## 用于实践

2026 年仍应选择 RNN 的情况：

| 情况 | 选择 |
|------|------|
| 流式推理、每次一个词元、常数内存 | RNN 或状态空间模型（Mamba、RWKV） |
| 超长序列（>100 万词元），注意力内存爆炸 | 线性注意力、Mamba 2、Hyena |
| 没有矩阵乘法加速器的边缘设备 | 在 FLOPs/瓦上，深度可分 RNN 仍然胜出 |
| 其他任何情况（训练、批量推理、上下文不超过 128K） | Transformer |

Mamba 等状态空间模型（SSM）本质上是结构化参数的 RNN，兼具两者优势：`O(N)` 扫描内存，并可通过选择性扫描并行训练。它们能恢复 Transformer 90% 的质量，同时在长上下文上扩展得更好。到 2026 年，大多数前沿实验室会训练混合 SSM + Transformer 模型（如 Jamba、Samba）——循环并没有消亡，而是成为一个组件。

## 交付成果

参见 `outputs/skill-architecture-picker.md`。该技能根据序列长度、吞吐量与训练预算约束，为新的序列问题选择架构。对于超过 10 亿词元的训练任务，如果不说明取舍，就必须拒绝推荐纯 RNN。

## 练习

1. **简单。** 取 `code/main.py` 中的 `rnn_style`，把标量隐藏状态替换为长度 64 的隐藏状态向量，再次测量。串行开销会怎样随隐藏状态维度增长？
2. **中等。** 用纯 Python 实现并行前缀和（Hillis-Steele 扫描）。验证它在长度 1024 时与串行扫描产生相同数值输出，并计算深度。
3. **困难。** 把注意力风格归约移植到 GPU 上的 PyTorch。将序列长度从 64 扫到 65,536，为两种实现计时，绘图并解释曲线形状。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| 循环（recurrence） | “RNN 是串行的” | 步骤 `t` 依赖步骤 `t-1` 的计算，迫使时间轴串行执行。 |
| 串行深度（serial depth） | “计算图有多深” | 最长依赖操作链；即使硬件无限，也限制实际时间。 |
| 注意力（attention） | “让词元互相查看” | 加权和 `sum_j a_ij v_j`，其中 `a_ij` 来自位置 i 与 j 的相似度分数。 |
| 上下文窗口 | “模型能看到多少” | 注意力层可接收的位置数；二次内存成本在此增长。 |
| 归纳偏置 | “架构内置的假设” | 对数据形态的先验；CNN 假设平移不变性，RNN 假设近期性。 |
| 状态空间模型 | “背后有代数的 RNN” | 通过结构化状态空间矩阵实现并行训练的循环模型。 |
| 二次瓶颈 | “上下文为何如此昂贵” | 注意力内存按序列长度 `O(N²)` 增长；Flash Attention 只隐藏常数，不改变复杂度。 |

## 延伸阅读

- [Vaswani 等（2017）. Attention Is All You Need](https://arxiv.org/abs/1706.03762)——让循环在主流 NLP 中退场的论文。
- [Bahdanau、Cho、Bengio（2014）. Neural MT by Jointly Learning to Align and Translate](https://arxiv.org/abs/1409.0473)——注意力诞生之处，当时它仍附着在 RNN 上。
- [Hochreiter、Schmidhuber（1997）. Long Short-Term Memory](https://www.bioinf.jku.at/publications/older/2604.pdf)——最初的 LSTM 论文，以备查阅。
- [Gu、Dao（2023）. Mamba: Linear-Time Sequence Modeling with Selective State Spaces](https://arxiv.org/abs/2312.00752)——现代循环模型对 Transformer 的回应。
