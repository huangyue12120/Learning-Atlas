# 文本处理：分词、词干提取与词形还原：练习指南

- 课程路径：`phases/05-nlp-foundations-to-advanced/01-text-processing`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 扩展 `tokenize`，让 URL 保持为单个词元。测试：`tokenize("Visit https://example.com today.")` 应只产生一个 URL 词元。
2. **中等。** 实现 Porter 步骤 1b。若单词包含元音且以 `ed` 或 `ing` 结尾，则删除该后缀。处理双辅音规则（`hopping -> hop`，不能变成 `hopp`）。
3. **困难。** 构建一个以 WordNet 为查询表的词形还原器；WordNet 无条目时，回退到你的 Porter 词干提取器。在带标注语料上衡量其准确率，并与单独使用 WordNet、单独使用 Porter 的结果比较。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
