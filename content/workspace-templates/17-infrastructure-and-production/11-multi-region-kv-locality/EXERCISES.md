# 多区域 LLM 服务与 KV 缓存局部性：练习指南

- 课程路径：`phases/17-infrastructure-and-production/11-multi-region-kv-locality`
- 可运行 Python 文件：`main.py`

## 练习目标

用网络往返时间、前缀命中和灾备文件清单判断跨区域路由是否值得。

## 动手练习

1. 运行 `code/main.py`，在 RTT 75 ms 时求出跨区域路由胜过仅本地路由的提示词长度。
2. 对缓存命中率从 70% 降到 12% 的事故列出三个原因及能确认它们的可观测量。
3. 为 vLLM 上带 5 个 LoRA adapter 的 70B AWQ 模型设计灾备清单，包含权重、配置和部署文件。
4. 论证对严格 TTFT SLO 的金融科技公司而言，Bedrock cross-region inference 是否足够，并引用具体行为。
5. 巴黎请求命中 us-east-1 前缀时，写出兼顾命中率、数据驻留和延迟的路由策略。

## 运行与验证

```bash
python3 code/main.py
```

确认本地、跨区域和缓存命中路径的延迟计算一致，并保存一次路由决策记录。
