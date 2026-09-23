---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 14 - data structures and algorithms/00. foundations.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 5d071a6a3d64e87765b2cc479b7e8efc383b7663a8c54fd588ced1af5a296ca6
status: reviewed
---
# 基础：大 O、递归、回溯与动态规划

*本篇建立算法分析的共同语言：用大 O 描述增长率，用递归拆解结构，用回溯系统搜索，用动态规划复用重叠子问题。重点是识别模式，而不是死记答案。*



*在潜入数据结构和算法之前,您需要四个基础概念:用于测量效率的大O符号;将问题分解为子问题的重现;回溯追踪,以普鲁斯来进行详尽的搜索;以及为了避免冗余计算而进行动态编程. 此文件从第一原理中教来每个。*

- 本章中剩下的文件假设你对这四个想法很满意. 如果你跳过这个文件,$O(n \log n)$注释,递归树倒行本,回溯跟踪模板,后期文件中的DP状态过渡会感觉像魔法而非工程.

## 为什么学习模式，而不是死记



- 在LetCode,NeetCode,和HackerRank上都有上千个编码问题. 没有人能记住他们所有人, 试图是一个失败的策略。采访者不从固定名单中挑出问题,他们修改、合并和伪装这些问题。当采访者问到一个你从未见过的变体时,对"两个和"的记忆式解决方案不会有所帮助.

- 好消息:只有大约**15-20个核心模式**(两个指针,滑动窗口,BFS/DFS,DP,回溯跟踪等). 每一个问题,不管它表面上看起来多么小说,都缩小到这些图案的一种或组合. 采访不是在测试你以前是否见过这个问题。它正在测试你是否可以** peel 远离上下文**,故事,特定数据类型,边缘大小写,并识别基本模式。

- 考虑这三个问题:
    - 找到两个数组,总和到目标
    - "找到两分子,它们的结合能量 等于一个阈值"
    - "给出账户余额清单,发现两个账号,其合并价值等于债务".

- 他们看起来不一样。它们是同样的问题:**两个总和**。上下文(数字,分子,账户)无关紧要. 其结构是:在集合中寻找补充-散列地图取景.

- 这就是为什么本章通过直觉来教导**patters**,而不是通过重复来教授解决方案。对于每一种模式,我们解释:
    - ** 问题的结构属性** 表示这种模式(各种输入-两个指针;次阵列约束-滑动窗口;最佳子结构+相重叠的分问题-DP)。
    - **为什么图案工作**，，数学或逻辑推理,而不仅仅是"它给出了正确的答案".
    - ** 如何加以调整**，，通过显示在不同的场合适用同一核心思想的简单、中和硬变体。

- 当你深刻理解 * 为什么 滑动窗口工作(限制的单一性意味着扩展/订约就足够了)时,你可以把它应用于任何与该结构有关的问题,即使是你从未见过的问题. 当您只记住“ 不重复字符的长子字符串” 的代码时, 当问题发生改变时, 您就会被卡住。

- 实际战略:
    1. ** 学习图案**(本章)。
    2. ** 在变相问题中实践认识**(每个文件末尾的NeetCode带回家)。
    3. ** 在时间压力下实施。
    4. 在访谈中:读出问题 · 剥去上下文 · 确定模式 - 执行.

---

## 大 O 表示法



- 当我们说一个算法是"快"或"慢"时,我们需要精确的测量方法. ** 大 O 标记** 描述一个算法的运行时间(或空间使用)如何随着输入大小增长$n$增加,忽略了常数因素和排序更低的术语.

- 正式定义:$f(n) = O(g(n))$表示存在常数$c > 0$财务报告和已审计财务报表$n_0$这样的话$f(n) \leq c \cdot g(n)$对所有国家的$n \geq n_0$。。。简单英语:$f$生长速度不快于$g$用于大量投入。

- 为什么忽略常数? 因为$2n$算法和 a$5n$算法是两个$O(n)$:它们大小相同。在更快的计算机上,常数会改变,但缩放不会. 大 O 捕捉出问题的**intrinsic ** 难度,独立于硬件.

