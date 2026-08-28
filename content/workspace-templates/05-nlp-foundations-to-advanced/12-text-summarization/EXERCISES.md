# 文本摘要：练习指南

- 课程路径：`phases/05-nlp-foundations-to-advanced/12-text-summarization`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 在 5 篇新闻上运行 TextRank，把排名最高的 3 个句子与参考摘要比较，测量 ROUGE-L。在 CNN/DailyMail 风格文章上应达到 30 至 45 ROUGE-L。
2. **中等。** 实现实体级事实性检查：用 spaCy 提取源文和摘要中的命名实体，计算源实体在摘要中的召回率，以及摘要实体相对源文的精确率。高精确率、低召回率表示安全但简短；低精确率表示产生了实体幻觉。
3. **困难。** 在 50 篇 CNN/DailyMail 文章上比较 BART-large-CNN 与 LLM（Claude 或 GPT-4）。报告 ROUGE-L、实体 F1 事实性和每篇摘要成本，并记录各自胜出的场景。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
