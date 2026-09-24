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

*树是文件系统、数据库、编译器和无数面试问题背后的基础数据结构。本文件涵盖了二叉树、BST、平衡树、字典树、线段树、Fenwick树和并查集，以及遍历模式、递归思维和逐步难度增加的问题。*

- **树**是一个连通且无环的图（第13章）。最重要的变体是二叉树：每个节点最多有两个子节点（左和右）。树几乎无处不在：编译器中的解析树、浏览器中的DOM树、机器学习中的决策树以及数据库中的B树。

- 解决树问题的关键洞察力：**大多数树问题都是递归解决的**。结构是递归的（一棵树是一个根节点和两个子树），因此解决方案也应该如此。掌握“解决左子树，解决右子树，合并”的模式，可以解决大多数树问题。

## 二叉树遍历

- 有四种标准方式来访问每个节点：

    - **中序**（左，根，右）：对于BSTs，这会按排序顺序访问节点。
    - **前序**（根，左，右）：在序列化和复制树时非常有用。
    - 后序（左、右、根）：用于删除和计算大小。
    - **层次遍历**（广度优先搜索）：按层逐级访问节点，使用队列。

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

- **陷阱**：上述递归遍历在每次步骤中都会创建新的列表（由于 `+` 连接），这会导致 $O(n^2)$。为了提高效率，传递一个结果列表并在原地进行追加：

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

- **递归模式**：基本情况（空节点 → 0），递归处理子节点，合并结果（1 + 最大值）。这种模式适用于数十个树问题。

### 简单：反转二叉树

```python
def invert_tree(root):
    if not root:
        return None
    root.left, root.right = invert_tree(root.right), invert_tree(root.left)
    return root
```

### 中等：最低公共祖先

- **问题**：找到两个 $p$ 和 $q$ 的最低共同祖先。

- **模式**：如果 $p$ 和 $q$ 都在左子树中，LCA 在左子树中。如果都位于右子树中，则 LCA 在右子树中。如果它们分裂（一个在左，另一个在右），当前节点是 LCA。

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

- **陷阱**：这个假设 $p$ 和 $q$ 都存在于树中。如果它们可能不存在，需要额外的检查。

### 困难：二叉树最大路径和

- **问题**：找到任意两个节点之间的最大路径和（路径不需要经过根）。

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

- **关键洞察**：在每个节点，有两个问题：（1）通过该节点的最佳路径是什么？（2）该节点可以为它的父节点贡献的最佳路径是什么？将这两个问题混淆是最常见的错误。

## 二叉搜索树 (BSTs)

- 二叉搜索树（BST）满足：对于每个节点，左子树中的所有值都小于它，右子树中的所有值都大于它。这使得 BST 具有 $O(\log n)$ 的查找、插入和删除功能（当平衡时）。

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

- **陷阱**：BST操作是 $O(\log n)$ 只有当树是平衡的。从有序插入构建的BST会退化为链表： $O(n)$ 每次操作。这就是为什么平衡二叉搜索树（AVL、红黑）存在。

### 中等：二叉搜索树中的第 K 小元素

```python
def is_valid_bst(root, lo=float('-inf'), hi=float('inf')):
    if not root:
        return True
    if root.val <= lo or root.val >= hi:
        return False
    return (is_valid_bst(root.left, lo, root.val) and
            is_valid_bst(root.right, root.val, hi))
```

- **陷阱**：只检查 `left.val < root.val < right.val` 错误。约束是所有左子树的节点都必须小于，而不是直接子节点。`lo`/`hi` 的边界向下传播这个约束。

### 中等：二叉搜索树中的第 K 小元素

- **模式**：BST 的中序遍历按升序顺序访问节点。第 $k$ 个被访问的节点是答案。

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

## 前缀树（字典树）

- 一个 **trie** 存储字符串字符-by字符地在树中。每个边代表一个字符，从根节点到标记节点的路径表示存储的字符串。Trie 允许 $O(L)$ 查找，无论存储了多少个字符串，字符串长度为 $L$。

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

- **何时使用**：自动完成功能、拼写检查、词类游戏、IP 路由表等。当你需要前缀操作时都可以使用它。

### 难度：单词搜索 II

- **问题**：给定一个字符板和一组单词，找到可以通过遍历相邻单元格形成的所有单词。

- **模式**：从单词列表构建一个 trie，然后从每个单元格使用 trie 进行 DFS 以提前剪枝分支（如果当前前缀没有单词开始，就停止）。

- **陷阱**：如果没有使用 trie，你将为每个单词单独进行 DFS：$O(w \cdot m \cdot n \cdot 4^L)$。trie 共享前缀计算 across words，大大减少了工作量。

