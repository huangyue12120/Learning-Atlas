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
# 链表、栈和队列

*链表、栈和队列是更复杂数据结构的基础。本文件涵盖了它们的机制，然后通过逐步增加的难题，构建出关键模式：快慢指针、单调栈和基于堆的优先队列。每个步骤都包含常见陷阱。*

- 数组提供快速随机访问，但插入操作昂贵。 **链表** 提供快速插入操作，但没有随机访问。 **栈** 和 **队列** 限制了对一端或两端的访问，这种限制使得它们变得强大：通过限制可以做的事情，简化了需要思考的内容。

## 链表

- **单向链表** 是一个节点链。每个节点存储一个值和指向下一个节点的指针。最后一个节点指向 `null`。

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```

- **相对于数组的优势**：在已知位置插入或删除元素是 $O(1)$（只需重新指向指针）。不需要移动元素。

- **相对于数组的劣势**：访问第 $i$ 个元素需要 $O(i)$ 次遍历（没有随机访问）。缓存局部性 差（节点在内存中分散）。

- 双向链表添加一个 `prev` 指针，支持逆向遍历。常用于 LRU 缓存（常数时间删除任意节点）和浏览器历史（后退/前进）。

| 操作 | 单向链表 | 双向链表 |
|-----------|--------|--------|
| 通过索引访问 | $O(n)$ | $O(n)$ |
| 在头部插入 | $O(1)$ | $O(1)$ |
| 在尾部插入 | $O(n)$ 或 $O(1)$* | $O(1)$ |
| 删除给定节点 | $O(n)$** | $O(1)$ |
| 搜索 | $O(n)$ | $O(n)$ |

*带有尾指针。 **需要前驱节点，这需要遍历。**

- **哨兵节点**（虚拟头/尾）简化边缘情况。没有虚拟头，插入在头部或删除头部时需要特殊代码。有了虚拟头，每个真实节点都有一个前驱节点。

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

- **陷阱**: 忘记处理空列表（`head is None`）或单元素列表。总是测试这些边缘情况。

---

## 模式：快慢指针（弗洛伊德算法）

- 使用两个不同速度移动的指针来检测链表的属性。**慢**指针每一步移动一次；**快**指针移动两步。

### 简单：环形链表

- **问题**: 确定一个链表是否有环。

- **模式**：如果有环，快指针最终会追上慢指针（它们会在某个点相遇）。如果没有环，快指针会到达 `null`。

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

- 为什么它有效：如果循环长度为 $c$，快指针每步缩短距离1个节点。他们必须在慢指针进入循环后 $c$ 步内相遇。

- **陷阱**: 检查 `fast and fast.next`（而不是 `fast.next`）。如果 `fast` 是 `None`，调用 `fast.next` 会崩溃。

### 中等：找到链表的中间节点

- **问题**：返回中间节点。

- **模式**：当快指针到达末尾时，慢指针位于中间。

```python
def find_middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow  # slow is at the middle (or second middle if even length)
```

### 中等: 环形链表 II (找到环的入口)

- **问题**：返回环开始的节点。

- **模式**：在快指针和慢指针相遇后，将其中一个指针重置为头节点。同时以速度 1 移动两者。它们会在环入口相遇。

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

- **为什么有效**：设从头到环的初始距离为 $a$，从环初始点到相遇点的距离为 $b$。慢指针走了 $a + b$ 步，快指针走了 $2(a + b)$ 步。两者之间的差值是一个完整的环： $a + b = c$（环长度）。因此 $a = c - b$：从头到环初始点的距离等于从相遇点到环初始点的距离（沿着环向前走）。

### 困难：将链表按 K 组反转

- **问题**：在链表中每 $k$ 个连续节点进行反转。

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

- **陷阱**：在地平线反转模式（ `prev, curr, nxt`）中值得记忆。画出来：每次步骤，你将 `curr.next` 向后指向 `prev`，然后同时移动三个指针。顺序错误会破坏列表。

---

## 栈

- **栈**是 LIFO（最后进先出）：最近添加的元素首先被移除。想象一下一个盘子堆。

- 操作： `push(x)` 在顶部添加， `pop()` 从顶部移除， `peek()` 查看顶部而不移除。所有 $O(1)$。

- 栈是递归（调用栈）、表达式求值（将中缀转换为后缀）和撤销操作（每次操作都压入栈，撤销弹出最后一个）的隐含栈结构。

### 简单：有效的括号

- **问题**：给定一个字符串 `()[]{}`，确定它们是否平衡。

- **模式**：将开括号压入栈中。当你看到闭括号时，检查栈顶是否是匹配的 opener。

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

- **陷阱**：忘记在结尾处 `len(stack) == 0`。字符串 "(((" 没有不匹配的情况，但因为未关闭的括号仍然存在，因此不是有效的。

---

## 模式：单调栈

- **单调栈** 保持元素按有序顺序（递增或递减）排列。当新元素违反排序时，通过弹出元素直到恢复秩序为止。

- **何时使用**：问题要求“对于每个元素，找到下一个/前一个更大的/更小的元素”。栈提供了 $O(n)$ 总数，因为每个元素最多被压入和弹出一次。

### 中等: 每日温度

- **问题**：给定每日温度，对于每一天找到比当前温度更高的天数。

- **模式**: 使用索引栈。当当前温度高于栈顶时，弹出并记录距离。

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

- 每个元素最多被压入和弹出一次：$O(n)$个总次数。

- **陷阱**: 在栈中存储索引（而不是值）。你需要索引来计算距离。

### 难：直方图中的最大矩形

- **问题**: 给定一个柱子高度数组，找到最大矩形的面积。

- **模式**: 对于每个柱子，找出它左右可以扩展多远（即两侧最近较矮的柱子）。单调递增栈高效地跟踪这一点。

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

- **陷阱**: `start = idx`行微妙。当我们弹出一个比当前柱子高的柱子时，当前柱子可以向后扩展到它开始的地方（因为所有中间的柱子至少与弹出的柱子一样高）。缺少这一行会导致错误的面积。

- **陷阱**: `heights.append(0)`确保了栈中剩余的所有柱子都被处理。没有它，那些从未遇到右侧较矮柱子的柱子会被遗漏。

---

## 队列

- **队列**是FIFO（先入先出）：元素从后添加，从前删除。想象一下商店的排队线。

- 队列（双端队列）支持 $O(1)$ 插入和删除两端。Python的 `collections.deque` 这是标准实现。

- 队列是 **BFS**（广度优先搜索，第 14 章文件 4）、任务调度和消息传递等结构的基础。

### 简单：使用栈实现队列

- **问题**: 实现一个队列，只使用两个栈。

- **模式**: 使用一个栈用于插入，另一个用于删除。当弹出栈为空时，将所有元素从插入栈（反转顺序）转移过去。

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

- 平摊 $O(1)$ 操作：每个元素最多在两个栈之间移动一次。

---

## 优先队列和堆

- 优先队列返回最小（或最大）元素首先，与插入顺序无关。标准实现是二叉堆。

- 一个 **最小堆** 是一棵完全二叉树，其中每个父节点都比其子节点小。最小值总是位于根节点。存储为数组：节点 $i$ 的子节点位于位置 $2i + 1$ 和 $2i + 2$。

| 操作 | 时间 |
|-----------|------|
| 插入 | $O(\log n)$ |
| 获取最小值 | $O(1)$ |
| 提取最小值 | $O(\log n)$ |
| 从数组构建堆 | $O(n)$ |

- Python的 `heapq` 模块提供了一个最小堆。对于最大堆，需要将值取反。

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

### 中等: 数组中的第 K 大元素

- **问题**: 找到数组中的第 k 大元素。

- **模式**: 保持一个大小为 $k$ 的最小堆。堆的根是第 k 大的元素。如果堆有 $k$ 个元素，并且新元素大于根，则替换根。

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

- $O(n \log k)$ 时间，$O(k)$ 空间。比排序（$O(n \log n)$）更好，当 $k \ll n$ 时。

- **陷阱**: 使用大小为 $n$ 的最大堆，并弹出 $k$ 次也行，但速度较慢：$O(n + k \log n)$。最小堆大小为 $k$ 是最优的解决方案。

### 难：合并 K 个有序链表

- **问题**：将 $k$ 个已排序的链表合并成一个有序链表。

- **模式**：使用一个最小堆，包含每个列表的头节点。弹出最小值并将其添加到结果中，然后将下一个节点推入堆中。

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

- $O(n \log k)$ 中 $n$ 是所有节点的总数。堆最多包含 $k$ 个元素。

- **陷阱**：在堆元组中，`i`（索引）是 Tiebreaker。如果没有它，Python 尝试比较 `ListNode` 对象时会崩溃，因为 `ListNode` 不支持 `<`。索引确保了有效的比较。

---

## 共同陷阱总结

| 错误 | 示例 | 修复 |
|---------|---------|-----|
| 空指针 on `fast.next` | 使用 `while fast.next` 进行环检测 | 检查 `fast and fast.next` |
| 未处理空列表 | 反转 `None` | 添加 `if not head` 守护符 |
| 栈下溢出 | 从空栈弹出元素 | 检查 `len(stack) > 0` 或 `if stack` |
| 忘记哨兵 | 直方图漏掉最后一个条目 | 在堆栈上追加 0 来清空堆栈 |
| 缺少堆排序中的破平局器 | 比较不可比较对象 | 向堆元组中添加索引 |
| 在遍历过程中修改列表 | 遍历时删除节点 | 使用 prev/curr 模式或虚拟头结点 |

---

## 作业题 (NeetCode)

### 链表
- [反转链表](https://neetcode.io/problems/reverse-a-linked-list) — 原地翻转的基础操作
- [合并两个已排序的链表](https://neetcode.io/problems/merge-two-sorted-linked-lists) — 使用双指针合并
- [链表环检测](https://neetcode.io/problems/linked-list-cycle-detection) — 快慢指针法
- [重排链表](https://neetcode.io/problems/reorder-linked-list) — 找到中间节点 + 反转后合并
- [从末尾删除第 N 个节点](https://neetcode.io/problems/remove-node-from-end-of-linked-list) — 使用两个指针和固定间隔 $n$
- [LRU Cache](https://neetcode.io/problems/lru-cache) — 哈希表 + 双向链表

### 栈
- [有效括号](https://neetcode.io/problems/validate-parentheses) — 匹配括号
- [最小栈](https://neetcode.io/problems/minimum-stack) — 每一层的最小值跟踪
- [逆波兰表达式求值](https://neetcode.io/problems/evaluate-reverse-polish-notation) — 栈-based评估
- [每日温度](https://neetcode.io/problems/daily-temperatures) — 单调递减栈
- [柱状图中最大矩形](https://neetcode.io/problems/largest-rectangle-in-histogram) — 单调递增栈
- [汽车车队](https://neetcode.io/problems/car-fleet) — 栈与时间到目标的结合

### 堆 / 优先队列
- [流中第 K 大元素](https://neetcode.io/problems/kth-largest-integer-in-a-stream) — 大小为 $k$ 的最小堆
- [最后一块石头的重量](https://neetcode.io/problems/last-stone-weight) — 最大堆模拟
- [到原点最近的 K 个点](https://neetcode.io/problems/k-closest-points-to-origin) — 根据距离最小堆排序
- [任务调度器](https://neetcode.io/problems/task-scheduler) — 贪心与最大堆 + 冷却时间
- [从数据流中找到中位数](https://neetcode.io/problems/find-median-in-a-data-stream) — 两个堆（小根堆用于下半部分，大根堆用于上半部分）
