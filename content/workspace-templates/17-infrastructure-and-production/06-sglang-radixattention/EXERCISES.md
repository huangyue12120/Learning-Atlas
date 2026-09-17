# 前缀缓存服务：练习指南

- 课程路径：`phases/17-infrastructure-and-production/06-sglang-radixattention`
- 可运行 Python 文件：`main.py`

## 练习目标

理解 RadixAttention 的树形前缀复用、分支级驱逐和提示词布局约束。

## 动手练习

1. 运行 `code/main.py`，在同一负载上比较 FCFS 和缓存感知策略，区分 prefill 节省、decode 节省与排队延迟。
2. 将提示词随机排列为 `[system, tools, context]` 后重跑，解释命中率变化。
3. 计算 Llama 3.1 8B 将 2,000-token 系统提示词留在 HBM 的成本，并与不复用前缀的 16 序列批次比较。
4. 用三句话说明前缀密集负载中树形 LRU 为何胜过块形 LRU。
5. 针对 8% 缓存命中率列出三个原因及各自需要观察的诊断指标。

## 运行与验证

```bash
python3 code/main.py
```

确认共享前缀、分支命中和驱逐行为都有可读输出，并保存一项提示词排序实验。
