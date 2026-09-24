---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 14 - data structures and algorithms/01. arrays and hashing.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: a0818754720126d64670fcef9185dae7aa9306ea2f43c9f3be3282ebc4947963
status: reviewed
---
# 数组和哈希表

*数组和哈希表是编程中最基本的数据结构。本文件介绍了它们的底层工作原理，然后通过逐步增加难度的问题解决模式来构建关键问题解决方法：双指针、滑动窗口、前缀和以及基于哈希的查找，其中每个步骤都包含常见的陷阱。*

- 如果你对数组和哈希表有深刻的理解，你可以解决大约40%的所有编程面试问题。这两个结构无处不在，因为它们提供了算法最需要的两个特性：**快速索引访问**（数组）和**快速按键查找**（哈希表）。

- 本文件教授模式，而不是解决方案。目标是当你看到一个新的问题时，能够识别出应用了哪种模式以及为什么，而不是试图回忆一个已记住的解决方案。

## 数组

- **数组**是一个连续的内存块，其中元素按固定间隔存储。访问元素$i$的成本是$O(1)$，因为地址只是`base + i * element_size`。这是最快的可能数据访问方式，这就是为什么数组是默认选择。

- 动态数组（Python的`list`，Java的`ArrayList`，C++的`vector`）在满时会自动增长。策略是**摊销加倍**：当数组满时，分配一个双倍大小的新数组，并将所有内容复制过去。复制操作的成本为$O(n)$，但这种情况发生得非常少（每次$n$插入），因此每项插入的平均成本为$O(1)$。

- **缓存局部性** 是数组在实践中比理论更快的原因。因为元素存储是连续的，访问一个元素会将附近的元素加载到 CPU 缓存中（第 13 章）。遍历数组是缓存友好的；通过链表中的指针访问不是。这种常数倍的差异在实践中可以达到 10-100 倍。

| 操作 | 数组 | 动态数组 |
|-----------|-------|---------------|
| 通过索引访问 | $O(1)$ | $O(1)$ |
| 追加 | n/a | $O(1)$ 平均时间复杂度 |
| 在位置 $i$ 插入 $O(n)$ | $O(n)$ |
| 删除位置 $i$ 的 $O(n)$ | $O(n)$ |
| 搜索（未排序） | $O(n)$ | $O(n)$

- **陷阱**：在数组中插入或删除中间元素是 $O(n)$，因为所有后续元素都需要移动。如果你需要频繁的中间插入，考虑使用链表或其他完全不同的方法。

## 字符串

- 字符串是一个字符数组。在Python中，字符串是不可变的：每次拼接都会创建一个新的字符串。通过循环逐个字符构建字符串是$O(n^2)$的原因，因为每次拼接都复制了当前字符串的所有内容。

```python
# BAD: O(n^2) string concatenation
s = ""
for c in characters:
    s += c  # copies entire string each time

# GOOD: O(n) using a list then join
parts = []
for c in characters:
    parts.append(c)
s = "".join(parts)
```

- **陷阱**：在Python中，`s += c`在一个循环内部是一个最常见的性能问题。总是收集到一个列表并使用`.join()`。

- **编码**：ASCII使用7位（128个字符）。UTF-8是可变长度的：ASCII字符使用1字节，带重音符号的字符使用2字节，中文/日文字符使用3字节，emoji使用4字节。当问题说“小写英文字母”时，字母集大小为26，因此可以使用固定大小数组而不是哈希表。

## 哈希表

- 一个 **哈希表** 将键映射到值，平均情况下查找、插入和删除操作的时间复杂度为 $O(1)$。它通过计算一个 **哈希函数** $h(key)$ 将键转换为数组索引来工作。

- 哈希函数必须是：**确定性**（相同密钥总是给出相同的哈希值），**均匀**（将键分布均匀地分布在桶中），并且**快速**计算。

