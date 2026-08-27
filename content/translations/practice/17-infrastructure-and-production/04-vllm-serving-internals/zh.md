---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 6bc9689906560542495ab85dc696e523f13a09f30c6fb24b744336d4a3509efe
status: reviewed
---

# 服务引擎内部机制：PagedAttention、连续批处理、分块 Prefill

> 现代服务引擎吞吐量建立在三个相互叠加的默认设置上。PagedAttention 始终开启；连续批处理在 decode 迭代之间向活跃批次注入新请求；分块 prefill 切分长提示词，使 decode token 永不挨饿。三者同时开启后，一张 H100 SXM5 上的 Llama 3.3 70B FP8 在 128 并发下可达到 2,200–2,400 tok/s，约比 vLLM 自身默认值高 25%，比朴素 PyTorch 循环高 3–4 倍。本课在你能画图理解的层级阅读 vLLM（这三种技术的参考引擎）的调度器与注意力内核，并以 `code/main.py` 中一个按 vLLM 方式安排 prefill 和 decode 的玩具连续批处理器收尾。

**类型：** 学习
**语言：** Python（标准库，玩具连续批处理调度器）
**前置要求：** 第 17 阶段 · 01（模型服务），第 11 阶段（LLM 工程）
**用时：** 约 75 分钟

## 学习目标

- 将 PagedAttention 解释为 KV 缓存分配器：块、块表，以及为何生产负载下碎片保持低于 4%。
- 在迭代层级绘制连续批处理：已结束序列如何离开批次，新序列如何在不排空批次的情况下加入。
- 用一句话描述分块 prefill，并说出它保护的延迟指标（提示：是 TTFT 尾部，而非平均吞吐量）。
- 说出 2026 年 vLLM v0.18.0 中同时启用所有优化会踩到的陷阱。

## 问题

朴素 PyTorch 服务循环一次运行一个请求：分词、prefill、decode 直到 EOS、返回。一个用户时可行；一百个用户时，它变成耐心等候者的队列。静态批处理看似直接，却会将每个请求填充至窗口中最长提示词，将每次 decode 填充至最长预期输出，并让整个批次被最慢序列阻塞。你为永远不会使用的填充付费，快速请求也在等待慢请求。

vLLM 同时解决三个问题。PagedAttention 阻止传统连续分配会造成的 KV 缓存碎片吞掉 60–80% GPU 内存。连续批处理使请求可在每次 decode 迭代之间加入或离开批次，因此批次始终充满真实工作。分块 prefill 将 32k token 提示词切成约 512-token 片段并与 decode 交错，因此一个长提示词不会冻结 GPU 上的每个 decode token。

2026 年的生产默认值是三者全开。你需要理解每一项做什么，因为全部失效模式都在调度器上，而不是模型上。

## 概念

### 作为虚拟内存系统的 PagedAttention

每个序列的 KV 缓存是 `num_layers × 2 × num_heads × head_dim × seq_len × bytes_per_element`。对于 8192 token 的 Llama 3.3 70B，每序列 BF16 约为 1.25 GB。若为每个请求预留 8192 个槽位，但平均请求仅用 1500 token，就浪费约 82% 预留 HBM。传统批处理承担这种浪费。

PagedAttention 借用 OS 虚拟内存的思想。KV 缓存不再按序列连续分配，而是按固定大小块（默认 16 token）分配。每条序列具有块表，将逻辑 token 位置映射到物理块 ID。序列增长超过已分配块时，就添加一个块；序列结束时，块归还到池中。

碎片从传统方式的 60–80% 降到 PagedAttention 的 4% 以下。你无需通过标志启用 PagedAttention——它是 vLLM 唯一提供的分配器。可调旋钮是 `--gpu-memory-utilization`（默认 0.9），它告诉 vLLM 在加载权重与激活值后为 KV 块保留多少 HBM。

### 迭代层级的连续批处理

