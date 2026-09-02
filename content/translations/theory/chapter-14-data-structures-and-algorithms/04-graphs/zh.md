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

# 图

*图可以表示从社交网络、道路地图到依赖链的关系与连接。本篇涵盖图的表示、BFS、DFS、最短路径、拓扑排序和连通分量，并介绍图类面试题中占主导地位的遍历与寻路模式。*

- 第 12 章介绍了图论（邻接矩阵、拉普拉斯矩阵和谱性质），第 13 章介绍了树、平面性和图着色。这里聚焦**算法模式**：如何在代码中遍历、搜索和优化图。

- 两种基本图算法是 **BFS** 和 **DFS**。几乎每个图问题都可以归约为其中一种，最多再做一些修改。掌握这两个算法，就能解决绝大多数图问题。

## 图的表示

- **邻接表**：为每个节点保存一份邻居列表。空间复杂度为 $O(|V| + |E|)$。它最适合稀疏图（现实中的大多数图）。

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

- **邻接矩阵**：一个 $n \times n$ 的矩阵；如果边 $(i, j)$ 存在，则 $A[i][j] = 1$。空间复杂度为 $O(|V|^2)$。它最适合稠密图，或需要 $O(1)$ 查询边是否存在的场景。

- **如何选择**：几乎所有场景都使用邻接表。只有当图很稠密（$|E| \approx |V|^2$），或需要常数时间检查边是否存在时，才使用矩阵。

## 模式：BFS（广度优先搜索）

- BFS 使用队列**逐层**探索节点。它是以下问题的首选算法：
    - **无权**图中的最短路径
    - 按层遍历
    - 查找连通分量
    - 任何要求“最少步数”的问题

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

- **关键点**：在**入队**时，而不是出队时加入 `visited`。如果出队时才标记，同一个节点可能从不同前驱处多次入队，既浪费时间，也可能导致错误结果。

### 简单：岛屿数量

- **问题**：给定一个由字符 `'1'`（陆地）和 `'0'`（水）组成的二维网格，计算岛屿数量。

- **模式**：遍历网格。找到 `'1'` 时，用 BFS/DFS 把所有相连的陆地单元格标记为已访问。每次启动 BFS 就对应一个岛屿。

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

- **易错点**：`directions = [(0,1),(0,-1),(1,0),(-1,0)]` 这种表示四连通网格邻居的模式，几乎出现在每个网格问题中。应当记住它。对于八连通网格，再加上对角线方向。

- **易错点**：修改输入网格（`grid[r][c] = '0'`）可以省去单独的 `visited` 集合。在面试中这样做是可以接受的，但要明确说明它会改变输入这一权衡。

### 中等：腐烂的橘子

- **问题**：新鲜橘子在相邻的腐烂橘子影响下腐烂。返回所有橘子腐烂所需的最短时间（如果不可能则返回 -1）。

- **模式**：多源 BFS。把所有一开始就腐烂的橘子同时放入队列。BFS 的每一层代表一个时间步。

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

- **核心洞见**：多源 BFS 会同时处理所有源节点，因此得到的是任一源到达目标的最短距离；这正好对应“最后一个新鲜橘子需要多久才会腐烂”。

## 模式：DFS（深度优先搜索）

- DFS 在回溯之前尽可能深入地探索。它使用栈（显式栈，或通过递归使用调用栈）。DFS 是以下问题的首选算法：
    - 环检测
    - 拓扑排序
    - 连通分量
    - 回溯/穷举搜索
    - 带约束的寻路

```python
def dfs(graph, node, visited=None):
    if visited is None:
        visited = set()
    visited.add(node)
    for neighbour in graph[node]:
        if neighbour not in visited:
            dfs(graph, neighbour, visited)
```

### 中等：课程表（环检测）

- **问题**：给定 $n$ 门课程和先修课程关系，判断是否可以完成所有课程（即不存在循环依赖）。

- **模式**：检测有向图中的环。使用 DFS 和三种状态：未访问、处理中（位于当前 DFS 路径上）和已完成。

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

- **为什么需要三种状态**：两种状态（已访问/未访问）无法区分“我正在探索这个节点”和“我已经完成了对这个节点的探索”。如果找到一个当前正在探索的节点（状态 = 1），说明发现了环；如果找到一个已经完全探索的节点（状态 = 2），那只是横向边，不是环。

