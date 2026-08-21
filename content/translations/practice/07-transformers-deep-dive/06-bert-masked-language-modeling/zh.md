---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/07-transformers-deep-dive/06-bert-masked-language-modeling/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 10d1685c0fc344868e948575ae3bf51cb0058e6b0f07a247c20eafcc858f7b70
status: reviewed
---

# BERT——掩码语言建模

> GPT 预测下一个词，BERT 预测缺失的词。一句话的差别——以及半个十年中所有嵌入形态的应用。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 7 第 05 课（完整 Transformer）、Phase 5 第 02 课（文本表示）  
**预计时间：** 约 45 分钟

## 问题

2018 年，每项 NLP 任务——情感分析、NER、问答、蕴含——都在自己的标注数据上从头训练专属模型。没有可以微调的“理解英语”预训练检查点。ELMo（2018）证明可以使用双向 LSTM 预训练上下文嵌入；它有所帮助，但不能泛化。

BERT（Devlin 等，2018）提出：如果取一个 Transformer 编码器，在互联网上的所有句子上训练，并迫使它根据两侧上下文预测缺失词，会怎样？之后只需在下游任务上微调一个头。它的参数效率令人耳目一新。

结果是：18 个月内，BERT 及其变体（RoBERTa、ALBERT、ELECTRA）主导了当时存在的每个 NLP 排行榜。到 2020 年，地球上每个搜索引擎、内容审核流水线和语义搜索系统中都有一个 BERT。

到 2026 年，仅编码器模型仍是分类、检索和结构化提取的正确工具——每个词元的运行速度比解码器快 5–10 倍，其嵌入则是每个现代检索技术栈的主干。ModernBERT（2024 年 12 月）使用 Flash Attention + RoPE + GeGLU，把架构推进到 8K 上下文。

## 概念

![掩码语言建模：选择词元、遮蔽并预测原词元](../assets/bert-mlm.svg)

### 训练信号

取一句话：`the quick brown fox jumps over the lazy dog`。

随机遮蔽 15% 的词元：

```text
输入：  the [MASK] brown fox jumps [MASK] the lazy dog
目标：  the  quick brown fox jumps  over  the lazy dog
```

训练模型预测被遮蔽位置的原始词元。因为编码器是双向的，预测位置 1 的 `[MASK]` 时可以使用位置 2+ 的 `brown fox jumps`。GPT 做不到这一点。

### BERT 掩码规则

在选中用于预测的 15% 词元中：

- 80% 替换为 `[MASK]`。
- 10% 替换为随机词元。
- 10% 保持不变。

为什么不总是使用 `[MASK]`？因为 `[MASK]` 从不会在推理时出现。如果 100% 被选位置都使用 `[MASK]`，模型就会学着期待它，从而在预训练和微调之间产生分布偏移。10% 随机 + 10% 不变让模型保持诚实。

### 下一句预测（NSP）——以及为何被移除

原始 BERT 还训练 NSP：给定句子 A 和 B，预测 B 是否紧跟在 A 后。RoBERTa（2019）做了消融实验，证明 NSP 不但没有帮助，反而有害。现代编码器会跳过它。

### 2026 年的变化：ModernBERT

2024 年 ModernBERT 论文使用 2026 年组件重建了整个块：

| 组件 | 原始 BERT（2018） | ModernBERT（2024） |
|------|-------------------|-------------------|
| 位置 | 学习绝对位置 | RoPE |
| 激活 | GELU | GeGLU |
| 归一化 | LayerNorm | Pre-norm RMSNorm |
| 注意力 | 完整稠密 | 交替局部（128）+ 全局 |
| 上下文长度 | 512 | 8192 |
| 分词器 | WordPiece | BPE |

它与 2018 年技术栈不同，原生支持 Flash Attention。在序列长度 8K 时，推理比 DeBERTa-v3 快 2–3 倍，GLUE 分数也更高。

### 2026 年仍应选择编码器的用例

| 任务 | 编码器胜过解码器的原因 |
|------|------------------------|
| 检索 / 语义搜索嵌入 | 双向上下文 = 每个词元的嵌入质量更好 |
| 分类（情感、意图、毒性） | 一次前向传播；无生成开销 |
| NER / 词元标注 | 逐位置输出，原生双向 |
| 零样本蕴含（NLI） | 编码器上的分类头 |
| RAG 重排序器 | 交叉编码器评分，比 LLM 重排序器快 10 倍 |

```figure
transformer-residual
```

## 动手实现

### 步骤 1：遮蔽逻辑

参见 `code/main.py`。函数 `create_mlm_batch` 接收词元 ID 列表、词表大小和遮蔽概率，返回输入 ID（已应用遮蔽）与标签（只在被遮蔽位置有值，其他位置为 -100——PyTorch 的忽略索引约定）。

