---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/07-transformers-deep-dive/14-build-a-transformer-capstone/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 1f8468652dd27eb7b8005038ce04c75fd536e18d887f7a8bc507d2c8fd42ced9
status: reviewed
---

# 从零构建 Transformer——综合项目

> 十三课，一个模型，不走捷径。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 7 第 01～13 课，不要跳过。  
**预计时间：** 约 120 分钟

## 问题

你已经读过每篇论文，也实现了注意力、多头拆分、位置编码、编码器与解码器块、BERT 与 GPT 损失、MoE 和 KV 缓存。现在要让它们在一个真实任务中协同工作。

综合项目的目标是：在字符级语言建模任务上端到端训练一个小型仅解码器 Transformer。它阅读莎士比亚作品，再生成新的莎士比亚风格文本。模型足够小，可以在笔记本电脑上用不到 10 分钟完成训练；实现又足够正确，只要换上更大的数据集并延长训练，就能得到一个真正的语言模型。

这是本课程的“nanoGPT”。它并非原创——Karpathy 2023 年的 nanoGPT 教程是每位学生至少都会写一次的参考实现。我们沿用它的整体结构，并根据前面学过的内容重新组织。

## 概念 <!-- learning-atlas: the-concept -->

![从零构建 Transformer 的框图](../assets/capstone.svg)

带注释的架构如下：

```
输入词元 (B, N)
   │
   ▼
词元嵌入 + 位置嵌入                    ◀── 第 04 课（可选 RoPE）
   │
   ▼
┌──── 块 × L ──────────────────────┐
│  RMSNorm                          │  ◀── 第 05 课
│  MultiHeadAttention（因果）       │  ◀── 第 03 + 07 课（因果掩码）
│  残差连接                         │
│  RMSNorm                          │
│  SwiGLU FFN                       │  ◀── 第 05 课
│  残差连接                         │
└────────────────────────────────── ┘
   │
   ▼
最终 RMSNorm
   │
   ▼
lm_head（与词元嵌入共享权重）
   │
   ▼
logits (B, N, V)
   │
   ▼
错位一位的交叉熵                       ◀── 第 07 课
```

### 我们要交付什么

- `GPTConfig`——集中配置所有超参数。
- `MultiHeadAttention`——因果、批量，并可选择类似 Flash 的路径（PyTorch 的 `scaled_dot_product_attention`）。
- `SwiGLUFFN`——现代 FFN。
- `Block`——预归一化、用残差连接包裹的注意力 + FFN。
- `GPT`——嵌入、堆叠块、LM 头和 `generate()`。
- 使用 AdamW、余弦学习率和梯度裁剪的训练循环。
- 面向莎士比亚文本的字符级分词器。

### 我们不交付什么

- RoPE——已在第 04 课从概念上实现。为简单起见，这里使用可学习位置嵌入；练习会要求你换成 RoPE。
- 生成期间的 KV 缓存——每个生成步骤都会在完整前缀上重新计算注意力。速度更慢，但更简单；练习会要求你添加 KV 缓存。
- Flash Attention——只要输入满足条件，PyTorch 2.0+ 会自动分派；我们使用 `F.scaled_dot_product_attention`。
- MoE——每个块只有一个 FFN。你已在第 11 课学习过 MoE。

### 目标指标

在 Mac M2 笔记本电脑上，用 `tinyshakespeare.txt` 训练一个 4 层、4 头、d_model=128 的 GPT 2,000 步：

- 训练损失在约 6 分钟内从约 4.2（随机水平）收敛到约 1.5。
- 采样输出呈现莎士比亚的形态：会出现古体词、换行以及“ROMEO:”之类的专名。
- 验证损失（留出的最后 10% 文本）紧跟训练损失；在这个模型大小和预算下不会过拟合。

```figure
n5-block-stack
```

## 动手构建

本课使用 PyTorch。安装 `torch` 即可，CPU 版本也能运行。参见 `code/main.py`。脚本会处理：

- 缺少 `tinyshakespeare.txt` 时下载它，也可以读取本地副本。
- 字节级字符分词器。
- 按 90/10 划分训练集与验证集。
- 在支持的硬件上使用 bf16 自动混合精度的训练循环。
- 训练完成后的采样。

### 第 1 步：数据

```python
text = open("tinyshakespeare.txt").read()
chars = sorted(set(text))
stoi = {c: i for i, c in enumerate(chars)}
itos = {i: c for c, i in stoi.items()}
encode = lambda s: [stoi[c] for c in s]
decode = lambda xs: "".join(itos[x] for x in xs)
```

