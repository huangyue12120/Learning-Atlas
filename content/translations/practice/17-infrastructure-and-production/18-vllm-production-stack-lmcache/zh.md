---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 168b69324a9de7a0789e3280e3358e2ed84ca72d0b01cc68cbb5325463d85b35
status: reviewed
---

# 生产服务栈：KV 卸载与缓存感知路由

> 生产服务栈将路由器、引擎和可观测性连接为一个 Kubernetes 部署，并将 KV 缓存视为可离开 GPU 的资源。KV 卸载将 KV 缓存从 GPU 内存取出，在查询和引擎之间复用（先是 CPU DRAM，再到磁盘/Ceph）。vLLM 的 production-stack 是参考部署，LMCache 是卸载层。vLLM 0.11.0 KV Offloading Connector（2026 年 1 月）通过 Connector API（v0.9.0+）实现异步且可插拔的能力。卸载路径通常隐藏在请求路径之外，但缓存未命中和晋升仍可能增加端到端延迟。LMCache 即使没有共享前缀也很有价值——当 GPU 耗尽 KV 槽位时，被抢占的请求可从 CPU 恢复而非重新计算 prefill。在 4 个 a3-highgpu-4g 上、16 张 H100（80GB HBM）的公开基准中：当 KV 缓存超过 HBM 时，原生 CPU 卸载和 LMCache 都显著提高吞吐量；KV 占用较低时，所有配置与基线一致，仅有少量开销。

**类型：** 学习
**语言：** Python（标准库，用于模拟 KV 溢出的玩具程序）
**前置要求：** 第 17 阶段 · 04（服务引擎内部机制），第 17 阶段 · 06（SGLang/RadixAttention）
**用时：** 约 60 分钟

## 学习目标

- 绘制 vLLM production-stack 层：路由器、引擎、KV 卸载、可观测性。
- 解释 KV Offloading Connector API（v0.9.0+），以及 0.11.0 的异步路径如何隐藏卸载延迟。
- 量化 LMCache CPU-DRAM 何时有帮助（KV > HBM），何时增加开销（KV 足够小、可装入 HBM）。
- 在给定部署约束时，于原生 vLLM CPU 卸载和 LMCache connector 之间选择。

## 问题

你的 vLLM 服务显示 GPU HBM 使用率达到 100%，每当并发上升就出现抢占事件。请求被驱逐、重新入队，同一个 2K-token 提示词在一分钟内被重新 prefill 四次。GPU 计算花在冗余 prefill 上；goodput 远低于原始吞吐量。

增加 GPU 的成本是线性增长，增加 HBM 不可能。但 CPU DRAM 很便宜——一个插槽有 512 GB+，延迟比 HBM 高几个数量级，但对“临时保持温热”的 KV 缓存已经足够。

LMCache 将 KV 缓存取出至 CPU DRAM，使被抢占请求能快速恢复，并让跨引擎的重复前缀共享缓存，无需每个引擎重复 prefill。

## 概念

### vLLM production-stack

`github.com/vllm-project/production-stack` 是参考 Kubernetes 部署：

- **Router**——缓存感知（第 17 阶段 · 11），消费 KV 事件。
- **Engines**——vLLM worker；每张 GPU 或每个 TP/PP 组一个。
- **KV cache offload**——LMCache 部署或原生 connector。
- **Observability**——Prometheus 抓取、Grafana 仪表盘、OTel trace。
- **Control plane**——服务发现、配置、滚动更新。

它作为 Helm chart + operator 交付。

### KV Offloading Connector API（v0.9.0+）

vLLM 0.9.0 引入 Connector API，以支持可插拔的 KV 缓存后端。引擎将块卸载给 connector，connector 存储它们（RAM、磁盘、对象存储、LMCache）。请求需要块时，connector 将其加载回来。

vLLM 0.11.0（2026 年 1 月）增加异步卸载路径——在通常情形下，卸载可在后台发生，因此引擎无需阻塞等待。端到端延迟和吞吐量仍依赖于工作负载形态、KV 缓存命中率和系统压力；vLLM 自己的说明指出，低命中率下自定义内核卸载可能降低吞吐量，且异步调度与推测解码存在已知交互问题。

### 原生 CPU 卸载与 LMCache

**原生 vLLM CPU 卸载：** 引擎本地，在主机 RAM 中保存 KV 块。实现快、没有网络跳转，但不能跨引擎。

**LMCache connector：** 集群级，在共享 LMCache server（CPU DRAM + Ceph/S3 层）保存块。任一引擎均可访问，已发布 16 张 H100 基准。

