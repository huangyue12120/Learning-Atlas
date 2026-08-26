---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/21-llm-routing-layer/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 76708436ac5d3bafa1bcf40c7a4a7cc6cdb7e89b9d75bd0694bc5cc81549549a
status: reviewed
---

# LLM 路由层——LiteLLM、OpenRouter、Portkey

> 供应商锁定的代价很高。不同的工具调用工作负载适合不同的模型。路由网关提供统一的 API 表面、重试、故障转移、成本追踪和防护。2026 年有三类方案占主导：LiteLLM（开源、自托管）、OpenRouter（托管 SaaS）、Portkey（生产级，并于 2026 年 3 月开源）。本课命名决策标准，并带你走过一个标准库路由网关。

**类型：** 学习
**语言：** Python（标准库，路由 + 故障转移 + 成本追踪）
**前置课程：** Phase 13 · 02（函数调用）、Phase 13 · 17（网关）
**时间：** 约 45 分钟

## 学习目标

- 区分自托管、托管和生产级路由方案。
- 实现一个在供应商故障时按明确优先级重试的回退链。
- 跨供应商追踪每次请求的成本和词元使用量。
- 针对给定的生产约束，在 LiteLLM、OpenRouter 和 Portkey 之间做出选择。

## 问题

以下场景说明了供应商路由为何重要：

1. **成本。** Claude Sonnet 的成本是 Haiku 的 3 倍。分诊任务使用 Haiku 就够了；综合任务值得使用 Sonnet。按请求路由。

2. **故障转移。** OpenAI 有一段糟糕的时光。所有请求都失败。你希望自动回退到 Anthropic，而不重新部署。

3. **延迟。** 实时聊天 UI 需要快速的首词元时间。批量摘要器不需要。按延迟 SLA 路由。

4. **合规。** 欧盟用户必须留在欧盟区域。按区域路由。

5. **实验。** 在相同工作负载上对两个模型进行 A/B 测试。按测试分桶路由。

为每个集成手写全部逻辑既重复又繁琐。路由网关提供一个 OpenAI 兼容 API，其他工作都由它处理。

## 概念

### OpenAI 兼容代理形状

所有人都讲 OpenAI 形状。路由网关暴露 `/v1/chat/completions`，接受 OpenAI schema，内部代理到 Anthropic / Gemini / Cohere / Ollama / 任意后端。客户端无需关心具体后端。

### 模型别名

代码不写固定的 snapshot ID，而是使用 `our_smart_model`。网关将别名映射到真实模型。供应商发布新一代模型时，只需在服务器端修改别名；代码完全不用动。

### 回退链

```text
primary: openai/gpt-4o
on 5xx: anthropic/claude-3-5-sonnet
on 5xx: google/gemini-1.5-pro
on 5xx: refuse
```

网关在配置中定义这条链。重试会计入预算，防止回退级联使成本失控。

### 语义缓存

相同或近似的提示词命中缓存，而不是访问供应商。重复的智能体循环可能节省 30% 到 60%。键基于嵌入向量；近似提示词共享缓存槽位。

### 防护

网关层面的防护包括：

- **PII 脱敏。** 在发送提示词之前，使用正则或基于 ML 的处理。
- **策略违规。** 拒绝包含禁止内容的提示词。
- **输出过滤器。** 清理 completion 中的泄漏。

Portkey 和 Kong 都提供带明确立场的防护。LiteLLM 将它们保留为可选项。

### 逐密钥限流

一个 API key 对应一个团队。逐密钥预算防止一个团队消耗共享配额。大多数网关都支持这一点。

### 自托管与托管的权衡

| 因素 | LiteLLM（自托管） | OpenRouter（托管） | Portkey（生产） |
|--------|----------------------|----------------------|----------------------|
| 代码 | 开源，Python | 托管 SaaS | 开源（2026 年 3 月）+ 托管 |
| 设置 | 部署代理 | 注册账号 | 二者皆可 |
| 供应商 | 100+ | 300+ | 100+ |
| 计费 | 使用自己的 key | OpenRouter credits | 使用自己的 key |
| 可观测性 | OpenTelemetry | 仪表盘 | 完整 OTel + PII 脱敏 |
| 适合 | 希望完全控制的团队 | 快速原型 | 需要开箱即用合规能力的生产环境 |

