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
# 排序、搜索与算法设计

*排序和搜索是最基础的算法操作。本篇介绍常见排序算法、二分查找、分治、贪心、动态规划和回溯等设计思路。*

- 数据结构为算法提供操作基础，算法则依赖数据结构。本篇介绍若干**算法设计范式**，也就是解决问题时采用的高层策略。识别适用的范式后，再根据问题条件实现算法。

## 排序算法

- 排序是计算机科学中研究充分的问题。理解常见排序算法，有助于掌握递归、分治和复杂度分析。

| 算法 | 最好情况 | 平均情况 | 最坏情况 | 空间复杂度 | 稳定？ |
| --- | --- | --- | --- | --- | --- |
| 冒泡排序 | $O(n)$* | $O(n^2)$ | $O(n^2)$ | $O(1)$ | 是 |
| 插入排序 | $O(n)$ | $O(n^2)$ | $O(n^2)$ | $O(1)$ | 是 |
| 归并排序 | $O(n \log n)$ | $O(n \log n)$ | $O(n \log n)$ | $O(n)$ | 是 |
| 快速排序 | $O(n \log n)$ | $O(n \log n)$ | $O(n^2)$ | $O(\log n)$ 平均；$O(n)$ 最坏 | 否 |
| 堆排序 | $O(n \log n)$ | $O(n \log n)$ | $O(n \log n)$ | $O(1)$ | 否 |
| 计数排序 | $O(n + k)$ | $O(n + k)$ | $O(n + k)$ | $O(n + k)$ | 可稳定实现 |
| 基数排序 | $O(d(n + k))$ | $O(d(n + k))$ | $O(d(n + k))$ | $O(n + k)$ | 可稳定实现 |

- *冒泡排序的 $O(n)$ 最好情况依赖提前终止的优化实现。快速排序的表中空间复杂度包含递归栈：分区较均衡时通常为 $O(\log n)$，最坏可达 $O(n)$。计数排序、基数排序可通过稳定的实现处理带附加信息的记录；下方计数排序代码只处理整数值，无法体现记录的稳定性。*

- **稳定排序**会保留相等元素原有的相对顺序。按多个键依次排序时，稳定性很有用。

- 基于比较的排序有渐近下界 $\Omega(n \log n)$。决策树证明（见第 13 章）指出：若有 $n$ 个互异元素，比较排序必须区分全部 $n!$ 种排列，所需比较次数至少为 $\log_2(n!) = \Omega(n \log n)$。计数排序和基数排序在键值范围受限时不依赖元素间比较，因此不受这一比较排序下界约束。

### 归并排序

- 把数组分成两半，分别递归排序，再合并两个有序部分。归并排序的时间复杂度在各种输入下都是 $O(n \log n)$，额外空间为 $O(n)$。

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

- **常见错误**：合并时若用 `<` 代替 `<=`，相等元素可能让右半部分的元素排到左半部分元素之前，破坏稳定性。

### 快速排序

- 下方代码会原地重排输入数组。

- 选择一个**基准值**，把元素分区到基准值两侧，再递归排序各分区。平均时间复杂度为 $O(n \log n)$，最坏为 $O(n^2)$，例如每次选到的基准值都是最小值或最大值时。

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

- **基准值的选择**：选最后一个元素写法简单，但有序输入可能触发最坏情况；随机选择基准值的期望时间为 $O(n \log n)$；三数取中法通常有较好的实际表现。随机选择或三数取中只能降低遇到最坏情况的风险，并不能消除 $O(n^2)$ 的最坏情况。上方代码使用 Lomuto 分区，并固定选择末尾元素。

- **常见错误**：已经有序的数组配合始终选首或末元素作基准值时，快速排序会退化到 $O(n^2)$。面试中若讨论随机基准值，应说明它改善的是期望性能，不代表最坏复杂度消失。

### 计数排序

- 若输入是取值范围已知的非负整数 $[0, k)$，可统计每个值出现的次数，再按值重建数组，时间复杂度为 $O(n + k)$。它不比较元素，因此在 $k$ 不太大时可优于 $O(n \log n)$ 的比较排序。

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

