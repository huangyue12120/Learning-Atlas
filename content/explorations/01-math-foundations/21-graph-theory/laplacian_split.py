"""修改 bridge 数量，观察 Fiedler value 与谱二分如何变化。"""

import numpy as np


def laplacian(n, edges):
    adjacency = np.zeros((n, n))
    for u, v in edges:
        adjacency[u, v] = adjacency[v, u] = 1
    return np.diag(adjacency.sum(axis=1)) - adjacency


def two_cliques(bridge_count=1):
    edges = [(i, j) for start in (0, 5) for i in range(start, start + 5)
             for j in range(i + 1, start + 5)]
    bridges = [(0, 5), (1, 6), (2, 7), (3, 8), (4, 9)]
    return edges + bridges[:bridge_count]


for bridges in range(1, 6):
    values, vectors = np.linalg.eigh(laplacian(10, two_cliques(bridges)))
    labels = (vectors[:, 1] < 0).astype(int)
    print(f"bridges={bridges}, Fiedler={values[1]:.4f}, labels={labels.tolist()}")
