---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/07-end-to-end-fine-tuning-pipeline/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: c283b32854099e155fd7dc7e745995ae141f85065a47050e4ad88af243ab9732
status: reviewed
---

# 毕业项目 07——端到端微调流水线（从数据到 SFT、DPO 再到服务）

> 在自己的数据上训练一个 8B 模型，在自己的偏好上用 DPO 对齐，量化、进行推测解码，并以可测量的每 100 万词元美元成本提供服务。2026 年的开放技术栈是 Axolotl v0.8、TRL 0.15、用于迭代的 Unsloth、用于量化的 GPTQ/AWQ/GGUF，以及带 EAGLE-3 的 vLLM 0.7 服务。本毕业项目要求你可复现地运行完整流水线——输入 YAML，输出已提供服务的端点——并依据 2026 Model Openness Framework 发布模型卡。

**类型：** 毕业项目
**语言：** Python（流水线）、YAML（配置）、Bash（脚本）
**前置课程：** 第 2 阶段（ML）、第 3 阶段（DL）、第 7 阶段（Transformer）、第 10 阶段（从零实现 LLM）、第 11 阶段（LLM 工程）、第 17 阶段（基础设施）、第 18 阶段（安全）
**涉及阶段：** P2 · P3 · P7 · P10 · P11 · P17 · P18
**用时：** 35 小时

## 问题

到 2026 年，每个认真的 AI 团队都会随时准备一套微调流水线。这不是因为他们要交付前沿基础模型，而是因为下游适配——领域 SFT、针对标注偏好的 DPO、用于推测解码的蒸馏草稿模型，以及使用 EAGLE-3 提供服务——才是可测量收益所在。Axolotl v0.8 处理多 GPU SFT 配置，TRL 0.15 处理 DPO 和 GRPO，Unsloth 让单 GPU 迭代变得快速，带 EAGLE-3 的 vLLM 0.7 在不损失质量的情况下把解码吞吐提高 2–3 倍。工具已经可用；真正的工程在 YAML、数据卫生和评测纪律中。

你将让一个 8B 基础模型（Llama 3.3、Qwen3 或 Gemma 3）在任务专用数据上先经过 SFT 再经过 DPO，为服务进行量化，并依据 lm-evaluation-harness、RewardBench-2、MT-Bench-v2 和 MMLU-Pro 测量收益。你还要依据 2026 Model Openness Framework 生成模型卡。重点是可复现性——一条命令就能端到端重跑整个流水线。

## 概念

流水线有五个阶段。**数据**：去重（MinHash / Datatrove）、质量过滤（Nemotron-CC 风格分类器）、PII 清理，以及针对公开 benchmark 污染的数据集划分卫生检查。**SFT**：Axolotl YAML、8xH100 上的 ZeRO-3、余弦调度、序列打包、2–3 个 epoch。**DPO 或 GRPO**：TRL 配置、1 个 epoch，偏好对可以由人类标注或模型评判，并调节 beta。**量化**：GPTQ + AWQ + GGUF，以适应部署弹性。**服务**：带 EAGLE-3 推测头的 vLLM 0.7（或带 SpecForge 的 SGLang）、K8s 部署，以及按队列等待时间设置 HPA。

交付物是消融实验：只做 SFT、SFT+DPO 与 SFT+GRPO 在三个任务专用 benchmark 上的比较。服务指标包括批大小 1 / 8 / 32 时的 tokens/s、EAGLE-3 接受率和每 100 万词元美元成本。安全评测使用 Llama Guard 4 通过率。模型卡要包含偏差评估、可复现性种子和数据许可。

## 架构

```text
原始数据（HF datasets + 内部数据）
    |
    v
Datatrove 去重 + Nemotron-CC 质量过滤 + PII 清理
    |
    v
数据集划分卫生（MMLU-Pro 污染检查）
    |
    v
Axolotl SFT 配置（YAML）  ---> 8xH100，ZeRO-3
    |
    v
TRL DPO / GRPO 配置       ---> 4xH100，1 个 epoch
    |
    v
GPTQ + AWQ + GGUF 量化
    |
    v
vLLM 0.7 + EAGLE-3 推测解码
    |
    v
K8s 部署，按队列等待时间设置 HPA
    |
    v
lm-eval-harness + RewardBench-2 + MT-Bench-v2 + MMLU-Pro
    |
    v
模型卡（2026 MOF）+ 安全评测（Llama Guard 4）
```

## 技术栈

- 数据：Datatrove 去重、Nemotron-CC 分类器质量过滤、Presidio PII 清理
- 基础模型：Llama 3.3 8B、Qwen3 14B 或 Gemma 3 12B
- SFT：带 ZeRO-3、Flash Attention 3 和序列打包的 Axolotl v0.8
- 偏好调优：TRL 0.15 进行 DPO 或 GRPO；Unsloth 用于单 GPU 迭代
- 量化：GPTQ（Marlin）、AWQ、通过 llama.cpp 使用 GGUF
- 服务：带 EAGLE-3 推测解码的 vLLM 0.7（或 SGLang 0.4 + SpecForge）
- 评测：lm-evaluation-harness、RewardBench-2、MT-Bench-v2、MMLU-Pro
- 安全评测：Llama Guard 4、ShieldGemma-2
- 基础设施：Kubernetes + NVIDIA device plugin，按队列等待指标设置 HPA
- 可观测性：训练使用 W&B，推理使用 Langfuse

```figure
ce-finetune-stages
```

## 动手构建

1. **数据流水线。** 在原始语料上运行 Datatrove 去重。应用 Nemotron-CC 风格质量分类器。由 Presidio 清理 PII。使用明确的种子写出训练/验证划分。

