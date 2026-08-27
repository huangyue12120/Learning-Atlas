---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: d943ab93bb3eec4cfa71885f27605a94003af7e640462b0cadaad78a93f24ffd
status: reviewed
---

# 生产中的 EAGLE-3 推测解码

> 推测解码将快速草稿模型与目标模型配对。草稿提出 K 个 token；目标模型用一次前向传播验证；被接受的 token 近乎免费。2026 年，EAGLE-3 是生产级变体——它在目标模型隐藏状态而不是原始 token 上训练草稿头，使通用聊天中的接受率 alpha 进入 0.6–0.8 区间。正确问题不是“草稿有多快”，而是“我的流量上的 alpha 是多少？”若 alpha 在高并发下低于约 0.55，推测解码会净负收益，因为每个被拒绝草稿都需要第二次目标模型前向传播。本课教你先测 alpha，再打开标志。

**类型：** 学习
**语言：** Python（标准库，玩具接受率模拟器）
**前置要求：** 第 17 阶段 · 04（服务引擎内部机制），第 10 阶段 · 18（多 token 预测）
**用时：** 约 60 分钟

## 学习目标

- 说出推测解码的三代，并解释 EAGLE-3 相对 EAGLE-2 和经典草稿模型的改变。
- 定义接受率 alpha，根据 alpha 与 K（草稿长度）计算期望加速，并识别目标并发度下的盈亏平衡 alpha。
- 解释为何推测解码在 2026 年 vLLM 中是可选项（不是默认项），以及未测 alpha 直接开启为何是生产反模式。
- 写出测量计划：哪个基准、哪个提示词分布、哪个并发点、按什么指标设门槛。

## 问题

Decode 受内存带宽限制。在运行 Llama 3.3 70B FP8 的 H100 上，每个 decode token 读取约 140 GB/s 权重并输出一个 token。decode 期间 GPU 计算几乎闲置——瓶颈是 HBM 带宽，而非矩阵乘法吞吐量。

推测解码利用这个缺口。先用便宜的草稿模型生成 K 个候选 token，再让目标模型通过一次前向传播验证全部 K 个。每个已验证 token 的边际成本近乎为零（被均摊进目标模型本来就要完成的 batch-of-K 前向传播）。

经典草稿模型方法使用同家族更小模型（Llama 3.2 1B 为 Llama 3.3 70B 草拟）。它能工作，但接受率一般——小模型分布与目标模型偏离。EAGLE、EAGLE-2、EAGLE-3 则直接在目标模型内部状态上训练轻量草稿头，使草稿分布更贴近目标。因此 alpha 会从草稿模型的 0.4 上升到 EAGLE-3 的 0.6–0.8。

问题在于：EAGLE-3 在 2026 年 vLLM 中是选择加入。必须显式设置 `speculative_config`，没有此设置就没有加速。团队若不在真实流量上测 alpha 就打开它，常会看到尾延迟变差而非变好。

## 概念

### 推测解码实际获得什么

没有推测解码时，每 token 成本为一次目标模型前向传播。草稿长度 K、接受率 alpha 时，每次目标前向传播的期望 token 数为 `1 + K * alpha`。加速比为 `(1 + K * alpha) / (1 + epsilon)`，其中 epsilon 是草稿加验证开销。K=5、alpha=0.7 时：`(1 + 5*0.7) / (1 + 0.1) = 4.5 / 1.1 = 4.1x`。真实世界通常聚集在 2–3 倍，因为生产流量上的 alpha 很少这么高，且 epsilon 会随批次变大而增长。

### 为什么 alpha 是唯一重要的指标

被拒绝的 token 不会消失——它们迫使目标模型对第一个被拒 token 再做一次前向传播。alpha 降至 0.4 的工作负载，会支付草稿开销、验证开销和重新采样开销。在高并发（如 256 并发）下，decode 批次已经足够大，使“仅目标模型”与“目标模型加验证”的内存带宽差距缩小。在大多数 2026 硬件上，alpha 低于 0.55 时，推测解码为净负收益。

Alpha 随工作负载变化。在 ShareGPT 风格通用聊天上，使用 ShareGPT 训练的 EAGLE-3 可达到 0.6–0.8。对于领域流量（代码、医疗、法律），在通用数据上训练的草稿头降至 0.4–0.6。训练领域专用草稿头可恢复 alpha——相对目标模型微调，它是轻量、快速的训练任务。

### EAGLE 各代一览

- **经典草稿模型：** 同家族的小模型。Alpha 为 0.3–0.5。基础设施简单：加载两个模型，草稿在每次目标前向之间运行 K 次前向。
- **EAGLE-1（2024）：** 在目标隐藏状态（最后一层）上训练单草稿头。Alpha 约 0.5–0.6。在目标模型上增加少量参数开销。
- **EAGLE-2（2025）：** 自适应草稿长度和树形草稿（一次目标模型传递验证多个分支）。Alpha 约 0.6–0.7。草稿调度器更复杂。
- **EAGLE-3（2025–2026）：** 在多个目标层（而非仅最后一层）上训练草稿头，对齐更好。通用聊天 alpha 约 0.6–0.8。

### 2026 年生产配方

1. 原样发布目标模型。在目标并发度下测量基线 TTFT、ITL、吞吐量。
2. 通过 vLLM `speculative_config` 启用 EAGLE-3 草稿，重新运行基准。
3. 记录接受率 alpha。vLLM V1 将其报告为 `spec_decode_metrics.accepted_tokens_per_request`；用它除以请求的草稿长度得到 alpha。
4. 若生产流量分布上的 alpha < 0.55，则禁用推测解码或训练领域专用 EAGLE-3 草稿。
5. 在生产并发下重新运行，确认 P99 ITL 没有变差。