- **碰撞**发生在两个不同密钥哈希到同一个索引时。两种主要策略：

    - **链式存储**：每个桶中存储一个键值对的链表。在碰撞时，将新元素附加到列表中。最坏情况（所有键都哈希到同一个桶）：$O(n)$。平均情况下，使用良好的哈希函数：$O(1)$。

    - **开地址法**：在碰撞时，查找下一个空槽。**线性探测**检查下一个槽，然后是下一个，等等。它在缓存友好方面表现良好，但会遭受**聚集**（长的连续已占用槽）。**罗宾 Hood哈希**通过将靠近家的条目“驱逐”来减少方差。

- 负载因子 $\alpha = n / m$ （项目/桶）决定了性能。当 $\alpha$ 超过阈值（通常为0.75），表格会**重新哈希**：分配更大的表并重新插入所有元素。这需要 $O(n)$ 但这种情况很少发生。

- **哈希表**（在Python中为`dict`，在Java中为`HashMap`）存储键值对。**哈希集**（在Python中为`set`，在Java中为`HashSet`）仅存储键（用于快速成员测试）。

| 操作 | 平均时间复杂度 | 最坏情况时间复杂度 |
|-----------|---------|------------|
| 查找 | $O(1)$ | $O(n)$ |
| 插入 | $O(1)$ | $O(n)$ |
| 删除 | $O(1)$ | $O(n)$ |

- **布隆过滤器** 是空间效率的概率集合。它们可以告诉你“肯定不在集合中”或“大概在集合中”（可调的假阳性率）。它们使用 $k$ 哈希函数和一个位数组。用于数据库（避免对不存在键进行磁盘读取），网页缓存，以及拼写检查器。

- 何时使用哈希表：当你需要回答“我见过这个吗？”或“与该键关联的计数/索引/值是什么？”时。 $O(1)$如果你在进行重复的线性扫描以寻找某物，哈希表几乎肯定会更快。

---

## 模式：哈希表查找

- 最基本的模式：使用哈希表将 $O(n)$ 扫描替换为 $O(1)$ 查找。

### 简单：两数之和

- **问题**：给定一个整数数组和一个目标值，返回两个数字的索引，它们的和等于目标值。

- **暴力破解** $O(n^2)$：检查每一对。

- **模式洞察**：对于每个数字 `num`，你需要 `target - num` 存在于数组中。而不是扫描数组来找到它，将之前看到的数字存储在哈希表中。

```python
def two_sum(nums, target):
    seen = {}  # value -> index
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
```

- **为什么有效**：一次遍历数组。对于每个元素，哈希表查找操作是 $O(1)$。总时间复杂度为 $O(n)$，空间复杂度为 $O(n)$。

- **陷阱**：在检查补数之前不要将当前数字添加到哈希表中，否则可能会匹配到自身。上述代码的顺序是正确的：先检查，然后插入。

### 中等：同义词组

- **问题**：给定一组字符串，将同义词分组在一起。例如，("eat", "tea", "ate") 是一个组。

- **模式洞察**：同义词由相同的字符组成，但顺序不同。如果对每个字符串进行排序，同义词会产生相同的排序键。使用该排序键作为哈希表的键。

```python
from collections import defaultdict

def group_anagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        key = tuple(sorted(s))  # or use character count tuple
        groups[key].append(s)
    return list(groups.values())
```

- **优化**：对每个字符串排序的成本为 $O(k \log k)$，其中 $k$ 是字符串的长度。为了更快地键值，统计字符频率并使用计数元组作为键：

```python
def group_anagrams_fast(strs):
    groups = defaultdict(list)
    for s in strs:
        count = [0] * 26
        for c in s:
            count[ord(c) - ord('a')] += 1
        groups[tuple(count)].append(s)
    return list(groups.values())
```

- 这个字符串的长度是 $O(k)$，而不是 $O(k \log k)$。字符计数元组是一个 **标准形式**：一个表示该组中所有成员相同的形式。

