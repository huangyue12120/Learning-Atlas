# Kubernetes 上的 GPU 自动扩缩容：练习指南

- 课程路径：`phases/17-infrastructure-and-production/03-gpu-autoscaling-kubernetes`
- 可运行 Python 文件：`main.py`

## 练习目标

用队列深度、KV 压力和 gang scheduling 设计不会被 GPU 占用率误导的推理扩缩容策略。

## 动手练习

1. 运行 `code/main.py`，比较突发流量下占空比 HPA 丢弃的请求和队列深度 HPA 捕获的请求。
2. 为 H100 SXM5 上 FP8 Llama 3.3 70B 设计 Karpenter NodePool，写出 capacity type、整合策略、等待时间和隔离 taint。
3. 对“GPU 可用但 pod Pending”做诊断，区分 Karpenter、kube-scheduler 与 KAI Scheduler，并列出确认指标。
4. 为解耦 prefill 和 decode pod 各选一个独立扩缩信号，说明信号与角色的关系。
5. 估算 `WhenEmptyOrUnderutilized` 在 24×7 服务中造成的丢请求和尾延迟代价。

## 运行与验证

```bash
python3 code/main.py
```

确认脚本输出不同扩缩信号的对照，并把一次 Pending 诊断写成可复用 runbook。
