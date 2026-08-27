---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/02-inference-platform-economics/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 3a180a0a492dc6dd6a2bfd974ac53dfb5775b645857098b8d9adb36f8c3cd1a0
status: reviewed
---

# 推理平台经济学：Fireworks、Together、Baseten、Modal、Replicate、Anyscale

> 2026 年的推理市场已不再只是出租 GPU 时间。它分化为定制芯片（Groq、Cerebras、SambaNova）、GPU 平台（Baseten、Together、Fireworks、Modal）和 API 优先市场（Replicate、DeepInfra）。Fireworks 在 2026 年 5 月 1 日将每 GPU 价格提高 $1/小时；其 40 亿美元估值与每天处理 10T+ token 说明按量驱动模式可行。Baseten 于 2026 年 1 月以 50 亿美元估值完成 3 亿美元 E 轮融资。竞争定位规则很简单：Fireworks 优化延迟，Together 优化目录广度，Baseten 优化企业完善度，Modal 优化 Python 原生开发体验，Replicate 优化多模态覆盖，Anyscale 优化分布式 Python。本课提供一张可交给创始人的矩阵。

**类型：** 学习
**语言：** Python（标准库，玩具每调用经济性比较器）
**前置要求：** 第 17 阶段 · 01（托管 LLM 平台），第 17 阶段 · 04（服务引擎内部机制）
**用时：** 约 60 分钟

## 学习目标

- 说出三个市场分区（定制芯片、GPU 平台、API 优先），并将每家供应商映射到一个分区。
- 解释为何“按 token”API 定价会向服务引擎的成本曲线而非硬件成本曲线收敛。
- 计算至少三家供应商的有效每请求成本，并说明何时按分钟计费（Baseten、Modal）胜过按 token 计费。
- 为给定工作负载识别正确的默认平台（无服务器突发、稳定高吞吐、微调变体、多模态）。

## 问题

你评估过托管超大规模云平台，并决定需要更专门、更快的提供商：用 Fireworks 获得低延迟，用 Together 获得广度，用 Baseten 承载微调的定制模型。现在你有六种真实选择，价格页面却无法对齐。Fireworks 显示 $/M token，Baseten 显示 $/分钟，Modal 显示 $/秒，Replicate 显示 $/预测。若不对工作负载建模，就无法正面比较它们。

更糟的是，每个价格页面背后的商业模式不同。Fireworks 在共享 GPU 上运行自研引擎 FireAttention；按 token 价格反映其利用率曲线。Baseten 提供 Truss + 专用 GPU，按分钟计费反映独占性。Modal 是真正的 Python 无服务器，按秒计费，冷启动小于一秒。相同输出（一条 LLM 响应），三种不同成本函数。

本课为六家平台建模，并说明每家何时胜出。

## 概念

### 三个分区

**定制芯片**——Groq（LPU）、Cerebras（WSE）、SambaNova（RDU）。在相同模型上，解码通常比 GPU 集群快 5–10 倍。每 token 价格更高（2025 年末 Groq 在 Llama-70B 上约为 $0.99/M），但对延迟敏感用例无可匹敌。Groq 是语音智能体与实时翻译的生产选择。

**GPU 平台**——Baseten、Together、Fireworks、Modal、Anyscale。2026 年运行在 NVIDIA（H100、H200、B200）或有时 AMD 上，位于“原始 GPU 租赁”（RunPod、Lambda）与“超大规模云托管服务”（Bedrock）之间的经济层。

**API 优先市场**——Replicate、DeepInfra、OpenRouter、Fal。目录广，按预测或按秒付费，强调首次调用时间。

### Fireworks：延迟优化的 GPU 平台

- FireAttention 引擎（自研）；宣传在等价配置上延迟比 vLLM 低 4 倍。
- 对非交互式工作负载，批处理层价格约为无服务器费率的 50%。
- 微调模型以基础模型同样费率提供服务——相对那些为 LoRA 收取溢价的提供商，这是实在的差异点。
- 2026 年中：按需 GPU 租赁自 5 月 1 日起上调 $1/小时；规模客户可协商按量价格。
- 财务信号：估值 40 亿美元，每日处理 10T+ token。

### Together：广度优化

- 200+ 个模型，包括在上游发布数天内上线的开源模型。
- 在等价 LLM 模型上比 Replicate 便宜 50–70%——“AI Native Cloud”的定位是规模和目录。
- 一个 API 中同时提供推理、微调和训练。

### Baseten：企业完善度优化

- Truss 框架：在一个 manifest 中打包模型依赖、密钥和服务配置。
- 从 T4 到 B200 的 GPU 范围，按分钟计费，具备合理的冷启动缓解。
- SOC 2 Type II、可满足 HIPAA，是金融科技和医疗的常见选择。
- 2026 年 1 月估值 50 亿美元，E 轮融资 $300M，投资者包括 CapitalG、IVP、NVIDIA。

### Modal：Python 原生优化

- 用纯 Python 做基础设施即代码。给函数加 `@modal.function(gpu="A100")` 装饰器，并用一条命令部署。
- 按秒计费。预热下冷启动为 2–4 秒，小模型小于 1 秒。
- 2025 年 B 轮融资 $87M、估值 $1.1B。在独立调查中拥有最强开发者体验评分。