- **陷阱**：在Python中，列表不是可哈希的（不能作为字典键）。必须将其转换为元组。这会令人们在尝试`groups[count].append(s)`时感到困惑。

### 难：最长连续序列

- **问题**: 给定一个未排序的数组，找到最长连续序列的长度（例如，[100, 4, 200, 1, 3, 2] → 4，因为 [1, 2, 3, 4]）。

- **暴力法** $O(n \log n)$：对数组进行排序，然后扫描连续段落。

- **模式洞察** 将所有数字放入哈希集合中进行 $O(1)$ 查找。对于每个数字，检查它是否是序列的开始（即 `num - 1` 不在集合中）。如果是，则计算该序列扩展多远。

```python
def longest_consecutive(nums):
    num_set = set(nums)
    best = 0

    for num in num_set:
        # only start counting from the beginning of a sequence
        if num - 1 not in num_set:
            length = 1
            while num + length in num_set:
                length += 1
            best = max(best, length)

    return best
```

- **为什么 $O(n)$**: 内部的 `while` 循环最多在所有迭代中运行 $n$ 次（每个数字最多被访问两次：一次在外部循环中，一次在 `while` 扩展中）。 `if num - 1 not in num_set` 条件确保我们只从序列的开始位置开始计数。

- **陷阱**: 如果没有 `if num - 1 not in num_set` 检查，你会从每个元素开始计数，使其在最坏情况下为 $O(n^2)$（例如，[1, 2, 3, ..., n] 将扫描整个序列从每个起始点）。

---

## 模式：双指针

- **双指针**模式使用两个索引，它们在数组中移动，通常从相反的两端或从同一个端点以不同的速度移动。它适用于已排序的数组或需要比较对子的情况。

- **何时使用**：问题涉及对偶、子数组或分区，且数组是排序的（或在不失去所需信息的情况下可以排序）。

### 简单：有效的回文

- **问题**：确定一个字符串是否为回文，考虑仅包含字母数字字符，并忽略大小写。

- **模式**：一个指针从开始到结束，另一个从末尾向内移动。比较字符。

```python
def is_palindrome(s):
    left, right = 0, len(s) - 1

    while left < right:
        # skip non-alphanumeric characters
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1

        if s[left].lower() != s[right].lower():
            return False

        left += 1
        right -= 1

    return True
```

- **陷阱**: 忘记在内层 while 循环中添加 `left < right` 检查。如果没有它，指针可能会超出字符串 "!!!"（全是非字母数字字符）的范围。

### 中等: 三数之和

- **问题**: 在数组中找到所有和为零的唯一三元组。

- **模式**: 对数组进行排序。固定一个元素，然后在剩余部分使用两个指针来寻找与固定元素负数相加的对。

```python
def three_sum(nums):
    nums.sort()
    result = []

    for i in range(len(nums) - 2):
        # skip duplicate fixed elements
        if i > 0 and nums[i] == nums[i - 1]:
            continue

        left, right = i + 1, len(nums) - 1
        target = -nums[i]

        while left < right:
            total = nums[left] + nums[right]
            if total < target:
                left += 1
            elif total > target:
                right -= 1
            else:
                result.append([nums[i], nums[left], nums[right]])
                # skip duplicates
                while left < right and nums[left] == nums[left + 1]:
                    left += 1
                while left < right and nums[right] == nums[right - 1]:
                    right -= 1
                left += 1
                right -= 1

    return result
```

- **为什么这有效**: 排序是 $O(n \log n)$。对于每个固定的元素，双指针扫描是 $O(n)$。总的时间复杂度为 $O(n^2)$，这是解决这个问题的最佳方法（必须考虑所有可能的对）。

- **陷阱**：处理重复项是最困难的部分。如果没有跳过重复逻辑（对于固定元素和双指针结果），你将返回重复的三元组。`if i > 0 and nums[i] == nums[i-1]: continue`行至关重要。