### 增长率层级



- 从快到慢:

|Big O|Name|Example|$n = 10^6$ operations|
|-------|------|---------|----------------------|
|$O(1)$|Constant|Array access, hash lookup| 1 |
|$O(\log n)$|Logarithmic|Binary search| 20 |
|$O(n)$|Linear|Linear scan, single loop| $10^6$ |
|$O(n \log n)$|Linearithmic|Merge sort, efficient sorting|$2 \times 10^7$|
|$O(n^2)$|Quadratic|Nested loops, brute-force pairs|$10^{12}$ (too slow)|
|$O(n^3)$|Cubic|Triple nested loops, matrix multiply|$10^{18}$ (way too slow)|
|$O(2^n)$|Exponential|All subsets, brute-force backtracking|$10^{301030}$ (impossible)|
|$O(n!)$|Factorial|All permutations|absurd|

- ** 拇指规则**:现代计算机大致执行$10^8$–$10^9$简单操作每秒。1秒时限:
    - $O(n)$工作为$n \leq 10^8$
    - $O(n \log n)$工作为$n \leq 10^7$
    - $O(n^2)$工作为$n \leq 10^4$
    - $O(2^n)$工作为$n \leq 25$

- 这个表格立刻告诉你,你的方法是否足够快. 若为$n = 10^5$你的解决办法是$O(n^2)$这将是$10^{10}$操作，，太慢了。你需要一个更好的算法。

### 如何分析大 O



- ** 单回旋** 结束$n$要素 :$O(n)$.

```python
total = 0
for x in arr:   # n iterations
    total += x   # O(1) per iteration
# Total: O(n)
```

- ** 循环**:重复数乘以。

```python
for i in range(n):       # n iterations
    for j in range(n):   # n iterations each
        process(i, j)    # O(1)
# Total: O(n^2)
```

- ** 半径**:$O(\log n)$。。。每次迭接都会把问题大小减半,所以需要$\log_2 n$迭代相续.

```python
i = n
while i > 0:
    process(i)
    i //= 2
# Total: O(log n)
```

- ** 内在依赖外向的内向环**:

```python
for i in range(n):
    for j in range(i):   # j goes from 0 to i-1
        process(i, j)
# Total: 0 + 1 + 2 + ... + (n-1) = n(n-1)/2 = O(n^2)
```

- **Reursive**:写出重现关系并解决(第13章涵盖了主定理). 例如,合并排序 :$T(n) = 2T(n/2) + O(n) = O(n \log n)$.

### 常见陷阱



- ** 隐藏回路**:`x in list`实值$O(n)$在 Python (线性扫描) 中,但`x in set`实值$O(1)$。。。使用`in`在一个循环中的列表中$O(n^2)$没有$O(n)$.

```python
# BAD: O(n^2) ， "in" on a list is O(n)
for x in arr:
    if x in another_list:
        process(x)

# GOOD: O(n) ， convert to set first
another_set = set(another_list)
for x in arr:
    if x in another_set:
        process(x)
```

- ** 结扎**:`s += c`在 Python 中,每次复制整个字符串。内环$n$迭代数 :$O(1 + 2 + \cdots + n) = O(n^2)$.

- ** 吸附主导**:如果您的算法类型($O(n \log n)$)然后进行线性扫描($O(n)$),总计为$O(n \log n)$- 那种东西占优势

- ** 复杂不堪:有些业务偶尔费用高而平均费用低。动态数组附加为$O(1)$被摊还是因为$O(n)$调整大小分布于各地$n$廉价的附着物. 不要混淆摊销$O(1)$最坏情况$O(1)$.

### 空间复杂度



- 空间复杂性遵循相同的"大O"规则,被应用于内存使用而不用时间.

- ** 在位** 算法使用$O(1)$额外空间(不计算输入)。快速游戏是$O(\log n)$空格(折叠深度)。合并排序$O(n)$(合并所需的临时数组).

