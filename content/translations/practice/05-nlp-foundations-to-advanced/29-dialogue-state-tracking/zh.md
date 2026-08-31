---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/29-dialogue-state-tracking/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 1ae7441f02d6855b0de76775570e7d81879c5798dda2483fd44ec97dbd63d6b3
status: reviewed
---

# 对话状态跟踪

> “I want a cheap restaurant in the north... actually make it moderate... and add Italian.”三轮对话产生三次状态更新。DST 让槽位值字典保持同步，预订才能正确执行。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 17 课（聊天机器人）、Phase 5 第 20 课（结构化输出）  
**预计时间：** 约 75 分钟

## 问题

在任务型对话系统中，用户目标编码成一组槽位值对：`{cuisine: italian, area: north, price: moderate}`。用户每一轮都可能添加、更改或删除槽位。系统必须阅读整段对话，并正确输出当前状态。

只要一个槽位出错，系统就可能预订错误餐厅、安排错误航班，或从错误卡片扣款。DST 连接用户表达与后端执行，是两者之间的枢纽。

即使 2026 年已有 LLM，它仍很重要，原因包括：

- 银行、医疗和航空预订等合规敏感领域需要确定的槽位值，而不是自由形式生成。
- 工具调用智能体在调用 API 前仍需解析槽位。
- 多轮纠正比表面上更难：“actually no, make it Thursday.”

现代流水线组合经典 DST 概念、LLM 抽取器和结构化输出护栏。

## 概念

![DST：对话历史 → 槽位值状态](../assets/dst.svg)

**任务结构。** schema 定义领域（餐厅、酒店、出租车）及其槽位（菜系、区域、价格、人数）。每个槽位可以为空、从封闭集合中取值（价格：{cheap, moderate, expensive}），也可以使用自由形式值（名称：“The Copper Kettle”）。

**两种 DST 表述。**

- **分类。** 对每个（槽位，候选值）对预测是或否，适用于封闭词表槽位，是 2020 年以前的标准方法。
- **生成。** 给定对话，以自由文本生成槽位值，适用于开放词表槽位，是现代默认方案。

**指标。** 联合目标准确率（Joint Goal Accuracy，JGA）表示*每个*槽位都正确的轮次比例，采用全有或全无计分。2026 年 MultiWOZ 2.4 排行榜最高约为 83%。

**架构。**

1. **基于规则（槽位正则 + 关键词）。** 窄领域中的强基线，容易调试。
2. **TripPy / BERT-DST。** 使用 BERT 编码的复制式生成，是 LLM 之前的标准方案。
3. **LDST（LLaMA + LoRA）。** 使用领域槽位提示进行指令微调的 LLM，在 MultiWOZ 2.4 上达到 ChatGPT 水平。
4. **无本体（2024–26）。** 跳过 schema，直接生成槽位名和值，支持开放领域。
5. **提示 + 结构化输出（2024–26）。** LLM 配合 Pydantic schema 与约束解码，只需 5 行代码便能用于生产。

### 经典失效方式

- **跨轮共指。** “Let's stay with the first option.”需要解析第一项到底是什么。
- **覆盖还是追加。** 用户说“add Italian.”，应该替换菜系还是追加？
- **隐式确认。** “OK cool”是否表示接受系统提供的预订？
- **纠正。** “Actually make it 7 pm.”必须更新时间，不能清空其他槽位。
- **指向上一轮系统话语的共指。** “Yes, that one.”中的“that”指哪一个？

```figure
n5-slot-tracker
```

## 动手实现

### 步骤 1：基于规则的槽位抽取器

完整实现见 `code/main.py`。在窄领域中，正则与同义词字典可以覆盖 70% 的典型表达：

```python
CUISINE_SYNONYMS = {
    "italian": ["italian", "pasta", "pizza", "italy"],
    "chinese": ["chinese", "chow mein", "noodles"],
}


def extract_cuisine(utterance):
    for canonical, synonyms in CUISINE_SYNONYMS.items():
        if any(syn in utterance.lower() for syn in synonyms):
            return canonical
    return None
```

它离开规范词表后很脆弱，但适合确定性的槽位确认。

### 步骤 2：状态更新循环

```python
def update_state(state, utterance):
    new_state = dict(state)
    for slot, extractor in SLOT_EXTRACTORS.items():
        value = extractor(utterance)
        if value is not None:
            new_state[slot] = value
    for slot in NEGATION_CLEARS:
        if is_negated(utterance, slot):
            new_state[slot] = None
    return new_state
```

它有三个不变量：

- 绝不重置用户没有触及的槽位。
- 明确否定（“never mind the cuisine”）必须清空槽位。
- 用户纠正（“actually...”）必须覆盖，不能追加。

### 步骤 3：使用结构化输出实现 LLM 驱动的 DST

```python
from pydantic import BaseModel
from typing import Literal, Optional
import instructor

class RestaurantState(BaseModel):
    cuisine: Optional[Literal["italian", "chinese", "indian", "thai", "any"]] = None
    area: Optional[Literal["north", "south", "east", "west", "center"]] = None
    price: Optional[Literal["cheap", "moderate", "expensive"]] = None
    people: Optional[int] = None
    day: Optional[str] = None


def llm_dst(history, llm):
    prompt = f"""You track the slot values of a restaurant booking across turns.
Dialogue so far:
{render(history)}

Update the state based on the latest user turn. Output only the JSON state."""
    return llm(prompt, response_model=RestaurantState)
```

Instructor + Pydantic 保证返回有效状态对象，无需正则，不会发生 schema 不匹配，也不会幻觉出额外槽位。

