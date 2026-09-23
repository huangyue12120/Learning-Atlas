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

*树把层级关系组织成递归结构。本篇覆盖二叉树遍历、二叉搜索树、Trie、并查集、线段树与 Fenwick 树，以及各类常见题型。*



*Trees are the hierarchical data structure behind file systems, databases, compilers, and countless interview problems. This file covers binary trees, BSTs, balanced trees, tries, segment trees, Fenwick trees, and Union-Find, with traversal patterns, recursive thinking, and progressively harder problems.*

- A **tree** is a connected, acyclic graph (chapter 13). The most important variant is the **binary tree**: each node has at most two children (left and right). Trees appear everywhere: parse trees in compilers, DOM trees in browsers, decision trees in ML, and B-trees in databases.

- The key insight for tree problems: **most tree problems are solved recursively**. The structure is recursive (a tree is a root with two subtrees), so the solutions should be too. Master the pattern of "solve for left subtree, solve for right subtree, combine" and you can solve most tree problems.

## 二叉树遍历

> **中文导读**：本节围绕“二叉树遍历”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


- There are four standard ways to visit every node:

    - **Inorder** (left, root, right): for BSTs, this visits nodes in sorted order.
    - **Preorder** (root, left, right): useful for serialisation and copying trees.
    - **Postorder** (left, right, root): useful for deletion and computing sizes.
    - **Level-order** (BFS): visit nodes level by level using a queue.

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

- **Pitfall**: the recursive traversals above create new lists at each step (due to `+` concatenation), which is $O(n^2)$. For efficiency, pass a result list and append in-place:

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

> **中文导读**：本节围绕“简单：二叉树的最大深度”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


```python
def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))
```

- **The recursive pattern**: base case (null → 0), recurse on children, combine (1 + max). This same pattern applies to dozens of tree problems.

### 简单：翻转二叉树

> **中文导读**：本节围绕“简单：翻转二叉树”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


```python
def invert_tree(root):
    if not root:
        return None
    root.left, root.right = invert_tree(root.right), invert_tree(root.left)
    return root
```

### 中等：最近公共祖先

> **中文导读**：本节围绕“中等：最近公共祖先”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


- **Problem**: find the lowest node that is an ancestor of both $p$ and $q$.

- **Pattern**: if both $p$ and $q$ are in the left subtree, the LCA is in the left subtree. If both are in the right, it is in the right. If they split (one left, one right), the current node is the LCA.

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

- **Pitfall**: this assumes $p$ and $q$ both exist in the tree. If they might not, you need additional checks.

### 困难：二叉树中的最大路径和

> **中文导读**：本节围绕“困难：二叉树中的最大路径和”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


- **Problem**: find the maximum sum path between any two nodes (the path does not need to go through the root).

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

- **Key insight**: at each node, there are two questions: (1) what is the best path that goes *through* this node (left + node + right)? (2) what is the best path this node can contribute to its *parent* (node + max(left, right), since a path cannot fork at two levels)? Confusing these two is the most common mistake.

## 二叉搜索树（BST）

> **中文导读**：本节围绕“二叉搜索树（BST）”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


- A **BST** satisfies: for every node, all values in the left subtree are smaller, all values in the right subtree are larger. This enables $O(\log n)$ search, insert, and delete (when balanced).

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

- **Pitfall**: BST operations are $O(\log n)$ only when the tree is balanced. A BST built from sorted insertions degenerates to a linked list: $O(n)$ per operation. This is why balanced BSTs (AVL, red-black) exist.

### 中等：验证二叉搜索树

> **中文导读**：本节围绕“中等：验证二叉搜索树”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


```python
def is_valid_bst(root, lo=float('-inf'), hi=float('inf')):
    if not root:
        return True
    if root.val <= lo or root.val >= hi:
        return False
    return (is_valid_bst(root.left, lo, root.val) and
            is_valid_bst(root.right, root.val, hi))
```

- **Pitfall**: checking only `left.val < root.val < right.val` is wrong. The constraint is that *all* nodes in the left subtree are smaller, not just the immediate child. The `lo`/`hi` bounds propagate this constraint down.

### 中等：BST 中第 K 小的元素

> **中文导读**：本节围绕“中等：BST 中第 K 小的元素”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


- **Pattern**: inorder traversal of a BST visits nodes in sorted order. The $k$th node visited is the answer.

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

## Trie（前缀树）

> **中文导读**：本节围绕“Trie（前缀树）”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


- A **trie** stores strings character by character in a tree. Each edge represents a character, and paths from root to marked nodes represent stored strings. Tries enable $O(L)$ lookup where $L$ is the string length, regardless of how many strings are stored.

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

- **When to use**: autocomplete, spell check, word games, IP routing tables. Whenever you need prefix-based operations.

### 困难：单词搜索 II

> **中文导读**：本节围绕“困难：单词搜索 II”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


- **Problem**: given a board of characters and a list of words, find all words that can be formed by traversing adjacent cells.

- **Pattern**: build a trie from the word list, then DFS from each cell using the trie to prune branches early (if no word starts with the current prefix, stop).