共有 65 个不同字符，词表很小，用 4 字节就能表示 `vocab_size`。没有 BPE，也没有分词器带来的麻烦。

### 第 2 步：模型

参见 `code/main.py`。这个块就是第 05 课中的标准实现：预归一化、RMSNorm、SwiGLU 和因果 MHA。4/4/128 配置的参数量约为 800K。

### 第 3 步：训练循环

随机取得一批长度为 256 词元的窗口，前向传播，计算错位一位的交叉熵，反向传播，执行 AdamW 更新，记录日志，然后重复。

```python
for step in range(max_steps):
    x, y = get_batch("train")
    logits = model(x)
    loss = F.cross_entropy(logits.view(-1, vocab_size), y.view(-1))
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    opt.step()
    opt.zero_grad()
```

### 第 4 步：采样

给定一个提示，反复进行前向传播，从 top-p logits 中采样并追加词元，然后继续，生成 500 个词元后停止。

### 第 5 步：阅读输出

训练 2,000 步后：

```
ROMEO:
Away and mild will not thy friend, that thou shalt wit:
The chief that well shame and hath been his friends,
...
```

它还不是莎士比亚，但已经具有莎士比亚文本的形态。一个约 800K 参数、在笔记本电脑上训练 6 分钟的模型能达到这个结果，说明实现已经成功。

## 使用方法

这个综合项目是一套参考架构。要把它扩展成真正可用的系统，可以完成以下三项工作：

1. **更换分词器。** 使用 BPE（例如 `tiktoken.get_encoding("cl100k_base")`）。词表大小会从 65 跃升至约 50,000，因此模型容量也要相应增大。
2. **在更大语料库上训练。** 使用 `OpenWebText` 或 `fineweb-edu`（HuggingFace）。在单块 A100 上用 10B 词元训练一个 125M 参数 GPT，大约需要 24 小时。
3. **添加 RoPE + KV 缓存 + Flash Attention。** 下面的练习会依次带你完成。

最终会得到一个可以生成流畅英语的 125M 参数 GPT。它不是前沿模型，但只是把同一条代码路径放大，就构成了 Karpathy、EleutherAI 和 Allen Institute 在 2026 年训练研究检查点的基础。

## 交付成果

参见 `outputs/skill-transformer-review.md`。这个技能会依据前 13 课的知识，全面检查一个从零实现的 Transformer 是否正确。

## 练习

1. **简单。** 运行 `code/main.py`。验证训练后最后一步的验证损失低于 2.0。把 `max_steps` 从 2,000 改为 5,000——验证损失是否继续改善？
2. **中等。** 用 RoPE 替换可学习位置嵌入。在 `MultiHeadAttention` 内对 Q 和 K 应用旋转。训练并验证其验证损失至少同样低。
3. **中等。** 在采样循环中实现 KV 缓存。分别在有无缓存时生成 500 个词元。笔记本电脑上的实际耗时应改善 5～20 倍。
4. **困难。** 为模型添加第二个头，用来预测下下一个词元（MTP——DeepSeek-V3 的多词元预测）。联合训练。它有帮助吗？
5. **困难。** 把每个块中的单一 FFN 换成 4 专家 MoE，使用路由器 + top-2 路由。在活跃参数量相同时，观察验证损失如何变化。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| nanoGPT | “Karpathy 的教程仓库” | 最小化的仅解码器 Transformer 训练代码，约 300 行；经典参考实现。 |
| tinyshakespeare | “标准玩具语料库” | 约 1.1 MB 文本；2015 年以来几乎所有字符语言模型教程都使用它。 |
| 权重绑定嵌入 | “共享输入/输出矩阵” | LM 头权重 = 词元嵌入矩阵的转置；节省参数并提高质量。 |
| bf16 自动混合精度 | “训练精度技巧” | 前向与反向传播使用 bf16，优化器状态保留 fp32；2021 年以来的标准做法。 |
| 梯度裁剪 | “阻止尖峰” | 把全局梯度范数限制在 1.0；防止训练发散。 |
| 余弦学习率调度 | “2020 年后的默认方案” | 学习率先线性升高（预热），再按余弦形状衰减到峰值的 10%。 |
| MFU | “模型 FLOP 利用率” | 实际 FLOPs / 理论峰值；2026 年，稠密模型达到 40%、MoE 达到 30% 已很出色。 |
| 验证损失 | “留出集损失” | 模型从未见过的数据上的交叉熵；用于检测过拟合。 |

## 延伸阅读

- [The Annotated Transformer（Harvard NLP）](https://nlp.seas.harvard.edu/annotated-transformer/)——经典的带注释实现。
