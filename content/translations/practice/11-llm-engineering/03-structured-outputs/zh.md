---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/11-llm-engineering/03-structured-outputs/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 6d310ae5ce8f771c5668d8742f1d1b1c922e738c087225d7c4b31eed492e43d7
status: reviewed
---

# 结构化输出：JSON、模式验证与约束解码

> 你的 LLM 返回的是字符串，而应用需要 JSON。这道鸿沟让生产系统崩溃的次数，比任何模型幻觉都多。结构化输出是自然语言与类型化数据之间的桥梁。做对了，LLM 就是可靠 API；做错了，你会在凌晨 3 点用正则解析自由文本。

**类型：** 构建
**语言：** Python
**前置要求：** 第 10 阶段，第 01–05 课（从零构建 LLM）
**用时：** 约 90 分钟
**相关课程：** 第 05 阶段 · 第 20 课（结构化输出与约束解码）讲解解码器层理论（FSM/CFG logit 处理器、Outlines、XGrammar）。本课聚焦生产 SDK 接口（OpenAI `response_format`、Anthropic 工具调用、Instructor）；如果想理解 API 背后发生了什么，先阅读第 05 阶段 · 第 20 课。

## 学习目标

- 使用 OpenAI 和 Anthropic 的 API 参数实现 JSON 模式与模式约束输出
- 构建 Pydantic 验证层，拒绝格式错误的 LLM 输出，并带着错误反馈重试
- 解释约束解码如何在词元层面强制生成有效 JSON，而无需后处理
- 设计稳健的抽取提示词，把非结构化文本可靠转换为类型化数据结构

## 问题所在

你问 LLM：“从这段文本中提取产品名称、价格和库存状态。”它回答：

```text
The product is the Sony WH-1000XM5 headphones, which cost $348.00 and are currently in stock.
```

这是一个完全正确的回答，但对应用来说完全没用。库存系统需要的是 `{"product": "Sony WH-1000XM5", "price": 348.00, "in_stock": true}`。你需要一个包含特定键、特定类型和特定值约束的 JSON 对象，而不是一句话。

最朴素的解决办法是在提示词中加上“用 JSON 回答”。这在 90% 的情况下有效，剩下 10% 的时候，模型会把 JSON 包在 Markdown 代码围栏里，或者加上“这是 JSON：”这样的前言，或者提前闭合括号，生成语法无效的 JSON。JSON 解析器崩溃，流水线中断。你加上 try/except 和重试循环；重试有时还会产生不同数据。现在你在解析问题上又叠加了一致性问题。

这不只是提示词工程问题，而是解码问题。模型从左向右生成词元。在每个位置，它都会从 10 万多个词元的词表中选择最可能的下一个词元。但在任意位置，其中绝大多数选项都会导致无效 JSON。模型刚输出 `{"price":` 时，下一个词元必须是数字、字符串用的引号、`null`、`true`、`false` 或负号；其他任何词元都会生成无效 JSON。没有约束时，模型可能选择一个在语义上很合理、但在语法上灾难性错误的英语单词。

## 核心概念

### 结构化输出光谱

结构化输出控制有四个层级，可靠性逐级提高。

```mermaid
graph LR
    subgraph Spectrum["结构化输出光谱"]
        direction LR
        A["基于提示词\\n‘返回 JSON’\\n约 90% 有效"] --> B["JSON 模式\\n保证是有效 JSON\\n不保证模式"]
        B --> C["模式模式\\nJSON + 匹配模式\\n保证合规"]
        C --> D["约束解码\\ntoken 级强制\\n100% 合规"]
    end

    style A fill:#1a1a2e,stroke:#ff6b6b,color:#fff
    style B fill:#1a1a2e,stroke:#ffa500,color:#fff
    style C fill:#1a1a2e,stroke:#51cf66,color:#fff
    style D fill:#1a1a2e,stroke:#0f3460,color:#fff
```

**基于提示词**（“返回有效 JSON”）：不提供任何强制机制。模型通常遵循，但偶尔不会。可靠性约 90%。失败形式包括 Markdown 围栏、前言、截断输出和错误结构。

