# Anthropic Responsible Scaling Policy v3.0：练习指南

- 课程路径：phases/15-autonomous-systems/19-anthropic-rsp
- 可运行 Python 文件：main.py

## 练习目标

把 RSP v3.0 的 AI R&D-4 阈值和 affirmative case 转换为可审计的判断表，同时保留政策阅读边界。

## 动手练习

1. 运行 main.py，输入不同能力测量，确认跨过阈值时列出 affirmative case 章节。
2. 逐项找出 industry-wide recommendation 与 Anthropic unilateral commitment。
3. 用 SaferAI rubric 复核 v3.0 的强弱项，说明最影响分数的一行。
4. 为移除 pause clause 后的可信承诺写出可验证替代方案。
5. 与 OpenAI Preparedness Framework v2 比较一个共同能力的分类和行动。

## 运行与验证

运行：python3 code/main.py

确认输出同时包含跨阈值和未跨阈值模型，并注明这是教学化政策摘要而非合规工具。
