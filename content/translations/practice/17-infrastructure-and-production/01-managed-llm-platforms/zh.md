---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/01-managed-llm-platforms/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: b6093433c72206b1ba7c936c1c55965aac147dd5789d9d09a645306bad215f55
status: reviewed
---

# 托管 LLM 平台：Bedrock、Vertex AI、Azure OpenAI

> 三个超大规模云厂商，三种不同策略。AWS Bedrock 是模型市场：通过一个 API 提供 Claude、Llama、Titan、Stability、Cohere。Azure OpenAI 是独家 OpenAI 合作关系，并通过预配吞吐量单元（PTU）提供专用容量。Vertex AI 以 Gemini 为先，拥有最佳的长上下文与多模态叙事。2026 年，Artificial Analysis 在等价的 Llama 3.1 405B 部署上测得 Azure OpenAI 的中位数约为 50 ms、Bedrock 约为 75 ms；PTU 解释了差距，因为专用容量胜过共享按需容量。决策应比较模型目录和 FinOps 面与产品的匹配度。本课教你把取舍写下来再选择，而不是凭感觉。

**类型：** 学习
**语言：** Python（标准库，玩具成本与延迟比较器）
**前置要求：** 第 11 阶段（LLM 工程），第 13 阶段（工具与协议）
**用时：** 约 60 分钟

## 学习目标

- 说出三种平台策略（市场、独家、Gemini 优先），并将每种匹配到产品用例。
- 解释 Azure OpenAI 中预配吞吐量单元（PTU）购买了什么，以及为何 Bedrock 的按需服务在 405B 规模通常慢约 25 ms。
- 绘制每个平台的 FinOps 归因面图（Bedrock Application Inference Profiles、Vertex 按团队分项目、Azure 作用域 + PTU 预留）。
- 写下“双提供商最低要求”政策，并说明为何单一供应商锁定是 2026 年代价高昂的错误。

## 问题

你为产品选择了 Claude 3.7 Sonnet，现在需要提供服务。你可以直接调用 Anthropic API，也可以经由 AWS Bedrock，或通过网关。直接 API 最简单；Bedrock 增加 BAA、VPC 端点、IAM 和 CloudWatch 归因；网关增加跨提供商故障转移、统一计费和速率限制。

更深的问题是目录。如果你的产品同时需要 Claude、Llama 和 Gemini，除非同时使用 Bedrock、Vertex 和 Azure OpenAI，否则无法从一个地方买到它们。超大规模云厂商并非可互换——每一家对“谁拥有模型层”下了不同赌注。

本课映射这三种赌注、延迟差距、FinOps 差距与锁定风险。

## 概念

### 三种策略

**AWS Bedrock**——市场。Claude（Anthropic）、Llama（Meta）、Titan（AWS 第一方）、Stability（图像）、Cohere（嵌入）、Mistral，以及图像与嵌入子目录。一个 API、一个 IAM 面、一个 CloudWatch 导出。Bedrock 的赌注是客户更需要可选性，而不是单一模型。

**Azure OpenAI**——独家合作。你可以在 Azure 数据中心获得 GPT-4 / 4o / 5 / o 系列、DALL·E、Whisper 及 OpenAI 模型微调。“Azure OpenAI Service”目录没有非 OpenAI 模型——它们属于 Azure AI Foundry（另一个产品）。Azure 的赌注是 OpenAI 仍居前沿，客户希望在这段特定关系上获得企业控制。

**Vertex AI**——Gemini 优先，其他其次。Gemini 1.5 / 2.0 / 2.5 Flash 和 Pro，以及 Model Garden（第三方）。Vertex 的赌注是多模态长上下文——100 万 token 的 Gemini 上下文是其差异点。

### 规模下的延迟差距

Artificial Analysis 运行持续基准。在等价的 Llama 3.1 405B 部署（共享按需）上，Azure OpenAI 的中位首 token 延迟约 50 ms，Bedrock 约 75 ms。差距来自容量模型：Azure 出售 PTU（Provisioned Throughput Units），为你的租户预留 GPU 容量。Bedrock 的对应服务（Provisioned Throughput）也存在，但每单位约从 $21/小时起，因此多数客户仍使用共享按需服务。

按需共享容量会与其他客户流量竞争，专用容量不会。若产品 SLA 要求 P99 TTFT < 100 ms，就需购买 Azure 的 PTU、Bedrock Provisioned Throughput，或接受默认方差。

### 预配吞吐量经济学

Azure PTU：预留的一块推理计算。对于可预测工作负载，相较按需最多可节省约 70%；无论流量如何，成本都按小时固定——空闲时也要为预留付费。盈亏平衡通常在 40–60% 的持续利用率。

Bedrock Provisioned Throughput：按模型和地区为 $21–$50/小时。计算方法类似——约为峰值利用率的一半时达到平衡，且需要按月承诺。

Vertex 预配容量按 Gemini SKU 出售，价格随模型和区域变化，公开程度较低。

### FinOps 面：真正的差异点

**Bedrock Application Inference Profiles** 是市场中最干净的归因方式。给 profile 加 `team`、`product`、`feature` 标签，将所有模型调用经由该 profile 路由；CloudWatch 无需后处理即可按 profile 拆分成本。它在 2025 年加入，仍是最细粒度的超大规模云原生归因方式。

**Vertex** 的归因方式是按团队分项目加上全量标签。你将每个团队建模为一个 GCP 项目，为每种资源添加标签，并用 BigQuery Billing Export + DataStudio 做汇总。工作更多，但 BigQuery 让你可对成本数据运行任意 SQL。