- **Pitfall**: without the trie, you would DFS for each word separately: $O(w \cdot m \cdot n \cdot 4^L)$. The trie shares prefix computation across words, dramatically reducing work.

## 并查集

> **中文导读**：本节围绕“并查集”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


- **Union-Find** tracks a collection of disjoint sets. Two operations: `find(x)` returns the representative of $x$'s set, and `union(x, y)` merges the sets containing $x$ and $y$.

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

- With path compression and union by rank, both operations run in $O(\alpha(n)) \approx O(1)$ amortised (inverse Ackermann, effectively constant).

- **When to use**: connected components, cycle detection in undirected graphs, Kruskal's MST, grouping equivalent items.

### 中等：连通分量的数量

> **中文导读**：本节围绕“中等：连通分量的数量”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


```python
def count_components(n, edges):
    uf = UnionFind(n)
    for u, v in edges:
        uf.union(u, v)
    return uf.count
```

### 中等：冗余连接

> **中文导读**：本节围绕“中等：冗余连接”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


- **Problem**: find the edge that, when removed, makes the graph a tree (i.e., the edge that creates a cycle).

- **Pattern**: process edges one by one. The first edge where both endpoints are already in the same component creates the cycle.

```python
def find_redundant(edges):
    uf = UnionFind(len(edges) + 1)
    for u, v in edges:
        if not uf.union(u, v):
            return [u, v]  # already connected → this edge creates a cycle
```

## 线段树与 Fenwick 树

> **中文导读**：本节围绕“线段树与 Fenwick 树”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


- **Segment trees** answer range queries (sum, min, max over a subarray) and support point updates, both in $O(\log n)$.

- **Fenwick trees** (Binary Indexed Trees) are a simpler, faster alternative for prefix sum queries and point updates. They use a clever bit manipulation trick: each position stores a partial sum covering a range determined by the lowest set bit.

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

- **When to use**: problems requiring repeated range queries with updates. Fenwick trees are preferred when you only need prefix sums; segment trees when you need arbitrary range operations (min, max, GCD).

---

## 常见陷阱总结

> **中文导读**：本节围绕“常见陷阱总结”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


| Pitfall | Example | Fix |
|---------|---------|-----|
| Checking only direct children for BST | `left.val < root.val` misses deeper violations | Pass `lo`/`hi` bounds |
| $O(n^2)$ list concatenation in recursion | `inorder(left) + [val] + inorder(right)` | Append to shared list |
| Forgetting base case | Infinite recursion on empty tree | `if not root: return` |
| Confusing path-through vs path-to-parent | Max path sum: forking at two levels | Return single-branch to parent, track two-branch separately |
| 1-indexed vs 0-indexed Fenwick | Off-by-one in tree array | Always `i += 1` at entry |
| Union-Find without path compression | $O(n)$ per find in worst case | `self.parent[x] = self.find(self.parent[x])` |

---

## 课后题（NeetCode）

> **中文导读**：本节围绕“课后题（NeetCode）”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。


### 二叉树模式

> **中文导读**：本节围绕“二叉树模式”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。

- [Invert Binary Tree](https://neetcode.io/problems/invert-a-binary-tree) — basic recursion
- [Maximum Depth of Binary Tree](https://neetcode.io/problems/depth-of-binary-tree) — recursive depth
- [Same Tree](https://neetcode.io/problems/same-binary-tree) — simultaneous traversal
- [Subtree of Another Tree](https://neetcode.io/problems/subtree-of-a-binary-tree) — nested recursion
- [Binary Tree Level Order Traversal](https://neetcode.io/problems/level-order-traversal-of-binary-tree) — BFS with level tracking
- [Binary Tree Maximum Path Sum](https://neetcode.io/problems/binary-tree-maximum-path-sum) — DFS with global best
- [Serialize and Deserialize Binary Tree](https://neetcode.io/problems/serialize-and-deserialize-binary-tree) — preorder + null markers

### BST 模式

> **中文导读**：本节围绕“BST 模式”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。

- [Validate Binary Search Tree](https://neetcode.io/problems/valid-binary-search-tree) — bound propagation
- [Kth Smallest Element in a BST](https://neetcode.io/problems/kth-smallest-integer-in-bst) — inorder traversal
- [Lowest Common Ancestor of a BST](https://neetcode.io/problems/lowest-common-ancestor-in-binary-search-tree) — exploit BST ordering

### Trie

> **中文导读**：本节围绕“Trie”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。

- [Implement Trie](https://neetcode.io/problems/implement-prefix-tree) — basic trie operations
- [Design Add and Search Words](https://neetcode.io/problems/design-word-search-data-structure) — trie + DFS with wildcards
- [Word Search II](https://neetcode.io/problems/search-for-word-ii) — trie-guided backtracking

### 并查集

> **中文导读**：本节围绕“并查集”说明核心概念、关键公式和工程直觉；下方保留源文的完整技术细节，便于与上游逐项核对。

- [Number of Connected Components](https://neetcode.io/problems/count-connected-components) — basic union-find
- [Redundant Connection](https://neetcode.io/problems/redundant-connection) — cycle detection via union-find
