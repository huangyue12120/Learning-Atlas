---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/11-llm-engineering/15-prompt-caching/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: c72d9e6ced54e99c366d6f573ba03a8a4f0a4e365eddc8911a92712dd1cfd201
status: reviewed
---

# 提示词缓存与上下文缓存

> 你的系统提示词有 4000 个词元，RAG 上下文有 20,000 个词元。每次请求你都会把它们一起发送，也每次都为它们付费。提示词缓存让提供方在自己的服务端保持这个前缀的热状态，复用时按正常价格的 10% 计费。使用得当，它能把推理成本降低 50–90%，把首词元延迟降低 40–85%。

**类型：** 构建
**语言：** Python
**前置要求：** 第 11 阶段 · 第 01 课（提示词工程）、第 11 阶段 · 第 05 课（上下文工程）、第 11 阶段 · 第 11 课（缓存与成本）
**用时：** 约 60 分钟

## 问题所在

一个 coding 智能体在一次对话的每一轮都向 Claude 发送同一个 15,000 词元系统提示词。按每百万输入词元 3 美元计算，20 轮光是输入成本就要 0.90 美元——还没算用户真正发送的消息。每天 10,000 场对话，账单会因为这些从不改变的文本达到每天 9000 美元。

你不能在不损害质量的情况下缩短提示词，也不能不发送它——模型每轮都需要它。唯一的办法，是不要再为提供方已经见过的前缀支付全价。

这套机制称为提示词缓存。Anthropic 在 2024 年 8 月发布了它（2025 年又提供了 1 小时扩展 TTL 版本），OpenAI 在同年晚些时候实现了自动缓存，Google 随 Gemini 1.5 一起发布了显式上下文缓存；如今三家都把它作为前沿模型的一等能力提供。

## 核心概念

![提示词缓存：写入一次，读取便宜](../assets/prompt-caching.svg)

**机制。** 当一次请求的前缀与最近某次请求的前缀匹配时，提供方会直接提供上一次运行的 KV-cache，而不再重新编码这些词元。第一次写入时支付一笔小额溢价，之后每次复用都享受大幅读取折扣。

**2026 年三家提供方的实现方式。**

| 提供方 | API 方式 | 命中折扣 | 写入溢价 | 默认 TTL | 最小可缓存长度 |
|---------|-----------|--------------|---------------|-------------|---------------|
| Anthropic | 在内容块上显式设置 `cache_control` 标记 | 输入 9 折优惠 | 加收 25% | 5 分钟（可延长至 1 小时） | 1024 词元（Sonnet/Opus），2048（Haiku） |
| OpenAI | 自动检测前缀 | 输入 5 折优惠 | 无 | 最长 1 小时（尽力而为） | 1024 词元 |
| Google（Gemini） | 显式 `CachedContent` API | 按存储收费；读取约为正常价格的 25% | 每词元·小时收取存储费 | 用户设置（默认 1 小时） | 4096 词元（Flash），32,768（Pro） |

**不变量。** 三家都只缓存前缀。如果两次请求之间有任何一个词元不同，那么从第一个差异词元开始往后的全部内容都会未命中。把*稳定*部分放在顶部，把*变化*部分放在底部。

### 适合缓存的布局

```
[system prompt]          <-- cache this
[tool definitions]       <-- cache this
[few-shot examples]      <-- cache this
[retrieved documents]    <-- cache if reused, else don't
[conversation history]   <-- cache up to last turn
[current user message]   <-- never cache (different every time)
```

一旦违反顺序——把用户消息放到系统提示词上方，或把动态检索结果插进 few-shot 示例之间——缓存就永远不会命中。

### 盈亏平衡计算

Anthropic 25% 的写入溢价意味着，一个缓存块至少被读取两次才会产生净节省。1 次写入 + 1 次读取时，每次请求的平均成本是原成本的 0.675 倍（节省 32%）；1 次写入 + 10 次读取时，平均成本是 0.205 倍（节省 80%）。经验法则：预期在 TTL 内至少复用 3 次的内容才值得缓存。

```figure
prompt-cache-hit
```

## 动手构建

### 第 1 步：使用显式标记实现 Anthropic 提示词缓存

```python
import anthropic

client = anthropic.Anthropic()

SYSTEM = [
    {
        "type": "text",
        "text": "You are a senior Python reviewer. Follow the rubric exactly.\n\n" + RUBRIC_15K_TOKENS,
        "cache_control": {"type": "ephemeral"},
    }
]

def review(code: str):
    return client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        system=SYSTEM,
        messages=[{"role": "user", "content": code}],
    )
```

`cache_control` 标记告诉 Anthropic 把这个内容块保存 5 分钟。在窗口内复用会命中；过期后再复用则会重新写入。

**响应中的 usage 字段：**

