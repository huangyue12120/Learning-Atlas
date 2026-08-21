---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/11-machine-translation/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 956eeb576fdea61cef4a66b8f4c6b1b1caa47eea8e7488aace436c9c177b09ca
status: reviewed
---

# 机器翻译

> 三十年来，翻译一直为 NLP 研究提供资金，今天仍在继续。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 10 课（注意力机制）、Phase 5 第 04 课（GloVe、FastText 与子词）  
**预计时间：** 约 75 分钟

## 问题

模型读取一种语言的句子，再用另一种语言生成句子。句子长度不同，词序不同，有些源词对应多个目标词，反之亦然。习语拒绝一一映射。法语把“I miss you”说成“tu me manques”，字面意思是“you are lacking to me”。任何词级对齐都会在这里失效。

机器翻译推动 NLP 发明了编码器与解码器、注意力、Transformer，最终催生整套 LLM 范式。翻译质量可以测量，机器与人工之间的差距又迟迟无法消除，每次改进都由此而来。

本课跳过历史，直接讲解 2026 年的工作流水线：预训练多语言编码器与解码器（NLLB-200 或 mBART）、子词分词、束搜索、BLEU 与 chrF 评估，以及少数仍会未被发现就进入生产的失效方式。

## 概念

![机器翻译流水线：分词 → 编码 → 带注意力解码 → 还原词元](../assets/mt-pipeline.svg)

现代机器翻译使用在平行文本上训练的 Transformer 编码器与解码器。编码器按源语言的分词方式读取输入，解码器通过交叉注意力访问编码器输出，每次生成一个目标子词，见第 10 课。解码使用束搜索，避开贪心解码陷阱。最后把输出还原词元、恢复真实大小写，并与参考译文比较打分。

三个操作选择会左右真实机器翻译质量。

- **分词器。** 在混合语言语料上训练的 SentencePiece BPE。NLLB 能在未直接训练的语言对上执行零样本翻译，依赖的正是跨语言共享词表。
- **模型大小。** NLLB-200 distilled 600M 可在笔记本电脑上运行；NLLB-200 3.3B 是论文给出的生产默认模型；54.5B 是研究规模上限。
- **解码。** 通用内容使用束宽 4 至 5；加入长度惩罚，防止输出过短；需要术语一致时使用约束解码。

```figure
seq2seq-alignment
```

## 动手实现

### 步骤 1：调用预训练机器翻译模型

```python
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

model_id = "facebook/nllb-200-distilled-600M"
tok = AutoTokenizer.from_pretrained(model_id, src_lang="eng_Latn")
model = AutoModelForSeq2SeqLM.from_pretrained(model_id)

src = "The cats are running."
inputs = tok(src, return_tensors="pt")

out = model.generate(
    **inputs,
    forced_bos_token_id=tok.convert_tokens_to_ids("fra_Latn"),
    num_beams=5,
    length_penalty=1.0,
    max_new_tokens=64,
)
print(tok.batch_decode(out, skip_special_tokens=True)[0])
```

```text
Les chats courent.
```

这里有三个关键点。`src_lang` 告诉分词器采用哪种文字系统和切分方式，`forced_bos_token_id` 告诉解码器应生成哪种语言。二者都是 NLLB 专用技巧；mBART 和 M2M-100 使用自己的约定，不能互换。

### 步骤 2：BLEU 与 chrF

BLEU 衡量输出和参考译文的 n-gram 重叠。它采用 1 至 4 四种参考 n-gram 长度，计算精确率的几何平均，并对过短输出施加长度惩罚。分数范围为 [0, 100]，使用广泛，却很难解释：30 BLEU 表示“可用”，40 表示“好”，50 表示“极佳”；小于 1 BLEU 的差异属于噪声。

chrF 衡量字符级 F 分数。对形态丰富的语言，它比会少算匹配的 BLEU 更敏感，通常与 BLEU 一起报告。