当单个引擎面临 HBM 压力时选择原生方式；当多个引擎共享前缀（具有共同系统提示词的 RAG、具有共享模板的多租户）时选择 LMCache。

### 基准行为

4 个 a3-highgpu-4g 上的 16 张 H100（80 GB HBM）测试：

- 低 KV 占用（短提示词、低并发）：所有配置与基线一致，LMCache 增加约 3–5% 开销。
- 中等占用：LMCache 开始帮助跨引擎的前缀复用。
- KV 超过 HBM：原生 CPU 卸载和 LMCache 均显著提高吞吐量；LMCache 因跨引擎共享而增益更大。

### LMCache 起决定性作用的场景

- 多租户服务：系统提示词跨租户共享。
- RAG：文档块跨查询重复。
- 在同一基座模型上的微调变体（LoRA）：复用基座模型 KV，减少冗余工作。
- 抢占密集型工作负载：从 CPU 恢复比重新 prefill 更便宜。

### 何时不应启用

- HBM 压力很小——付出开销却无收益。
- 短上下文（<1K token）——传输时间 > 重新 prefill。
- 单租户单提示词工作负载——没有可捕获的复用。

### 与解耦服务的集成

第 17 阶段 · 17 的解耦服务 + LMCache 会叠加：来自 prefill 池到 decode 池的 KV 传输若未被使用便落入 LMCache；后续查询从 LMCache 拉取。第 17 阶段 · 11 的缓存感知路由器可以路由到本地或 LMCache 共享缓存匹配的引擎。

### 应当记住的数字

- vLLM 0.9.0：Connector API 发布。
- vLLM 0.11.0（2026 年 1 月）：异步卸载路径；端到端延迟影响取决于工作负载、KV 命中率和系统压力（不是绝对保证）。
- 16 张 H100 基准：KV 占用超过 HBM 时 LMCache 有帮助。
- HBM 压力小：无收益时有 3–5% 开销。

```figure
zero-sharding
```

## 使用

`code/main.py` 模拟有无 LMCache 的抢占密集型工作负载，报告避免的重新 prefill、吞吐量增益和 HBM 利用率盈亏平衡点。

## 交付

本课产出 `outputs/skill-vllm-stack-decider.md`。给定工作负载形态和 vLLM 部署，它会在原生、LMCache 或均不选之间作出决定。

## 练习

1. 运行 `code/main.py`。LMCache 从哪一 HBM 利用率开始有回报？
2. 一个租户每小时在 200 个查询中共享一个 6K-token 系统提示词。计算每个租户预期 LMCache 节省。
3. LMCache server 是单点故障。设计 HA 策略（副本、回退至原生）。
4. LMCache 将数据存到运行在旋转磁盘上的 Ceph。对于 70B FP8 的 4K-token KV（500 MB），读取时间与重新 prefill 相比如何？
5. 请论证 vLLM 0.11.0 异步路径是否“免费”——开销藏在哪里？

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| Production-stack | “参考部署” | vLLM 的 Kubernetes Helm chart + operator |
| Connector API | “KV 后端接口” | vLLM 0.9.0+ 可插拔 KV 存储接口 |
| 原生 CPU 卸载 | “引擎本地溢出” | 将 KV 保存在同一引擎的主机 RAM |
| LMCache | “集群 KV 缓存” | 基于 CPU DRAM + 磁盘的跨引擎 KV 缓存服务器 |
| 0.11.0 async | “非阻塞卸载” | 卸载隐藏在引擎流之后 |
| 抢占 | “为腾出空间而驱逐” | HBM 满时对 KV 缓存进行调整 |
| 前缀复用 | “相同系统提示词” | 多个查询共享开头；缓存命中 |
| Ceph 层 | “磁盘层” | 缓存层级中 DRAM 之下的持久存储 |

## 延伸阅读

- [vLLM Blog — KV Offloading Connector (Jan 2026)](https://blog.vllm.ai/2026/01/08/kv-offloading-connector.html)
- [vLLM Production Stack GitHub](https://github.com/vllm-project/production-stack) — Helm chart + operator。
- [LMCache for Enterprise-Scale LLM Inference (arXiv:2510.09665)](https://arxiv.org/html/2510.09665v2)
- [LMCache GitHub](https://github.com/LMCache/LMCache) — Connector 实现。
- [vLLM 0.11.0 release notes](https://github.com/vllm-project/vllm/releases) — 异步路径细节。
