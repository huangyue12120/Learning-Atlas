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
# 数组与哈希

*数组、字符串和哈希表是高频算法模式的基础。本篇通过哈希映射、双指针、滑动窗口和前缀和，说明如何把题目约束转化为线性或近线性算法。*



* 阵列和散列表是编程中最基本的两个数据结构。此文件涵盖他们在引擎盖下的工作方式,然后构建关键的问题解析模式;两个指针,即滑动窗口、前缀总和以散列为主的取景,通过越来越困难的问题,每个步骤都有共同的陷阱。*

- 如果能深刻理解阵列和散列地图,那么就可以解决~40%的所有编码访谈问题. 这两种结构到处出现,因为它们提供了两种算法最需要的东西:**快索引访问**(阵列)和**快取键**(hash地图)。

- 此文件会教规律,而不是解决方案。目标是当你看到一个新问题时,你意识到哪种模式适用以及为什么,而不是试图回顾一个记忆中的解决办法。

## 数组



- **阵列**是一个相接的内存区块,其中元素被储存在固定的冲抵上. 访问元素$i$费用$O(1)$因为地址很简单`base + i * element_size`。。。这是最快的可能数据访问,这也是为什么数组是默认的选择.

- ** 动态阵列** (Python's`list`,爪哇语`ArrayList`, C++ 键`vector`)满后会自动生长. 策略为 ** 摊还双倍 **: 当数组满了, 分配出一个大小为两倍的新数组, 并复制所有文件。复印费$O(n)$但它发生如此少(每一次)$n$每项插入的摊销费用为:$O(1)$.

- ** Cache 位置** 是数组在实践中速度快的原因,而不只是理论上的原因. 因为元素是相接地存储的,所以访问一个元素会将相邻元素加载到CPU缓存中(第13章). 通过数组进行移动是方便缓存的;链接列表中的指针不是。这种常因子差异在实际操作中可以是10-100x.

|Operation|Array|Dynamic Array|
|-----------|-------|---------------|
|Access by index|$O(1)$|$O(1)$|
|Append|n/a|$O(1)$ amortised|
|Insert at position $i$|$O(n)$|$O(n)$|
|Delete at position $i$|$O(n)$|$O(n)$|
|Search (unsorted)|$O(n)$|$O(n)$|

- **pitfall**:在数组中间插入或删除为$O(n)$因为所有后续因素都必须被改变。如果需要频繁的中间插入,请考虑完全使用链接列表或不同的方法。

## 字符串



- a **字符串** 是字符串。Python中,字符串是不可改变的:每次调和都会产生出一个新的字符串. 在循环中按字符构建字符串字符为$O(n^2)$因为迄今为止每个调试都复制了整个字符串.

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

- ** Pitfall**:在Python,`s += c`循环内部是最常见的性能错误之一。总是收集到一个列表中`.join()`.

- ** Encoding**:ASCII使用7位(128个字符). **UTF-8**为可变长度:ASCII字符使用1字节,重音字符使用2个;中/日字符使用3个;emojis使用4个. 当一个问题说出"小写英文字母"时,字母大小为26个,这意味着可以使用固定大小的阵列来代替散列图.

## 哈希表



- **hash表** 映射值的密钥$O(1)$查找、插入和删除等大小写。它通过计算一个**hash函数来工作**$h(key)$将密钥转换为数组索引。

- 散列函数必须是:**决定**(同一键总是给予同样的散列),**统一**(在桶上均匀地分配出密钥)和**快**来计算.

- ** 当两个不同的键散列到同一指数时,即发生集合**。两个主要战略:

    - ** Chaining**:每桶存储一个键值对的链接列表. 在相撞时,附在列表上. 最坏的情况(同一桶上的所有散列键) :$O(n)$。。。散列函数良好的普通案件:$O(1)$.

    - ** 开放地址**:碰撞时,探测下个空位。** 林恩调查** 检查下一档,然后是下档等. 该系统方便缓存,但有**组别**(长期占用槽)。**Robin Hood hashing** 将“离家更近”的条目替换,从而减少差异。

- ** 负载系数**$\alpha = n / m$(项目/桶)决定性能。何时$\alpha$超过阈值(通常为0.75),表** rehashes**:分配一个更大的表格并重新插入所有元素。这笔费用$O(n)$却很少发生

- ** 哈什图** (`dict`以蟒蛇盟誓,`HashMap`在Java)存储密钥值对. ** 现金** (`set`以蟒蛇盟誓,`HashSet`在Java中)只存储密钥(用于快速会员测试).

|Operation|Average|Worst Case|
|-----------|---------|------------|
|Lookup|$O(1)$|$O(n)$|
|Insert|$O(1)$|$O(n)$|
|Delete|$O(1)$|$O(n)$|

- ** Bloom 滤波器** 是具有空间效率的概率装置。他们可以告诉你"绝对不在设定中"或"很可能在设定中"(带有可捕性假正率). 他们用$k$散列函数和位数组。用于数据库(避免磁盘读取缺出密钥),网络缓存和拼写检查器.

- ** 何时到达散列地图**:当你需要回答"我以前见过这个吗?" 或"与这把钥匙相关的计数/指数/值是什么?" 内$O(1)$。。。如果你在做重复的线性扫描 寻找某种东西, 散列图几乎可以肯定地使它更快。

---

## 模式：哈希映射查找



- 最基本的模式: 使用散列图来替换$O(n)$扫描为$O(1)$观相.

### 简单：两数之和



- ** 问题**:鉴于一系列整数和目标,返回指数为两个数字,与目标相加。

- ** 部队**$O(n^2)$:检查每对.

- ** 现代见解**:每个数字`num`,你需要(帮助)`target - num`以存在于数组中的某个地方。与其扫描数组,不如在散列图中存储先前看到的数字.

```python
def two_sum(nums, target):
    seen = {}  # value -> index
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
```

- **为什么这样工作**:一个通过阵列。对于每个元素,散列地图的查找是$O(1)$。。。共计:$O(n)$时间$O(n)$空间。

- ** Pitfall**:在检查补丁前不要将当前数字添加到散列图中,或者您可能将元素与自身匹配. 上面代码的顺序是正确的:先检查后插入.

### 中等：字母异位词分组



- ** problem**:给出了字符串列表,将动词组合在一起. ("吃","tea","ate")是一组.

- ** Pattern 洞察**:动画在不同顺序中具有相同的字符. 如果您对每个字符串进行排序, 动画会生成相同的排序键。使用排序的密钥作为散列映射密钥。

```python
from collections import defaultdict

def group_anagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        key = tuple(sorted(s))  # or use character count tuple
        groups[key].append(s)
    return list(groups.values())
```

- ** 优化**: 排序每个字符串的成本$O(k \log k)$地点$k$是字符串长度。对于更快的密钥,计算字符频率并使用倒数为键:

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

- 这是$O(k)$每个字符串代替$O(k \log k)$。。。人物计分tuple是一个**canonical形式**:对于一个团体的所有成员来说,这种代表是相同的.

- ** Pitfall**:在Python中,列表不可散列(不能被dict键). 你必须变成一团屎 试时会把人送上去`groups[count].append(s)`.

### 困难：最长连续序列



- ** 问题**:给一个未分门别类的阵列,寻找最长连续序列的长度(例如,[100、4、200、1、3、2]-4,因为[1、2、3、4])。

- ** 部队**$O(n \log n)$:排序数组,然后扫描连续运行。

- ** 现代见解**:将所有数字放入散列图$O(1)$寻取. 对于每个数字,请检查它是否是一个序列的**起始**(即:`num - 1`不在设定中。如果有,则数出序列延伸了多远.

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

- **为什么$O(n)$**:内在`while`循环运行最多$n$所有迭代的总次数(每个次数最多访问两次:一次在外圈,一次在一圈)`while`扩展). 该`if num - 1 not in num_set`守卫确保我们只开始数 从序列开始。

- ** 意外**:没有`if num - 1 not in num_set`检查,你会开始计算 从每个元素,使它$O(n^2)$在最坏的情况下(例如,[1、2、3.和n]将从每个起点扫描整个序列)。

---

## 模式：双指针



- ** 二指针**图案使用两个指数,通过数组移动,通常从相向端或从同端以不同速度移动. 当数组被排序或需要比较对时,它就会起作用.

- ** 何时使用**:问题涉及对子,子阵列,或分出,且阵列被排序(或可以排序而不会丢失需要的信息).

### 简单：有效回文



- ** problem**:确定一个字符串是否为palindrome,只考虑字母字符而忽略大小写.

- ** Pattern**:一指起步,一指出后. 把它们向内移动,比较字符.

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

- ** 意外**:忘记`left < right`循环时检查内部。没有它,指针就可以像"!!"那样从线上出界了! (皆为无相.

### 中等：三数之和



- ** problem**:在数组中找到所有相和为0的独特三重体.

- ** 路径**:排序数组。固定一个元素,然后在剩余部分上用两个指针来查找相对,总和就是否定了固定元素。

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

- ** 为什么这样工作**:排序是$O(n \log n)$。。。对于每个固定元素,双点扫描是$O(n)$。。。共计:$O(n^2)$,这是这个问题的最佳方法(你们必须考虑所有对)。

- ** 意外**:处理重复是最困难的部分。没有重复的吸取逻辑(无论是固定元素还是双点结果),您将返回重复的三重键. 该`if i > 0 and nums[i] == nums[i-1]: continue`线条是关键。

### 困难：接雨水



- ** 问题**:给定高地图(非负整数阵列),计算雨后可夹住多少水。

- ** Pattern 洞察**:对于每个位置,水位由左起最大高度和右起最大高度的最小值来决定,再减去正取高. 两端的指针都追踪到这些运行中的最大值。

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

- ** 为什么这样做**:关键见解是,如果`height[left] < height[right]`水位在位置上 水位在位置上`left`以`left_max`(我们知道右侧有高个酒吧,所以右侧不能是瓶颈). 我们处理较短的一方,保证另一方有一个更高的酒吧。

- ** 意外**:许多人试图预先计算`left_max[i]`财务报告和已审计财务报表`right_max[i]`首先数组(工作但使用)$O(n)$空间)。双点办法已实现$O(1)$空间。还有,令人困惑`>=`与`>`在最大更新中,可以逐一进行水计算。

---

## 模式：滑动窗口



- ** 滑动窗口** 模式保持一个窗口(相接的子阵列),随着您脚步的伸展和收缩. 它能解决问题 问关于子阵列或子弦 满足某些条件。

- ** 何时使用**:问题要求最长/最短的子阵列或子阵列满足某种制约,而扩展/订约窗口是单调的(添加元素只能使制约更难/更容易满足,而不是两者兼有)。

- ** 专题**:

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



- ** 问题**:根据每日价格,找到一项买卖(在出售前购买)的最大利润。

- ** Pattern**:跟踪迄今所看到的最低价格(窗口左出界)并计算每天的利润。

```python
def max_profit(prices):
    min_price = float('inf')
    max_profit = 0

    for price in prices:
        min_price = min(min_price, price)
        max_profit = max(max_profit, price - min_price)

    return max_profit
```

- 这是一个已退化的滑动窗口: 左指针(以负价计) 只有在找到新的最小值时才会向前移动。$O(n)$时间$O(1)$空间。

### 中等：无重复字符的最长子串



- ** problem**:寻找最长下弦的长度而无需重复字符.

- ** Pattern**:通过移动来扩展窗口`right`。。。当发现重复时,从左边收工,直到去掉重复。

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

- **为什么`char_index[char] >= left`**:该字符可能从当前窗口启动前就出现在地图上. 如果没有此检查, 您会错误地缩小窗口的字符, 而该字符实际上并不在当前窗口中。

- ** Pitfall**:使用一个集,从左边逐个去掉字符是正确而慢. 散列地图的取向直接跳到正确的位置.

### 困难：最小覆盖子串



- ** 问题**:给定字符串`s`财务报告和已审计财务报表`t`,查找最小窗口`s`包含所有字符`t`.

- ** Pattern**:将窗口扩展至包含所有需要的字符,再从左侧收缩以找到最小的有效窗口.

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

- ** 伤亡**:`have`计数器是关键优化。没有它,你需要比较整个`window_counts`命令为`need`在每一步,这是$O(|\text{unique chars}|)$每步数。该`have`复数对有效性进行检查$O(1)$.

- ** 意外**:检查`window_counts[char] == need[char]`(无)`>=`)确保我们增加`have`每一个角色都有一次 如果我们用`>=`,我们会多计数。

