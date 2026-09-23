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

*本篇从归并排序、快速排序和计数排序出发，连接二分搜索、贪心、动态规划和回溯，强调如何设计、证明并分析可扩展的算法。*



* 吸取和搜索是最根本的算法操作. 此文件涵盖排序算法, 二进制搜索模式, 分割和征服, 贪婪的算法, 动态编程, 以及回溯跟踪 *

- 每个数据结构都能实现算法,每个算法都依赖于数据结构. 此文件涵盖**设计范式**:解决问题的高层次策略. 一旦你意识到适用哪种模式,就自然地执行。

## 排序算法



- 排序是计算机科学中被研究得最多的问题. 了解算法可以建立直觉,用于再现,分而复之,以及复杂性分析.

|Algorithm|Best|Average|Worst|Space|Stable?|
|-----------|------|---------|-------|-------|---------|
|Bubble sort|$O(n)$|$O(n^2)$|$O(n^2)$|$O(1)$|Yes|
|Insertion sort|$O(n)$|$O(n^2)$|$O(n^2)$|$O(1)$|Yes|
|Merge sort|$O(n \log n)$|$O(n \log n)$|$O(n \log n)$|$O(n)$|Yes|
|Quick sort|$O(n \log n)$|$O(n \log n)$|$O(n^2)$|$O(\log n)$|No|
|Heap sort|$O(n \log n)$|$O(n \log n)$|$O(n \log n)$|$O(1)$|No|
|Counting sort|$O(n + k)$|$O(n + k)$|$O(n + k)$|$O(k)$|Yes|
|Radix sort|$O(d(n + k))$|$O(d(n + k))$|$O(d(n + k))$|$O(n + k)$|Yes|

- ** 稳定** 是指平等要素保持相对秩序。这在按多键排序时很重要。

- 用于比较排序的**下限**是$\Omega(n \log n)$。。。证明书使用决策树(第13章):任何比较都必须区分所有$n!$排列,至少需要$\log_2(n!) = \Omega(n \log n)$比较。计算排序和光度排序通过不比较元素来击败它。

### 归并排序



- 将数组分为一半,逐一排序,然后合并排序的分数。$O(n \log n)$总是$O(n)$额外空间。

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

- ** 费用**:使用`<`改为`<=`在合并中断裂稳定(从右半部分到左半部分的等分元素)。

### 快速排序



- 选择一个**pivot **,分区元素为"小于pivot"和"大于pivot",相继排序每个分区.$O(n \log n)$平均数$O(n^2)$最坏的情况(当枢轴始终是最小或最大的元素时).

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

- ** 关键战略**:最后一项(简单、不利于排序输入),随机(预期)$O(n \log n)$),中位数为3(实际选择. 总是喜欢在采访中随机地取向,以避免最坏情况的讨论.

- ** 降级**:速战速决$O(n^2)$最坏的情况发生在具有第一/最后枢轴的已排序数组上。在实践中,随机的支点或中位数消除了这一点.

### 计数排序



- 当值是已知范围的整数时$[0, k)$,计数出错并重建:$O(n + k)$时间。不是比较的,所以它可以击倒$O(n \log n)$.

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

- ** 何时使用**:范围$k$大小不大于$n$。。。若为$k = O(n)$这是$O(n)$。。。若为$k \gg n$(例如,在范围中排序10个数字)$[0, 10^9]$),计数分类废物记忆.

---

## 模式：二分搜索



- 二进制搜索在排序数组中找到目标$O(\log n)$通过反复将搜索空间减半。但二进制搜索远不止于"在一个排序的阵列中找到一个数字". 一般规律为:**在单调条件下进行搜索**.

- ** Template**(即避免一个错误):

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

- ** 下限**(第一要素)$\geq$目标 :

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

- ** 意外**:`lo <= hi`财务报告和已审计财务报表`lo < hi`中间`hi = mid`财务报告和已审计财务报表`hi = mid - 1`,确定是否找到准确的匹配方或边界。用2-元素阵列来绘制出来以验证.

### 简单：二分搜索



- 标准问题. 使用上面的模板。

### 中等：搜索旋转排序数组



- ** problem**:一个排序的阵列会在某些中枢旋转. 找到目标

- ** Pattern**:每一步,总要分出一半. 确定哪一半是排序的,并检查目标是否位于那一半.

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

- ** 伤亡**:`<=`内`nums[lo] <= nums[mid]`(无)`<`这一点至关重要。何时`lo == mid`(2个元素还剩),我们必须正确识别被排序的一半.

### 困难：两个有序数组的中位数



- ** 问题**:在$O(\log(m + n))$.

- ** Pattern**:在较小数组的分区点上进行二进制搜索. 分区分隔两个数组,使左边的所有元素都比右边的所有元素都小.

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