**JSON 模式**：API 保证输出是有效 JSON。OpenAI 通过 `response_format: { type: "json_object" }` 开启它。输出可以无错误解析，但不一定符合预期模式——可能有多余键、错误类型或缺失字段。

**模式模式**：API 接受 JSON Schema，并保证输出与之匹配。2026 年所有主要提供方都原生支持：OpenAI 的 `response_format: { type: "json_schema", json_schema: {...} }`（也可以用 `tool_choice="required"`），Anthropic 的带 `input_schema` 的工具调用，以及 Gemini 的 `response_schema` + `response_mime_type: "application/json"`。输出会具有你指定的精确键、类型和约束。

**约束解码**：生成每个词元时，解码器都会屏蔽所有会产生无效输出的词元。如果模式要求数字，而模型准备输出字母，就把该词元的概率设为 0。模型只能生成最终会导向有效输出的词元。这正是 OpenAI 结构化输出模式以及 Outlines、Guidance 等库在底层实现的机制。

### JSON Schema：契约语言

JSON Schema 用于告诉模型（或验证层）输出必须是什么形状。所有主要结构化输出系统都使用它。

```json
{
  "type": "object",
  "properties": {
    "product": { "type": "string" },
    "price": { "type": "number", "minimum": 0 },
    "in_stock": { "type": "boolean" },
    "categories": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["product", "price", "in_stock"]
}
```

这个模式规定：输出必须是一个对象，包含字符串 `product`、非负数字 `price`、布尔值 `in_stock`，以及可选的字符串数组 `categories`。任何不匹配的输出都会被拒绝。

模式可以处理难题：嵌套对象、带类型元素的数组、枚举（把字符串限制为指定值）、模式匹配（对字符串应用正则），以及组合器（用于多态输出的 oneOf、anyOf、allOf）。

### Pydantic 模式

在 Python 中，你不需要手写 JSON Schema。定义一个 Pydantic 模型，它会自动生成模式。

```python
from pydantic import BaseModel

class Product(BaseModel):
    product: str
    price: float
    in_stock: bool
    categories: list[str] = []
```

这会产生与上面相同的 JSON Schema。Instructor 库（以及 OpenAI SDK）可以直接接受 Pydantic 模型：传入模型类，得到验证过的实例。如果 LLM 输出不匹配，Instructor 会自动重试。

### 函数调用 / 工具使用

这是同一个问题的另一种接口。你不要求模型直接输出 JSON，而是定义带类型参数的“工具”（函数）。模型输出包含结构化参数的函数调用。OpenAI 称之为 function calling，Anthropic 称之为 tool use，结果都是结构化数据。

```mermaid
graph TD
    subgraph ToolUse["工具调用流程"]
        U["用户：从这段评论\\n提取产品信息"] --> M["模型处理输入"]
        M --> TC["工具调用：\\nextract_product(\\n  product='Sony WH-1000XM5',\\n  price=348.00,\\n  in_stock=true\\n)"]
        TC --> V["根据\\n函数模式验证"]
        V --> R["结构化结果：\\n{product, price, in_stock}"]
    end

    style U fill:#1a1a2e,stroke:#0f3460,color:#fff
    style TC fill:#1a1a2e,stroke:#e94560,color:#fff
    style V fill:#1a1a2e,stroke:#ffa500,color:#fff
    style R fill:#1a1a2e,stroke:#51cf66,color:#fff
```

当模型需要选择调用哪个函数，而不只是填充参数时，更适合使用工具调用。假设你有 10 种不同的抽取模式，需要模型根据输入选择正确的一种，工具调用同时提供模式选择和结构化输出。

### 常见失败模式

即使有模式强制，结构化输出也可能以隐蔽方式失败。

**幻觉值**：输出符合模式，却包含编造的数据。文本写的是 $348，模型却生成 `{"price": 299.99}`。模式验证抓不住它——类型正确，值却错误。

**枚举混淆**：你把字段限制为 `["in_stock", "out_of_stock", "preorder"]`，模型输出 `"available"`——语义正确，却不在允许集合中。好的约束解码可以防止这种情况，基于提示词的方法不行。

