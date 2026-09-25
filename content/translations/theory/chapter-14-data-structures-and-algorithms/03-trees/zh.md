---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 14 - data structures and algorithms/03. trees.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 0336a01fa78bd3c79d5666bf9801aba25541ccab3c3d1dd038d94e96f16ef1e0
status: reviewed
---
# 树

*树是文件系统、数据库、编译器和许多算法题背后的层次结构。本篇介绍二叉树、二叉搜索树、平衡树、字典树、线段树、Fenwick 树和并查集，并讲解遍历、递归思路及相关解题模式。*

- **树**是连通且无环的图（见第 13 章）。最常见的树结构之一是**二叉树**：每个节点最多有两个子节点，通常称为左子节点和右子节点。树结构广泛用于编译器解析树、浏览器 DOM 树、机器学习决策树和数据库 B 树。

- 解决树问题时，通常可以利用递归结构：一棵树由根节点和子树组成。先解决左子树、再解决右子树、最后合并结果的模式，适用于许多树问题。

## 二叉树遍历

- 遍历二叉树时，常见的访问顺序有四种：

    - **中序遍历**（左、根、右）：在二叉搜索树中按从小到大的顺序访问节点。
    - **前序遍历**（根、左、右）：常用于序列化和复制树。
    - **后序遍历**（左、右、根）：常用于删除节点和计算子树大小。
    - **层序遍历**（BFS）：用队列逐层访问节点。

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def inorder(root):
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)

def preorder(root):
    if not root:
        return []
    return [root.val] + preorder(root.left) + preorder(root.right)

def postorder(root):
    if not root:
        return []
    return postorder(root.left) + postorder(root.right) + [root.val]

from collections import deque

def level_order(root):
    if not root:
        return []
    result, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result
```

- **注意**：上述递归遍历通过列表拼接创建新列表。最坏情况下会产生 $O(n^2)$ 的复制开销；即使树较平衡，也会有额外的重复复制。可共享一个结果列表并原地追加，将遍历本身的时间降为 $O(n)$：

```python
def inorder_efficient(root, result=None):
    if result is None:
        result = []
    if root:
        inorder_efficient(root.left, result)
        result.append(root.val)
        inorder_efficient(root.right, result)
    return result
```

### 简单：二叉树的最大深度

```python
def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))
```

- **递归模式**：基础情形为空节点，深度为 0；递归处理左右子树，再把较大深度加 1。许多树问题都可以用这套“处理子树，再合并”的思路。

### 简单：翻转二叉树

```python
def invert_tree(root):
    if not root:
        return None
    root.left, root.right = invert_tree(root.right), invert_tree(root.left)
    return root
```

### 中等：最近公共祖先

- **题目**：找出同时是节点 $p$ 和 $q$ 祖先的最低节点。

- **模式思路**：若 $p$、$q$ 都在左子树中，最近公共祖先也在左子树；若都在右子树中，则在右子树；若分别位于左右子树，当前节点就是最近公共祖先。

```python
def lowest_common_ancestor(root, p, q):
    if not root or root == p or root == q:
        return root

    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)

    if left and right:
        return root  # p and q are in different subtrees
    return left if left else right
```

- **注意**：此实现假设 $p$ 和 $q$ 都存在于树中。若不能保证这一点，还要额外确认两个节点都已找到。

### 困难：二叉树中的最大路径和

- **题目**：求任意两个节点之间路径的最大和；路径不一定经过根节点。以下实现假设树非空。

```python
def max_path_sum(root):
    best = [float('-inf')]

    def dfs(node):
        if not node:
            return 0
        left = max(dfs(node.left), 0)   # ignore negative paths
        right = max(dfs(node.right), 0)

        # path through this node (possibly as the "bend")
        best[0] = max(best[0], node.val + left + right)

        # return the max gain this node can contribute to its parent
        return node.val + max(left, right)

    dfs(root)
    return best[0]
```

- **关键思路**：每个节点要分别考虑两个问题：
    1. 经过当前节点的最大路径和是多少？路径可以从左子树经过当前节点延伸到右子树。
    2. 当前节点能向父节点贡献的最大路径和是多少？路径只能选择左、右子树中的一侧，不能在两个节点处同时分叉。

- 混淆“经过当前节点的路径”和“向父节点返回的路径”是这道题最常见的错误。

## 二叉搜索树（BST）

- **二叉搜索树**满足以下次序条件：每个节点左子树中的所有值都小于该节点的值，右子树中的所有值都大于该节点的值。树保持平衡时，查找、插入和删除通常为 $O(\log n)$。

```python
def search_bst(root, target):
    if not root:
        return None
    if target < root.val:
        return search_bst(root.left, target)
    elif target > root.val:
        return search_bst(root.right, target)
    else:
        return root

