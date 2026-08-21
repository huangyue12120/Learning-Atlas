---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/10-llms-from-scratch/19-dualpipe-parallelism/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 281c6d6c76b8c64f6b80f61accd664241985e31d2ff36795c016d8746b1ccd99
status: reviewed
---

# DualPipe 并行

> DeepSeek-V3 在 2,048 张 H800 GPU 上训练，MoE 专家分散在不同节点。跨节点专家 all-to-all 通信的代价是每 1 GPU 小时计算对应 1 GPU 小时通信，因此 GPU 有一半时间处于空闲。DualPipe（DeepSeek，2024 年 12 月）是一种双向流水线，将前向和反向计算与它们触发的 all-to-all 通信重叠。气泡减少，吞吐量上升；而当专家并行已经把专家分散到各 rank 后，保留两份模型参数的“dual”成本也很低。本课通过一个 Learn 类型的演示，说明 DualPipe 实际做了什么，以及 Sea AI Lab 的 DualPipeV 改进为何用略微收紧的气泡换掉了 2 倍参数成本。

**类型：** 学习  
**语言：** Python（标准库，调度模拟器）  
**前置课程：** 第 10 阶段 · 05（分布式训练、FSDP、DeepSpeed）、第 10 阶段 · 14（开放模型架构与 MoE）  
**用时：** 约 60 分钟

## 学习目标

- 说出 DualPipe 前向–反向 chunk 的四个组成部分，以及每一部分为何有自己的重叠窗口。
- 解释大规模训练中的流水线气泡问题，并区分实践中的“无气泡”和宣传语中的“无气泡”。
- 针对 8 个 PP rank 和 16 个微批次手工跟踪 DualPipe 调度，确认前向与反向流填满了彼此的空闲时隙。
- 陈述 DualPipeV（Sea AI Lab，2025）的权衡：在专家并行未启用时，以稍大的气泡换掉 2 倍参数复制。

## 问题

在 2k 张 H800 GPU 上训练一个 671B MoE 模型，会同时遇到三个相互叠加的瓶颈：

1. **内存压力。** 每张 GPU 只持有模型的一部分，但 8k 序列、61 层、128 个头产生的激活内存仍然巨大。
2. **流水线气泡。** 传统流水线并行（GPipe、1F1B）会让 GPU 在等待本阶段输入或梯度时空闲。即使采用 1F1B 调度，8 个 stage 仍可能有约 12% 的 GPU 时间处于气泡。
3. **跨节点 all-to-all。** 采用专家并行的 MoE 会把专家分散到各节点。每次前向都要一次 all-to-all 把词元派发给专家，再一次 all-to-all 合并结果；在 2k 张 GPU 上，计算与通信达到 1:1 并不罕见。

这些问题各自有解决方案：用梯度检查点解决内存，用 Zero Bubble（Sea AI Lab，2023）解决流水线气泡，用专家并行通信内核解决 all-to-all。DualPipe 要做的是让它们协同工作：在一个前向–反向 chunk 内重叠计算和通信，从流水线两端同时注入微批次，再用这个调度把 all-to-all 隐藏在计算窗口里。

据报告，在 DeepSeek-V3 的 14.8T 词元训练中，流水线气泡几乎被消除，GPU 利用率超过 95%。

## 概念

### 流水线并行回顾

将 N 层模型分到 P 个设备上。设备 `i` 持有第 `i * N/P .. (i+1) * N/P - 1` 层。一个微批次沿设备 0 到 P-1 前向流动，再从 P-1 反向流回 0。只有在前一个设备发送输出后，本设备才能开始前向；只有在下游设备发送上游梯度后，本设备才能开始反向。

GPipe（Huang 等，2019）一次调度一个微批次，大部分 GPU 时间因此被浪费。1F1B（Narayanan 等，2021）为多个微批次交错前向与反向。Zero Bubble（Qi 等，2023）将反向拆成两部分——输入反向（B）和权重反向（W）——并调度它们填补气泡。经过 Zero Bubble 后，流水线已经接近紧凑。

DualPipe 又向前一步，在此基础上增加两个想法：

### 想法 1：chunk 分解

每个前向 chunk 被拆成四个部分：

- **注意力。** Q/K/V 投影、注意力和输出投影。
- **All-to-all 派发。** 将词元发送到对应专家的跨节点通信。
- **MLP。** MoE 专家计算。
- **All-to-all 合并。** 将专家输出带回来的跨节点通信。

反向 chunk 为每一部分增加梯度版本。DualPipe 对它们进行调度，使 all-to-all 派发与下一个 chunk 的注意力计算并行，使 all-to-all 合并与后续 chunk 的 MLP 计算并行。

### 想法 2：双向调度