---

## 模式：前缀和



- ** 前缀总和** 数组存储累积总和:`prefix[i] = sum(arr[0:i])`。。。曾经建造在$O(n)$中,任何子阵列的和可以计算为:$O(1)$: `sum(arr[l:r]) = prefix[r] - prefix[l]`.

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

- ** 何时使用**:问题涉及多个次阵列总和查询,或找到带有特定总和的分阵列.

### 简单：区间和查询



- ** problem**:给定数组,回答“从索引中得出什么总和”的多个询问$l$改为$r$?"

- 没有前缀总和:每个查询都是$O(n)$。。。有前缀总和 :$O(n)$预算,那么$O(1)$每个查询。

### 中等：和为 K 的子数组



- ** 问题**:将相接的子阵列数计算为$k$.

- ** 现代见解**:指数的子阵列总和$l$改为$r$等于`prefix[r+1] - prefix[l]`。。。我们要平等$k$,这样`prefix[l] = prefix[r+1] - k`。。。对于每个位置, 数到前面的几笔金额等于`current_prefix - k`使用散列图。

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

- 此组合了前缀和散列地图的搜索 :$O(n)$时间$O(n)$空间。

- ** 失败**: 忘记了`prefix_counts = {0: 1}`。。。空前缀(在任何元素之前) 有 0。没有这个,你错过了从指数0开始的子阵列.

