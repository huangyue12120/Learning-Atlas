---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/09-production-quantization/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 426f95fbda1dff2cd772a878c671a4ac245e175f3af5fa4b5086d6eb0656ed63
status: reviewed
---

# 生产量化：AWQ、GPTQ、GGUF K-quant、FP8、MXFP4/NVFP4

> 量化格式不是放之四海而皆准的选择——它取决于硬件、服务引擎和工作负载。GGUF Q4_K_M 或 Q5_K_M 通过 llama.cpp 和 Ollama 主导 CPU 与边缘端。需要在同一基座模型上部署多 LoRA 时，GPTQ 在 vLLM 中胜出。配备 Marlin-AWQ 内核的 AWQ 在 7B 级模型上可达约 741 tok/s，并在 INT4 下拥有最佳 Pass@1，是 2026 年数据中心生产的默认选项。FP8 仍是 Hopper、Ada 和 Blackwell 上的中间地带——几乎无损且支持广泛。NVFP4 和 MXFP4（Blackwell 微缩放）很激进，必须按块验证。两个陷阱最容易让团队受挫：校准数据集必须匹配部署领域；KV 缓存与权重量化是分开的——“我的模型现在只有 4 GB”的 AWQ 教程忽略了生产批量下 10–30 GB 的 KV 缓存。

**类型：** 学习
**语言：** Python（标准库，用于比较不同格式内存与吞吐量的玩具程序）
**前置要求：** 第 10 阶段 · 13（量化基础），第 17 阶段 · 04（服务引擎内部机制）
**用时：** 约 75 分钟

## 学习目标

- 说出 2026 年六种生产量化格式及其最适合的场景。
- 根据硬件（CPU 或 GPU、Hopper 或 Blackwell）、引擎（vLLM、TRT-LLM、llama.cpp）和工作负载（常规聊天、推理、多 LoRA）选择格式。
- 计算选定格式节省的权重内存与未受影响的 KV 缓存。
- 说出会使量化模型在领域流量上退化的校准数据集陷阱。

## 问题

量化降低内存和 HBM 带宽，正是 decode 所需要的。一个 FP16 70B 模型的权重为 140 GB。将权重量化到 INT4（AWQ 或 GPTQ）后，模型为 35 GB——可放入单张 H100 并为 KV 缓存留出空间；这很重要，因为在 128 条并发序列、2k 上下文时，仅 KV 缓存就有 20–30 GB。

但量化并非免费。激进的量化会降低质量，尤其是在推理密集型任务上。不同格式与不同引擎搭配，不同硬件对不同精度有原生支持。2026 年的格式生态确实复杂，你不能照搬别人的选择——必须依据自己的栈来决定。

## 概念

### 六种格式

| 格式 | 位数 | 最适场景 | 引擎 |
|------|------|----------|------|
| GGUF Q4_K_M / Q5_K_M | 4–5 | CPU、边缘端、笔记本电脑 | llama.cpp、Ollama |
| GPTQ | 4–8 | vLLM 上的多 LoRA | vLLM、TGI |
| AWQ | 4 | 数据中心 GPU 生产 | vLLM（Marlin-AWQ）、TGI |
| FP8 | 8 | Hopper/Ada/Blackwell 数据中心 | vLLM、TRT-LLM、SGLang |
| MXFP4 | 4 | Blackwell 多用户 | TRT-LLM |
| NVFP4 | 4 | Blackwell 多用户 | TRT-LLM |

### GGUF——CPU/边缘端默认选项

GGUF 本身严格来说是文件格式，而不是量化方案——它在同一容器中打包 K-quant 变体（Q2_K、Q3_K_M、Q4_K_M、Q5_K_M、Q6_K、Q8_0）。Q4_K_M 和 Q5_K_M 是生产默认项——在 4–5 位下接近 BF16 质量。它是 CPU 或边缘端服务的最佳选择，因为 llama.cpp 是迄今最快的 CPU 推理引擎。

在 vLLM 中的吞吐量惩罚：7B 模型约 93 tok/s——该格式没有针对 GPU 内核优化。部署目标是 CPU/边缘端时使用 GGUF，其他情况不要使用。

### GPTQ——vLLM 中的多 LoRA

GPTQ 是带校准过程的训练后量化算法。Marlin 内核使其在 GPU 上运行得很快（相对于非 Marlin GPTQ 有 2.6 倍加速），7B 模型约 712 tok/s。

独特优势是：GPTQ-Int4 支持 vLLM 中的 LoRA 适配器。如果你要服务一个基座模型以及 10–50 个微调变体（每个是一个 LoRA），GPTQ 是你的路径。截至 2026 年初，NVFP4 尚不支持 LoRA。

### AWQ——数据中心 GPU 默认选项

激活感知权重量化（Activation-aware Weight Quantization）。它在量化时保护约 1% 最显著的权重。Marlin-AWQ 内核相较朴素实现可加速 10.9 倍；在 7B 模型上约 741 tok/s，并拥有 INT4 格式中最佳 Pass@1。

新的 GPU 服务请选择 AWQ，除非你需要多 LoRA（GPTQ）或激进的 Blackwell FP4（NVFP4）。

### FP8——可靠的中间选择

8 位浮点，几乎无损且支持广泛。Hopper Tensor Core 原生加速 FP8，Blackwell 也继承这一能力。当质量不能妥协（推理、医疗、代码生成）时，FP8 是安全的 2026 年默认项。其节省的内存只有 INT4 的一半，但质量风险低得多。

### MXFP4 / NVFP4——Blackwell 的激进选项

