---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/04-multimodal-document-qa/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: b8fc711b06f06c63a2dc3b03985cff5825260fa703eb5e3e576af9fda4bd4e89
status: reviewed
---

# 毕业项目 04——多模态文档问答（视觉优先的 PDF、表格与图表）

> 2026 年的文档问答前沿已经从“先 OCR 再转文本”转向视觉优先的后交互。ColPali、ColQwen2.5 和 ColQwen3-omni 把每个 PDF 页面视为图像，用多向量后交互进行嵌入，让查询直接关注图像 patch。在财务 10-K、科学论文和手写笔记上，这种模式大幅超过 OCR 优先方案。本毕业项目要求你在 1 万页上端到端构建流水线，发布与 OCR—文本方案的对比，并测量计数和动作问题上的幻觉。

**类型：** 毕业项目
**语言：** Python（流水线）、TypeScript（查看器 UI）
**前置课程：** 第 4 阶段（计算机视觉）、第 5 阶段（NLP）、第 7 阶段（Transformer）、第 11 阶段（LLM 工程）、第 12 阶段（多模态）、第 17 阶段（基础设施）
**涉及阶段：** P4 · P5 · P7 · P11 · P12 · P17
**用时：** 30 小时

## 问题

企业拥有大量会被 OCR 流水线弄坏的 PDF：带旋转表格的扫描版 10-K、充满公式的科学论文、只有作为图像才有意义的图表，以及带手写批注的文档。把它们当作文本优先内容，会丢掉一半信号。2026 年的答案是对原始页面图像进行后交互多向量检索。Illuin Tech 的 ColPali 首先提出了这一方法，ColQwen2.5-v0.2 和 ColQwen3-omni 又提高了准确率。在 ViDoRe v3 上，视觉优先检索的分数明显高于 OCR—文本方案；在图表、表格和手写内容上，差距还会扩大。

代价是存储和延迟。ColQwen 的一个嵌入每页约有 2048 个 patch 向量，而不是一个 1024 维向量，原始存储会膨胀。DocPruner（2026）在没有可测准确率损失的情况下提供了 50% 的剪枝。你将为 1 万页建立索引，测量 ViDoRe v3 nDCG@5，在 2 秒内提供答案，并与 OCR—文本基线直接比较。

## 概念

后交互意味着每个查询词元都会与每个 patch 词元打分，然后将每个查询词元的最高分相加。这样无需单一的池化向量，也能获得细粒度匹配。多向量索引（Vespa、Qdrant multi-vector 或 AstraDB）存储每个 patch 的嵌入，并在检索时运行 MaxSim。

回答器是一个视觉语言模型，它接收查询和 top-k 个检索页面的图像，并带证据区域（边界框或页面引用）写出答案。Qwen3-VL-30B、Gemini 2.5 Pro 和 InternVL3 是 2026 年的前沿选择。对于公式和科学记号，可以把 OCR 回退（Nougat、dots.ocr）作为可选文本通道拼接进来。

评测是一个二维矩阵。一条轴是内容类型（普通文本段落、密集表格、柱状/折线图、手写笔记、公式），另一条轴是检索方法（视觉优先后交互、OCR—文本、混合）。每个单元格都获得 nDCG@5 和答案准确率。报告就是交付物。

## 架构

```text
PDF -> 页面渲染器（PyMuPDF，180 DPI）
           |
           v
  ColQwen2.5-v0.2 嵌入（每页多向量，约 2048 个 patch）
           |
           +------> DocPruner 50% 压缩
           |
           v
   多向量索引（Vespa 或 Qdrant multi-vector）
           |
查询 ------+----> 检索 top-k 页面（MaxSim）
           |
           v
  VLM 回答器：Qwen3-VL-30B | Gemini 2.5 Pro | InternVL3
    输入：查询 + top-k 页面图像 + 可选 OCR 文本
           |
           v
  带页面编号引用 + 证据区域的答案
           |
           v
  Streamlit / Next.js 查看器：在源页面上高亮边界框
```

## 技术栈

- 页面渲染：PyMuPDF（fitz），180 DPI，统一为纵向方向
- 后交互模型：ColQwen2.5-v0.2 或 ColQwen3-omni（Hugging Face 上的 vidore 团队模型）
- 索引：带多向量字段的 Vespa，或 Qdrant multi-vector，或带 MaxSim 的 AstraDB
- 剪枝：DocPruner 2026 策略（保留高方差 patch，以低于 0.5% 的准确率损失实现 50% 压缩）
- OCR 回退（公式/密集表格）：dots.ocr 或 Nougat
- VLM 回答器：自托管 Qwen3-VL-30B 或托管 Gemini 2.5 Pro；InternVL3 作为回退
- 评测：ViDoRe v3 benchmark、用于多页推理的 M3DocVQA
- 查看器 UI：Next.js 15，使用 canvas 覆盖证据区域

```figure
ce-late-interaction
```

## 动手构建

1. **摄取。** 遍历由 10-K、科学论文和扫描文档组成的 1 万页语料。将每页渲染为 1536x2048 PNG。持久化 {doc_id, page_num, image_path}。

2. **嵌入。** 对每张页面图像运行 ColQwen2.5-v0.2。输出形状约为 2048 个、维度为 128 的 patch 嵌入。应用 DocPruner，只保留信号最高的一半。写入 Vespa 多向量字段或 Qdrant 多向量字段。

