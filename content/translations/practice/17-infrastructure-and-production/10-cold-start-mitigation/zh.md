---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/10-cold-start-mitigation/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: c5c70dbea2fb9ac8ca732b9fcf756d48f2b2b9e850c16602fb66bf859c275c82
status: reviewed
---

# 无服务器 LLM 的冷启动缓解

> 一个 20 GB 模型镜像从冷态到可服务需要 5–10 分钟（7B）到 20 分钟以上（70B）。在真正的无服务器世界中，这不是预热，而是一次宕机。缓解措施分布在五个层次：预置节点镜像（AWS 上的 Bottlerocket、双卷架构）、模型流式加载（NVIDIA Run:ai Model Streamer、vLLM 原生支持）、GPU 内存快照（Modal checkpoint，重启最高快 10 倍）、预热池（`min_workers=1`）、分层加载（ServerlessLLM 的 NVMe→DRAM→HBM 流水线，延迟降低 10–200 倍），以及传输输入 token（KB）而非 KV 缓存（GB）的实时迁移。Modal 将 2–4 秒冷启动作为下限公开；Baseten 默认 5–10 秒，通过预热可低于 1 秒。本课教你测量、预算并叠加这五层措施。

**类型：** 学习
**语言：** Python（标准库，用于模拟冷启动路径的玩具程序）
**前置要求：** 第 17 阶段 · 02（推理平台经济学），第 17 阶段 · 03（GPU 自动扩缩容）
**用时：** 约 60 分钟

## 学习目标

- 枚举冷启动缓解的五个层次，并为每个层次说出一种工具或模式。
- 对一个 70B 模型，将（节点供给）+（权重下载）+（将权重载入 HBM）+（引擎初始化）相加，计算总冷启动时间。
- 解释实时迁移为什么传输输入 token（KB）而不是 KV 缓存（GB），以及其代价（重新计算）。
- 说出预热池的取舍（为闲置 GPU 付费，或承受冷启动长尾）以及使 `min_workers > 0` 成为必须的 SLA 阈值。

## 问题

你的无服务器 LLM 端点夜间缩容为零。上午 8 点流量激增，首个请求依次等待：

1. Karpenter 供给 GPU 节点：45–60 秒。
2. 容器拉取含权重的 30 GB 镜像：120–300 秒。
3. 引擎将权重载入 HBM：取决于模型规模和存储速度，45–120 秒。
4. vLLM 或 TRT-LLM 初始化 CUDA 图、KV 缓存池、tokenizer：10–30 秒。

总共需 220–510 秒（约 3–8 分钟），一个 token 才会返回。你的 SLA 是 2 秒。你部署了预热池（`min_workers=1`），问题似乎消失了——但现在你要为一块闲置 GPU 全天候付费。若服务有 5 个产品，每个保留一个预热副本，那么无论是否有用户调用，每月都是 5 × 24 × 30 = 3,600 GPU 小时。

冷启动缓解的目标，是在保留无服务器经济性的同时，尽量接近常驻服务的延迟。

## 概念

### 第 1 层——预置节点镜像（Bottlerocket）

在 AWS 上，Bottlerocket 的双卷架构将操作系统和数据分离。为预拉取容器镜像的数据卷创建快照，并在 `EC2NodeClass` 中引用快照 ID。新节点启动时，权重已在本地 NVMe 上——第 2 步和第 3 步的一部分消失。它原生适用于 Karpenter。对于大模型，典型收益是每次冷启动节省 2–4 分钟。

GCP 上的等价做法是预烘焙容器层的自定义 VM 镜像；Azure 上则是采用相同模式的托管磁盘快照。

### 第 2 层——模型流式加载（Run:ai Model Streamer）

按层将权重流入 GPU 内存，不必在回复第一个请求前加载完整文件；一旦第一个 Transformer block 驻留，就开始处理。NVIDIA Run:ai Model Streamer 在 2026 年原生随 vLLM 提供。它可与 S3、GCS 和本地 NVMe 配合，通过让 I/O 与计算设置重叠，将大模型的权重加载时间大约减半。

### 第 3 层——GPU 内存快照（Modal）

Modal 在首次加载后，对 GPU 状态（权重、CUDA 图、KV 缓存区域）创建 checkpoint。后续重启会直接反序列化到 HBM——比重新初始化快 10 倍。这是最接近“2 秒启动一块热 GPU”的方式。取舍是快照与 GPU 拓扑绑定：如果 Karpenter 将你迁移到不同 SKU，就必须重新创建 checkpoint。

### 第 4 层——预热池（min_workers=1）

最简单的缓解方式：始终保持一个副本就绪。成本是一块 GPU 的小时费率，全天候支付。对小模型而言账很残酷（花 $0.85–$1.50/hr 避免 30 秒冷启动）；对大模型则较友好（花 $4/hr 避免 5 分钟冷启动）。在 70B+ 模型上，通常当 TTFT P99 < 60 秒时，预热池便成为必要条件。

### 第 5 层——分层加载（ServerlessLLM）

ServerlessLLM 将存储视为层级：NVMe（快但大）、DRAM（中等且分层）、HBM（小但即时）。权重预载到 DRAM；按需载入 HBM。论文报告，与朴素的磁盘到 HBM 相比，冷加载延迟降低 10–200 倍。生产采用仍处早期，但已有与 vLLM 的集成。

