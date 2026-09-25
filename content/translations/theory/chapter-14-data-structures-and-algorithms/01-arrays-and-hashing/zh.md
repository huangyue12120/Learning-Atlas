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
# 数组与哈希表

*数组和哈希表是编程中最常用的基础数据结构。本篇先介绍它们的工作原理，再通过难度递增的题目讲解双指针、滑动窗口、前缀和与哈希查找，并指出各模式常见的错误。*

- 原文估计，熟悉数组和哈希表有助于解决约 40% 的编程面试题；这个比例取决于题目范围和统计口径。这两种结构之所以常见，是因为它们分别提供算法常用的能力：**按索引快速访问**（数组）和**按键快速查找**（哈希表）。

- 本篇讲解的是解题模式，而不是让你背下具体答案。遇到新题时，目标是判断该用什么模式，以及它为什么适用。

## 数组

- **数组**是一段连续的内存，元素按固定偏移量存放。访问第 $i$ 个元素的时间为 $O(1)$，因为地址可以直接计算为 `base + i * element_size`。这种索引访问方式非常快，因此数组是常见的默认选择。

- **动态数组**（Python 的 `list`、Java 的 `ArrayList`、C++ 的 `vector`）会在容量不足时自动扩容。常见做法是**容量翻倍**：数组满时分配一个容量为原来两倍的新数组，再复制所有元素。一次复制需要 $O(n)$ 时间，但扩容并不频繁，所以每次追加的均摊时间为 $O(1)$。

- 数组的**缓存局部性**使它在实际运行中往往比单看渐近复杂度所显示的更快。元素连续存放，访问一个元素时，附近的数据也可能一并载入 CPU 缓存（见第 13 章）。顺序遍历数组通常有良好的缓存局部性；沿链表指针逐个访问则没有。原文指出，实际速度差异可能达到 10–100 倍，具体取决于硬件和访问模式。

| 操作 | 普通数组 | 动态数组 |
| --- | --- | --- |
| 按索引访问 | $O(1)$ | $O(1)$ |
| 追加 | 不适用 | $O(1)$ 均摊 |
| 在位置 $i$ 插入 | $O(n)$ | $O(n)$ |
| 删除位置 $i$ 的元素 | $O(n)$ | $O(n)$ |
| 搜索（未排序） | $O(n)$ | $O(n)$ |

- **注意**：在数组中间插入或删除元素需要移动其后的元素，因此是 $O(n)$。若经常需要在中间插入，可以考虑链表或其他数据结构。

## 字符串

- **字符串**可以看作字符序列。Python 字符串不可变，每次拼接都会创建新字符串。因此，在循环中逐个拼接字符通常需要 $O(n^2)$ 时间，因为每次拼接都要复制已有内容。

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

- **注意**：在 Python 循环中反复使用 `s += c` 是常见的性能问题。可以先把字符收集到列表中，再调用 `.join()` 拼接。

- **编码**：ASCII 使用 7 位表示 128 个字符。UTF-8 是变长编码：ASCII 范围内的字符占 1 字节，码点 U+0080–U+07FF 占 2 字节，U+0800–U+FFFF 占 3 字节，更大的码点占 4 字节。许多常见的中文字符使用 3 字节，很多 emoji 使用 4 字节；组合字符和 emoji 序列可能由多个码点组成。如果题目限定字符为小写英文字母，字符集大小为 26，可以用定长数组代替哈希表。

## 哈希表

- **哈希表**将键映射到值；在平均情况下，查找、插入和删除的时间复杂度都是 $O(1)$。它通过**哈希函数** $h(key)$ 将键转换为数组索引。

- 哈希函数应当满足：**确定性**，即同一个键每次得到相同哈希值；**均匀性**，即键值大致均匀地分布到各个桶；以及**计算快速**。