### Replicate：多模态广度

- 按预测计费，是图像、视频和音频模型的默认平台。
- 集成生态丰富（Zapier、Vercel、CMS 插件）。
- 在 LLM 按 token 费率上竞争力较弱，但多模态多样性胜出。

### Anyscale：Ray 原生

- 基于 Ray；RayTurbo 是 Anyscale 自研推理引擎（与 vLLM 竞争）。
- 最适合分布式 Python 工作负载，其中推理步骤是更大图的一部分。
- 托管 Ray 集群，与 Ray AIR 和 Ray Serve 紧密集成。

### 按 token 与按分钟：各自何时胜出

按 token 适合对延迟不敏感、突发的工作负载——只为实际使用付费。按分钟适合利用率高且可预测的负载——GPU 饱和后成本会低于按 token。

粗略规则：当工作负载超过专用 GPU 约 30% 的持续利用率，按分钟（Baseten、Modal）开始胜过按 token（Fireworks、Together）。低于该值时，按 token 胜出，因为无需为闲置付费。

### 自研引擎才是真正的护城河

vLLM 与 SGLang 之上的每个平台都声称有自研引擎：FireAttention、RayTurbo、Baseten 的推理栈。自研引擎主张带有营销成分；vLLM + SGLang 约占生产开源推理的 80%，平台层的差异在开发体验、归因和 SLA。

### 应记住的数字

- Fireworks GPU 租赁：2026 年 5 月 1 日生效，上调 $1/小时。
- Fireworks 主张：等价配置下延迟比 vLLM 低 4 倍。
- Together：LLM 比 Replicate 便宜 50–70%。
- Baseten 估值：50 亿美元（2026 年 1 月 E 轮、$300M）。
- Modal 估值：11 亿美元（2025 年 B 轮）。
- 持续利用率超过约 30% 时，按分钟胜过按 token。

```figure
cost-per-token
```

## 使用

`code/main.py` 在不同定价模型的合成工作负载上比较六家供应商，并报告 $/天和有效 $/M token。运行它可找到按 token 与按分钟的盈亏平衡点。

## 交付

本课产出 `outputs/skill-inference-platform-picker.md`。给定工作负载画像、SLA 和预算，它会选择主要推理平台并给出次优选择。

## 练习

1. 运行 `code/main.py`。对于一张 H100 上的 70B 模型，Baseten（按分钟）在何种持续利用率下胜过 Fireworks（按 token）？自行推导交叉点，并与经验规则比较。
2. 你的产品同时提供图像生成、聊天和语音转文字。为每种模态选择平台，并说明将它们统一起来的网关模式。
3. Fireworks 将主模型价格上调 $1/小时。如果 40% 流量移至批处理层（50% 折扣），建模混合成本影响。
4. 受监管客户要求 SOC 2 Type II + HIPAA + 专用 GPU。哪三家平台可用，哪一家在 FinOps 上胜出？
5. 比较 Llama 3.1 70B 在 Fireworks 无服务器、Together 按需、Baseten 专用和 Replicate API 上每 1,000 次预测的成本。每天 10 次预测时哪个最便宜？每天 10,000 次呢？

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| 定制芯片 | “非 GPU 芯片” | Groq LPU、Cerebras WSE、SambaNova RDU——为解码优化。 |
| FireAttention | “Fireworks 引擎” | 自研注意力内核；宣传延迟比 vLLM 低 4 倍。 |
| Truss | “Baseten 格式” | 模型打包 manifest：依赖 + 密钥 + 服务配置。 |
| 按 token | “API 定价” | 按消耗 token 收费；不为闲置付费。 |
| 按分钟 | “专用定价” | 按 GPU 墙钟时间收费；高利用率时胜出。 |
| 按预测 | “Replicate 定价” | 按每次模型调用收费，常用于图像/视频。 |
| RayTurbo | “Anyscale 引擎” | Ray 上的自研推理引擎，在 Ray 集群上与 vLLM 竞争。 |
| 批处理层 | “五折” | 降价的非交互式队列，Fireworks、OpenAI 常见。 |
| 微调按基础费率 | “Fireworks LoRA” | LoRA 服务请求按基础模型价格收费，是其差异点。 |

## 延伸阅读

- [Fireworks Pricing](https://fireworks.ai/pricing) —— 按 token 费率、批处理层、GPU 租赁
- [Baseten Pricing](https://www.baseten.co/pricing/) —— 按分钟费率、承诺容量、企业层级
- [Modal Pricing](https://modal.com/pricing) —— 按秒 GPU 费率和免费层
- [Together AI Pricing](https://www.together.ai/pricing) —— 模型目录和按 token 费率
- [Anyscale Pricing](https://www.anyscale.com/pricing) —— RayTurbo 和托管 Ray 定价
- [Northflank — Fireworks AI Alternatives](https://northflank.com/blog/7-best-fireworks-ai-alternatives-for-inference) —— 比较评估
- [Infrabase — AI Inference API Providers 2026](https://infrabase.ai/blog/ai-inference-api-providers-compared) —— 供应商格局