### 第 6 层——实时迁移（额外模式）

当一个节点不可用时（抢占式实例驱逐、节点排空），传统模式是冷启动另一副本并排空请求队列。实时迁移将输入 token（千字节）移到已加载该模型的目标端，并在目标端重新计算 KV 缓存。重新计算比经网络传输 GB 级 KV 缓存更便宜。它适用于解耦部署。

### 预热池的计算

对于 TTFT P99 SLA 为 2 秒的服务，预热池规模取决于需要满足 SLA 的路径和副本数。

- 高价值交互路径（实时聊天、语音智能体）：`min_workers=1-2`。
- 后台批处理路径（夜间分类）：接受缩容至零，容忍 5–10 分钟冷启动。
- 高级套餐：每个租户设定 `min_workers`，并提供专属容量。

### 优化前先测量

一台新节点上 70B 模型的冷启动剖析（示例）：

| 阶段 | 时间 | 缓解方式 |
|------|------|----------|
| 节点供给 | 50s | Bottlerocket + 预置镜像、预热池 |
| 镜像拉取 | 180s | 预置数据卷（消除） |
| 权重到 HBM | 75s | 模型流式加载（减半）；GPU 快照（消除） |
| 引擎初始化 | 20s | 持久化 CUDA 图缓存 |
| 首次前向传播 | 3s | 最小固有延迟 |
| **总冷启动** | **328s** | |
| **采用缓解措施后的总计** | **~15s** | 缩短 22 倍 |

### 应当记住的数字

- Modal 冷启动：2–4 秒（使用 GPU 快照）。
- Baseten 默认冷启动：5–10 秒；预热后低于 1 秒。
- 原始 70B 冷启动：3–8 分钟。
- Run:ai Model Streamer：权重加载约快 2 倍。
- ServerlessLLM 分层加载：延迟降低 10–200 倍（论文数据）。

```figure
cold-start-pipeline
```

## 使用

`code/main.py` 对有无各项缓解措施的冷启动路径建模。它会报告总冷启动时间、预热池成本，以及预热池能够收回成本的盈亏平衡请求速率。

## 交付

本课产出 `outputs/skill-cold-start-planner.md`。给定 SLA、模型规模和流量形态，它会选择应叠加哪些缓解措施。

## 练习

1. 运行 `code/main.py`。计算高于何种请求速率时，预热副本比在 SLO 下通过额外请求丢失承担冷启动税更便宜。
2. 你部署一个 13B 模型，TTFT P99 SLA 为 3 秒。选择能够达到该目标的最小缓解栈（层数最少）。
3. Bottlerocket 预置消除了镜像拉取，但权重仍要从快照载入 HBM。若快照支持的 NVMe 读取速度为 7 GB/s，计算 70B 模型的实际墙钟时间。
4. 你的无服务器提供方支持 GPU 快照（Modal），团队却因“快照会泄露 PII”而拒绝。请论证双方立场：现实风险是什么，缓解措施是什么（短暂快照、加密、命名空间隔离）？
5. 设计分层预热池策略：付费用户、试用用户和批处理工作负载各需要多少预热副本？展示计算过程。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| 冷启动 | “长时间停顿” | 新副本从收到请求到首 token 的时间 |
| 预热池 | “始终在线的最小容量” | `min_workers >= 1`，保持至少一个副本就绪 |
| 预置镜像 | “烘焙 AMI” | 其容器权重已预先驻留的节点镜像 |
| Bottlerocket | “AWS 节点操作系统” | 支持双卷快照的 AWS 面向容器操作系统 |
| 模型流式加载器 | “流式加载” | 让权重 I/O 与计算设置重叠 |
| GPU 快照 | “checkpoint 到 HBM” | 序列化加载后的 GPU 状态；重启时反序列化 |
| 分层加载 | “NVMe + DRAM + HBM” | 存储层级；按需加载 |
| 实时迁移 | “迁移 token” | 传输输入（KB），在目标端重新计算 KV |
| `min_workers` | “预热副本” | 无服务器的最小保活计数 |
| 缩容至零 | “完全无服务器” | 空闲时无成本；接受完整冷启动税 |

## 延伸阅读

- [Modal — Cold start performance](https://modal.com/docs/guide/cold-start) — Modal 公开的基准和 checkpoint 架构。
- [AWS Bottlerocket](https://github.com/bottlerocket-os/bottlerocket) — 预置数据卷快照模式。
- [NVIDIA Run:ai Model Streamer](https://github.com/run-ai/runai-model-streamer) — 将权重加载与计算设置重叠。
- [Baseten — Cold-start mitigation](https://www.baseten.co/blog/cold-start-mitigation/) — 预热实战手册。
- [ServerlessLLM paper (USENIX OSDI'24)](https://www.usenix.org/conference/osdi24/presentation/fu) — 分层加载设计。
- [NVIDIA — Disaggregated LLM Inference on Kubernetes](https://developer.nvidia.com/blog/deploying-disaggregated-llm-inference-workloads-on-kubernetes/) — 面向解耦部署的实时迁移。
