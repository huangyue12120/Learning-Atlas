# 解耦的 Prefill/Decode：练习指南

- 课程路径：`phases/17-infrastructure-and-production/17-disaggregated-prefill-decode`
- 可运行 Python 文件：`main.py`

## 练习目标

理解 prefill 与 decode 的资源形态、KV 传输代价和解耦的适用边界。

## 动手练习

1. 运行 `code/main.py`，找出提示词长度达到何值时解耦胜过共置。
2. 为 P99 前缀 8K、输出 300 token 的 RAG 服务设计 prefill 池和 decode 池。
3. 对不偏好 Python 运行时的纯 Kubernetes 团队比较 Dynamo 与 llm-d。
4. 计算 70B FP8、4K prefill 的 KV 在 RDMA 100 GB/s（5 ms）和 TCP 10 GB/s（50 ms）下的 SLA 影响。
5. 讨论 MoE 每 token 激活不同专家时，解耦对 KV 访问和路由的影响。

## 运行与验证

```bash
python3 code/main.py
```

确认脚本区分 prefill、decode、传输和排队时间，并保存一次解耦门槛分析。
