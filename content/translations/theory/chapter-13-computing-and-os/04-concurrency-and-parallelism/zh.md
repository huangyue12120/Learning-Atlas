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

*并发与并行让程序能够同时处理多件事情。本篇介绍并发与并行的区别、同步原语、经典并发问题、死锁、无锁数据结构、并行编程模型、异步编程和扩展定律；这些概念支撑着多线程服务器、分布式训练以及现代应用。*

- 一个 CPU 核心一次只能执行一条指令。但现代系统有 8 个、64 个甚至成千上万个核心（GPU）。即使只有一个核心，我们也希望同时处理多个任务：下载文件的同时渲染 UI、处理用户输入。**并发**和**并行**就是管理多项活动的两种策略。

## 并发与并行的区别

![并发在一个核心上交错执行任务；并行在多个核心上同时运行任务](../images/concurrency_vs_parallelism.svg)

- **并发**关注的是*管理*多个任务。任务通过交错推进：任务 A 运行一会儿，然后任务 B，再回到 A。在单核心上，并发制造了同时执行的假象；任务并非真的同时运行，而是在轮流执行。

- **并行**关注的是*同时执行*多个任务。有 $n$ 个核心时，$n$ 个任务可以真正同时运行。并行需要多个硬件执行单元。

- 可以这样类比：并发像一个厨师在切菜和搅锅之间来回切换；并行像两个厨师各自同时做一件事。系统可以只有并发而没有并行（单核心、任务交错），只有并行而没有并发（多个核心运行互不交互的程序），也可以两者兼有（多个核心运行彼此交互且相互交错的任务）。

- 在机器学习中，数据加载体现了并发（让数据预处理与 GPU 计算重叠），分布式训练体现了并行（多个 GPU 同时计算梯度，第 06 章）。

## 同步原语

- 多个线程共享数据时，**同步**可以防止竞态条件。竞态条件是指结果取决于线程执行顺序，而该顺序又不可预测。

- 假设两个线程都对共享计数器执行 `counter += 1`。这实际上包含三个操作：(1) 读取 counter；(2) 加 1；(3) 写回 counter。如果两个线程读到同一个值（例如 5），都加 1，再都写入 6，那么计数器最后是 6 而不是正确的 7，其中一次递增丢失了。

- **互斥锁（mutex）**保证同一时间只有一个线程能够访问临界区。线程在进入临界区前**获取**锁，完成后**释放**锁。任何试图获取已被占用锁的其他线程都会阻塞，直到锁被释放。

```
lock.acquire()
counter += 1      # only one thread at a time here
lock.release()
```

- 互斥锁是正确的，但会引入**竞争**：很多线程争用同一把锁时，会把时间花在等待上，而不是计算上。这限制了可扩展性。极端情况下，所有线程都想要同一把锁，整个程序会被串行化。

- **信号量**是互斥锁的推广。计数信号量维护一个计数器：`wait()` 让计数器减一（如果减后会小于零就阻塞），`signal()` 让计数器加一。初值为 1 的信号量表现得像互斥锁；初值为 $n$ 的信号量允许最多 $n$ 个线程同时进入临界区，适合数据库连接之类的资源池。

- **条件变量**让线程等待某个特定条件满足。线程释放锁、在条件变量上等待；另一个线程发出信号后，等待线程被唤醒。这样可以避免忙等（反复在循环中检查条件、浪费 CPU）。

- **监视器**把互斥锁、条件变量和共享数据打包成一个抽象。Java 的 `synchronized` 关键字和 Python 的 `threading.Condition` 都实现了类似监视器的语义。

- **读写锁**区分读者和写者。读者只读数据，可以共享访问；写者修改数据，需要独占访问。多个读者可以同时持有锁，但写者会阻塞所有读者和其他写者。当读远多于写时（例如缓存模型提供预测），读写锁很合适。

## 经典并发问题

- **生产者—消费者**（有界缓冲区）：生产者生成项目并放入固定大小的缓冲区，消费者取出项目。挑战包括：缓冲区满时生产者必须等待，空时消费者必须等待，而且双方都不能破坏缓冲区。

