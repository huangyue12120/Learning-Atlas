# 自然语言推断：文本蕴含：练习指南

- 课程路径：`phases/05-nlp-foundations-to-advanced/21-nli-textual-entailment`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 用 `facebook/bart-large-mnli` 运行 20 个人工编写的（前提、假设、标签）三元组，覆盖全部三个类别并测量准确率。加入对抗性的“子序列启发式”陷阱（“I did not eat the cake”与“I ate the cake”），观察模型是否出错。
2. **中等。** 在 100 条 AG News 标题上比较零样本模板 `"This text is about {label}"`、`"The topic is {label}"` 和 `"{label}"`，报告准确率波动。
3. **困难。** 构建 RAG 忠实度检查器：先拆分原子主张，再逐条运行 NLI。在 50 个带有标准上下文的 RAG 生成答案上评估，对照人工标签测量假阳性率和假阴性率。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
