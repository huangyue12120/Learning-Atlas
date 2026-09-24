---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 13 - computing and OS/04. concurrency and parallelism.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 9e820998a2225a64c0bb19211c30b7f82d6a5fec8fd421972e04bd7cb2c600bd
status: reviewed
---
# 并发与并行

*并发与并行是程序同时执行多个任务的方式。本文件涵盖了并发与并行的区别、同步原语、经典并发问题、死锁、无锁数据结构、并行编程模型、异步编程以及扩展定律，这些概念构成了多线程服务器、分布式训练和现代应用程序的基础。*

- 单个CPU核心一次只能执行一条指令。但现代系统有8、64甚至数千个核心（GPU）。即使在单个核心上，我们也希望处理多个任务：下载文件的同时渲染UI同时处理用户输入。 **并发**与 **并行**是管理多个活动的两种策略。

## 并发 vs 并行

![](../images/concurrency_vs_parallelism.svg)


- **并发**是指 *管理* 多个任务。任务通过交错进行：任务A运行一段时间，然后是任务B，再回到A。在单个核心上，并发创造了同时执行的假象。这些任务并不是真正同时进行；它们轮流进行。

- **并行**是指 *执行* 多个任务 simultaneously。随着$n$个硬件执行单元，$n$个任务可以真正同时运行。并行需要多个硬件执行单元。

- 类比：并发是厨师交替切蔬菜和搅拌锅。并行是两个厨师，各自做一项任务 simultaneously。系统既可以并发又不能并行（单个核心，交错的任务），可以并行但不能并发（多个核心运行独立程序没有交互），也可以两者都有（多个核心运行交错的任务有交互）。

- 在ML中，并发出现在数据加载（将数据预处理与GPU计算重叠），而在分布式训练中，平行出现在多GPU同时计算梯度（第6章）。

## 同步原语

- 当多个线程共享数据时，**同步**防止竞态条件。竞态条件是指结果依赖于线程执行的不可预测顺序。

- 考虑两个线程都同时增加一个共享计数器：`counter += 1`。这实际上是三个操作：（1）读取计数器，（2）加1，（3）写入计数器。如果两个线程读取相同的值（例如5），两者都加1，然后都写6，计数器最终会变成6而不是正确的7。一个增加丢失了。

- **互斥锁**（互斥锁）确保只有一个线程访问临界区一次。一个线程在进入临界区之前 **获取** 锁，退出临界区后 **释放** 锁。任何其他试图获取被持有锁的线程都会阻塞直到它被释放。

```
lock.acquire()
counter += 1      # only one thread at a time here
lock.release()
```

- 互斥锁是正确的，但引入了**竞争**：如果许多线程竞争同一个锁，它们会花费时间等待而不是计算。这限制了可扩展性。极端情况，所有线程都想获取同一个锁，整个程序会被串行化。

- 一个 **信号量** 比互斥锁更通用。计数信号量维护一个计数器：`wait()` 减少计数（如果它会变成负数则阻塞），`signal()` 增加计数。初始化为 1 的信号量类似于互斥锁。初始化为 $n$ 的信号量允许最多 $n$ 个线程同时进入临界区（在数据库连接池等资源池中非常有用）。

- **条件变量**允许一个线程在特定条件满足时等待。线程释放锁，等待条件变量，并在另一个线程发出信号时被唤醒。这避免了忙等（反复在循环中检查条件，浪费CPU）。

- 一个 **监视器** 将互斥锁、条件变量和共享数据捆绑在一起，形成单一的抽象。Java 的 `synchronized` 关键字和 Python 的 `threading.Condition` 实现了类似于监视器的语义。

- **读写锁**区分读者（可以共享访问，因为读取不会修改数据）和写者（需要独占访问）。多个读者可以同时持有该锁，但一个写者会阻塞所有读者和其他写者。当读操作远多于写操作时（例如，作为预测缓存的模型），这非常高效。

## 经典并发问题

- **生产者消费者**（有界缓冲区）：生产者生成项目并将其放入固定大小的缓冲区中；消费者从缓冲区移除项目。挑战在于，当缓冲区满时生产者必须等待，当缓冲区空时消费者必须等待，并且两者都必须避免损坏缓冲区。

- 解决方案使用两个信号量（一个计数空槽，另一个计数满槽）以及一个互斥锁来保护缓冲区本身。这是消息队列、日志系统和数据管道背后模式的原型。

- **读者写者**：多个读者可以同时读取，但 writers需要独占访问。挑战是公平性：如果读者不断到来，writer可能会饿死（永远无法获得访问）。解决方案优先考虑读者或writer，或者按公平方式交替进行。