**Azure** 依靠订阅/资源组作用域加标签，并将 PTU 预留视为一等成本对象。标签继承自资源组而非请求，因此逐请求归因需要 Application Insights 自定义指标，或能写入 header 的网关。

模式是：Bedrock 的原生归因最干净，Vertex 借助 BigQuery 最灵活，Azure 除非自行埋点否则最不透明。

### 锁定是 2026 年风险

当一个模型占据主导时，单一超大规模云厂商承诺没有问题。到 2026 年，前沿每月移动——一个季度是 Claude 3.7，下一季度是 Gemini 2.5，再下一季度是 GPT-5。锁定到一个平台意味着被排除在三分之二的前沿之外。

可行团队采用的模式是：每条产品关键 LLM 调用至少使用两个提供商。Bedrock + Azure OpenAI 是常见组合——从一方获得 Claude、另一方获得 GPT，在同一网关后故障转移。由于网关会做最优路由，成本增量可忽略；而面对故障（如 2025 年 1 月 Azure OpenAI 事故、AWS us-east-1 故障）时，可用性增益具有决定性。

### 数据驻留、BAA 与受监管行业

Bedrock：大多数区域提供 BAA、VPC 端点和 guardrails，是金融科技常见默认选择。
Azure OpenAI：HIPAA、SOC 2、ISO 27001、欧盟数据驻留，是受监管企业默认选择。
Vertex：HIPAA、GDPR、按区域的数据驻留，以及 Google Cloud 的合规栈。

三者都满足基本勾选项。区别在于数据保留策略、日志处理方式，以及滥用监控是否读取你的流量（多数默认选择加入，企业可选择退出）。

### 应记住的数字

- Azure OpenAI 在 Llama 3.1 405B 等价部署上的中位 TTFT：约 50 ms（使用 PTU）。
- Bedrock 按需中位 TTFT：约 75 ms。
- Bedrock Provisioned Throughput：每单位 $21–$50/小时。
- Azure PTU 盈亏平衡：40–60% 持续利用率。
- 高利用率下 PTU 相对按需节省：最多 70%。

```figure
i4-platform-lanes
```

## 使用

`code/main.py` 在合成工作负载上比较三种平台：建模按需与 PTU 经济性、TTFT 方差和成本归因保真度。运行它可看到 PTU 何时回本，以及市场的模型广度何时胜过 TTFT 差距。

## 交付

本课产出 `outputs/skill-managed-platform-picker.md`。给定工作负载画像（所需模型、TTFT SLA、日量、合规要求），它会推荐主平台、备用平台和 FinOps 埋点计划。

## 练习

1. 运行 `code/main.py`。对于 70B 类模型，Azure PTU 在何种持续利用率下胜过按需？计算盈亏平衡，并与宣传的 40–60% 区间比较。
2. 你的产品需要 Claude 3.7 Sonnet 和 GPT-4o。设计一个双提供商部署：哪个模型去哪个超大规模云厂商、前面放什么网关、故障转移策略是什么？
3. 一位受监管医疗客户要求 BAA、美国东部数据驻留和小于 100ms 的 P99 TTFT。选择一个平台，并用三个具体特性证明。
4. 你发现本月 Bedrock 账单在流量未变的情况下增加了 4 倍。没有 Application Inference Profiles 时，如何找出原因？有 profiles 时需要多久？
5. 阅读 Azure OpenAI 与 Bedrock 定价页。对于每月 1 亿 token 的 Claude 工作负载，哪种更便宜：直接 Anthropic API、Bedrock 按需，还是 Bedrock Provisioned Throughput？

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| Bedrock | “AWS 的 LLM 服务” | 跨 Claude、Llama、Titan、Mistral、Cohere 的模型市场。 |
| Azure OpenAI | “Azure 的 ChatGPT” | 在 Azure 数据中心使用独家 OpenAI 模型，并提供企业控制。 |
| Vertex AI | “Google 的 LLM” | Gemini 优先的平台，Model Garden 提供第三方模型。 |
| PTU | “专用容量” | Provisioned Throughput Unit——按小时计价的预留推理 GPU。 |
| Application Inference Profile | “Bedrock 标签” | 带标签的逐产品成本/用量 profile，CloudWatch 原生支持。 |
| Model Garden | “Vertex 目录” | Vertex AI 的第三方模型区域，与 Gemini 分开。 |
| 双提供商最低要求 | “LLM 冗余” | 让每条关键 LLM 路径运行在至少两个超大规模云厂商上的政策。 |
| BAA | “HIPAA 文书” | Business Associate Agreement；PHI 所需，三家均提供。 |
| 滥用监控 | “日志观察者” | 提供商对提示词/输出做的安全扫描；企业可选择退出。 |

## 延伸阅读

- [AWS Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/) —— 权威价目表与 Provisioned Throughput 定价
- [Azure OpenAI Service Pricing](https://azure.microsoft.com/en-us/pricing/details/azure-openai/) —— PTU 经济性与价目表
- [Vertex AI Generative AI Pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing) —— Gemini 层级和 Model Garden 附加费
- [Artificial Analysis LLM Leaderboard](https://artificialanalysis.ai/) —— 跨提供商的持续延迟与吞吐量基准
- [The AI Journal — AWS Bedrock vs Azure OpenAI CTO Guide 2026](https://theaijournal.co/2026/03/aws-bedrock-vs-azure-openai/) —— 企业决策框架
- [Finout — Bedrock vs Vertex vs Azure FinOps](https://www.finout.io/blog/bedrock-vs.-vertex-vs.-azure-cognitive-a-finops-comparison-for-ai-spend) —— 并列比较归因机制
