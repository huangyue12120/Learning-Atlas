# 说话人识别与验证：练习指南

- 课程路径：`phases/06-speech-and-audio/06-speaker-recognition-verification`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 运行 `main.py`。它会构建合成“说话人”（不同音调轮廓）、完成注册，并在包含 100 对样本的试验列表上计算 EER。
2. **中等。** 对 30 条 VoxCeleb1 语句（5 位说话人 × 每人 6 条）使用 SpeechBrain ECAPA，比较余弦评分与 PLDA 的 EER。
3. **困难。** 使用 `pyannote.audio` 构建完整的注册 → 说话人分离 → 验证流水线，并在 AMI 开发集上评估 DER。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
