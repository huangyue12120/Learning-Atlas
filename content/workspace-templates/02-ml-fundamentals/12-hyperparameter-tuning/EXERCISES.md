# 超参数调优：练习指南

- 课程路径：`phases/02-ml-fundamentals/12-hyperparameter-tuning`
- 可运行 Python 文件：`tuning.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 以相同总预算（如 50 次评估）运行网格搜索和随机搜索，比较找到的最佳分数；用不同随机种子重复 10 次，随机搜索多常胜出？
2. 从零实现 Hyperband：从 81 个各训练 1 个 epoch 的配置开始，每轮保留前 1/3 并将预算加倍三倍；与让 81 个配置都运行完整预算比较总计算量。
3. 为第 11 课梯度提升实现加入学习率调度器（余弦退火），与固定学习率相比有帮助吗？
4. 用 Optuna 在真实数据集（如 sklearn 乳腺癌数据集）上调 `RandomForestClassifier`，使用 `optuna.visualization.plot_param_importances(study)` 查看重要参数；是否符合本课排序？
5. 实现简单采集函数（Expected Improvement），演示探索与利用；绘制代理模型均值与不确定性，并显示 EI 选择的下一个评估点。

## 运行与验证

在课程目录下执行：

```bash
python3 tuning.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
