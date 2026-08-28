# 激活函数：练习指南

- 课程路径：`phases/03-deep-learning-core/04-activation-functions`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 实现 Parametric ReLU（PReLU），负斜率 alpha 可学习；在圆数据集训练并与固定 Leaky ReLU 比较。
2. 将梯度消失实验扩展到 50 层，绘制 sigmoid、tanh、ReLU、GELU 每层幅度；各自在哪层信号有效归零？
3. 实现 ELU：x>0 时 x，否则 alpha*(e^x-1)；在同一网络与 ReLU 比较死神经元率。
4. 构建训练中运行的“梯度健康监视器”：每 epoch 测每层平均梯度，任一层低于 0.001 或高于 100 时警告。
5. 将训练比较换成第 01 课 XOR 数据，哪种激活收敛最快？为何与圆分类结果不同？

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
