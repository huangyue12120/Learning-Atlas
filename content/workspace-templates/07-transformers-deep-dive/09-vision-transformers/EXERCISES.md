# 视觉 Transformer（ViT）：练习指南

- 课程路径：`phases/07-transformers-deep-dive/09-vision-transformers`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 运行 `main.py`。验证 patch 数量等于 `(H/P) * (W/P)`，扁平 patch 维度等于 `P*P*C`。
2. **中等。** 实现二维正弦位置嵌入——分别为每个 patch 的 `row` 和 `col` 计算独立正弦编码，再拼接。在微型 PyTorch ViT 中使用它们，并在 CIFAR-10 上与可学习位置嵌入比较准确率。
3. **困难。** 构建三层 ViT（PyTorch），使用 4×4 patch 在 1000 张 MNIST 图像上训练，测量测试准确率。之后在同样 1000 张图像上加入 DINOv2 预训练（简化：只训练编码器根据被遮蔽 patch 预测 patch 嵌入）。准确率是否改善？

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
