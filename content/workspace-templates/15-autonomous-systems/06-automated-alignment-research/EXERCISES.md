# 自动化对齐研究（Anthropic AAR）：练习指南

- 课程路径：phases/15-autonomous-systems/06-automated-alignment-research
- 可运行 Python 文件：main.py

## 练习目标

比较固定工作流与自由分解的研究代理，理解追加写日志和外部审计对自主研究的作用。

## 动手练习

1. 运行 main.py，比较 fixed-workflow 与 free-decomposition 的均值、方差和最高分。
2. 在模拟器中增加一次日志篡改，确认追加写链能在验证阶段发现它。
3. 为一个对齐研究任务设计队列分配策略，并说明如何做 A/B 测试。
4. 指出自由分解增加的审计负担，以及一个可降低负担的字段。
5. 结合 RSP 的 AI R&D-4 阈值，写出一个需要升级人工审查的触发条件。

## 运行与验证

运行：python3 code/main.py

确认输出包含两种 regime 和 tamper detection 结果；篡改记录不得通过 verify。
