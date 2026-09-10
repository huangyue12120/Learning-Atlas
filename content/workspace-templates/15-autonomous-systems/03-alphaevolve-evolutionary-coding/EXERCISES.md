# AlphaEvolve：进化式编程智能体：练习指南

- 课程路径：phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding
- 可运行 Python 文件：main.py

## 练习目标

用候选变异、留出评估和 MAP-elites 多样性理解为什么评估器决定进化搜索是否可信。

## 动手练习

1. 运行 main.py，记录含留出集与仅训练集评估的最佳表达式和 train-to-test gap。
2. 用 --no-holdout 重跑，指出哪个结果是过拟合代理，而不是泛化改进。
3. 为编译器优化任务设计一个保持候选多样性的特征向量描述。
4. 列出一个评估器会被候选程序钻空子的领域，并写出一个反奖励黑客检查。
5. 为自己的问题写出评估器签名，包含正确性、性能、留出输入和拒绝条件。

## 运行与验证

运行：python3 code/main.py

重跑：python3 code/main.py --no-holdout

确认两次运行都退出码为 0，并解释留出评估改变了什么。
