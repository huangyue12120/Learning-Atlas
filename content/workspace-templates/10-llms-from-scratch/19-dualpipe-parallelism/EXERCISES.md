# DualPipe 并行：练习指南

- 课程路径：`phases/10-llms-from-scratch/19-dualpipe-parallelism`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 在 `(P=8, micro_batches=16, schedule=dualpipe)` 和 `(P=8, micro_batches=16, schedule=1f1b)` 上运行 `main.py`。计算 GPU 利用率差异，并将其表示为每训练一百万个词元恢复的 GPU 小时。

2. 手工画出 `(P=4, micro_batches=8, schedule=dualpipe)` 的调度表。在每个时隙标记微批次 ID 和方向，找出第一个没有气泡的时隙。

3. 阅读 DeepSeek-V3 技术报告（arXiv:2412.19437）的图 5，确定 DualPipe 前向 chunk 中 all-to-all 派发的重叠窗口，并解释计算调度如何隐藏它。

4. 对一个 P=8 流水线 stage 的 70B 稠密模型和一个 P=16 的 671B MoE 模型，分别计算 DualPipe 的 2 倍参数开销。说明为什么 MoE 情况的相对开销更小（大部分参数是分片到大型 EP 组的专家）。

5. 将 DualPipe 与 Chimera（2021 年的竞争性双向调度器）比较。以论文第 3.4 节为参考，指出 DualPipe 增加而 Chimera 没有的两个具体性质。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
