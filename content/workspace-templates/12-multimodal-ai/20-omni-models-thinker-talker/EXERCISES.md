# 全能模型：Qwen2.5-Omni 与 Thinker-Talker 分工：练习指南

- 课程路径：`phases/12-multimodal-ai/20-omni-models-thinker-talker`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 你的目标 TTFAB 是 300ms。在 7B Thinker 和 300M Talker 上，列出每个组件的延迟。

2. Qwen2.5-Omni 使用 TMRoPE。描述这样一个提示词中模型看到什么：用户在 t=1s 开始说话，摄像头在 t=1.2s 捕捉到一个手势。

3. 全双工支持要求模型在听的同时输出音频。提出一种能教会模型这一点的训练数据格式。

4. 阅读 Moshi 论文第 4 节。描述“内心独白”的分离，以及它为什么避免了 Thinker-Talker 拆分。

5. 计算吞吐预算：为了跟上 16kHz 音频中每秒 50 个基础层词元，Talker 必须多快输出词元？

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