大多数流水线调度从 stage 0 注入微批次，并让它们流向 stage P-1。DualPipe 则从**两端**注入微批次。stage 0 看到从这里发出的前向微批次，stage P-1 也看到从另一端发出的前向微批次，两条流在中间相遇。

为此，设备 `i` 必须同时持有早期流水线层 `i` 和后期流水线层 `P - 1 - i`。DualPipe 中的“dual”指每个设备保留服务两个方向所需的两份模型层。在 DeepSeek-V3 的规模下，这意味着 2 倍参数复制。但专家并行已经把 MoE 专家分得很薄，非专家层复制两次的成本相对很小，因此可以接受。

关键在于，一个方向的前向流与另一方向的反向流，恰好在单向调度本应出现气泡的位置重叠。气泡由此消失。

### 手工跟踪一个调度

考虑 P = 4 个 rank、8 个微批次，分为 4 个正向和 4 个反向。时间从左向右，行表示设备 rank：

```
           Time →
rank 0:  F1 F2 F3 F4  F5R F6R F7R F8R  B1 B2 B3 B4  ...
rank 1:     F1 F2 F3  F4/F5R F6R F7R   B1 B2 ...
rank 2:        F1 F2  F3/F5R F4/F6R    B1 ...
rank 3:           F1  F2/F5R F3/F6R    ...
```

读取 `F4/F5R`：rank 1 在同一个时隙中同时运行微批次 4 的前向（沿流水线从左向右）和微批次 5 的前向（沿流水线从右向左）。这体现了“​​双向”的操作含义。

rank 2 的两条流更早重叠，rank 0 和 P-1 更晚重叠。在调度的稳定中段，每个 rank 都在运行一个方向的前向，同时重叠另一个方向的反向。计算单元保持忙碌。前向中的 all-to-all 派发隐藏在反向计算中，all-to-all 合并隐藏在前向计算中，气泡被挤出。

### 气泡核算

标准 1F1B 流水线中，每个 rank 浪费的时间为：

```
bubble_1F1B = (P - 1) * forward_chunk_time
```

Zero Bubble 的改进会降低气泡，但不会将它降到零。如果微批次数能被流水线深度的两倍整除，DualPipe 在稳定阶段的气泡为零。在预热和冷却阶段仍有一些气泡，但它不会随微批次数增加——这是论文强调的关键性质。

宣传语会说“无气泡”；技术上更准确的说法是：气泡不会随微批次数增长。Sea AI Lab 的后续分析（DualPipeV / Cut-in-half）表明，只有在专家并行通信不是瓶颈时才可能做到完全零气泡；在 EP 驱动的 all-to-all 场景中，总会存在一些调度折中。

### DualPipeV——改进版本

Sea AI Lab（2025）发现，当重点不在 EP 通信重叠时，2 倍参数复制很浪费。他们的 DualPipeV 调度把双向注入折叠成单份参数上的“V 形”调度。气泡比 DualPipe 略大，但节省的内存很可观。DeepSeek 在开源 DualPipe 实现中把 DualPipeV 作为 EP-off 模式采用。

权衡如下：

| 特性 | DualPipe | DualPipeV | 1F1B | Zero Bubble |
|---------|---------|-----------|------|------------|
| 每设备参数副本 | 2 | 1 | 1 | 1 |
| 气泡相对微批次变化 | 常数 | 小幅增长 | 增长 | 增长 |
| 计算–通信重叠 | 完整 | 部分 | 极少 | 部分 |
| 适用场景 | EP 密集型 MoE | 稠密或 EP 较少 | 基线 | 任意流水线 |

### 对 14.8T 词元训练意味着什么

DeepSeek-V3 在 2,048 张 H800 GPU 上训练了 14.8T 个词元，约消耗 280 万 GPU 小时。若使用朴素的 1F1B，其中 12%–15% 会损失在流水线气泡上，即 34 万–42 万 GPU 小时，足够训练一个完整的 70B 模型。DualPipe 恢复了其中大部分时间。没有内部日志，很难直接量化它的贡献，但论文声称整个训练过程的平均 GPU 利用率超过 95%。

对于小于 1k 张 GPU 的运行，DualPipe 通常过度设计：流水线气泡相对于总成本更小，稠密模型训练也很少遇到 all-to-all 瓶颈。对于数千张 GPU 上的前沿 MoE 训练，它基本上是必需的。

### 它在技术栈中的位置

- 与**完全分片数据并行（FSDP）**（第 10 阶段 · 05）互补。FSDP 在 rank 之间切分模型参数；DualPipe 在 rank 之间调度计算。二者可以组合。
- 兼容 **ZeRO-3** 梯度分片。两份参数副本的记账需要与 ZeRO 的分片梯度协作。
- 需要针对特定集群拓扑调优的**自定义 all-to-all 内核**。DeepSeek 的开源内核是参考实现。

```figure
expert-capacity
```

## 使用它

