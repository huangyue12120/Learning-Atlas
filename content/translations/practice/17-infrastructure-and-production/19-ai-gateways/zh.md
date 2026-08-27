---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/19-ai-gateways/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 37577b9d35784816daa5140188304ca352cde30704e7405c718095ea9cf8454e
status: reviewed
---

# AI 网关：LiteLLM、Portkey、Kong AI Gateway、Bifrost

> 网关位于应用和模型供应商之间。核心功能包括供应商路由、回退、重试、限流、密钥引用、可观测性和护栏。2026 年市场分化：**LiteLLM** 是 MIT OSS、支持 100+ 供应商、OpenAI 兼容，但在约 2000 RPS 处失效（公开基准显示，8 GB 内存、级联故障）；最适合 Python、<500 RPS、开发/原型。**Portkey** 定位于控制平面（护栏、PII 脱敏、越狱检测、审计记录），于 2026 年 3 月转为 Apache 2.0 开源，每请求增加 20–40 ms 延迟，生产层 $49/mo。**Kong AI Gateway** 构建于 Kong Gateway 之上——Kong 在相同 12 CPU 上的基准显示：比 Portkey 快 228%，比 LiteLLM 快 859%；定价 $100/model/month（Plus 层最多 5 个）；若已使用 Kong，则很适合企业。**Bifrost**（Maxim AI）提供带可配置 backoff 的自动重试，在 OpenAI 429 时回退 Anthropic。**Cloudflare / Vercel AI Gateways** 为托管、零运维、基础重试。数据驻留推动自托管决策；Portkey 和 Kong 位于中间，兼具 OSS 和可选托管。

**类型：** 学习
**语言：** Python（标准库，用于模拟网关路由的玩具程序）
**前置要求：** 第 17 阶段 · 01（托管 LLM 平台），第 17 阶段 · 16（模型路由）
**用时：** 约 60 分钟

## 学习目标

- 枚举六项网关核心能力（路由、回退、重试、限流、密钥、可观测性、护栏）。
- 将四个 2026 年网关（LiteLLM、Portkey、Kong AI、Bifrost）映射到规模上限和适用场景。
- 引用 Kong 基准（相对 Portkey 228%、相对 LiteLLM 859%），并说明为何它对 >500 RPS 很重要。
- 根据数据驻留和运维预算选择自托管或托管。

## 问题

你的产品调用 OpenAI、Anthropic 和自托管 Llama。每个供应商都有不同 SDK、错误模型、速率限制和认证方案。你需要故障切换（OpenAI 429 时尝试 Anthropic）、单一凭证存储、统一可观测性和每租户限流。

在应用层重复实现这些功能，会使每个服务与每个供应商耦合。网关层将其集中到一个进程，提供一个 API（通常 OpenAI 兼容），再向多个供应商扇出。

## 概念

### 六项核心能力

1. **供应商路由**——在一个 API 后接入 OpenAI、Anthropic、Gemini、自托管等。
2. **回退**——遇到 429、5xx 或质量失败时，在其他地方重试。
3. **重试**——指数 backoff、有界尝试次数。
4. **速率限制**——按租户、按 key、按模型。
5. **密钥引用**——运行时从 vault 取凭证（绝不放在应用中）。
6. **可观测性**——OTel + GenAI 属性（第 17 阶段 · 13）+ 成本归因。
7. **护栏**——PII 脱敏、越狱检测、允许主题过滤。

### LiteLLM——MIT OSS、Python

- 支持 100+ 供应商、OpenAI 兼容、router 配置、回退、基础可观测性。
- 在 Kong 基准中约 2000 RPS 处失效；8 GB 内存占用，持续负载下会发生级联故障。
- 最适：Python 应用、<500 RPS、开发/staging 网关、实验路由。
- 成本：OSS 为 $0；有云端免费层。

### Portkey——控制平面定位

- 截至 2026 年 3 月为 Apache 2.0 OSS。护栏、PII 脱敏、越狱检测、审计记录。
- 每个请求增加 20–40 ms 延迟开销。
- 带保留期 + SLA 的生产层为 $49/mo。
- 最适：需要打包护栏 + 可观测性的受监管行业。

### Kong AI Gateway——规模化方案

- 构建于 Kong Gateway（成熟 API 网关产品，lua+OpenResty）之上。
- Kong 自己在等价 12 CPU 上的基准：比 Portkey 快 228%，比 LiteLLM 快 859%。
- 定价：$100/model/month，Plus 层最多 5 个。
- 最适：已使用 Kong；>1000 RPS；愿意购买许可。

### Bifrost（Maxim AI）

- 带可配置 backoff 的自动重试。
- 在 OpenAI 429 时回退 Anthropic 是一个经典配方。
- 较新的进入者；商业产品。

