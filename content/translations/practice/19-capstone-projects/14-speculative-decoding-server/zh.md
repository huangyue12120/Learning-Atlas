---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/14-speculative-decoding-server/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 85be34aa5856a391ad5debe03b5f115ea202c610888904d34322be76145891f7
status: reviewed
---

# 毕业项目 14——推测解码推理服务器

> 推测解码——廉价的草稿模型提出词元，目标模型一次前向就验证它们——如今已是可用于生产的优化，而不是研究技巧。vLLM 0.7 中的 EAGLE-3 在真实流量上提供 2.5–3 倍吞吐。P-EAGLE（AWS 2026）进一步推进了并行推测。SGLang 的 SpecForge 可以大规模训练草稿头，Red Hat 的 Speculators hub 发布了常见开放模型的对齐草稿，TensorRT-LLM 也把推测解码设为 NVIDIA 上的一等能力。2026 年的生产服务栈是带 EAGLE 系列草稿、FP8 或 INT4 量化，以及按队列等待设置 HPA 的 vLLM 或 SGLang。本毕业项目要求你以基线吞吐 2.5 倍以上为目标服务两个开放模型，并提交完整的尾部延迟报告。

**类型：** 毕业项目
**语言：** Python（服务）、C++ / CUDA（内核检查）、YAML（配置）
**前置课程：** 第 3 阶段（深度学习）、第 7 阶段（Transformer）、第 10 阶段（从零实现 LLM）、第 17 阶段（基础设施）
**涉及阶段：** P3 · P7 · P10 · P17
**用时：** 30 小时

## 问题

推测解码在 2026 年已经成为商品化能力。EAGLE-3 草稿头在目标模型的隐藏状态上训练，并预测后面的 N 个词元；目标模型一次前向完成验证。60–80% 的接受率可以转化为 2–3 倍端到端吞吐。vLLM 0.7 原生集成了它，SGLang + SpecForge 提供训练流水线，Red Hat 的 Speculators 为 Llama 3.3 70B、Qwen3-Coder-30B MoE 和 GPT-OSS-120B 发布对齐草稿。

工程重点在服务运维，而不是模型。接受率会随着流量分布变化（ShareGPT、代码或领域数据不同而不同）。拒绝时的尾延迟可能比不使用推测更差——你必须在多个 batch size 下报告 p99，而不能只报告稳定状态下的 tokens/sec。与 Anthropic / OpenAI API 比较每 100 万词元美元成本，是证明方案可信度的关键。

## 概念

推测解码有两层。**草稿模型**（EAGLE-3 head、ngram 或与目标对齐的小模型）每一步提出 k 个候选词元。**目标模型**一次前向验证这 k 个词元；任何被接受的前缀都会替代贪心路径。接受率取决于草稿—目标对齐程度和输入分布。

EAGLE-3 在大多数流量上优于 ngram 草稿。P-EAGLE 进行并行推测，以探索更深的草稿树。代价是拒绝时的 P99 延迟更高，因为验证前向规模更大。服务配置必须报告按 batch size 分桶的延迟，才能暴露这一点。

部署使用 Kubernetes。vLLM 0.7 为每个 GPU 或张量并行分片运行一个副本。HPA 根据队列等待而不是 CPU 自动扩缩。FP8（Marlin）和 INT4（AWQ）量化让 GPU 内存保持在 H100 / H200 容量范围内。端到端报告包括吞吐、接受率、batch 1/8/32 下的 p50/p99，以及每 100 万词元美元成本。

## 架构

```text
请求入口
    |
    v
vLLM 服务器（0.7）或 SGLang（0.4）
    |
    +-- 草稿：EAGLE-3 头 | P-EAGLE 并行 | ngram 回退
    +-- 目标：Llama 3.3 70B | Qwen3-Coder-30B | GPT-OSS-120B
    |     FP8-Marlin 或 INT4-AWQ 量化
    |
    v
验证前向：将 batch k 个草稿词元送入目标模型
    |
    v（接受前缀；对拒绝的后缀重新采样）
    v
将词元流返回客户端
    |
    v
Prometheus 指标：吞吐、接受率、队列等待、延迟 p50/p99
    |
    v
按队列等待指标设置 HPA
```

## 技术栈

- 服务：vLLM 0.7 或 SGLang 0.4
- 推测方法：EAGLE-3 草稿头、P-EAGLE 并行推测、ngram 回退
- 草稿训练：SpecForge（SGLang）或 Red Hat Speculators
- 目标模型：Llama 3.3 70B、Qwen3-Coder-30B MoE、GPT-OSS-120B
- 量化：FP8（Marlin）、INT4 AWQ
- 部署：Kubernetes + NVIDIA device plugin；按队列等待指标设置 HPA
- 评测：ShareGPT、MT-Bench-v2、GSM8K、HumanEval，用于测量领域分布上的接受率
- 参考：TensorRT-LLM 推测解码，作为厂商基线

```figure
cf-spec-decode
```

## 动手构建