```python
import sacrebleu

hypotheses = ["Les chats courent."]
references = [["Les chats courent."]]

bleu = sacrebleu.corpus_bleu(hypotheses, references)
chrf = sacrebleu.corpus_chrf(hypotheses, references)
print(f"BLEU: {bleu.score:.1f}  chrF: {chrf.score:.1f}")
```

请始终使用 `sacrebleu`。它会统一分词规范，让不同论文的分数可以比较。自行实现 BLEU 很容易产生误导性基准。

### 三级评估体系（2026）

现代机器翻译使用三组互补指标，交付时至少选两组。

- **启发式指标**（BLEU、chrF）。速度快、依赖参考译文、易解释，对释义不敏感。用于旧结果比较和回归检测。
- **学习型指标**（COMET、BLEURT、BERTScore）。用人工判断训练神经模型，比较译文与源文、参考译文之间的语义相似度。自 2023 年起，COMET 与机器翻译研究结果的相关性最高；到 2026 年，它是质量优先生产系统的默认选择。
- **LLM 充当评判者**（无参考译文）。提示大模型按流畅度、充分性、语气和文化适宜性给译文评分。评分量表设计良好时，GPT-4 评判与人工约有 80% 的一致率。适用于没有参考译文的开放内容。

2026 年的实用组合是：用 `sacrebleu` 计算 BLEU 与 chrF，用 `unbabel-comet` 计算 COMET，再由带提示的 LLM 提供最终面向用户的信号。信任任何指标之前，都要用 50 至 100 个人工标注样本完成校准。

无参考指标（COMET-QE、BLEURT-QE、LLM 评判）可以在没有参考译文时评估翻译，这对缺少参考数据的长尾语言对很重要。

### 步骤 3：生产中会出什么问题

上述流水线约 80% 的时间能产生流畅译文，剩余 20% 会静默失败。下面列出这些失效模式的名称：

- **幻觉。** 模型编造源文没有的内容，陌生领域术语中尤其常见。表现为译文流畅，却声称了源文没有的事实。缓解方法包括对领域术语使用约束解码、监管内容引入人工复核，并监控远长于输入的输出。
- **生成错误目标语言。** 模型把文本翻成另一种语言。NLLB 在稀有语言对上出乎意料地容易出现这种问题。请验证 `forced_bos_token_id`，并始终用语言识别模型检查输出。
- **术语漂移。** “Sign up”在文档 1 中翻成“s'inscrire”，在文档 2 中却变成“créer un compte”。对 UI 文案和用户可见字符串，一致性比原始质量更重要。可以使用词汇表约束解码或后编辑词典。
- **正式程度不匹配。** 法语“tu”与“vous”、日语敬语层级都存在差异。模型通常选择训练数据中更常见的形式，而面向客户的内容往往不能接受。若模型支持正式程度词元，可在提示前缀加入它；也可只用正式语料微调小模型。
- **短输入导致长度爆炸。** 很短的输入句常产生过长译文，因为源词元不足约 5 个时，长度惩罚会急剧失效。可按源文本长度设置成比例的硬上限。

### 步骤 4：为领域微调

预训练模型是通才。在法律、医学或游戏对话翻译中，使用领域平行数据微调能带来可测量的收益。训练配方并不特殊：

```python
from transformers import Trainer, TrainingArguments
from datasets import Dataset

pairs = [
    {"src": "The defendant pleaded guilty.", "tgt": "L'accusé a plaidé coupable."},
]

ds = Dataset.from_list(pairs)


def preprocess(ex):
    return tok(
        ex["src"],
        text_target=ex["tgt"],
        truncation=True,
        max_length=128,
        padding="max_length",
    )


ds = ds.map(preprocess, remove_columns=["src", "tgt"])

args = TrainingArguments(output_dir="out", per_device_train_batch_size=4, num_train_epochs=3, learning_rate=3e-5)
Trainer(model=model, args=args, train_dataset=ds).train()
```

几千条高质量平行样本胜过几十万条带噪网页抓取样本。训练数据质量是生产系统中作用最大的单一杠杆。

## 使用现成工具

