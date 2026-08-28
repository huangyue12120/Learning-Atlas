# Whisper——架构与微调：练习指南

- 课程路径：`phases/06-speech-and-audio/05-whisper-architecture-finetuning`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 运行 `main.py`。它会对 Whisper 风格提示进行分词、计算解码形状预算，并打印 10 分钟音频的分块计划。
2. **中等。** 安装 `faster-whisper`，转录一段 10 分钟的播客，并与人工文本比较 WER。尝试 `language="auto"` 和强制 `language="en"`。
3. **困难。** 使用 HF `datasets`，选择一种 Whisper 表现不佳的语言（如乌尔都语），在 2 小时数据上使用 LoRA 微调 Medium 两轮，并报告 WER 变化。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
