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



*Trees是文件系统,数据库,编译器以及无数的采访问题背后的分级数据结构. 此文件涵盖二进制树, BST , 平衡树, 尝试, 分块树, Fenwick 树, 以及 Union-Find, 具有横向图案, 递归思维, 并逐渐更难的问题。*

- A树**是相通的循环图(第13章). 最重要的变种是**二元树**:每个节点最多有两个孩子(左右). 树会随处可见:在编译器中剖析出树;浏览器中解析出DOM树;在ML中解析出决定树;在数据库中解析出B-树.

- 对树木问题的关键见解:** 大部分树木问题都是递归解决的**. 结构是递归性的(一棵树是根有两棵子树),所以溶液应该是也. 掌握"解决左子树,解决右子树,结合"的模式,可以解决大多数树木问题.

## 二叉树遍历



- 每个节点有四种标准访问方式:

    - ** 不有序** (左, root, 右): 对于 BST, 此访问节点按排序顺序进行.
    - ** 序号**(根,左,右):用于串行和复制树.
    - **后序**(左,右,根):用于删除和计算大小.
    - ** 等级顺序** (BFS):使用队列按级别访问节点级别.

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

- ** 倒计时**:上面的递归式转录在每一步骤上创建新的列表(因为`+`协和),即$O(n^2)$。。。为了提高效率,通过结果列表和附加到位置:

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

- ** 递归模式**:基本病例(无)-0;儿童复发,合并(1+最大)。同样的模式适用于数十个树木问题.

### 简单：翻转二叉树



```python
def invert_tree(root):
    if not root:
        return None
    root.left, root.right = invert_tree(root.right), invert_tree(root.left)
    return root
```

### 中等：最近公共祖先



- ** 问题**:找到两者的祖先的最低节点$p$财务报告和已审计财务报表$q$.

- ** 两者兼有:$p$财务报告和已审计财务报表$q$LCA在左边的树上,LCA在左边的树上。如是等正觉相. 如果它们分裂出(左一分,右一分),当前的节点是LCA.

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

- ** 意外**:假设$p$财务报告和已审计财务报表$q$两者都存在于树上。如果可能不行,你需要额外的检查。

### 困难：二叉树中的最大路径和



- ** problem**:在任意两个节点之间找到最大和道(路径不需要通过根来).

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

- **关键见解**:在每个节点,有两个问题:(1) 哪个路径是最佳途径,能通通* 这个节点(左+节点+正)? (2) 这个节点能促进其 * parent * (node + max(左,右)) 的最佳路径是什么? 因为路径无法分叉在两个级别上) ? 混淆这两个是最常见的错误.

## 二叉搜索树（BST）



- a **BST**满足:对于每一个节点,左子树上的所有值都较小,而右子树上的所有值都更大. 这样可以$O(\log n)$搜索、插入和删除(平衡时)。

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

- ** 意外**:BST业务是$O(\log n)$惟树平时. 从排序插入构建的 BST 已退化为链接列表 :$O(n)$每次行动 这就是为什么平衡的BST(AVL,红-黑)存在.

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

- ** 意外**:仅检查`left.val < root.val < right.val`错了 限制在于左下行树上的所有**节点都较小,而不仅仅是近亲. 该`lo`/`hi`界限传播这种限制。

### 中等：BST 中第 K 小的元素



- ** Pattern**:BST访问节点按排序顺序不规则转接. 该$k$访问的节点就是答案。

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



- 一个** trie ** 将字符串按字符存储在树上. 每个边缘代表一个字符,从根到被标记的节点的路径代表被存储的字符串. 启动三次$O(L)$寻找哪里$L$是字符串长度,而不论存储了多少个字符串。

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

- **何时使用**:自动完成,拼写检查,文字游戏,IP路由表. 当您需要前缀操作时。

### 困难：单词搜索 II



- ** problem**:给一个字符板和一个单词列表,寻找所有能由相邻细胞穿行而形成的单词.

- ** Pattern**:从单词列表中构建出一个三重词,然后从每个单元格使用三重词到prune分支提前(如果没有单词开头的是当前前缀,则停止).

- ** 意外**:没有三个字,你们将分别处理每个字:$O(w \cdot m \cdot n \cdot 4^L)$。。。tree 共享跨字面的前缀计算,显著地减少了工作.

## 并查集



- ** Union-Find** 跟踪一组脱节相机。两项行动:`find(x)`返回代表$x$设定,和`union(x, y)`合并包含$x$财务报告和已审计财务报表$y$.

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

- 通过路径压缩和按级别排列的结合,两个操作都运行在$O(\alpha(n)) \approx O(1)$分期摊还(反向Ackermann,有效恒定).

- ** 当使用**:相接组件,循环检测在未定向图中,克罗斯卡尔的MST,分组等同项目.

### 中等：连通分量的数量



```python
def count_components(n, edges):
    uf = UnionFind(n)
    for u, v in edges:
        uf.union(u, v)
    return uf.count
```

### 中等：冗余连接



- ** problem**:找到在去除后使图成为一棵树的边缘(即产生循环的边缘).

- ** Pattern**:过程边缘相接. 两个端点已经在同一组件中的第一个边缘产生循环.

```python
def find_redundant(edges):
    uf = UnionFind(len(edges) + 1)
    for u, v in edges:
        if not uf.union(u, v):
            return [u, v]  # already connected → this edge creates a cycle
```

## 线段树与 Fenwick 树



- ** 分区树** 答案范围查询(和、分、最大在一个子阵列上)和支持点更新,均载于$O(\log n)$.

- **Fenwick树**(Binary Indexed Trees)是用于前缀总和查询和点更新的更简单,更快的替代. 他们使用一个聪明的比特操纵技巧:每个位置存储一个部分和数,覆盖由最低设置比特决定的范围.

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

- ** 何时使用**:需要反复查询并更新范围的问题。Fenwick 树在只需要前缀总和时首选;在需要任意范围操作时首选分块树(min, max, GCD).

---

## 常见陷阱总结



|Pitfall|Example|Fix|
|---------|---------|-----|
|Checking only direct children for BST|`left.val < root.val` misses deeper violations|Pass `lo`/`hi` bounds|
|$O(n^2)$ list concatenation in recursion|`inorder(left) + [val] + inorder(right)`|Append to shared list|
|Forgetting base case|Infinite recursion on empty tree|`if not root: return`|
|Confusing path-through vs path-to-parent|Max path sum: forking at two levels|Return single-branch to parent, track two-branch separately|
|1-indexed vs 0-indexed Fenwick|Off-by-one in tree array|Always `i += 1` at entry|
|Union-Find without path compression|$O(n)$ per find in worst case|`self.parent[x] = self.find(self.parent[x])`|

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