- **就餐哲学家**：五位哲学家坐在一张桌子旁，桌上有五个叉子分别位于他们之间。每个人需要两个叉子才能吃饭。如果所有五人同时拿起他们的左叉子，没有人可以拿起他们的右叉子，所有人都会饿死（死锁）。解决方案包括：原子地拿起两个叉子、引入不对称性（一位哲学家先拿起右边的叉子），或者使用服务员（信号量限制就餐者为4）。

## 死锁

- 死锁发生时，一组线程彼此等待对方持有的资源，形成一个循环依赖。没有人可以继续执行。

![](../images/deadlock_cycle.svg)


- 四个死锁的必要条件（必须同时满足）：

    1. **互斥**：资源只能被一个线程持有。
    2. **占有并等待**：线程在等待另一个资源的同时持有该资源。
    3. **不可抢占**：资源不能被强制从线程中夺走。
    4. **循环等待**：wait-for图中存在一个环。

- 死锁预防通过打破四个条件之一来解决：
    - 消除循环等待：在资源上施加一个总顺序。所有线程以相同顺序获取资源。如果每个线程总是先获取锁A再获取锁B，不可能形成环。
    - 消除占有并等待：要求线程一次性请求所有资源（原子地）。

- 死锁避免动态决定是否授予资源请求会导致死锁。**银行家算法**维护每个线程的最大可能需求，并只在系统处于“安全状态”（所有线程最终可以完成）时才授予请求。该算法每条请求需要$O(n^2 m)$时间（$n$个线程，$m$种资源类型），对于大多数实际系统来说过于昂贵。

- 死锁检测让死锁发生后，检测它们（通过在wait-for图中找到环）并恢复（通过杀死一个线程或回滚一个事务）。

- 实际上，大多数系统使用预防（资源排序）来处理常见情况，并检测罕见情况。数据库系统是经典的例子：它们在事务之间检测死锁并中止其中一个以打破循环。

## 无锁和无等待数据结构

- 锁引入竞争、优先级倒置和死锁的风险。**无锁**数据结构完全避免使用锁，而是利用硬件提供的原子操作。

- 关键的原子操作是**比较并交换（CAS）**：原子地检查内存位置是否具有预期值，并如果如此，则将其替换为新值。在伪代码中：

```
CAS(address, expected, new_value):
    if *address == expected:
        *address = new_value
        return true
    else:
        return false
```

- CAS作为单个硬件指令实现，因此即使没有锁也是原子的。无锁算法使用CAS在一个重试循环中：读取当前值，计算新值，尝试CAS。如果另一个线程在同时修改了该值，则CAS失败，线程重新尝试。

- **无锁**：至少有一个线程在有限步内可以进展（不可能发生死锁，但个别线程可能因竞争而无限次重试）。

- **无等待**：每个线程在有限步内可以进展（最强的保证，但最难实现）。

- 并发栈、队列和哈希表在高性能系统中广泛使用。Java的`ConcurrentHashMap`和Go的原子操作基于CAS。

## 并行编程模型

- **共享内存**并行：所有线程访问同一块内存空间。同步是程序员的责任。**OpenMP**提供了编译器指令来并行化循环：

```c
#pragma omp parallel for
for (int i = 0; i < n; i++) {
    result[i] = compute(data[i]);
}
```

- 编译器将循环迭代拆分到可用的CPU核心上。OpenMP适用于数据并行工作负载（同一操作在多个数据点上）并在科学计算中广泛使用。

- **消息传递**并行：每个进程有自己的内存。通信通过发送和接收消息进行。**MPI**（消息传递接口）是分布式计算的标准化方法，跨节点：

```c
MPI_Send(data, count, MPI_FLOAT, dest, tag, MPI_COMM_WORLD);
MPI_Recv(data, count, MPI_FLOAT, src, tag, MPI_COMM_WORLD, &status);
```

- MPI由于没有共享状态需要同步而能够扩展到数千个节点。分布式深度学习（第6章）使用如`MPI_AllReduce`（环形所有广播）等集体操作来同步GPU上的梯度。

- **GPU并行**遵循**SIMT**（单指令，多线程）模型：数千个线程执行相同的指令在不同的数据上。这非常适合矩阵运算（第2章），其中相同的乘加应用于每个元素。我们将详细讨论GPU编程内容，将在后续章节中进行。

## 异步和事件驱动式编程

- 并非所有并发需求都需要线程。**异步**编程使用单个线程来处理许多I/O-bound任务，使用**事件循环**：

