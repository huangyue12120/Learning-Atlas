# 潜空间扩散与 Stable Diffusion：练习指南

- 课程路径：`phases/08-generative-ai/07-latent-diffusion-stable-diffusion`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 使用引导强度 `w ∈ {0, 1, 3, 7, 15}` 运行 `main.py`。记录各类别的样本均值。`w` 达到多少时，类别均值会超过真实数据均值并继续分离？
2. **中等。** 用一对带重建损失的 tanh-MLP 编码器 / 解码器替换玩具线性编码器。在新潜变量上重新训练扩散。样本质量是否发生变化？
3. **困难。** 使用 diffusers 配置真实的 Stable Diffusion 推理：加载 `sdxl-base`，用 CFG=7 运行 30 个 Euler 步并计时。然后切换到 `sdxl-turbo`，使用 4 步和 CFG=0。生成相同主体，描述质量发生了什么变化，并解释原因。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
