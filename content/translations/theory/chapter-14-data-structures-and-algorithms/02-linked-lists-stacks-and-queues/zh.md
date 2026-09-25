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

*链表、栈和队列是构建更复杂数据结构的基础。本篇介绍它们的工作方式，再通过难度递增的题目讲解快慢指针、单调栈和基于堆的优先队列，并指出各模式常见的错误。*

- 数组支持快速随机访问，但在中间插入元素代价较高。**链表**便于在已知位置插入和删除，但不支持随机访问。**栈**和**队列**限制了元素的访问顺序；这种限制减少了需要考虑的情况，也让它们适用于特定问题。

## 链表

- **单向链表**由一串节点组成。每个节点保存一个值和指向下一个节点的指针，最后一个节点指向 `null`。

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```

- **相对数组的优势**：若已知待插入或删除位置的前驱节点，只需修改指针，无须移动其他元素，操作时间为 $O(1)$。

- **劣势**：访问第 $i$ 个元素需要从头开始遍历，时间为 $O(i)$，不支持随机访问。节点分散在内存中，缓存局部性也较差。

- **双向链表**为每个节点增加一个指向前驱的 `prev` 指针，因此可以向前、向后遍历。LRU 缓存可借助哈希表和双向链表，在已知节点时以 $O(1)$ 时间删除它；浏览器的后退/前进历史也可用双向链表表示。

| 操作 | 单向链表 | 双向链表 |
| --- | --- | --- |
| 按索引访问 | $O(n)$ | $O(n)$ |
| 在头部插入 | $O(1)$ | $O(1)$ |
| 在尾部插入 | $O(n)$ 或 $O(1)$* | $O(1)$ |
| 删除给定节点 | $O(n)$** | $O(1)$ |
| 搜索 | $O(n)$ | $O(n)$ |

*单向链表带有尾指针时，尾部插入为 $O(1)$。**单向链表还需找到前驱节点，因此需要遍历。

- **哨兵节点**（虚拟头节点或尾节点）可以简化边界情况。没有虚拟头节点时，在头部插入或删除头节点要单独处理；加入虚拟头节点后，每个真实节点都有前驱节点。

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

- **常见错误**：漏掉空链表（`head is None`）或只有一个节点的情况。实现后应检查这些边界输入。

---

## 模式：快慢指针（Floyd 判圈算法）

- 用移动速度不同的两个指针判断链表结构。**慢指针**每次移动一步，**快指针**每次移动两步。

### 简单：环形链表

- **题目**：判断链表中是否存在环。

- **模式思路**：若存在环，快指针最终会追上慢指针，两者会相遇；若不存在环，快指针会到达 `null`。

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

- **正确性思路**：设环长为 $c$。慢指针进入环后，快指针每一步相对慢指针前进一个节点，因此两者最多再走 $c$ 步就会相遇。

- **常见错误**：循环条件要检查 `fast and fast.next`，不能只检查 `fast.next`。如果 `fast` 已经是 `None`，访问 `fast.next` 会报错。

### 中等：链表的中间节点

- **题目**：返回链表的中间节点。

- **模式思路**：快指针到达链表末尾时，慢指针位于中间。若节点数为偶数，下面的实现返回两个中间节点中的第二个。

```python
def find_middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow  # slow is at the middle (or second middle if even length)
```

### 中等：环形链表 II（找环的起点）

- **题目**：返回环开始的节点。

- **模式思路**：快慢指针相遇后，把一个指针移回头节点；接着两指针都每次走一步，它们再次相遇的位置就是环的起点。

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

- **为什么有效**：设头节点到环起点的距离为 $a$，环起点到首次相遇位置的距离为 $b$，环长为 $c$。相遇时慢指针走了 $a+b$ 步，快指针走了两倍的距离，因此 $a+b$ 是环长 $c$ 的整数倍。于是 $a \equiv -b \pmod c$：从头节点走 $a$ 步到达环起点；从相遇点也走 $a$ 步，会沿环走到同一个起点。

### 困难：每 $k$ 个节点反转一次

- **题目**：每次反转链表中连续的 $k$ 个节点。以下实现假设 $k \geq 1$；不足 $k$ 个节点的末尾部分保持原样。

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

- **常见错误**：原地反转的 `prev`、`curr`、`nxt` 指针更新顺序很重要。每一步先把 `curr.next` 指回 `prev`，再向前移动指针。顺序写错会破坏链表。

---

## 栈

- **栈**遵循 LIFO（后进先出）：最后加入的元素最先移除。可以把它想成一摞盘子。

- 常见操作包括：`push(x)` 将 `x` 放到栈顶，`pop()` 移除栈顶元素，`peek()` 查看栈顶但不移除。用数组或链表实现时，这些操作通常都是 $O(1)$。

- **递归**（调用栈）、**表达式求值**（例如中缀表达式转后缀表达式）和**撤销操作**（把操作压栈，撤销时弹出最近的一次操作）都使用栈的思想。

### 简单：有效括号

- **题目**：输入只包含括号 `()[]{}` 的字符串，判断括号是否配对且嵌套正确。

- **模式思路**：左括号入栈；遇到右括号时，检查栈顶是否为对应的左括号。

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

- **常见错误**：遍历结束后还要检查栈是否为空。`(((` 虽然没有出现不匹配的右括号，但仍有左括号未闭合，因此不是有效字符串。

---

## 模式：单调栈

- **单调栈**让栈中的元素按递增或递减顺序排列。遇到会破坏顺序的新元素时，先弹出栈顶元素，直到顺序恢复。

- **适用场景**：题目要求对每个元素寻找下一个或上一个更大/更小的元素。每个元素最多入栈、出栈各一次，因此总时间复杂度为 $O(n)$。

### 中等：每日温度

- **题目**：给定每日温度，求每一天至少还要等几天才会遇到更高温度；若之后没有更高温度，结果为 0。

- **模式思路**：栈中保存索引。当前温度高于栈顶索引对应的温度时，弹出该索引，并记录两天之间的距离。

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

- 每个索引只入栈一次、最多出栈一次，所以总时间复杂度为 $O(n)$。

- **常见错误**：栈中要保存索引，而不只是温度值，因为需要用索引计算相隔天数。

### 困难：柱状图中最大的矩形

- **题目**：给定一组柱子的高度，求柱状图中面积最大的矩形。

- **模式思路**：对每根柱子，寻找它左右两侧最近的较矮柱子，从而确定矩形可延伸的范围。用高度单调递增的栈高效处理。

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

- **常见错误**：`start = idx` 这一行容易漏掉。弹出较高的柱子后，当前柱子可以向左延伸到被弹出柱子的起始位置；若漏掉这一步，可能会算错面积。

- **常见错误**：`heights.append(0)` 添加的哨兵会触发栈中剩余柱子的处理。若没有它，右侧始终没有遇到更矮柱子的柱子可能不会被计算。

- 函数会在输入列表末尾临时添加 0，结束时再将其移除；若调用方不希望列表被修改，应先传入副本。

---

## 队列

- **队列**遵循 FIFO（先进先出）：从队尾加入元素，从队头移除元素。可以把它想成排队等候。

- **双端队列**支持在两端以 $O(1)$ 时间插入和删除。Python 的 `collections.deque` 是常用实现。

- **广度优先搜索（BFS）**（本章第 04 篇图论）、任务调度和消息传递都会用到队列。

### 简单：用栈实现队列

- **题目**：只用两个栈实现队列。

- **模式思路**：一个栈负责压入，另一个栈负责弹出。当弹出栈为空时，再把压入栈中的所有元素转移过去；转移会反转元素顺序。

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

- 在一系列操作中，每个元素最多在两个栈之间移动一次，因此每次操作的均摊时间复杂度为 $O(1)$。调用 `pop()` 或 `peek()` 前，队列必须非空。

---

## 优先队列与堆

- **优先队列**不按插入顺序取值，而是优先返回最小（或最大）元素。常见实现是**二叉堆**。

- **最小堆**是一棵完全二叉树，父节点的值不大于子节点。最小值位于根节点。用数组存储并采用从 0 开始的索引时，索引为 $i$ 的节点，其左右子节点索引分别为 $2i + 1$ 和 $2i + 2$。

| 操作 | 时间复杂度 |
| --- | --- |
| 插入 | $O(\log n)$ |
| 查看最小值 | $O(1)$ |
| 移除最小值 | $O(\log n)$ |
| 从数组建堆 | $O(n)$ |

- Python 的 `heapq` 模块提供最小堆。对于数值型最大堆，可以将数值取负后放入最小堆。

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

### 中等：数组中的第 K 大元素

- **题目**：找出数组中第 $k$ 大的元素，以下实现假设 $1 \leq k \leq n$。

- **模式思路**：维护一个大小为 $k$ 的最小堆。堆顶是当前保留元素中的最小值，也就是当前的第 $k$ 大元素。堆中已有 $k$ 个元素时，若新元素大于堆顶，就用新元素替换堆顶。

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

- 时间复杂度为 $O(n \log k)$，空间复杂度为 $O(k)$。当 $k$ 远小于 $n$ 时，这通常比排序的 $O(n \log n)$ 更快。

- **常见错误**：也可以建一个包含全部 $n$ 个元素的最大堆，再弹出 $k$ 次，但复杂度为 $O(n + k \log n)$。当 $k$ 较小时，维护大小为 $k$ 的最小堆更高效。

### 困难：合并 K 个有序链表

- **题目**：把 $k$ 个有序链表合并成一个有序链表。

- **模式思路**：最小堆中保存每个非空链表的头节点。每次取出最小节点并接到结果链表末尾，再把该节点的后继节点放入堆中。

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

- 设所有链表共有 $n$ 个节点，时间复杂度为 $O(n \log k)$。堆中至多有 $k$ 个节点，因此辅助空间为 $O(k)$。

- **常见错误**：堆元组中的 `i` 是用于打破平局的索引。若两个节点的值相同，没有这个索引时，Python 会继续比较 `ListNode` 对象；该类没有定义小于比较，因此会报错。

---

## 常见错误汇总

| 错误 | 示例 | 修正方法 |
| --- | --- | --- |
| 空指针访问 `fast.next` | 用 `while fast.next` 检测环 | 检查 `fast and fast.next` |
| 忘记处理空链表 | 反转 `None` | 添加 `if not head` 检查 |
| 栈下溢 | 从空栈弹出元素 | 检查 `if stack` 或长度是否大于 0 |
| 忘记添加哨兵 | 柱状图末尾的柱子未处理 | 追加 0 以清空栈中剩余项 |
| 堆中没有平局判定项 | Python 尝试比较无法排序的对象 | 在堆元组中加入索引 |
| 遍历时修改链表 | 遍历期间删除节点 | 使用 `prev/curr` 模式或虚拟头节点 |

---

## 课后练习（NeetCode）

### 链表

- [Reverse Linked List](https://neetcode.io/problems/reverse-a-linked-list) — 基础的原地反转
- [Merge Two Sorted Lists](https://neetcode.io/problems/merge-two-sorted-linked-lists) — 双指针合并
- [Linked List Cycle](https://neetcode.io/problems/linked-list-cycle-detection) — 快慢指针
- [Reorder List](https://neetcode.io/problems/reorder-linked-list) — 找中点、反转、合并
- [Remove Nth Node From End](https://neetcode.io/problems/remove-node-from-end-of-linked-list) — 相距 $n$ 的双指针
- [LRU Cache](https://neetcode.io/problems/lru-cache) — 哈希表加双向链表

### 栈

- [Valid Parentheses](https://neetcode.io/problems/validate-parentheses) — 匹配括号
- [Min Stack](https://neetcode.io/problems/minimum-stack) — 记录每层对应的最小值
- [Evaluate Reverse Polish Notation](https://neetcode.io/problems/evaluate-reverse-polish-notation) — 用栈求值
- [Daily Temperatures](https://neetcode.io/problems/daily-temperatures) — 递减单调栈
- [Largest Rectangle in Histogram](https://neetcode.io/problems/largest-rectangle-in-histogram) — 递增单调栈
- [Car Fleet](https://neetcode.io/problems/car-fleet) — 用栈比较到达目标所需时间

### 堆与优先队列

- [Kth Largest Element in a Stream](https://neetcode.io/problems/kth-largest-integer-in-a-stream) — 大小为 $k$ 的最小堆
- [Last Stone Weight](https://neetcode.io/problems/last-stone-weight) — 用最大堆模拟
- [K Closest Points to Origin](https://neetcode.io/problems/k-closest-points-to-origin) — 按距离使用最小堆
- [Task Scheduler](https://neetcode.io/problems/task-scheduler) — 贪心、最大堆与冷却时间
- [Find Median from Data Stream](https://neetcode.io/problems/find-median-in-a-data-stream) — 用两个堆（最大堆保存较小一半，最小堆保存较大一半）
