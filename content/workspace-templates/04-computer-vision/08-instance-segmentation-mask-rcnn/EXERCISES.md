# 实例分割：Mask R-CNN：练习指南

- 课程路径：`phases/04-computer-vision/08-instance-segmentation-mask-rcnn`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **（简单）** 在 100 个随机框上用 `torchvision.ops.roi_align` 验证你的 RoIAlign，报告最大绝对差；再运行 RoIPool（2017 前行为），展示它在边缘附近框上会偏离约 1–2 个特征图像素。
2. **（中等）** 在 50 图自定义数据集（任意两类：气球、鱼、坑洞、logo）上微调 `maskrcnn_resnet50_fpn_v2`；冻结骨干、训练 20 个 epoch，报告 mask AP@0.5。
3. **（困难）** 将 Mask R-CNN 掩码头替换为预测 56x56 而非 28x28 的版本；测量 mAP@IoU=0.75 前后变化，解释增益（或无增益）为何符合预期边界精度/内存权衡。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
