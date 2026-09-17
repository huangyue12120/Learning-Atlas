# LLM 可观测性栈选型：练习指南

- 课程路径：`phases/17-infrastructure-and-production/13-llm-observability`
- 可运行 Python 文件：`main.py`

## 练习目标

用 OTel、网关、评估平台和数据湖组成可追踪且成本可控的 LLM 可观测性栈。

## 动手练习

1. 运行 `code/main.py`，为 LangChain 团队比较 Langfuse 与 Opik 的 OSS 自托管取舍。
2. 假设每天 5M 条 trace、Datadog 月费 15 万美元，估算 Arize AX 的盈亏平衡点。
3. 设计每次 LLM 调用必须填写的 OpenTelemetry GenAI 属性，包括模型、token 和 trace 关联。
4. 论证 Phoenix 单独用于生产是否足够，并指出何时需要网关或长期归档。
5. 评估 Helicone 20 ms 代理开销在 P99 TTFT 300 ms 与 100 ms 两种 SLA 下是否可接受。

## 运行与验证

```bash
python3 code/main.py
```

确认成本、延迟和证据链均有输出，并留下一份按用途分层的工具清单。