- 事件循环维护一个任务队列。当任务需要等待I/O（网络响应、文件读取）时，它注册回调并放弃控制。事件循环拾起下一个就绪的任务。当I/O完成时，回调被排队并最终执行。没有线程在等待期间阻塞。

- **协程**是可以在暂停和恢复之间切换的函数。`async/await`语法（Python、JavaScript、Rust）使协程看起来像常规顺序代码：

```python
async def fetch_data(url):
    response = await http_get(url)  # suspends here, event loop runs other tasks
    return process(response)         # resumes when response arrives
```

- `await`关键字暂停协程并返回控制给事件循环。当完成的 awaited操作时，协程继续从它离开的地方开始。这是一种合作多任务：协程自愿让步，而不是像抢占式多任务那样，操作系统强制切换线程。

- 异步适用于**I/O-bound**工作负载，其中有许多并发连接（处理数千个客户端的Web服务器）。对于**CPU-bound**工作（单线程事件循环无法利用多个核心），使用线程或进程。

- Python的 **全局解释器锁（GIL）** 阻止了真正的多线程并行：在同一时间只能有一个线程执行Python字节码。这就是为什么Python使用进程（每个进程都有自己的解释器）进行CPU并行，以及异步用于I/O并发的原因。在Python 3.13+（自由线程的Python）中，GIL将被移除，从而实现真正的多线程并行。

## 扩展定律

- 阿姆拉定律描述了并行化程序的理论加速。如果程序中有 $p$ 的部分可以并行，其余 $1 - p$ 部分是串行的：

$$\text{Speedup}(n) = \frac{1}{(1-p) + \frac{p}{n}}$$
![](../images/amdahl_serial_bottleneck.svg)


- 当 $n$ 是处理器的数量时，$n \to \infty$ 的最大加速比接近 $\frac{1}{1-p}$。如果程序的 95% 部分是并行的，无论添加多少核心，最大加速比都是 $\frac{1}{0.05} = 20\times$。串行部分是瓶颈。

- 这对机器学习有深远影响：如果数据加载占训练时间的10%，并是串行的，那么增加更多的GPU最多只能将训练速度提高10倍。10%的串行瓶颈限制了所有事情（这就是为什么高效的数据管道和与I/O重叠计算很重要，第6章）。

- 根据 Gustafson 的法则，提供了一个更乐观的视角。它不固定问题大小并增加处理器数量，而是固定总时间，并问可以完成多少额外的工作。如果并行部分随着问题规模而增长：

$$\text{Speedup}(n) = 1 - p + p \cdot n$$
- 这是线性的。 $n$论点：随着处理器数量的增加，我们解决的问题更大，而不是更快地解决相同的问题。在机器学习中，这对应于使用更多GPU时增加批量大小（弱缩放），而不是保持批量大小固定（强缩放）。

## 编程任务（使用 Colab 或笔记本）

1. 演示一个竞态条件。两个线程在不进行同步的情况下对共享计数器进行递增，并观察到丢失的更新。
```python
import threading

counter = 0

def increment(n):
    global counter
    for _ in range(n):
        counter += 1  # NOT atomic: read, add, write

threads = [threading.Thread(target=increment, args=(100000,)) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()

print(f"Expected: {4 * 100000}")
print(f"Actual:   {counter}")
print(f"Lost updates: {4 * 100000 - counter}")
```

2. 修复竞争条件，使用锁并测量开销。
```python
import threading
import time

lock = threading.Lock()
counter = 0

def increment_locked(n):
    global counter
    for _ in range(n):
        with lock:
            counter += 1

start = time.time()
threads = [threading.Thread(target=increment_locked, args=(100000,)) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
elapsed = time.time() - start

print(f"Counter: {counter} (correct: {4 * 100000})")
print(f"Time with lock: {elapsed:.3f}s")
```

3. 展示阿姆霍德定律。绘制不同并行比例下速度提升与处理器数量的关系图。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

n_procs = jnp.arange(1, 65)

for p, color in [(0.5, "#e74c3c"), (0.9, "#f39c12"), (0.95, "#27ae60"), (0.99, "#3498db")]:
    speedup = 1 / ((1 - p) + p / n_procs)
    plt.plot(n_procs, speedup, color=color, linewidth=2, label=f"p={p}")
    # Max speedup line
    plt.axhline(1 / (1 - p), color=color, linestyle="--", alpha=0.3)

plt.xlabel("Number of processors")
plt.ylabel("Speedup")
plt.title("Amdahl's Law: Serial Fraction Limits Speedup")
plt.legend()
plt.grid(True)
plt.show()
```
