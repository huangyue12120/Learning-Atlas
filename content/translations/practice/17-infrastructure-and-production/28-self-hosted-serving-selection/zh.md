---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/28-self-hosted-serving-selection/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 299fe1b15e8624a247d15ccf0cce2047462bb32b834714b9b60a238416ca4f2c
status: reviewed
---

# 自托管推理引擎选型：让引擎匹配硬件与规模

> 引擎选型取决于硬件、规模和生态，不应只看排行榜。2026 年，自托管推理主要由四个引擎主导：llama.cpp、Ollama、vLLM、SGLang；TGI 则进入维护模式。**llama.cpp** 在 CPU 上最快，模型支持最广，并提供对量化和线程的完整控制。**Ollama** 适合开发笔记本电脑，一条命令即可安装；因 Go、CGo 和 HTTP 序列化，比 llama.cpp 慢约 15–30%，在接近生产的负载下吞吐差距可达 3 倍。**TGI 于 2025 年 12 月 11 日进入维护模式**，后续只修复 bug；其原始吞吐通常比 vLLM 低约 10%，但历来拥有出色的可观测性和 Hugging Face 生态集成。维护状态使它成为长期高风险选择，新项目更适合默认使用 SGLang 或 vLLM。**vLLM** 是通用生产环境的默认选项，v0.15.1（2026 年 2 月）支持 PyTorch 2.10、RTX Blackwell SM120 和 H200 优化。**SGLang** 擅长智能体多轮和重前缀负载，已在 xAI、LinkedIn、Cursor、Oracle、GCP、Azure、AWS 等环境部署到 400,000+ 张 GPU。硬件约束也很明确：CPU 优先时选 llama.cpp；AMD 或非 NVIDIA 时，vLLM 是支持最强的路径，TRT-LLM 则只支持 NVIDIA。2026 年的常见流水线是：开发用 Ollama，预发布用 llama.cpp，生产用 vLLM 或 SGLang。各引擎接受的权重格式不同，llama.cpp 系列用 GGUF，GPU 引擎用 Hugging Face safetensors，因此流水线阶段之间可能需要格式转换。

**类型：** 学习
**语言：** Python（标准库，引擎决策树遍历器）
**前置要求：** 第 17 阶段中覆盖引擎的所有课程（04、06、07、09、18）
**用时：** 约 45 分钟

## 学习目标

- 根据硬件（CPU / AMD / NVIDIA Hopper / Blackwell）、规模（1 位用户 / 100 / 10,000）和负载（通用聊天 / 智能体 / 长上下文）选择引擎。
- 说明 TGI 在 2025 年 12 月 11 日进入维护模式的状态，以及它为何使新项目更倾向 vLLM 或 SGLang。
- 描述开发、预发布、生产的流水线，并指出 GGUF 到 safetensors 的格式转换位于何处。
- 解释“CPU 优先”为何指向 llama.cpp，以及“AMD”为何排除 TRT-LLM。

## 问题

团队启动一个新的自托管 LLM 项目。一位工程师建议 Ollama，另一位建议 vLLM，第三位问：“TGI 不是开箱即用吗？”三人的建议都适用于某些场景，但没有一种适合全部场景。

2026 年应按决策树选择：先看硬件，再看规模，最后看负载。2025 年 12 月 11 日 TGI 进入维护模式这一事件，也改变了新项目的默认选择。

## 概念

### 五个引擎

| 引擎 | 最适合 | 说明 |
|------|--------|------|
| **llama.cpp** | CPU / 边缘端 / 最少依赖 / 最广模型支持 | CPU 上最快，完整控制 |
| **Ollama** | 开发笔记本电脑、单用户、一条命令安装 | 比 llama.cpp 慢 15–30%；生产吞吐差距 3 倍 |
| **TGI** | HF 生态、受监管行业 | **2025 年 12 月 11 日进入维护模式** |
| **vLLM** | 通用生产、100+ 用户 | 广泛适用的生产默认项；v0.15.1 发布于 2026 年 2 月 |
| **SGLang** | 智能体多轮、重前缀负载 | 400,000+ 张 GPU 已投入生产 |

### 硬件优先的决策

**CPU 优先** → llama.cpp。Ollama 也能运行，但更慢。其他引擎在 CPU 上没有竞争力。

**AMD GPU** → vLLM 是支持最强的路径，支持 AMD ROCm；SGLang 也可以使用。TRT-LLM 只支持 NVIDIA，因此不适用。

**NVIDIA Hopper（H100 / H200）** → vLLM、SGLang 或 TRT-LLM，三者都处于第一梯队。

**NVIDIA Blackwell（B200 / GB200）** → TRT-LLM 是吞吐领导者（第 17 阶段 · 07），vLLM 和 SGLang 紧随其后。

**Apple Silicon（M 系列）** → llama.cpp（Metal），Ollama 封装了它。

### 规模优先的决策

**1 位用户 / 本地开发** → Ollama。一条命令安装，数秒内出现首个 token。

**10–100 位用户 / 小团队** → 单 GPU vLLM。

**100–10k 位用户 / 生产环境** → vLLM production-stack（第 17 阶段 · 18）或 SGLang。