### 难：接雨水

- **问题**: 给定一个海拔地图（非负整数数组），计算它在雨后能容纳多少水。

- **模式洞察**：对于每个位置，水位由其左侧和右侧最大高度的最小值减去当前高度决定。从两端使用两个指针跟踪这些运行的最大值。

```python
def trap(height):
    left, right = 0, len(height) - 1
    left_max, right_max = 0, 0
    water = 0

    while left < right:
        if height[left] < height[right]:
            if height[left] >= left_max:
                left_max = height[left]
            else:
                water += left_max - height[left]
            left += 1
        else:
            if height[right] >= right_max:
                right_max = height[right]
            else:
                water += right_max - height[right]
            right -= 1

    return water
```

- **为什么这有效**：关键洞察是如果 `height[left] < height[right]`，位置 `left` 的水被 `left_max`（我们知道右侧有更高的柱子，所以右侧不会成为瓶颈）所限制。我们处理较短的一边，保证另一边有更高的柱子。

- **陷阱**: 许多人尝试先预计算 `left_max[i]` 和 `right_max[i]` 数组（这工作但使用了 $O(n)$ 空间）。双指针方法可以实现 $O(1)$ 空间。另外，混淆 `>=` 和 `>` 在最大更新时也会导致 off-by-one 水计算错误。

---

## 模式: 滑动窗口

- **滑动窗口**模式维护一个窗口（连续子数组），它在迭代时不断扩展和收缩。它适用于要求满足某些条件的子数组或子字符串的问题。

- **何时使用**: 问题要求找到最长/最短满足约束的子数组或子字符串，且窗口的扩展和收缩是单调的（添加元素只会使约束变得更难满足，不会同时更难和更容易满足）。

- **模板**:

```python
def sliding_window(arr):
    left = 0
    state = ...  # window state (counts, sum, etc.)
    best = ...

    for right in range(len(arr)):
        # expand: add arr[right] to the window state
        update_state(state, arr[right])

        # contract: shrink from the left while constraint is violated
        while constraint_violated(state):
            remove_from_state(state, arr[left])
            left += 1

        # update answer
        best = max(best, right - left + 1)  # or min, depending on problem

    return best
```

### 简单: 最佳买卖股票时机

- **问题**: 给定每日价格，找到一次买入和一次卖出的最大利润（买入在卖出之前）。

- **模式**: 跟踪到目前为止看到的最小价格（窗口的左边界）并在每一天计算利润。

```python
def max_profit(prices):
    min_price = float('inf')
    max_profit = 0

    for price in prices:
        min_price = min(min_price, price)
        max_profit = max(max_profit, price - min_price)

    return max_profit
```

- 这是一个退化滑动窗口：左指针（最小价格）只有在找到新最小值时才会向前移动。 $O(n)$ 时间， $O(1)$ 空间。

### 中等：无重复字符的最长子串

- **问题**：找到没有重复字符的最长子字符串。

- **模式**：通过移动 `right` 来扩大窗口。当发现重复项时，从左边收缩直到删除重复项。

```python
def length_of_longest_substring(s):
    char_index = {}  # character -> its most recent index
    left = 0
    best = 0

    for right, char in enumerate(s):
        if char in char_index and char_index[char] >= left:
            left = char_index[char] + 1  # jump past the duplicate

        char_index[char] = right
        best = max(best, right - left + 1)

    return best
```

- **为什么 `char_index[char] >= left`**：这个字符可能在当前窗口开始之前存在于地图中。如果没有这个检查，你会错误地缩小窗口，因为一个不在当前窗口中的字符会被误认为是存在的。

- **陷阱**: 使用集合并逐个从左向右移除字符是正确的，但速度较慢。哈希表方法直接跳到右侧位置。

### 困难：最小窗口子串

- **问题**: 给定字符串 `s` 和 `t`，找到在 `s` 中包含所有 `t` 字符的最小窗口。