### Cloudflare AI Gateway / Vercel AI Gateway

- 托管、零运维，提供基础重试和可观测性。
- 最适：在 Cloudflare/Vercel 上提供边缘服务的 JavaScript 应用。
- 与 Kong/Portkey 相比，护栏和限流能力有限。

### 自托管与托管

数据驻留是强制因素。医疗和金融默认自托管（LiteLLM、Portkey OSS 或 Kong）。消费者产品默认托管（Cloudflare AI Gateway）或中间层（Portkey 托管）。混合方式：受监管租户自托管，其他租户托管。

### 延迟预算

- LiteLLM：典型开销 5–15 ms。
- Portkey：开销 20–40 ms。
- Kong：开销 3–8 ms。
- Cloudflare/Vercel：开销 1–3 ms（边缘优势）。

网关延迟会直接增加 TTFT。若 TTFT P99 < 100 ms SLA，选择 Kong 或 Cloudflare；若 P99 < 500 ms，任意一个都可用。

### 限流语义很重要

简单 token-bucket 可支撑中等规模。多租户需要 sliding-window + 突发额度 + 按租户分层。LiteLLM 提供 token-bucket；Kong 提供 sliding-window；Portkey 提供分层。

### 网关 + 可观测性 + 路由可以组合

第 17 阶段 · 13（可观测性）+ 16（模型路由）+ 19（网关）在生产中属于同一层。选择一个覆盖三者的工具，或仔细连接它们：多数 2026 年部署将 Helicone（可观测性）或 Portkey（护栏）与 Kong（规模）组合，以分担角色。

### 应当记住的数字

- LiteLLM：约 2000 RPS 处失效，8 GB 内存。
- Portkey：20–40 ms 开销；自 2026 年 3 月为 Apache 2.0。
- Kong：比 Portkey 快 228%，比 LiteLLM 快 859%。
- Kong 定价：$100/model/month，Plus 层最多 5 个。
- Cloudflare/Vercel：边缘端开销 1–3 ms。

```figure
mx-gateway-fallback
```

## 使用

`code/main.py` 在注入 429/5xx 的情况下，模拟网关跨 3 个供应商路由和回退。它报告延迟、重试率和回退命中率。

## 交付

本课产出 `outputs/skill-gateway-picker.md`。给定规模、运维立场、合规要求和延迟预算，它会选择网关。

## 练习

1. 运行 `code/main.py`。配置 OpenAI→Anthropic→自托管的回退。在 5% 供应商错误率下，预期命中率是多少？
2. 你的 SLA 是 TTFT P99 < 200 ms，基线为 300 ms。哪些网关仍处于预算内？
3. 医疗客户要求自托管 + PII 脱敏 + 审计。选择 Portkey OSS 或 Kong。
4. 比较 LiteLLM 与 Kong：团队应在什么 RPS 上限迁移？
5. 为多租户 SaaS 设计限流策略：免费层、试用层、付费层。用 token-bucket 还是 sliding-window？

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| 网关 | “API broker” | 位于应用与供应商之间的进程 |
| LiteLLM | “MIT 的那个” | Python OSS，100+ 供应商，在 2K RPS 处失效 |
| Portkey | “护栏网关” | 控制平面 + 可观测性，Apache 2.0 |
| Kong AI Gateway | “规模化那个” | 构建于 Kong Gateway，基准领先 |
| Bifrost | “Maxim 的网关” | 重试 + Anthropic 回退方案 |
| Cloudflare AI Gateway | “边缘托管” | 在边缘部署的托管网关，零运维 |
| PII 脱敏 | “数据清理” | 发送至模型前通过正则 + NER 掩码 |
| 越狱检测 | “提示词注入护栏” | 对用户输入运行分类器 |
| 审计记录 | “受监管日志” | 每次 LLM 调用的不可变记录 |
| Token-bucket | “简单限流” | 基于补充的限流器 |
| Sliding-window | “精确限流” | 按时间窗口限流；公平性更好 |

## 延伸阅读

- [Kong AI Gateway Benchmark](https://konghq.com/blog/engineering/ai-gateway-benchmark-kong-ai-gateway-portkey-litellm)
- [TrueFoundry — AI Gateways 2026 Comparison](https://www.truefoundry.com/blog/a-definitive-guide-to-ai-gateways-in-2026-competitive-landscape-comparison)
- [Techsy — Top LLM Gateway Tools 2026](https://techsy.io/en/blog/best-llm-gateway-tools)
- [LiteLLM GitHub](https://github.com/BerriAI/litellm)
- [Portkey GitHub](https://github.com/Portkey-AI/gateway)
- [Kong AI Gateway docs](https://docs.konghq.com/gateway/latest/ai-gateway/)
