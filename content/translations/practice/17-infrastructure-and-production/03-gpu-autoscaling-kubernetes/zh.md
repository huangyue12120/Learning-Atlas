---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/03-gpu-autoscaling-kubernetes/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 6ac8b3437ee96f664c02173f7ebba8d43c61027861e7b27b5cd4e128be466241
status: reviewed
---

# Kubernetes 上的 GPU 自动扩缩容：Karpenter、KAI Scheduler、Gang Scheduling

> 自动扩缩由三层组成。Karpenter 动态预配节点（不到一分钟，比 Cluster Autoscaler 快 40%）；KAI Scheduler 处理 gang 调度、拓扑感知和层级队列，避免 7-of-8 部分分配陷阱——七个节点等待并持续消耗成本，只因缺少一个 GPU。应用层自动扩缩器（NVIDIA Dynamo Planner、llm-d Workload Variant Autoscaler）根据推理专用信号扩缩：队列深度、KV 缓存利用率，而非 CPU/DCGM 占空比。经典 HPA 陷阱在于 `DCGM_FI_DEV_GPU_UTIL` 是占空比测量：100% 可能对应 10 个请求，也可能对应 100 个。vLLM 会预分配 KV 缓存内存，因此内存永远不会触发缩容。本课教你组合这三层，并避开默认 Karpenter `WhenEmptyOrUnderutilized` 策略——它会在推理中终止正在运行的 GPU 任务。

**类型：** 学习
**语言：** Python（标准库，玩具队列深度自动扩缩模拟器）
**前置要求：** 第 17 阶段 · 02（推理平台经济学），第 17 阶段 · 04（服务引擎内部机制）
**用时：** 约 75 分钟

## 学习目标

- 绘制三层自动扩缩（节点预配、gang 调度、应用层）图，并说出每层使用的工具。
- 解释为何 `DCGM_FI_DEV_GPU_UTIL` 是 vLLM 错误的 HPA 信号，并说出两个替代品（队列深度、KV 缓存利用率）。
- 描述 gang 调度及 KAI Scheduler 防止的部分分配失效模式（8 个 GPU 中 7 个闲置）。
- 说出会终止运行中 GPU 任务的 Karpenter 整合策略（`WhenEmptyOrUnderutilized`），以及 2026 年安全替代方案。

## 问题

你的团队在 Kubernetes 上发布 LLM 服务，并将 `DCGM_FI_DEV_GPU_UTIL` 设为 HPA 信号。工作时间服务固定在 100% 利用率，HPA 却从不扩容——它已经认为资源满了。你手动添加一个副本，TTFT 下降；HPA 仍不扩容，信号在骗你。

与此同时，你用 Cluster Autoscaler 扩节点。凌晨两点，一个 100 万 token 的提示词到来；集群花 3 分钟预配节点，请求超时。

又在另一处，你部署需跨两节点 8 GPU 的 70B 模型。集群有 7 个空闲 GPU，另有 1 个分散在 3 个节点上。Cluster Autoscaler 为缺失的 1 个 GPU 预配新节点，七个节点则等待 4 分钟持续烧钱，Kubernetes 才把最后一个 GPU 准备好。

三层对应三种不同失效模式。2026 年 GPU 感知自动扩缩需要组合节点预配、gang 调度和基于应用信号的自动扩缩。

## 概念

### 第 1 层：节点预配（Karpenter）

Karpenter 观察 Pending pod，并在约 45–60 秒内预配节点（GPU 节点上 Cluster Autoscaler 通常需 90–120 秒）。它按 `NodePool` 约束动态选择实例类型——若 pod 需要 8 张 H100 而集群中没有匹配节点，Karpenter 会直接预配一个，而不是扩展现有组。

**整合陷阱：** Karpenter 默认的 `consolidationPolicy: WhenEmptyOrUnderutilized` 对 GPU 池很危险。它会终止一个运行中的 GPU 节点，将 pod 迁移到成本更低、规格合适的实例。对推理工作负载而言，迁移会驱逐正在处理的请求，并在新节点上重新加载 70B 模型，造成数分钟容量损失和请求失败。