- 不同的键映射到同一索引时会发生**碰撞**。主要有两种处理方式：

    - **链式法**：每个桶保存一个键值对链表；发生碰撞时，把新元素加入链表。若所有键都映射到同一桶，最坏时间为 $O(n)$；哈希函数良好且分布均匀时，平均时间为 $O(1)$。

    - **开放寻址法**：发生碰撞时，继续探测其他空槽。**线性探测**依次检查后续槽位。这种方法缓存局部性较好，但可能出现**聚集**，也就是多个已占用槽位连成很长的区段。**Robin Hood 哈希**会调整探测距离较大的条目，以降低探测距离的差异。

- **负载因子**为 $alpha = n / m$（元素数 / 桶数），会影响哈希表性能。当负载因子超过某个阈值（常见值约为 0.75，具体取决于实现）时，哈希表会**重新哈希**：分配更大的表，并把所有元素重新插入。这个过程需要 $O(n)$ 时间，但发生频率较低。

- **哈希表**（Python 的 `dict`、Java 的 `HashMap`）保存键值对；**哈希集合**（Python 的 `set`、Java 的 `HashSet`）只保存键，常用于快速判断成员关系。

| 操作 | 平均时间 | 最坏时间 |
| --- | --- | --- |
| 查找 | $O(1)$ | $O(n)$ |
| 插入 | $O(1)$ | $O(n)$ |
| 删除 | $O(1)$ | $O(n)$ |

- **布隆过滤器**是一种节省空间的概率型集合。它可以判断某个元素“肯定不在集合中”或“可能在集合中”，并允许出现可调节概率的假阳性；标准布隆过滤器不会漏掉已插入元素。它使用 $k$ 个哈希函数和一个位数组，可用于数据库（避免为不存在的键读取磁盘）、网页缓存和拼写检查。

- **适合使用哈希表的情况**：需要判断“之前是否见过这个值”，或查询某个键对应的计数、索引、数值时。哈希表查询的 $O(1)$ 是平均复杂度，并非所有情况下的保证。若代码反复线性扫描来查找元素，哈希表通常能显著加快查询。

---

## 模式：哈希表查找

- 最基础的模式是用哈希表查找替代 $O(n)$ 扫描，使单次查找的平均复杂度降至 $O(1)$。

### 简单：Two Sum（两数之和）

- **题目**：给定整数数组和目标值，返回两个数的索引，使这两个数之和等于目标值。

- **暴力解法**：检查所有数对，时间复杂度为 $O(n^2)$。

- **模式思路**：对于每个数 `num`，要找的另一个数是 `target - num`。不必再次扫描整个数组；把此前看过的数存入哈希表即可。

```python
def two_sum(nums, target):
    seen = {}  # value -> index
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
```

- **正确性与复杂度**：数组只遍历一遍。每个元素都进行一次平均 $O(1)$ 的哈希表查询，因此时间复杂度为 $O(n)$，空间复杂度为 $O(n)$。

- **常见错误**：先把当前数加入哈希表再查询补数，可能会把当前元素与自身配对。代码先查找、再插入，顺序正确。

### 中等：分组字母异位词

- **题目**：给定一组字符串，把字母相同但顺序不同的字符串分到一组。例如 `eat`、`tea` 和 `ate` 属于同一组。

- **模式思路**：字母异位词排序后会得到相同序列，因此可以把每个字符串排序后的结果作为哈希表键。

```python
from collections import defaultdict

def group_anagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        key = tuple(sorted(s))  # or use character count tuple
        groups[key].append(s)
    return list(groups.values())
```

- **优化**：长度为 $k$ 的字符串排序需要 $O(k \log k)$ 时间。若字符串只包含小写英文字母，可以统计 26 个字母各自出现的次数，并用计数元组作为键：

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

- 这样每个字符串需要 $O(k)$ 时间（字符集大小固定为 26）。计数元组是**规范表示**：同一组中的字符串会得到相同的表示。