- ** 折叠堆 **:每一次回转调用堆放空间. 复发$n$深度使用量$O(n)$空格,即使每个调用都不分配额外的内存。因此,外勤支助部在图表中与$n$节点用途$O(n)$空间。

- 对于访谈,总是同时说明时间和空间的复杂性。一个$O(n)$时间$O(n)$空间解决方案通常可以接受,但$O(n)$时间$O(1)$空间解决方案更好。采访者可以要求您优化其中之一。

---

## 递归



- ** 追溯** 是当一个函数自称解决同一问题的较小实例时。它是处理递归结构问题最自然的方法:树木、巢状结构、分和相接以及数学序列。

- 每个递归函数都有两个部分:
    1. ** Base case**:可以直接解决的最小实例(不重复)。这就是阻止复发的原因。
    2. **递归性案例**:将问题分解为更小的子问题,以递归性方式解决,并结合结果.

### 示例：阶乘



```python
def factorial(n):
    if n <= 1:        # base case
        return 1
    return n * factorial(n - 1)  # recursive case
```

- 如何执行`factorial(4)`:
    - `factorial(4)`电话`factorial(3)`
    - `factorial(3)`电话`factorial(2)`
    - `factorial(2)`电话`factorial(1)`
    - `factorial(1)`返回时`1`(基数)
    - `factorial(2)`返回时`2 * 1 = 2`
    - `factorial(3)`返回时`3 * 2 = 6`
    - `factorial(4)`返回时`4 * 6 = 24`

- 每通电话都被推到**呼叫堆 **。栈会增长,直到达到基数大小写,然后随着每个调用返回而解开风. 如果复发性太深(例如,`factorial(1000000)`在平顶山上,堆积不绝。`RecursionError`) (中文(简体)). Python的默认回转极限为1000.

### 如何递归地思考



- 关键的精神转变:**相信重现**。在写入递归函数时,假设递归调回小分问题的正确答案. 你的工作是: 做个好人
    1. 处理大案
    2. 把问题拆成小块
    3. 综合结果.

- 你不需要跟踪你脑中的每一次循环通话 这就像试图理解一个循环 通过精神执行每一个迭代。相反,验证:"如果递归式呼叫给我一个对更小的输入的正确答案,我的组合步骤是否为全部输入给出正确的答案?".

### 示例：链表递归



- 反转链接列表 :

```python
def reverse(head):
    if not head or not head.next:   # base case: 0 or 1 nodes
        return head

    new_head = reverse(head.next)   # reverse the rest
    head.next.next = head           # point the next node back to me
    head.next = None                # I am now the tail
    return new_head
```

- ** 相信重犯**:`reverse(head.next)`正确反转列表的其余部分并返回新标题。我们只需要在结尾附上当前节点.

### 示例：树递归



- 计算二进制树的高度 :

```python
def height(root):
    if not root:           # base case: empty tree has height 0
        return 0
    left_h = height(root.left)    # height of left subtree
    right_h = height(root.right)  # height of right subtree
    return 1 + max(left_h, right_h)  # this node adds 1 level
```

- 这种图案，，"左起而后起,右起而后起相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接

### 递归与迭代



- 每个递归算法都可以被转换为迭接(使用一个显式栈或回路). 迭接避免了调用栈的起落和栈溢出的风险.

- ** 何时选择重复**:问题具有自然的循环结构(树木、巢数据、分割和征服)。递归式解决办法比较干净,更容易解释。

- ** 何时更喜欢重迭**:重现深度可能很大(例如,处理一个链接的列表,其中包含以下内容:$10^6$节点). 迭接解决方案避免堆叠溢出.

- ** Tail recursion**:如果是函数中最后一个操作,则一个递归式调用是"尾接回"(在递归式调用回话后没有做任何工作). 一些语言(Scheme, Scala)将尾声调优化为使用常数堆放空间. Python 做** 不** 优化尾声调,所以 Python 中的尾声复发仍然使用$O(n)$栈空间。

### 常见误区