def insert_bst(root, val):
    if not root:
        return TreeNode(val)
    if val < root.val:
        root.left = insert_bst(root.left, val)
    else:
        root.right = insert_bst(root.right, val)
    return root
```

- 以上插入实现把重复值放入右子树，而验证函数采用严格不等式；整篇示例按值互异的情况编写。若允许重复值，插入和验证必须采用相同的重复值规则。

- **常见错误**：只有树保持平衡时，BST 操作才是 $O(\log n)$。若按排序顺序插入节点，树会退化成链表，每次操作最坏需要 $O(n)$。AVL 树和红黑树等平衡二叉搜索树就是为避免这种退化而设计的。

### 中等：验证二叉搜索树

```python
def is_valid_bst(root, lo=float('-inf'), hi=float('inf')):
    if not root:
        return True
    if root.val <= lo or root.val >= hi:
        return False
    return (is_valid_bst(root.left, lo, root.val) and
            is_valid_bst(root.right, root.val, hi))
```

- **常见错误**：只检查 `left.val < root.val < right.val` 不够，因为左、右子树深处的节点也必须满足次序条件。代码把 `lo` 和 `hi` 范围逐层传下去，以验证整棵子树。

### 中等：二叉搜索树中的第 K 小元素

- **模式思路**：二叉搜索树的中序遍历会按从小到大访问节点。第 $k$ 个访问的节点就是第 $k$ 小元素。这里的 $k$ 从 1 开始；若树中不足 $k$ 个节点，函数会返回 `None`。

```python
def kth_smallest(root, k):
    count = [0]
    result = [None]

    def inorder(node):
        if not node or result[0] is not None:
            return
        inorder(node.left)
        count[0] += 1
        if count[0] == k:
            result[0] = node.val
            return
        inorder(node.right)

    inorder(root)
    return result[0]
```

## 字典树（前缀树）

- **字典树**按字符逐层保存字符串。每条边代表一个字符；从根节点到带结束标记的节点的一条路径表示一个已存储字符串。字符串长度为 $L$ 时，查找需要 $O(L)$ 时间，与树中存储的字符串数量无直接关系。

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True

    def search(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                return False
            node = node.children[char]
        return node.is_end

    def starts_with(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return False
            node = node.children[char]
        return True
```

- **适用场景**：自动补全、拼写检查、文字游戏和 IP 路由表等需要按前缀查找的任务。`search` 检查完整单词，`starts_with` 则只检查前缀是否存在。

### 困难：单词搜索 II

- **题目**：给定字符网格和一组单词，找出所有能通过相邻格子路径组成的单词。

- **模式思路**：先把单词表建成字典树，再从每个格子开始做深度优先搜索，并沿字典树检查前缀。如果当前路径不再是任何单词的前缀，就停止搜索该分支。

- **常见错误**：若不使用字典树，就要为每个单词分别从网格搜索，粗略最坏复杂度可写作 $O(w \cdot m \cdot n \cdot 4^L)$，其中 $w$ 是单词数、网格大小为 $m \times n$、$L$ 是单词长度。字典树能让不同单词共享相同前缀的搜索过程，但实际耗时仍取决于网格内容和剪枝效果。

## 并查集（Union-Find / DSU）

- **并查集**用于维护一组互不相交的集合。它支持两种基本操作：`find(x)` 返回 $x$ 所属集合的代表元素；`union(x, y)` 合并分别包含 $x$ 和 $y$ 的两个集合。

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.count = n  # number of connected components

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # path compression
        return self.parent[x]

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False  # already connected
        # union by rank
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1
        self.count -= 1
        return True
```

- 路径压缩和按秩合并结合使用时，`find` 和 `union` 的均摊时间复杂度为 $O(\alpha(n))$，其中 $\alpha$ 是反阿克曼函数；对实际规模的输入，它增长极慢，通常可视为常数。

- **适用场景**：维护连通分量、检测无向图中的环、实现 Kruskal 最小生成树，以及把等价元素分组。

### 中等：统计连通分量

```python
def count_components(n, edges):
    uf = UnionFind(n)
    for u, v in edges:
        uf.union(u, v)
    return uf.count
