# 语音识别（ASR）——CTC、RNN-T 与注意力：练习指南

- 课程路径：`phases/06-speech-and-audio/04-speech-recognition-asr`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 运行 `main.py`。它会对手工构造的 CTC 输出做贪心解码，并计算相对于参考文本的 WER。
2. **中等。** 正确实现步骤 2 的前缀树束搜索（考虑空白合并规则）。在一个包含 10 个样本的合成数据集上与贪心解码比较。
3. **困难。** 在 [LibriSpeech test-clean](https://www.openslr.org/12) 上使用 `whisper-large-v3-turbo`，计算前 100 条语句的 WER，并与公开数据比较。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
