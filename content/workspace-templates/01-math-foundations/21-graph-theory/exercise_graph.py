"""第 21 课练习：补全图算法，并在 test_exercise_graph.py 中验证。"""


def dijkstra(graph, start):
    """返回 non-negative weighted graph 中从 start 到各节点的最短距离。"""
    raise NotImplementedError("实现 Dijkstra（优先队列）")


def pagerank(graph, damping=0.85, max_iter=100, tol=1e-6):
    """实现含 dangling-node 处理的 PageRank。"""
    raise NotImplementedError("实现 PageRank 迭代")


def two_hop_message_passing(adjacency, features, first_weights, second_weights):
    """归一化邻接矩阵后连续做两轮消息传递。"""
    raise NotImplementedError("实现两轮 message passing")