```

### 中等：冗余连接

- **题目**：找出删除后能使图成为树的那条边，也就是造成环的边。

- **模式思路**：逐条处理边。若一条边的两个端点已经属于同一集合，加入这条边就会形成环。以下代码假设节点编号是从 1 开始且不超过边数；若编号规则不同，应相应调整并查集大小。

```python
def find_redundant(edges):
    uf = UnionFind(len(edges) + 1)
    for u, v in edges:
        if not uf.union(u, v):
            return [u, v]  # already connected → this edge creates a cycle
```

## 线段树与 Fenwick 树

- **线段树**支持对子数组进行区间查询（例如求和、最小值或最大值），也支持单点更新，两种操作都可在 $O(\log n)$ 时间完成。

- **Fenwick 树（树状数组）**是用于前缀和查询和单点更新的简洁结构。它通过位运算，根据最低位的 1 决定每个位置所存的部分和范围。

```python
class FenwickTree:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)

    def update(self, i, delta):
        i += 1  # 1-indexed
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)  # add lowest set bit

    def prefix_sum(self, i):
        i += 1
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & (-i)  # remove lowest set bit
        return total

    def range_sum(self, l, r):
        return self.prefix_sum(r) - (self.prefix_sum(l - 1) if l > 0 else 0)
```

- **适用场景**：需要重复进行区间查询和更新时，可以考虑这两类结构。若只需前缀和查询及单点加法更新，Fenwick 树通常更简单；若需要区间最小值、最大值或最大公约数等操作，则线段树更合适。

- 上面的 Fenwick 树接口对外使用从 0 开始的索引。`prefix_sum(i)` 返回从索引 0 到 $i$（含 $i$）的和；`range_sum(l, r)` 返回闭区间 $[l, r]$ 的和。

---

## 常见错误汇总

| 错误 | 示例 | 修正方法 |
| --- | --- | --- |
| 只检查 BST 的直接子节点 | `left.val < root.val` 无法发现深层节点违反次序 | 传递 `lo`、`hi` 范围 |
| 递归中反复拼接 $O(n^2)$ 列表 | `inorder(left) + [val] + inorder(right)` | 共享列表并逐个追加 |
| 缺少基础情形 | 空树上递归无法终止 | 检查 `if not root: return` |
| 混淆经过节点的路径和返回父节点的路径 | 最大路径和在多层分叉 | 返回单侧路径，另行记录经过当前节点的路径 |
| Fenwick 树索引从 0 转成 1 时出错 | 树状数组下标差一 | 入口处统一执行 `i += 1` |
| 并查集没有路径压缩 | `find` 最坏需要 $O(n)$ | 使用 `self.parent[x] = self.find(self.parent[x])` |

---

## 课后练习（NeetCode）

### 二叉树模式

- [Invert Binary Tree](https://neetcode.io/problems/invert-a-binary-tree) — 基础递归
- [Maximum Depth of Binary Tree](https://neetcode.io/problems/depth-of-binary-tree) — 递归计算深度
- [Same Tree](https://neetcode.io/problems/same-binary-tree) — 同步遍历两棵树
- [Subtree of Another Tree](https://neetcode.io/problems/subtree-of-a-binary-tree) — 嵌套递归
- [Binary Tree Level Order Traversal](https://neetcode.io/problems/level-order-traversal-of-binary-tree) — 使用队列进行 BFS
- [Binary Tree Maximum Path Sum](https://neetcode.io/problems/binary-tree-maximum-path-sum) — DFS 加全局最优值
- [Serialize and Deserialize Binary Tree](https://neetcode.io/problems/serialize-and-deserialize-binary-tree) — 前序遍历加空标记

### 二叉搜索树模式

- [Validate Binary Search Tree](https://neetcode.io/problems/valid-binary-search-tree) — 传递上下界
- [Kth Smallest Element in a BST](https://neetcode.io/problems/kth-smallest-integer-in-bst) — 中序遍历
- [Lowest Common Ancestor of a BST](https://neetcode.io/problems/lowest-common-ancestor-in-binary-search-tree) — 利用 BST 的次序

### 字典树

- [Implement Trie](https://neetcode.io/problems/implement-prefix-tree) — 实现基本字典树操作
- [Design Add and Search Words](https://neetcode.io/problems/design-word-search-data-structure) — 字典树加带通配符的 DFS
- [Word Search II](https://neetcode.io/problems/search-for-word-ii) — 用字典树引导回溯搜索

### 并查集

- [Number of Connected Components](https://neetcode.io/problems/count-connected-components) — 并查集入门
- [Redundant Connection](https://neetcode.io/problems/redundant-connection) — 用并查集检测环