GPU 池的安全设置：

```yaml
disruption:
  consolidationPolicy: WhenEmpty
  consolidateAfter: 1h
```

这会让 Karpenter 在一小时后整合真正空闲的节点，但绝不驱逐运行中的任务。

### 第 2 层：Gang 调度（KAI Scheduler）

KAI Scheduler（项目最初名为 “Karp”，后改名）处理默认 kube-scheduler 不处理的内容：

**Gang 调度**——全有或全无地调度。一个需要 8 GPU 的分布式推理 pod，要么 8 个全部同时启动，要么一个也不启动。没有它，就会落入部分分配陷阱：8 个 pod 中 7 个启动、无限等待、持续烧钱。

**拓扑感知**——了解哪些 GPU 共享 NVLink、哪些位于同一机架、哪些之间有 InfiniBand，并据此放置 pod。DeepSeek-V3 67B 张量并行工作负载必须留在一个 NVLink 域内，KAI Scheduler 会遵守。

**层级队列**——多个团队以优先级与配额竞争同一 GPU 池。只有当优先级规则允许时，团队 B 的训练任务才会抢占团队 A 的生产紧急负载。

KAI 与 kube-scheduler 并排部署，作为辅助调度器；你通过注释让工作负载使用它。Ray 和 vLLM 生产栈都已集成。

### 第 3 层：应用层信号

**HPA 陷阱：** `DCGM_FI_DEV_GPU_UTIL` 是占空比指标——它测量每个采样间隔中 GPU 是否在工作。100% 利用率可能代表 10 个并发请求，也可能代表 100 个；GPU 无论如何都在忙。按占空比扩缩等于盲目扩缩。

更糟的是，vLLM 和类似引擎会预分配 KV 缓存内存（最高到 `--gpu-memory-utilization`）。即使只有一个请求，内存使用也接近 90%；基于内存的 HPA 永远不会缩容。

**2026 年替代信号：**

- 队列深度（等待 prefill 的请求数）。
- KV 缓存利用率（分配给活跃序列的块比例）。
- 每副本 P99 TTFT（你的 SLA 信号）。
- Goodput（每秒满足所有 SLO 的请求数）。

NVIDIA Dynamo Planner 和 llm-d Workload Variant Autoscaler 会消费这些信号并扩展副本。对于 LLM 服务，它们完全取代 HPA。

### 何时使用什么

| 扩缩决策 | 工具 |
|----------|------|
| 增加/删除节点 | Karpenter |
| 调度多 GPU 作业 | KAI Scheduler |
| 增加/删除副本 | Dynamo Planner / llm-d WVA（或基于队列深度的自定义 HPA） |
| 选择 GPU 类型 | Karpenter NodePool |
| 抢占低优先级 | KAI Scheduler 队列 |

### 解耦 prefill/decode 使一切更复杂

若运行解耦的 prefill/decode（第 17 阶段 · 17），将有两类 pod、两种不同扩缩触发器：prefill pod 按队列深度扩缩，decode pod 按 KV 缓存压力扩缩。llm-d 将它们公开为按角色配置 HPA 的独立 `Services`。不要试图在两者前面放置一个 HPA。

### 冷启动在这里同样重要

冷启动缓解（第 17 阶段 · 10）是节点预配时间变得用户可见的地方。Karpenter 的 45–60 秒预热、20GB 模型加载和引擎初始化意味着从零开始的请求要花 2–5 分钟。对 SLA 关键路径保持一个预热池（`min_workers=1`），或在应用层使用 Modal 风格检查点。

### 应记住的数字

