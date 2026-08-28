# ControlNet、LoRA 与条件控制：练习指南

- 课程路径：`phases/08-generative-ai/08-controlnet-lora-conditioning`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 在 `main.py` 中让 LoRA 阶数 `r` 从 1 变到 4。达到多少阶时，LoRA 可以精确匹配秩为 2 的目标增量？
2. **中等。** 在两个目标变换上分别训练 LoRA。一起加载它们，展示相加后的交互。什么情况下交互不再保持线性？
3. **困难。** 使用 diffusers 叠加 SDXL-base + Canny-ControlNet（权重 0.8）+ 风格 LoRA（α 0.8）+ IP-Adapter（权重 0.6）。改变各组件权重，测量 FID 与提示词遵循之间的权衡。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