- 解决方案使用两个信号量（一个统计空槽位，一个统计已填槽位），再加一把保护缓冲区本身的互斥锁。这是大多数消息队列、日志系统和数据流水线背后的模式。

- **读者—写者**：多个读者可以同时读取，但写者需要独占访问。挑战在于公平性：如果读者不断到来，写者可能一直饥饿、永远得不到访问机会。解决方案可以优先读者、优先写者，或公平地交替。

- **哲学家就餐**：五位哲学家围桌而坐，五把叉子放在相邻哲学家之间。每个人需要两把叉子才能进餐。如果五个人同时拿起左边的叉子，就没有人能拿到右边的叉子，所有人都会因死锁而挨饿。解决方案包括：原子地拿起两把叉子；引入非对称性（让一位哲学家先拿右叉子）；或设置服务员（用信号量把就餐人数限制为 4）。

## 死锁

- **死锁**发生在一组线程彼此等待对方持有的资源，形成依赖环时。没有任何线程能够继续推进。

![死锁：线程 A 持有锁 1 并等待锁 2，线程 B 持有锁 2 并等待锁 1，形成循环等待](../images/deadlock_cycle.svg)

- 死锁的四个**必要条件**（必须同时成立）：

    1. **互斥**：资源一次只能由一个线程持有。
    2. **占有并等待**：线程持有一个资源，同时等待另一个资源。
    3. **不可剥夺**：不能强行从线程手中夺走资源。
    4. **循环等待**：等待图中存在一个环。

- **死锁预防**会破坏上述四个条件中的一个：
    - 消除循环等待：对资源施加全序，所有线程按同一顺序获取资源。如果每个线程都先获取锁 A 再获取锁 B，循环就不可能出现。
    - 消除占有并等待：要求线程一次性（原子地）请求全部资源。

- **死锁避免**会动态判断授予资源请求是否可能导致死锁。**银行家算法**维护每个线程的最大需求，只授予能让系统保持“安全状态”的请求（安全状态是指所有线程最终都能完成）。每次请求的算法复杂度为 $O(n^2 m)$（$n$ 个线程、$m$ 种资源），对大多数真实系统来说过于昂贵。

- **死锁检测**允许死锁发生，然后通过查找等待图中的环来检测，并通过终止线程或回滚事务来恢复。

- 实际上，多数系统对常见情况使用预防（资源排序），对罕见情况使用检测。数据库系统是典型例子：它们检测事务之间的死锁，并中止其中一个事务来打破循环。

## 无锁与无等待数据结构

- 锁会引入竞争、优先级反转和死锁风险。**无锁**数据结构完全避免锁，使用硬件提供的**原子操作**。

- 关键原子操作是**比较并交换（Compare-And-Swap，CAS）**：原子地检查内存位置是否为期望值，如果是就替换成新值。伪代码如下：

```
CAS(address, expected, new_value):
    if *address == expected:
        *address = new_value
        return true
    else:
        return false
```

- CAS 由一条硬件指令实现，因此即使没有锁也具有原子性。无锁算法会在重试循环中使用 CAS：读取当前值，计算新值，尝试 CAS；如果期间另一个线程修改了该值，CAS 就失败，线程重新尝试。

- **无锁（lock-free）**：至少有一个线程能在有限步数内取得进展（不可能死锁，但在高竞争下某个线程可能无限重试）。

- **无等待（wait-free）**：每个线程都能在有界步数内取得进展（保证最强，但最难实现）。

- 无锁栈、队列和哈希表广泛用于高性能系统。Java 的 `ConcurrentHashMap` 和 Go 的原子操作都建立在 CAS 之上。

## 并行编程模型

- **共享内存**并行：所有线程访问同一内存空间，同步由程序员负责。**OpenMP** 提供编译器指令来并行化循环：

```c
#pragma omp parallel for
for (int i = 0; i < n; i++) {
    result[i] = compute(data[i]);
}
```

- 编译器会把循环迭代分配给可用核心。OpenMP 对数据并行负载（对许多数据点执行同一操作）很有效，也广泛用于科学计算。

- **消息传递**并行：每个进程拥有自己的内存，通信通过发送和接收消息进行。**MPI（消息传递接口）**是跨节点分布式计算的标准：

