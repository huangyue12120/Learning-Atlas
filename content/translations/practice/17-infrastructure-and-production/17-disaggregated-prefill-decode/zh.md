---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 7de2bafd57d1d40820fbbb82fdb2284e3fb34c523cba8b1f7c05d05c50d55fed
status: reviewed
---

# 解耦的 Prefill/Decode：NVIDIA Dynamo 与 llm-d

> Prefill 受计算约束，decode 受内存约束。在同一 GPU 上运行两者，会浪费其中一种资源。解耦将它们拆分到独立的池，并通过 NIXL（RDMA/InfiniBand 或 TCP 回退）在它们之间传输 KV 缓存。NVIDIA Dynamo（2025 年 GTC 发布，1.0 GA）位于 vLLM/SGLang/TRT-LLM 之上——其 Planner Profiler + SLA Planner 自动匹配 prefill:decode 比例来满足 SLO。NVIDIA 发布了这一量级的吞吐量增益——developer.nvidia.com（2025-06）显示，在中延迟区间，GB200 NVL72 + Dynamo 上的 DeepSeek-R1 MoE 约提升 6 倍；Dynamo 产品页（developer.nvidia.com，未标日期）宣称 GB300 NVL72 + Dynamo 相比 Hopper 的 MoE 吞吐量最高可提升 50 倍。“30x”数字是完整 Blackwell + Dynamo + DeepSeek-R1 报告的社区汇总；我们未找到一份主要来源精确陈述 30x，因此应将其视为方向性主张。llm-d（Red Hat + AWS）原生面向 Kubernetes：prefill / decode / router 作为独立 Service，并分别使用 HPA。llm-d 0.5 新增分层 KV 卸载、缓存感知 LoRA 路由、UCCL 网络和 scale-to-zero。经济性方面：多份客户披露的内部汇总表明，在固定 SLA 下，从共置服务改为采用 Dynamo 解耦的 $2M 级推理支出可节省 30–40%（即 $600–800K/year）；具体的 $2M→$600–800K 数字是内部复合结果，并非单一公开案例研究——应作为数量级锚点，而非参考引文。短提示词（<512 token、短输出）无法证明传输成本合理。

**类型：** 学习
**语言：** Python（标准库，用于模拟解耦与共置服务的玩具程序）
**前置要求：** 第 17 阶段 · 04（服务引擎内部机制），第 17 阶段 · 08（推理指标）
**用时：** 约 75 分钟

## 学习目标

- 解释为什么 prefill 和 decode 的最优 GPU 配置不同，并量化共置下的浪费。
- 绘制解耦架构：prefill 池、decode 池、通过 NIXL 的 KV 传输、路由器。
- 说出解耦不划算的条件（短提示词、短输出）。
- 区分 NVIDIA Dynamo（栈上层）与 llm-d（Kubernetes 原生），并为每个匹配运维环境。

## 问题

你在 8 张 H100 上运行 Llama 3.3 70B。面对混合工作负载（长提示词 + 短输出）时，GPU 在 decode 期间闲置，因为大部分计算已花在 prefill。换一类工作负载（短提示词 + 长输出）则相反。共置 prefill + decode 意味着你会为两者都过度供给。

预算影响是：20–40% 的 GPU 时间浪费在错误的资源上。你购买 H100 计算来运行受内存约束的 decode，或购买 H100 HBM 带宽来运行受计算约束的 prefill，二者都是昂贵浪费。

解耦会将 prefill 和 decode 拆分至独立池，并根据各自瓶颈定尺寸。KV 缓存通过高带宽互连从 prefill 池传输至 decode 池。

## 概念

### 为什么瓶颈不同

**Prefill**——在一次前向传播中让 Transformer 运行完整输入提示词。矩阵乘法占主导，受计算约束。H100 FP8 提供约 2000 TFLOPS 的有效吞吐量。批处理效率很高——一次前向传播可处理许多 token。

**Decode**——一次生成一个 token，每次迭代都读取完整权重，受内存带宽约束。HBM3 提供约 3 TB/s。只有在高并发下批处理效率才高——权重读取可在批次间摊销。

