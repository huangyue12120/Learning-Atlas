# LLM 评估：RAGAS、DeepEval、G-Eval：练习指南

- 课程路径：`phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 在 10 个含已知幻觉的 RAG 示例上使用 RAGAS，确认忠实度指标能发现每个幻觉。
2. **中等。** 人工为 50 个问答答案标注 0 至 1 的正确性分数，再用 G-Eval 打分，测量评判者与人工分数之间的 Spearman rho。
3. **困难。** 使用 DeepEval 构建 pytest CI 门禁，故意让检索器退化，并确认门禁失败。通过检查最低 10% 样本的阈值加入最差分位数警报。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
