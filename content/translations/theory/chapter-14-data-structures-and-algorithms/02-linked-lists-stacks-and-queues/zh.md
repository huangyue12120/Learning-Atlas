---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 14 - data structures and algorithms/02. linked lists, stacks, and queues.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 8144302e82b10eb82d7862530d84cabb8ec2bfab0c5efbefad8f7431e1a66453
status: reviewed
---
# 链表、栈与队列

*本篇介绍链表的指针操作、快慢指针、栈与单调栈、队列、优先队列和堆，并用经典题目练习这些数据结构的选择与不变量。*



* 链接列表、栈和队列是更复杂数据结构的构件。此文件覆盖了它们的力学,然后构建出关键模式;快/慢指针,单音堆,以及基于堆积的优先排队,通过逐渐更难的问题,每个步骤都有共同的陷阱. *

- 阵列可以快速随机进入,但插入费用昂贵。** 链接列表** 快速插入但无随机访问。**Stacks**和**queues**限制进入一两个端,而这种限制使得它们具有强大的:通过限制你所能做的事情,它们简化了你需要思考的东西.

## 链表



- ** 连通列表** 是一个节点链. 每个节点存储一个值和一个指向下一个节点. 最后一个节点指向`null`.

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```

- ** 数组的好处**:在已知位置插入或删除为$O(1)$(只要重新点出指针). 无需转移元素.

- ** 不利之处**:访问要素$i$要求$O(i)$横行(无随机访问)。缓存位置差(节点分散在记忆中)。

- ** 链接清单** 添加一个`prev`指针,可以向后转 用于 LRU 缓存(经常删除任何节点)和浏览器历史(回/ 前置)。

|Operation|Singly|Doubly|
|-----------|--------|--------|
|Access by index|$O(n)$|$O(n)$|
|Insert at head|$O(1)$|$O(1)$|
|Insert at tail|$O(n)$ or $O(1)$*|$O(1)$|
|Delete given node|$O(n)$**|$O(1)$|
|Search|$O(n)$|$O(n)$|

* 有尾指针. ** 需要前身,这需要曲折。

- ** Sentinel 节点**(口味为"头"/"尾")简化了边缘外壳. 没有假头,插入头部或删除头部需要特殊的情况代码. 有了假人 每个真正的节点都有前身

```python
# Without dummy: special case for head deletion
def delete_head(head):
    if not head:
        return None
    return head.next

# With dummy: uniform logic
dummy = ListNode(0)
dummy.next = head
# now every deletion is: prev.next = prev.next.next
```

- ** 意外**:忘记处理空列表(`head is None`)或单元素列表. 总是测试这些边缘的病例。

---

## 模式：快慢指针（Floyd）



- 使用两个以不同速度移动的指针来检测链接列表的属性. **slow**指针一相走一相;**快**指针一相走二相.

### 简单：链表环



- ** 问题**:确定链接清单是否有周期。

- ** Pattern**:如果有一个循环,快指将最终将拉出慢指(它们会相会). 如果没有循环,快速指针就会到达`null`.

```python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False
```

- ** 为何有效**:如果周期有长度$c$,快速指针每步将1个节点关闭缺口. 他们必须在内部相会$c$步骤。

- ** 意外**:检查`fast and fast.next`(不仅仅是)`fast.next`) (中文(简体)). 若为`fast`实值`None`,电话`fast.next`坠机

### 中等：寻找链表中点



- ** 问题**:返回中间节点。

- ** Pattern**:当快指手到端后,慢指手就位于中间.

```python
def find_middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow  # slow is at the middle (or second middle if even length)
```

### 中等：链表环 II（寻找环入口）



- ** 问题**:返回开始周期的节点。

- ** Pattern**:在快慢相会后,重置一指头. 以一号速度移动两个 他们在循环开始时相遇

```python
def detect_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            # reset one pointer to head
            slow = head
            while slow != fast:
                slow = slow.next
                fast = fast.next
            return slow
    return None
```

- ** 为什么这样有效**:让从头到循环的距离开始$a$,从周期开始到会点的距离是$b$。。。慢指针走过$a + b$。。。快速指针飞来$2(a + b)$。。。区别在于整个周期:$a + b = c$(周期长度). 这么说$a = c - b$:从头到循环的距离起等于从会点到循环起步(绕循环向前走)的距离.

### 困难：按 K 个一组翻转链表



- ** 问题**:倒置$k$链接列表中连续的节点。

```python
def reverse_k_group(head, k):
    # check if we have k nodes left
    node = head
    for _ in range(k):
        if not node:
            return head
        node = node.next

    # reverse k nodes
    prev, curr = None, head
    for _ in range(k):
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt

    # head is now the tail of the reversed group
    # recursively process the rest
    head.next = reverse_k_group(curr, k)
    return prev  # prev is the new head of this group
