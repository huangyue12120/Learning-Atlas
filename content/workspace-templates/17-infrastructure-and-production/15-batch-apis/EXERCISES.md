# Batch API：练习指南

- 课程路径：`phases/17-infrastructure-and-production/15-batch-apis`
- 可运行 Python 文件：`main.py`

## 练习目标

按交互性、延迟容忍度、共享前缀和折扣设计 batch 与在线推理的分流。

## 动手练习

1. 运行 `code/main.py`，为 100k 文档、3K-token 系统提示词和 500-token 输出计算 batch + cache 相对同步基线的节省。
2. 在熟悉的产品中选三个功能，分别分流到交互式、半交互式和 batch，并写出判定条件。
3. 用户抱怨报告耗时 3 小时，判断是错误 batch 分流还是合理的异步需求。
4. 对 24 小时返回 SLA、P99 20 小时的 batch API 设计沟通方式和边界状态行为。
5. 计算共享前缀达到多长时，batch + cache 比夜间运行预留 GPU 更便宜。

## 运行与验证

```bash
python3 code/main.py
```

确认成本模型和用户体验判定同时输出，并保存一项 batch 分流规则。
