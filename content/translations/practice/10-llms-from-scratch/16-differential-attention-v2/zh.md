---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/10-llms-from-scratch/16-differential-attention-v2/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 89705e3112b66cdf2bb5444d632cafb5c4b168fe4693e534c92fb0d1051ae5df
status: reviewed
---

# 差分注意力（V2）

> Softmax 注意力会在每个不匹配的词元上分散少量概率。超过 10 万个词元后，这些噪声会累积并淹没信号。Differential Transformer（Ye 等，ICLR 2025）通过计算两个 softmax 的差值、减去共享噪声底来修复这一问题。DIFF V2（Microsoft，2026 年 1 月）是面向生产栈的重写版：解码延迟与基线 Transformer 匹配，不需要自定义 kernel，并兼容 FlashAttention。本课将从 V1 讲到 V2，并提供一个可以用标准库 Python 运行的差分操作玩具实现。

**类型：** 构建
**语言：** Python（标准库）
**前置课程：** 第 7 阶段第 02 课（自注意力）、第 7 阶段第 15 课（注意力变体）、第 10 阶段第 14 课（架构漫游）
**预计时间：** 约 60 分钟

## 学习目标

- 准确说明为什么 softmax 注意力存在噪声底，以及它为什么会随着上下文长度增长。
- 推导差分注意力公式，解释相减为何能抵消共享噪声成分，同时保留信号。
- 梳理 V1 到 V2 的差异：什么变快了、什么变简单了、什么变稳定了，以及每项变化为什么对生产预训练必不可少。
- 用纯 Python 从零实现差分注意力，并在合成的信号加噪声查询上经验验证噪声抵消性质。

## 问题

标准 softmax 注意力有一个在规模化时会变成操作难题的数学性质。对于查询 `q`，注意力权重是 `softmax(qK^T / sqrt(d))`。Softmax 永远不会产生精确的零——每个不匹配的词元都会得到一些正概率。这些残余概率就是噪声，而且会随着上下文长度增长。在 128k 个词元时，即使每个不匹配词元只得到 0.001% 的概率，127,999 个词元合起来也会贡献约 12%。模型必须学会绕开一个不断增长的噪声底。

经验上，这表现为注意力头干扰：长上下文 RAG 中出现幻觉引用、10 万词元检索任务中的“中间遗失”失败，以及 32k 之后针落草垛基准上细微的准确率下降。Differential Transformer 论文（arXiv:2410.05258，ICLR 2025）测量了这一差距：与同规模基线相比，DIFF Transformer 的困惑度更低、长上下文准确率更高、幻觉更少。

DIFF V1 有三个问题，使它无法进入前沿预训练流水线。它的值缓存每个解码步骤都必须加载两次；它要求自定义 CUDA kernel，破坏了 FlashAttention 兼容性；它的逐头 RMSNorm 会使 70B 以上规模的长时间训练不稳定。DIFF V2（Microsoft unilm 博客，2026 年 1 月 20 日）修复了这三点。本课会讲解两个版本，构建差分算子，并在一个玩具查询上对噪声抵消进行基准测试。

## 概念

### Softmax 的噪声底

对于查询 `q` 和键 `K = [k_1, ..., k_N]`，注意力权重为：

```
w_i = exp(q . k_i / sqrt(d)) / sum_j exp(q . k_j / sqrt(d))
```

没有任何 `w_i` 会是零。如果 `k_i` 与 `q` 完全无关，分数 `q . k_i` 也不是 0——它会围绕零波动，方差为 `||q||^2 / d`。经过 softmax 归一化后，每个无关词元仍会对加权和贡献 `O(1/N)`。无关词元的总贡献为 `O((N-1)/N) = O(1)`，并不是一个很小的量。

模型真正想要的更像硬 top-k：匹配词元获得高权重，其他位置接近零。Softmax 本身过于平滑，无法直接做到这一点。

### 差分思想 <!-- learning-atlas: the-differential-idea -->

将每个头的 Q 和 K 投影拆成两部分：Q = (Q_1, Q_2)，K = (K_1, K_2)。计算两张注意力图：

```
A_1 = softmax(Q_1 K_1^T / sqrt(d))
A_2 = softmax(Q_2 K_2^T / sqrt(d))
```

输出：

```
DiffAttn = (A_1 - lambda * A_2) V
```

相减会抵消两张图共享的噪声分布。如果两张图在 127k 个无关词元上都有大致均匀的权重（随机初始化时确实如此），这些权重就会相互抵消。信号——少数真正相关词元上的尖峰权重——只有在两张图以相同幅度同时出现时才会被抵消；模型训练之后不会发生这种情况。

`lambda` 是每个头的可学习标量，参数化为 `lambda = exp(lambda_q1 dot lambda_k1) - exp(lambda_q2 dot lambda_k2) + lambda_init`。它可以是负数。`lambda_init` 默认是一个较小的正数，例如 0.8。

### 为什么这符合有头的噪声抵消