2026 年机器翻译生产技术栈：

| 用例 | 推荐起点 |
|------|----------|
| 任意语言互译，覆盖 200 种语言 | 笔记本用 `facebook/nllb-200-distilled-600M`，生产用 `nllb-200-3.3B` |
| 以英语为中心、50 种语言、质量高 | `facebook/mbart-large-50-many-to-many-mmt` |
| 短任务、低价推理、英法德西互译 | Helsinki-NLP / Marian 模型 |
| 延迟敏感的浏览器端 | ONNX 量化 Marian，约 50 MB |
| 追求最高质量并愿意付费 | 使用翻译提示的 GPT-4 / Claude / Gemini |

截至 2026 年，LLM 已在一些语言对上超过专用机器翻译模型，尤其擅长习语内容和长上下文。代价是按词元收费与更高延迟。上下文长度、风格一致性或通过提示完成领域适配比吞吐量更重要时，可以选择 LLM。

## 交付成果

保存为 `outputs/skill-mt-evaluator.md`：

```markdown
---
name: mt-evaluator
description: Evaluate a machine translation output for shipping.
version: 1.0.0
phase: 5
lesson: 11
tags: [nlp, translation, evaluation]
---

Given a source text and a candidate translation, output:

1. Automatic score estimate. BLEU and chrF ranges you would expect. State whether a reference is available.
2. Five-point human-verifiable check list: (a) content preservation (no hallucinations), (b) correct language, (c) register / formality match, (d) terminology consistency with glossary if provided, (e) no truncation or length explosion.
3. One domain-specific issue to probe. E.g., for legal: named entities and statute citations. For medical: drug names and dosages. For UI: placeholder variables `{name}`.
4. Confidence flag. "Ship" / "Ship with review" / "Do not ship". Tie to the severity of issues found in step 2.

Refuse to ship a translation without a language-ID check on output. Refuse to evaluate without a reference unless the user explicitly opts in to reference-free scoring (COMET-QE, BLEURT-QE). Flag any content over 1000 tokens as likely needing chunked translation.
```

## 练习

1. **简单。** 使用 `nllb-200-distilled-600M` 把一段五句英语翻成法语，再译回英语。衡量回译与原文的接近程度。你应看到语义得到保留，但用词发生漂移。
2. **中等。** 用 `fasttext lid.176` 或 `langdetect` 对翻译输出实现语言识别检查。把它集成到翻译调用中，使目标语言错误的生成在返回前被捕获。
3. **困难。** 在自选的 5000 对领域语料上微调 `nllb-200-distilled-600M`。在留出集上测量微调前后的 BLEU，报告哪些句子类型得到改善，哪些发生退化。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| BLEU | 翻译分数 | 带长度惩罚的 n-gram 精确率，范围 [0, 100]。 |
| chrF | 字符 F 分数 | 字符级 F 分数，对形态丰富的语言更敏感。 |
| NMT | 神经机器翻译 | 在平行文本上训练的 Transformer 编码器与解码器，2017 年后成为默认方案。 |
| NLLB | No Language Left Behind | Meta 的 200 种语言机器翻译模型家族。 |
| 约束解码（constrained decoding） | 受控输出 | 强制特定词元或 n-gram 在输出中出现或不出现。 |
| 幻觉（hallucination） | 编造内容 | 模型输出中存在源文不支持的内容。 |

## 延伸阅读

- [Costa-jussà et al. (2022). No Language Left Behind: Scaling Human-Centered Machine Translation](https://arxiv.org/abs/2207.04672)：NLLB 论文。
- [Post (2018). A Call for Clarity in Reporting BLEU Scores](https://aclanthology.org/W18-6319/)：为何只能用 `sacrebleu` 报告 BLEU。
- [Popović (2015). chrF: character n-gram F-score for automatic MT evaluation](https://aclanthology.org/W15-3049/)：chrF 论文。
- [Hugging Face 机器翻译指南](https://huggingface.co/docs/transformers/tasks/translation)：实用微调教程。
