# 面向机器学习的图论：练习指南

从 `exercise_graph.py` 开始，补全最短路、PageRank 和两轮消息传递。

## 练习

1. 实现 `dijkstra(graph, start)`，用优先队列处理非负权图，并返回每个可达节点的最短距离。
2. 实现带 dangling node 处理的 `pagerank`，检查每轮分数之和是否保持为 1。
3. 实现 `two_hop_message_passing`，先归一化邻接矩阵，再连续应用两轮线性变换和聚合。

## 运行与验证

在本工作区根目录运行：

```bash
python3 -m unittest -v test_exercise_graph.py
```

然后对照 `reference_graph_theory.py`，观察图拉普拉斯谱分解和消息传递如何表达节点之间的局部结构。
