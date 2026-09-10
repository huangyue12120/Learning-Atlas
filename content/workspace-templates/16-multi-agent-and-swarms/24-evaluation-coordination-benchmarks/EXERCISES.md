# 评估与协调基准：练习指南

- 课程路径：`phases/16-multi-agent-and-swarms/24-evaluation-coordination-benchmarks`
- 可运行 Python 文件：`main.py`

## 练习目标

用已见/留出任务、随机基线和多次运行检查协调收益是否能泛化，避免把单次高分写成结论。

## 动手练习

1. 运行 `main.py`，阅读 topology、seen/held-out 和随机基线的 scorecard。
2. 增加随机种子，计算均值、标准差和效应量，而不只报告最高分。
3. 改变污染比例，观察 seen 分数与留出分数的差距。
4. 为一个基准写出零假设、备择假设和预先设定的显著性水平。
5. 设计一个不能由该基准测量的系统性质，并说明需要什么补充评估。

## 运行与验证

```bash
python3 code/main.py
```

确认默认 scorecard 与统计警告都能输出，并记录一个不过度外推的结论。