想象两个嘈杂的麦克风同时录制同一个人的声音。它们都捕捉到了说话人的声音和相关的背景噪声。将一个信号减去另一个信号，共享的噪声就会消失。由于两个信号在相位或幅度上存在足够差异，声音本身仍然保留下来。每个头的 `lambda` 正是在学习这个平衡。

### V1 与 V2：差异

V1 保持与基线 Transformer 相同的参数量。为了让每个头拥有两个查询，它将头维度减半。这牺牲了头的表达能力，更麻烦的是还将每个头的值缓存减半。解码时，每一步都必须加载两次值缓存（每个 softmax 分支一次）。结果是：尽管参数量相同，解码仍然比基线慢。

V2 将查询头数加倍，同时保持 KV 头数不变（从上投影中借用参数）。头维度保持与基线相同。相减之后，额外维度会被投影回去，以匹配基线 Transformer 的 O_W 投影。三件事同时发生：

1. 解码速度匹配基线（KV 缓存只加载一次）。
2. FlashAttention 无需改变即可运行（不需要自定义 kernel）。
3. 解码时的算术强度提高（每加载一个 HBM 字节执行更多计算）。

V2 还移除了 V1 用来稳定相减的逐头 RMSNorm。在 70B 级别的预训练规模上，该 RMSNorm 会使训练后期不稳定。V2 用更简单的初始化方案替代它，在没有额外模块的情况下保持训练稳定。

### 什么时候应该使用它

| 工作负载 | 收益 |
|----------|---------|
| 长上下文 RAG（64k+） | 更干净的注意力图，更少的幻觉引用 |
| 针落草垛基准 | 32k 之后准确率显著提升 |
| 多文档问答 | 更少的跨文档干扰 |
| 8k 代码补全 | 收益有限，不值得改变架构 |
| 短聊天（< 4k） | 与基线几乎没有区别 |

收益会随上下文长度增长。在 4k 词元时，噪声底足够小，标准注意力没有问题；在 128k 时，它就会伤害你。

### 它与其他 2026 年旋钮如何叠加

| 特性 | 与 DIFF V2 兼容？ |
|---------|------------------------|
| GQA | 是（V2 增加 Q 头，而不是 KV 头） |
| MLA（DeepSeek） | 原则上是，目前没有将二者结合的已发表论文 |
| MoE | 是（注意力独立于 MLP 块） |
| RoPE | 是（不变） |
| YaRN / 长上下文缩放 | 是（正是 DIFF 最有帮助的场景） |
| FlashAttention | V2 是（V1 否） |
| 推测解码 | 是（注意力变化对推测解码循环不可见） |

```figure
differential-attention
```

## 动手实现

`code/main.py` 用纯 Python 实现了差分注意力。一个具有已知信号加噪声结构的玩具查询，可以让你直接测量噪声抵消比。

### 步骤 1：标准 softmax 注意力

标准库矩阵运算：使用列表的列表、手动矩阵乘法，以及先减去最大值来保证数值稳定性的 softmax。

```python
def softmax(row):
    m = max(row)
    exps = [math.exp(x - m) for x in row]
    s = sum(exps)
    return [e / s for e in exps]
```

### 步骤 2：将 Q、K 拆成两半

V1 风格：将头维度减半。V2 风格：保持头维度不变，将头数加倍。玩具实现为了教学清晰使用 V1——数学相同，只有记账方式不同。

### 步骤 3：两个 softmax 分支并相减

```python
A1 = [softmax([dot(q1, k) / scale for k in K1]) for q1 in Q1]
A2 = [softmax([dot(q2, k) / scale for k in K2]) for q2 in Q2]
diff_weights = [[a1 - lam * a2 for a1, a2 in zip(r1, r2)] for r1, r2 in zip(A1, A2)]
out = [[sum(w * v[j] for w, v in zip(row, V)) for j in range(d_v)] for row in diff_weights]
```

注意：输出权重可以是负数。这没有问题——值缓存仍然可以处理带符号的贡献，后续的 V 投影会吸收这个符号。

### 步骤 4：测量噪声抵消

构建一个长度为 1024 的合成序列。在已知位置放置信号词元，其余位置填充噪声。计算（a）标准 softmax 在信号位置上的注意力权重，以及（b）差分注意力权重。分别测量二者的信噪比。根据两条分支被训练得彼此不同的程度，DIFF 注意力通常能将信噪比提高 3 倍–10 倍。

### 步骤 5：V1 与 V2 的参数记账

给定配置（hidden=4096、heads=32、d_head=128），打印：

- 基线 Transformer：Q、K、V 的大小都是 `hidden * hidden`，MLP 为 4 * hidden。
- DIFF V1：Q、K 的大小都是 `hidden * hidden`，V 的大小是 `hidden * hidden`（不变），内部头维度减半。增加每头的 `lambda` 参数（O(heads * d_head)）。
- DIFF V2：Q 的大小为 `2 * hidden * hidden`，K 的大小为 `hidden * hidden`，V 的大小为 `hidden * hidden`。额外维度在 O_W 之前投影回去。增加同样的 `lambda` 参数。

玩具实现会测量 V2 的额外参数成本（每个注意力块大约增加 `hidden * hidden`），并打印出来。