- **常见错误**：Python 列表不可哈希，不能作为字典键，必须转换成元组。若直接写 `groups[count].append(s)`，会因为 `count` 是列表而报错。

### 困难：最长连续序列

- **题目**：给定未排序数组，求最长连续整数序列的长度。例如 `[100, 4, 200, 1, 3, 2]` 的答案是 4，因为其中包含 `[1, 2, 3, 4]`。

- **暴力解法**：先排序，再扫描连续区间，时间复杂度为 $O(n \log n)$。

- **模式思路**：先把数字放入哈希集合，以平均 $O(1)$ 的时间查找。对于每个数，先判断它是否是一段连续序列的起点，也就是集合中不存在 `num - 1`。只有起点才向后统计序列长度。

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

- **为什么是 $O(n)$**：外层遍历每个不同数字一次；每段连续序列只会从起点向后扩展一次，因此内层循环总共检查的数字数量为 $O(n)$。起点判断避免从序列的每个数字都重新扫描整段序列。

- **常见错误**：若去掉 `if num - 1 not in num_set`，连续序列中的每个数字都可能重新开始向后扫描，最坏会达到 $O(n^2)$。例如 `[1, 2, 3, ..., n]` 会被重复扫描许多次。

---

## 模式：双指针

- **双指针**模式用两个索引遍历数组，通常是从两端向中间移动，或从同一端以不同速度移动。它适用于有序数组，也常用于比较元素对。

- **适用场景**：题目涉及数对、子数组或划分，且数组有序；或者可以先排序，并且排序不会破坏题目所需的信息。

### 简单：有效回文串

- **题目**：判断字符串是否为回文，只考虑字母和数字，并忽略大小写。

- **模式思路**：一个指针从字符串开头出发，一个从末尾出发。跳过非字母数字字符，比较两端字符，再向中间移动。

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

- **常见错误**：内层跳过非字母数字字符的循环也必须检查 `left < right`。若字符串像 `!!!` 一样全是标点，缺少该条件就可能让指针越界。

### 中等：Three Sum（三数之和）

- **题目**：找出数组中所有和为零且互不重复的三元组。

- **模式思路**：先排序，固定一个元素，再在其余部分用双指针查找和为该元素相反数的数对。

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

- 排序需要 $O(n \log n)$ 时间；固定一个数后，双指针扫描需要 $O(n)$，总时间为 $O(n^2)$。最坏情况下结果本身也可能有 $O(n^2)$ 个三元组，因此这个复杂度与输出规模相匹配。

- **常见错误**：重复值处理最容易出错。若不跳过重复的固定元素，也不跳过双指针找到的重复值，就会返回重复三元组。`if i > 0 and nums[i] == nums[i - 1]: continue` 这项检查不能省略。

- 实现会原地排序并修改传入的 `nums` 数组。

### 困难：接雨水

- **题目**：给定由非负整数表示的地形高度，计算下雨后能够储存的雨水量。

- **模式思路**：位置 $i$ 的水位由左侧最高柱和右侧最高柱中较矮的一方决定；该位置的存水量为两侧最高值较小者减去 `height[i]`。从两端向中间移动指针，并记录两侧的最高高度。

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

- **正确性思路**：若 `height[left] < height[right]`，当前左侧位置的水量由左侧最高值限制；右侧至少存在一根比当前左柱更高的柱子，因此右侧不会成为更低的边界。此时处理较矮的一侧即可。

- **常见错误**：可以先分别预计算每个位置左侧和右侧的最高值，但需要 $O(n)$ 额外空间。双指针方法只需 $O(1)$ 额外空间。更新最高值时把 `>=` 误写成 `>` 也可能导致边界情况出错。

---

## 模式：滑动窗口

- **滑动窗口**维护一个连续区间（子数组或子串），遍历时按需扩大或收缩窗口。它适用于寻找满足条件的子数组或子串。

