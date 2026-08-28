# 音频评估——WER、MOS、UTMOS、MMAU、FAD 与开放排行榜：练习指南

- 课程路径：`phases/06-speech-and-audio/17-audio-evaluation-metrics`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 运行 `main.py`。在玩具输入上计算 WER / CER / EER / SECS / 类 FAD / 类 MMAU 指标。
2. **中等。** 构建 TTS 往返 WER 工具，把 Kokoro 或 F5-TTS 输出送入 Whisper，在 50 条提示上计算 WER，并标记 WER &gt; 10% 的提示。
3. **困难。** 在 MMAU-Pro 的语音与多音频子集上评测第 10 课选择的 LALM（各 50 条）。报告各类别准确率，并与公开数字比较。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