## 使用它

截至 2026 年 4 月，DIFF V2 还没有在每个生产推理服务器中上线，但 vLLM 和 SGLang 正在进行集成。同时，这种模式已经出现在：

- Microsoft 内部的长上下文生产模型。
- 多个面向 256k 以上上下文的开放模型训练运行的研究复现中。
- 将 DIFF 注意力与交替层滑动窗口注意力结合的混合架构中。

2026 年，以下情况可以考虑使用它：

- 从零训练一个目标有效上下文超过 64k 的新模型。从一开始就加入差分注意力；之后重新训练的成本很高。
- 微调一个长上下文模型，而“中间遗失”失败主导了你的评估。在 Q 投影上使用 LoRA 可以近似 DIFF 结构。

以下情况不应该使用它：

- 你正在服务一个预训练的稠密模型，而且它的长上下文性能稳定。在已有权重上重新训练通常无法收回成本。
- 你的上下文始终小于 16k。噪声底可以忽略。

## 交付它

本课产出 `outputs/skill-diff-attention-integrator.md`。给定模型架构、目标上下文长度、幻觉画像和训练预算，它会生成将差分注意力加入新预训练运行或 LoRA 微调的集成计划。

## 练习

1. 运行 `code/main.py`。验证在合成查询上，差分注意力报告的信噪比高于标准 softmax 注意力。改变噪声幅度，找出标准注意力变得不可用的交叉点。

2. 对一个 7B 级模型（hidden=4096、heads=32、d_head=128、32 层），计算从基线到 DIFF V1、以及从基线到 DIFF V2 的参数量差值。展示哪些组件增加了参数，哪些保持不变。

3. 阅读 DIFF V1 论文（arXiv:2410.05258）第 3 节和 DIFF V2 Hugging Face 博客第 2 节。用两句话解释为什么 V1 的逐头 RMSNorm 是必要的，以及为什么 V2 可以移除它而不导致训练发散。

4. 实现一项消融：使用 `lambda = 0`（纯第一张 softmax）和 `lambda = 1`（完全相减）计算差分注意力。在合成查询上，测量信噪比如何随扫描变化，并找出使信噪比最大的 `lambda`。

5. 将玩具实现扩展到 GQA + DIFF V2。选择 8 个 KV 头和 32 个 Q 头。展示 KV 缓存大小与配置相同（8、32）的基线 GQA 模型一致。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|----------------|------------------------|
| Differential attention | “两个 softmax 相减” | 将 Q、K 拆成两半，计算两张 softmax 图，从第一张中减去经 lambda 缩放的第二张，再与 V 相乘 |
| Noise floor | “softmax 的非零尾部” | softmax 分给每个无关词元的 O(1/N) 权重，在长上下文中合计为 O(1) |
| lambda | “相减的尺度” | 每头的可学习标量，参数化为 `exp(lq1.lk1) - exp(lq2.lk2) + lambda_init`，可以为负 |
| DIFF V1 | “ICLR 2025 版本” | 原始 Differential Transformer；为了保持参数量不变而将头维度减半，需要自定义 kernel，解码更慢 |
| DIFF V2 | “2026 年 1 月的修复版” | 将 Q 头加倍并保持 KV 头不变；解码速度匹配基线，并可使用 FlashAttention |
| Per-head RMSNorm | “V1 稳定器” | V1 在相减之后使用的额外归一化；V2 将其移除，以避免训练后期不稳定 |
| Signal-to-noise ratio | “浪费了多少注意力” | 真实信号位置的权重与无关位置平均权重之比 |
| Lost in the middle | “长上下文失败模式” | 文档位于长上下文中间时检索准确率下降的经验现象；DIFF 注意力可以缓解它 |
| Arithmetic intensity | “每次加载字节对应的 FLOPs” | V2 通过每次 KV 加载对应更多查询，提高了解码时的这一比率；对受内存限制的解码很重要 |

## 延伸阅读

- [Ye et al. — Differential Transformer (arXiv:2410.05258, ICLR 2025)](https://arxiv.org/abs/2410.05258) — 原始论文，包含噪声抵消理论和长上下文消融实验
- [Microsoft unilm — Differential Transformer V2 (Hugging Face blog, January 2026)](https://huggingface.co/blog/microsoft/diff-attn-v2) — 面向生产栈的重写版，匹配基线解码速度并兼容 FlashAttention
- [Understanding Differential Transformer Unchains Pretrained Self-Attentions (arXiv:2505.16333)](https://arxiv.org/abs/2505.16333) — 分析相减为何能够恢复预训练注意力结构的理论工作
- [Shared DIFF Transformer (arXiv:2501.17900)](https://arxiv.org/html/2501.17900) — 参数共享变体
- [Vaswani et al. — Attention Is All You Need (arXiv:1706.03762)](https://arxiv.org/abs/1706.03762) — DIFF 用来相减的基线 Transformer
- [Liu et al. — Lost in the Middle (arXiv:2307.03172)](https://arxiv.org/abs/2307.03172) — DIFF 注意力针对的长上下文基准
