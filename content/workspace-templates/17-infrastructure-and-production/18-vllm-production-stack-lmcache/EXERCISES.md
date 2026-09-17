# 生产服务栈：练习指南

- 课程路径：`phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache`
- 可运行 Python 文件：`main.py`

## 练习目标

用 LMCache、KV 卸载和缓存感知路由降低长前缀工作负载的 prefill 成本，同时设计高可用回退。

## 动手练习

1. 运行 `code/main.py`，求出 LMCache 从哪一 HBM 利用率开始产生回报。
2. 计算租户每小时 200 个查询共享 6K-token 系统提示词时的预期节省。
3. 针对 LMCache server 单点故障设计副本、健康检查和回退到原生 KV 的 HA 策略。
4. 比较旋转磁盘 Ceph 读取 500 MB KV 与重新 prefill 的时间，说明何时卸载反而更慢。
5. 分析 vLLM 0.11.0 异步路径的隐藏开销，判断它是否真的“免费”。

## 运行与验证

```bash
python3 code/main.py
```

确认输出包含命中、读取和回退路径，并记录一次缓存收益与可用性取舍。