**嵌套对象深度**：深度嵌套的模式（4 层以上）更容易出错。每多一层嵌套，模型就多一个跟丢结构的地方。

**数组长度**：模型可能在数组中生成过多或过少的项目。模式支持 `minItems` 和 `maxItems`，但并非所有提供方都会在解码层面强制执行它们。

**省略可选字段**：模型省略技术上可选、但对你的用例语义上重要的字段。即使数据有时缺失，也应在模式中把字段设为必需，迫使模型显式输出 `null`。

```figure
mx-schema-funnel
```

## 动手构建

### 第 1 步：JSON Schema 验证器

从零构建一个验证器，检查 Python 对象是否匹配 JSON Schema。这是输出侧验证合规性的组件。

```python
import json

def validate_schema(data, schema):
    errors = []
    _validate(data, schema, "", errors)
    return errors

def _validate(data, schema, path, errors):
    schema_type = schema.get("type")

    if schema_type == "object":
        if not isinstance(data, dict):
            errors.append(f"{path}: expected object, got {type(data).__name__}")
            return
        for key in schema.get("required", []):
            if key not in data:
                errors.append(f"{path}.{key}: required field missing")
        properties = schema.get("properties", {})
        for key, value in data.items():
            if key in properties:
                _validate(value, properties[key], f"{path}.{key}", errors)

    elif schema_type == "array":
        if not isinstance(data, list):
            errors.append(f"{path}: expected array, got {type(data).__name__}")
            return
        min_items = schema.get("minItems", 0)
        max_items = schema.get("maxItems", float("inf"))
        if len(data) < min_items:
            errors.append(f"{path}: array has {len(data)} items, minimum is {min_items}")
        if len(data) > max_items:
            errors.append(f"{path}: array has {len(data)} items, maximum is {max_items}")
        items_schema = schema.get("items", {})
        for i, item in enumerate(data):
            _validate(item, items_schema, f"{path}[{i}]", errors)

    elif schema_type == "string":
        if not isinstance(data, str):
            errors.append(f"{path}: expected string, got {type(data).__name__}")
            return
        enum_values = schema.get("enum")
        if enum_values and data not in enum_values:
            errors.append(f"{path}: '{data}' not in allowed values {enum_values}")

    elif schema_type == "number":
        if not isinstance(data, (int, float)):
            errors.append(f"{path}: expected number, got {type(data).__name__}")
            return
        minimum = schema.get("minimum")
        maximum = schema.get("maximum")
        if minimum is not None and data < minimum:
            errors.append(f"{path}: {data} is less than minimum {minimum}")
        if maximum is not None and data > maximum:
            errors.append(f"{path}: {data} is greater than maximum {maximum}")

    elif schema_type == "boolean":
        if not isinstance(data, bool):
            errors.append(f"{path}: expected boolean, got {type(data).__name__}")

    elif schema_type == "integer":
        if not isinstance(data, int) or isinstance(data, bool):
            errors.append(f"{path}: expected integer, got {type(data).__name__}")
```

### 第 2 步：从 Pydantic 风格模型生成模式

构建一个最小的类到模式转换器。定义 Python 类，并自动生成 JSON Schema。

```python
class SchemaField:
    def __init__(self, field_type, required=True, default=None, enum=None, minimum=None, maximum=None):
        self.field_type = field_type
        self.required = required
        self.default = default
        self.enum = enum
        self.minimum = minimum
        self.maximum = maximum

def python_type_to_schema(field):
    type_map = {
        str: "string",
        int: "integer",
        float: "number",
        bool: "boolean",
    }

    schema = {}

    if field.field_type in type_map:
        schema["type"] = type_map[field.field_type]
    elif field.field_type == list:
        schema["type"] = "array"
        schema["items"] = {"type": "string"}
    elif isinstance(field.field_type, dict):
        schema = field.field_type

    if field.enum:
        schema["enum"] = field.enum
    if field.minimum is not None:
        schema["minimum"] = field.minimum
    if field.maximum is not None:
        schema["maximum"] = field.maximum

    return schema

def model_to_schema(name, fields):
    properties = {}
    required = []

    for field_name, field in fields.items():
        properties[field_name] = python_type_to_schema(field)
        if field.required:
            required.append(field_name)

    return {
        "type": "object",
        "properties": properties,
        "required": required,
    }
```