### 困难：除自身以外数组的乘积



- ** 问题**:给定一个数组,返回每个元素是所有其他元素的产物的数组。你不能使用"组织"。

- ** Pattern**:从左侧构建前缀产品,从右侧构建后缀产品. 每个职位的答案是`left_product * right_product`.

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

- $O(n)$时间$O(1)$额外空间(输出阵列不计数)。这使用输出阵列本身来存储中间前缀产品,再在后缀产品中乘以第二通.

- ** Pitfall**:如果数组包含一个零,则基于分法的方法会失败. 此前缀/后缀方法处理正确为零,因为它从不分割.

---

## 常见陷阱总结



|Pitfall|Example|Fix|
|---------|---------|-----|
|Off-by-one in window size|`right - left` vs `right - left + 1`|Draw out a 2-element example|
|Mutable default in Python|`def f(seen={})` shares state across calls|Use `def f(seen=None)`|
|String concatenation in loop|`s += c` is $O(n^2)$ in Python|Use `list.append` + `"".join"`|
|Forgetting `{0: 1}` in prefix sum|Miss subarrays starting at index 0|Always init with empty prefix|
|Hash map before check|Two Sum: adding `num` before checking complement|Check first, then insert|
|Not handling duplicates|Three Sum returns duplicate triplets|Skip consecutive equal values|
|Integer overflow|Sum of large arrays in C++/Java|Use `long` or check bounds|

