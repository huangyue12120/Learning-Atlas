---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 14 - data structures and algorithms/05. sorting and search.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 82971ed222390f96d772daee7c5c6baadf2459b8b479af2ec2c99db9fe2c1111
status: reviewed
---
# 排序、搜索和算法设计

*排序和搜索是计算机科学中最基本的算法操作。本文件涵盖了排序算法、二分查找模式、分治法、贪心算法、动态规划和回溯等*

- 每种数据结构都支持算法，而每种算法都依赖于数据结构。本文件介绍了**设计范式**：解决问题的高层次策略。一旦识别出适用的设计范式，实现就自然地 follows起来。

## 排序算法

- 排序是计算机科学中最研究的问题之一。理解这些算法可以建立对递归、分治法和复杂性分析的直观认识。

| 算法 | 最优 | 平均 | 最坏 | 空间 | 稳定? |
|-----------|------|---------|-------|-------|---------|
| 冒泡排序 | $O(n)$ | $O(n^2)$ | $O(n^2)$ | $O(1)$ | 是 |
| 插入排序 | $O(n)$ | $O(n^2)$ | $O(n^2)$ | $O(1)$ | 是 |
| 归并排序 | $O(n \log n)$ | $O(n \log n)$ | $O(n \log n)$ | $O(n)$ | 是 |
| 快速排序 | $O(n \log n)$ | $O(n \log n)$ | $O(n^2)$ | $O(\log n)$ | 否 |
| 堆排序 | $O(n \log n)$ | $O(n \log n)$ | $O(n \log n)$ | $O(1)$ | 否 |
| 计数排序 | $O(n + k)$ | $O(n + k)$ | $O(n + k)$ | $O(k)$ | 是 |
| 基数排序 | $O(d(n + k))$ | $O(d(n + k))$ | $O(d(n + k))$ | $O(n + k)$ | 是 |

- **稳定**意味着相等元素的相对顺序保持不变。这在按多个键排序时很重要。

- 比较基于排序的下界是 $\Omega(n \log n)$。证明使用决策树（第13章）：任何比较排序必须区分所有 $n!$ 顺序，需要至少 $\log_2(n!)  = \Omega(n \log n)$ 次比较。计数排序和基数排序通过不比较元素而击败了这个下界。

### 归并排序

- 将数组分成两半，递归地对每一半进行排序，然后合并排序后的结果。 $O(n \log n)$总是， $O(n)$额外的空间。

```python
def merge_sort(arr):
    if len(arr) <= 1:
        return arr

    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])

    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:  # <= for stability
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result
```

- **陷阱**：使用 `<` 而不是 `<=` 在合并时会破坏稳定性（右侧半部分的相等元素会排在左侧）。

### 快速排序是一种高效的排序算法，基于分治策略。它选择一个“基准”元素（pivot），然后将数组分为两个子数组：小于基准的元素和大于基准的元素。接着递归地对这两个子数组进行排序。最终，整个数组被有序排列。

- 选择一个**基准元素**，将数组分为“小于基准元素”和“大于基准元素”，递归地对每个分区进行排序。平均情况为 $O(n \log n)$，最坏情况（当基准元素总是最小或最大元素时）为 $O(n^2)$。

```python
def quicksort(arr, lo=0, hi=None):
    if hi is None:
        hi = len(arr) - 1
    if lo >= hi:
        return

    pivot_idx = partition(arr, lo, hi)
    quicksort(arr, lo, pivot_idx - 1)
    quicksort(arr, pivot_idx + 1, hi)

def partition(arr, lo, hi):
    pivot = arr[hi]  # Lomuto: pivot is last element
    i = lo
    for j in range(lo, hi):
        if arr[j] < pivot:
            arr[i], arr[j] = arr[j], arr[i]
            i += 1
    arr[i], arr[hi] = arr[hi], arr[i]
    return i
```

- **分治策略**：最后一个元素（简单但不适合已排序输入），随机选择（期望 $O(n \log n)$），三数中位法（实用的选择）。在面试中总是优先使用随机枢轴以避免最坏情况的讨论。