### 生产陷阱：P99 尾部

推测解码可降低平均 ITL。若不调优，P99 反而可能变差。被拒绝草稿触发两次传递序列（草稿 + 验证失败 + 重新采样）；在满批次下，这两次传递串行。监测 P99 ITL，而不是 P50。

### EAGLE-3 已部署在哪里

Google 于 2025 年在 AI Overviews 中部署推测解码（相同质量、更快响应）。vLLM V1 将 `speculative_config` 作为有文档的接口；V1 中 N-gram GPU 推测解码是与分块 prefill 兼容的变体。SGLang 支持 EAGLE-3，推荐将其作为前缀密集工作负载的草稿路径。

### 一行盈亏平衡数学

期望加速为 `S(alpha, K) = (1 + K*alpha) / (1 + verify_overhead)`。令 `S = 1`，解得 alpha：`alpha_breakeven = verify_overhead / K`。典型 `verify_overhead ~0.15`、K=5 时：`alpha_breakeven = 0.03`。但这是原始 decode 数学。高并发下验证开销上升，decode 批次已跨序列均摊内存读取，实践中有效 `alpha_breakeven` 升至约 0.45–0.55。

### 何时不使用推测解码

- 延迟不重要的 batch-1 离线生成，使用普通目标模型。
- 极短输出（少于 50 token），草稿与验证成本占主导。
- 没有领域训练草稿头的专门领域，alpha 过低。
- vLLM v0.18.0 加草稿模型推测解码加 `--enable-chunked-prefill`，该组合无法编译。文档例外是 V1 中的 N-gram GPU 推测解码。

```figure
mx-speculative-tree
```

## 使用

`code/main.py` 在一系列 alpha 值和草稿长度 K 下，模拟有无推测解码的 decode 循环。它会打印盈亏平衡 alpha、测得加速和尾部行为。用多个（alpha、K）组合运行，可精确看到推测解码何时不再划算。

## 交付

本课产出 `outputs/skill-eagle3-rollout.md`。给定目标模型、流量分布描述和并发目标，它会生成分阶段 EAGLE-3 推出计划：基准基线、启用配置、测量 alpha、以 alpha >= 0.55 为门槛，并监测 P99 ITL。

## 练习

1. 运行 `code/main.py`。K=5 时，达到 2 倍加速需要什么 alpha？3 倍呢？它对 `verify_overhead` 有多敏感？
2. 假设生产流量中 70% 是通用聊天、30% 是代码。用 ShareGPT 训练的 EAGLE-3 使通用聊天 alpha 为 0.7，代码为 0.4。混合 alpha 是多少，推测解码是否净正收益？
3. 阅读 vLLM `speculative_config` 文档。说出三种模式（草稿模型、EAGLE、N-gram）以及哪一种与分块 prefill 兼容。
4. 启用 EAGLE-3 后，你看到平均 ITL 下降 25%，但 P99 ITL 上升 15%。诊断并提出缓解措施。
5. 计算 Llama 3.3 70B 的 EAGLE-3 草稿头内存成本。它与将 Llama 3.2 1B 作为经典草稿模型相比如何？

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| 推测解码 | “草稿加验证” | 用便宜模型提出 K 个 token，由一次目标模型前向验证全部 K 个。 |
| 接受率 alpha | “推测接受率” | 目标模型接受的草稿 token 比例；唯一重要的指标。 |
| 草稿长度 K | “spec k” | 每次目标前向前草稿提出的 token 数；典型为 4–8。 |
| 验证开销 epsilon | “推测开销” | 相对普通目标前向的验证和重新采样额外成本；随批次增大。 |
| EAGLE-3 | “最新 EAGLE” | 2025–2026 变体；在多个目标层训练草稿头；通用聊天 alpha 0.6–0.8。 |
| `speculative_config` | “vLLM 推测配置” | vLLM V1 中显式选择加入；未配置就没有加速。 |
| N-gram 推测解码 | “N-gram 草稿” | 通过提示词中的 N-gram 查询在 GPU 侧草拟；与分块 prefill 兼容。 |
| 盈亏平衡 alpha | “无收益 alpha” | 推测解码速度提升为零时的 alpha；需在生产并发下观察。 |
| 拒绝草稿的两次传递 | “重新采样成本” | 草稿被拒时需要两次目标模型前向，驱动 P99 尾部。 |

## 延伸阅读

- [vLLM — Speculative Decoding docs](https://docs.vllm.ai/en/latest/features/spec_decode/) —— vLLM V1 中 `speculative_config` 及分块 prefill 兼容性的权威来源
- [vLLM Speculative Config API](https://docs.vllm.ai/en/latest/api/vllm/config/speculative/) —— 精确字段集
- [EAGLE paper (arXiv:2401.15077)](https://arxiv.org/abs/2401.15077) —— 原始 EAGLE 草稿头表述
- [EAGLE-2 paper (arXiv:2406.16858)](https://arxiv.org/abs/2406.16858) —— 自适应草稿与树
- [UC Berkeley EECS-2025-224](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2025/EECS-2025-224.html) —— 采用推测解码的高效 LLM 系统
- [BentoML — Speculative Decoding](https://bentoml.com/llm/inference-optimization/speculative-decoding) —— 生产推出检查表
