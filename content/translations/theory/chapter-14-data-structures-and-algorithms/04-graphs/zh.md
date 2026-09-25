---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 14 - data structures and algorithms/04. graphs.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: e2bd3fed00e6a650f86b6d07a2d8d3263976543dba09ed7c9ddca6b3dfd93697
status: reviewed
---
# 图与图算法

*图用于描述对象之间的关系和连接，常见例子包括社交网络、道路地图和依赖关系。本篇介绍图的表示方法、BFS、DFS、最短路径、拓扑排序和连通分量，以及图问题常用的遍历与寻路模式。*

- 第 12 章介绍过邻接矩阵、图拉普拉斯矩阵和谱性质，第 13 章讨论了树、平面性和着色。本篇侧重**算法模式**：如何在代码中遍历、搜索图并优化路径。

- 图算法中最常用的两种遍历方式是**广度优先搜索（BFS）**和**深度优先搜索（DFS）**。许多图问题都可以用这两种方式解决，必要时再作调整。

## 图的表示方法

- **邻接表**：为每个节点保存一份邻居列表，空间复杂度为 $O(|V| + |E|)$，适合大多数稀疏图。以下代码示例假设节点编号为 $0$ 到 $n-1$；构造无向图时要双向添加边，有向图则只添加一个方向。

```python
# Undirected graph
graph = {
    0: [1, 2],
    1: [0, 3],
    2: [0, 3],
    3: [1, 2]
}

# From edge list
def build_graph(n, edges):
    graph = {i: [] for i in range(n)}
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)  # omit for directed
    return graph
```

- **邻接矩阵**：用 $n \times n$ 矩阵表示边；对于无权图，若边 $(i, j)$ 存在，则 $A[i][j] = 1$。空间复杂度为 $O(|V|^2)$。邻接矩阵适合稠密图，或需要在 $O(1)$ 时间判断一条边是否存在的场景。

- **如何选择**：多数情况下使用邻接表即可。若图很稠密（$|E| \approx |V|^2$），或需要常数时间查询边是否存在，可以选择邻接矩阵。

## 模式：广度优先搜索（BFS）

- BFS 使用队列，按层访问节点。它常用于：
    - 求**无权图**中的最短路径。
    - 按层遍历树或图。
    - 查找连通分量。
    - 求达到目标所需的最少步数。

```python
from collections import deque

def bfs(graph, start):
    visited = {start}
    queue = deque([start])

    while queue:
        node = queue.popleft()
        for neighbour in graph[node]:
            if neighbour not in visited:
                visited.add(neighbour)
                queue.append(neighbour)
```

- **关键点**：节点入队时就加入 `visited`，不要等到出队时才标记。否则，同一节点可能从不同前驱重复入队，造成额外工作，甚至影响结果。

### 简单：岛屿数量

- **题目**：给定只含字符 `'1'`（陆地）和 `'0'`（水域）的二维网格，统计岛屿数量。

- **模式思路**：遍历网格。遇到 `'1'` 时，从该格开始运行 BFS 或 DFS，把所有上下左右相连的陆地标记为已访问。每次新启动的搜索对应一个岛屿。

```python
from collections import deque

def num_islands(grid):
    if not grid:
        return 0

    rows, cols = len(grid), len(grid[0])
    count = 0

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                # BFS to mark entire island
                queue = deque([(r, c)])
                grid[r][c] = '0'  # mark visited
                while queue:
                    cr, cc = queue.popleft()
                    for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]:
                        nr, nc = cr + dr, cc + dc
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == '1':
                            grid[nr][nc] = '0'
                            queue.append((nr, nc))

    return count
```

- **常见写法**：四方向邻居可用 `[(0,1),(0,-1),(1,0),(-1,0)]` 表示，分别对应上下左右。若题目把对角线也算作相邻，再加入四个对角方向。

- **注意**：代码把已访问的格子直接改成 `'0'`，所以会修改输入网格。面试中可以这样做，但需要说明这一取舍；若要保留输入，应另用访问集合。

### 中等：腐烂的橘子

- **题目**：新鲜橘子与腐烂橘子上下左右相邻时会变腐烂。求所有橘子变腐烂所需的最短时间；若有橘子始终无法变腐烂，返回 -1。

- **模式思路**：使用**多源 BFS**，把所有一开始就腐烂的橘子同时加入队列。每一轮 BFS 表示经过一分钟。

