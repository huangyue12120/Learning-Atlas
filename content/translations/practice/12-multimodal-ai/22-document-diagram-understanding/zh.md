---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/12-multimodal-ai/22-document-diagram-understanding/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 063ffd18e02c1add40116a7a4c3aa86eccae7b93d9e936e7cafa94ae76c13749
status: reviewed
---

# 文档与图表理解

> 文档不是照片。PDF、科学论文、发票或手写表格包含布局、表格、图表、脚注、页眉和语义结构，这些是单纯图像理解无法捕捉的。VLM 之前的技术栈是一条流水线：Tesseract OCR + LayoutLMv3 + 表格提取启发式规则。VLM 浪潮用直接输出结构化标记的无 OCR 模型替换了它——Donut（2022）、Nougat（2023）、DocLLM（2023）。到 2026 年，前沿方案就是“以 2576px 原生分辨率把页面图像送给 Claude Opus 4.7”，结构化标记输出随之自然得到。本课阅读文档 AI 的三个时代。

**类型：** 构建
**语言：** Python（标准库，布局感知文档解析器骨架）
**前置课程：** Phase 12 · 05（LLaVA）、Phase 5（NLP）
**预计时间：** 约 180 分钟

## 学习目标

- 解释文档 AI 的三个时代：OCR 流水线、无 OCR、VLM 原生。
- 描述 LayoutLMv3 的三个输入流：文本、布局（bbox）、图像块，以及统一掩码。
- 比较 Donut（无 OCR，图像 → 标记）、Nougat（科学论文 → LaTeX）、DocLLM（布局感知生成）和 PaliGemma 2（VLM 原生）。
- 为新任务（发票、科学论文、手写表格、中文收据）选择文档模型。

## 问题

“理解这份 PDF”看似简单，实际很难。信息分布在：

- 文本内容（90% 的信号）。
- 布局（页眉、脚注、侧栏、双栏格式）。
- 表格（行、列、合并单元格）。
- 图和图表。
- 手写标注。
- 字体和排版（标题与正文）。

原始 OCR 会输出文本，却丢掉其余内容。一个关心发票的系统需要知道“Total: $1,245”来自右下角，而不是脚注。

## 概念

### 时代 1——OCR 流水线（2021 年以前）

经典技术栈：

1. PDF → 每页图像。
2. Tesseract（或商业 OCR）提取文本，并为每个词输出边界框。
3. 布局分析器识别块（页眉、表格、段落）。
4. 表格结构识别器解析表格。
5. 领域规则 + 正则表达式提取字段。

对干净的印刷文本有效，但在手写、倾斜扫描、复杂表格和非英语文字上会崩溃。每种失败模式都需要一条自定义异常路径。

### TrOCR（2021）

TrOCR（Li 等，arXiv:2109.10282）用在合成 + 真实文本图像上训练的 Transformer 编码器—解码器，替换了 Tesseract 的经典 CNN-CTC。在手写和多语言文本上取得明显成功。它仍然是流水线（检测器 → TrOCR → 布局），但 OCR 步骤大幅改进。

### 时代 2——无 OCR（2022–2023）

第一批无 OCR 模型提出：完全跳过检测，直接将图像像素映射到结构化输出。

Donut（Kim 等，arXiv:2111.15664）：
- 编码器—解码器 Transformer，编码器是 Swin-B。
- 输出可以是表单理解的 JSON、摘要的 markdown，或任意任务特定 schema。
- 没有 OCR、没有布局、没有检测。

Nougat（Blecher 等，arXiv:2308.13418）：
- 专门在科学论文上训练。
- 输出 LaTeX / markdown。
- 处理公式、多栏布局和图表。
- 每个 arXiv 解析器都会调用的模型。

它们是专用模型，不是通用模型。Donut 处理科学论文会失败，Nougat 处理发票会失败。

### LayoutLMv3（2022）

另一条路线。LayoutLMv3（Huang 等，arXiv:2204.08387）保留 OCR，但增加布局理解：

- 三条输入流：OCR 文本词元、逐词二维边界框、图像块。
- 在三种模态上使用掩码训练目标（掩码文本、掩码图像块、掩码布局）。
- 下游任务：分类、实体抽取、表格问答。

LayoutLMv3 是基于 OCR 的文档理解的高峰。在表单和发票上很强，但需要上游 OCR。在标准化文档基准上，它是 VLM 之前最好的准确率方案。

### DocLLM（2023）

DocLLM（Wang 等，arXiv:2401.00908）是 LayoutLM 的生成式近亲。它根据布局词元生成自由形式答案，在文档问答上更好，但仍依赖 OCR 输入。

### 时代 3——VLM 原生（2024+）

2024 年的 VLM 已经足够好，可以完全替换流水线。以高分辨率输入完整页面图像，询问问题并得到答案。

- LLaVA-NeXT 的 336 图块 AnyRes 适合小型文档。
- Qwen2.5-VL 的动态分辨率原生处理 2048+ 像素。
- Claude Opus 4.7 支持 2576px 文档。
- PaliGemma 2（2025 年 4 月）专门针对文档 + 手写训练。