- **适用场景**：$k$ 与 $n$ 的规模相近时，计数排序可达到 $O(n)$。若 $k \gg n$，例如只排 10 个范围在 $[0, 10^9]$ 的数，计数数组会浪费大量空间。此代码创建大小为 $k$ 的计数数组和结果数组，额外空间为 $O(n+k)$。

---

## 模式：二分查找

- 在有序数组中，二分查找每次把搜索范围缩小一半，时间复杂度为 $O(\log n)$。更一般地说，二分查找模式是对**具有单调性的条件**进行搜索。

- **基本模板**（可帮助避免边界错误）：

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

- **下界**（第一个大于或等于目标值的位置）：

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

- **常见错误**：`lo <= hi` 与 `lo < hi` 的选择，以及 `hi = mid` 与 `hi = mid - 1` 的选择，会决定搜索的是精确值还是边界。可以用只有两个元素的数组手动检查。下界在目标值大于所有元素时返回数组长度。

### 简单：二分查找

- 使用上面的基本模板，在有序数组中查找目标值。

### 中等：搜索旋转排序数组

- **题目**：有序数组在某个位置经过旋转，给定目标值，返回它的索引；以下实现假设数组元素互异。

- **模式思路**：每一步至少有一半保持有序。判断哪一半有序，再检查目标值是否落在该范围内。

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

- **常见错误**：`nums[lo] <= nums[mid]` 中的 `<=` 不能随意改成 `<`。当只剩两个元素且 `lo == mid` 时，这个条件才能正确识别左半部分有序。含重复值的变体需要额外处理。

### 困难：两个有序数组的中位数

- **题目**：在 $O(\log(m+n))$ 时间内求两个有序数组的中位数。以下实现要求两个数组合并后至少有一个元素。

- **模式思路**：在较短数组上二分，寻找两个数组的分割位置，使左侧所有元素都不大于右侧所有元素。

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

- 这是一道较难的二分查找题。关键在于搜索的不是某个具体值，而是满足条件的**分割位置**。该实现实际只在较短数组上二分，时间为 $O(\log(\min(m,n)+1))$。

### 元模式：对答案进行二分查找

- 有些题目表面上不像二分查找，但可以直接对答案范围二分。若答案是数值，并且可以写出关于候选值 $x$ 的单调可行性判断 `is_feasible(x)`，就能二分搜索边界。寻找最小可行值时，通常是低于阈值不可行、高于阈值可行；寻找最大可行值时，方向相反。

- **示例**：“船的最小载重是多少，才能在 $d$ 天内运完所有包裹？”对载重二分。对每个候选载重，用贪心方法检查能否在 $d$ 天内运完。以下实现假设包裹数组非空，且天数为正整数。

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

- **贪心算法**每一步都作出当前看来最优的选择，并希望这些局部选择最终得到全局最优解。若问题具有**贪心选择性质**（局部选择可导向全局最优解）和**最优子结构**，才可能适用贪心算法；通常需要证明其正确性。

### 中等：跳跃游戏

- **题目**：给定数组，`nums[i]` 表示从位置 $i$ 最多可以向前跳几步，判断能否到达最后一个位置。以下实现假设数组非空，且跳跃长度非负。

```python
def can_jump(nums):
    max_reach = 0
    for i, jump in enumerate(nums):
        if i > max_reach:
            return False  # cannot reach this position
        max_reach = max(max_reach, i + jump)
    return True
```

- **贪心思路**：只需记录目前最远能到达的位置。若当前位置超过这个范围，就无法继续；否则用当前位置更新最远可达位置。

### 中等：合并区间

- **题目**：合并所有重叠区间。以下实现假设输入非空，区间为闭区间，并会原地排序输入列表。

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

- **模式思路**：按起点排序，再依次处理区间。当前区间若与已合并的最后一个区间重叠，就扩展其终点；否则开启一个新区间。

- **常见错误**：不能直接把最后一个终点赋值为当前区间终点。当前区间可能完全包含在前一个区间中，例如 $[1,10]$ 和 $[2,5]$；应取两个终点的最大值。

---

## 模式：动态规划

- **动态规划（DP）**把问题拆成重叠子问题，每个子问题只求解一次并保存结果。它适用于具有**最优子结构**和**重叠子问题**的问题。