```python
response = review(code_a)
response.usage
# InputTokensUsage(
#     input_tokens=120,
#     cache_creation_input_tokens=15023,   # paid at 1.25x
#     cache_read_input_tokens=0,
#     output_tokens=340,
# )

response_b = review(code_b)
response_b.usage
# cache_creation_input_tokens=0
# cache_read_input_tokens=15023           # paid at 0.1x
```

在 CI 中同时检查这两个字段——如果多次请求的 `cache_read_input_tokens` 一直是 0，说明缓存 key 正在漂移。

### 第 2 步：一小时扩展 TTL

对于长期运行的批处理任务，默认 5 分钟会在任务之间过期。设置 `ttl`：

```python
{"type": "text", "text": RUBRIC, "cache_control": {"type": "ephemeral", "ttl": "1h"}}
```

1 小时 TTL 的写入溢价是标准成本的 50%（而不是 25%，即写入成本为 2 倍溢价），但只要一个批处理复用此前缀超过 5 次，就能很快收回成本。

### 第 3 步：OpenAI 自动缓存

OpenAI 不需要你配置任何东西。只要某个超过 1024 词元的前缀与最近请求匹配，就会自动享受 50% 折扣。

```python
from openai import OpenAI
client = OpenAI()

resp = client.chat.completions.create(
    model="gpt-5",
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT},   # long and stable
        {"role": "user", "content": user_msg},
    ],
)
resp.usage.prompt_tokens_details.cached_tokens  # the discounted portion
```

同样要遵守适合缓存的布局规则。有两件事会破坏 OpenAI 缓存、却不会破坏 Anthropic 缓存：修改 `user` 字段（它是缓存 key 的组成部分），以及重新排序工具。

### 第 4 步：Gemini 显式上下文缓存

Gemini 把缓存当作需要创建并命名的一等对象：

```python
from google import genai
from google.genai import types

client = genai.Client()

cache = client.caches.create(
    model="gemini-3-pro",
    config=types.CreateCachedContentConfig(
        display_name="rubric-v3",
        system_instruction=RUBRIC,
        contents=[FEW_SHOT_EXAMPLES],
        ttl="3600s",
    ),
)

resp = client.models.generate_content(
    model="gemini-3-pro",
    contents=["Review this code:\n" + code],
    config=types.GenerateContentConfig(cached_content=cache.name),
)
```

只要缓存存在，Gemini 就会按词元·小时收取存储费，并按正常输入价格约 25% 的费率计读取费。当你在多天内、跨许多会话复用同一个超大提示词时，这种模式最合适。

### 第 5 步：在生产环境测量命中率

参见 `code/main.py`，其中有一个模拟的三提供方记账器，用于跟踪写入/读取/未命中次数，并计算每 1000 次请求的混合成本。用目标命中率作为部署门槛——大多数生产 Anthropic 配置在预热后都应达到超过 80% 的读取占比。

## 2026 年仍在上线的常见坑

- **顶部的动态时间戳。** 把 `"Current time: 2026-04-22 15:30:02"` 放在系统提示词顶部，会让每次请求都未命中。把时间戳移到缓存断点之后。
- **工具重排。** 按稳定顺序序列化工具——部署之间字典顺序变化会破坏所有命中。
- **接近但不相同的自由文本。** `"You are helpful."` 与 `"You are a helpful assistant."` 只差一个字节，却会导致完全未命中。
- **内容块太小。** Anthropic 强制最小 1024 词元（Haiku 为 2048）。更小的块不会被缓存，而且通常不会明确报错。
- **不区分缓存的成本看板。** 把“输入词元”拆成已缓存和未缓存两类，否则流量下降会被误判为缓存带来的收益。

## 使用方法

2026 年的缓存技术栈：

| 场景 | 选择 |
|------|------|
| 有稳定的 1 万以上词元系统提示词、对话轮次多的智能体 | Anthropic `cache_control`，5 分钟 TTL |
| 需要复用前缀超过 30 分钟的批处理任务 | Anthropic，设置 `ttl: "1h"` |
| 没有自定义基础设施、运行在 GPT-5 上的 serverless 端点 | OpenAI 自动缓存（只要让前缀稳定且足够长） |
| 需要多天复用超大代码/文档语料 | Gemini 显式 `CachedContent` |
| 跨提供方 fallback | 让各提供方的可缓存前缀布局保持一致，这样任何一处命中都能复用 |

把它与语义缓存（第 11 阶段 · 第 11 课）结合起来处理用户消息层：提示词缓存处理*词元完全相同*的复用，语义缓存处理*含义相同*的复用。

## 交付

保存 `outputs/skill-prompt-caching-planner.md`：

