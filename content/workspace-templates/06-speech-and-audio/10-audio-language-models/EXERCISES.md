# 音频—语言模型——Qwen2.5-Omni、Audio Flamingo 与 GPT-4o Audio：练习指南

- 课程路径：`phases/06-speech-and-audio/10-audio-language-models`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 运行 `main.py`，查看一个玩具投影器模式，以及把（音频嵌入、文本词元）路由为输出词元的假 LALM。
2. **中等。** 在 100 个 MMAU-Pro 语音条目上评测 Qwen2.5-Omni-7B，并与论文报告的结果比较。
3. **困难。** 构建最小音频字幕基线：BEATs 编码器 + 两层投影器 + 冻结的 Llama-3.2-1B。只在 AudioCaps 上微调投影器，并在 Clotho-AQA 上与 SALMONN 比较。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