|Pitfall|Example|Fix|
|---------|---------|-----|
|Missing base case|Infinite recursion → stack overflow|Always define when to stop|
|Wrong base case|Off-by-one in recursive decomposition|Test with the smallest inputs (0, 1, 2)|
|Not reducing the problem|`f(n)` calls `f(n)` instead of `f(n-1)`|Ensure subproblem is strictly smaller|
|Redundant computation|Fibonacci: `f(n) = f(n-1) + f(n-2)` recomputes exponentially|Use memoisation (→ DP)|
|Python recursion limit|`factorial(10000)` crashes|Use `sys.setrecursionlimit` or convert to iteration|

---

## 回溯



- ** 追踪** 是探索所有可能的解决办法的系统方法,办法是逐步建立这些解决办法,并放弃不可能导致有效答案的部分解决办法。

- 把它当成是导航迷宫 在每个路口,你选择一条道路。如果撞到一死胡同,就回上个路口去尝试另一条路. 你从头开始不会，，你** 回到最近的决定点。

### 三个步骤



每个回溯算法都遵循相同的模式:

1. ** 选择一个候选人来延长目前的部分解决方案。
2. ** 爆炸**:不断设法从该候选人那里找到一个完整的解决办法。
3. ** 取消选择(后退),并尝试下一个候选人。

```python
def backtrack(state, choices, result):
    if is_complete(state):
        result.append(state.copy())
        return

    for choice in choices:
        if is_valid(choice, state):
            state.add(choice)           # 1. choose
            backtrack(state, choices, result)  # 2. explore
            state.remove(choice)        # 3. unchoose (backtrack)
```

- ** 无选择** 步骤是后行与平地再行的区别。没有它,国家会累积所有的选择,你不能探索其他路径。

### 何时使用回溯



- 问题要求**假设所有有效的配置**:所有外接,所有子集,所有有效的安排(如N-Queens).
- 问题要求 ** 找到任何有效的配置**:数独解析,迷宫路径寻出.
- 搜索空间很大,但可以被**pruned**:大多数部分解决方案可以提前被否决而无需充分探索.

### 剪枝为何能加速



- 不搞花花样,回溯追踪探索每一个可能的组合，，指数时间. 切分枝子很早:

```python
for choice in choices:
    if not is_valid(choice, state):
        continue  # PRUNE: skip this entire subtree

    state.add(choice)
    backtrack(state, choices, result)
    state.remove(choice)
```

- 在N-Queens(文件05)中,在放出后方前检查列和对角相冲突情况,从$n^n$大约$n!$候选人。用于$n = 8$即1 600万~40 000. 良好的分数使指数算法对中度实用$n$.

### 生成所有子集（最简单的回溯）



```python
def subsets(nums):
    result = []

    def backtrack(start, path):
        result.append(path[:])  # every partial solution is a valid subset

        for i in range(start, len(nums)):
            path.append(nums[i])        # choose
            backtrack(i + 1, path)       # explore (i+1: no reuse)
            path.pop()                   # unchoose

    backtrack(0, [])
    return result
```

- 用于`[1, 2, 3]`,复数树:
    - `[]` → `[1]` → `[1,2]` → `[1,2,3]`(后行道) •`[1,3]`(后行道) •`[2]` → `[2,3]`(后行道) •`[3]`

- 树上的每个节点都叫`backtrack`。。。每个叶子(和中间节点)产生一个子集. 子集总数:$2^n$.

### 生成所有排列



```python
def permutations(nums):
    result = []

    def backtrack(path, remaining):
        if not remaining:
            result.append(path[:])
            return

        for i in range(len(remaining)):
            path.append(remaining[i])                    # choose
            backtrack(path, remaining[:i] + remaining[i+1:])  # explore
            path.pop()                                   # unchoose

    backtrack([], nums)
    return result
```

- 总布局:$n!$。。。每一个都要求$O(n)$工程施工`remaining`,所以总数是$O(n \cdot n!)$.

### 常见误区



