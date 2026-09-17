# LLM API 压力测试：练习指南

- 课程路径：`phases/17-infrastructure-and-production/22-load-testing-llm-apis`
- 可运行 Python 文件：`main.py`

## 练习目标

识别 Locust GIL 与重复提示词缓存偏差，并用真实分布和四种负载模式建立可比较的 SLA 基线。

## 动手练习

1. 运行 `code/main.py`，比较均一提示词与真实 token 分布，解释吞吐和延迟差距。
2. 为 100 并发、TTFT P95 < 800 ms、持续 5 分钟的 CI 闸门写出 k6 场景。
3. 浸泡测试发现内存每小时增长 50 MB 时，列出三种原因及区分它们所需的插桩。
4. 尖峰从 10 RPS 升到 100 RPS，结合 Karpenter 与 vLLM production-stack 估算恢复时间。
5. 同一服务器上 GenAI-Perf 报 TPOT 6 ms、LLMPerf 报 11 ms 时，核对两者的测量边界和客户端开销。

## 运行与验证

```bash
python3 code/main.py
```

确认稳态、爬坡、尖峰和浸泡的输出可区分，并保存一次工具定义差异记录。