```

- ** 降级**:位置倒转模式(`prev, curr, nxt`值得回忆 画出它: 在每一个步骤,你指`curr.next`向后移动`prev`,然后推进所有三个指针。令出错使名单腐败.

---

## 栈



- 一个**stack**是LIFO(上入,先出):最近添加的元素被先去掉. 想一叠盘子.

- 操作 :`push(x)`上面加点,`pop()`从顶部删除,`peek()`看着顶部而不取出. 全体$O(1)$.

- 栈是**折叠**(调用栈),**表达评价**(转换为后缀)和**undo操作**(每个动作被推出,去掉后缀)背后的隐含结构.

### 简单：有效括号



- ** 问题**:给定一串括号`()[]{}`,确定它们是否平衡。

- ** Pattern**:将开口括号推入堆放处。当看到一个收尾括号时,请检查栈的顶部是相匹配的开口器.

```python
def is_valid(s):
    stack = []
    matching = {')': '(', ']': '[', '}': '{'}

    for char in s:
        if char in matching:
            if not stack or stack[-1] != matching[char]:
                return False
            stack.pop()
        else:
            stack.append(char)

    return len(stack) == 0
```

- ** 意外**:忘记`len(stack) == 0`最终。字符串“ (())” 没有错配, 但是无效, 因为未加括号的括号仍然保留。

---

## 模式：单调栈



- ** monotonic sack** 将元素按排序顺序保持(增减). 当新元素违反命令时,您会弹出元素直到命令被恢复为止.

- ** 当使用**:问题要求"针对每个元素,找到下一个/之前的更大/更小的元素". 堆叠给$O(n)$总计,因为每个元素最多被推出一次。

### 中等：每日温度



- ** 问题**:鉴于每日气温,每一天都能找到离更暖和的温度还有多多天的时间。

- ** Pattern**:使用一叠指数。当当前温度高于栈顶部时,会弹出并记录出相距.

```python
def daily_temperatures(temperatures):
    n = len(temperatures)
    result = [0] * n
    stack = []  # stack of indices, temperatures in decreasing order

    for i in range(n):
        while stack and temperatures[i] > temperatures[stack[-1]]:
            prev = stack.pop()
            result[prev] = i - prev
        stack.append(i)

    return result
```

- 每个元素被推出一次,并跳出最多一次:$O(n)$总计。

- ** 降价**:将指数存储在栈上(不是值)。你需要索引来计算距离。

### 困难：柱状图中最大的矩形



- ** 问题**:鉴于一连串的栏高,找出最大的矩形区域。

- ** Pattern**:对于每个栏目,查找其能延伸多远(即每边最短的栏目). 单音箱不断增大的轨迹

```python
def largest_rectangle(heights):
    stack = []  # stack of indices, heights in increasing order
    max_area = 0
    heights.append(0)  # sentinel to flush the stack at the end

    for i, h in enumerate(heights):
        start = i
        while stack and stack[-1][1] > h:
            idx, height = stack.pop()
            max_area = max(max_area, height * (i - idx))
            start = idx  # this bar can extend back to where the popped bar started
        stack.append((start, h))

    heights.pop()  # remove sentinel
    return max_area
```

- ** 伤亡**:`start = idx`线条很微妙 当我们弹出一个比现在的酒吧高的酒吧时,现在的酒吧可以向后延伸到被弹出酒吧起步的地方(因为中间的所有酒吧都至少和被弹出酒吧一样高). 缺少此线会给出不正确的区域。

- ** 意外**:哨兵`heights.append(0)`确保栈中所有剩余条得到处理。没有它,那些从来没有遇到 右侧短杠的酒吧就会被错过。

---

## 队列



- 一个**queue**是FIFO(First In, First Out):元素被添加到后部并被从前部取出. 想想在商店排队

- 一个**deque**(双限队列)支持$O(1)$在两端插入并删除。Python 的 (美国英语)`collections.deque`是标准执行。

- 类型是**BFS**背后的结构(breadth-first search, 第14章文件4),**任务调度**,和**消息通过**.

### 简单：用栈实现队列



- ** problem**:只使用两堆来执行队列.

- ** Pattern**:用一叠来作推取,一叠来作起出. 当弹出栈为空时,从推放栈中传输所有元素(倒转顺序).

```python
class MyQueue:
    def __init__(self):
        self.push_stack = []
        self.pop_stack = []

    def push(self, x):
        self.push_stack.append(x)

    def pop(self):
        if not self.pop_stack:
            while self.push_stack:
                self.pop_stack.append(self.push_stack.pop())
        return self.pop_stack.pop()

    def peek(self):
        if not self.pop_stack:
            while self.push_stack:
                self.pop_stack.append(self.push_stack.pop())
        return self.pop_stack[-1]

    def empty(self):
        return not self.push_stack and not self.pop_stack
```

- 摊还$O(1)$每个操作:每个元素最多一次在栈之间移动.

---

## 优先队列与堆



- 一个 ** 优先排队** 先返回最小(或最大)元素,无论插入顺序如何. 标准实施是**二元堆积**.

- 一个**min-heap**是一棵完整的二进制树,其中每个父母都比孩子小. 最小分常为根. 存储为阵列: 节点子$i$已经到位$2i + 1$财务报告和已审计财务报表$2i + 2$.

|Operation|Time|
|-----------|------|
|Insert|$O(\log n)$|
|Get min|$O(1)$|
|Extract min|$O(\log n)$|
|Build heap from array|$O(n)$|

- Python 的 (美国英语)`heapq`模块提供一分高。对于最大重的,否定这些值。

```python
import heapq

