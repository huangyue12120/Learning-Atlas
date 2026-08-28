# 语义分割：U-Net：练习指南

- 课程路径：`phases/04-computer-vision/07-semantic-segmentation-unet`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **（简单）** 为二值分割（前景 vs 背景）实现 `bce_dice_loss`。在前景仅占 5% 像素的合成二类数据集上验证：组合损失比单独 BCE 收敛更快。
2. **（中等）** 用 `nn.ConvTranspose2d` 上采样模块替换 `nn.Upsample + conv`；在合成数据上训练两者并比较 mIoU，观察转置卷积版本中棋盘伪影出现的位置。
3. **（困难）** 使用真实分割数据集（Oxford-IIIT Pets、Cityscapes mini split 或医学子集），将 U-Net 训练至距 `smp.Unet` 参考 2 个 IoU 点以内；报告逐类别 IoU，并指出哪些类别从损失中加入 Dice 获益最多。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