- 这是最难的二进制搜索问题之一. 关键的观点是,你不是在寻找一个值,而是寻找满足条件的**分点。

### 元模式：对答案二分



- 许多看起来不像二进制搜索的问题可以通过在答案上进行二进制搜索来解决. 如果答案是数字, 您可以写一个函数`is_feasible(x)`这是单调的(对所有人都是真理)$x \geq$最佳,或对所有人无效$x \geq$),然后二进制搜索结束$x$.

- ** 实例**: "船舶在下列情况下交付所有包裹的最低能力是什么?$d$日子吗?" 二进制搜索容量. 对于每个候选能力,贪婪地检查所有软件包能否交付$d$几天时间

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



- 一种**greedy**算法使每个步骤都在当地做出最佳选择,希望这会导致全球最佳解决方案. 当问题有**greedy选择属性**(当地最佳导致全球最佳)和**最佳次结构**(最佳解决方案包含子问题的最佳解决方案)时,贪婪就起作用了.

### 中等：跳跃游戏



- ** 问题**:给定一个阵列`nums[i]`是位置上的最大跳转长度$i$,确定能否达到最后一个索引。

```python
def can_jump(nums):
    max_reach = 0
    for i, jump in enumerate(nums):
        if i > max_reach:
            return False  # cannot reach this position
        max_reach = max(max_reach, i + jump)
    return True
```

- ** 为什么贪婪起作用**:我们只需要知道最能达到的位置。如果目前的位置无法到达最远的地方,我们就会被困住。否则,我们将更新最远的距离。

### 中等：合并区间



- ** 问题**:合并重叠间隔。

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

- ** Pattern**:按开始时间排序,然后贪婪地合并. 如果当前间隔与上次合并的间隔相重叠,请扩展. 否则,开始一个新的合并间隔.

- ** 费用**:使用`merged[-1][1] = end`改为`merged[-1][1] = max(merged[-1][1], end)`。。。一个间隔可以完全控制在另一个间隔之内(例如[1,10]和[2,5]).

---

## 模式：动态规划



- ** Dynamic programm (DP)** 解决问题的方法是将它们分解成相重叠的子问题,一次解决每个子问题,并存储结果. 当一个问题有**最佳的子结构**和**重叠子问题**时,它就起作用了。

- ** 两种办法**:
    - **Top-down(memoisation)**:写出自然递归的解决方案,再将缓存结果写入词典.
    - ** Bottom-up (tapulation)**:从最小的子问题上建出一个表格.

- ** 如何确定DP**:问题要求进行最佳(min/max)、计数或存在,目前的决定取决于以前的决定。如果您绘制了递归树并看到重复的子问题,它就是DP.

### 简单：爬楼梯



- ** 问题**:$n$步道,一次可以爬一或两. 有多少不同的方法?

- 这是菲博纳奇:$f(n) = f(n-1) + f(n-2)$.

```python
def climb_stairs(n):
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b
```

- $O(n)$时间$O(1)$空间。完全的回忆表是不需要的,因为每个州只取决于前两个州.

### 中等：零钱兑换



- ** 问题**:给定的硬币面额和指标金额,寻找所需的最低硬币数量。

- ** 国家**:`dp[amount]`= 制作的最小硬币`amount`.
- ** 过渡**:`dp[amount] = min(dp[amount - coin] + 1)`每枚硬币。
- ** 基准案例**:`dp[0] = 0`.

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

- ** 降价**:以`float('inf')`(不是0或1个). 最小比较只有在无法到达状态无穷的情况下才有效.

### 中等：最长公共子序列



- ** problem**:给出了两个字符串,找到它们最长的普通子序列的长度.

- ** 国家**:`dp[i][j]`= 半数致死率`text1[:i]`财务报告和已审计财务报表`text2[:j]`.
- ** 过渡**:如果`text1[i-1] == text2[j-1]`,则`dp[i][j] = dp[i-1][j-1] + 1`。。。否则`dp[i][j] = max(dp[i-1][j], dp[i][j-1])`.

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

### 困难：0/1 背包



- ** 问题**:有加权值和容量的给定项目$W$,将总值最大化,但不超过$W$.

- ** 国家**:`dp[i][w]`= 使用第一个最大值$i$具有能力的物项$w$.
- ** 过渡**:`dp[i][w] = max(dp[i-1][w], dp[i-1][w - weight[i]] + value[i])`(跳动或取走物品)$i$).

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

- ** 空间优化**:由于每行仅取决于上行,因此使用1D阵列并进行直取$w$从右到左:

```python
def knapsack_optimised(weights, values, capacity):
    dp = [0] * (capacity + 1)
    for i in range(len(weights)):
        for w in range(capacity, weights[i] - 1, -1):  # right to left!
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[capacity]
```

- ** Pitfall**: 1D 版本中左向右移动允许使用项目$i$多次(无限制 knapsack)。左起右起确保每个项目最多使用一次。

