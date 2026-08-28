# CNN：从 LeNet 到 ResNet：练习指南

- 课程路径：`phases/04-computer-vision/03-cnns-lenet-to-resnet`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **（简单）** 逐层手工计算 `TinyResNet` 的参数量，与 `sum(p.numel() for p in net.parameters())` 比较。参数预算大部分去往哪里——卷积、BN 还是分类器头？
2. **（中等）** 实现 Bottleneck 模块（1x1 -> 3x3 -> 1x1，带跳连），并用它为 CIFAR 构建 ResNet-50 风格网络；比较它与 `TinyResNet` 的参数量。
3. **（困难）** 从 `BasicBlock` 移除跳连，在 CIFAR-10 上分别训练一个 34 模块“普通”网络和一个 34 模块 ResNet 各 10 个 epoch。绘制两者训练损失随 epoch 的变化，复现 He 等人图 1：普通深层网络收敛到比更浅同类网络更高的损失。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