- Karpenter 节点预配：约 45–60 秒；Cluster Autoscaler：约 90–120 秒（GPU 节点）。
- KAI Scheduler 防止部分分配浪费——7-of-8 陷阱。
- 将 `DCGM_FI_DEV_GPU_UTIL` 作为 HPA 信号：错误；应使用队列深度或 KV 利用率。
- Karpenter `WhenEmptyOrUnderutilized` 会终止运行中的 GPU 任务。推理任务应使用 `WhenEmpty + consolidateAfter: 1h`。

```figure
autoscaling
```

## 使用

`code/main.py` 在突发 GPU 工作负载上模拟三层自动扩缩器，比较朴素 HPA（占空比）、队列深度 HPA 和 KAI gang 调度扩缩，并报告未满足请求、空闲 GPU 分钟和综合分数。

## 交付

本课产出 `outputs/skill-gpu-autoscaler-plan.md`。给定集群拓扑、工作负载形状和 SLO，它会设计一份三层自动扩缩计划。

## 练习

1. 运行 `code/main.py`。在突发工作负载下，朴素占空比 HPA 丢弃了多少被队列深度 HPA 捕获的请求？差异来自哪里？
2. 为在 H100 SXM5 上以 FP8 提供 Llama 3.3 70B 服务的集群设计一个 Karpenter NodePool。指定 `capacity-type`、`disruption.consolidationPolicy`、`consolidateAfter`，以及一个让非 GPU 工作负载远离这些节点的 taint。
3. 团队报告部署处于 Pending，因为“GPU 可用但 pod 不能调度”。诊断：是 Karpenter、kube-scheduler 还是 KAI Scheduler？哪些指标能确认？
4. 为解耦 prefill pod 选择一个扩缩信号，再为 decode pod 选择不同信号，并说明理由。
5. 计算 `WhenEmptyOrUnderutilized` 整合陷阱在 24×7 生产服务中的成本：每天平均 60 次丢请求事件，P99 TTFT > 10 秒。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| Karpenter | “节点预配器” | Kubernetes 节点自动扩缩器；亚分钟预配。 |
| Cluster Autoscaler | “旧扩缩器” | Kubernetes 节点自动扩缩器前身；更慢、基于组。 |
| KAI Scheduler | “GPU 调度器” | 面向 gang、拓扑和队列的辅助调度器。 |
| Gang 调度 | “全有或全无” | 原子性调度 N 个 pod，或将全部延后。 |
| 拓扑感知 | “机架感知” | 根据 NVLink/IB/机架位置放置 pod。 |
| `DCGM_FI_DEV_GPU_UTIL` | “GPU 利用率” | 占空比指标；不是 LLM 的扩缩信号。 |
| 队列深度 | “等待请求” | 对 prefill 受限扩缩正确的 HPA 信号。 |
| KV 缓存利用率 | “内存压力” | 对 decode 受限扩缩正确的 HPA 信号。 |
| 整合 | “Karpenter 整合” | 为迁移到更便宜实例类型而终止节点。 |
| `WhenEmpty + 1h` | “安全整合” | 不驱逐运行中 GPU 任务的策略。 |

## 延伸阅读

- [KAI Scheduler GitHub](https://github.com/kai-scheduler/KAI-Scheduler) —— 设计文档与配置示例
- [Karpenter Disruption Controls](https://karpenter.sh/docs/concepts/disruption/) —— 整合策略语义与 GPU 安全默认值
- [NVIDIA — Disaggregated LLM Inference on Kubernetes](https://developer.nvidia.com/blog/deploying-disaggregated-llm-inference-workloads-on-kubernetes/) —— Dynamo Planner 扩缩信号
- [Ray docs — KAI Scheduler for RayClusters](https://docs.ray.io/en/latest/cluster/kubernetes/k8s-ecosystem/kai-scheduler.html) —— Ray 集成模式
- [AWS EKS Compute and Autoscaling Best Practices](https://docs.aws.amazon.com/eks/latest/best-practices/aiml-compute.html) —— 托管 Kubernetes 专用指南
- [llm-d GitHub](https://github.com/llm-d/llm-d) —— Workload Variant Autoscaler 设计