- **陷阱**：快速排序的 $O(n^2)$ 最坏情况发生在已经排序的数组中，第一个或最后一个元素作为基准。在实践中，随机基准或三数取中法可以消除这种情况。

### 计数排序

- 当值为已知范围内的整数 $[0, k)$ 时，计数 occurrences 并重建： $O(n + k)$ 时间。不是基于比较的，因此它可以击败 $O(n \log n)$.

```python
def counting_sort(arr, k):
    count = [0] * k
    for x in arr:
        count[x] += 1
    result = []
    for val in range(k):
        result.extend([val] * count[val])
    return result
```

- **何时使用**：$k$与$n$相差不大。如果$k = O(n)$，这是$O(n)$。如果$k \gg n$（例如，在范围$[0, 10^9]$内排序10个数字），计数排序浪费内存。

---

## 二分查找算法

- 二分查找在排序数组中找到目标。 $O(\log n)$ 通过反复将搜索空间减半。但二分查找远不止是“在一个有序数组中找到一个数字”。一般模式是：**在单调条件上进行搜索**。

- **模板**（避免越界错误的）：

```python
def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1

    while lo <= hi:
        mid = lo + (hi - lo) // 2  # avoids overflow in other languages
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1

    return -1  # not found
```

- **下界**（第一个元素 $\geq$ 目标）：

```python
def lower_bound(arr, target):
    lo, hi = 0, len(arr)
    while lo < hi:
        mid = (lo + hi) // 2
        if arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo
```

- **陷阱**：`lo <= hi`和`lo < hi`之间的差异，以及`hi = mid`和`hi = mid - 1`之间的差异，决定了你是否找到精确匹配还是边界。用一个包含两个元素的数组来画出来进行验证。

### 简单：二分查找

- 标准问题。使用上述模板即可。

### 中等: 在旋转排序数组中查找

- **问题**: 一个已排序的数组被旋转了某个位置。找到目标值。

- **模式**: 每一步，其中一半总是有序的。确定哪一半是有序的，并检查目标是否在该半中。

```python
def search_rotated(nums, target):
    lo, hi = 0, len(nums) - 1

    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid

        # left half is sorted
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        # right half is sorted
        else:
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1

    return -1
```

- **陷阱**： `<=` 在 `nums[lo] <= nums[mid]` (不是) `<`这是至关重要的。当 `lo == mid` (还剩两个元素)，我们必须正确识别已排序的一半。

### 难：两个有序数组的中位数

- **问题**：在 $O(\log(m + n))$ 中找到两个有序数组的中位数。

- **模式**：在较小数组的分割点上进行二分查找。分割将两个数组分成两部分，使得左半部分的所有元素都小于右半部分的所有元素。

```python
def find_median(nums1, nums2):
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1  # ensure nums1 is shorter

    m, n = len(nums1), len(nums2)
    lo, hi = 0, m
    half = (m + n + 1) // 2

    while lo <= hi:
        i = (lo + hi) // 2          # partition point in nums1
        j = half - i                 # partition point in nums2

        left1 = nums1[i - 1] if i > 0 else float('-inf')
        right1 = nums1[i] if i < m else float('inf')
        left2 = nums2[j - 1] if j > 0 else float('-inf')
        right2 = nums2[j] if j < n else float('inf')

        if left1 <= right2 and left2 <= right1:
            # correct partition
            if (m + n) % 2 == 1:
                return max(left1, left2)
            return (max(left1, left2) + min(right1, right2)) / 2
        elif left1 > right2:
            hi = i - 1
        else:
            lo = i + 1
```

- 这是二分查找中最困难的问题之一。关键洞察在于，你不是在寻找一个值，而是要找到一个**满足条件的分割点**。

### 元模式：答案的二分查找

- 许多看起来不像二分查找的问题，可以通过在答案上进行二分搜索来解决。如果答案是一个数字，并且你可以编写一个函数 `is_feasible(x)` 是单调的（对所有） $x \geq$ 最优，或对所有都为假 $x \geq$ 最优的情况下，使用二分查找 $x$。

- **示例**: "一个船的最小容量是多少，才能在 $d$ 天内运送完所有包裹？" 使用二分查找来确定容量。对于每个候选容量，贪心地检查是否可以在 $d$ 天内运送完所有包裹。