### 中等：课程表 II（拓扑排序）

- **问题**：返回一种有效的课程顺序（拓扑序）。

- **模式（Kahn 算法——基于 BFS）**：从没有入边的节点（入度为 0）开始。处理这些节点，并减少其邻居的入度。重复这一过程。

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

- **易错点**：如果结果中的节点少于图中的节点，就存在环（某些节点的入度始终没有降到 0）。

## 最短路径

### Dijkstra 算法

- 在**非负**权重图中，寻找从一个源节点到所有其他节点的最短路径。它使用优先队列（最小堆）。

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

- 时间复杂度：使用二叉堆时为 $O((|V| + |E|) \log |V|)$。

- **易错点**：`if d > dist[node]: continue` 这一行不可省略。否则会处理堆中的过期条目，时间复杂度可能退化为 $O(|V|^2)$。

- **易错点**：Dijkstra 不能处理负权重。如果一条边的权重为负，贪心假设（一个节点一旦确定，其距离就是最优的）就会失效。此时应使用 Bellman–Ford。

### 困难：网络延迟时间

- **问题**：给定 $n$ 个节点和带权有向边，求信号从一个源节点到达所有节点所需的时间。如果并非所有节点都可达，则返回 -1。

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

- 在有向图中，**强连通分量（SCC）**是一个极大的节点集合，其中每个节点都能到达其他每个节点。

- **Kosaraju 算法**：(1) 在原图上进行 DFS，记录完成顺序。(2) 转置图（反转所有边）。(3) 按完成顺序的逆序在转置图上进行 DFS。第 3 步中的每棵 DFS 树就是一个强连通分量。

- **使用场景**：查找循环依赖、求解 2-SAT，以及把有向图压缩为强连通分量构成的 DAG。

---

## 常见易错点总结

| 易错点 | 示例 | 修复 |
|---------|---------|-----|
| 出队时才标记已访问 | 同一节点被多次入队 | 入队时标记已访问 |
| 有向图使用两态 visited | 无法区分回边和横向边 | 使用三种状态：未访问/处理中/完成 |
| 在负权重上使用 Dijkstra | 最短路径错误 | 使用 Bellman–Ford |
| 忘记 `if d > dist[node]: continue` | 处理过期的堆条目 | 当前距离更差时始终跳过 |
| 忘记检查网格边界 | 下标越界 | `0 <= nr < rows and 0 <= nc < cols` |
| 没有处理 time=0 的边界情况 | 没有新鲜橘子的腐烂橘子问题 | BFS 前检查 `fresh == 0` |
| 把有向图构造成无向图 | 先修关系方向错误 | 只添加一个方向的边 |

---

## 课后问题（NeetCode）

### BFS 模式
- [岛屿数量](https://neetcode.io/problems/count-number-of-islands) — 网格 BFS/DFS
- [腐烂的橘子](https://neetcode.io/problems/rotting-fruit) — 多源 BFS
- [克隆图](https://neetcode.io/problems/clone-graph) — BFS + 哈希表克隆
- [太平洋大西洋水流](https://neetcode.io/problems/pacific-atlantic-water-flow) — 从两个海洋执行 BFS
- [单词接龙](https://neetcode.io/problems/word-ladder) — 在隐式图上执行 BFS

### DFS 模式
- [岛屿的最大面积](https://neetcode.io/problems/max-area-of-island) — 统计面积的 DFS
- [课程表](https://neetcode.io/problems/course-schedule) — 有向图环检测
- [课程表 II](https://neetcode.io/problems/course-schedule-ii) — 拓扑排序
- [连通分量数量](https://neetcode.io/problems/count-connected-components) — DFS 或并查集
- [图是否为树](https://neetcode.io/problems/valid-tree) — 连通且无环

### 最短路径
- [网络延迟时间](https://neetcode.io/problems/network-delay-time) — Dijkstra
- [K 站中转内最便宜的航班](https://neetcode.io/problems/cheapest-flight-path) — 带约束的修改版 BFS/Bellman–Ford
- [上升水位中的游泳](https://neetcode.io/problems/swim-in-rising-water) — 二分搜索 + 网格 BFS 或 Dijkstra

### 进阶
- [外星词典](https://neetcode.io/problems/foreign-dictionary) — 根据字符顺序进行拓扑排序
