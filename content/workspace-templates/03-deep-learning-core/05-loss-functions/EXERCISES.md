# 损失函数：练习指南

- 课程路径：`phases/03-deep-learning-core/05-loss-functions`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 实现 Huber（smooth L1）：小误差用 MSE、大误差用 MAE；在 5% 目标加随机离群噪声的 y=sin(x) 回归中，比较 MSE、Huber 最终测试误差。
2. 向二分类循环加入 focal loss，创建 90% 类 0、10% 类 1 数据，200 epoch 后比较 BCE 与 gamma=2 focal 的少数类 recall。
3. 实现带 semi-hard negative mining 的 triplet loss，生成 5 类二维嵌入；对每个锚点找比正样本远、却最困难的负样本，比较随机 triplet 的收敛。
4. 在 MSE vs CE 中跟踪每层梯度幅度，画每 epoch 平均梯度范数，验证模型最不确定的初期 CE 产生更大梯度。
5. 实现 KL divergence，验证 one-hot 真分布时最小化 KL(true||predicted) 与 CE 梯度相同；再试 teacher softmax 产生的 soft target（知识蒸馏）。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
