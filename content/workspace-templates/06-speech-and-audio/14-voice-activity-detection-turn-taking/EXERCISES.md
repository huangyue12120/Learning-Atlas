# 语音活动检测与轮次切换——Silero、Cobra 与 Flush 技巧：练习指南

- 课程路径：`phases/06-speech-and-audio/14-voice-activity-detection-turn-taking`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 运行 `main.py`。它会模拟一段语音 + 静音 + 语音 + 咳嗽序列，并测试三级 VAD。
2. **中等。** 安装 `silero-vad`，处理一段 5 分钟录音，调整阈值以同时减少首词截断与误触发，并报告精确率 / 召回率。
3. **困难。** 构建一个微型轮次检测器：Silero VAD + 读取最近 10 个单词嵌入的三层 MLP（使用 sentence-transformers）。在手工标注的轮次结束数据集上训练，F1 比只用 Silero 高 10%。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