旧式“动态批处理”会等待一个窗口（如 10 ms）填满批次，然后运行 prefill + decode + decode + decode，直到每条序列都完成。快速序列提前离开，却在 GPU 完成慢序列时闲置。

连续批处理在每个 decode 步骤之间运行。将运行中序列集合称为 `RUNNING` 列表。每次迭代：

1. 从 `RUNNING` 中移除刚达到 EOS 或 `max_tokens` 的任意序列。
2. 调度器查看等待队列。若有空闲 KV 块，则接纳新序列（prefill 或恢复的序列）。
3. 对此时 `RUNNING` 中的所有序列运行前向传播，每序列产生一个新 token。

批次大小永远不会填充到固定数目。处在不同输出位置的序列共享一次融合前向传播。2026 年 vLLM 将此称为 `V1 scheduler`。关键不变量是：调度器每个 decode 迭代运行一次，而不是每个请求运行一次。

### 分块 Prefill 保护 TTFT 尾部

Prefill 是计算密集型的。一条 32k token Llama 3.3 70B 提示词在一张 H100 上仅 prefill 就需要约 800 ms。prefill 运行时，批次中其他序列的 decode token 都在等待。服务循环中，一个长提示词的首 token 延迟（TTFT）会变成其他数十用户的 token 间延迟（ITL）抖动。

分块 prefill 将 prefill 切成固定大小的片段（默认 512 token），并将每个片段作为一个调度单位。片段之间，调度器可让 decode 序列前进一个 token。你以少量绝对 prefill 延迟代价（每块数毫秒）换来更低的 decode 时间抖动。已发布基准显示，混合负载下 P99 ITL 从约 50 ms 降至约 15 ms。

### 三个默认设置如何交互

三项特性相互假定。PagedAttention 为调度器提供可精细调度的 KV 资源；连续批处理需要该细粒度资源，才能在接纳新序列时不强制全局重排；分块 prefill 是调度器对同一 `RUNNING` 列表做的决定，它是又一条调度策略，而非独立系统。

不必了解每个标志。需要知道调度器优化什么：在 KV 块预算下优化 goodput，同时受到分块 prefill 切片约束。

### 2026 年 v0.18.0 陷阱

在 vLLM v0.18.0 中，不能将 `--enable-chunked-prefill` 与草稿模型推测解码（`--speculative-model`）组合。文档中的例外是 V1 调度器中的 N-gram GPU 推测解码。未读发布说明就打开所有标志的团队，会在启动时遇到运行时错误，而非柔性性能回退。若推测收益重要到值得启用分块 prefill，请重新评估：2026 年正确答案往往是“不使用分块 prefill 的 EAGLE-3”，而不是无法编译的“草稿模型 + 分块 prefill”。

### 应记住的数字

- Llama 3.3 70B FP8、H100 SXM5、128 并发，三项全开：2,200–2,400 tok/s。
- 相同模型，默认 vLLM（无分块 prefill）：约 1,800 tok/s。
- 相同模型，朴素 PyTorch 前向循环：约 600 tok/s。
- 生产负载下 PagedAttention 的 KV 碎片浪费：<4%。
- 混合负载下 P99 ITL：分块 prefill 时约 15 ms，否则约 50 ms。

### 调度器看起来是什么样

```
while True:
    finished = [s for s in RUNNING if s.is_done()]
    for s in finished: release_blocks(s); RUNNING.remove(s)

    while WAITING and have_free_blocks_for(WAITING[0]):
        s = WAITING.pop(0)
        allocate_initial_blocks(s)
        RUNNING.append(s)

    # schedule prefill chunks + decode in one batch
    batch = []
    for s in RUNNING:
        if s.in_prefill:
            batch.append(next_prefill_chunk(s))   # e.g. 512 tokens
        else:
            batch.append(decode_one_token(s))     # 1 token

    run_forward(batch)                            # one fused GPU call
```

