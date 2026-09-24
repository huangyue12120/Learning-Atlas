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
# 图形学

*图形模型关系和连接，从社交网络到道路地图再到依赖链。本文件涵盖了表示、BFS、DFS、最短路径、拓扑排序和连通组件，以及在代码中遍历和搜索图的优化模式，这些模式是图面试题中最常见的模式。*

- 我们在第12章（邻接矩阵、拉普拉斯矩阵、谱性质）和第13章（树、可平面性、着色）中讨论了图论。在这里，我们专注于**算法模式**：如何在代码中遍历、搜索和优化图。

- 两种基本的图算法是 **BFS** 和 **DFS**。几乎所有的图问题都可以归结为这两种之一，有时需要进行一些修改。掌握这两者，你就可以解决大多数图问题。

## 图表示形式

- **邻接表**：为每个节点存储其邻居的列表。空间：$O(|V| + |E|)$。适用于稀疏图（大多数现实世界图）。

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

- 邻接矩阵 $n \times n$ 矩阵中 $A[i][j] = 1$ 如果边 $(i, j)$ 存在。空间： $O(|V|^2)$最适合稠密图，或者当你需要 $O(1)$ 边缘查找。

- **何时使用哪种**：邻接表几乎适用于所有情况。矩阵仅在图非常稠密（$|E| \approx |V|^2$）或需要常数时间边存在检查时使用。

## 模式：BFS（广度优先搜索）

- BFS 逐层遍历节点，使用队列。它是处理图问题的首选算法之一。
    - 最短路径在 **无权图** 中
    - 层序遍历
    - 找到连通分量
    - 任何问题要求“最少步数”

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

- **关键**：在 **入队** 时添加到 `visited`，而不是在 **出队** 时。如果在出队时标记为已访问，则同一个节点可以从不同的前驱多次被重新入队，浪费时间和可能导致错误的结果。

### 简单：岛屿数量

- **问题**：给定一个由 '1'（陆地）和 '0'（水域）组成的二维网格，计算岛屿的数量。

- **模式**：遍历网格。当找到 '1' 时，使用 BFS 或 DFS 来标记所有连接的陆地单元格为已访问。每个 BFS 的启动是其中一个岛屿。

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

- **陷阱**：在几乎所有的网格问题中都使用了 `directions = [(0,1),(0,-1),(1,0),(-1,0)]` 的 4 连接邻居模式。请记住它。对于 8 连接，添加对角线。

- **陷阱**: 修改输入网格（`grid[r][c] = '0'`）可以避免需要单独的 `visited` 集合。在面试中这是 acceptable的，但要明确说明这个 trade-offs（会修改输入）。

### 中等: 腐烂的橘子

- **问题**: 新鲜的橘子如果相邻于一个腐烂的橘子就会腐烂。返回所有橘子都腐烂所需的最小时间（或 -1 如果不可能）。

- **模式**: 多源 BFS。同时从所有最初腐烂的橘子开始队列。每个 BFS 层级是一次时间步长。

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

- **关键洞察**: 多源 BFS 同时处理所有源。这给出了“任何”源到最近一个腐烂的橘子的最短距离，恰好是“最后一个新鲜橘子腐烂所需的时间”。

## 模式: DFS（深度优先搜索）

- DFS 会尽可能深入地探索，然后回溯。它使用栈（显式或递归调用堆栈）。DFS 是用于：
    - 循环检测
    - 拓扑排序
    - 连通分量
    - 回溯 / 全部搜索
    - 带约束的路径查找

```python
def dfs(graph, node, visited=None):
    if visited is None:
        visited = set()
    visited.add(node)
    for neighbour in graph[node]:
        if neighbour not in visited:
            dfs(graph, neighbour, visited)
```

### 中等: 课程表 (循环检测)

- **问题**: 给定 $n$ 门课程和先决条件，确定是否可以完成所有课程（即没有环依赖）。

- **模式**: 在有向图中检测环。使用DFS，三个状态：未访问、正在探索（当前DFS路径上）、已完成。

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

- **为什么三个状态**: 两个状态（已访问/未访问）无法区分“我目前正在探索这个节点”和“我已经完成了探索这个节点”。找到一个正在被探索的节点（状态 = 1），意味着我们找到了一个环。找到一个完全探索过的节点（状态 = 2）只是交叉边，不是环。

