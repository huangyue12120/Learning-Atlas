# 托管 LLM 平台：练习指南

- 课程路径：`phases/17-infrastructure-and-production/01-managed-llm-platforms`
- 可运行 Python 文件：`main.py`

## 练习目标

用延迟、成本归因、合规和供应商故障转移约束托管 LLM 平台选型，而不是只比较模型名称。

## 动手练习

1. 运行 `code/main.py`，为 70B 类模型计算 Azure PTU 与按需服务的盈亏平衡利用率，并与 40–60% 的经验区间比较。
2. 设计同时使用 Claude 3.7 Sonnet 和 GPT-4o 的双供应商部署：指定网关、路由和故障转移策略。
3. 为要求 BAA、美国东部数据驻留和 P99 TTFT < 100 ms 的医疗客户选择平台，并列出三项证据。
4. 模拟 Bedrock 流量不变但账单增长 4 倍的排查；比较没有和有 Application Inference Profiles 时的归因路径。
5. 对每月 1 亿 token 的 Claude 工作负载比较直接 API、Bedrock 按需和 Provisioned Throughput 的成本假设。

## 运行与验证

```bash
python3 code/main.py
```

确认平台比较、成本计算和双供应商建议均有输出，并记录一条带假设的选型结论。
