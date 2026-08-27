---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/06-tool-use-and-function-calling/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 73cf8bf653c6148817147fd98b4fc780d9794ca3e9651605f6c8e3f242a14992
status: reviewed
---

# 工具使用与函数调用

> Toolformer（Schick 等，2023）开启了自监督工具标注。Berkeley Function Calling Leaderboard V4（Patil 等，2025）确立了 2026 年的标准：40% 智能体式、30% 多轮、10% live、10% non-live、10% 幻觉。单轮调用已经解决，记忆、动态决策和长时程工具链仍未解决。

**类型：** 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 01 节（智能体循环）、第 13 阶段 · 第 01 节（函数调用深入理解）
**用时：** 约 60 分钟

## 学习目标

- 解释 Toolformer 的自监督训练信号：只有在执行工具能降低下一个 token 的损失时，才保留工具标注。
- 说出 BFCL V4 的五个评估类别及每一类衡量的内容。
- 用标准库实现带 schema 验证、参数强制转换和执行沙箱的工具注册表。
- 诊断 2026 年的三个开放问题：长时程工具串联、动态决策和记忆。

## 问题所在

早期工具使用问的是：模型能否预测正确的函数调用？现代工具使用问的是：模型能否在 40 步中串联工具，带着记忆、面对部分可观测性、从工具失败中恢复，同时不去幻觉调用不存在的工具？

Toolformer 建立了基线：模型可以通过自监督学习何时调用工具。BFCL V4 定义了 2026 年的评估目标。生产智能体所处的空间，就是这两者之间的差距。

## 核心概念

### Toolformer（Schick 等，NeurIPS 2023）

想法是：让模型用候选 API 调用标注自己的预训练语料。对每个候选调用执行工具；只有当加入工具结果能降低下一个 token 的损失时，才保留该标注。然后在过滤后的语料上微调。

覆盖的工具包括：计算器、问答系统、搜索引擎、翻译器、日历。这个自监督信号纯粹关注工具是否有助于预测文本，不需要人工标签。

规模结果是：工具使用会在规模上涌现。较小模型会受到工具标注的影响；较大模型则会获益。这解释了为什么 2026 年的 frontier 模型内置了强大的工具使用能力，而大多数 7B 模型需要显式的工具使用微调才能可靠工作。

### Berkeley Function Calling Leaderboard V4（Patil 等，ICML 2025）

BFCL 是 2026 年事实上的评估标准。V4 的构成为：

- **Agentic（40%）**——完整智能体轨迹：记忆、多轮、动态决策。
- **Multi-Turn（30%）**——带工具链的交互式对话。
- **Live（10%）**——用户提交的真实提示词（分布更难）。
- **Non-Live（10%）**——合成测试用例。
- **Hallucination（10%）**——检测不应调用工具的情况。

V3 引入了基于状态的评估：工具序列执行后检查 API 的实际状态（例如“文件是否创建了？”），而不是匹配工具调用的 AST。V4 增加了网页搜索、记忆和格式敏感类别。

2026 年的关键发现是：单轮函数调用已经接近解决。失败主要集中在记忆（跨轮次携带上下文）、动态决策（根据先前结果选择工具）、长时程链（20 多步后的漂移）和幻觉检测（没有合适工具时拒绝调用）。

### 工具 schema

每个提供方都有自己的 schema。细节不同，但形状相同：

```
name: string
description: string (what it does, when to use it)
input_schema: JSON Schema (properties, required, types, enums)
```

Anthropic 直接使用 `input_schema`；OpenAI 使用 `function.parameters`。两者都接受 JSON Schema。描述承担关键作用——模型会阅读描述来选择合适的工具。糟糕的工具描述是选错工具失败的第一大根因。

### 参数验证

不要信任任何工具调用。验证：

1. **类型强制转换。** schema 规定 int 时，模型可能返回字符串 `"5"`。如果转换没有歧义就进行强转，否则拒绝。
2. **枚举验证。** 如果 schema 规定 `status in {"open", "closed"}`，而模型输出 `"in_progress"`，就返回拒绝。
3. **必填字段。** 缺少必填字段时，立即把错误观察结果返回给模型，而不是让程序崩溃。
4. **格式验证。** 日期、电子邮件、URL 应使用具体解析器验证，而不是正则表达式。