## 并查集（Disjoint Set Union）

- **并查集**跟踪一组不相交的集合。两个操作：`find(x)` 返回 $x$ 的代表，`union(x, y)` 合并包含 $x$ 和 $y$ 的集合。

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

- 使用路径压缩和按秩合并，两者操作的平均时间复杂度为 $O(\alpha(n)) \approx O(1)$（逆阿克曼函数，实际上接近常数）。

- **何时使用**：连通分量、无向图的环检测、Kruskal最小生成树、等价项分组。

### 中等: 连通分量的数量

```python
def count_components(n, edges):
    uf = UnionFind(n)
    for u, v in edges:
        uf.union(u, v)
    return uf.count
```

### 中等: 重复连接边

- **问题**: 找到当删除该边时，使图成为树的边（即创建环的边）。

- **模式**：逐个处理边。第一个端点和另一个端点都已存在于同一组件中的边创建了环。

```python
def find_redundant(edges):
    uf = UnionFind(len(edges) + 1)
    for u, v in edges:
        if not uf.union(u, v):
            return [u, v]  # already connected → this edge creates a cycle
```

## 段树与二叉索引树

- **段树**回答范围查询（子数组的和、最小值、最大值）以及点更新，都在 $O(\log n)$ 中实现。

- **二叉索引树**（二进制索引树）是前缀和查询和点更新的更简单、更快的替代方案。它们使用一个巧妙的位运算技巧：每个位置存储了一个覆盖由最低设置位确定的范围的局部和。

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

- **何时使用**：需要频繁进行范围查询并支持点更新的问题。二叉索引树适用于只需要前缀和的情况；段树则适用于需要任意范围操作（最小值、最大值、GCD）。

---

## 共同的陷阱总结

| 陷阱 | 示例 | 解决方法 |
|---------|---------|-----|
| 检查二叉搜索树（BST）时只检查直接子节点 | `left.val < root.val` 缺少更深的违规情况 | 通过 `lo`/`hi` 范围进行检查 |
| 在递归中使用 $O(n^2)$ 列表连接 | `inorder(left) + [val] + inorder(right)` | 将列表附加到共享列表中 |
| 忘记基本情况 | 无限递归在空树上 | `if not root: return` |
| 混淆路径通过 vs 路径到父节点 | 最大路径和：在两层时分叉 | 返回单分支给父节点，单独跟踪两个分支 |
| 1-indexed vs 0-indexed Fenwick树 | 在树数组中出现偏移量 | 总是 `i += 1` 在入口处 |
| 并查集（Union-Find）没有路径压缩 | 最坏情况下的 $O(n)$ 每次查找 | `self.parent[x] = self.find(self.parent[x])` |

---

## 课后题（NeetCode）



### 二叉树模式


- [倒转二进制树](https://neetcode.io/problems/invert-a-binary-tree)，，基本重复
- [二进制树的最大深度](https://neetcode.io/problems/depth-of-binary-tree)，，递归深度
- [同一树](https://neetcode.io/problems/same-binary-tree)，，同时穿行.
- [又一树的子树](https://neetcode.io/problems/subtree-of-a-binary-tree)，，巢接复发.
- [二进制树级顺序](https://neetcode.io/problems/level-order-traversal-of-binary-tree)- 有级别跟踪的BFS
- [二进制树最大路径和](https://neetcode.io/problems/binary-tree-maximum-path-sum)，，外勤部全球最佳
- [二进制树的序列化和去序列化](https://neetcode.io/problems/serialize-and-deserialize-binary-tree)，，序号+无标记

### BST 模式


- [验证二进制搜索树](https://neetcode.io/problems/valid-binary-search-tree)- 捆绑传播
- [BST 中最小元素](https://neetcode.io/problems/kth-smallest-integer-in-bst)，，无序转弯.
- [BST 最低常见祖先](https://neetcode.io/problems/lowest-common-ancestor-in-binary-search-tree)- 利用BST订单

### 尝试


- [执行 Trie](https://neetcode.io/problems/implement-prefix-tree)，，基本三轮操作.
- [设计和搜索单词](https://neetcode.io/problems/design-word-search-data-structure)3个+外勤部带通配卡
- [词搜索 二](https://neetcode.io/problems/search-for-word-ii)，，三相制导回溯跟踪

### 并查集


- [连接组件数量](https://neetcode.io/problems/count-connected-components)- 基本工会
- [冗余连接](https://neetcode.io/problems/redundant-connection)，，通过加盟检测循环.
