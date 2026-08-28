# 音频分类——从基于 MFCC 的 k-NN 到 AST 与 BEATs：练习指南

- 课程路径：`phases/06-speech-and-audio/03-audio-classification`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 运行 `main.py`。它会在一个 4 类合成数据集（不同音高的纯音）上训练基于 MFCC 的 k-NN 基线。报告混淆矩阵。
2. **中等。** 把 `summarize` 替换为 `[mean, var, skew, kurtosis]`。在同一合成数据集上，四阶矩池化是否优于均值 + 方差？
3. **困难。** 使用 `torchaudio` 在 ESC-50 的 fold 1 上训练二维 CNN。报告五折交叉验证准确率。加入 SpecAugment（时间遮蔽 = 20，频率遮蔽 = 10），并报告指标变化。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
