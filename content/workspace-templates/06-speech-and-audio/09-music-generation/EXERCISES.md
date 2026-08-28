# 音乐生成——MusicGen、Stable Audio、Suno 与许可地震：练习指南

- 课程路径：`phases/06-speech-and-audio/09-music-generation`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 运行 `main.py`。它会以 ASCII 符号生成一段“生成式”和弦进行与鼓型——即音乐生成的卡通版。愿意的话，可用任意 MIDI 渲染器播放。
2. **中等。** 安装 `audiocraft`，使用 MusicGen-small 针对 4 个风格提示分别生成 10 秒片段，并相对于参考风格集测量 FAD。
3. **困难。** 使用 ACE-Step（或 MusicGen-melody），通过不同音色提示生成同一曲调的三个变体。计算与提示的 CLAP 相似度以验证对齐。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
