---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/11-multi-region-kv-locality/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 72bb6b7348dcafd19302c7df926e962813e62f28bd02eda99f2c267e6995c26d
status: reviewed
---

# 多区域 LLM 服务与 KV 缓存局部性

> 轮询负载均衡会主动损害带缓存的 LLM 推理。未落到持有其前缀的节点上的请求，要付出完整 prefill 成本——长提示词在 P50 约为 800 ms，而缓存命中约为 80 ms。2026 年的生产模式是缓存感知路由器（Rust 实现的 vLLM Router、llm-d router），它消费 KV 缓存事件，并按前缀哈希匹配路由。近期研究（GORGO）将跨区域网络延迟显式纳入路由目标。商业“跨区域推理”产品（Bedrock cross-region inference、GKE multi-cluster gateways）将推理视为黑箱——它们处理可用性，不处理 TTFT。JPMorgan 和 Mayo Clinic 在 2024 年 11 月进行了 us-east-1 故障切换，耗时约 22 分钟。灾难恢复的现实是：32% 的 LLM DR 失败源于团队备份了权重，却忘了 tokenizer 文件或量化配置。

**类型：** 学习
**语言：** Python（标准库，用于模拟前缀缓存感知路由器的玩具程序）
**前置要求：** 第 17 阶段 · 04（vLLM 服务），第 17 阶段 · 06（SGLang RadixAttention）
**用时：** 约 60 分钟

## 学习目标

- 解释轮询负载均衡为何破坏缓存推理，并量化 TTFT 代价。
- 绘制缓存感知路由器：输入（KV 缓存事件）、算法（前缀哈希匹配）、决胜规则（GPU 利用率）。
- 说出 LLM 的 32% DR 失败驱动因素（缺少 tokenizer 文件 / 量化配置），并给出三类文件的 DR 检查清单。
- 区分商业跨区域产品（Bedrock CRI、GKE Multi-Cluster Gateway）和 KV 感知路由。

## 问题

你的服务运行在 us-east-1、us-west-2 和 eu-west-1。你在前面放了一个采用轮询的 ALB。生产中的前缀缓存命中率降至 8%，TTFT P50 变为三倍。vLLM 日志显示每个请求都在支付完整 prefill 成本。

轮询对无状态服务最优。LLM 推理从设计上就是有状态的——KV 缓存编码了模型已见的一切内容。盲目路由，就是把请求路由到错误的缓存。

同时，团队有一个 DR 计划。你把模型权重跨区域备份到 S3。区域故障发生后，你尝试故障切换，副本却拒绝启动。你忘记 `tokenizer.json`、量化配置和 RoPE 缩放配置存放在另一个未同步的 bucket。

多区域 LLM 服务是缓存问题、路由问题和 DR 卫生问题——不是负载均衡器问题。

## 概念

### 缓存感知路由

请求携带提示词到达。路由器对前缀（比如前 512 个 token）做哈希；询问每个副本“你是否缓存了这个前缀？”。副本在分配和驱逐块时，会在 pub/sub 通道发布 KV 缓存事件。路由器选择匹配副本；若无人匹配，则退回按 GPU 利用率决胜。

**vLLM Router**（Rust，2026 年生产栈）：订阅 `kv.cache.block_added` 事件，维护前缀哈希 → 副本索引，并以 O(1) 查找路由。若无匹配，退回到队列深度最小者。

**llm-d router：** 相同模式，但原生面向 Kubernetes。它通过 ControlPlane API 发布事件。

**SGLang RadixAttention**（第 17 阶段 · 06）是副本内部的等价机制。跨副本路由严格发生在上游。

### 数字

对 2K-token 提示词、Llama 3.3 70B FP8、H100 的 TTFT P50：

- 缓存命中（同一副本、前缀驻留）：约 80 ms。
- 缓存未命中（冷 prefill）：约 800 ms。

相差 10 倍。如果路由器在副本间命中 60–80% 的前缀缓存，你就能以 N 副本容量逼近单副本性能；若命中 10%，则逼近朴素扩展。

### 跨区域有一个新约束——网络延迟

区域间 RTT：

- us-east-1 ↔ us-west-2：约 65 ms。
- us-east-1 ↔ eu-west-1：约 75 ms。
- us-east-1 ↔ ap-southeast-1：约 220 ms。

如果路由将 us-east-1 的请求发送到 ap-southeast-1 的热点前缀，省下的 prefill（800 → 80 ms）会被 440 ms 的往返时间压倒。GORGO（2026 年研究）把它明确化——联合最小化 `prefill_time + network_latency`，而不是只最小化 prefill。通常答案是保持区域内路由，除非巨大的多 MB 前缀使 prefill 占主导。

### 商业“跨区域推理”对此无能为力