|Pitfall|Example|Fix|
|---------|---------|-----|
|Forgetting to copy the path|`result.append(path)` ， all entries share the same list|`result.append(path[:])` or `path.copy()`|
|Not backtracking (unchoosing)|State keeps growing, later candidates see stale state|Always `path.pop()` or `state.remove()` after recursive call|
|Wrong loop start|Subsets with duplicates, or permutations with unwanted reuse|Use `start` parameter to avoid revisiting earlier indices|
|Skipping pruning|Exploring obviously invalid branches|Add `if not is_valid: continue` before the recursive call|

---

## 动态规划



- ** Dynamic programming (DP)** 是针对同一子问题反复被解决的问题的一种优化技术. DP不重算,而是一次解决每个子问题并存储结果.

- 当一个问题有两个属性时,DP适用:
    1. **Optimal子结构**:最佳解决方案可以由最优解决方案到次问题构建.
    2. **重叠子问题**:同样的子问题在复发中多次出现.

### 从斐波那契数列理解动机



- 直径回转 Fibonacci:

```python
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)
```

- 用于`fib(5)`,复数树:
    - `fib(5)`电话`fib(4)`财务报告和已审计财务报表`fib(3)`
    - `fib(4)`电话`fib(3)`财务报告和已审计财务报表`fib(2)`
    - `fib(3)`计算**两次**,`fib(2)`计算 ** 三倍**

- 这是$O(2^n)$因为树枝在每个级别上, 和大多数的树枝重算相同的值。用于`fib(50)`,它接管了$10^{15}$操作，，不可行。

- 与**回忆**(自上而下DP):

```python
def fib_memo(n, memo={}):
    if n in memo:
        return memo[n]
    if n <= 1:
        return n
    memo[n] = fib_memo(n - 1, memo) + fib_memo(n - 2, memo)
    return memo[n]
```

- 现在`fib(3)`被计算一次,存储,并查看以后的电话。共计:$O(n)$时间$O(n)$空间。

- 与**抽打**(自下而上DP):

```python
def fib_tab(n):
    if n <= 1:
        return n
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]
```

- 一样$O(n)$时间,但从下而上地构建不重复的解决方案。可进一步优化为$O(1)$空格,因为每个值只取决于前两个值。

### 动态规划配方



对于任何DP问题,请遵循这些步骤:

1. ** 保卫国家**:做什么工作`dp[i]`(或 减:`dp[i][j]`代表吗? 这是最艰难的一步。国家必须掌握足够的信息,以便作出最佳决定。

2. ** 写入重现**:如何`dp[i]`与较小的分问题有关? 这是过渡公式。

3. ** 确定基本情况**:可以直接解决的最小分问题是什么?

4. ** 确定重复顺序**:哪一个子问题必须先解决? 自下而上:按顺序排列,以确保依赖性得到解决。自上而下:递归自动处理此操作.

5. ** 优化空间**(可选):如果`dp[i]`仅取决于上行或前几个条目,您不需要完整的表格。

### 示例：思考过程



** problem**:给正整数阵列,寻找非相邻元素的最大和量(House Robber).

** 步骤1，，界定国家**:`dp[i]`= 考虑到各项要素的最高和数`nums[0..i]`.

** 第2步，，写出重现**:用于元素$i$我们要么:
- 跳过它:`dp[i] = dp[i-1]`(无元素的最佳和数)$i$).
- 拿着`dp[i] = dp[i-2] + nums[i]`(必须跳过元素)$i-1$,然后添加元素$i$).

这么说吧:`dp[i] = max(dp[i-1], dp[i-2] + nums[i])`.

** 步骤3，，基本案件**:`dp[0] = nums[0]`, `dp[1] = max(nums[0], nums[1])`.

** 第4步，，迭代顺序**:从左到右(每个州取决于前两个州).

** 第5步，，空间优化**:只需要最后两个数值。

```python
def rob(nums):
    if len(nums) == 1:
        return nums[0]

    prev2, prev1 = nums[0], max(nums[0], nums[1])

    for i in range(2, len(nums)):
        curr = max(prev1, prev2 + nums[i])
        prev2, prev1 = prev1, curr

    return prev1
```

