# METR 时间跨度与外部能力评估：练习指南

- 课程路径：phases/15-autonomous-systems/21-metr-external-evaluation
- 可运行 Python 文件：main.py

## 练习目标

用 Bernoulli 成功结果拟合时间跨度曲线，理解 10%、50%、90% 交点和评估上下界。

## 动手练习

1. 运行 main.py，确认合成真值附近的 50% horizon。
2. 把任务时间网格减半，观察估计变化并记录数值解释。
3. 按 HCAST、RE-Bench 和 SWAA 分类选择一个更适合自己生产任务的权重。
4. 把约 20% 的失败翻为成功，观察 eval-context gaming 如何抬高 horizon。
5. 为自己的 bug backlog 设计样本、拟合、置信度和结果解读流程。

## 运行与验证

运行：python3 code/main.py

确认输出包含 clean fit、gaming rate 和至少三个概率交点，并明确 horizon 是能力上界而非部署保证。
