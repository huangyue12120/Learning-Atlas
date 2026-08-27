---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/16-multi-agent-and-swarms/02-fipa-acl-heritage/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 234056963823e7433e031e18b2d7513c4dfbb778753155bd869af6bbda0df241
status: reviewed
---

# FIPA-ACL 与言语行为的传承

> 在 MCP 和 A2A 之前，已有 FIPA-ACL。2000 年，IEEE Foundation for Intelligent Physical Agents 批准了一种智能体通信语言：二十种施为词、两种内容语言，以及一组交互协议——合同网、订阅/通知、条件请求。它淡出业界，是因为本体负担对 Web 过于沉重；但 LLM 对多智能体系统的复兴正悄然以没有形式语义的方式重建相同思想：JSON 合同替代施为词，自然语言替代本体。本课认真研读 FIPA-ACL，让你看清 2026 年的协议决策中哪些是重新发明，哪些才是新颖之处，以及当下浪潮会重新遇到哪些 2000 年代已经解决的问题。

**类型：** 学习
**语言：** Python（标准库）
**前置要求：** 第 16 阶段 · 01（为什么要多智能体）
**用时：** 约 60 分钟

## 问题

2026 年的智能体协议版图很拥挤：用于工具的 MCP、用于智能体的 A2A、用于企业审计的 ACP、用于去中心化信任的 ANP、用于自然语言内容的 NLIP，此外还有 CA-MCP 和二十多项研究提案。每一份规范都宣称自己是基础性的。

这些协议大多重新发现了一棵非常具体、已有二十年历史的决策树。Austin（1962）和 Searle（1969）的言语行为理论给出了“话语即行动”。KQML（1993）将它变成线路协议。FIPA-ACL（2000 年批准）形成了参考标准：二十种施为词、SL0/SL1 内容语言，以及合同网和订阅—通知等交互协议。JADE 和 JACK 是 Java 参考平台。该努力在 2010 年前后衰退，因为本体开销太重，而 Web 胜出了。

当你看到 MCP 的 `tools/call`、A2A 的任务生命周期或 CA-MCP 的共享上下文存储时，看到的是以 JSON 为原生格式、较为宽松的 FIPA 决策重述。了解这段传承能告诉你两件事：哪些所谓新“创新”是重新发明，哪些旧失效模式会被新规范再次发现。

## 概念

### 一段话理解言语行为

Austin 注意到，某些句子不描述世界，而会改变世界：“我承诺。”“我请求。”“我宣布。”他称其为施为性话语。Searle 将它形式化为五类：断言、指令、承诺、表达、宣告。KQML（Finin 等，1993）使其可用于软件智能体：消息由施为词（行动）和内容（行动所关于的对象）组成。FIPA-ACL 补齐 KQML 的缺口，并围绕二十种施为词完成标准化。

### 二十种 FIPA 施为词（部分列表）

| 施为词 | 意图 |
|---|---|
| `inform` | “我告诉你 P 为真” |
| `request` | “我请求你做 X” |
| `query-if` | “P 为真吗？” |
| `query-ref` | “X 的值是什么？” |
| `propose` | “我提议做 X” |
| `accept-proposal` | “我接受该提议” |
| `reject-proposal` | “我拒绝该提议” |
| `agree` | “我同意做 X” |
| `refuse` | “我拒绝做 X” |
| `confirm` | “我确认 P 为真” |
| `disconfirm` | “我否认 P” |
| `not-understood` | “你的消息无法解析” |
| `cfp` | “征集有关 X 的提案” |
| `subscribe` | “X 变化时通知我” |
| `cancel` | “取消正在进行的 X” |
| `failure` | “我尝试了 X 但失败了” |

完整列表见 `fipa00037.pdf`（FIPA ACL Message Structure）。重点不在于背诵它，而在于其中每一项都对应 LLM 协议最终会重新加入的一种原语。

### 规范的 FIPA-ACL 消息

```
(inform
  :sender       agent1@platform
  :receiver     agent2@platform
  :content      "((price IBM 83))"
  :language     SL0
  :ontology     finance
  :protocol     fipa-request
  :conversation-id   conv-42
  :reply-with   msg-17
)
```

七个字段构成协议信封；一个字段（`content`）承载载荷。其余字段恰好就是你每次为 JSON 协议补上重试、线程关联和本体时重新发明的内容。

### 两个旧平台

**JADE**（Java Agent DEvelopment framework，1999–2020 年代）是最常用的符合 FIPA 的运行时。智能体扩展基类、交换 ACL 消息、在容器中运行，并用“行为”协作。交互协议库附带合同网、订阅—通知、条件请求及提议—接受。