共置二者意味着：购买针对两种目标都优化的 GPU。H100 两者都很擅长，但无论用于哪一种成本相同。大规模时，希望让 prefill 池采用 H100 / 计算密集型，decode 池采用 H200 / 内存密集型，或采用激进量化。

### 架构

```
            ┌──────────────┐
  请求   → │    路由器    │ ───────────────────────┐
            └──────┬───────┘                        │
                   │                                │
                   ▼（仅提示词）                    │
            ┌──────────────┐    KV 缓存     ┌───────▼──────┐
            │ Prefill 池   │ ─── NIXL ────► │ Decode 池    │
            │  （计算）    │                │  （内存）    │
            └──────────────┘                └──────┬───────┘
                                                   │ token
                                                   ▼
                                                 客户端
```

NIXL 是 NVIDIA 的跨节点传输机制。在可用时使用 RDMA/InfiniBand，否则 TCP 回退。传输延迟不可忽略：对于 70B FP8 的 4K-token 提示词 KV 缓存，通常为 20–80 ms。因此，短提示词不值得解耦，因为传输税会超过节省。

### Dynamo 与 llm-d

**NVIDIA Dynamo**（2025 年 GTC 发布，1.0 GA）：

- 作为编排器，位于 vLLM、SGLang、TRT-LLM 之上。
- Planner Profiler 测量工作负载，SLA Planner 自动配置 prefill:decode 比例。
- Rust 核心，Python 可扩展。
- 吞吐量收益：NVIDIA 报告，在中延迟区间，GB200 NVL72 + Dynamo 上的 DeepSeek-R1 MoE 为 6 倍（developer.nvidia.com，2025-06）；关于完整 Blackwell + Dynamo + DeepSeek-R1 栈“最高 30 倍”的社区报告缺乏单一主要来源，应视为方向性结论。
- 根据 Dynamo 产品页（developer.nvidia.com，未标日期），GB300 NVL72 + Dynamo 的 MoE 吞吐量可比 Hopper 高至 50 倍。

**llm-d**（Red Hat + AWS，Kubernetes 原生）：

- Prefill / decode / router 是独立 Kubernetes Service。
- 按角色使用 HPA：以队列深度（prefill）/ KV 利用率（decode）为信号。
- `topologyConstraint packDomain: rack` 将 prefill+decode 组部署在同一机架，以实现高带宽 KV 传输。
- llm-d 0.5（2026）：分层 KV 卸载、缓存感知 LoRA 路由、UCCL 网络、scale-to-zero。

若你想要受管的栈上层编排器，使用 Dynamo；若你想要 Kubernetes 原生原语且已承诺 CNCF 生态，使用 llm-d。

### 经济性

内部复合数据（不是单一公开案例研究——数量级锚点）：

- 共置服务的年度推理支出 $2M。
- 切换至采用 Dynamo 的解耦服务。
- 相同请求量，相同 P99 延迟 SLA。
- 报告节省：$600K–$800K/year（降低 30–40%）。
- 无新增硬件。

这个数字来自多份客户披露的综合，而非一份可引用的案例研究；最接近的公开数据点是 Baseten 使用 Dynamo KV 路由后 TTFT 快 2 倍 / 吞吐量高 61%（baseten.co，2025-10），以及 VAST + CoreWeave 对 KV 命中率为 40–60% 时每美元 token 多出 60–130% 的预测（vastdata.com，2025-12）。节省来自为各池正确设定规模；prefill 密集型工作负载（具有 8K+ 前缀的 RAG）比均衡负载获益更多。

### 何时不应解耦

- 提示词 < 512 token 且输出 < 200 token：传输税主导收益。
- 小集群（< 4 GPU）：没有足够的池多样性。
- 团队无法运维两个带按角色扩缩容的 GPU 池：Dynamo 有帮助，但并非轻而易举。
- 没有 RDMA fabric：TCP 传输税更重。

### 路由器与第 17 阶段 · 11 集成

解耦路由器具有 KV 缓存感知能力（第 17 阶段 · 11）。请求会落到持有其前缀的 decode 池；若没有匹配，则流经 prefill → decode。命中率和解耦会相互叠加——缓存感知路由器决定是否甚至需要新的 prefill。