### 第 3 步：约束词元过滤器

模拟约束解码。给定部分 JSON 字符串和一个模式，判断当前位置允许哪些词元类别。

```python
def next_valid_tokens(partial_json, schema):
    stripped = partial_json.strip()

    if not stripped:
        return ["{"]

    try:
        json.loads(stripped)
        return ["<EOS>"]
    except json.JSONDecodeError:
        pass

    last_char = stripped[-1] if stripped else ""

    if last_char == "{":
        return ['"', "}"]
    elif last_char == '"':
        if stripped.endswith('":'):
            return ['"', "0-9", "true", "false", "null", "[", "{"]
        return ["a-z", '"']
    elif last_char == ":":
        return [" ", '"', "0-9", "true", "false", "null", "[", "{"]
    elif last_char == ",":
        return [" ", '"', "{", "["]
    elif last_char in "0123456789":
        return ["0-9", ".", ",", "}", "]"]
    elif last_char == "}":
        return [",", "}", "]", "<EOS>"]
    elif last_char == "]":
        return [",", "}", "<EOS>"]
    elif last_char == "[":
        return ['"', "0-9", "true", "false", "null", "{", "[", "]"]
    else:
        return ["any"]

def demonstrate_constrained_decoding():
    partial_states = [
        '',
        '{',
        '{"product"',
        '{"product":',
        '{"product": "Sony"',
        '{"product": "Sony",',
        '{"product": "Sony", "price":',
        '{"product": "Sony", "price": 348',
        '{"product": "Sony", "price": 348}',
    ]

    print(f"{'Partial JSON':<45} {'Valid Next Tokens'}")
    print("-" * 80)
    for state in partial_states:
        valid = next_valid_tokens(state, {})
        display = state if state else "(empty)"
        print(f"{display:<45} {valid}")
```

### 第 4 步：抽取流水线

把所有部分组合为抽取流水线：定义模式，模拟 LLM 生成结构化输出，验证输出，并处理重试。

```python
def simulate_llm_extraction(text, schema, attempt=0):
    if "headphones" in text.lower() or "sony" in text.lower():
        if attempt == 0:
            return '{"product": "Sony WH-1000XM5", "price": 348.00, "in_stock": true, "categories": ["audio", "headphones"]}'
        return '{"product": "Sony WH-1000XM5", "price": 348.00, "in_stock": true}'

    if "laptop" in text.lower():
        return '{"product": "MacBook Pro 16", "price": 2499.00, "in_stock": false, "categories": ["computers"]}'

    return '{"product": "Unknown", "price": 0, "in_stock": false}'

def extract_with_retry(text, schema, max_retries=3):
    for attempt in range(max_retries):
        raw = simulate_llm_extraction(text, schema, attempt)

        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            print(f"  Attempt {attempt + 1}: JSON parse error -- {e}")
            continue

        errors = validate_schema(data, schema)
        if not errors:
            return data

        print(f"  Attempt {attempt + 1}: Schema validation errors -- {errors}")

    return None

product_schema = {
    "type": "object",
    "properties": {
        "product": {"type": "string"},
        "price": {"type": "number", "minimum": 0},
        "in_stock": {"type": "boolean"},
        "categories": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["product", "price", "in_stock"],
}
```

### 第 5 步：运行完整流水线

