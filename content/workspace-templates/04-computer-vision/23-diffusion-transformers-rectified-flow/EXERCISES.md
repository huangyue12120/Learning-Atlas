# Diffusion Transformer 与 Rectified Flow：练习指南

- 课程路径：`phases/04-computer-vision/23-diffusion-transformers-rectified-flow`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **（简单）** 在合成 blob 数据集上训练上方 TinyDiT 500 步。比较用 10、20、50 个 Euler 步生成的样本。
2. **（中等）** 通过将可学习类别嵌入拼接到时间嵌入，添加文本条件（按颜色定义 10 个 blob“类别”）。按类别 0、5、9 采样，验证颜色匹配。
3. **（困难）** 对同样大小、相同数据和训练步数的 rectified-flow 与 DDPM 网络生成样本，计算 Fréchet 距离（FID 代理）。报告哪一种收敛更快。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