### Blackwell 上的 MoE 才有真正的数字

GB300 NVL72 + Dynamo 相对 Hopper 基线显示 50 倍 MoE 吞吐量。MoE 专家路由在 prefill 期间计算密集，在 decode 期间内存密集（专家缓存），因此解耦是双重收益。2026 年前沿模型服务以 MoE 为主（DeepSeek-V3、未来 GPT-5 变体）。

### 应当记住的数字

基准数字会漂移——NVIDIA 和推理栈每季度都会发布更新结果。引用前请重新核验。

- GB200 NVL72 + Dynamo 上的 DeepSeek-R1：中延迟区间相对基线约 6 倍吞吐量（developer.nvidia.com，2025-06）；完整 Blackwell + Dynamo 栈的社区“最高 30 倍”主张是没有单一主要来源的方向性汇总。
- GB300 NVL72 + Dynamo：相对 Hopper 的 MoE 吞吐量最高 50 倍（developer.nvidia.com，未标日期）。
- 节省锚点（内部复合数据，不是单一案例研究）：在恒定 SLA 下，每年 $2M 支出减少 $600–800K/year。
- 解耦阈值：提示词 >512 token + 输出 >200 token。
- 通过 NIXL 的 KV 传输：70B FP8 上 4K 提示词 KV 为 20–80 ms。

```figure
prefill-decode-split
```

## 使用

`code/main.py` 模拟共置与解耦服务，报告吞吐量、每请求成本和提示词长度交叉点。

## 交付

本课产出 `outputs/skill-disaggregation-decider.md`。给定工作负载和集群，它会决定是否解耦。

## 练习

1. 运行 `code/main.py`。提示词长度到多少时，解耦会胜过共置？
2. 为一个 RAG 服务设计 prefill 池和 decode 池：其 P99 前缀长度为 8K，输出为 300。
3. Dynamo 对比 llm-d：对于不偏好 Python 运行时的纯 Kubernetes 团队，选择一个。
4. 计算 KV 传输成本：70B FP8 上 4K prefill = 约 500 MB KV。在 RDMA 100 GB/s 下，传输 = 5 ms；在 TCP 10 GB/s 下 = 50 ms。哪一个对你的 SLA 有影响？
5. MoE 专家路由改变 KV 访问模式。解耦面对每 token 激活不同专家的 MoE 时表现如何？

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| 解耦服务 | “拆分 prefill/decode” | 为每个阶段使用独立 GPU 池 |
| NIXL | “NVIDIA 传输” | Dynamo 的跨节点 KV 传输（RDMA/TCP） |
| NVIDIA Dynamo | “编排器” | vLLM/SGLang/TRT-LLM 的栈上层协调器 |
| llm-d | “Kubernetes 原生” | Red Hat + AWS 的 K8s 解耦栈 |
| Planner Profiler | “Dynamo 自动配置” | 测量工作负载、配置池比例 |
| SLA Planner | “Dynamo 策略” | 自动匹配 prefill:decode 以满足 SLO |
| `packDomain: rack` | “llm-d 拓扑” | 将 prefill+decode 部署在同机架，以快速传输 KV |
| UCCL | “统一集合通信” | llm-d 0.5 面向 scale-to-zero 的网络层 |
| MoE 专家路由 | “每 token 一个专家” | DeepSeek-V3 模式；解耦有帮助 |

## 延伸阅读

- [NVIDIA — Introducing Dynamo](https://developer.nvidia.com/blog/introducing-nvidia-dynamo-a-low-latency-distributed-inference-framework-for-scaling-reasoning-ai-models/)
- [NVIDIA — Disaggregated LLM Inference on Kubernetes](https://developer.nvidia.com/blog/deploying-disaggregated-llm-inference-workloads-on-kubernetes/)
- [TensorRT-LLM Disaggregated Serving blog](https://nvidia.github.io/TensorRT-LLM/blogs/tech_blog/blog5_Disaggregated_Serving_in_TensorRT-LLM.html)
- [llm-d GitHub](https://github.com/llm-d/llm-d)
- [llm-d 0.5 release notes](https://github.com/llm-d/llm-d/releases)