**10k+ 位用户 / 企业级** → vLLM production-stack + 解耦式预填充与解码（第 17 阶段 · 17）+ LMCache（第 17 阶段 · 18）。

### 负载优先的决策

**通用聊天 / 问答** → vLLM 是覆盖面最广的默认选项。

**智能体多轮（工具、规划、记忆）** → SGLang 的 RadixAttention（第 17 阶段 · 06）占优。

**高前缀复用的 RAG** → SGLang。

**代码生成** → vLLM 可以胜任；SGLang 的缓存略好。

**长上下文（128K+）** → vLLM + chunked prefill；SGLang + 分层 KV。

### TGI 的维护模式陷阱

Hugging Face TGI 于 2025 年 12 月 11 日进入维护模式，后续只修复 bug。它过去拥有顶级可观测性、出色的 HF 生态集成，包括模型卡和安全工具，原始吞吐略落后于 vLLM。

2026 年的新项目应避开 TGI 作为默认项。现有 TGI 部署可以继续运行，但最终应迁移。SGLang 和 vLLM 是更稳妥的默认选择。

### 流水线模式

开发（Ollama）→ 预发布（llama.cpp）→ 生产（vLLM）。引擎接受的权重格式不同：llama.cpp 系列使用 GGUF，GPU 引擎使用 Hugging Face safetensors，因此阶段之间可能需要格式转换。工程师在笔记本电脑上快速迭代；预发布环境镜像生产量化；生产环境承担推理服务。

### Ollama 的注意事项

Ollama 很适合开发，却不适合共享生产环境：Go 的 HTTP 序列化会增加开销，并发管理比 vLLM 简单，OpenTelemetry 支持也较弱。让 Ollama 专注于单用户、一条命令的场景；共享服务切换至 vLLM。

### 自托管与托管是另一项决策

第 17 阶段 · 01（托管 hyperscaler）和 · 02（推理平台）讨论了托管方案。本课假定你已决定自托管。自托管的理由包括数据驻留、自定义微调、规模化后的总拥有成本，以及托管平台没有提供的领域模型。

### 应当记住的数字

- TGI 进入维护模式：2025 年 12 月 11 日。
- vLLM v0.15.1：2026 年 2 月；支持 PyTorch 2.10 和 Blackwell SM120。
- SGLang 的生产部署规模：400,000+ 张 GPU。
- Ollama 相比 llama.cpp 的吞吐差距：慢 15–30%；生产负载下相差 3 倍。

```figure
data-parallel
```

## 使用

`code/main.py` 是一个决策树遍历器：给定硬件、规模和负载，选择一个引擎并说明原因。

## 交付

本课产出 `outputs/skill-engine-picker.md`。它根据约束选择引擎，并编写迁移计划。

## 练习

1. 用你的硬件、规模和负载运行 `code/main.py`。输出是否符合你的直觉？
2. 你的基础设施有 12 张 H100 和 8 张 AMD MI300X。该选哪个引擎？为什么 TRT-LLM 不适用？
3. 一个团队因“这是我们熟悉的方案”而想在 2026 年使用 TGI。请论证迁移的理由。
4. 从 Ollama 开发环境切换到 vLLM 生产环境时，量化、配置和可观测性会发生哪些变化？
5. 一个 RAG 产品的 P99 前缀长度为 8K，且跨租户有很高复用率。选择一个引擎，并将它与第 17 阶段 · 11 + 18 组合。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|------------|----------|
| llama.cpp | “CPU 的那个” | 模型支持最广，CPU 上最快 |
| Ollama | “笔记本电脑的那个” | 一条命令安装，开发级吞吐 |
| TGI | “HF 的服务端” | 自 2025 年 12 月起处于维护模式 |
| vLLM | “默认项” | 2026 年广泛适用的生产基线 |
| SGLang | “智能体那个” | 重前缀、RadixAttention |
| TRT-LLM | “NVIDIA 锁定” | Blackwell 吞吐领导者，仅支持 NVIDIA |
| GGUF | “llama.cpp 格式” | 打包的 K-quant 变体 |
| Production-stack | “vLLM K8s” | 第 17 阶段 · 18 的参考部署 |
| 流水线模式 | “开发→预发布→生产” | Ollama → llama.cpp → vLLM；权重格式因引擎而异 |

## 延伸阅读

- [AI Made Tools — vLLM vs Ollama vs llama.cpp vs TGI 2026](https://www.aimadetools.com/blog/vllm-vs-ollama-vs-llamacpp-vs-tgi/)
- [Morph — llama.cpp vs Ollama 2026](https://www.morphllm.com/comparisons/llama-cpp-vs-ollama)
- [n1n.ai — Comprehensive LLM Inference Engine Comparison](https://explore.n1n.ai/blog/llm-inference-engine-comparison-vllm-tgi-tensorrt-sglang-2026-03-13)
- [PremAI — 10 Best vLLM Alternatives 2026](https://blog.premai.io/10-best-vllm-alternatives-for-llm-inference-in-production-2026/)
- [TGI maintenance announcement](https://github.com/huggingface/text-generation-inference) — 发布说明。
- [vLLM v0.15.1 release notes](https://github.com/vllm-project/vllm/releases)