AWS Bedrock cross-region inference 会在容量紧张时自动把请求路由到其他区域。它优化的是可用性，而非 TTFT，并将推理视为黑箱。GKE Multi-Cluster Gateway 也是一样——服务级故障切换，不了解 KV 缓存。

即使使用这些产品，你仍需要应用层缓存感知路由器。它们处理“us-east-1 着火了”的情况；缓存感知路由处理 TTFT 情况。

### DR 卫生——32% 的缺文件问题

广泛引用的 2026 年统计是：32% 的 LLM DR 失败发生在团队备份了权重，却忘记了：

- `tokenizer.json` 或 `tokenizer.model`
- 量化配置（`quantize_config.json`、AWQ scales、GPTQ zero-points）
- 模型专用配置（RoPE scaling、attention masks、chat templates）
- 引擎配置（`vllm_config.yaml`、采样默认值、LoRA adapter manifests）

修复方式是一个三类文件的最小 DR 清单：

1. HF 模型仓库下的所有文件（权重 + 配置 + tokenizer）。
2. 引擎专属服务配置。
3. 部署清单（K8s YAML、Dockerfile、依赖锁文件）。

此外：每季度运行一次 DR 演练。JPMorgan 的 us-east-1 演练在 2024 年 11 月达成 22 分钟恢复，只因为手册经过了演练。

### 数据驻留是正交约束

欧盟客户的 PHI 不能离开欧盟。如果缓存感知路由器为了前缀匹配，将来自巴黎的请求发往 us-east-1，不论 TTFT 收益如何，你都违反了 GDPR。优化缓存前，先按数据驻留边界划分路由器。

### 应当记住的数字

- 缓存命中和未命中的 TTFT 差距：约 10 倍（2K 提示词为 80 ms 对 800 ms）。
- 美欧区域间 RTT：约 75 ms。
- DR 失败：32% 缺少 tokenizer/量化配置。
- JPMorgan 2024 年 11 月 us-east-1 故障切换：22 分钟（30 分钟 SLA）。

```figure
cache-aware-router
```

## 使用

`code/main.py` 在多区域工作负载上模拟三种路由策略（轮询、缓存感知区域路由、缓存感知全局路由）。它会报告缓存命中率、TTFT P50/P99 和跨区域账单。

## 交付

本课产出 `outputs/skill-multi-region-router.md`。给定区域、数据驻留约束和 SLA，它会设计一份路由方案。

## 练习

1. 运行 `code/main.py`。在 RTT 为 75 ms 时，提示词长度达到多少时，跨区域路由会胜过仅本地路由？
2. 你的缓存命中率从 70% 降至 12%。诊断三种可能原因，以及能确认每种原因的可观测量。
3. 为一个在 vLLM 上服务、带有 5 个 LoRA adapter 的 70B AWQ 量化模型设计 DR 清单。列出每个文件和配置。
4. 请论证：对于拥有严格 TTFT SLO 的金融科技公司，Bedrock cross-region inference 是否“足够”。引用具体行为。
5. 来自巴黎的请求匹配到 us-east-1 的前缀。你会路由它吗？写出策略。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| 缓存感知路由 | “智能负载均衡” | 按前缀哈希将请求路由到持有 KV 缓存的副本 |
| KV 缓存事件 | “缓存 pub-sub” | 副本发布块新增/驱逐事件；路由器建立索引 |
| 前缀哈希 | “缓存键” | 用作路由器查找的前 N 个 token 的哈希 |
| GORGO | “跨区域路由研究” | arXiv 2602.11688；将网络延迟作为显式项 |
| 跨区域推理 | “Bedrock CRI” | AWS 产品；用于可用性故障切换，而非 TTFT 感知 |
| DR 清单 | “备份列表” | 恢复所需的每一个文件——不仅是权重 |
| 数据驻留 | “GDPR 边界” | 限制哪一个区域可以看到用户数据的法律约束 |
| RTT | “往返时间” | 网络延迟；美欧 75 ms、美亚太 220 ms |
| LLM 感知 LB | “缓存命中负载均衡” | 一类缓存感知路由器产品 |

## 延伸阅读

- [BentoML — Multi-cloud and cross-region inference](https://bentoml.com/llm/infrastructure-and-operations/multi-cloud-and-cross-region-inference)
- [arXiv — GORGO (2602.11688)](https://arxiv.org/html/2602.11688v1) — 带网络延迟项的跨区域 KV 缓存复用。
- [TianPan — Multi-Region LLM Serving Cache Locality](https://tianpan.co/blog/2026-04-17-multi-region-llm-serving-data-residency-routing)
- [AWS Bedrock Cross-Region Inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html) — 可用性故障切换文档。
- [vLLM Production Stack Router](https://github.com/vllm-project/production-stack) — 缓存感知路由器源代码。