```python
def ship_within_days(weights, days):
    lo, hi = max(weights), sum(weights)

    while lo < hi:
        mid = (lo + hi) // 2
        # can we ship with capacity mid in <= days?
        current_load, num_days = 0, 1
        for w in weights:
            if current_load + w > mid:
                num_days += 1
                current_load = 0
            current_load += w

        if num_days <= days:
            hi = mid
        else:
            lo = mid + 1

    return lo
```

---

## 模式：贪心算法

- 一个贪心算法在每次步骤中都做出局部最优的选择，希望这能导向全局最优解。贪心算法适用于具有贪心选择性质（局部最优能导向全局最优）和最优子结构（最优解包含子问题的最优解）的问题。

### 中等：跳跃游戏

- 问题：给定一个数组，其中 `nums[i]` 最大跳跃长度在位置 $i$判断是否能到达最后一个索引。

```python
def can_jump(nums):
    max_reach = 0
    for i, jump in enumerate(nums):
        if i > max_reach:
            return False  # cannot reach this position
        max_reach = max(max_reach, i + jump)
    return True
```

- **为什么贪心算法有效**：我们只需要知道最远可达的位置。如果当前位置超出最远可达范围，我们就被困住了。否则，我们更新最远可达范围。

### 中等：合并区间

- **问题**：合并重叠的区间。

```python
def merge_intervals(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]

    for start, end in intervals[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])

    return merged
```

- **模式**：按开始时间排序，然后贪婪地合并。如果当前区间与最后一个合并的区间重叠，则扩展它。否则，开始一个新的合并区间。

- **陷阱**：使用 `merged[-1][1] = end` 而不是 `merged[-1][1] = max(merged[-1][1], end)`。一个区间可以完全包含在另一个区间内（例如 [1, 10] 和 [2, 5]）。

---

## 模式：动态规划

- **动态规划 (DP)** 解决问题的方法是将它们分解为重叠的子问题，解决每个子问题一次，并存储结果。它适用于具有 **最优子结构** 和 **重叠子问题** 的问题。

- **两种方法**：
    - **顶部向下 (记忆化)**：编写自然递归解决方案，然后在字典中缓存结果。
    - **底部向上 (表格法)**：从最小的子问题开始构建表格。

- **如何识别 DP**：问题要求一个最优（最小/最大）、计数或存在，当前决策依赖于之前的决策。如果绘制递归树并看到重复的子问题，则是动态规划。

### 简单：爬楼梯

- **问题**：有 $n$ 步，每次可以爬 1 或 2 步。有多少种不同的方式？

- 这是斐波那契数列：$f(n) = f(n-1) + f(n-2)$。

```python
def climb_stairs(n):
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b
```

- $O(n)$时间复杂度，$O(1)$空间复杂度。由于每个状态只依赖于前两个状态，因此不需要完整的记忆表。

### 中等：硬币找零

- **问题**：给定硬币面额和目标金额，找到所需的最少硬币数量。

- **状态**：`dp[amount]` = 用 `amount` 所需的最少硬币数。
- **转移**：`dp[amount] = min(dp[amount - coin] + 1)` 对于每个硬币。
- **基础情况**: `dp[0] = 0`.

```python
def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0

    for a in range(1, amount + 1):
        for coin in coins:
            if coin <= a and dp[a - coin] + 1 < dp[a]:
                dp[a] = dp[a - coin] + 1

    return dp[amount] if dp[amount] != float('inf') else -1
```

- **陷阱**: 初始化时使用 `float('inf')`（不是 0 或 -1）。仅在不可达状态为无穷大时，最小比较才有效。

### 中等: 最长公共子序列

- **问题**: 给定两个字符串，找到它们的最长公共子序列的长度。

- **状态**: `dp[i][j]` = LCS of `text1[:i]` 和 `text2[:j]`.
- **转移**: 如果 `text1[i-1] == text2[j-1]`，则 `dp[i][j] = dp[i-1][j-1] + 1`。否则，`dp[i][j] = max(dp[i-1][j], dp[i][j-1])`.

