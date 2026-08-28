# 评估——FID、CLIP Score 与人类偏好：练习指南

- 课程路径：`phases/08-generative-ai/14-evaluation-fid-clip-score`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 运行 `main.py`。在同一组合成分布上比较 N=100 与 N=1000 时的 FID，报告偏差大小。
2. **中等。** 根据合成 CLIP 式特征实现 CMMD（公式见 Jayasumana 等，2024）。比较它与 FID 对质量差异的敏感度。
3. **困难。** 复现 HPSv2 设置：从 Pick-a-Pic 子集中取 1000 对图像—提示词，在偏好数据上微调小型 CLIP 评分器，再测量它与留出集的一致率。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