`code/main.py` 正是这个循环的标准库 Python 版本，使用伪 token 计数和伪前向延迟。运行它可看到分块 prefill 如何让 decode 序列在长 prefill 期间保持活跃。

```figure
tensor-parallel
```

## 使用

`code/main.py` 模拟带可切换特性的 vLLM 风格调度器。运行它可看到：

- `NAIVE` 模式：一次一个请求，无批处理。
- `STATIC` 模式：填充并等待，经典批处理。
- `CONTINUOUS` 模式：迭代层级接纳与释放。
- `CONTINUOUS + CHUNKED` 模式：prefill 切片与 decode 交错。

输出显示总吞吐量（每虚拟秒 token）、TTFT 均值和 P99 ITL。在混合流量上，`CONTINUOUS + CHUNKED` 行应占优。

## 交付

本课产出 `outputs/skill-vllm-scheduler-reader.md`。给定服务配置（批次大小、KV 内存利用率、分块 prefill 大小、推测配置），它会输出调度器诊断，指出三个默认设置中哪个是瓶颈以及要调什么。

## 练习

1. 运行 `code/main.py`。在短长请求混合工作负载上比较 `STATIC` 和 `CONTINUOUS`。吞吐差距来自 prefill 效率、decode 效率还是尾延迟？
2. 修改玩具调度器以加入 `--max-num-batched-tokens`。对于运行 Llama 3.3 70B FP8 的 H100，正确值是什么？（提示：它是 KV 块大小与空闲块数量的函数，而非原始 HBM。）
3. 重读 vLLM v0.18.0 发布说明。哪些标志组合互斥？列出来。
4. 对一个 1,000 请求的轨迹计算 KV 缓存碎片浪费：输出 token 均值 1,500、标准差 600，在（a）每请求连续分配、最大值 8192，（b）16-token 块的 PagedAttention 下分别计算。
5. 用一段话解释为何分块 prefill 有助于 P99 ITL，却不会单独提高吞吐。实践中的吞吐提升来自哪里？

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| PagedAttention | “KV 技巧” | 面向 KV 缓存的固定大小块分配器；碎片 <4%。 |
| 块表 | “页表” | 每序列从逻辑 token 位置到物理 KV 块的映射。 |
| 连续批处理 | “做对了的动态批处理” | 每个 decode 迭代做接纳/释放决策。 |
| 分块 prefill | “拆分 prefill” | 将长 prefill 切成 512-token 切片，与 decode 交错。 |
| TTFT | “首 token 时间” | prefill + 排队 + 网络；长提示时由 prefill 主导。 |
| ITL | “token 间延迟” | 连续 decode token 间的时间；由批次大小主导。 |
| Goodput | “满足 SLO 的吞吐” | 每个请求仍达到 TTFT 与 ITL 目标时的 tokens/sec。 |
| V1 调度器 | “新调度器” | vLLM 的 2026 调度器；N-gram 推测解码与分块 prefill 兼容。 |
| `--gpu-memory-utilization` | “内存旋钮” | 加载权重和激活值后为 KV 块保留的 HBM 比例。 |

## 延伸阅读

- [vLLM documentation — Speculative Decoding](https://docs.vllm.ai/en/latest/features/spec_decode/) —— 关于分块 prefill 与推测解码兼容性的官方来源
- [vLLM Release Notes (NVIDIA)](https://docs.nvidia.com/deeplearning/frameworks/vllm-release-notes/index.html) —— 2026 发布节奏和版本特定行为
- [vLLM Blog — PagedAttention](https://blog.vllm.ai/2023/06/20/vllm.html) —— 仍定义了如何理解该分配器的原始说明
- [PagedAttention paper (arXiv:2309.06180)](https://arxiv.org/abs/2309.06180) —— 碎片分析和调度器设计
- [Aleksa Gordic — Inside vLLM](https://www.aleksagordic.com/blog/vllm) —— 带火焰图的 V1 调度器详解
