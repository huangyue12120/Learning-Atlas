# PyTorch 入门：练习指南

- 课程路径：`phases/03-deep-learning-core/11-intro-to-pytorch`
- 可运行 Python 文件：`pytorch_intro.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **添加批归一化。** 在每个线性层后、激活前插入 `nn.BatchNorm1d`。比较测试准确率、训练速度与仅 dropout 版本的差异；批归一化应以更少 epoch 达到 98% 以上。
2. **实现学习率查找器。** 用指数增长的学习率（从 1e-7 到 1.0）训练一 epoch，绘制损失与 LR；最优 LR 在损失开始上升前。用它为 MNIST 模型选择更好的 LR。
3. **以混合精度迁移到 GPU。** 向训练循环添加 `torch.amp.autocast` 和 `GradScaler`，在 GPU 上比较有无混合精度的吞吐量（样本/秒）；A100 上应约快 2 倍。
4. **构建自定义 Dataset。** 下载 Fashion-MNIST（格式与 MNIST 相同但为服装），实现带 `__getitem__`、`__len__` 的 `FashionMNISTDataset(Dataset)`，训练同一 MLP 并比较准确率；Fashion-MNIST 更难，预期约 88% 对 98%。
5. **用带动量 SGD 替换 Adam。** 用 `SGD(params, lr=0.01, momentum=0.9)` 训练，比较收敛曲线；再加 `CosineAnnealingLR`，查看第 10 个 epoch 时 SGD 是否追上 Adam。

## 运行与验证

在课程目录下执行：

```bash
python3 pytorch_intro.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