```python
from collections import deque

def oranges_rotting(grid):
    rows, cols = len(grid), len(grid[0])
    queue = deque()
    fresh = 0

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2:
                queue.append((r, c))
            elif grid[r][c] == 1:
                fresh += 1

    if fresh == 0:
        return 0

    time = 0
    while queue and fresh > 0:
        time += 1
        for _ in range(len(queue)):
            cr, cc = queue.popleft()
            for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]:
                nr, nc = cr + dr, cc + dc
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    fresh -= 1
                    queue.append((nr, nc))

    return time if fresh == 0 else -1
```

- **关键思路**：多源 BFS 同时从所有起点扩展，求出每个位置到最近起点的最短距离；在这里对应最后一个新鲜橘子变腐烂所需的时间。

- 这段代码会把新鲜橘子直接改成腐烂状态，因此会修改输入网格。它也假设网格非空且各行长度一致。

## 模式：深度优先搜索（DFS）

- DFS 会先沿一条路径尽可能深入，再回溯。它可以用显式栈实现，也可以用递归调用栈实现。DFS 常用于：
    - 检测环。
    - 拓扑排序。
    - 查找连通分量。
    - 回溯或穷举搜索。
    - 带约束的寻路。

```python
def dfs(graph, node, visited=None):
    if visited is None:
        visited = set()
    visited.add(node)
    for neighbour in graph[node]:
        if neighbour not in visited:
            dfs(graph, neighbour, visited)
```

- 在 Python 中，链条很深的图可能导致递归深度超限；若图规模较大，可考虑使用显式栈或其他迭代实现。

### 中等：课程表（检测环）

- **题目**：给定 $n$ 门课程和先修关系，判断能否修完所有课程，也就是依赖关系中是否没有环。

- **模式思路**：在有向图中检测环。DFS 为节点设置三种状态：未访问、正在当前 DFS 路径中、已经完成。

```python
def can_finish(num_courses, prerequisites):
    graph = {i: [] for i in range(num_courses)}
    for course, prereq in prerequisites:
        graph[course].append(prereq)

    # 0 = unvisited, 1 = in-progress, 2 = completed
    state = [0] * num_courses

    def has_cycle(node):
        if state[node] == 1:
            return True   # back edge → cycle
        if state[node] == 2:
            return False  # already fully explored

        state[node] = 1  # mark in-progress
        for neighbour in graph[node]:
            if has_cycle(neighbour):
                return True
        state[node] = 2  # mark completed
        return False

    for course in range(num_courses):
        if has_cycle(course):
            return False
    return True
```

- **为什么需要三种状态**：仅用“已访问/未访问”无法区分当前递归路径上的节点和已经完整探索过的节点。若遇到状态为 1 的节点，说明找到了回边，也就是环；遇到状态为 2 的节点，则只是连到已完成的部分，不构成环。

### 中等：课程表 II（拓扑排序）

- **题目**：返回一种可行的课程顺序，也就是拓扑序。

- **模式思路（基于 BFS 的 Kahn 算法）**：先把所有入度为 0 的节点加入队列。每处理一门课程，就从后续课程的入度中减 1；入度降到 0 时，把该课程加入队列。

```python
from collections import deque

def find_order(num_courses, prerequisites):
    graph = {i: [] for i in range(num_courses)}
    indegree = [0] * num_courses

    for course, prereq in prerequisites:
        graph[prereq].append(course)
        indegree[course] += 1

    queue = deque([i for i in range(num_courses) if indegree[i] == 0])
    order = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbour in graph[node]:
            indegree[neighbour] -= 1
            if indegree[neighbour] == 0:
                queue.append(neighbour)

    return order if len(order) == num_courses else []  # empty = cycle exists
```

- **常见错误**：若最终结果中的节点数少于图中节点数，说明存在环，某些节点的入度始终没有降到 0。

## 最短路径

### Dijkstra 算法

- Dijkstra 算法用于求**边权非负**的加权图中，从一个起点到所有其他节点的最短路径。它使用最小堆实现的优先队列。

```python
import heapq

def dijkstra(graph, start):
    # graph: {node: [(neighbour, weight), ...]}
    dist = {node: float('inf') for node in graph}
    dist[start] = 0
    heap = [(0, start)]

    while heap:
        d, node = heapq.heappop(heap)
        if d > dist[node]:
            continue  # stale entry

        for neighbour, weight in graph[node]:
            new_dist = d + weight
            if new_dist < dist[neighbour]:
                dist[neighbour] = new_dist
                heapq.heappush(heap, (new_dist, neighbour))

    return dist
```

