# 异常检测：练习指南

- 课程路径：`phases/02-ml-fundamentals/16-anomaly-detection`
- 可运行 Python 文件：`anomaly_detection.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **阈值调优。** 以 0.5 步长运行 1.0 到 5.0 的 Z-score 阈值，画每点 precision/recall；你的数据最佳点在哪？
2. **多变量异常。** 创建每个特征单独正常、组合异常的二维数据（如远离主簇对角线），展示逐特征 Z-score 漏检、Isolation Forest 捕获。
3. **从零 LOF。** 以 k 近邻实现 LOF，与 sklearn 的同数据结果比较；使用 k=10 与 k=50，k 如何影响结果？
4. **流式异常检测。** 将 Z-score 改为流式：新点到来时更新运行均值、方差（Welford 在线算法），与同数据 batch Z-score 比较。
5. **真实评估。** 在有已知异常的数据集（如 Kaggle 信用卡欺诈）上，以 precision@100、precision@500、AUPRC 评估四种方法；哪个最好、为什么？

## 运行与验证

在课程目录下执行：

```bash
python3 anomaly_detection.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
