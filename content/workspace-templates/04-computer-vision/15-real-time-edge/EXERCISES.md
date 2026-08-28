# 实时视觉：边缘部署：练习指南

- 课程路径：`phases/04-computer-vision/15-real-time-edge`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **（简单）** 在 CPU 上测量 `resnet18`、`mobilenet_v3_small`、`efficientnet_v2_s` 和 `convnext_tiny` 在 224x224 下的 p50 延迟。报告表格，并确定哪个架构具有最佳的每毫秒准确率。
2. **（中等）** 对 `mobilenet_v3_small` 应用训练后静态量化。报告 FP32 与 INT8 的延迟，以及在 CIFAR-10 或类似保留子集上的准确率损失。
3. **（困难）** 将 `convnext_tiny` 导出为 ONNX，用 `CPUExecutionProvider` 通过 `onnxruntime` 运行，并与 PyTorch eager 基线比较延迟。找出 ONNX Runtime 首次更快的层，并解释原因。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