- **模式**: 扩展窗口以包括所有必需字符，然后从左向右收缩以找到最小有效窗口。

```python
from collections import Counter

def min_window(s, t):
    if not t or not s:
        return ""

    need = Counter(t)       # characters we need and their counts
    have = 0                # how many unique characters we have in sufficient quantity
    required = len(need)    # how many unique characters we need

    left = 0
    best = (float('inf'), 0, 0)  # (length, left, right)

    window_counts = {}

    for right in range(len(s)):
        char = s[right]
        window_counts[char] = window_counts.get(char, 0) + 1

        # check if this character's count now meets the requirement
        if char in need and window_counts[char] == need[char]:
            have += 1

        # contract from the left while the window is valid
        while have == required:
            # update best
            if (right - left + 1) < best[0]:
                best = (right - left + 1, left, right)

            # remove leftmost character
            left_char = s[left]
            window_counts[left_char] -= 1
            if left_char in need and window_counts[left_char] < need[left_char]:
                have -= 1
            left += 1

    length, start, end = best
    return s[start:end + 1] if length != float('inf') else ""
```

- **陷阱**: `have` 计数器是关键的优化。如果没有它，你将在每次步骤中需要比较整个 `window_counts` 字典与 `need`，这将是 $O(|\text{unique chars}|)$ 次操作。 `have` 计数器使有效性检查 $O(1)$。

- **陷阱**：检查 `window_counts[char] == need[char]`（而不是 `>=`）可以确保我们每次只递增 `have` 一次。如果使用 `>=`，我们会多计一次。

---

## 模式：前缀和

- **前缀和数组**存储累积和：`prefix[i] = sum(arr[0:i])`。一旦在 $O(n)$ 中构建，任何子数组的和都可以在 $O(1)$ 中计算：`sum(arr[l:r]) = prefix[r] - prefix[l]`。

```python
def build_prefix(arr):
    prefix = [0] * (len(arr) + 1)
    for i in range(len(arr)):
        prefix[i + 1] = prefix[i] + arr[i]
    return prefix

# sum of arr[l:r](inclusive l, exclusive r)
def range_sum(prefix, l, r):
    return prefix[r] - prefix[l]
```

- **何时使用**：问题涉及多个子数组求和查询或寻找具有特定和的子数组时。

### 简单：区间求和查询

- **问题**: 给定一个数组，回答多个查询 "从索引 $l$ 到 $r$ 的和是多少？"

- 无前缀和：每个查询是 $O(n)$。有前缀和：$O(n)$ 预处理，然后 $O(1)$ 每个查询。

### 中等: 子数组和等于 K

- **问题**: 计算具有 $k$ 和的连续子数组的数量。

- **模式洞察**：从索引 $l$ 到 $r$ 的子数组和等于 `prefix[r+1] - prefix[l]`。我们希望这个等于 $k$，所以 `prefix[l] = prefix[r+1] - k`。对于每个位置，使用哈希表计数如何早些的前缀和等于 `current_prefix - k`。

```python
def subarray_sum(nums, k):
    count = 0
    prefix = 0
    prefix_counts = {0: 1}  # empty prefix sum

    for num in nums:
        prefix += num
        # how many earlier prefix sums equal prefix - k?
        count += prefix_counts.get(prefix - k, 0)
        prefix_counts[prefix] = prefix_counts.get(prefix, 0) + 1

    return count
```

- 这将结合前缀和与哈希表查找：$O(n)$ 时间，$O(n)$ 空间。

- **陷阱**: 忘记初始化 `prefix_counts = {0: 1}`。空前缀（在任何元素之前）的和为 0。如果没有这个，你就会错过从索引 0 开始的所有子数组。

### 困难：数组中除自身外的乘积

- **问题**: 给定一个数组，返回一个数组，其中每个元素是所有其他元素的乘积。你不能使用除法。

