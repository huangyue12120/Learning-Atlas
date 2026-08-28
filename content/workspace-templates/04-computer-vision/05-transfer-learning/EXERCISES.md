# 迁移学习与微调：练习指南

- 课程路径：`phases/04-computer-vision/05-transfer-learning`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **（简单）** 在同一 synthetic-CIFAR 数据集上，将 `ResNet18` 作为线性探测器（骨干冻结）和完整微调分别训练；并列报告准确率。解释哪个差距表示特征迁移良好，哪个表示迁移不好。
2. **（中等）** 有意引入 bug：对骨干 stage 而非头部设置 `base_lr = 1e-1`。展示训练损失爆炸，再用 `discriminative_param_groups` 恢复；记录每个 stage 开始发散的 LR。
3. **（困难）** 选择医学影像数据集（如 CheXpert-small、PatchCamelyon 或 HAM10000），比较：(a) ImageNet 预训练、骨干冻结 + 线性头；(b) ImageNet 预训练、端到端微调；(c) 从头训练。报告各自准确率和计算成本；数据集达到什么规模时从头训练才有竞争力？

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