微缩放 FP4。每个权重块都有自己的缩放因子。在 Blackwell Tensor Core 上有硬件加速，且每 token 字节数可比 FP8 减半——这是第 17 阶段 · 07 中的经济性收益。

注意事项：

- 截至 2026 年初，尚不支持 LoRA。
- 在推理密集型工作负载上质量下降明显。
- 针对每个模型在你的评估集上验证。

### 校准陷阱

AWQ 和 GPTQ 需要校准数据集——通常是 C4 或 WikiText。对于领域模型（代码、医疗、法律），在通用网页文本上校准会让算法错误判断应保护哪些权重。HumanEval 的 Pass@1 可能下降数个百分点。

修复方式是用领域内数据校准。几百个领域样本通常已足够。交付前请在评估集上测试。

### KV 缓存陷阱

AWQ 将权重缩小到 4 位，而 KV 缓存是独立的，仍保持 FP16/FP8。对于采用 AWQ 的 70B 模型：

- 权重：约 35 GB（从 140 GB 的 INT4）。
- 在 128 并发 × 2k 上下文时，KV 缓存：约 20 GB。
- 激活值：约 5 GB。
- 总计：约 60 GB——可放入 H100 80GB。

天真地说“我将模型量化到 4 GB”忽略了另外 30–50 GB。必须整体预算 HBM。

此外，KV 缓存量化（FP8 KV 或 INT8 KV）是有自身取舍的另一项选择——它直接影响注意力精度，绝非免费收益。

### AWQ INT4 对推理有风险

思维链、数学、带长上下文的代码生成——这些任务都会因激进量化而明显受损。AWQ INT4 在 MATH 上会丢失约 3–5 分。对于推理密集型工作负载，应交付 FP8 或 BF16，并接受内存成本。

### 2026 年选择指南

- CPU/边缘端服务：GGUF Q4_K_M。到此为止。
- GPU 服务、常规聊天、无 LoRA：AWQ。
- GPU 服务、多 LoRA：使用 Marlin 的 GPTQ。
- 推理工作负载：FP8。
- Blackwell 数据中心、已验证质量：NVFP4 + FP8 KV。
- 情况不明确：对每种候选格式运行 1,000 样本评估。

```figure
gpu-memory-breakdown
```

## 使用

`code/main.py` 计算一系列模型规模在六种格式下的内存占用（权重 + KV + 激活值）和相对吞吐量。它展示 KV 缓存何时占主导、权重压缩何时有回报，以及 FP8 何时是安全选择。

## 交付

本课产出 `outputs/skill-quantization-picker.md`。给定硬件、模型规模、工作负载类型和质量容忍度，它会选择一种格式，并产生校准/验证方案。

## 练习

1. 运行 `code/main.py`。对于一个 70B 模型、128 并发和 2k 上下文，计算每种格式的总 HBM。哪种格式能放入一张 H100 80GB？
2. 你有一个 7B 编码模型。选择一种格式并说明理由。如果你错误判断了质量容忍度，恢复路径是什么？
3. 计算为医疗领域模型校准 AWQ 所需的校准数据集规模。为什么数据更多并不总是更好？
4. 阅读 Marlin-AWQ 内核论文或发行说明。用三句话解释：为什么 AWQ 在 7B 上达到 741 tok/s，而原始 GPTQ 约为 712？
5. 何时应将 AWQ 权重与 FP8 KV 缓存搭配使用，而不是让 KV 保持 BF16？

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| GGUF | “llama.cpp 格式” | 打包 K-quant 变体的文件格式；CPU/边缘端默认项 |
| Q4_K_M | “Q4 K M” | 4 位 K-quant medium；生产用 GGUF 默认项 |
| GPTQ | “G P T Q” | 带校准的训练后 INT4；支持 vLLM 中的 LoRA |
| AWQ | “A W Q” | 激活感知 INT4；Marlin 内核；INT4 下最佳 Pass@1 |
| Marlin 内核 | “快速 INT4 内核” | 用于 Hopper 上 INT4 的自定义 CUDA 内核；10 倍加速 |
| FP8 | “8 位浮点” | Hopper/Ada/Blackwell 上安全的精度默认项 |
| MXFP4 / NVFP4 | “微缩放四位” | 每块具有缩放因子的 Blackwell 4 位 FP |
| 校准数据集 | “校准数据” | 用于选择量化参数的输入文本；必须匹配领域 |
| KV 缓存量化 | “KV INT8” | 与权重分开的选择；影响注意力精度 |

## 延伸阅读

- [VRLA Tech — LLM Quantization 2026](https://vrlatech.com/llm-quantization-explained-int4-int8-fp8-awq-and-gptq-in-2026/) — 对比基准。
- [Jarvis Labs — vLLM Quantization Complete Guide](https://jarvislabs.ai/blog/vllm-quantization-complete-guide-benchmarks) — 按格式列出的吞吐量数字。
- [PremAI — GGUF vs AWQ vs GPTQ vs bitsandbytes 2026](https://blog.premai.io/llm-quantization-guide-gguf-vs-awq-vs-gptq-vs-bitsandbytes-compared-2026/) — 逐格式选择。
- [vLLM docs — Quantization](https://docs.vllm.ai/en/latest/features/quantization/index.html) — 支持的格式和标志。
- [AWQ paper (arXiv:2306.00978)](https://arxiv.org/abs/2306.00978) — AWQ 的原始表述。
- [GPTQ paper (arXiv:2210.17323)](https://arxiv.org/abs/2210.17323) — GPTQ 的原始表述。