- **适用场景**：题目要求满足某项约束的最长或最短连续区间，并且窗口变化具有单调性：加入元素会沿一个方向影响约束，移除元素则沿相反方向影响约束。若约束不具备这种性质，简单的滑动窗口可能不适用。

- **通用模板**：

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

### 简单：买卖股票的最佳时机

- **题目**：给定每日价格，求先买入、后卖出一次所能获得的最大利润。

- **模式思路**：记录目前为止的最低价格，并在每一天计算以当天价格卖出能获得的利润。

```python
def max_profit(prices):
    min_price = float('inf')
    max_profit = 0

    for price in prices:
        min_price = min(min_price, price)
        max_profit = max(max_profit, price - min_price)

    return max_profit
```

- 这是一个简化的滑动窗口：左边界只会在发现更低价格时向右移动。时间复杂度为 $O(n)$，额外空间为 $O(1)$。

### 中等：无重复字符的最长子串

- **题目**：求不含重复字符的最长子串长度。

- **模式思路**：移动 `right` 扩大窗口。遇到重复字符时，把左边界直接移到该字符上次出现位置之后。

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

- 检查 `char_index[char] >= left` 是为了确认上次出现位置仍在当前窗口内。若该字符只出现在窗口左边界之前，就不应因此缩小窗口。

- **常见错误**：也可以用集合从左侧逐个删除字符，但哈希表记录最近位置后能直接跳过重复字符，避免逐个收缩。

### 困难：最小覆盖子串

- **题目**：给定字符串 `s` 和 `t`，求 `s` 中包含 `t` 所有字符的最短子串（字符重复次数也必须满足）。

- **模式思路**：扩大窗口，直到窗口含有所有所需字符；随后从左侧收缩，寻找最短的有效窗口。

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

- **常见错误**：`have` 计数器是关键优化。如果每一步都把整个 `window_counts` 与 `need` 比较，验证窗口需要 $O(|\text{不同字符数}|)$ 时间。用 `have` 和 `required` 跟踪已满足的不同字符数后，窗口有效性检查可在 $O(1)$ 时间完成。

- 代码使用 `window_counts[char] == need[char]` 而不是 `>=`，这样该字符的计数恰好达标时才把 `have` 加一，不会重复计数。

---

## 模式：前缀和

- **前缀和数组**保存从开头到各位置的累积和：`prefix[i] = sum(arr[0:i])`。用 $O(n)$ 时间构建后，任意半开区间 `[l, r)` 的区间和都能在 $O(1)$ 时间内计算：`sum(arr[l:r]) = prefix[r] - prefix[l]`。

```python
def build_prefix(arr):
    prefix = [0] * (len(arr) + 1)
    for i in range(len(arr)):
        prefix[i + 1] = prefix[i] + arr[i]
    return prefix

# sum of arr[l:r] (inclusive l, exclusive r)
def range_sum(prefix, l, r):
    return prefix[r] - prefix[l]
```

- **适用场景**：需要多次查询子数组区间和，或需要寻找和为指定值的子数组。

### 简单：区间和查询

- **题目**：给定数组，多次查询半开区间 `[l, r)` 的元素之和。

- 不使用前缀和时，每次查询需要 $O(n)$ 时间；使用前缀和时，预处理需要 $O(n)$ 时间，每次查询只需 $O(1)$。

### 中等：和为 K 的子数组

- **题目**：统计和等于 $k$ 的连续子数组数量。

- **模式思路**：从索引 $l$ 到 $r$（包含两端）的子数组和是 `prefix[r + 1] - prefix[l]`。要让它等于 $k$，就需要 `prefix[l] = prefix[r + 1] - k`。遍历时，用哈希表记录此前各前缀和出现的次数，从而查找有多少个前缀和等于当前前缀和减 $k$。

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

- 这是前缀和与哈希表查找的组合，时间复杂度为 $O(n)$，空间复杂度为 $O(n)$。

