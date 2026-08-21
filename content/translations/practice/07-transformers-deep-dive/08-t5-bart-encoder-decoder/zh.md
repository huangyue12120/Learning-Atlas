---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/07-transformers-deep-dive/08-t5-bart-encoder-decoder/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 26b9204335f4793b7910e02a3a03820cd0ea0c7d47a2aa9c37580dcac67baeb1
status: reviewed
---

# T5、BART——编码器—解码器模型

> 编码器负责理解，解码器负责生成。把它们重新组合，就得到专为输入 → 输出任务构建的模型：翻译、摘要、改写、转录。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 7 第 05 课（完整 Transformer）、Phase 7 第 06 课（BERT）、Phase 7 第 07 课（GPT）  
**预计时间：** 约 45 分钟

## 问题

纯解码器 GPT 和纯编码器 BERT 分别为了不同目标简化了 2017 年架构。但许多任务天然具有输入—输出形式：

- 翻译：英语 → 法语。
- 摘要：5000 词元文章 → 200 词元摘要。
- 语音识别：音频词元 → 文本词元。
- 结构化提取：散文 → JSON。

对于这些任务，编码器—解码器最贴合。编码器生成源内容的稠密表示，解码器生成输出，并在每一步通过交叉注意力读取该表示。训练时在输出侧错位一个词元。损失与 GPT 相同，只是以编码器输出为条件。

两篇论文定义了现代方法：

1. **T5**（Raffel 等，2019）。“文本到文本迁移 Transformer”。把每个 NLP 任务重新表述为文本输入、文本输出。单一架构、单一词表、单一损失。使用掩码片段预测预训练（破坏输入中的片段，并在输出中解码它们）。
2. **BART**（Lewis 等，2019）。“双向与自回归 Transformer”。去噪自动编码器：以多种方式破坏输入（打乱、遮蔽、删除、旋转），让解码器重建原文。

到 2026 年，编码器—解码器形式继续存在于输入结构很重要的场景：

- Whisper（语音 → 文本）。
- Google 翻译技术栈。
- 一些具有独立上下文与编辑结构的代码补全 / 修复模型。
- 用于结构化推理任务的 Flan-T5 及其变体。

纯解码器赢得了聚光灯，但编码器—解码器从未消失。

## 概念

![带交叉注意力的编码器—解码器](../assets/encoder-decoder.svg)

### 前向循环

```text
源词元 ─▶ 编码器 ─▶ (N_src, d_model)  ──┐
                                         │
目标词元 ─▶ 解码器块                     │
           ├─▶ 带遮蔽的自注意力          │
           ├─▶ 交叉注意力 ◀──────────────┘
           └─▶ FFN
          ↓
        下一词元 logits
```

关键在于，编码器对每个输入只运行一次。解码器自回归运行，但每一步都通过交叉注意力读取*同一个*编码器输出。对于长输入，缓存编码器输出可以免费加速。

### T5 预训练——片段破坏

随机选择输入片段（平均长度 3 个词元，总量 15%）。把每个片段替换为唯一哨兵：`<extra_id_0>`、`<extra_id_1>` 等。解码器只输出被破坏片段，并以其哨兵为前缀：

```text
源：  The quick <extra_id_0> fox jumps <extra_id_1> dog
目标：<extra_id_0> brown <extra_id_1> over the lazy
```

它比预测整个序列成本更低。在 T5 论文的消融实验中，与 MLM（BERT）和前缀语言模型（UniLM）具有竞争力。

### BART 预训练——多噪声去噪

BART 尝试五种加噪函数：

1. 词元遮蔽。
2. 词元删除。
3. 文本填充（遮蔽一个片段，解码器插入正确长度的内容）。
4. 句子置换。
5. 文档旋转。

组合文本填充 + 句子置换会产生最佳下游结果。解码器始终重建原文。BART 的输出是完整序列，而非只有被破坏片段，因此预训练计算量高于 T5。

### 推理

与 GPT 一样自回归生成。贪心 / 束搜索 / top-p 采样都适用。束搜索（宽度 4–5）是翻译和摘要的标准选择，因为输出分布比对话更窄。

### 2026 年如何选择变体

| 任务 | 使用编码器—解码器？ | 原因 |
|------|----------------------|------|
| 翻译 | 通常是 | 源序列明确；输出分布固定；束搜索有效 |
| 语音到文本 | 是（Whisper） | 输入模态与输出不同；编码器塑造音频特征 |
| 对话 / 推理 | 否，纯解码器 | 没有持久“输入”——对话本身就是序列 |
| 代码补全 | 通常否 | 带长上下文的纯解码器胜出；Qwen 2.5 Coder 等代码模型都是纯解码器 |
| 摘要 | 两者都可 | BART、PEGASUS 胜过早期纯解码器基线；现代纯解码器 LLM 已追平 |
| 结构化提取 | 两者都可 | T5 很干净，因为“文本 → 文本”可以容纳任意输出格式 |