### 步骤 4：JGA 评估 <!-- learning-atlas: step-4-jga-evaluation -->

```python
def joint_goal_accuracy(predicted_states, gold_states):
    correct = sum(1 for p, g in zip(predicted_states, gold_states) if p == g)
    return correct / len(predicted_states)
```

需要校准的问题是：系统有多少轮把全部槽位都判断正确？MultiWOZ 2.4 上 2026 年顶尖系统达到 80% 至 83%。你的领域内系统应在窄词表上超过这一水平，否则 LLM 基线会胜过它。

### 步骤 5：处理纠正

```python
CORRECTION_CUES = {"actually", "no wait", "on second thought", "change that to"}


def is_correction(utterance):
    return any(cue in utterance.lower() for cue in CORRECTION_CUES)
```

检测到纠正时，应覆盖最近更新的槽位，而不是追加。没有 LLM 帮助很难正确处理。现代模式是让 LLM 每次都根据历史重新生成完整状态，而不是增量更新，这会自然处理纠正。

## 陷阱

- **完整历史重新生成的成本。** 每轮让 LLM 重新生成状态，累计词元成本为 O(n²)。应限制历史长度或总结较早轮次。
- **schema 漂移。** 事后增加新槽位会破坏旧训练数据。必须为 schema 建立版本。
- **大小写敏感。** “Italian”“italian”“ITALIAN”应在各处统一规范化。
- **隐式继承。** 用户先前指定“for 4 people”后，新请求只更改时间时不应清空人数。务必传入完整历史。
- **自由形式与封闭集合。** 姓名、时间和地址需要自由形式槽位；菜系和区域属于封闭集合。schema 应同时容纳两类。

## 使用现成工具

2026 年的技术栈：

| 场景 | 方法 |
|------|------|
| 窄领域（一两个意图） | 基于规则 + 正则 |
| 广领域、有标注数据 | LDST（LLaMA + LoRA，在 MultiWOZ 风格数据上训练） |
| 广领域、无标签、可用于生产 | LLM + Instructor + Pydantic schema |
| 语音 | ASR + 规范化器 + LLM-DST |
| 多领域预订流程 | schema 引导的 LLM + 各领域 Pydantic 模型 |
| 合规敏感 | 以规则为主，LLM 回退并加入确认流程 |

## 交付成果

保存为 `outputs/skill-dst-designer.md`：

```markdown
---
name: dst-designer
description: Design a dialogue state tracker — schema, extractor, update policy, evaluation.
version: 1.0.0
phase: 5
lesson: 29
tags: [nlp, dialogue, task-oriented]
---

Given a use case (domain, languages, vocab openness, compliance needs), output:

1. Schema. Domain list, slots per domain, open vs closed vocabulary per slot.
2. Extractor. Rule-based / seq2seq / LLM-with-Pydantic. Reason.
3. Update policy. Regenerate-whole-state / incremental; correction handling; negation handling.
4. Evaluation. Joint Goal Accuracy on a held-out dialogue set, slot-level precision/recall, confusion on the hardest slot.
5. Confirmation flow. When to explicitly ask the user to confirm (destructive actions, low-confidence extractions).

Refuse LLM-only DST for compliance-sensitive slots without a rule-based secondary check. Refuse any DST that cannot roll back a slot on user correction. Flag schemas without version tags.
```

## 练习

1. **简单。** 用 `code/main.py` 为三个槽位（菜系、区域、价格）构建基于规则的状态跟踪器，在 10 段手工编写的对话上测试并测量 JGA。
2. **中等。** 在同一数据集上使用 Instructor + Pydantic + 小型 LLM，比较 JGA，并检查最困难的轮次。
3. **困难。** 同时实现两种方案并路由：以规则为主，当规则方案以足够置信度输出的槽位少于 2 个时回退到 LLM。测量组合后的 JGA 和每轮推理成本。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| DST | 对话状态跟踪 | 在对话各轮之间维护槽位值字典。 |
| 槽位（slot） | 用户意图的单位 | 后端需要的命名参数，如菜系、日期。 |
| 领域（domain） | 任务范围 | 餐厅、酒店、出租车，各自对应一组槽位。 |
| JGA | 联合目标准确率 | 每个槽位都正确的轮次比例，全有或全无。 |
| MultiWOZ | 基准 | 多领域 Wizard-of-Oz 数据集，DST 的标准评估。 |
| 无本体 DST（ontology-free DST） | 没有 schema | 不使用固定列表，直接生成槽位名和值。 |
| 纠正（correction） | “Actually...” | 覆盖之前已填槽位的轮次。 |

## 延伸阅读

- [Budzianowski 等（2018），MultiWOZ: A Large-Scale Multi-Domain Wizard-of-Oz](https://arxiv.org/abs/1810.00278)：经典基准。
- [Feng 等（2023），Towards LLM-driven Dialogue State Tracking (LDST)](https://arxiv.org/abs/2310.14970)：为 DST 使用 LLaMA + LoRA 指令微调。
- [Heck 等（2020），TripPy: A Triple Copy Strategy for Value Independent Neural Dialog State Tracking](https://arxiv.org/abs/2005.02877)：复制式 DST 主力模型。
- [King、Flanigan（2024），Unsupervised End-to-End Task-Oriented Dialogue with LLMs](https://arxiv.org/abs/2404.10753)：基于 EM 的无监督任务型对话。
- [MultiWOZ 排行榜](https://github.com/budzianowski/multiwoz)：标准 DST 结果。
