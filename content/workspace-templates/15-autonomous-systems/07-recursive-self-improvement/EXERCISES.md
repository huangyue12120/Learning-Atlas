# 递归式自我改进：能力与对齐：练习指南

- 课程路径：phases/15-autonomous-systems/07-recursive-self-improvement
- 可运行 Python 文件：main.py

## 练习目标

用两个增长过程跟踪能力—对齐差距，区分模拟阈值信号与真实安全结论。

## 动手练习

1. 运行 main.py --threshold 2.0，记录 Scenario A 首次跨过阈值的 cycle。
2. 把能力率与对齐率设为相同，观察噪声如何影响差距。
3. 解释 alignment faking 研究中的训练条件变化，并设计一个检测器。
4. 从 RSI workshop 的开放问题中选一个，写出可测量的研究假设。
5. 为前沿 RSI 循环设计人工检查点，明确人工要批准什么而不是只点击继续。

## 运行与验证

运行：python3 code/main.py --threshold 2.0

确认输出包含单次轨迹与 Monte Carlo 汇总，并注明阈值不是能力或风险的充分证明。