1. **准备目标模型。** 选择 Llama 3.3 70B，通过 Marlin 量化为 FP8。在 1xH100（或 2x 张量并行）上用 vLLM 0.7 部署。

2. **准备草稿来源。** 从 Red Hat Speculators 拉取对齐的 EAGLE-3 草稿头（或通过 SpecForge 训练一个），加载到 vLLM 的推测解码配置。

3. **基线数据。** 在未启用推测前测量 batch 1/8/32 下的 tokens/s、p50/p99 延迟和 GPU 利用率，并发布结果。

4. **启用 EAGLE-3。** 打开配置，重新运行同一 benchmark。报告加速比、接受率和 p99 尾延迟差值。

5. **P-EAGLE。** 启用并行推测，比较更深的草稿树和串行 EAGLE-3。报告 P-EAGLE 开始有帮助和开始有害的拐点。

6. **领域流量。** 让 ShareGPT、HumanEval 和领域专用流量通过同一服务器。按分布测量接受率，找出草稿发生漂移的时机。

7. **第二个目标模型。** 在 Qwen3-Coder-30B MoE 上运行同一流水线。草稿更难处理，因为 MoE 路由带来噪声。报告结果。

8. **K8s HPA。** 在 K8s 上部署，并让 HPA 追踪 queue_wait_ms。证明负载增加到三倍时系统会扩容。

9. **成本比较。** 在同一评测上计算相对于 Anthropic Claude Sonnet 4.7 和 OpenAI GPT-5.4 的每 100 万词元美元成本，并发布结果。

## 实际使用

```text
$ curl https://infer.example.com/v1/chat/completions -d '{"messages":[...]}'
[serve]     vLLM 0.7, Llama 3.3 70B FP8, EAGLE-3 active
[decode]    bs=8, accepted_tokens_per_step=3.2, acceptance_rate=0.76
[latency]   first-token 42ms, full-response 980ms (620 tokens)
[cost]      $0.34 per 1M output tokens at sustained throughput
```

## 交付

交付物 outputs/skill-inference-server.md 描述了一个带推测解码、完整 benchmark 报告和 K8s 部署的、经过测量的服务栈。

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | 相对基线的实测加速 | 两个模型在质量匹配时达到 2.5 倍以上吞吐 |
| 20 | 真实流量上的接受率 | 按分布报告接受率 |
| 20 | P99 尾延迟纪律 | 比较启用和不启用推测时 batch 1/8/32 的 p99 |
| 20 | 运维 | K8s 部署、按队列等待设置 HPA、发布平滑 |
| 15 | 说明与方法 | 清楚说明改了什么以及为什么 |
| **100** | | |

## 练习

1. 当草稿比目标模型落后一个版本时，测量接受率退化（例如 Llama 3.3 -> 3.4 漂移），并建立监控告警。

2. 实现 ngram 回退：如果 EAGLE-3 接受率低于阈值，就切换到 ngram 草稿。报告可靠性提升。

3. 运行受控 MoE 实验：比较注入路由噪声与不注入时的同一个 Qwen3-Coder-30B。测量草稿接受率的敏感性。

4. 扩展到 H200（141 GB）。报告获得的每副本模型规模余量，以及是否可以服务未量化的 Llama 3.3 70B。

5. 在同样的 H100 硬件上对 TensorRT-LLM 推测解码做 benchmark，报告它相对 vLLM 的优势所在。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Draft model | “推测器” | 提出 N 个词元、等待目标模型验证的小模型 |
| EAGLE-3 | “2026 草稿架构” | 在目标隐藏状态上训练的草稿头；接受率约 75% |
| P-EAGLE | “并行推测” | 在一次目标前向中验证的草稿分支树 |
| Acceptance rate | “命中率” | 无需重新采样就被接受的草稿词元比例 |
| Quantization | “FP8 / INT4” | 使用更低精度权重，让更多模型装入 GPU 内存 |
| Queue wait | “HPA 指标” | 请求在推理开始前于待处理队列中等待的时间 |
| Speculators hub | “对齐草稿” | Red Hat Neural Magic 为常见开放模型提供的 EAGLE 草稿 hub |

## 延伸阅读

- [vLLM EAGLE 和 P-EAGLE 文档](https://docs.vllm.ai)——参考服务技术栈
- [P-EAGLE（AWS 2026）](https://aws.amazon.com/blogs/machine-learning/p-eagle-faster-llm-inference-with-parallel-speculative-decoding-in-vllm/)——并行推测解码论文与集成
- [SGLang SpecForge](https://github.com/sgl-project/SpecForge)——草稿头训练流水线
- [Red Hat Speculators](https://github.com/neuralmagic/speculators)——对齐草稿 hub
- [TensorRT-LLM 推测解码](https://nvidia.github.io/TensorRT-LLM/)——厂商替代方案
- [Fireworks.ai 服务架构](https://fireworks.ai/blog)——商业参考
- [EAGLE-3 论文（arXiv:2503.01840）](https://arxiv.org/abs/2503.01840)——方法论文
- [vLLM 仓库](https://github.com/vllm-project/vllm)——代码和 benchmark
