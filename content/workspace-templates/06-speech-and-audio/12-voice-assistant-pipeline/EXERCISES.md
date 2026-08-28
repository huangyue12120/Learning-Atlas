# 构建语音助理流水线——Phase 6 综合项目：练习指南

- 课程路径：`phases/06-speech-and-audio/12-voice-assistant-pipeline`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 运行 `main.py`。它会用桩模块模拟一个完整的端到端轮次，并打印各阶段延迟。
2. **中等。** 把 STT 桩替换为真实 Whisper 模型，处理预录制 `.wav`，测量 WER 与端到端延迟。
3. **困难。** 加入工具调用：实现 `get_weather`（任意 API）和 `set_timer`。让 LLM 通过这些工具进行路由，并验证当用户说“set a 5 minute timer”时会触发正确函数，且语音回应进行确认。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
