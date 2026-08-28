# Transfusion：在一个 Transformer 中实现自回归文本 + 扩散图像：练习指南

- 课程路径：`phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. Transfusion 风格模型训练 70% 文本词元和 30% 图像块。图像扩散损失的量级约为文本 NTP 损失的 10 倍。什么损失权重能平衡它们？

2. 为序列 `[T, T, <image>, P, P, P, P, </image>, T]` 实现块三角掩码。标出每个元素为 0 还是 1。

3. MMDiT 有模态特定的 QKV 权重。与 Transfusion 完全共享的 Transformer 相比，这会增加多少参数？在 7B 参数规模下值得吗？

4. 生成过程：给定文本提示词，模型对 50 个词元运行 NTP，遇到 `<image>`，然后对 256 个图像块运行 20 步去噪。总共需要多少次前向传播？

5. 阅读 SD3 论文第 3 节。描述矫正流，以及它为什么比 DDPM 用更少的推理步骤收敛。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
