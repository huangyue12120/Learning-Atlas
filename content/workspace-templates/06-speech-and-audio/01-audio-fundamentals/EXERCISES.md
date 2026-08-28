# 音频基础——波形、采样与傅里叶变换：练习指南

- 课程路径：`phases/06-speech-and-audio/01-audio-fundamentals`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 在 16 kHz 下合成 1 秒的 220 Hz + 440 Hz + 880 Hz 混合信号，运行 DFT，确认三个峰值出现在预期分箱。
2. **中等。** 以 48 kHz 录制一段 3 秒的语音。先用 `torchaudio.transforms.Resample`（带抗混叠）降采样到 16 kHz，再用朴素抽取（每三个样本取一个）降采样到 16 kHz。对两者做 FFT。混叠出现在哪里？
3. **困难。** 只使用 `math` 和步骤 3 的 DFT，从头实现 STFT。帧长为 400，帧移为 160，使用 Hann 窗。用 `matplotlib.pyplot.imshow` 绘制幅度，得到第 02 课中的频谱图。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