- 使用二叉堆时，时间复杂度为 $O((|V| + |E|) \log |V|)$。

- **常见错误**：`if d > dist[node]: continue` 用于跳过堆中的过期条目。若不跳过，节点的邻接边会被重复处理，运行时间可能远高于上述复杂度；在稠密图中可能达到 $O(|V|^2)$ 或更高。

- **常见错误**：Dijkstra 不适用于负权边。它依赖的贪心假设是：取出当前距离最小的节点后，该距离已经最优。存在负权边时，这一假设可能不成立；应考虑 Bellman–Ford 等算法。此处的 Python 堆元组还假设节点标签在距离相同时可以比较。

### 困难：网络延迟时间

- **题目**：给定 $n$ 个节点和带权有向边，求信号从起点到达所有节点所需的时间；若有节点不可达，返回 -1。此实现假设节点编号为 $1$ 到 $n$，边权非负。

```python
def network_delay(times, n, k):
    graph = {i: [] for i in range(1, n + 1)}
    for u, v, w in times:
        graph[u].append((v, w))

    dist = dijkstra(graph, k)
    max_time = max(dist.values())
    return max_time if max_time < float('inf') else -1
```

## 强连通分量

- 在有向图中，**强连通分量（SCC）**是一个极大的节点集合，其中任意节点都能到达集合内的任意其他节点。

- **Kosaraju 算法**分两轮 DFS：
    1. 在原图上做 DFS，并记录节点完成访问的顺序。
    2. 把图转置（反转所有边），再按完成顺序的逆序在转置图上做 DFS。第二轮中的每棵 DFS 树对应一个强连通分量。

- **适用场景**：分析循环依赖、求解 2-SAT，或把有向图压缩成强连通分量组成的 DAG。

---

## 常见错误汇总

| 错误 | 示例 | 修正方法 |
| --- | --- | --- |
| 出队时才标记已访问 | 同一节点被重复加入队列 | 入队时就标记 |
| 有向图只用两种访问状态 | 无法区分回边和连到已完成节点的边 | 使用“未访问/处理中/已完成”三种状态 |
| 对负权图使用 Dijkstra | 最短路径结果可能错误 | 改用 Bellman–Ford 等适用算法 |
| 未跳过过期的堆条目 | 重复处理已更新节点的邻边 | 若当前距离大于已知最短距离，就跳过 |
| 网格边界检查错误 | 索引越界 | 检查 `0 <= nr < rows and 0 <= nc < cols` |
| 漏掉时间为 0 的情况 | 没有新鲜橘子却继续搜索 | BFS 前检查 `fresh == 0` |
| 把有向依赖关系建成无向边 | 课程先修方向错误 | 只按依赖方向添加一条边 |

---

## 课后练习（NeetCode）

### BFS 模式

- [Number of Islands](https://neetcode.io/problems/count-number-of-islands) — 网格 BFS/DFS
- [Rotting Oranges](https://neetcode.io/problems/rotting-fruit) — 多源 BFS
- [Clone Graph](https://neetcode.io/problems/clone-graph) — BFS 加哈希表复制节点
- [Pacific Atlantic Water Flow](https://neetcode.io/problems/pacific-atlantic-water-flow) — 从两片海域反向搜索
- [Word Ladder](https://neetcode.io/problems/word-ladder) — 在隐式图上进行 BFS

### DFS 模式

- [Max Area of Island](https://neetcode.io/problems/max-area-of-island) — DFS 并统计面积
- [Course Schedule](https://neetcode.io/problems/course-schedule) — 检测有向图中的环
- [Course Schedule II](https://neetcode.io/problems/course-schedule-ii) — 拓扑排序
- [Number of Connected Components](https://neetcode.io/problems/count-connected-components) — DFS 或并查集
- [Graph Valid Tree](https://neetcode.io/problems/valid-tree) — 检查连通且无环

### 最短路径

- [Network Delay Time](https://neetcode.io/problems/network-delay-time) — Dijkstra 算法
- [Cheapest Flights Within K Stops](https://neetcode.io/problems/cheapest-flight-path) — 带停靠次数限制的 BFS 或 Bellman–Ford
- [Swim in Rising Water](https://neetcode.io/problems/swim-in-rising-water) — 网格上的二分查找加 BFS 或 Dijkstra

### 进阶

- [Alien Dictionary](https://neetcode.io/problems/foreign-dictionary) — 根据字符顺序约束进行拓扑排序
