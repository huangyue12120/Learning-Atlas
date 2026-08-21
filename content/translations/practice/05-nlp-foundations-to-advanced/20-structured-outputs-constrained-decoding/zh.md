---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: be2656f8a0ad2ca753a9ec60fd3b43bb1aa6a7fc0623f179c4a124cb93160ee3
status: reviewed
---

# 结构化输出与约束解码

> 要求 LLM 返回 JSON，大多数时候会得到 JSON。生产环境的问题正是“大多数”。约束解码在采样前修改 logit，让“大多数”变成“每一次”。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 17 课（聊天机器人）、Phase 5 第 19 课（子词分词）  
**预计时间：** 约 60 分钟

## 问题

一个分类器提示 LLM：“Return one of {positive, negative, neutral}.”模型返回：“The sentiment is positive — this review is overwhelmingly favorable because the customer explicitly states that they ...”。解析器随即崩溃，分类器的 F1 变成 0.0。

自由形式生成并不是契约，只是一项建议。生产系统需要契约。

2026 年存在三层方案。

1. **提示。** 礼貌地要求：“Return only the JSON object.”前沿模型约有 80% 的情况能遵守，小型模型更低。
2. **原生结构化输出 API。** OpenAI `response_format`、Anthropic 工具调用、Gemini JSON 模式。支持的 schema 上可靠，但会绑定供应商。
3. **约束解码。** 每一步生成时修改 logit，让模型无法发出无效词元。从构造上保证 100% 有效，并适用于任意本地模型。

下面比较三种方案的工作方式及各自的适用场景。

## 概念

![约束解码在每一步屏蔽无效词元](../assets/constrained-decoding.svg)

**约束解码的工作方式。** 每一步生成时，LLM 都会针对完整词表（约 10 万词元）输出一个 logit 向量。*logit 处理器（logit processor）*位于模型与采样器之间。它根据目标语法中的当前位置计算哪些词元有效，目标语法可以是 JSON Schema、正则表达式或上下文无关文法。处理器把所有无效词元的 logit 设为负无穷，随后对剩余 logit 做 softmax，概率质量只会分配给有效的后续词元。

2026 年的实现包括：

- **Outlines。** 把 JSON Schema 或正则表达式编译成有限状态机。每个词元都能用 O(1) 查询得到有效的下一词元。它基于 FSM，因此递归 schema 需要扁平化。
- **XGrammar / llguidance。** 上下文无关文法引擎，可以处理递归 JSON Schema，解码开销接近于零。OpenAI 曾说明其 2025 年结构化输出实现借鉴了 llguidance。
- **vLLM 引导解码。** 通过 Outlines、XGrammar 或 lm-format-enforcer 后端内置 `guided_json`、`guided_regex`、`guided_choice` 和 `guided_grammar`。
- **Instructor。** 基于 Pydantic 的通用 LLM 包装器，验证失败时重试。它跨供应商工作，但不修改 logit，而是依靠重试和针对结构化输出设计的提示。

### 反直觉的结果

约束解码往往比无约束生成更快，原因有两个。第一，它缩小了下一词元搜索空间。第二，聪明的实现会完全跳过已确定词元的生成，例如 `{"name": "` 这样的脚手架中，每个字节都已经确定。

### 会带来实际损失的陷阱

字段顺序很重要。把 `answer` 放在 `reasoning` 前面，模型会在思考前就给出答案。JSON 有效，答案却错了，任何验证都无法发现。

```json
// BAD
{"answer": "yes", "reasoning": "because ..."}

// GOOD
{"reasoning": "... therefore ...", "answer": "yes"}
```

schema 字段顺序属于逻辑，而非格式。

```figure
constrained-decoder
```

## 动手实现

### 步骤 1：从零实现正则约束生成

独立 FSM 实现见 `code/main.py`。以下 30 行展示了核心思路：

```python
def mask_logits(logits, valid_token_ids):
    mask = [float("-inf")] * len(logits)
    for tid in valid_token_ids:
        mask[tid] = logits[tid]
    return mask


def generate_constrained(model, tokenizer, prompt, fsm):
    ids = tokenizer.encode(prompt)
    state = fsm.initial_state
    while not fsm.is_accept(state):
        logits = model.next_token_logits(ids)
        valid = fsm.valid_tokens(state, tokenizer)
        logits = mask_logits(logits, valid)
        tok = sample(logits)
        ids.append(tok)
        state = fsm.transition(state, tok)
    return tokenizer.decode(ids)
```

FSM 跟踪语法中已经满足的部分。`valid_tokens(state, tokenizer)` 计算哪些词表词元能推动 FSM 前进，同时仍保留通往接受状态的路径。

### 步骤 2：使用 Outlines 生成符合 JSON Schema 的输出

```python
from pydantic import BaseModel
from typing import Literal
import outlines


class Review(BaseModel):
    sentiment: Literal["positive", "negative", "neutral"]
    confidence: float
    evidence_span: str


model = outlines.models.transformers("meta-llama/Llama-3.2-3B-Instruct")
generator = outlines.generate.json(model, Review)

result = generator("Classify: 'The wait staff was attentive and the food arrived hot.'")
print(result)
# Review(sentiment='positive', confidence=0.93, evidence_span='attentive ... hot')
```

验证错误为零，而且始终如此。FSM 让无效输出成为不可到达状态。

### 步骤 3：使用 Instructor 实现跨供应商 Pydantic

```python
import instructor
from anthropic import Anthropic
from pydantic import BaseModel, Field


class Invoice(BaseModel):
    vendor: str
    total_usd: float = Field(ge=0)
    line_items: list[str]


client = instructor.from_anthropic(Anthropic())
invoice = client.messages.create(
    model="claude-opus-4-7",
    max_tokens=1024,
    response_model=Invoice,
    messages=[{"role": "user", "content": "Extract from: 'Acme Corp $420. Widget, Gizmo.'"}],
)
```

