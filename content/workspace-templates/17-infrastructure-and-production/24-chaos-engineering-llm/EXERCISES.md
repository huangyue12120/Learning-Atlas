# LLM 混沌工程：练习指南

- 课程路径：`phases/17-infrastructure-and-production/24-chaos-engineering-llm`
- 可运行 Python 文件：`main.py`

## 练习目标

在 SLI/SLO、可观测性、自动回滚和值班响应到位后，用 LLM 专属故障验证系统韧性。

## 动手练习

1. 运行 `code/main.py`，找出哪项实验触发燃烧率闸门，并解释错误预算为何暂停它。
2. 为 vLLM RAG 服务设计五项初始混沌实验，分别写成功标准、停止条件和回滚。
3. 燃烧率告警暂停实验时，设计区分混沌注入与自然流量因素的证据链。
4. 论证生产混沌与 staging 混沌的边界，并说明何时生产验证才是正确选择。
5. 列出三种通用网络混沌无法复现的 LLM 专属故障，例如 tokenizer 停滞或 KV 驱逐风暴。

## 运行与验证

```bash
python3 code/main.py
```

确认控制、目标、安全和可观测性四个平面都有结果，并保存一次停止/回滚记录。
