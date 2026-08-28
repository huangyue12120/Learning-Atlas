# 图像修复、外扩与编辑：练习指南

- 课程路径：`phases/08-generative-ai/09-inpainting-outpainting-editing`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 在 `main.py` 中把遮罩维度所占比例从 0.2 变到 0.8。达到多大比例时，图像修复质量（遮罩维度的残差）与无条件生成相同？
2. **中等。** 实现 RePaint：每隔 10 个反向步骤就跳回 5 步（添加噪声）再重新去噪。测量它是否会减少遮罩边缘的边界残差。
3. **困难。** 使用 Hugging Face diffusers，在 20 个人脸重生成任务上比较 SD 1.5 Inpaint + ControlNet-Openpose 与 Flux.1-Fill。分别评估姿态遵循和身份保持。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