每次验证失败都应该返回结构化观察结果，让模型能够以正确形状重试。

### 并行工具调用

现代提供方支持在一个助手轮次中进行并行工具调用。循环如下：

1. 模型发出带有不同 `tool_use_id` 的 3 次工具调用。
2. 运行时执行它们（相互独立时可以并行）。
3. 每个结果作为与 `tool_use_id` 关联的 `tool_result` block 返回。

工程规则是：把关联 ID 视为不可或缺的。交换它们，就会把错误的工具结果路由给错误的工具调用。

### 沙箱

工具执行就是沙箱边界。详细内容参见第 09 节。每个工具都应声明读/写范围、网络访问、超时和内存上限。通用的 `run_shell(cmd)` 是危险信号；具体的 `git_status()` 更安全。

```figure
tool-routing
```

## 动手构建

`code/main.py` 实现了一个生产形状的工具注册表：

- 只用标准库实现的 JSON Schema 子集验证器。
- 注册工具时声明描述、输入 schema、超时和执行器。
- 参数强制转换和枚举验证。
- 带关联 ID 的并行工具分派。
- 将错误观察结果编码为结构化字符串。

运行：

```
python3 code/main.py
```

轨迹展示一个小型智能体在一轮中调用三个工具，其中一次故意格式错误的调用被拒绝，并返回了模型可以据此行动的描述性错误。

## 实际使用

每个提供方都有自己的工具 schema——Anthropic、OpenAI、Gemini、Bedrock。如果需要多提供方支持，请使用转换层（OpenAI Agents SDK、Vercel AI SDK、LangChain 工具适配器）。BFCL 是参考基准；如果工具使用是产品核心能力，在发布前应对智能体运行它。

## 交付

`outputs/skill-tool-registry.md` 会针对给定任务领域生成工具目录、schema 和注册表。它包含描述质量检查（每个工具的描述是否告诉模型何时使用它？）。

## 练习

1. 增加一个“空操作”工具，让模型可以明确拒绝使用其他任何工具。在类似 BFCL 的幻觉测试上进行测量。
2. 为 int-as-string 和 float-as-string 实现参数强制转换。从哪里开始，强制转换会掩盖真正的错误？
3. 增加每个工具的超时和断路器（连续失败 3 次后 60 秒内拒绝调用该工具）。这会如何改变模型的恢复方式？
4. 阅读 BFCL V4 说明。选一个类别（例如“多轮”），让 10 个示例提示词通过你的智能体。报告通过率。
5. 将标准库验证器迁移到 Pydantic 或 Zod。Pydantic/Zod 捕获了哪些玩具验证器漏掉的问题？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Function calling | “工具使用” | 带验证 schema 的结构化输出工具调用 |
| Toolformer | “自监督工具标注” | Schick 2023：保留能降低下一个 token 损失的工具调用 |
| BFCL | “Berkeley Function Calling Leaderboard” | 2026 年基准：40% agentic、30% multi-turn、10% live、10% non-live、10% hallucination |
| Tool schema | “给模型看的函数签名” | 工具名、描述和参数的 JSON Schema |
| tool_use_id | “关联 ID” | 将工具调用绑定到结果；并行分派的关键 |
| Hallucination detection | “知道何时不调用” | V4 类别：没有合适工具时拒绝调用 |
| Argument coercion | “字符串转整数修复” | 对可预期 schema 不匹配进行有限修复；有歧义时拒绝 |
| Sandboxing | “工具执行边界” | 每个工具的读/写范围、网络、超时和内存上限 |

## 延伸阅读

- [Schick 等，Toolformer（arXiv:2302.04761）](https://arxiv.org/abs/2302.04761)——自监督工具标注
- [Berkeley Function Calling Leaderboard（V4）](https://gorilla.cs.berkeley.edu/leaderboard.html)——2026 年评估基准
- [Anthropic，工具使用文档](https://platform.claude.com/docs/en/agent-sdk/overview)——Claude Agent SDK 中的生产级工具 schema
- [OpenAI Agents SDK 文档](https://openai.github.io/openai-agents-python/)——函数工具类型与 Guardrails
