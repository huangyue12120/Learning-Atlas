# 从零实现卷积：练习指南

- 课程路径：`phases/04-computer-vision/02-convolutions-from-scratch`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **（简单）** 给定 128x128 灰度输入及 `[Conv3x3(s=1,p=1), Conv3x3(s=2,p=1), Conv3x3(s=1,p=1), Conv3x3(s=2,p=1)]` 的堆叠，手工计算每层的输出空间尺寸与感受野。用含占位卷积的 PyTorch `nn.Sequential` 验证。
2. **（中等）** 扩展 `conv2d_naive` 与 `conv2d_im2col`，使其接受 `groups` 参数。证明 `groups=C_in=C_out` 会复现深度卷积，且其参数量为 `C * K * K` 而不是 `C * C * K * K`。
3. **（困难）** 手工实现 `conv2d_im2col` 的反向传播：给定输出梯度，计算 `x` 和 `w` 的梯度。对同一输入和权重，用 `torch.autograd.grad` 验证。需要注意：im2col 的梯度是 `col2im`，它必须累加重叠窗口。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
