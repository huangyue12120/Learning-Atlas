# Darwin Godel Machine：开放式自我修改：练习指南

- 课程路径：phases/15-autonomous-systems/04-darwin-godel-machine
- 可运行 Python 文件：main.py

## 练习目标

观察自我修改循环如何优化评估器可见的分数，并为评估器建立不可被智能体修改的防火墙。

## 动手练习

1. 运行 main.py，记录每代 reported score、true score 和工具组合。
2. 用 --reward-hack-allowed 重跑，找出奖励黑客首次拉开分差的代数。
3. 列出智能体可以编辑且会影响评估输出的所有文件或函数。
4. 为一个真实代码仓库设计评估器防火墙，标明只读、隔离和留出数据边界。
5. 解释脚手架级改动为什么比模型微调更可能跨模型迁移。

## 运行与验证

运行：python3 code/main.py

重跑：python3 code/main.py --reward-hack-allowed

确认开启旁路后 reported score 上升但 true score 没有同幅改善。
