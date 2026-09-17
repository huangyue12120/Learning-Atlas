# 面向 LLM 的 FinOps：练习指南

- 课程路径：`phases/17-infrastructure-and-production/27-finops-llms`
- 可运行 Python 文件：`main.py`

## 练习目标

从调用点归因、token 分层、产品结果单位成本到租户执行阶梯，建立可行动的 LLM FinOps。

## 动手练习

1. 运行 `code/main.py`，观察 kill switch 在什么 z-score 触发，并说明阈值选择和误报代价。
2. 设计按租户、按任务的成本仪表盘，列出最先实现的五个视图。
3. 最大租户单位经济学为负时，提出三项按客户影响排序的干预措施。
4. 假设每张工单消耗 3M token、每天解决 800 张，按 GPT-5 缓存费率计算每张工单成本。
5. 评估调用点追溯打标签的准确性，说明什么时候必须升级到 trace 与账单 joiner。

## 运行与验证

```bash
python3 code/main.py
```

确认输出能区分限流、支出上限和 kill switch，并记录一次租户暂停事件。