- **常见错误**：忘记初始化 `prefix_counts = {0: 1}`。空前缀（处理任何元素之前）的和是 0；若没有这项初始化，就会漏掉从索引 0 开始的子数组。

### 困难：除自身以外数组的乘积

- **题目**：给定数组，返回一个新数组，其中每个位置的值等于输入数组中除该位置元素外所有元素的乘积。不能使用除法。

- **模式思路**：从左向右计算前缀积，从右向左计算后缀积。每个位置的答案等于该位置左侧所有数的乘积乘以右侧所有数的乘积。

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

- 时间复杂度为 $O(n)$，额外空间为 $O(1)$（不计输出数组）。算法先用输出数组保存前缀积，再在第二遍中乘上后缀积。

- **常见错误**：输入含 0 时，使用除法的解法会失败。前缀积与后缀积的做法不需要除法，因此可以正确处理 0。

---

## 常见错误汇总

| 错误 | 示例 | 修正方法 |
| --- | --- | --- |
| 滑动窗口长度差一 | 用 `right - left`，而不是 `right - left + 1` | 用长度为 2 的例子检查 |
| Python 可变默认参数 | `def f(seen={})` 会让多次调用共享状态 | 使用 `def f(seen=None)` |
| 在循环中拼接字符串 | Python 中反复执行 `s += c` 通常是 $O(n^2)$ | 使用 `list.append`，最后用 `"".join` |
| 前缀和忘记初始化 `{0: 1}` | 漏掉从索引 0 开始的子数组 | 始终把空前缀计入 |
| 查询补数前先写入哈希表 | Two Sum 可能把当前元素与自身配对 | 先查找，再插入 |
| 未处理重复值 | Three Sum 返回重复三元组 | 跳过连续相同的值 |
| 整数溢出 | C++ 或 Java 中的大数组求和 | 使用 `long` 或检查数值范围 |

---

## 课后练习（NeetCode）

按顺序练习，巩固本篇介绍的模式。

### 哈希表查找

- [Contains Duplicate](https://neetcode.io/problems/contains-duplicate) — 入门：用哈希集合记录已出现元素
- [Two Sum](https://neetcode.io/problems/two-sum) — 查找补数
- [Group Anagrams](https://neetcode.io/problems/anagram-groups) — 用规范表示作为键
- [Top K Frequent Elements](https://neetcode.io/problems/top-k-elements-in-list) — 哈希表加桶排序
- [Longest Consecutive Sequence](https://neetcode.io/problems/longest-consecutive-sequence) — 用哈希集合和序列起点技巧
- [Encode and Decode Strings](https://neetcode.io/problems/string-encode-and-decode) — 设计字符串序列化方案

### 双指针

- [Valid Palindrome](https://neetcode.io/problems/is-palindrome) — 双指针从两端向内移动
- [Two Sum II (sorted)](https://neetcode.io/problems/two-integer-sum-ii) — 在有序数组上使用双指针
- [Three Sum](https://neetcode.io/problems/three-integer-sum) — 固定一个数、双指针查找并去重
- [Container With Most Water](https://neetcode.io/problems/max-water-container) — 贪心双指针
- [Trapping Rain Water](https://neetcode.io/problems/trapping-rain-water) — 双指针并记录两侧最高值

### 滑动窗口

- [Best Time to Buy and Sell Stock](https://neetcode.io/problems/buy-and-sell-crypto) — 简化的窗口问题
- [Longest Substring Without Repeating Characters](https://neetcode.io/problems/longest-substring-without-duplicates) — 用哈希表扩大和收缩窗口
- [Longest Repeating Character Replacement](https://neetcode.io/problems/longest-repeating-substring-with-replacement) — 窗口加最高频次技巧
- [Minimum Window Substring](https://neetcode.io/problems/minimum-window-with-characters) — 扩大至满足条件，再收缩求最短窗口

### 前缀和

- [Product of Array Except Self](https://neetcode.io/problems/products-of-array-discluding-self) — 前缀积与后缀积