```python
def longest_common_subsequence(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

    return dp[m][n]
```

### 困难: 0/1背包问题

- **问题**: 给定具有重量和价值的物品，以及一个容量 $W$，最大化总值而不超过 $W$。

- **状态**: `dp[i][w]` = 使用前 $i$ 个元素，容量为 $w$ 的最大值。
- **转移**: `dp[i][w] = max(dp[i-1][w], dp[i-1][w - weight[i]] + value[i])` (跳过或取第 $i$ 个元素)。

```python
def knapsack(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        for w in range(capacity + 1):
            dp[i][w] = dp[i - 1][w]  # skip item i
            if weights[i - 1] <= w:
                dp[i][w] = max(dp[i][w],
                               dp[i - 1][w - weights[i - 1]] + values[i - 1])

    return dp[n][capacity]
```

- **空间优化**: 由于每一行只依赖于前一行，使用一个 1D 数组，并从右到左遍历 $w$：

```python
def knapsack_optimised(weights, values, capacity):
    dp = [0] * (capacity + 1)
    for i in range(len(weights)):
        for w in range(capacity, weights[i] - 1, -1):  # right to left!
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[capacity]
```

- **陷阱**: 在 1D 版本中从左到右遍历允许使用 $i$ 多次（无界背包）。从右到左确保每个元素最多使用一次。

---

## 模式：回溯

- **回溯** 是 exhaustive search 通过剪枝进行的。逐步构建解决方案，一旦部分解不可能导致有效的完整解，则放弃（回溯）。

- **模板**:

```python
def backtrack(candidates, path, result):
    if is_solution(path):
        result.append(path[:])  # copy!
        return

    for candidate in get_candidates(path):
        if is_valid(candidate, path):
            path.append(candidate)     # choose
            backtrack(candidates, path, result)  # explore
            path.pop()                 # unchoose (backtrack)
```

### 中等: 子集

```python
def subsets(nums):
    result = []
    def backtrack(start, path):
        result.append(path[:])
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1, path)
            path.pop()
    backtrack(0, [])
    return result
```

### 中等: 组合求和

- **问题**: 找出所有满足目标和的唯一组合（元素可以重复）。

```python
def combination_sum(candidates, target):
    result = []
    def backtrack(start, path, remaining):
        if remaining == 0:
            result.append(path[:])
            return
        for i in range(start, len(candidates)):
            if candidates[i] > remaining:
                break  # prune: sorted, so all further candidates are too large
            path.append(candidates[i])
            backtrack(i, path, remaining - candidates[i])  # i, not i+1: reuse allowed
            path.pop()

    candidates.sort()  # sort for pruning
    backtrack(0, [], target)
    return result
```

- **陷阱**: `backtrack(i, ...)` 允许重复使用相同的元素。 `backtrack(i + 1, ...)` 会移动到下一个元素（不重复）。弄错这一点是最常见的回溯错误。

### 困难: N-皇后问题

- **问题**: 在 $n \times n$ 棋盘上放置 $n$ 皇后，使得没有两个攻击彼此。

```python
def solve_n_queens(n):
    result = []
    cols = set()
    pos_diag = set()  # (row + col) is constant on / diagonals
    neg_diag = set()  # (row - col) is constant on \ diagonals

    board = [['.' ] * n for _ in range(n)]

    def backtrack(row):
        if row == n:
            result.append([''.join(r) for r in board])
            return

        for col in range(n):
            if col in cols or (row + col) in pos_diag or (row - col) in neg_diag:
                continue

            cols.add(col)
            pos_diag.add(row + col)
            neg_diag.add(row - col)
            board[row][col] = 'Q'

            backtrack(row + 1)

            cols.remove(col)
            pos_diag.remove(row + col)
            neg_diag.remove(row - col)
            board[row][col] = '.'

    backtrack(0)
    return result
```