# Min-heap
h = []
heapq.heappush(h, 5)
heapq.heappush(h, 2)
heapq.heappush(h, 8)
print(heapq.heappop(h))  # 2 (smallest)

# Max-heap trick: negate values
heapq.heappush(h, -10)
print(-heapq.heappop(h))  # 10 (largest)
```

### 中等：数组中的第 K 个最大元素



- ** 问题**:找到最大元素kth。

- ** Pattern**:维持一个小幅的平地$k$。。。堆起的根是克特最大的. 如果这堆东西有$k$元素和一个新元素大于根,取而代之。

```python
import heapq

def find_kth_largest(nums, k):
    heap = nums[:k]
    heapq.heapify(heap)  # O(k)

    for num in nums[k:]:
        if num > heap[0]:
            heapq.heapreplace(heap, num)  # pop min, push num: O(log k)

    return heap[0]
```

- $O(n \log k)$时间$O(k)$空间。比排序好得多($O(n \log n)$当$k \ll n$.

- ** 降价**:使用最大重的大小$n$弹出$k$时间也起作用,但速度较慢:$O(n + k \log n)$。。。体型的平缓$k$是最佳办法。

### 困难：合并 K 个有序链表



- ** 问题**:合并$k$排序链接列表为一个排序列表。

- ** Pattern**:使用包含每份清单头的平缓。弹出最小的,加到结果上, 并推它的下个节点到堆积。

```python
import heapq

def merge_k_lists(lists):
    heap = []
    for i, lst in enumerate(lists):
        if lst:
            heapq.heappush(heap, (lst.val, i, lst))

    dummy = ListNode(0)
    curr = dummy

    while heap:
        val, i, node = heapq.heappop(heap)
        curr.next = node
        curr = curr.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))

    return dummy.next
```

- $O(n \log k)$地点$n$是节点的总数。堆积总是最多$k$元素。

- ** 伤亡**:`i`(index)在堆积的Tuple是一个打结器。没有它,Python试图比较`ListNode`当值相等时对象,该值会崩溃,因为`ListNode`不支持`<`。。。该指数确保了有效的比较。

---

## 常见陷阱总结



|Pitfall|Example|Fix|
|---------|---------|-----|
|Null pointer on `fast.next`|Cycle detection with `while fast.next`|Check `fast and fast.next`|
|Not handling empty list|Reverse of `None`|Add `if not head` guard|
|Stack underflow|Popping from empty stack|Check `len(stack) > 0` or `if stack`|
|Forgetting sentinel|Histogram misses last bars|Append 0 to flush the stack|
|Missing tiebreaker in heap|Comparing uncomparable objects|Add index to heap tuple|
|Modifying list during iteration|Removing nodes while traversing|Use prev/curr pattern or dummy head|

---

## 课后题（NeetCode）



### 链表


- [倒转链接列表](https://neetcode.io/problems/reverse-a-linked-list)，，根本的就地倒置.
- [合并两个排序列表](https://neetcode.io/problems/merge-two-sorted-linked-lists)，，双点合并
- [链接列表循环](https://neetcode.io/problems/linked-list-cycle-detection)快速/慢指针
- [重排列表](https://neetcode.io/problems/reorder-linked-list)，，找到中间+倒转+合并
- [从末尾删除 Nth 节点](https://neetcode.io/problems/remove-node-from-end-of-linked-list)，，有缺口的两个指针.$n$
- [LRU 缓存](https://neetcode.io/problems/lru-cache)，，散列地图+双链接列表

### 栈


- [有效的括号](https://neetcode.io/problems/validate-parentheses)，相匹配的括号
- [栈](https://neetcode.io/problems/minimum-stack)，，各级赛道分数.
- [评价反向波兰标记](https://neetcode.io/problems/evaluate-reverse-polish-notation)，，堆放式评价.
- [每日温度](https://neetcode.io/problems/daily-temperatures)单调递减栈
- [直方图中最大的矩形](https://neetcode.io/problems/largest-rectangle-in-histogram)单调增量栈
- [车队](https://neetcode.io/problems/car-fleet)，，有时间对目标的栈

### 堆 / 优先队列


- [串流中的 Kth 最大元素](https://neetcode.io/problems/kth-largest-integer-in-a-stream)- 体积小到零散$k$
- [最后一块石头重量](https://neetcode.io/problems/last-stone-weight)最大重度模拟
- [K 从源头关闭点](https://neetcode.io/problems/k-closest-points-to-origin)，，以相距为单位的分速堆放
- [任务调度器](https://neetcode.io/problems/task-scheduler)贪得无厌 贪得无厌
- [从数据流中查找中位数](https://neetcode.io/problems/find-median-in-a-data-stream)，，两堆(下半部为最大堆,上半部为小堆)
