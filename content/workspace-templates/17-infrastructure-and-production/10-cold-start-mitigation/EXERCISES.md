# 无服务器 LLM 冷启动缓解：练习指南

- 课程路径：`phases/17-infrastructure-and-production/10-cold-start-mitigation`
- 可运行 Python 文件：`main.py`

## 练习目标

把节点供给、镜像拉取、权重载入和引擎初始化拆开，设计按流量分层的预热策略。

## 动手练习

1. 运行 `code/main.py`，计算请求速率高于何值时预热副本比承担冷启动丢失更便宜。
2. 为 13B 模型、TTFT P99 SLA 3 秒选择层数最少的缓解栈。
3. 用 7 GB/s NVMe 快照读取速度估算 70B 权重载入的实际墙钟时间。
4. 论证 GPU 快照可能泄露 PII 的风险与短暂快照、加密、命名空间隔离等缓解措施。
5. 为付费、试用和 batch 用户设计分层预热池并展示计算过程。

## 运行与验证

```bash
python3 code/main.py
```

确认脚本输出成本阈值或时间估算，并记录一份带 SLO 和成本假设的预热方案。