---

## 课后题（NeetCode）



照顺序练习 每个都强化了这个文件中的图案.

### 哈希映射查找


- [包含复制](https://neetcode.io/problems/contains-duplicate)，，取暖:前所未见的散列.
- [两分](https://neetcode.io/problems/two-sum)- 补充查询
- [组](https://neetcode.io/problems/anagram-groups)以犬形为关键
- [上 K 频繁元素](https://neetcode.io/problems/top-k-elements-in-list)，，散列地图+桶等
- [最长的连续序列](https://neetcode.io/problems/longest-consecutive-sequence)- 散列设置 启动序列的花招
- [编码和解码字符串](https://neetcode.io/problems/string-encode-and-decode)设计序列化计划

### 双指针


- [有效的 Palindrome 系统](https://neetcode.io/problems/is-palindrome)- 内向指针
- [二和(类型)](https://neetcode.io/problems/two-integer-sum-ii)排序阵列上的两个指针
- [3个和](https://neetcode.io/problems/three-integer-sum)，，修补+2指针+解开.
- [水量最多的集装箱](https://neetcode.io/problems/max-water-container)贪取两个指针
- [夹取雨水](https://neetcode.io/problems/trapping-rain-water)最大运行的两个指针

### 滑动窗口


- [买卖股票的最佳时间](https://neetcode.io/problems/buy-and-sell-crypto)- 变质窗口
- [最长的子串而无需重复字符](https://neetcode.io/problems/longest-substring-without-duplicates)- 扩大/与散列地图签订合同
- [最长的重复字符替换](https://neetcode.io/problems/longest-repeating-substring-with-replacement)窗口 + 最大频率技巧
- [最小窗口子字符串](https://neetcode.io/problems/minimum-window-with-characters)- 扩大至有效,合同以尽量减少

### 前缀和


- [除自身外的矩阵产品](https://neetcode.io/problems/products-of-array-discluding-self)，，前缀/后缀产品.