2. **污染检查。** 对每个验证划分，计算它与 MMLU-Pro、MT-Bench-v2 和 RewardBench-2 测试集的 MinHash。拒绝任何重叠。

3. **Axolotl SFT。** 使用带 ZeRO-3、FA3 和序列打包的 YAML 配置。在 8xH100 上训练 2–3 个 epoch。记录到 W&B。

4. **TRL DPO / GRPO。** 取得 SFT checkpoint，在偏好对上运行一个 epoch 的 DPO（或在数学/代码上使用可验证奖励运行 GRPO）。扫描 beta。

5. **量化。** 生成三种量化版本：GPTQ-INT4-Marlin、AWQ-INT4、供 llama.cpp 使用的 GGUF-Q4_K_M。记录大小和标称吞吐。

6. **使用推测解码提供服务。** 配置带 EAGLE-3 草稿头的 vLLM 0.7，草稿头通过 Red Hat Speculators 训练。在批大小 1 / 8 / 32 下测量接受率和尾部延迟。与 Anthropic / OpenAI 在同一评测上的结果比较每 100 万词元美元成本。

7. **评测矩阵。** 在基础模型、仅 SFT、SFT+DPO 和 SFT+GRPO 上运行 lm-eval-harness、RewardBench-2、MT-Bench-v2、MMLU-Pro。生成一张表。

8. **安全评测。** 在开发集上测量 Llama Guard 4 通过率，使用 ShieldGemma-2 输出过滤器。

9. **模型卡。** 使用 MOF 2026 模板，包含数据、训练、评测、安全、许可和可复现性章节，其中放入 YAML 与 commit SHA。

## 实际使用

```text
$ ./pipeline.sh config/llama3.3-8b-domainX.yaml
[data]    300k deduped, 12k filtered, 280k accepted (seed=7)
[SFT]     3 epochs, 8xH100, 6h12m, val loss 1.42 -> 1.03
[DPO]     1 epoch, beta=0.08, 4xH100, 1h40m
[quant]   GPTQ-INT4 4.6 GB, AWQ-INT4 4.8 GB, GGUF-Q4_K_M 5.1 GB
[serve]   vLLM 0.7, EAGLE-3 acceptance 0.74, p99 126ms @ bs=8
[eval]    MMLU-Pro +3.2, MT-Bench-v2 +0.41, RewardBench-2 +0.08
[card]    model-card.md generated under 2026 MOF
```

## 交付

交付物 outputs/skill-finetuning-pipeline.md 描述了这一流水线：一条命令把数据依次送入 SFT、DPO、量化、服务和评测，并输出模型卡及已提供服务的端点。

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | 相对基础模型的评测差值 | 在目标任务（MMLU-Pro、MT-Bench-v2、任务专用集）上测量收益 |
| 20 | 流水线可复现性 | 使用相同种子通过一条命令端到端重跑 |
| 20 | 数据卫生 | 去重率、PII 清理覆盖率、污染检查通过 |
| 20 | 服务效率 | bs=1/8/32 时的 tokens/s、EAGLE-3 接受率、每 100 万词元美元成本 |
| 15 | 模型卡与安全评测 | 2026 MOF 完整度 + Llama Guard 4 通过率 |
| **100** | | |

## 练习

1. 在同一个任务专用 benchmark 上比较只做 SFT、SFT+DPO 和 SFT+GRPO。报告哪种偏好方法胜出，以及胜出多少。

2. 将 Llama 3.3 8B 换成 Qwen3 14B。在质量匹配的条件下测量每 100 万词元美元成本。

3. 在领域数据和通用 ShareGPT 上分别测量 EAGLE-3 接受率。报告差值，并说明它对延迟预算意味着什么。

4. 注入 1% 污染（将 MMLU-Pro 答案泄漏到训练数据中）并重新评测。观察 MMLU-Pro 准确率不现实地跃升。构建一个能捕获它的污染检查 CI 门。

5. 增加 LoRA SFT 作为全量微调的替代方案。在内存降低 10 倍的条件下测量质量差距。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Axolotl | “SFT trainer” | 用统一 YAML 驱动的 SFT、DPO 和蒸馏训练器 |
| TRL | “偏好调优器” | Hugging Face 用于 LLM DPO、GRPO、PPO 的库 |
| GRPO | “群组相对策略优化” | DeepSeek R1 的带可验证奖励 RL 配方 |
| EAGLE-3 | “推测解码草稿” | 预测未来 N 个词元的草稿头；vLLM 用目标模型验证 |
| MOF | “Model Openness Framework” | 2026 年依据数据、代码和许可评定模型发布的标准 |
| Contamination check | “划分卫生” | 基于 MinHash 检测测试集泄漏到训练集的方法 |
| Acceptance rate | “EAGLE / MTP 指标” | 目标模型接受的草稿词元比例 |

## 延伸阅读

- [Axolotl 文档](https://axolotl-ai-cloud.github.io/axolotl/)——SFT / DPO 参考训练器
- [TRL 文档](https://huggingface.co/docs/trl)——DPO 和 GRPO 参考实现
- [Unsloth](https://github.com/unslothai/unsloth)——单 GPU 迭代参考
- [DeepSeek R1 论文（arXiv:2501.12948）](https://arxiv.org/abs/2501.12948)——GRPO 方法
- [vLLM + EAGLE-3 文档](https://docs.vllm.ai)——参考服务技术栈
- [SGLang SpecForge](https://github.com/sgl-project/SpecForge)——另一种推测解码训练器
- [Model Openness Framework 2026](https://isocpp.org/)——开放发布分级标准
- [lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness)——规范评测运行器