`code/main.py` 是一个流水线调度模拟器。它接收 `(P, n_micro_batches, schedule)`，并打印 1F1B、Zero Bubble、DualPipe 和 DualPipeV 的稳定阶段利用率。它是教学工具；数字与论文中的定性结论一致，并不宣称是生产环境实测加速。

模拟器的价值在于：用不同的 P 和微批次数运行它，观察 1F1B 的气泡比例如何增长，而 DualPipe 的气泡比例基本不增长。

在真实训练中集成时需要考虑：

- 选择能被微批次数整除的流水线并行深度。
- 确保专家并行网格支持双向 all-to-all。DeepSeek 的内核可作为参考。
- 第一次实现时要预留一周调试调度本身。记账很繁琐。
- 监控每个 rank 的 GPU 利用率，而不只是总利用率。DualPipe 的收益来自收紧慢的 rank。

## 交付

本课产出 `outputs/skill-dualpipe-planner.md`。给定训练集群规格（GPU 数量、拓扑、互连和模型形状），它会推荐流水线并行策略、调度算法，以及目标规模下的预期气泡比例。

## 练习

1. 在 `(P=8, micro_batches=16, schedule=dualpipe)` 和 `(P=8, micro_batches=16, schedule=1f1b)` 上运行 `code/main.py`。计算 GPU 利用率差异，并将其表示为每训练一百万个词元恢复的 GPU 小时。

2. 手工画出 `(P=4, micro_batches=8, schedule=dualpipe)` 的调度表。在每个时隙标记微批次 ID 和方向，找出第一个没有气泡的时隙。

3. 阅读 DeepSeek-V3 技术报告（arXiv:2412.19437）的图 5，确定 DualPipe 前向 chunk 中 all-to-all 派发的重叠窗口，并解释计算调度如何隐藏它。

4. 对一个 P=8 流水线 stage 的 70B 稠密模型和一个 P=16 的 671B MoE 模型，分别计算 DualPipe 的 2 倍参数开销。说明为什么 MoE 情况的相对开销更小（大部分参数是分片到大型 EP 组的专家）。

5. 将 DualPipe 与 Chimera（2021 年的竞争性双向调度器）比较。以论文第 3.4 节为参考，指出 DualPipe 增加而 Chimera 没有的两个具体性质。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| 流水线气泡 | “每个 rank 的空闲时间” | 流水线 stage 等待输入或梯度时浪费的 GPU 周期 |
| 1F1B | “默认流水线调度” | 交错一个前向和一个反向的调度，是 DualPipe 击败的基线 |
| Zero Bubble | “Sea AI Lab 2023” | 将反向拆成输入梯度 B 和权重梯度 W，使流水线几乎完全收紧 |
| DualPipe | “DeepSeek-V3 调度” | 双向流水线 + 计算–通信重叠；气泡不随微批次数量增长 |
| DualPipeV | “Cut-in-half” | 以略大气泡换掉 2 倍参数复制的 V 形改进 |
| Chunk | “流水线工作单元” | 一个微批次经过一个流水线 stage 的前向或反向 |
| All-to-all 派发 | “把词元发给专家” | 将词元路由到指定 MoE 专家的跨节点通信 |
| All-to-all 合并 | “带回专家输出” | 在 MLP 后收集专家输出的跨节点通信 |
| 专家并行（EP） | “GPU 之间的专家” | 将 MoE 专家分片到不同 rank，使不同 GPU 持有不同专家 |
| 流水线并行（PP） | “GPU 之间的层” | 将模型层分片到不同 rank，是 DualPipe 调度的维度 |
| 气泡比例 | “浪费的 GPU 时间” | `bubble_time / total_time`；DualPipe 将其推向零的比例 |

## 延伸阅读

- [DeepSeek-AI — DeepSeek-V3 Technical Report (arXiv:2412.19437), Section 3.3.2 and Figure 5](https://arxiv.org/abs/2412.19437) — DualPipe 的主要参考资料
- [DeepSeek — DualPipe GitHub repository](https://github.com/deepseek-ai/DualPipe) — 开源参考实现，包括 DualPipeV（Cut-in-half）模式
- [Qi et al. — Zero Bubble Pipeline Parallelism (arXiv:2401.10241, Sea AI Lab 2023)](https://arxiv.org/abs/2401.10241) — Zero Bubble 前身
- [Sea AI Lab — DualPipe could be better without the Dual](https://sail.sea.com/blog/articles/63) — 影响 DeepSeek EP-off 模式的 DualPipeV 分析
- [Narayanan et al. — PipeDream / 1F1B (arXiv:1806.03377, 2018-2021)](https://arxiv.org/abs/1806.03377) — DualPipe 对比的 1F1B 调度
- [Huang et al. — GPipe (arXiv:1811.06965, 2018)](https://arxiv.org/abs/1811.06965) — 最初的流水线并行论文与气泡问题
