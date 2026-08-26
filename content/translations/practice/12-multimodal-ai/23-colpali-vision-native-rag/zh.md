---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/12-multimodal-ai/23-colpali-vision-native-rag/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 3e21fa1908caa13e3fd34a6f7ec5e07b208ea4e03a2e18864045bc620bb94a08
status: reviewed
---

# ColPali 与视觉原生文档 RAG

> 传统 RAG 将 PDF 解析成文本，切成分块，嵌入分块并存储向量。每一步都会丢失信号：OCR 丢掉图表数据，分块打断表格行，文本嵌入忽略图表。ColPali（Faysse 等，2024 年 7 月）提出了一个更简单的问题：为什么还要提取文本？直接通过 PaliGemma 嵌入页面图像，使用 ColBERT 风格的晚交互进行检索，并保留文档携带的全部布局、图表、字体和格式信号。已发布的基准显示，在视觉丰富的文档上，端到端准确率比文本 RAG 高 20–40%。ColQwen2、ColSmol 和 VisRAG 扩展了这一模式。本课阅读视觉原生 RAG 的论点，并构建一个微型的 ColPali 类索引器。

**类型：** 构建
**语言：** Python（标准库，多向量索引器 + MaxSim 评分器）
**前置课程：** Phase 11（LLM 工程——RAG 基础）、Phase 12 · 05（LLaVA）
**预计时间：** 约 180 分钟

## 学习目标

- 解释双编码器检索（每份文档一个向量）与晚交互检索（每份文档多个向量）的差异。
- 描述 ColBERT 的 MaxSim 操作，以及 ColPali 如何将它从文本词元推广到图像块。
- 构建一个微型 ColPali 类索引器：页面 → 图像块嵌入 → 查询词嵌入上的 MaxSim → top-k 页面。
- 在发票/财务报告用例上比较 ColPali + Qwen2.5-VL 生成器与文本 RAG + GPT-4。

## 问题

PDF 上的文本 RAG 会丢掉文档的大部分信息。财务报告的 Q3 收入增长通常在图表里；医疗报告的发现位于带标注的图像中；法律合同的签名块是布局事实，不是文本事实。

文本 RAG 流水线：

1. PDF → 通过 OCR / pdftotext 得到文本。
2. 文本 → 300–500 词元的分块。
3. 分块 → 双编码器嵌入（一个向量）。
4. 用户查询 → 嵌入 → 余弦相似度 → top-k 分块。
5. 分块 + 查询 → LLM。

五个有损步骤。图表没有被捕捉，表格被分割到不同分块，多栏布局被展平，图中标注消失。

ColPali 的修复是跳过 OCR，直接嵌入页面图像。使用 ColBERT 风格的晚交互做检索，让模型在查询时关注细粒度图像块。

## 概念

### ColBERT（2020）

ColBERT（Khattab 与 Zaharia，arXiv:2004.12832）是一种文本检索方法。它不是每份文档一个向量，而是每个词元一个向量。在查询时：

- 查询词元拥有自己的嵌入（N_q 个向量）。
- 文档词元获得嵌入（N_d 个向量，通常会缓存）。
- 评分 = 对查询词元求和、对文档词元取最大余弦相似度：Σ_i max_j cos(q_i, d_j)。

这就是 MaxSim 操作。每个查询词元“挑选”最匹配的文档词元，最终分数是这些最大值之和。

优点是召回率强，能处理词元级语义；缺点是每份文档要存 N_d 个向量，存储成本高。

### ColPali

ColPali（Faysse 等，arXiv:2407.01449）将 ColBERT 模式应用到图像：

- 每个页面由 PaliGemma（ViT + 语言）编码为图像块嵌入：每页 N_p 个向量。
- 每条用户查询（文本）被编码为查询词元嵌入：N_q 个向量。
- 评分 = Σ_i max_j cos(q_i, p_j)，即对查询文本词元和页面图像块执行 MaxSim。
- 按总分检索 top-k 页面。

在文档摄取时，用 PaliGemma 嵌入每个页面，存储所有图像块嵌入；在查询时，嵌入查询词元，对所有存储的页面嵌入计算 MaxSim，并返回 top-k 页面。

优点是，在视觉丰富的文档上端到端准确率比文本 RAG 高 20–40%。每个图像块向量都捕获局部布局和内容。

缺点是，每页 N_p 个图像块 × 4 字节浮点数 × D 维向量，存储增长很快。可以用 PQ / OPQ 量化缓解。

### ColQwen2 与 ColSmol

ColQwen2（illuin-tech，2024–2025）将 PaliGemma 换成 Qwen2-VL。基础编码器更好，检索也更好。

ColSmol 是面向本地/边缘使用的小规模变体。约 1B 参数的 ColSmol 检索器可以在消费级 GPU 上运行。

### VisRAG

VisRAG（Yu 等，arXiv:2410.10594）是另一种变体：不在图像块上使用 MaxSim，而是用 VLM 把每个页面池化成一个向量，再用双编码器检索。索引更快、存储更小，但召回率较弱。

