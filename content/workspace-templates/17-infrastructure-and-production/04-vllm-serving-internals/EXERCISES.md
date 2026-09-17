# 服务引擎内部机制：练习指南

- 课程路径：`phases/17-infrastructure-and-production/04-vllm-serving-internals`
- 可运行 Python 文件：`main.py`

## 练习目标

通过玩具调度器观察 PagedAttention、连续批处理和分块 prefill 如何共同改善混合负载的尾延迟。

## 动手练习

1. 运行 `code/main.py`，在短长请求混合负载上比较 STATIC 与 CONTINUOUS，并区分 prefill、decode 和尾延迟的贡献。
2. 为调度器加入 `--max-num-batched-tokens`，说明它为何由 KV 块大小和空闲块数量决定，而不是只看 HBM。
3. 阅读 vLLM v0.18.0 发布说明，列出互斥的配置标志组合。
4. 用 1,000 请求、输出均值 1,500、标准差 600 估算连续分配上限 8,192 与 16-token 分块的碎片浪费。
5. 用一段话解释分块 prefill 保护 P99 ITL 却不单独增加吞吐的原因。

## 运行与验证

```bash
python3 code/main.py
```

确认调度器能完成一轮 admission、decode 和结束回收，并记录一项块表或批处理证据。