```python
def run_demo():
    print("=" * 60)
    print("  Structured Output Pipeline Demo")
    print("=" * 60)

    print("\n--- Schema Definition ---")
    product_fields = {
        "product": SchemaField(str),
        "price": SchemaField(float, minimum=0),
        "in_stock": SchemaField(bool),
        "categories": SchemaField(list, required=False),
    }
    generated_schema = model_to_schema("Product", product_fields)
    print(json.dumps(generated_schema, indent=2))

    print("\n--- Schema Validation ---")
    test_cases = [
        ({"product": "Test", "price": 10.0, "in_stock": True}, "Valid object"),
        ({"product": "Test", "price": -5.0, "in_stock": True}, "Negative price"),
        ({"product": "Test", "in_stock": True}, "Missing price"),
        ({"product": "Test", "price": "ten", "in_stock": True}, "String as price"),
        ("not an object", "String instead of object"),
    ]

    for data, label in test_cases:
        errors = validate_schema(data, product_schema)
        status = "PASS" if not errors else f"FAIL: {errors}"
        print(f"  {label}: {status}")

    print("\n--- Constrained Decoding Simulation ---")
    demonstrate_constrained_decoding()

    print("\n--- Extraction Pipeline ---")
    texts = [
        "The Sony WH-1000XM5 headphones are priced at $348 and currently available.",
        "The new MacBook Pro 16-inch laptop costs $2499 but is sold out.",
        "This is a random sentence with no product info.",
    ]

    for text in texts:
        print(f"\n  Input: {text[:60]}...")
        result = extract_with_retry(text, product_schema)
        if result:
            print(f"  Output: {json.dumps(result)}")
        else:
            print(f"  Output: FAILED after retries")
```

## 使用方法

### OpenAI 结构化输出

```python
# from openai import OpenAI
# from pydantic import BaseModel
#
# client = OpenAI()
#
# class Product(BaseModel):
#     product: str
#     price: float
#     in_stock: bool
#
# response = client.beta.chat.completions.parse(
#     model="gpt-5-mini",
#     messages=[
#         {"role": "system", "content": "Extract product information."},
#         {"role": "user", "content": "Sony WH-1000XM5, $348, in stock"},
#     ],
#     response_format=Product,
# )
#
# product = response.choices[0].message.parsed
# print(product.product, product.price, product.in_stock)
```

OpenAI 的结构化输出模式在内部使用约束解码。模型生成的每个词元都保证最终输出匹配 Pydantic 模式。不需要重试，也不需要验证，因为约束已经写进解码过程。

### Anthropic 工具调用

```python
# import anthropic
#
# client = anthropic.Anthropic()
#
# response = client.messages.create(
#     model="claude-opus-4-7",
#     max_tokens=1024,
#     tools=[{
#         "name": "extract_product",
#         "description": "Extract product information from text",
#         "input_schema": {
#             "type": "object",
#             "properties": {
#                 "product": {"type": "string"},
#                 "price": {"type": "number"},
#                 "in_stock": {"type": "boolean"},
#             },
#             "required": ["product", "price", "in_stock"],
#         },
#     }],
#     messages=[{"role": "user", "content": "Extract: Sony WH-1000XM5, $348, in stock"}],
# )
```

Anthropic 通过工具调用实现结构化输出。模型发出一个带结构化参数、且匹配 `input_schema` 的工具调用。结果相同，只是 API 表面不同。

### Instructor 库

```python
# pip install instructor
# import instructor
# from openai import OpenAI
# from pydantic import BaseModel
#
# client = instructor.from_openai(OpenAI())
#
# class Product(BaseModel):
#     product: str
#     price: float
#     in_stock: bool
#
# product = client.chat.completions.create(
#     model="gpt-5-mini",
#     response_model=Product,
#     messages=[{"role": "user", "content": "Sony WH-1000XM5, $348, in stock"}],
# )
```

Instructor 包装任意 LLM 客户端，并增加带验证的自动重试。如果第一次尝试验证失败，它会把错误作为上下文发回模型，并要求模型修正输出。它适用于任何提供方，而不只是 OpenAI。

## 交付成果

本课产出 `outputs/prompt-structured-extractor.md` —— 一个可复用的提示模板：给定模式定义，从任意文本中抽取结构化数据。输入 JSON Schema 和非结构化文本，得到经过验证的 JSON。

同时产出 `outputs/skill-structured-outputs.md` —— 根据提供方、可靠性要求和模式复杂度选择结构化输出策略的决策框架。

## 练习

1. 扩展模式验证器以支持 `oneOf`（数据必须恰好匹配多个模式中的一个）。这可以处理多态输出，例如字段可以是形状不同的 `Product` 或 `Service` 对象。

