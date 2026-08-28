# 词袋、TF-IDF 与文本表示：练习指南

- 课程路径：`phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 在经过 L2 归一化的 TF-IDF 输出上实现 `cosine_similarity(doc_vec_a, doc_vec_b)`。验证完全相同的文档得分为 1.0，词表毫无交集的文档得分为 0.0。
2. **中等。** 为 `bag_of_words` 加入 `n-gram` 支持。参数 `n` 生成 `n` 元语法计数。测试 `n=2` 时，`["the", "cat", "sat"]` 会产生 `["the cat", "cat sat"]` 的二元语法计数。
3. **困难。** 使用 GloVe 100 维向量构建上面的 TF-IDF 加权嵌入混合方案，下载一次后缓存。在 20 Newsgroups 数据集上，把它的分类准确率与纯 TF-IDF、纯平均池化嵌入比较，并报告各自在哪些情形胜出。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
