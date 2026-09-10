# STaR、V-STaR、Quiet-STaR：练习指南

- 课程路径：phases/15-autonomous-systems/02-star-family-reasoning
- 可运行 Python 文件：main.py

## 练习目标

区分结果奖励、验证器和过程证据，观察自举推理在分布外任务上可能形成的捷径。

## 动手练习

1. 运行 main.py，比较没有 shortcut 与 shortcut 频率为 0.4 时的训练集和 OOD 准确率。
2. 修改模拟器加入一个不同分布的留出集，量化训练—部署差距。
3. 解释 STaR 的 keep-if-correct 与过程监督在标注成本和可靠性上的差异。
4. 设计一个能让 shortcut rationale 失败的评估任务，并说明为什么它不是简单改写。
5. 记录 V-STaR best-of-N 选择器提高推理结果时仍未解决的训练偏差。

## 运行与验证

运行：python3 code/main.py

确认输出同时包含 STaR、V-STaR 和 Quiet-STaR 的比较，并保存至少一项 OOD 观察。
