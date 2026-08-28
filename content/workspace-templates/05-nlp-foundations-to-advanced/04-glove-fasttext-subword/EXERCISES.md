# GloVe、FastText 与子词嵌入：练习指南

- 课程路径：`phases/05-nlp-foundations-to-advanced/04-glove-fasttext-subword`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 运行 `char_ngrams("playing")` 和 `char_ngrams("played")`，计算两组 n-gram 的 Jaccard 重叠。你会看到许多共享片段（`pla`、`lay`、`play`），这解释了 FastText 为何能在形态变体之间迁移。
2. **中等。** 扩展 `learn_bpe`，跟踪词表增长。绘制每个语料字符对应词元数随合并次数变化的曲线。起初压缩速度很快，随后会渐近到每个词元约 2 至 3 个字符。
3. **困难。** 在莎士比亚全集上训练包含 1000 次合并的 BPE。比较常见词与稀有专有名词的分词结果，测量合并前后每个词的平均词元数，并写下令你意外的发现。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