- 两种常见方法：
    - **自顶向下（记忆化）**：先写递归解法，再缓存已计算的结果。
    - **自底向上（递推填表）**：从最小子问题开始逐步填表。

- **如何识别动态规划**：题目要求求最优值、计数或判断可行性，当前决策取决于之前的决策；画出递归树后能看到相同子问题反复出现时，可以考虑动态规划。

### 简单：爬楼梯

- **题目**：有 $n$ 级台阶，每次可以爬 1 级或 2 级，问有多少种不同走法。

- 递推关系与斐波那契数列相同：$f(n) = f(n-1) + f(n-2)$。

```python
def climb_stairs(n):
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b
```

- 时间复杂度为 $O(n)$，空间复杂度为 $O(1)$。每个状态只依赖前两个状态，因此不需要保存完整记忆化表。代码假设 $n \geq 0$。

### 中等：零钱兑换

- **题目**：给定硬币面额和目标金额，求凑出该金额所需的最少硬币数。以下解法假设面额为正整数、金额非负。

- **状态**：`dp[amount]` 表示凑出 `amount` 所需的最少硬币数。
- **状态转移**：对每种硬币，比较 `dp[amount - coin] + 1`，取其中最小值。
- **基础情形**：`dp[0] = 0`。

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

- **常见错误**：其他金额的初始值应为正无穷，而不是 0 或 -1。这样只有可达状态才能通过最小值比较更新。

### 中等：最长公共子序列

- **题目**：给定两个字符串，求它们的最长公共子序列长度。子序列不要求连续，但字符的相对顺序必须一致。

- **状态**：`dp[i][j]` 表示 `text1[:i]` 与 `text2[:j]` 的最长公共子序列长度。
- **状态转移**：若 `text1[i-1] == text2[j-1]`，则 `dp[i][j] = dp[i-1][j-1] + 1`；否则取 `dp[i-1][j]` 与 `dp[i][j-1]` 中的较大值。

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

- 时间复杂度为 $O(mn)$，空间复杂度为 $O(mn)$。

### 困难：0/1 背包

- **题目**：给定物品的重量和价值，以及容量 $W$，在总重量不超过 $W$ 的前提下，使总价值最大。每件物品最多选择一次。

- **状态**：`dp[i][w]` 表示只考虑前 $i$ 件物品、容量为 $w$ 时的最大价值。
- **状态转移**：在不选第 $i$ 件物品的价值 `dp[i-1][w]` 与选它的价值 `dp[i-1][w - weight[i]] + value[i]` 之间取较大值。

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

- **空间优化**：当前行只依赖上一行，因此可以用一维数组，并让容量 $w$ 从大到小更新：

```python
def knapsack_optimised(weights, values, capacity):
    dp = [0] * (capacity + 1)
    for i in range(len(weights)):
        for w in range(capacity, weights[i] - 1, -1):  # right to left!
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[capacity]
```

- **常见错误**：一维版本若从左向右更新，就可能在同一轮重复使用当前物品，变成完全背包。逆序更新可以确保每件物品至多使用一次。

---

## 模式：回溯

- **回溯**是带剪枝的穷举搜索。逐步构造解；一旦当前部分解不可能扩展成有效完整解，就撤销选择并返回。

- **通用模板**：

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

### 中等：子集

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

### 中等：组合总和

- **题目**：找出所有和为目标值的不同组合；每个候选元素可以重复使用。以下实现假设候选数互不相同且均为正整数，目标值非负。

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

- **常见错误**：递归调用使用 `backtrack(i, ...)`，因此可以重复使用当前元素；若改为 `backtrack(i + 1, ...)`，递归就会从下一个元素开始，不再重复使用。候选元素重复使用规则必须符合题意。

- 函数会原地排序 `candidates`，以便在候选值超过剩余目标时直接停止循环。

### 困难：N 皇后

- **题目**：在 $n \times n$ 棋盘上放置 $n$ 个皇后，使任意两个皇后都不能互相攻击。

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

- **关键思路**：用集合快速检查列和两类对角线是否已被占用。对 “/” 方向的对角线，`row + col` 相同；对 “\” 方向的对角线，`row - col` 相同。因此每次检查冲突的时间为 $O(1)$。

---