### 如何识别动态规划问题



- 问题要求达到最佳**(最低成本、最高利润、最长序列)或**(方法数目)。
- 问题在每个步骤**都有**选择(取出/滑行,去出左/右,用出这枚硬币与否),最好的整体答案取决于对次问题的最好答案.
- 绘制回转树显示**重复的子问题**.
- 野蛮的力量是指数化的, 但有远为少 歧义状态** 远远少于循环呼叫。

### 动态规划的类别



- **1D DP**:状态取决于单一指数. 例子:攀登楼梯,入室抢劫,最大分库.

- **2D DP**:状态取决于两个指数。例如:最长的常见子序列(`dp[i][j]`首个$i$字符串 1 和第一个字符$j$字符串 2,编辑距离,网格路径问题.

- ** Interval DP**:状态是一个范围`dp[i][j]`代表子问题`arr[i..j]`。。。例子:矩阵链相乘,爆出气球.

- ** Knapsack DP**:状态是一个项目指数和一个能力. 例子:0/1 knapsack,硬币变化,子集和.

- ** Bitmask DP**:状态包括一个代表哪些元素的位图. 例如:TSP,任务问题. 状态空间是$O(2^n \cdot n)$,可行$n \leq 20$.

### 自顶向下与自底向上



| |Top-Down (Memoisation)|Bottom-Up (Tabulation)|
|--|---|---|
|Implementation|Recursive + cache|Iterative + table|
|Computes|Only subproblems that are actually needed|All subproblems up to the target|
|Stack overflow risk|Yes (deep recursion)|No|
|Space optimisation|Harder|Easier (use rolling array)|
|Ease of coding|Often more natural (write recursion, add cache)|Requires thinking about iteration order|

- 在采访中,自上而下往往比编码更快. 在生产中,通常偏好自下而上的业绩(不重复高管,更好的缓存行为).

### 常见误区



|Pitfall|Example|Fix|
|---------|---------|-----|
|Wrong state definition|`dp[i]` does not capture enough info to make decisions|Add dimensions (e.g., `dp[i][j]` instead of `dp[i]`)|
|Missing base case|`dp[0]` is wrong → all subsequent values are wrong|Verify base case by hand|
|Wrong iteration order|Computing `dp[i]` before its dependencies|Draw the dependency arrows and iterate accordingly|
|Not initialising `dp` correctly|Using 0 when it should be infinity (for min problems)|`float('inf')` for minimisation, `float('-inf')` for maximisation|
|Forgetting to consider "skip" option|Always taking the current element|The recurrence usually has `max(take, skip)`|
|Mutable default argument|`def f(memo={})` shares cache across calls|`def f(memo=None): if memo is None: memo = {}`|
|Off-by-one in 2D DP|Indexing `text1[i]` when `dp` is 1-indexed|`dp` has size `(m+1) x (n+1)`, access `text1[i-1]`|

---

## 综合运用



- 这四个概念构成一个进步:
    1. **大O**告诉你一个方法是否足够快.
    2. ** 复议** 将问题分成子问题。
    3. ** 回溯**是重复+选择+取消,以进行详尽搜索。
    4. ** DP**是再现+缓存,以优化于重叠子问题。

- 当你看到一个新问题时:
    - 估计输入大小$n$。。。什么大O是可以接受的吗?
    - 如果蛮力是指数性的,问题要求列举/查找配置:**回溯**(并用螺旋来使其切实可行).
    - 如果野蛮的力量是指数性的,问题要求有一个最佳或计数,你就会看到重叠的副问题:**DP**。
    - 如果问题的结构将搜索空间减半:**二进制搜索**或**分割并征服**.
    - 如果问题发生在对子阵列有限制的序列上:**滑动窗口**或**两个指针**.
    - 如果问题需要快速检查:**hash映射**.

- 本章所剩文件将这些想法应用于特定数据结构和模式.