3. **查询。** 对每个传入查询，使用查询塔生成嵌入（词元级嵌入）。在索引上运行 MaxSim：对每个查询词元，在页面 patch 嵌入上取最大点积，再将这些最大值求和。返回 top-k 页面。

4. **合成。** 使用查询和前 5 个页面图像调用 Qwen3-VL-30B。提示语：“只能使用所提供的页面回答。按 (doc_id, page) 引用每条主张，并写出区域名称（图、表或段落）。”

5. **证据区域。** 后处理答案以提取所引用区域。如果 VLM 输出边界框（Qwen3-VL 可以做到），就在查看器中将其渲染为覆盖层。

6. **OCR 回退。** 对被启发式图像方差判定为公式密集的页面运行 Nougat 或 dots.ocr，并将 OCR 文本作为图像之外的附加通道传入。

7. **评测。** 运行 ViDoRe v3（检索 nDCG@5）和 M3DocVQA（多页问答准确率）。同时在同一语料和同一合成器上运行 OCR—文本流水线。生成“内容类型 × 方法”矩阵。

8. **UI。** 先做 Streamlit 原型，再用 Next.js 15 实现带逐页证据区域覆盖的生产查看器。

## 实际使用

```text
$ doc-qa ask "what was the 2024 operating margin change for segment EMEA?"
[retrieve]   top-5 pages in 320ms (ColQwen2.5, MaxSim, Vespa)
[synth]      qwen3-vl-30b, 1.4s, cited (form-10k-2024, p. 88) + (..., p. 92)
answer:
  EMEA operating margin moved from 18.2% to 16.8%, a 140bp decline.
  cited: 10-K-2024.pdf p.88 (Table 4, Segment Operating Margin)
         10-K-2024.pdf p.92 (MD&A, Operating Performance)
[viewer]     open with highlighted bounding boxes overlaid on p.88 Table 4
```

## 交付

交付物 outputs/skill-doc-qa.md 描述了系统：给定一个特定语料，它搭建视觉优先的多模态文档问答系统，并在 ViDoRe v3 上与 OCR—文本基线比较。

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | ViDoRe v3 / M3DocVQA 准确率 | 与 OCR—文本基线和已发布排行榜比较 benchmark 数字 |
| 20 | 证据区域 grounding | 实际包含答案片段的被引用区域比例 |
| 20 | 存储与延迟工程 | DocPruner 压缩比、索引 p95、答案 p95 |
| 20 | 多页推理 | 在人工标注的 100 个多页问题集上的准确率 |
| 15 | 源内容检查 UX | 查看器清晰度、覆盖层保真度、并排比较工具 |
| **100** | | |

## 练习

1. 在同一语料上比较 ColQwen2.5-v0.2 与 ColQwen3-omni。哪些页面一个模型答对而另一个漏掉？向索引增加 content class 标记，按类型路由。

2. 激进地剪枝嵌入（75%、90%）。找出压缩悬崖：ViDoRe nDCG@5 低于 OCR 基线的临界点。

3. 构建混合方案：并行运行 OCR—文本和 ColQwen，用 RRF 融合，再用交叉编码器重排。混合方案是否超过单独方案？在哪些地方帮助最大？

4. 将 Qwen3-VL-30B 换成更小的 VLM（Qwen2.5-VL-7B）。测量准确率—美元成本曲线。

5. 增加手写笔记支持。渲染手写语料，使用 ColQwen 嵌入并测量检索，再与手写 OCR 流水线比较。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Late interaction | “ColPali 风格检索” | 查询词元独立地与页面 patch 打分，再用 MaxSim 聚合 |
| Multi-vector | “每个 patch 一个嵌入” | 每个文档有许多向量，而不是一个池化向量 |
| MaxSim | “后交互打分” | 对每个查询词元，在文档向量上取最大相似度并求和 |
| DocPruner | “Patch 压缩” | 2026 年的剪枝方法，保留 50% patch 且准确率损失很小 |
| ViDoRe v3 | “文档检索 benchmark” | 2026 年衡量视觉文档检索的标准 |
| Evidence region | “被引用的边界框” | 在源页面上定位答案片段的 bbox |
| OCR fallback | “公式通道” | 与视觉通道并用、服务公式或表格密集页面的文本流水线 |

## 延伸阅读

- [ColPali（Illuin Tech）仓库](https://github.com/illuin-tech/colpali)——后交互文档检索参考
- [ColPali 论文（arXiv:2407.01449）](https://arxiv.org/abs/2407.01449)——基础方法论文
- [Hugging Face 上的 ColQwen 系列](https://huggingface.co/vidore)——可用于生产的 checkpoint
- [M3DocRAG（Adobe）](https://arxiv.org/abs/2411.04952)——多页多模态 RAG 基线
- [Vespa 多向量教程](https://docs.vespa.ai/en/colpali.html)——参考服务技术栈
- [Qdrant 多向量支持](https://qdrant.tech/documentation/concepts/vectors/#multivectors)——另一种索引
- [AstraDB 多向量](https://docs.datastax.com/en/astra-db-serverless/databases/vector-search.html)——另一种托管索引
- [Nougat OCR](https://github.com/facebookresearch/nougat)——支持公式的 OCR 回退
