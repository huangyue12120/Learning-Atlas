# 实时音频处理：练习指南

- 课程路径：`phases/06-speech-and-audio/11-real-time-audio-processing`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 运行 `main.py`。它会模拟环形缓冲区 + 能量 VAD，并打印一条假 10 秒音频流各阶段的延迟。
2. **中等。** 使用 `sounddevice` 构建一个直通循环，以 20 ms 帧处理麦克风输入，并逐帧打印 VAD 状态。
3. **困难。** 使用 `aiortc` 构建全双工回声测试：浏览器 → WebRTC → Python → WebRTC → 浏览器。用 1 kHz 脉冲测量端到端延迟。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
