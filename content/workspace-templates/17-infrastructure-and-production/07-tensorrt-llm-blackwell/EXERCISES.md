# 面向专用硬件的推理编译：练习指南

- 课程路径：`phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell`
- 可运行 Python 文件：`main.py`

## 练习目标

比较 Hopper 与 Blackwell 上 FP8/NVFP4 的带宽、质量、成本和硬件锁定取舍。

## 动手练习

1. 运行 `code/main.py`，为激活参数占 30% 的 120B MoE 计算 H100 BF16、H100 FP8 和 B200 NVFP4/FP8 的 decode 上限。
2. 假设 H100 + vLLM 年成本为 200 万美元且 Blackwell 经济性为 7 倍，估算 12 个月摊销迁移成本所需的 GPU 数量。
3. NVFP4 使 MATH 分数下降 3 分时，分别写出质量优先和成本优先的恢复路径。
4. 阅读 MLPerf v6.0 结果，找出 Blackwell 相对 Hopper 差距最小的任务并解释原因。
5. 估算 NVFP4 权重加 128K 上下文 FP8 KV 的 405B 模型 HBM，并判断 GB200 NVL72 是否容纳得下。

## 运行与验证

```bash
python3 code/main.py
```

确认精度组合、带宽和成本的单位一致，并记录一项“质量闸门优先于宣传吞吐”的结论。
