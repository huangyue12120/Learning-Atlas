---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/14-prompt-semantic-caching/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: b3e17333c21dae5ac19ff620cae7a650f42ddb517c295819b732e7ddbaaabc2d
status: reviewed
---

# 提示词缓存与语义缓存经济学

> **定价快照日期为 2026-04。** 下文数字主张反映本课发布时获取的供应商价目表；在下游引用前，请使用链接文档核验。

> 缓存发生在两个层次。L2（供应商级）提示词/前缀缓存会为重复前缀复用注意力 KV——Anthropic 的提示词缓存文档宣称长提示词最高可降低 90% 成本和 85% 延迟；对于 Claude 3.5 Sonnet，缓存读取为 $0.30/M，新请求为 $3.00/M，TTL 为 5 分钟；1 小时 TTL 选项有 2 倍写入溢价（docs.anthropic.com，2026-04）。对于 ≥1024 token 的提示词，OpenAI 提示词缓存自动生效，缓存输入的价格相对新输入约有 90% 折扣（platform.openai.com，2026-04）；确切的逐模型缓存价格取决于实时价目表。L1（应用级）语义缓存会在嵌入相似度命中时完全跳过 LLM。供应商宣称的“95% accuracy”指匹配正确性，而非命中率——公开生产命中率从 10%（开放聊天）到 70%（结构化 FAQ）不等；两家供应商都未发布官方基线，所以应把这些数字视为社区遥测，而非保证。生产陷阱包括：并行化会破坏缓存（在首次缓存写入前发出 N 个并行请求，可使支出膨胀数倍），而前缀中的动态内容会彻底阻止缓存命中。ProjectDiscovery 报告称，通过将动态文本移出可缓存前缀，命中率从 7% 提升到 74%（2025-11）。

**类型：** 学习
**语言：** Python（标准库，用于模拟两层缓存的玩具程序）
**前置要求：** 第 17 阶段 · 04（服务引擎内部机制），第 17 阶段 · 06（SGLang RadixAttention）
**用时：** 约 60 分钟

## 学习目标

- 区分 L2 提示词/前缀缓存（供应商处的 KV 复用）与 L1 语义缓存（相似提示词时绕过 LLM）。
- 解释 Anthropic 的显式 `cache_control` 标记、两种 TTL 选项（5 分钟与 1 小时）及其价格乘数。
- 在给定命中率、提示词/响应组合和 token 单价的情况下，计算预期月度节省。
- 说出使账单增加 5–10 倍的并行化反模式，以及使命中率崩塌的动态内容反模式。

## 问题

你在 RAG 服务中加入提示词缓存，账单却没有变化。测得命中率为 7%。你的提示词看起来静态，实则不是——系统提示词包含按分钟格式化的当前日期、请求 ID，以及为多样性随机重排的示例。每个请求写入一个新缓存条目，读取为零。

此外，你的智能体会针对每个用户问题并行执行十次工具调用。十次调用都在第一次缓存写入完成前抵达供应商。十次写入，零次读取。账单是“有缓存”原本预计成本的 5–10 倍。

缓存是一种协议，不是一个标志。两个层次，两个不同的失败模式。

## 概念

### L2——供应商提示词/前缀缓存

供应商存储可缓存前缀的注意力 KV，并在下一个匹配前缀的请求中复用。你只支付一次写入成本，读取几乎免费。

**Anthropic（Claude 3.5 / 3.7 / 4 系列）：** 请求中使用显式 `cache_control` 标记。你标记哪些 block 可缓存。TTL：5 分钟（写入为基础价 1.25 倍）或 1 小时（写入为基础价 2 倍）。缓存读取：Claude 3.5 Sonnet 为 $0.30/M，而新输入为 $3.00/M——便宜 10 倍（docs.anthropic.com，截至 2026-04）。不同模型（Opus/Haiku）费率不同；务必交叉核对实时定价页。

**OpenAI：** 对 ≥1024 token 的提示词自动缓存（platform.openai.com，2026-04），无显式标志。当前 gpt-4o/gpt-5 费率表中，缓存输入大约比新输入便宜 10 倍。文档和发行说明均未公布官方命中率基线；社区报告显示，精心设计提示词的命中率集中在 30–60%。通过 `usage.cached_tokens` 测量你自己的结果。

**Google（Gemini）：** 使用显式 API 实现上下文缓存；在 1M-token 上下文中，缓存的收益更大。

**自托管（vLLM、SGLang）：** 第 17 阶段 · 06 介绍了 RadixAttention——同样的模式，但消耗你自己的算力。

### L1——应用级语义缓存

在调用 LLM 之前，对提示词做哈希、嵌入，并查找相似的缓存请求（余弦相似度高于阈值，通常为 0.95+）。命中时返回缓存响应；未命中时调用 LLM 并缓存结果。

开源方案：Redis Vector Similarity、GPTCache、Qdrant。商业方案：Portkey Cache、Helicone Cache。

供应商的准确率主张指的是返回的缓存响应在语义上恰当的频率，而不是命中频率。生产命中率：