VLM 原生与 OCR 流水线之间的差距迅速缩小。到 2026 年，VLM 原生在以下方面胜出：

- 场景文字（手写 + 印刷、混合文字）。
- 合并单元格的复杂表格。
- 文本中嵌入的数学公式。
- 带文字标注的图表。

OCR 流水线仍然在以下方面胜出：

- 纯扫描的大规模工作负载，此时逐页延迟很重要。
- 流水线可靠性（确定性的失败与 VLM 幻觉相对）。
- 需要可审计 OCR 输出的监管环境。

### Claude 4.7 / GPT-5 前沿

在 2576 像素原生输入下，前沿 VLM 以接近人类的准确率进行文档理解。2026 年初的基准数字：

- DocVQA：Claude 4.7 约 95.1，PaliGemma 2 约 88.4，Nougat 约 77.3，流水线 LayoutLMv3 约 83。
- ChartQA：Claude 4.7 约 92.2，GPT-4V 约 78。
- VisualMRC：Claude 4.7 约 94。

闭源模型的差距主要来自分辨率和基础 LLM 规模。7B 开放模型落后几个百分点，但正在追赶。

### 数学公式与 LaTeX 输出

科学论文需要准确的 LaTeX 公式输出，Nougat 就是为此训练的。使用 LaTeX 目标训练的 VLM（Qwen2.5-VL-Math、Nougat 衍生模型）能产生可用的 LaTeX。没有明确的 LaTeX 训练，VLM 会生成可读但不精确的转写。

2026 年的科学论文流水线是：在 PDF 上先运行 Nougat，再对棘手页面使用 VLM。

### 手写

这仍然是最难的子任务。印刷 + 手写混合内容（医生笔记、填写表格）是 OCR 流水线在成本上仍胜过 VLM 的地方。纯手写 VLM 正在改进（Claude 4.7、PaliGemma 2）。

### 2026 年方案

对于新的文档 AI 项目：

- 大规模纯印刷发票：LayoutLMv3 + 规则，成本高效。
- 混合文档（科学论文 + 手写 + 表单）：VLM 原生（PaliGemma 2 或 Qwen2.5-VL）。
- 完整 arXiv 摄取：数学使用 Nougat，图表使用 VLM。
- 监管场景：OCR 流水线 + VLM 验证器交叉核对。

```figure
mm-doc-layout
```

## 使用它

`code/main.py`：

- 一个玩具布局感知分词器：给定（文本、bbox）对，生成 LayoutLMv3 风格输入。
- 一个 Donut 风格的任务 schema 生成器：用于表单的 JSON 模板。
- 比较 OCR 流水线、Donut、Nougat 和 VLM 原生方案每页的词元预算。

## 交付成果

本课生成 `outputs/skill-document-ai-stack-picker.md`。给定一个文档 AI 项目（领域、规模、质量、监管要求），它会在 OCR 流水线、无 OCR 专用模型和 VLM 原生方案之间选择。

## 练习

1. 你的项目每天处理 1000 万张发票。哪种技术栈能在不牺牲准确率的情况下最小化每页成本？

2. 为什么 LayoutLMv3 在表单问答上超过纯 CLIP-VLM，却在场景文字上表现不佳？bbox 流牺牲了什么？

3. Nougat 生成 LaTeX。提出一个 VLM 原生输出在 LaTeX 保真度上胜过 Nougat 的测试案例，以及一个 Nougat 胜出的案例。

4. 阅读 PaliGemma 2 论文（Google，2024）。相对于 PaliGemma 1，哪项训练数据增加提升了文档准确率？

5. 设计一个监管安全的混合方案：OCR 流水线为主，VLM 作为二次交叉核对。如何处理两者的分歧？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| OCR 流水线 | “Tesseract 风格” | 分阶段堆栈：检测 → OCR → 布局 → 规则；确定但脆弱 |
| 无 OCR | “Donut 风格” | 跳过显式 OCR、直接从图像到输出的单模型 Transformer |
| 布局感知 | “LayoutLM” | 输入包含逐词 bbox 坐标；跨模态统一掩码 |
| VLM 原生 | “前沿 VLM” | 以高分辨率直接将页面图像送给 Claude/GPT/Qwen VLM；没有流水线 |
| DocVQA | “文档基准” | 文档 VQA 标准，引用最多的分数 |
| 标记输出 | “LaTeX / MD” | 替代自由文本的结构化输出格式，支持下游自动化 |

## 延伸阅读

- [Li 等——TrOCR（arXiv:2109.10282）](https://arxiv.org/abs/2109.10282)
- [Blecher 等——Nougat（arXiv:2308.13418）](https://arxiv.org/abs/2308.13418)
- [Huang 等——LayoutLMv3（arXiv:2204.08387）](https://arxiv.org/abs/2204.08387)
- [Kim 等——Donut（arXiv:2111.15664）](https://arxiv.org/abs/2111.15664)
- [Wang 等——DocLLM（arXiv:2401.00908）](https://arxiv.org/abs/2401.00908)
