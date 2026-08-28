# 音频 Transformer——Whisper 架构：练习指南

- 课程路径：`phases/07-transformers-deep-dive/10-audio-transformers-whisper`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 运行 `main.py`。确认对一个采样率为 16 kHz、帧移为 10 ms 的 1 秒信号，帧数约为 100；30 秒时约为 3,000 帧。
2. **中等。** 使用 `numpy.fft` 构建完整的对数梅尔频谱图。验证 80 个梅尔频带与 `librosa.feature.melspectrogram(n_mels=80)` 的结果在数值误差范围内一致。
3. **困难。** 实现流式推理：把音频切成 10 秒窗口、保留 2 秒重叠，对每个音频块运行 Whisper，再合并转写结果。用一段 5 分钟的播客样本，测量相对于单次完整推理的词错误率。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