2. 构建“模式 diff”工具，识别破坏性变更（删除必需字段、修改类型）与非破坏性变更（增加可选字段、放宽约束）。这是在生产环境中为抽取模式做版本管理的基础。

3. 实现更真实的约束解码模拟器。给定 JSON Schema 和包含 100 个词元（字母、数字、标点、关键字）的词表，逐步生成，在每个位置屏蔽无效词元。测量每一步词表中有效词元的比例。

4. 构建抽取评估套件。创建 50 条带人工标注 JSON 输出的产品描述，在全部 50 条上运行抽取流水线，测量精确匹配、字段级准确率和类型合规率。找出最难正确抽取的字段。

5. 给抽取流水线增加“置信度分数”。为每个抽取字段估计模型的置信度（依据词元概率，或运行 3 次抽取并测量一致性）。把低置信度字段标记为需要人工审核。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------------|------|
| JSON 模式 | “返回 JSON” | 保证语法有效的 JSON 输出的 API 开关，但不强制任何特定模式 |
| 结构化输出 | “类型化 JSON” | 匹配特定 JSON Schema、具有正确键、类型和约束的输出 |
| 约束解码 | “引导生成” | 在每个词元位置屏蔽会产生无效输出的词元，保证 100% 模式合规 |
| JSON Schema | “JSON 模板” | 描述 JSON 数据结构、类型和约束的声明式语言（OpenAPI、JSON Forms 等都使用） |
| Pydantic | “加强版 Python dataclass” | 定义带类型验证的数据模型的 Python 库，可被 FastAPI 和 Instructor 用于生成 JSON Schema |
| 函数调用 | “工具使用” | LLM 输出结构化函数调用（名称 + 类型化参数），而不是自由文本；OpenAI 和 Anthropic 都支持 |
| Instructor | “LLM 的 Pydantic” | 包装 LLM 客户端、返回经过验证的 Pydantic 实例，并在验证失败时自动重试的 Python 库 |
| 词元屏蔽 | “过滤词表” | 在生成期间把特定词元的概率设为 0，使模型无法生成它们 |
| 模式合规 | “匹配形状” | 输出包含全部必需字段、类型正确、值满足约束，且没有不允许的额外字段 |
| 重试循环 | “一直重试到成功” | 把验证错误发回模型，要求它修正输出；Instructor 会自动执行，最多重试指定次数 |

## 延伸阅读

- [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs) —— OpenAI 官方 JSON Schema 约束解码文档
- [Willard & Louf, 2023 —— “Efficient Guided Generation for Large Language Models”](https://arxiv.org/abs/2307.09702) —— Outlines 论文，介绍把 JSON Schema 编译为有限状态机进行词元级约束
- [Instructor documentation](https://python.useinstructor.com/) —— 使用 Pydantic 验证和重试从任意 LLM 获取结构化输出的标准库
- [Anthropic Tool Use Guide](https://docs.anthropic.com/en/docs/tool-use) —— Claude 如何通过带 JSON Schema 的 `input_schema` 工具调用实现结构化输出
- [JSON Schema specification](https://json-schema.org/) —— 所有主要结构化输出系统使用的模式语言完整规范
- [Outlines library](https://github.com/outlines-dev/outlines) —— 将正则和 JSON Schema 编译为有限状态机的开源约束生成库
- [Dong et al., “XGrammar: Flexible and Efficient Structured Generation Engine for Large Language Models” (MLSys 2025)](https://arxiv.org/abs/2411.15100) —— 当前先进的语法引擎，通过下推自动机编译，以约 100 ns/词元的速度执行词元屏蔽
- [Beurer-Kellner et al., “Prompting Is Programming: A Query Language for Large Language Models” (LMQL)](https://arxiv.org/abs/2212.06094) —— LMQL 论文，把带类型和值约束的约束解码描述为查询语言
- [Microsoft Guidance (framework docs)](https://github.com/guidance-ai/guidance) —— 基于模板的约束生成，是 Outlines 和 XGrammar 的厂商无关补充方案。
