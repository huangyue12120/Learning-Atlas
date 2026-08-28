# Janus-Pro：统一多模态模型的解耦编码器：练习指南

- 课程路径：`phases/12-multimodal-ai/15-janus-pro-decoupled-encoders`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. Janus-Pro-7B 在 GenEval 上超过 DALL-E 3。解释为什么一个 7B 开放模型能在生成上匹敌前沿专有模型，却不能在理解上匹敌它。

2. 实现路由函数：给定提示词文本，将其分类为 `understand` 或 `generate`。如何处理“描述然后画出来”这样的模糊提示词？

3. JanusFlow 将 VQ 路径替换成矫正流。Transformer 主体现在输出什么？损失发生了什么变化？

4. 提出第四个任务，让 Janus-Pro 架构通过增加一个解耦编码器来处理。例如：图像分割（DINO 风格）、深度（MiDaS 风格）。

5. 阅读 Janus-Pro 第 4.2 节关于数据规模的内容。与 Janus 相比，哪个数据阶段对 T2I 质量提升贡献最大？

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
