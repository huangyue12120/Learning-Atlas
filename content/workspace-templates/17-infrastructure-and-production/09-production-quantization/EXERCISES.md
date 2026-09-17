# 生产量化：练习指南

- 课程路径：`phases/17-infrastructure-and-production/09-production-quantization`
- 可运行 Python 文件：`main.py`

## 练习目标

在显存预算、吞吐、校准数据和任务质量之间选择 AWQ、GPTQ、GGUF、FP8 或 NVFP4。

## 动手练习

1. 运行 `code/main.py`，为 70B、128 并发、2K 上下文计算每种格式的总 HBM，并判断 H100 80GB 可行方案。
2. 为 7B 编码模型选择格式并说明质量容忍度判断错误时的恢复路径。
3. 计算医疗领域模型的 AWQ 校准数据集规模，并解释更多数据为何不总是更好。
4. 阅读 Marlin-AWQ 资料，用三句话说明 AWQ 741 tok/s 与原始 GPTQ 712 tok/s 的差异来源。
5. 说明什么情况下应将 AWQ 权重与 FP8 KV 缓存搭配，而不是让 KV 保持 BF16。

## 运行与验证

```bash
python3 code/main.py
```

确认显存和吞吐输出能对应到格式选择，并保存一次质量—成本取舍。
