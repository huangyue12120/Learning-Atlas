# 信息检索与搜索：练习指南

- 课程路径：`phases/05-nlp-foundations-to-advanced/14-information-retrieval-search`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 在 500 篇文档的语料上实现上面的 `hybrid_search`，用 20 个查询测试，对比仅 BM25、仅稠密检索与混合检索的 Recall@5。
2. **中等。** 加入 MRR 计算。对每个已知正确文档的测试查询，找出正确文档在 BM25、稠密和混合排名中的位置，并报告三者 MRR。
3. **困难。** 使用 Sentence Transformers 的 MultipleNegativesRankingLoss 在目标领域微调稠密编码器。从 500 对查询与文档构建训练集，比较微调前后的召回率。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