**JACK**（Agent Oriented Software，商用）强调在 FIPA 消息之上的 BDI（Belief-Desire-Intention，信念—愿望—意图）推理。更形式化，采用较少。

两个平台都在 Web 技术栈吞没多智能体用例后衰落。MCP 和 A2A 则是 2026 年的运行时“容器”。

### FIPA 为什么衰落

- **本体开销。** FIPA 要求共享本体才能解析 `content`。就本体达成一致是多年标准化过程；Web 只用了 HTTP + JSON。
- **没人使用的形式语义。** SL（Semantic Language）给出严格的真值条件，但多数生产系统采用自由格式内容并忽略形式主义。
- **工具锁定。** JADE 仅支持 Java；JACK 为商用。多语言团队绕开了两者。
- **互联网赢得技术栈。** REST、JSON-RPC、gRPC 依次替代 ACL 的传输层。

### LLM 复兴是 FIPA-lite

将 FIPA `request` 与 MCP `tools/call` 比较：

```
(request                                {
  :sender  agent1                         "jsonrpc": "2.0",
  :receiver tool-server                   "method":  "tools/call",
  :content "(lookup stock IBM)"           "params":  {"name":"lookup_stock",
  :ontology finance                                   "arguments":{"symbol":"IBM"}},
  :conversation-id c42                    "id": 42
)                                        }
```

同一信封，不同语法。两者都承载：谁、发送给谁、意图、载荷、关联 ID。它们沿用相同设计，各自作出不同取舍。

Liu 等人在 2025 年的综述（“A Survey of Agent Interoperability Protocols: MCP, ACP, A2A, ANP”，arXiv:2505.02279）明确指出这条谱系：MCP 对应工具使用言语行为，A2A 对应智能体对等言语行为，ACP 对应审计轨迹言语行为，ANP 对应去中心化身份扩展。新规范是带 JSON 语法和宽松语义的 ACL 后代。

### 用直白语言说明取舍

**FIPA 给了你、现代规范舍弃的东西：**

- 形式语义——你可证明 `inform` 意味着发送者相信该内容。
- 规范的施为词目录——你不必重新争论“是否应有 `cancel`？”。
- 数十年的交互协议模式——合同网、订阅—通知、提议—接受——且具有已知的正确性属性。

**现代规范给了你、FIPA 没有的东西：**

- 与所有现代工具兼容的 JSON 原生载荷。
- LLM 不用手写本体也能解释的自然语言内容。
- Web 技术栈传输（HTTP、SSE、WebSocket）。
- 通过实时 MCP `server/discover` 和 A2A Agent Card 进行能力发现。

用更宽松的意图语义换取更容易实现，这项取舍保留了准确的边界。

### 值得迁移的交互协议

FIPA 提供约 15 种交互协议。以下三种值得带入 LLM 多智能体系统：

1. **合同网协议（Contract Net Protocol，CNP）。** 管理者发出 `cfp`（征集提案），竞标者回复 `propose`，管理者接受或拒绝。这种交互构成经典的任务市场模式（第 16 阶段 · 16 谈判）。
2. **订阅/通知。** 订阅者发送 `subscribe`；主题变化时发布者发送 `inform`。2026 年的事件总线也采用这种工作方式。
3. **条件请求（Request-When）。** “当条件 Y 成立时做 X。”带前置条件的延迟动作。2026 年的对应物是持久工作流引擎中的延期任务（第 16 阶段 · 22 生产扩展）。

它们都能直接映射到现代消息队列、HTTP + 轮询或 SSE 流式传输。

### 丢弃本体后会坏什么

没有共享本体时，智能体从自然语言内容推断含义。2026 年已有记录的失效模式是**语义漂移**：两个智能体对同一个词（`"customer"`）使用略有不同的概念，接收方的智能体据此做出错误动作，且没有模式验证器能够捕捉。FIPA 的本体要求会在解析时拒绝该消息。

无需全面恢复本体的缓解措施：

- 对 `content` 使用 JSON Schema——拒绝线路层的结构错误。
- 使用类型化制品（A2A）——拒绝错误模态。
- 在信封中包含显式施为词——即使内容是自然语言，意图也不含糊。

### 2026 年规范与言语行为传承的映射

| 现代规范 | FIPA 对应物 | 保留内容 | 舍弃内容 |
|---|---|---|---|
| MCP `tools/call` | `request` | 显式意图、关联 ID | 形式语义、本体 |
| MCP `resources/read` | `query-ref` | 显式意图、关联 ID | 形式语义 |
| A2A Task 生命周期 | 合同网 + 条件请求 | 异步生命周期、状态转换 | 形式完备性保证 |
| A2A 流事件 | 订阅/通知 | 异步推送 | 类型化谓词订阅 |
| CA-MCP 共享上下文 | 黑板（Hayes-Roth 1985） | 多写者共享内存 | 逻辑一致性模型 |
| NLIP | 自然语言内容 | LLM 原生 | 模式 |