当你有 SRE 团队并希望数据主权时，LiteLLM 胜出。当你希望单一订阅且不想维护基础设施时，OpenRouter 胜出。当你需要开箱即用的防护和合规时，Portkey 胜出。

### 成本追踪

每次请求都带有 `provider`、`model`、`input_tokens`、`output_tokens`。将它们乘以网关维护的每模型每词元价格表。按用户 / 团队 / 项目聚合。

### MCP 与路由

网关既可以路由 LLM 调用，也可以路由 MCP 采样请求。当采样请求的 modelPreferences 偏好某个模型时，网关将它转换到正确的后端。这正是 Phase 13 · 17（MCP 网关）与本课路由网关有时合并为一个服务的地方。

### 路由策略

- **静态优先级。** 使用列表中的第一个；出错时回退。
- **负载均衡。** 轮询或加权。
- **成本感知。** 选择满足延迟 / 质量要求的最便宜模型。
- **延迟感知。** 选择过去 N 分钟中最快的模型。
- **任务感知。** 提示词分类器将编码路由到一个模型，将摘要路由到另一个模型。

```figure
tp-router-failover
```

## 动手使用

`code/main.py` 实现一个约 150 行的路由网关：接受 OpenAI 形状的请求，转换为逐供应商 stub，运行优先级回退链，追踪每次请求成本，并对输入执行 PII 脱敏。用三个场景运行它：正常请求、触发回退的主供应商故障、被脱敏器拦截的 PII 泄漏。

注意观察：

- `ROUTES` 字典：别名 → 按优先级排序的具体供应商列表。
- 回退循环在 5xx 上重试。
- 成本追踪器将词元使用量乘以每模型费率。
- PII 脱敏器在转发前清除 SSN 形状的模式。

## 交付物

本课产出 `outputs/skill-routing-config-designer.md`。给定工作负载画像（延迟、成本、合规），该 skill 会选择 LiteLLM / OpenRouter / Portkey，并生成路由配置。

## 练习

1. 运行 `code/main.py`。触发故障场景，确认回退落到第二个供应商，并且成本归因正确。

2. 添加语义缓存：以提示词的 SHA256 作为查找键；缓存命中时立即返回。测量重复调用带来的成本节省。

3. 添加提示词分类器，将以“code ...”开头的提示词路由到偏好智能的别名，将以“summarize ...”开头的提示词路由到偏好速度的别名。

4. 设计逐团队预算：每个团队都有月度支出上限；一旦达到上限，网关拒绝请求。选择一种执行粒度（逐请求或按时间窗口）。

5. 并排阅读 LiteLLM、OpenRouter 和 Portkey 的文档。说出每个方案提供、而另外两个没有的一项功能。

## 术语

| 术语 | 人们会怎么说 | 它实际表示什么 |
|------|----------------|------------------------|
| 路由网关 | “LLM 代理” | 位于多个供应商前、提供单一 API 表面的层 |
| OpenAI 兼容 | “会说 OpenAI schema” | 接受 `/v1/chat/completions` 形状，并转换到任意后端 |
| 模型别名 | “our_smart_model” | 代码中的名称，由网关映射到具体模型 |
| 回退链 | “重试列表” | 失败时按顺序尝试的供应商列表 |
| 语义缓存 | “提示词嵌入缓存” | 键是提示词的嵌入；近似提示词共享缓存命中 |
| 防护 | “输入 / 输出过滤器” | 清理 PII，拒绝策略违规 |
| 逐密钥限流 | “团队预算” | 作用域为一个 API key 的配额 |
| 成本追踪 | “逐请求支出” | 每模型的词元使用量 × 价格后聚合 |
| LiteLLM | “开源代理” | 可自托管的开源路由网关 |
| OpenRouter | “托管 SaaS” | 使用 credits 计费的托管网关 |
| Portkey | “生产选项” | 内置防护的开源 + 托管方案 |

## 延伸阅读

- [LiteLLM — docs](https://docs.litellm.ai/)——自托管路由网关
- [OpenRouter — quickstart](https://openrouter.ai/docs/quickstart)——托管路由 SaaS
- [Portkey — docs](https://portkey.ai/docs)——带防护的生产路由
- [TrueFoundry — LiteLLM vs OpenRouter](https://www.truefoundry.com/blog/litellm-vs-openrouter)——决策指南
- [Relayplane — LLM gateway comparison 2026](https://relayplane.com/blog/llm-gateway-comparison-2026)——供应商调查
