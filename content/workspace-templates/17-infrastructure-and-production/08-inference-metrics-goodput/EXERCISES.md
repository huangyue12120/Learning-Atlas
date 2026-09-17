# 推理指标与 Goodput：练习指南

- 课程路径：`phases/17-infrastructure-and-production/08-inference-metrics-goodput`
- 可运行 Python 文件：`main.py`

## 练习目标

把 TTFT、TPOT、ITL、百分位数和 goodput 连接到真实用户体验与 SLO 闸门。

## 动手练习

1. 运行 `code/main.py`，生成含 1% 尾部尖峰的分布，比较 P99 TPOT 从 30 ms 收紧到 15 ms 时的 goodput。
2. 面对“Llama 3.3 70B H100 可达 15,000 tok/s”的宣传，列出至少三个必须追问的测试条件。
3. 解释分块 prefill 能保护 P99 TPOT 却不能保护平均 TPOT 的原因。
4. 为语音助理设计一个以“用户听到”而非“读到”首 token 为中心的消费者 SLO。
5. 对照 LLMPerf 与 GenAI-Perf 文档，记录它们在其他三项指标上的定义差异。

## 运行与验证

```bash
python3 code/main.py
```

确认脚本同时报告中心趋势、尾部和 goodput，并写出一条可执行的 SLO。
