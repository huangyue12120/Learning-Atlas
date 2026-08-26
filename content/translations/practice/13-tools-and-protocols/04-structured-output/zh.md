---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/04-structured-output/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: bd468ed5c79526e09282f88722e4603d5f80e9a3087e8de0e151dd94d48f73cc
status: reviewed
---

# 结构化输出——JSON Schema、Pydantic、Zod 与受约束解码

> 即使面对前沿模型，“礼貌地要求模型返回 JSON”也有 5% 到 15% 的失败率。结构化输出通过受约束解码弥合了这个缺口：模型实际上被禁止输出违反 schema 的 token。OpenAI 的严格模式、Anthropic 的 schema 类型化工具使用、Gemini 的 `responseSchema`、Pydantic AI 的 `output_type` 和 Zod 的 `.parse`，都是同一个思想的五种表面形式。本课构建 schema 校验器和严格模式契约，学习者之后会在每条生产级抽取管线中使用它们。

**类型：** 构建
**语言：** Python（标准库、JSON Schema 2020-12 子集）
**前置课程：** Phase 13 · 02（函数调用深潜）
**时间：** 约 75 分钟

## 学习目标

- 使用正确的约束（enum、min/max、required、pattern）为抽取目标编写 JSON Schema 2020-12。
- 解释严格模式和受约束解码为何能提供不同于“生成后校验”的保证。
- 区分三种失败模式：解析错误、schema 违反和模型拒绝。
- 交付带有类型化修复和类型化拒绝处理的抽取管线。

## 问题

一个读取采购订单邮件的智能体，需要将自由文本转换成 `{customer, line_items, total_usd}`。有三种做法。

**做法一：提示模型输出 JSON。**“用包含 customer、line_items、total_usd 字段的 JSON 回复。”对前沿模型的成功率为 85% 到 95%。它会以六种方式失败：缺少大括号、尾随逗号、错误类型、臆造字段、达到 token 上限时被截断，以及泄漏“这是你的 JSON：”之类的散文。

**做法二：生成后校验。** 自由生成，解析，针对 schema 校验，失败后重试。可靠但昂贵——每次重试都要付费，截断错误每发生一次都会多消耗一个回合。

**做法三：受约束解码。** 提供商在解码时强制 schema。无效 token 会从采样分布中被屏蔽。输出既保证能够解析，也保证能够通过校验。失败收敛为一种模式：拒绝（模型判断输入无法适配 schema）。

每家 2026 年的前沿提供商都提供了某种第三种做法。

- **OpenAI。** `response_format: {type: "json_schema", strict: true}`，如果模型拒绝，响应中会带 `refusal`。
- **Anthropic。** 对 `tool_use` 输入进行 schema 强制；不存在 `stop_reason: "refusal"`，但没有工具调用的 `end_turn` 就是信号。
- **Gemini。** 请求级 `responseSchema`；2026 年 Gemini 对选定类型提供 token 级语法约束。
- **Pydantic AI。** `output_type=InvoiceModel` 会生成类型为 `InvoiceModel` 的结构化 `RunResult`。
- **Zod（TypeScript）。** 针对 Zod schema 校验提供商输出的运行时解析器；与 OpenAI 的 `beta.chat.completions.parse` 配合使用。

共同点是：只声明一次 schema，并端到端执行它。

## 概念

### JSON Schema 2020-12——通用语言

每个提供商都接受 JSON Schema 2020-12。你最常用的构造如下：

- `type`：`object`、`array`、`string`、`number`、`integer`、`boolean`、`null` 之一。
- `properties`：字段名到子 schema 的映射。
- `required`：必须出现的字段名列表。
- `enum`：允许值的封闭集合。
- `minimum` / `maximum`（数字），`minLength` / `maxLength` / `pattern`（字符串）。
- `items`：应用于数组每个元素的子 schema。
- `additionalProperties`：`false` 禁止额外字段（默认行为依模式而异）。

OpenAI 严格模式增加三项要求：每个属性都必须列在 `required` 中，所有位置的 `additionalProperties` 都必须为 `false`，并且不能有未解析的 `$ref`。如果违反这些条件，API 会在请求时返回 400。

### Pydantic：Python 绑定

Pydantic v2 通过 `model_json_schema()` 从数据类形状的模型生成 JSON Schema。Pydantic AI 对此进行封装，因此你可以这样写：

```python
class Invoice(BaseModel):
    customer: str
    line_items: list[LineItem]
    total_usd: Decimal
```

然后，智能体框架会在边缘把 schema 转换成 OpenAI 严格模式、Anthropic `input_schema` 或 Gemini `responseSchema`。模型输出会作为类型化的 `Invoice` 实例返回。校验错误会以带类型错误路径的 `ValidationError` 抛出。

### Zod：TypeScript 绑定

Zod（`z.object({customer: z.string(), ...})`）是 TypeScript 的对应方案。OpenAI 的 Node SDK 暴露 `zodResponseFormat(Invoice)`，把它转换为 API 的 JSON Schema 载荷。

### 拒绝

严格模式不能强迫模型回答。如果输入无法适配 schema（“邮件是一首诗，不是发票”），模型会输出带有原因的 `refusal` 字段。你的代码必须把它作为一等结果处理，而不是当作失败。拒绝也能作为有用的安全信号：如果要求模型从受保护内容的邮件中抽取信用卡号，它会返回带有安全原因的拒绝。

### 开源实现中的受约束解码

开放权重实现使用三种技术。