```python
def create_mlm_batch(tokens, vocab_size, mask_prob=0.15, rng=None):
    input_ids = list(tokens)
    labels = [-100] * len(tokens)
    for i, t in enumerate(tokens):
        if rng.random() < mask_prob:
            labels[i] = t
            r = rng.random()
            if r < 0.8:
                input_ids[i] = MASK_ID
            elif r < 0.9:
                input_ids[i] = rng.randrange(vocab_size)
            # else: keep original
    return input_ids, labels
```

### 步骤 2：在微型语料上运行 MLM 预测

在词表大小为 20、包含 200 个句子的语料上，训练两层编码器 + MLM 头。不执行梯度计算——我们只做前向传播合理性检查。完整训练需要 PyTorch。

### 步骤 3：比较掩码类型

展示三路规则如何让模型在没有 `[MASK]` 时仍可使用。分别在未遮蔽句子和遮蔽句子上预测。因为模型在训练时见过两种模式，二者都应产生合理的词元分布。

### 步骤 4：微调分类头

在玩具情感数据集上，把 MLM 头替换为分类头。只训练分类头，冻结编码器。这是每个 BERT 应用遵循的模式。

## 用于实践

```python
from transformers import AutoModel, AutoTokenizer

tok = AutoTokenizer.from_pretrained("answerdotai/ModernBERT-base")
model = AutoModel.from_pretrained("answerdotai/ModernBERT-base")

text = "Attention is all you need."
inputs = tok(text, return_tensors="pt")
out = model(**inputs).last_hidden_state   # (1, N, 768)
```

**嵌入模型就是微调后的 BERT。** `sentence-transformers` 中的 `all-MiniLM-L6-v2` 等模型，是使用对比损失训练的 BERT。编码器相同，只是损失发生了变化。

**交叉编码器重排序器也是微调后的 BERT。** 对 `[CLS] query [SEP] doc [SEP]` 做成对分类。查询和文档之间的双向注意力，正是交叉编码器相比双编码器质量更高的原因。

**2026 年不应选择 BERT 的情况。** 任何生成任务。编码器没有合理的方式自回归生成词元。此外，若模型低于 10 亿参数，并且小型解码器可以在具有更多灵活性的同时达到相同质量（Phi-3-Mini、Qwen2-1.5B），也不应选择 BERT。

## 交付成果

参见 `outputs/skill-bert-finetuner.md`。该技能为新的分类或提取任务界定 BERT 微调范围（主干选择、分类头规范、数据、评估与停止条件）。

## 练习

1. **简单。** 运行 `code/main.py`，打印 10,000 个词元上的掩码分布。确认约 15% 被选中，其中约 80% 变成 `[MASK]`。
2. **中等。** 实现全词遮蔽：若一个词被切成多个子词，就全部遮蔽或一个都不遮蔽。测量它是否提高 500 句语料上的 MLM 准确率。
3. **困难。** 在公开数据集的 10,000 个句子上训练一个微型（2 层，d=64）BERT，并为 SST-2 情感任务微调 `[CLS]` 词元。与参数量匹配的纯解码器基线相比，谁会胜出？

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| MLM | “掩码语言建模” | 训练信号：随机用 `[MASK]` 替换 15% 的词元，并预测原词元。 |
| 双向 | “两边都看” | 编码器注意力没有因果遮蔽——每个位置都能看到其他所有位置。 |
| `[CLS]` | “池化词元” | 添加到每个序列开头的特殊词元；其最终嵌入用作句子级表示。 |
| `[SEP]` | “片段分隔符” | 分隔成对序列（如查询/文档、句子 A/B）。 |
| NSP | “下一句预测” | BERT 的第二项预训练任务；RoBERTa 证明它无用，2019 年后被移除。 |
| 微调 | “适配任务” | 保持编码器大体冻结；在其上训练小型下游任务头。 |
| 交叉编码器 | “重排序器” | 同时接收查询和文档作为输入、并输出相关性分数的 BERT。 |
| ModernBERT | “2024 年改版” | 使用 RoPE、RMSNorm、GeGLU、交替局部/全局注意力和 8K 上下文重建的编码器。 |

## 延伸阅读

- [Devlin 等（2018）. BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding](https://arxiv.org/abs/1810.04805)——原始论文。
- [Liu 等（2019）. RoBERTa: A Robustly Optimized BERT Pretraining Approach](https://arxiv.org/abs/1907.11692)——如何正确训练 BERT；移除 NSP。
- [Clark 等（2020）. ELECTRA: Pre-training Text Encoders as Discriminators Rather Than Generators](https://arxiv.org/abs/2003.10555)——在相同计算量下，替换词元检测优于 MLM。
- [Warner 等（2024）. Smarter, Better, Faster, Longer: A Modern Bidirectional Encoder](https://arxiv.org/abs/2412.13663)——ModernBERT 论文。
- [Hugging Face `modeling_bert.py`](https://github.com/huggingface/transformers/blob/main/src/transformers/models/bert/modeling_bert.py)——标准编码器参考实现。