- **模式**: 从左到右构建前缀乘积，从右到左构建后缀乘积。每个位置的答案是 `left_product * right_product`。

```python
def product_except_self(nums):
    n = len(nums)
    result = [1] * n

    # left pass: result[i] = product of nums[0..i-1]
    prefix = 1
    for i in range(n):
        result[i] = prefix
        prefix *= nums[i]

    # right pass: multiply by product of nums[i+1..n-1]
    suffix = 1
    for i in range(n - 1, -1, -1):
        result[i] *= suffix
        suffix *= nums[i]

    return result
```

- $O(n)$ 时间复杂度，$O(1)$ 额外空间（输出数组不计入）。这种方法使用了输出数组本身来存储中间前缀乘积，然后在第二步中将后缀乘积相乘。

- **陷阱**: 如果数组中包含零，基于除法的方法会失败。这个前缀/后缀方法可以正确处理零，因为它从不进行除法操作。

---

## 常见陷阱总结

| 陷阱 | 示例 | 解决方案 |
|---------|---------|-----|
| 窗口大小偏移一 | `right - left` vs `right - left + 1` | 画出一个2元素的例子 |
| Python中的可变默认值 | `def f(seen={})`在多次调用中共享状态 | 使用 `def f(seen=None)` |
| 循环中的字符串连接 | `s += c`在Python中是$O(n^2)$ | 使用 `list.append` + `"".join"` |
| 忘记前缀和 `{0: 1}` | 从索引 0 开始的子数组丢失 | 总是初始化为空前缀和 |
| 哈希表在检查之前 | 两数之和：在添加 `num` 之前检查补数 | 先检查，然后插入 |
| 不处理重复项 | 三数之和返回重复的三元组 | 跳过连续相等的值 |
| 整数溢出 | 大数组在 C++/Java 中求和 | 使用 `long` 或检查边界 |

---

## 作业题 (NeetCode)

按照顺序练习这些。每个都强化了这个文件中的模式。

### 哈希表查找
- [Contains Duplicate](https://neetcode.io/problems/contains-duplicate) — 简单的哈希集合查找
- [Two Sum](https://neetcode.io/problems/two-sum) — 快速查找
- [Group Anagrams](https://neetcode.io/problems/anagram-groups) — 使用字典序作为键
- [Top K Frequent Elements](https://neetcode.io/problems/top-k-elements-in-list) — 哈希表 + 桶排序
- [Longest Consecutive Sequence](https://neetcode.io/problems/longest-consecutive-sequence) — 使用哈希集合并利用起始点的技巧
- [Encode and decode strings](https://neetcode.io/problems/string-encode-and-decode) — 设计序列化方案

### 两个指针
- [有效的回文字符串](https://neetcode.io/problems/is-palindrome) — 向内指针
- [两数之和 II（已排序）](https://neetcode.io/problems/two-integer-sum-ii) — 已排序数组的双指针
- [三数之和](https://neetcode.io/problems/three-integer-sum) — 固定 + 双指针 + 去重
- [盛最多水的容器](https://neetcode.io/problems/max-water-container) — 贪心双指针
- [接雨水](https://neetcode.io/problems/trapping-rain-water) — 双指针与运行最大值

### 滑动窗口
- [最佳买卖股票时机](https://neetcode.io/problems/buy-and-sell-crypto) — 窗口退化
- [最长无重复字符子串](https://neetcode.io/problems/longest-substring-without-duplicates) — 扩展/收缩使用哈希表
- [最长重复字符替换](https://neetcode.io/problems/longest-repeating-substring-with-replacement) — 窗口 + 最大频率技巧
- [最小子串覆盖](https://neetcode.io/problems/minimum-window-with-characters) — 扩展直到有效，收缩以最小化

### 前缀和
- [数组中除自身外所有元素的乘积](https://neetcode.io/problems/products-of-array-discluding-self) — 前缀/后缀乘积