---

## 模式：回溯



- ** 追踪** 是详尽无遗的搜索,并进行搜索。逐步建立解决方案,一旦部分解决方案不能导致有效的完整解决方案,就立即放弃(后退).

- ** 专题**:

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



- ** problem**:找到所有与目标相和的独特组合(元素可以被再用).

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

- ** 意外**:`backtrack(i, ...)`允许重用同一元素。`backtrack(i + 1, ...)`将移动到下一个元素(不重复使用)。弄错了是最常见的回溯错误.

### 困难：N 皇后



- ** 问题**:地点$n$皇后们在$n \times n$登上这样,没有两人互相攻击。

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

- **关键见解**:对角编码. 用于`/`双向`row + col`是常数。用于`\`双向`row - col`是常数。使用列和对角跟踪的套件进行有效性检查$O(1)$.

---

## 常见陷阱总结



|Pitfall|Example|Fix|
|---------|---------|-----|
|`lo <= hi` vs `lo < hi` in binary search|Off-by-one in bounds|Choose based on whether `hi` is inclusive or exclusive|
|Left-to-right 1D knapsack|Items used multiple times|Iterate right-to-left for 0/1 knapsack|
|Not copying path in backtracking|`result.append(path)` ， all entries point to same list|`result.append(path[:])` or `path.copy()`|
|`backtrack(i)` vs `backtrack(i+1)`|Reuse vs no-reuse of elements|Match the problem statement|
|Missing `break` in sorted backtracking|Exploring candidates that are too large|Sort + break when candidate exceeds remaining|
|DP initialisation|`dp[0]` wrong → all subsequent values wrong|Carefully define the base case|
|Greedy without proof|Greedy does not always work|Verify greedy choice property|
|Unstable sort for multi-key|Relative order of equal elements lost|Use stable sort (merge sort, Python's `sorted`)|

---

## 课后题（NeetCode）



### 二分搜索


- [二进制搜索](https://neetcode.io/problems/binary-search)，，标准模板
- [搜索 2D 矩阵](https://neetcode.io/problems/search-2d-matrix)平整矩阵上的二进制搜索
- [克子吃香蕉吗?](https://neetcode.io/problems/eating-bananas)，，答题二进制搜索
- [在旋转排序的矩阵中搜索](https://neetcode.io/problems/find-target-in-rotated-sorted-array)- 确定分类的一半
- [在旋转排序的阵列中查找最小值](https://neetcode.io/problems/find-minimum-in-rotated-sorted-array)，，二进制搜索插图
- [两个排序的阵列的中间](https://neetcode.io/problems/median-of-two-sorted-arrays)，，基于分区的二进制搜索

### 贪心


- [跳跃游戏](https://neetcode.io/problems/jump-game)，，最大音轨
- [跳跃游戏 二](https://neetcode.io/problems/jump-game-ii)，，BFS型级别跟踪.
- [合并间隔](https://neetcode.io/problems/merge-intervals)，，排序+合并
- [插入间隔](https://neetcode.io/problems/insert-new-interval)- 找到重叠区域
- [互不重叠](https://neetcode.io/problems/non-overlapping-intervals)- 按结束时间排序

### 动态规划


- [攀登楼梯](https://neetcode.io/problems/climbing-stairs)- Fibonacci DP
- [抢劫犯](https://neetcode.io/problems/house-robber)-接
- [抢劫犯二世](https://neetcode.io/problems/house-robber-ii)，，循环:跑两次.
- [硬币变化](https://neetcode.io/problems/coin-change)，，无约束背包.
- [最长的常见子序列](https://neetcode.io/problems/longest-common-subsequence)- 2D DP 两弦
- [词断](https://neetcode.io/problems/word-break)- DP 设置搜索
- [最长的递增次序](https://neetcode.io/problems/longest-increasing-subsequence) ， $O(n^2)$DP 或 单数$O(n \log n)$二进制搜索
- [编辑距离](https://neetcode.io/problems/edit-distance)经典 二维DP
- [分区等分集和](https://neetcode.io/problems/partition-equal-subset-sum)- 0/1 knapsack 变体

### 回溯


- [子集](https://neetcode.io/problems/subsets)，，列出所有子集
- [组合和](https://neetcode.io/problems/combination-target-sum)，，可再利用的回路
- [周期](https://neetcode.io/problems/permutations)，，带有已使用集的后轨
- [子集二](https://neetcode.io/problems/subsets-ii)，，跳过重复
- [文字搜索](https://neetcode.io/problems/search-for-word)，，网格回溯跟踪
- [Palindrome 分区](https://neetcode.io/problems/palindrome-partitioning)，，后轨+帕林德罗姆检查
- [N -皇后区](https://neetcode.io/problems/n-queens)- 限制传播