## 常见错误汇总

| 错误 | 示例 | 修正方法 |
| --- | --- | --- |
| 混淆 `lo <= hi` 和 `lo < hi` | 二分边界差一 | 根据右边界是否包含在区间内选择 |
| 0/1 背包的一维数组正序更新 | 同一物品被重复使用 | 从右向左更新 |
| 回溯保存路径时没有复制 | `result.append(path)` 让所有结果指向同一列表 | 使用 `result.append(path[:])` 或 `path.copy()` |
| 混淆 `backtrack(i)` 与 `backtrack(i+1)` | 是否允许重复使用候选元素 | 按题目要求选择 |
| 已排序的回溯搜索缺少提前终止 | 继续检查已超过剩余目标的候选值 | 排序后在候选值过大时 `break` |
| 动态规划初始化错误 | `dp[0]` 错误导致后续状态都错 | 明确并手算基础情形 |
| 没有证明就使用贪心 | 局部最优不一定导向全局最优 | 验证贪心选择性质 |
| 多键排序使用不稳定排序 | 相等元素的相对次序被打乱 | 使用稳定排序，如归并排序或 Python 的 `sorted` |

---

## 课后练习（NeetCode）

### 二分查找

- [Binary Search](https://neetcode.io/problems/binary-search) — 基本模板
- [Search a 2D Matrix](https://neetcode.io/problems/search-2d-matrix) — 把矩阵视为有序序列进行二分查找
- [Koko Eating Bananas](https://neetcode.io/problems/eating-bananas) — 对答案进行二分查找
- [Search in Rotated Sorted Array](https://neetcode.io/problems/find-target-in-rotated-sorted-array) — 判断哪一半有序
- [Find Minimum in Rotated Sorted Array](https://neetcode.io/problems/find-minimum-in-rotated-sorted-array) — 二分查找旋转位置
- [Median of Two Sorted Arrays](https://neetcode.io/problems/median-of-two-sorted-arrays) — 基于分割点的二分查找

### 贪心算法

- [Jump Game](https://neetcode.io/problems/jump-game) — 追踪最远可达位置
- [Jump Game II](https://neetcode.io/problems/jump-game-ii) — 类似 BFS 的逐层扩展
- [Merge Intervals](https://neetcode.io/problems/merge-intervals) — 排序后合并区间
- [Insert Interval](https://neetcode.io/problems/insert-new-interval) — 找出重叠区间
- [Non-overlapping Intervals](https://neetcode.io/problems/non-overlapping-intervals) — 按终点排序

### 动态规划

- [Climbing Stairs](https://neetcode.io/problems/climbing-stairs) — 斐波那契式动态规划
- [House Robber](https://neetcode.io/problems/house-robber) — 选或不选
- [House Robber II](https://neetcode.io/problems/house-robber-ii) — 环形数组分两次处理
- [Coin Change](https://neetcode.io/problems/coin-change) — 完全背包
- [Longest Common Subsequence](https://neetcode.io/problems/longest-common-subsequence) — 两个字符串上的二维动态规划
- [Word Break](https://neetcode.io/problems/word-break) — 动态规划加集合查找
- [Longest Increasing Subsequence](https://neetcode.io/problems/longest-increasing-subsequence) — $O(n^2)$ 动态规划，或结合二分查找达到 $O(n \log n)$
- [Edit Distance](https://neetcode.io/problems/edit-distance) — 经典二维动态规划
- [Partition Equal Subset Sum](https://neetcode.io/problems/partition-equal-subset-sum) — 0/1 背包变体

### 回溯

- [Subsets](https://neetcode.io/problems/subsets) — 枚举所有子集
- [Combination Sum](https://neetcode.io/problems/combination-target-sum) — 允许重复选取的回溯
- [Permutations](https://neetcode.io/problems/permutations) — 用已选集合进行回溯
- [Subsets II](https://neetcode.io/problems/subsets-ii) — 跳过重复子集
- [Word Search](https://neetcode.io/problems/search-for-word) — 网格回溯
- [Palindrome Partitioning](https://neetcode.io/problems/palindrome-partitioning) — 回溯加回文判断
- [N-Queens](https://neetcode.io/problems/n-queens) — 用约束检查剪枝