质量与成本的取舍是：追求质量选择 ColPali，追求规模选择 VisRAG。

### M3DocRAG

M3DocRAG（Cho 等，arXiv:2411.04952）将多模态检索扩展到跨多页、多文档的推理。它从不同文档检索页面，为 VLM 组织多页上下文。

### ViDoRe——基准

这是 ColPali 的配套基准。ViDoRe 即 Visual Document Retrieval Evaluation（视觉文档检索评估）。任务包括财务报告、科学论文、行政文档、医疗记录和手册。指标是 nDCG@5。

ColPali-v1 在 ViDoRe 上的 nDCG@5 约为 80%，同一批文档上的文本 RAG 约为 50–60%。

### 端到端 RAG 流水线

视觉原生 RAG：

1. 摄取：PDF → 页面图像 → PaliGemma 编码 → 存储全部图像块嵌入。
2. 查询：用户文本 → 查询词元嵌入 → 对所有已索引页面执行 MaxSim → top-k 页面。
3. 生成：top-k 页面图像 + 查询 → VLM（Qwen2.5-VL 或 Claude）→ 答案。

全程不需要 OCR。图表、字体、布局都会流入答案。

### 存储数学

一份 50 页的财务报告，每页 729 个图像块、128 维嵌入：

- ColPali：50 * 729 * 128 * 4 bytes = 约 18 MB 原始大小，PQ 后约 4 MB。
- 文本 RAG：50 个分块 * 768 维 * 4 bytes = 约 150 kB。

ColPali 每份文档的存储量约为 30 倍。规模化时，OPQ / PQ 可将其降到约 5–10 倍，通常可以接受。

### 文本 RAG 仍然胜出的场景

- 没有布局信号的纯文本文档（维基文章、聊天日志），文本 RAG 更简单、存储更省。
- 数百万页的档案，存储成本占主导。
- 严格的监管要求，必须同时提供可提取的 OCR 文本与检索结果。

2026 年的其他场景——财务报告、科学论文、法律合同、医疗记录、UX 文档——视觉原生 RAG 都胜出。

```figure
mm-maxsim
```

## 使用它

`code/main.py`：

- 玩具图像块编码器：将一个“页面”（小型特征向量网格）映射为图像块嵌入数组。
- MaxSim 评分器：计算查询词嵌入集合与页面图像块集合之间的 ColBERT 风格分数。
- 索引 5 个玩具页面，运行 3 个查询，返回带分数的 top-k 结果。

## 交付成果

本课生成 `outputs/skill-vision-rag-designer.md`。给定一个文档 RAG 项目，它会在 ColPali / ColQwen2 / VisRAG / 文本 RAG 之间选择并估算存储。

## 练习

1. 一份 200 页的年报，每页 729 个图像块、128 维嵌入、4 字节浮点数。计算原始存储量和 PQ 压缩（8 倍）后的存储量。

2. MaxSim 是 Σ_i max_j cos(q_i, p_j)。这个求和捕获了什么，是简单的平均相似度无法捕获的？

3. ColPali 将页面作为图像块集合索引。如果改为像 ColBERT 那样在词级索引，什么会变化？取舍是什么？

4. 为一个 100 万页语料设计端到端流水线，查询延迟预算为 500ms。选择 ColQwen2 / VisRAG 并说明理由。

5. 阅读 M3DocRAG（arXiv:2411.04952）。描述多页注意力模式，以及它与单页 ColPali 检索有何不同。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 晚交互 | “ColBERT 风格” | 使用逐词元或逐图像块嵌入 + MaxSim 的检索，而不是单个文档向量 |
| MaxSim | “对图像块取最大值” | 为每个查询词元挑选相似度最高的文档词元，再对查询求和 |
| 双编码器 | “单向量” | 每份文档一个向量；更快但丢失粒度 |
| 多向量 | “每份文档多个向量” | 每份文档/页面存储 N_p 个向量；存储成本增加但召回率提高 |
| 图像块嵌入 | “页面特征” | VLM 编码器为每个图像块产生的、按页面缓存的向量 |
| ViDoRe | “视觉文档基准” | ColPali 的视觉文档检索基准套件 |
| PQ 量化 | “乘积量化” | 在保持向量相似度的同时将存储缩小约 8 倍的压缩方式 |

## 延伸阅读

- [Faysse 等——ColPali（arXiv:2407.01449）](https://arxiv.org/abs/2407.01449)
- [Khattab 与 Zaharia——ColBERT（arXiv:2004.12832）](https://arxiv.org/abs/2004.12832)
- [Yu 等——VisRAG（arXiv:2410.10594）](https://arxiv.org/abs/2410.10594)
- [Cho 等——M3DocRAG（arXiv:2411.04952）](https://arxiv.org/abs/2411.04952)
- [illuin-tech/colpali GitHub](https://github.com/illuin-tech/colpali)
