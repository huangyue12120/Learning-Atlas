# Jamba——SSM-Transformer 混合架构：练习指南

- 课程路径：`phases/10-llms-from-scratch/21-jamba-hybrid-ssm-transformer`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 运行 `main.py`，计算 32 层纯 Transformer（隐藏维度 4096、32 个头）与相同形状 Jamba-1 混合模型在 256k 上下文下的 KV 缓存。验证 AI21 论文声称的约 8 倍内存减少。

2. 修改计算器，模拟 1:3 混合（4 Mamba : 1 Attention）和 1:15 混合（14 Mamba : 1 Attention），绘制 KV 缓存随比例变化的图。在哪个比例下 KV 缓存等于 SSM 状态内存？

3. 阅读 Jamba 论文（arXiv:2403.19887）第 3 节。解释 AI21 为什么使用 Mamba-1 而不是更快的 Mamba-2。提示：混合消融部分记录了原因。

4. 计算 Jamba 1.5 Large 中“每隔一层 MoE”的参数开销（总 398B、激活 94B）。将激活比例与 DeepSeek-V3（37B/671B）比较，解释为什么 Jamba 架构会让激活比例更高。

5. 阅读 Mamba-3 论文（arXiv:2603.15569）第 3 节，用三句话解释为什么复数值状态更新等价于依赖数据的旋转嵌入，并将答案联系到第 7 阶段 · 第 04 课的 RoPE 推导。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
