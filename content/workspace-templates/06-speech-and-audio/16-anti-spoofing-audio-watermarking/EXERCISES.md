# 语音反欺骗与音频水印——ASVspoof 5、AudioSeal、WaveVerify：练习指南

- 课程路径：`phases/06-speech-and-audio/16-anti-spoofing-audio-watermarking`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 运行 `main.py`。在合成音频上运行玩具检测器和玩具水印嵌入/检测。
2. **中等。** 安装 `audioseal`，在 TTS 输出中嵌入 16 位载荷，再重新解码。用噪声破坏音频，并测量比特恢复准确率。
3. **困难。** 在 ASVspoof 2019 LA 上微调 RawNet2 或 AASIST 并测量 EER。再在一组留出的 F5-TTS 生成音频上测试——观察分布外检测如何退化。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