从上到下阅读该表，模式是：保留结构原语，丢弃形式主义，让 LLM 弥补歧义。

```figure
sw-contract-net
```

## 动手构建

`code/main.py` 实现一个纯标准库 FIPA-ACL 翻译器。它对规范 ACL 信封编码和解码，并展示每种 MCP / A2A 消息形状如何归约为相同的七个字段。演示会：

- 将五条 MCP 风格和 A2A 风格消息编码为 FIPA-ACL。
- 将 FIPA-ACL 解码回现代等价形式。
- 用一名管理者和三名竞标者运行玩具合同网协商，其中使用 `cfp`、`propose`、`accept-proposal`、`reject-proposal`。

运行：

```
python3 code/main.py
```

输出是并排追踪：每条现代消息都同时展示 2026 年 JSON 形式和 FIPA-ACL 形式，随后展示合同网出价的往返转换。相同协议原语可在往返中保留；差别只有语法。

## 实际使用

`outputs/skill-fipa-mapper.md` 是一项读取任意智能体协议规范并产出 FIPA-ACL 映射的技能。采用新协议前先用它回答：“这真是新的，还是带 JSON 语法的 `inform`？”

## 交付物

不要复活 FIPA-ACL。复活它的检查表：

- 每条消息的意图原语（施为词）是什么？
- 是否有用于请求—响应和取消的关联 ID？
- 是否有显式内容语言（JSON-RPC、纯文本、结构化类型制品）？
- 交互协议是一等概念，还是你在从头重写合同网？
- 两个智能体就内容含义产生分歧（语义漂移）时会怎样？

在将任何新协议投入生产前，记录这五个问题。

## 练习

1. 运行 `code/main.py`。观察往返编码。找出 `tools/call`、`resources/read` 和 A2A 任务创建分别对应哪一种 FIPA 施为词。
2. 为合同网演示扩展 `cancel` 施为词，让管理者在竞标中途撤回任务。`cancel` 解决了重试单独无法解决的哪种失效情形？
3. 阅读 FIPA ACL Message Structure（http://www.fipa.org/specs/fipa00037/）第 4.1–4.3 节。选择本课未覆盖的一种施为词，并描述其现代 JSON-RPC 对应物。
4. 阅读 Liu 等人的 arXiv:2505.02279。分别为 MCP、A2A、ACP、ANP 列出它们保留与舍弃的 FIPA 施为词族。
5. 为你自己的系统中 `request` 施为词的 `content` 字段设计最小 JSON Schema。该模式比纯自然语言提供什么，又付出什么代价？

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 言语行为 | “能做事的话语” | Austin/Searle：话语即行动；ACL 的理论母体。 |
| FIPA | “那个旧 XML 东西” | IEEE Foundation for Intelligent Physical Agents；2000 年标准化 ACL。 |
| ACL | “智能体通信语言” | FIPA 的信封格式：施为词 + 内容 + 元数据。 |
| 施为词 | “动词” | 消息的意图类别：`inform`、`request`、`propose`、`cfp` 等。 |
| KQML | “FIPA 的前身” | Knowledge Query and Manipulation Language（1993）；更简单、更狭窄。 |
| 本体 | “共享词汇” | 对内容语言所讨论概念的形式定义。 |
| SL0 / SL1 | “FIPA 内容语言” | Semantic Language 的第 0、1 级——形式内容语言族。 |
| 合同网 | “任务市场” | 管理者发出 cfp；竞标者提案；管理者接受。经典交互协议。 |
| 交互协议 | “消息模式” | 具有已知正确性的施为词序列：条件请求、订阅—通知等。 |

## 延伸阅读

- [Liu et al. — A Survey of Agent Interoperability Protocols: MCP, ACP, A2A, ANP](https://arxiv.org/html/2505.02279v1) — 将现代规范连到 FIPA 传承的经典 2025 综述
- [FIPA ACL Message Structure Specification (fipa00037)](http://www.fipa.org/specs/fipa00037/) — 2000 年批准的信封格式
- [FIPA Communicative Act Library Specification (fipa00037)](http://www.fipa.org/specs/fipa00037/) — 完整施为词目录
- [MCP specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28) — 当前无状态工具使用版本，对应 `request`/`query-ref`
- [A2A specification](https://a2a-protocol.org/latest/specification/) — 合同网与订阅—通知的现代智能体对等版本
