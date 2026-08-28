# 调试与性能分析：练习指南

- 课程路径：`phases/00-setup-and-tooling/12-debugging-and-profiling`
- 可运行 Python 文件：`debug_tools.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 运行 `debug_tools.py` 并阅读每个部分的输出。修改虚拟模型以引入 NaN（提示：在前向传播中除以零），观察检测器捕获它。
2. 使用 `cProfile` 分析一个训练循环，并找出最慢的函数。
3. 使用 `tracemalloc` 找出数据加载流水线中分配内存最多的是哪一行。
4. 为一次简单训练配置 TensorBoard，并判断模型是否过拟合。
5. 在训练循环中使用 `breakpoint()`。练习从调试器提示符检查张量形状、设备和梯度值。

## 运行与验证

在课程目录下执行：

```bash
python3 debug_tools.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