### 中等: 课程表 II (拓扑排序)

- **问题**: 返回一个有效的课程顺序（拓扑排序）。

- **模式 (Kahn's算法 — BFS基于)**：从没有入度的节点开始（入度为 0）。处理它们，减少邻接节点的入度。重复。

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

- **陷阱**: 如果结果少于图中的节点数，存在一个环（某些节点的入度从未达到 0）。

## 最短路径

### Dijkstra's算法

- 在非负权重图中，找到从源到所有其他节点的最短路径。使用优先队列（最小堆）。

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

- 时间: $O((|V| + |E|) \log |V|)$ 使用二叉堆。

- **陷阱**：`if d > dist[node]: continue`行至关重要。如果没有它，你可能会处理过时的堆条目，从而可能退化到$O(|V|^2)$。

- **陷阱**：狄克斯特拉算法不适用于负权重。如果一条边有负权重，贪心假设（一旦一个节点被最终化，其距离就是最优的）就会失效。使用贝尔曼-福特算法代替。

### 难度：网络延迟时间

- **问题**: 给定 $n$ 节点和带权重的有向边，找到信号从源节点到达所有节点所需的时间。如果无法到达所有节点，则返回 -1。

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

- 在有向图中，一个**强连通分量（SCC）**是一个最大节点集，其中每个节点都可以到达其他所有节点。

- **Kosaraju's算法**：(1) 对原始图进行DFS，并记录完成顺序。(2) 逆转图（反转所有边）。(3) 按逆完成顺序对转置图进行DFS。步骤3中的每个DFS树是一个SCC。

- **何时使用**：寻找循环依赖，2-SAT，将有向图压缩成一个DAG的SCCs。

---

## 常见错误总结

| 错误点 | 示例 | 修正方法 |
|---------|---------|-----|
| 在出队时标记已访问 | 同一节点被多次入队 | 出队时标记已访问 |
| 在有向图中访问两次 | 无法区分回边和跨边 | 使用三种状态：未访问、进行中、已完成 |
| 带负权重的Dijkstra算法 | 最短路径计算错误 | 使用Bellman-Ford算法 |
| 忘记`if d > dist[node]: continue` | 处理过时的堆项 | 如果当前距离更差，则总是跳过 |
| 网格边界检查 | 超出范围的索引 | `0 <= nr < rows and 0 <= nc < cols` |
| 不计时间=0边的情况 | 橘子腐烂：没有新鲜橘子 | 在BFS之前检查`fresh == 0` |
| 将有向图构建为无向图 | 前置条件只有一方向 | 只在一种方向上添加边 |

---

## 作业题 (NeetCode)

### BFS模式 |
- [岛屿数量](https://neetcode.io/problems/count-number-of-islands) — 网格BFS/DFS |
- [橘子腐烂](https://neetcode.io/problems/rotting-fruit) — 多源BFS |
- [克隆图](https://neetcode.io/problems/clone-graph) — BFS + 哈希表进行克隆 |
- [太平洋大西洋水流动态](https://neetcode.io/problems/pacific-atlantic-water-flow) — 从两个海洋出发的BFS |
- [单词梯子](https://neetcode.io/problems/word-ladder) — 在隐式图上进行BFS |

### DFS模式 |
- [最大岛屿面积](https://neetcode.io/problems/max-area-of-island) — 深度优先搜索与面积计数
- [课程表](https://neetcode.io/problems/course-schedule) — 有向图中的环检测
- [课程表 II](https://neetcode.io/problems/course-schedule-ii) — 拓扑排序
- [连通分量的数量](https://neetcode.io/problems/count-connected-components) — 深度优先搜索或并查集
- [图的有效树](https://neetcode.io/problems/valid-tree) — 连通且无环

### 最短路径
- [网络延迟时间](https://neetcode.io/problems/network-delay-time) — Dijkstra算法
- [K步内最便宜的航班](https://neetcode.io/problems/cheapest-flight-path) — 改进的BFS/Bellman-Ford算法，带有约束条件
- [在水面上升时游泳](https://neetcode.io/problems/swim-in-rising-water) — 二分查找 + BFS或Dijkstra在网格上

### 高级
- [外星语言](https://neetcode.io/problems/foreign-dictionary) — 根据字符顺序进行拓扑排序