1. **基于语法的解码**（`outlines`、`guidance`、`lm-format-enforcer`）：根据 schema 构建确定性有限自动机；每一步都屏蔽会违反 FSM 的 token 的 logits。
2. **使用 JSON 解析器的 logit 屏蔽**：让流式 JSON 解析器与模型锁步运行；每一步计算合法的下一个 token 集合。
3. **带校验器的推测解码**：廉价的草稿模型提出 token，校验器强制 schema。

商业提供商在幕后选择这些方法之一。2026 年的技术水平在短结构化输出上比普通生成更快，在长结构化输出上速度大致相同。

### 三种失败模式

1. **解析错误。** 输出不是合法 JSON。严格模式下不可能发生，非严格提供商仍可能发生。
2. **Schema 违反。** 输出可以解析，但违反了 schema。严格模式下不可能发生，在严格模式之外很常见。
3. **拒绝。** 模型拒答。必须将其作为类型化结果处理。

### 重试策略

在严格模式之外（Anthropic 工具使用、非严格 OpenAI、旧版 Gemini），恢复模式是：

```
generate -> parse -> validate -> if fail, inject error and retry, max 3x
```

通常一次重试就够了。三次重试可以捕捉弱模型的偶发失败。超过三次说明 schema 不佳：模型对某些输入无法满足它，需要修正提示或 schema。

### 小模型支持

受约束解码对小模型同样有效。在结构化任务上，一个配有语法强制的 3B 参数开放模型，表现可以超过一个只接受原始提示的 70B 参数模型。这正是结构化输出对生产环境重要的主要原因：它让可靠性与模型大小解耦。

```figure
constrained-decoding
```

## 动手使用

`code/main.py` 用标准库实现了一个最小 JSON Schema 2020-12 校验器（类型、required、enum、min/max、pattern、items、additionalProperties）。它包装一个 `Invoice` schema，并让假的 LLM 输出通过校验器，演示解析错误、schema 违反和拒绝路径。在生产环境中，可以将假的输出替换成任意提供商的真实响应。

请重点观察：

- 校验器返回一个带路径和消息的类型化 `[ValidationError]` 列表。这就是应该呈现给重试提示的形状。
- 拒绝分支不会重试。它记录日志并返回类型化拒绝。Phase 14 · 09 将拒绝作为安全信号使用。
- 对抗性测试输入会触发 `additionalProperties: false` 检查，展示严格模式为何能阻断臆造字段。

## 交付物

本课会生成 `outputs/skill-structured-output-designer.md`。给定一个自由文本抽取目标（发票、支持工单、简历等），这个 skill 会生成兼容严格模式的 JSON Schema 2020-12 和与其对应的 Pydantic 模型，并预留类型化拒绝与重试处理桩。

## 练习

1. 运行 `code/main.py`。添加第四个测试用例，让它的 `total_usd` 为负数。确认校验器在 `minimum` 约束路径上拒绝它。

2. 扩展校验器，支持带判别字段的 `oneOf`。常见情况是：`line_item` 可以是产品或服务，并由 `kind` 标记。严格模式在这里有微妙的规则；请检查 OpenAI 的结构化输出指南。

3. 将同一个 Invoice schema 写成 Pydantic BaseModel，并把 `model_json_schema()` 的输出与手写 schema 比较。找出 Pydantic 默认设置、而手写版本遗漏的那个字段。

4. 测量拒绝率。构造十个不应该被抽取的输入（一段歌词、一份数学证明、一封空邮件），使用严格模式通过真实提供商运行它们。统计拒绝与臆造输出的数量。这就是拒绝感知重试的真实基准。

5. 从头到尾阅读 OpenAI 的结构化输出指南。找出它明确禁止、而普通 JSON Schema 允许的那个构造。然后设计一个非必要地使用该构造的 schema，再将它重构为兼容严格模式的形式。

## 术语

| 术语 | 人们常说 | 实际含义 |
|------|----------------|------------------------|
| JSON Schema 2020-12 | “Schema 规范” | 现代提供商都使用的 IETF 草案 schema 方言 |
| 严格模式 | “保证 schema” | OpenAI 通过受约束解码执行 schema 的标志 |
| 受约束解码 | “Logit 屏蔽” | 在解码时屏蔽无效下一个 token 的强制机制 |
| 拒绝 | “模型拒答” | 输入无法适配 schema 时的类型化结果 |
| 解析错误 | “无效 JSON” | 输出无法解析为 JSON；严格模式下不可能出现 |
| Schema 违反 | “形状错误” | 已经解析，但违反类型 / required / enum / 范围 |
| `additionalProperties: false` | “不允许额外字段” | 禁止未知字段；OpenAI 严格模式要求它 |
| Pydantic BaseModel | “类型化输出” | 生成并校验 JSON Schema 的 Python 类 |
| Zod schema | “TypeScript 输出类型” | 校验提供商输出的 TypeScript 运行时 schema |
| 语法强制 | “开放权重受约束解码” | 基于 FSM 的 logit 屏蔽，如 outlines / guidance 所用 |

## 延伸阅读

- [OpenAI — Structured outputs](https://platform.openai.com/docs/guides/structured-outputs) — 严格模式、拒绝和 schema 要求
- [OpenAI — Introducing structured outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/) — 解释解码保证的 2024 年 8 月发布文章
- [Pydantic AI — Output](https://ai.pydantic.dev/output/) — 序列化到各提供商的类型化 output_type 绑定
- [JSON Schema — 2020-12 release notes](https://json-schema.org/draft/2020-12/release-notes) — 权威规范
- [Microsoft — Structured outputs in Azure OpenAI](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/structured-outputs) — 企业部署说明与严格模式注意事项