- **关键洞察**：对角编码。对于 `/` 对角线，`row + col` 是常数。对于 `\` 对角线，`row - col` 是常数。使用集合进行列和对角线跟踪可以简化验证过程 $O(1)$.

---

## 共同的陷阱总结

| 陷阱 | 示例 | 解决方法 |
|---------|---------|-----|
| `lo <= hi` 和 `lo < hi` 在二分查找中的区别 | 范围错误 | 根据 `hi` 是否包含边界来选择 |
| 左到右的一维背包问题 | 重复使用的物品 | 反向遍历进行 0/1 背包计算 |
| 在回溯中未复制路径 | `result.append(path)` — 所有条目都指向同一个列表 | 使用 `result.append(path[:])` 或 `path.copy()` |
| `backtrack(i)` 和 `backtrack(i+1)` 的区别 | 重复使用 vs 不重复使用元素 | 根据问题陈述进行匹配 |
| 在排序回溯中遗漏 `break` | 探索超出剩余候选的候选人 | 对于有序回溯，先排序再在候选超过剩余时停止 |
| 动态规划初始值 | `dp[0]` 错误 → 所有后续值错误 | 仔细定义基础情况 |
| 贪心算法没有证明 | 贪心不一定总是有效 | 验证贪心选择的性质 |
| 多键排序中的不稳定排序 | 相同元素的相对顺序丢失 | 使用稳定排序（如归并排序，Python 的 `sorted`） |

---

## 做题清单 (NeetCode)

### 二分查找
- [二分查找](https://neetcode.io/problems/binary-search) — 标准模板
- [在二维矩阵中搜索](https://neetcode.io/problems/search-2d-matrix) — 在扁平化后的矩阵上进行二分查找
- [香蕉吃掉问题](https://neetcode.io/problems/eating-bananas) — 根据答案进行二分查找
- [在旋转排序数组中搜索](https://neetcode.io/problems/find-target-in-rotated-sorted-array) — 确定有序的那一半
- [在旋转排序数组中找到最小值](https://neetcode.io/problems/find-minimum-in-rotated-sorted-array) — 使用二分查找寻找拐点
- [两个已排序数组的中位数](https://neetcode.io/problems/median-of-two-sorted-arrays) — 基于分区的二分查找

### 贪心算法
- [跳跃游戏](https://neetcode.io/problems/jump-game) — 记录最大可达距离
- [跳跃游戏 II](https://neetcode.io/problems/jump-game-ii) — BFS-style按层追踪
- [合并区间](https://neetcode.io/problems/merge-intervals) — 排序 + 合并
- [插入区间](https://neetcode.io/problems/insert-new-interval) — 找到重叠区域
- [非重叠区间](https://neetcode.io/problems/non-overlapping-intervals) — 按结束时间排序

### 动态规划
- [爬楼梯](https://neetcode.io/problems/climbing-stairs) — 斐波那契动态规划
- [打家劫舍](https://neetcode.io/problems/house-robber) — 取或不取动态规划
- [打家劫舍 II](https://neetcode.io/problems/house-robber-ii) — 循环：两次运行
- [硬币兑换](https://neetcode.io/problems/coin-change) — 无限背包问题
- [最长公共子序列](https://neetcode.io/problems/longest-common-subsequence) — 在两个字符串上使用二维动态规划
- [单词拆分](https://neetcode.io/problems/word-break) — 使用集合查找的动态规划
- [最长递增子序列](https://neetcode.io/problems/longest-increasing-subsequence) — $O(n^2)$ 动态规划或 $O(n \log n)$ 与二分查找结合
- [编辑距离](https://neetcode.io/problems/edit-distance) — 经典二维动态规划
- [分割等和子集](https://neetcode.io/problems/partition-equal-subset-sum) — 0/1背包变体

### 回溯
- [子集](https://neetcode.io/problems/subsets) — 枚举所有子集
- [组合总和](https://neetcode.io/problems/combination-target-sum) — 回溯时允许重复使用
- [全排列](https://neetcode.io/problems/permutations) — 使用已使用的集合进行回溯
- [子集 II](https://neetcode.io/problems/subsets-ii) — 跳过重复项
- [单词搜索](https://neetcode.io/problems/search-for-word) — 检索网格回溯
- [回文分割](https://neetcode.io/problems/palindrome-partitioning) — 回溯 + 回文检查
- [N皇后问题](https://neetcode.io/problems/n-queens) — 约束传播
