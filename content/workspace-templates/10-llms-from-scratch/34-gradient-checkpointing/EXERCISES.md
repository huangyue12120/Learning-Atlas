# 梯度检查点与激活重计算：练习指南

- 课程路径：`phases/10-llms-from-scratch/34-gradient-checkpointing`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 验证正确性。运行 `model_forward` + `model_backward`（完整激活）与 `model_forward_checkpointed` + `model_backward_checkpointed`（分段）并进行对比。参数梯度必须达到机器精度级别的一致。

2. 将分段大小 `k` 从 1 扫描到 `L`。绘制 FLOP 开销和内存，找出曲线的拐点。

3. 实现选择性检查点：存储注意力模块的输入，但不存储其中间结果。对于一个 32 层模型，在 seq=8192 时，测量相对于整层检查点的 FLOP 开销。

4. 添加卸载。将分段输入保存到模拟的“CPU buffer”（一个单独的列表）中。将“PCIe 带宽”测量为字节数/时间，并找出卸载与重计算之间的盈亏平衡点。

5. 对一个真实的 PyTorch Transformer 进行有无 `torch.utils.checkpoint` 的基准测试。测量内存（通过 `torch.cuda.max_memory_allocated`）和 step 时间。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