它采用不同机制。Instructor 不修改 logit，而是把 schema 写入提示，解析输出，并在验证失败时重试，默认最多 3 次。它适用于任意供应商，但重试会增加延迟和成本。跨供应商可移植性是它的主要卖点。

### 步骤 4：供应商原生 API

```python
from openai import OpenAI

client = OpenAI()
response = client.responses.create(
    model="gpt-5",
    input=[{"role": "user", "content": "Classify: 'The food was cold.'"}],
    text={"format": {"type": "json_schema", "name": "sentiment",
          "schema": {"type": "object", "required": ["sentiment"],
                     "properties": {"sentiment": {"type": "string",
                                                  "enum": ["positive", "negative", "neutral"]}}}}},
)
print(response.output_parsed)
```

服务器端执行约束解码。对受支持的 schema，它的可靠性与 Outlines 相当，也无需管理本地模型，代价是绑定供应商。

## 陷阱

- **递归 schema。** Outlines 会把递归扁平化到固定深度。树形输出，如嵌套评论和抽象语法树，需要基于 CFG 的 XGrammar 或 llguidance。
- **超大枚举。** 包含 10,000 个选项的枚举会缓慢编译或超时。此时应改用检索器：先预测前 k 个候选，再把约束范围缩小到这些候选。
- **语法过于严格。** 用正则强制 `date: "YYYY-MM-DD"` 时，模型无法为缺失日期输出 `"unknown"`，于是可能编造日期。应允许 `null` 或哨兵值。
- **过早承诺。** 参见上面的字段顺序陷阱。始终先放 reasoning 字段。
- **供应商 JSON 模式未提供 schema。** 单纯的 JSON 模式只保证 JSON 有效，不保证它满足你的用例。务必提供完整 schema。

## 使用现成工具

2026 年的技术栈：

| 场景 | 选择 |
|------|------|
| 使用 OpenAI、Anthropic 或 Google 模型，schema 简单 | 供应商原生结构化输出 |
| 任意供应商、Pydantic 工作流、可以接受重试 | Instructor |
| 本地模型、要求 100% 有效、扁平 schema | Outlines（FSM） |
| 本地模型、递归 schema | XGrammar 或 llguidance |
| 自托管推理服务器 | vLLM 引导解码 |
| 可接受重试的批处理 | Instructor + 最便宜的模型 |

## 交付成果

保存为 `outputs/skill-structured-output-picker.md`：

```markdown
---
name: structured-output-picker
description: Choose a structured output approach, schema design, and validation plan.
version: 1.0.0
phase: 5
lesson: 20
tags: [nlp, llm, structured-output]
---

Given a use case (provider, latency budget, schema complexity, failure tolerance), output:

1. Mechanism. Native vendor structured output, Instructor retries, Outlines FSM, or XGrammar CFG. One-sentence reason.
2. Schema design. Field order (reasoning first, answer last), nullable fields for "unknown", enum vs regex, required fields.
3. Failure strategy. Max retries, fallback model, graceful `null` handling, out-of-distribution refusal.
4. Validation plan. Schema compliance rate (target 100%), semantic validity (LLM-judge), field-coverage rate, latency p50/p99.

Refuse any design that puts `answer` or `decision` before reasoning fields. Refuse to use bare JSON mode without a schema. Flag recursive schemas behind an FSM-only library.
```

## 练习

1. **简单。** 不使用约束解码，提示一个小型开放权重模型（如 Llama-3.2-3B）生成 `Review(sentiment, confidence, evidence_span)`。在 100 条评论上测量能解析为有效 JSON 的比例。
2. **中等。** 对同一语料使用 Outlines JSON 模式，比较合规率、延迟和语义准确率。
3. **困难。** 从零实现电话号码（`\d{3}-\d{3}-\d{4}`）的正则约束解码器，在 1,000 次采样上验证无效输出为 0。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 约束解码（constrained decoding） | 强制输出有效 | 每一步生成时屏蔽无效词元的 logit。 |
| logit 处理器（logit processor） | 施加约束的组件 | 函数：`(logits, state) -> masked_logits`。 |
| FSM | 有限状态机 | 编译后的语法表示，可以用 O(1) 查询有效的下一词元。 |
| CFG | 上下文无关文法 | 能处理递归的文法，比 FSM 慢但表达能力更强。 |
| schema 字段顺序 | 有影响吗？ | 有，首个字段会先承诺结论；始终把 reasoning 放在 answer 前面。 |
| 引导解码（guided decoding） | vLLM 对它的称呼 | 同一概念，集成进推理服务器。 |
| JSON 模式 | OpenAI 的早期版本 | 保证 JSON 语法有效，但不保证与 schema 匹配。 |

## 延伸阅读

- [Willard、Louf（2023），Efficient Guided Generation for LLMs](https://arxiv.org/abs/2307.09702)：Outlines 论文。
- [XGrammar 论文（2024）](https://arxiv.org/abs/2411.15100)：基于 CFG 的高速约束解码。
- [vLLM：Structured Outputs](https://docs.vllm.ai/en/latest/features/structured_outputs.html)：推理服务器集成。
- [OpenAI：Structured Outputs 指南](https://platform.openai.com/docs/guides/structured-outputs)：API 参考与易错点。
- [Instructor 库](https://python.useinstructor.com/)：跨供应商的 Pydantic 与重试机制。
- [JSONSchemaBench（2025）](https://arxiv.org/abs/2501.10868)：比较 6 种约束解码框架的基准。