约 2022 年后的趋势是：纯解码器接管过去由编码器—解码器拥有的任务，因为：(a) 指令微调后的纯解码器 LLM 可通过提示泛化到任何任务；(b) 扩展一种架构比两种更容易；(c) RLHF 假设存在解码器。编码器—解码器仍坚守输入模态不同（语音、图像），或束搜索质量很重要的场景。

```figure
encoder-decoder
```

## 动手实现

参见 `code/main.py`。我们为玩具语料实现 T5 风格片段破坏——这是本课最有用的单个组件，因为此后的每个编码器—解码器预训练配方中都会出现它。

### 步骤 1：片段破坏

```python
def corrupt_spans(tokens, mask_rate=0.15, mean_span=3.0, rng=None):
    """Pick spans summing to ~mask_rate of tokens. Return (corrupted_input, target)."""
    n = len(tokens)
    n_mask = max(1, int(n * mask_rate))
    n_spans = max(1, int(round(n_mask / mean_span)))
    ...
```

目标格式遵循 T5 约定：`<sent0> span0 <sent1> span1 ...`。被破坏输入把未修改词元与片段位置上的哨兵词元交错排列。

### 步骤 2：验证往返

给定被破坏输入和目标，重建原始句子。若破坏过程可逆，前向过程就定义良好。这是一项合理性检查——真实训练从不这样做，但测试成本低，能捕获片段记录中的差一错误。

### 步骤 3：BART 加噪

五个函数：`token_mask`、`token_delete`、`text_infill`、`sentence_permute`、`document_rotate`。组合其中两个并展示结果。

## 用于实践

Hugging Face 参考实现：

```python
from transformers import T5ForConditionalGeneration, T5Tokenizer
tok = T5Tokenizer.from_pretrained("google/flan-t5-base")
model = T5ForConditionalGeneration.from_pretrained("google/flan-t5-base")

inputs = tok("translate English to French: Attention is all you need.", return_tensors="pt")
out = model.generate(**inputs, max_new_tokens=32)
print(tok.decode(out[0], skip_special_tokens=True))
```

T5 的技巧是：把任务名称写进输入文本。每项任务都是文本输入、文本输出，因此同一个模型可以处理数十种任务。到 2026 年，该模式已被指令微调的纯解码器模型推广，但 T5 是第一个将其系统化的模型。

## 交付成果

参见 `outputs/skill-seq2seq-picker.md`。该技能根据输入—输出结构、延迟和质量目标，为新任务选择编码器—解码器或纯解码器。

## 练习

1. **简单。** 运行 `code/main.py`，对一个 30 词元句子应用片段破坏，验证把源中的非哨兵词元与解码后的目标片段拼接可以重现原文。
2. **中等。** 实现 BART 的 `text_infill` 噪声：把随机片段替换成单个 `<mask>` 词元，解码器必须推断正确的片段长度与内容。展示一个样本。
3. **困难。** 在微型英语 → Pig Latin 语料（200 对）上微调 `flan-t5-small`，在留出的 50 对样本上测量 BLEU。使用相同数据与计算量微调 `Llama-3.2-1B`，并进行比较。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| 编码器—解码器 | “Seq2seq Transformer” | 两个技术栈：用于输入的双向编码器，以及用于输出、带交叉注意力的因果解码器。 |
| 交叉注意力 | “源如何与目标对话” | 解码器的 Q × 编码器的 K/V；编码器信息进入解码器的唯一位置。 |
| 片段破坏 | “T5 的预训练技巧” | 用哨兵词元替换随机片段；解码器输出这些片段。 |
| 去噪目标 | “BART 的游戏” | 对输入应用加噪函数，训练解码器重建干净序列。 |
| 哨兵词元 | “`<extra_id_N>` 占位符” | 在源中标记被破坏片段、并在目标中重新标记它们的特殊词元。 |
| Flan | “指令微调的 T5” | 在 1800 多项任务上微调的 T5；使编码器—解码器在指令遵循上具有竞争力。 |
| 束搜索 | “解码策略” | 每一步保留前 k 个部分序列；翻译/摘要的标准方案。 |
| 教师强制 | “训练时输入” | 训练时向解码器输入真实的前一个输出词元，而非采样结果。 |

## 延伸阅读

- [Raffel 等（2019）. Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer](https://arxiv.org/abs/1910.10683)——T5。
- [Lewis 等（2019）. BART: Denoising Sequence-to-Sequence Pre-training for Natural Language Generation, Translation, and Comprehension](https://arxiv.org/abs/1910.13461)——BART。
- [Chung 等（2022）. Scaling Instruction-Finetuned Language Models](https://arxiv.org/abs/2210.11416)——Flan-T5。
- [Radford 等（2022）. Robust Speech Recognition via Large-Scale Weak Supervision](https://arxiv.org/abs/2212.04356)——Whisper，2026 年标准编码器—解码器。
- [Hugging Face `modeling_t5.py`](https://github.com/huggingface/transformers/blob/main/src/transformers/models/t5/modeling_t5.py)——参考实现。