- 开放聊天：10–15%。
- 结构化 FAQ / 支持：40–70%。
- 代码问题：20–30%（小变体会破坏命中）。
- 重复提示词的语音智能体：50–80%（语音归一化形成固定集合）。

### 并行化反模式

你的智能体并行执行 10 次工具调用，所有调用都有相同的 4K-token 系统提示词。Anthropic 缓存按请求写入；在供应商看到提示词约 300 ms 后，第一次缓存写入才完成。请求 2–10 在同一毫秒窗口内到达，每一个都看到缓存未命中。你支付 10 次写入溢价，得到 0 次读取折扣。

修复：先顺序执行第一个请求，随后在请求 1 的缓存已填充后再发出请求 2–10。这样为第一次工具调用增加 300 ms，却能节省 5–10 倍账单。

### 动态内容反模式

你的系统提示词如下：

```
你是一个乐于助人的助手。当前时间是 14:32:17。
用户 ID：abc123。今天是星期二……
```

每个请求都不同，每个请求都写入，零命中。

修复方式是将一切真正静态的内容移至可缓存前缀；将动态内容附加在缓存边界之后：

```
[可缓存]
你是一个乐于助人的助手。[规则、示例、指令]
[/可缓存]
[动态，未缓存]
当前时间：14:32:17。用户：abc123。
```

ProjectDiscovery 用这一方式将缓存命中率从 7% 提升到 74%，并公开了具体结构。

### 为夜间工作负载叠加 batch + 缓存

批处理 API（第 17 阶段 · 15）在 24 小时周转下提供 50% 折扣。在此基础上叠加缓存输入，可再获得约 10 倍收益。夜间分类、标注和报告生成工作负载，将成本降至同步未缓存成本的约 10%。

### 应当记住的数字

定价点来自链接供应商文档在 2026-04 的记录，每几个月会发生变化——依赖前应重新核验。

- Anthropic 缓存读取：Claude 3.5 Sonnet 为 $0.30/M，约比新输入便宜 10 倍（docs.anthropic.com）。
- Anthropic 缓存写入溢价：5 分钟 TTL 为 1.25 倍，1 小时 TTL 为 2 倍。
- OpenAI 自动缓存：适用于 ≥1024 token 的提示词；在当前费率表中，缓存输入约为新输入的 10%（platform.openai.com）。
- 语义缓存命中率（社区报告）：开放聊天约 10%，结构化 FAQ 最多约 70%。这不是供应商文档基线。
- ProjectDiscovery：将动态内容移出前缀后，命中率从 7% → 74%（项目博客，2025-11）。
- 并行化反模式：N 个并行请求错过首次缓存写入时，常见账单膨胀为 5–10 倍。

```figure
semantic-cache-hit
```

## 使用

`code/main.py` 在混合工作负载上模拟 L1 + L2 缓存。它报告命中率、账单，并展示并行化罚金。

## 交付

本课产出 `outputs/skill-cache-auditor.md`。给定提示词模板和流量，它会审计可缓存性并提出重构建议。

## 练习

1. 运行 `code/main.py`。切换并行化标志。账单变化多少？
2. 你的系统提示词有日期。将其移出，展示前后命中率计算。
3. 在给定请求到达速率时，计算 1 小时 TTL（2 倍写入）相对 5 分钟 TTL（1.25 倍写入）的盈亏平衡点。
4. 语义缓存在 0.95 阈值下命中 20%，在 0.85 下命中 50%，但出现错误的缓存响应。选择正确阈值并说明理由。
5. 你针对每个用户问题批量执行 10 个并行子查询。重写方案，使其缓存友好且不增加端到端延迟。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| L2 提示词缓存 | “前缀缓存” | 供应商为重复前缀存储 KV |
| `cache_control` | “Anthropic 缓存标记” | 标记可缓存 block 的显式属性 |
| 缓存写入溢价 | “写入税” | 首次从未命中到缓存的额外成本（1.25 倍或 2 倍） |
| L1 语义缓存 | “嵌入缓存” | 调用 LLM 前在应用级哈希并嵌入 |
| GPTCache | “LLM 缓存库” | 流行的 OSS L1 缓存库 |
| 缓存命中率 | “命中数 / 总数” | 从缓存提供响应的请求比例 |
| 并行化反模式 | “N 次写入陷阱” | N 个并行请求 N 次错过缓存 |
| 动态内容陷阱 | “提示词中的时间陷阱” | 前缀中的动态字节会消除缓存命中 |
| RadixAttention | “副本内缓存” | SGLang 的前缀缓存实现 |

## 延伸阅读

- [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) — 官方 `cache_control` 语义和 TTL。
- [OpenAI Prompt Caching](https://platform.openai.com/docs/guides/prompt-caching) — 自动缓存行为和资格条件。
- [TianPan — Semantic Caching for LLMs Production](https://tianpan.co/blog/2026-04-10-semantic-caching-llm-production)
- [ProjectDiscovery — Cut LLM Costs 59% With Prompt Caching](https://projectdiscovery.io/blog/how-we-cut-llm-cost-with-prompt-caching)
- [DigitalOcean / Anthropic — Prompt Caching](https://www.digitalocean.com/blog/prompt-caching-with-digital-ocean)
