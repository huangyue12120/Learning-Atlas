# 命名实体识别：练习指南

- 课程路径：`phases/05-nlp-foundations-to-advanced/06-named-entity-recognition`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 实现 `bio_to_spans`，即 `spans_to_bio` 的逆函数，并在 10 个句子上验证往返一致性。
2. **中等。** 在 CoNLL-2003 英语 NER 数据集上训练上面的 sklearn-crfsuite CRF。使用 `seqeval` 报告逐实体 F1，典型结果约为 84 F1。
3. **困难。** 在医学、法律或金融领域的 NER 数据集上微调 `distilbert-base-cased`。与 spaCy 小模型比较，记录数据泄漏检查并写下令你意外的发现。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
