# 视频理解：时序建模：练习指南

- 课程路径：`phases/04-computer-vision/12-video-understanding`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **（简单）** 计算 T=8 的 FramePool 与 T=8 的 I3D 风格 3D ResNet 的近似 FLOPs，说明为何 2D+pool 便宜 3–5 倍。
2. **（中等）** 生成合成视频数据集：随机球沿随机方向运动，按运动方向标注（“从左到右”“从右到左”“斜向上”）。在其上训练 FramePool，展示它接近随机准确率，从而证明外观不足以解决运动任务。
3. **（困难）** 以 `Conv2Plus1D` 替换 ResNet-18 中每个 Conv2d，构建 R(2+1)D-18；从 ImageNet 预训练 ResNet-18 膨胀首个卷积权重，在练习 2 运动数据上训练并击败 FramePool。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