```markdown
---
name: prompt-caching-planner
description: Design a cache-friendly prompt layout and pick the right provider caching mode.
version: 1.0.0
phase: 11
lesson: 15
tags: [llm-engineering, caching, cost]
---

Given a prompt (system + tools + few-shot + retrieval + history + user) and a usage profile (requests per hour, TTL needed, provider), output:

1. Layout. Reordered sections with a single cache breakpoint marked; explain which sections are stable, which are volatile.
2. Provider mode. Anthropic cache_control, OpenAI automatic, or Gemini CachedContent. Justify from TTL and reuse pattern.
3. Break-even. Expected reads per write within TTL; net cost vs no-cache with math.
4. Verification plan. CI assertion that cache_read_input_tokens > 0 on the second identical request; dashboard split by cached vs uncached tokens.
5. Failure modes. List the three most likely reasons the cache will miss in this setup (dynamic timestamp, tool reorder, near-duplicate text) and how you will prevent each.

Refuse to ship a cache plan that places a dynamic field above the breakpoint. Refuse to enable 1h TTL without a reuse count that makes the 2x write premium pay back.
```

## 练习

1. **简单。** 用 Claude 对一个含 5000 词元系统提示词的 10 轮对话进行测试：先不使用 `cache_control`，再使用它。分别报告输入词元账单。
2. **中等。** 编写一个测试工具，给定提示词模板和请求日志，计算各提供方的预期命中率及节省金额（Anthropic 5 分钟、Anthropic 1 小时、OpenAI 自动缓存、Gemini 显式缓存）。
3. **困难。** 构建一个布局优化器：输入一个提示词和一组标记为 `stable=True/False` 的字段，在不丢失信息的前提下重写提示词，把单个缓存断点放在最适合缓存的位置。用真实 Anthropic 端点验证。

## 关键术语

| 术语 | 人们口中的说法 | 它实际指什么 |
|------|-----------------|-----------------------|
| 提示词缓存 | “让长提示词变便宜” | 复用提供方侧与匹配前缀对应的 KV-cache；重复输入词元可获得 50–90% 折扣。 |
| `cache_control` | “Anthropic 标记” | 内容块属性，声明“截至这里的所有内容都可缓存”；值为 `{"type": "ephemeral"}`。 |
| 缓存写入 | “支付溢价” | 第一次填充缓存的请求；Anthropic 按约 1.25 倍输入价格计费，OpenAI 免费。 |
| 缓存读取 | “折扣” | 与前缀匹配的后续请求；Anthropic 按 10%、OpenAI 按 50%、Gemini 按约 25% 计费。 |
| TTL | “缓存能活多久” | 缓存保持热状态的秒数；Anthropic 默认 5 分钟（可延长到 1 小时），OpenAI 尽力而为最长 1 小时，Gemini 由用户设置。 |
| 扩展 TTL | “Anthropic 一小时缓存” | `{"type": "ephemeral", "ttl": "1h"}`；写入溢价为 2 倍，但批处理复用时值得。 |
| 前缀匹配 | “为什么缓存未命中” | 只有从开头到断点的每个词元都逐字节相同，缓存才会命中。 |
| 上下文缓存（Gemini） | “显式缓存” | Google 命名的、按存储计费的缓存对象；适合多天复用大型语料。 |

## 延伸阅读

- [Anthropic：Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) — `cache_control`、1 小时 TTL 和盈亏平衡表。
- [OpenAI：Prompt caching](https://platform.openai.com/docs/guides/prompt-caching) — 自动前缀匹配。
- [Google：Context caching](https://ai.google.dev/gemini-api/docs/caching) — `CachedContent` API 与存储定价。
- [Anthropic 工程：Prompt caching for long-context workloads](https://www.anthropic.com/news/prompt-caching) — 包含延迟数据的原始发布文章。
- 第 11 阶段 · 第 05 课（上下文工程）— 如何切分提示词，让缓存能够落在合适位置。
- 第 11 阶段 · 第 11 课（缓存与成本）— 把提示词缓存与用户消息上的语义缓存配合使用。
- [Pope 等：《Efficiently Scaling Transformer Inference》（2022）](https://arxiv.org/abs/2211.05102) — 提示词缓存暴露给用户的 KV-cache 内存模型；解释为什么重新读取缓存前缀的成本约是重新计算的十分之一。
- [Agrawal 等：《SARATHI: Efficient LLM Inference by Piggybacking Decodes with Chunked Prefills》（2023）](https://arxiv.org/abs/2308.16369) — prefill 是提示词缓存所跳过的阶段；本文解释缓存命中时 TTFT 为什么会大幅下降，而 TPOT 不受影响。
- [Leviathan 等：《Fast Inference from Transformers via Speculative Decoding》（2023）](https://arxiv.org/abs/2211.17192) — 提示词缓存与 speculative decoding、Flash Attention、MQA/GQA 并列，是改变推理成本曲线的杠杆；本文介绍另外三种技术。
