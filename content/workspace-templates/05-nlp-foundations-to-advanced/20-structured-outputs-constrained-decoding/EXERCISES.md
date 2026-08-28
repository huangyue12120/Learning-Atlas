# 结构化输出与约束解码：练习指南

- 课程路径：`phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 不使用约束解码，提示一个小型开放权重模型（如 Llama-3.2-3B）生成 `Review(sentiment, confidence, evidence_span)`。在 100 条评论上测量能解析为有效 JSON 的比例。
2. **中等。** 对同一语料使用 Outlines JSON 模式，比较合规率、延迟和语义准确率。
3. **困难。** 从零实现电话号码（`\d{3}-\d{3}-\d{4}`）的正则约束解码器，在 1,000 次采样上验证无效输出为 0。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