```c
MPI_Send(data, count, MPI_FLOAT, dest, tag, MPI_COMM_WORLD);
MPI_Recv(data, count, MPI_FLOAT, src, tag, MPI_COMM_WORLD, &status);
```

- MPI 可以扩展到数千个节点，因为没有需要同步的共享状态。分布式深度学习（第 06 章）使用 `MPI_AllReduce`（环形 all-reduce）等集合操作，在 GPU 之间同步梯度。

- **GPU 并行**遵循 **SIMT（单指令多线程）**模型：成千上万个线程在不同数据上执行同一条指令。这非常适合矩阵运算（第 02 章），因为同一个乘加操作会应用于每个元素。后续章节会详细介绍 GPU 编程。

## 异步与事件驱动编程

- 并非所有并发都需要线程。**异步**编程使用单个线程和**事件循环**处理许多 I/O 密集型任务。

- 事件循环维护任务队列。当任务需要等待 I/O（网络响应、文件读取）时，它注册回调并让出控制权。事件循环接着处理下一个就绪任务。I/O 等待期间没有线程被阻塞；I/O 完成后，回调进入队列，最终被执行。

- **协程**是可以暂停和恢复的函数。`async/await` 语法（Python、JavaScript、Rust）让协程看起来像普通顺序代码：

```python
async def fetch_data(url):
    response = await http_get(url)  # suspends here, event loop runs other tasks
    return process(response)         # resumes when response arrives
```

- `await` 关键字暂停协程，把控制权还给事件循环。等待的操作完成后，协程从中断处恢复。这是协作式多任务：协程主动让出控制权；与之相对，抢占式多任务由操作系统强制切换线程。

- 异步非常适合有许多并发连接的**I/O 密集型**负载（例如处理数千客户端的 Web 服务器），不适合**CPU 密集型**工作（单线程事件循环不能利用多个核心）。CPU 密集型工作应使用线程或进程。

- Python 的**全局解释器锁（GIL）**阻止线程实现真正的并行：同一时刻只有一个线程能执行 Python 字节码。因此 Python 用多进程（每个进程有自己的解释器）实现 CPU 并行，用异步实现 I/O 并发。Python 3.13+ 正在移除 GIL（free-threaded Python），届时线程可以实现真正的多线程并行。

## 扩展定律

- **阿姆达尔定律**描述并行化程序的理论加速比。如果程序中可并行的比例是 $p$，剩余串行比例是 $1 - p$：

$$\text{Speedup}(n) = \frac{1}{(1-p) + \frac{p}{n}}$$

![阿姆达尔定律：串行部分限制最大加速比——即使核心无限，10% 串行也最多 10 倍](../images/amdahl_serial_bottleneck.svg)

- 其中 $n$ 是处理器数量。当 $n \to \infty$ 时，最大加速比趋近于 $\frac{1}{1-p}$。如果程序的 95% 可以并行，最大加速比就是 $\frac{1}{0.05} = 20\times$，无论增加多少核心都如此。串行部分是瓶颈。

- 这对机器学习有深刻影响：如果数据加载占训练时间的 10% 且是串行的，增加 GPU 最多只能让训练加速 10 倍。10% 的串行瓶颈限制了一切（这也是为什么高效数据流水线以及让计算与 I/O 重叠很重要，第 06 章）。

- **古斯塔夫森定律**提供了更乐观的视角。它不固定问题规模再增加处理器，而是固定总时间，询问能完成多少更多工作。如果并行部分随问题规模扩展：

$$\text{Speedup}(n) = 1 - p + p \cdot n$$

- 这个结果关于 $n$ 是线性的。其观点是：处理器更多时，我们解决更大的问题，而不是更快地解决同一个问题。在机器学习中，这对应于增加 GPU 时扩大 batch size（弱扩展），而不是保持 batch size 不变（强扩展）。

## 编程任务（使用 Colab 或 notebook）

1. 演示竞态条件。让两个线程在没有同步的情况下递增共享计数器，观察更新丢失。
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

2. 使用锁修复竞态条件，并测量开销。
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

3. 可视化阿姆达尔定律。对不同的并行比例绘制加速比与处理器数量的关系。
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
