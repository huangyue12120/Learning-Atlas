# 子词分词：BPE、WordPiece、Unigram、SentencePiece：练习指南

- 课程路径：`phases/05-nlp-foundations-to-advanced/19-subword-tokenization`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 在 `main.py` 的微型语料上训练执行 500 次合并的 BPE，并编码三个留出词。统计其中恰好产生 1 个词元和产生多个词元的词各有多少。
2. **中等。** 对 100 个英语维基百科句子，比较 `cl100k_base`、`o200k_base` 和你用 vocab=32k 训练的 SentencePiece BPE 所产生的词元数，报告各自的压缩率。
3. **困难。** 在同一语料上分别训练 BPE、Unigram 和 WordPiece。把它们用于小型情感分类器，测量下游准确率。分词器选择是否让 F1 相差超过 1 个百分点？

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
