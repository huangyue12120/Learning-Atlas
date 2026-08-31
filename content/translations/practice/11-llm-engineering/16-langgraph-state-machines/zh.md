---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/11-llm-engineering/16-langgraph-state-machines/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: cd449175f7292a9821644d0b829cd0576a68f0da3aedbbc9e3547b45fd7b05cb
status: reviewed
---

# 智能体状态机——图、节点与检查点

> 手写的 ReAct 循环是一个 `while True`；把同一个循环写成显式图，就可以为它创建检查点、中断、分支，还能在其中穿越时间。智能体没变，改变的是包围它的运行框架。

**类型：** 构建
**语言：** Python
**前置要求：** 第 11 阶段 · 第 09 课（函数调用）、第 11 阶段 · 第 14 课（模型上下文协议）
**用时：** 约 75 分钟

## 问题所在

你交付了一个函数调用智能体。它运行了三轮，随后出问题：模型调用的工具返回 500，用户在任务中途改变了主意，或者智能体决定退款却没有得到人工签字。`while True:` 循环没有任何挂钩。你无法暂停它，无法倒带，也无法分叉出“如果模型选择了另一个工具会怎样”。一旦超出 demo 阶段，这个智能体就会变成一个黑盒：要么成功，要么失败。

当你看清这一点，下一步其实很自然：智能体本来就是状态机——系统提示词、消息历史、待处理的工具调用和下一步动作共同构成状态。把状态机显式化：为“模型思考”“工具运行”“人工审批”建立节点，为它们之间的条件转换建立边。一旦图显式存在，运行框架就能免费提供四种能力：检查点（在步骤之间保存状态）、中断（为人类暂停）、流式输出（流出词元和中间事件）以及时间旅行（回到先前状态，尝试另一条分支）。

LangGraph 是这种抽象的参考实现。它提供图运行时，具备一等状态、持久化和中断能力；智能体循环也因此可以显式绘制，而不必手写成不可观测的循环。

## 核心概念

![LangGraph StateGraph：节点、边与检查点器](../assets/langgraph-stategraph.svg)

一个 `StateGraph` 有三样东西。

1. **状态。** 在图中流动的类型化字典（TypedDict 或 Pydantic 模型）。每个节点接收完整状态并返回部分更新，LangGraph 会按每个字段的*归约器（reducer）*合并它们——需要累积的列表使用 `operator.add`，默认行为是覆盖。
2. **节点。** 形如 `state -> partial_state` 的 Python 函数。每个节点都是一个离散步骤：“调用模型”“运行工具”“生成摘要”。
3. **边。** 节点之间的转换。静态边固定指向一个位置；条件边接收 `state -> next_node_name` 路由函数，因此可以根据模型输出分支。

你要编译图。编译会绑定拓扑、挂载检查点器（可选，但生产环境必不可少），并返回一个可运行对象。使用初始状态和 `thread_id` 调用它。每一步执行都会写入一个以 `(thread_id, checkpoint_id)` 为键的检查点。

### 四种超能力 <!-- learning-atlas: the-four-superpowers -->

**检查点。** 每次节点转换都会把新状态写入存储（测试时用内存，生产环境用 Postgres/Redis/SQLite）。再次用同一个 `thread_id` 调用图，就能从暂停处恢复。

**中断。** 用 `interrupt_before=["human_review"]` 标记一个节点，执行会在该节点运行前停止。状态会持久化。API 向用户回复“等待审批”。稍后对同一个 `thread_id` 发送带 `Command(resume=...)` 的请求，就能恢复执行。

**流式输出。** `graph.stream(state, mode="updates")` 会在状态变化时产生状态增量；`mode="messages"` 会流出模型节点内部的 LLM 词元；`mode="values"` 会产生完整快照。由你决定 UI 要展示哪一种。

**时间旅行。** `graph.get_state_history(thread_id)` 返回完整的检查点日志。把任意之前的 `checkpoint_id` 传给 `graph.invoke`，就能从那一点分叉。它非常适合调试（“如果模型当时选了工具 B 会怎样？”）以及重放生产轨迹的回归测试。

### 归约器才是关键

每个状态字段都有一个归约器。大多数默认行为已经足够——新值覆盖旧值。但消息列表需要 `operator.add`，这样新消息才会追加，而不是替换。并行边会通过归约器合并它们的更新。如果两个节点都更新 `messages`，而你忘了使用 `Annotated[list, add_messages]`，后者会静默覆盖前者，半轮对话就会丢失。归约器是这个库里唯一微妙的地方；把它写对，剩下的组合就很自然。

### 四节点 ReAct 图

生产级 ReAct 智能体由四个节点和两条边组成：

1. `agent`——使用当前消息历史调用 LLM，返回助手消息（其中可能包含 tool_calls）。
2. `tools`——执行最后一条助手消息中的所有 tool_calls，把工具结果作为工具消息追加进去。
3. 从 `agent` 出发的一条条件边：如果最后一条消息有 tool_calls，就路由到 `tools`；否则路由到 `END`。
4. 从 `tools` 回到 `agent` 的静态边。

就这些。你会得到完整的 ReAct 循环（思考 → 行动 → 观察 → 思考 → …），同时拥有检查点、中断和流式输出，代码大约只有 40 行。

### StateGraph 与 Send（扇出）

`Send(node_name, state)` 允许一个节点调度并行子图。例如，智能体决定同时查询三个检索器。每个 `Send` 都会启动目标节点的一次并行执行，它们的输出通过状态归约器合并。LangGraph 因此无需线程原语，就能表达 orchestrator-workers 模式。

### 子图

一个已编译的图可以成为另一个图中的节点。外层图只看到一个节点；内层图拥有自己的状态和自己的检查点。团队可以用这种方式构建 supervisor-worker 智能体：supervisor 图根据用户意图，把请求路由到对应领域的 worker 子图。

```figure
l5-state-graph-ledger
```

## 动手构建

### 第 1 步：状态与节点

```python
from typing import Annotated, TypedDict
from langchain_core.messages import AnyMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver

class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]

def agent_node(state: State) -> dict:
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

def should_continue(state: State) -> str:
    last = state["messages"][-1]
    return "tools" if getattr(last, "tool_calls", None) else END

tool_node = ToolNode(tools=[search_web, read_file])

graph = StateGraph(State)
graph.add_node("agent", agent_node)
graph.add_node("tools", tool_node)
graph.set_entry_point("agent")
graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
graph.add_edge("tools", "agent")

app = graph.compile(checkpointer=MemorySaver())
```

`add_messages` 是让消息列表累积而不是覆盖的归约器。忘记它，是 LangGraph 最常见的 bug。

### 第 2 步：使用 thread 运行

```python
config = {"configurable": {"thread_id": "user-42"}}
for event in app.stream(
    {"messages": [HumanMessage("find the Anthropic headquarters address")]},
    config,
    stream_mode="updates",
):
    print(event)
```

每次更新都是一个 `{node_name: state_delta}` 字典。前端可以把它们流式发送到 UI，让用户看到“智能体正在思考……调用 search_web……拿到结果……正在回答”。

### 第 3 步：增加人在回路中的中断

标记一个节点，让执行在它运行前暂停。

```python
app = graph.compile(
    checkpointer=MemorySaver(),
    interrupt_before=["tools"],  # pause before every tool call
)

state = app.invoke({"messages": [HumanMessage("delete the production database")]}, config)
# state["__interrupt__"] is set. Inspect proposed tool calls.
# If approved:
from langgraph.types import Command
app.invoke(Command(resume=True), config)
# If denied: write a rejection message and resume
app.update_state(config, {"messages": [AIMessage("Blocked by human reviewer.")]})
```

状态、检查点和 thread 都会跨越中断持久化。除了执行期间，没有任何东西只存在于内存中。

### 第 4 步：用时间旅行调试

```python
history = list(app.get_state_history(config))
for snapshot in history:
    print(snapshot.values["messages"][-1].content[:80], snapshot.config)

# Fork from a prior checkpoint
target = history[3].config  # three steps back
for event in app.stream(None, target, stream_mode="values"):
    pass  # replay from that point forward
```

把 `None` 作为输入会从给定检查点重放；传入一个值，则会先把它作为更新追加到该检查点的状态，再继续执行。这样就能重现一次糟糕的智能体运行，而不必重新运行整段对话。

### 第 5 步：在生产环境替换检查点器

```python
from langgraph.checkpoint.postgres import PostgresSaver

with PostgresSaver.from_conn_string("postgresql://...") as checkpointer:
    checkpointer.setup()
    app = graph.compile(checkpointer=checkpointer)
```

库已经提供 SQLite、Redis 和 Postgres 检查点器。`MemorySaver` 只用于测试。任何要跨进程重启持久化的东西，都需要真正的存储。

## 方法论

> 构建智能体时使用图，而不是 `while True` 循环。

在使用 LangGraph 之前，先花 60 秒做设计：

1. **命名节点。** 每个离散决策或产生副作用的动作都是一个节点：“智能体思考”“工具运行”“审阅者审批”“响应流式输出”。如果你列不出它们，任务还没有真正呈现智能体形态。
2. **声明状态。** 使用最小的 TypedDict，为每个列表字段配置归约器。不要把所有东西塞进 `messages`；把任务专用字段（工作中的 `plan`、`budget` 计数器、`retrieved_docs` 列表）提升到顶层。
3. **画出边。** 除非下一步取决于模型输出，否则使用静态边。每条条件边都需要一个带命名分支的路由函数。
4. **一开始就选择检查点器。** 测试用 `MemorySaver`，其他场景用 Postgres/Redis/SQLite。没有检查点器就不要交付——没有它就没有恢复、中断和时间旅行。
5. **在工具运行前决定中断，而不是之后。** 审批应该放在进入副作用节点的边上，这样可以在造成伤害前取消；验证应该放在离开模型的边上，这样可以低成本拒绝错误调用。
6. **默认使用流式输出。** UI 使用 `mode="updates"`，模型节点内部的词元级流式输出使用 `mode="messages"`，评估期间的完整快照使用 `mode="values"`。

拒绝交付没有检查点器的 LangGraph 智能体。拒绝交付在副作用发生*之后*才中断的智能体。拒绝交付没有以 `add_messages` 作为归约器的 `messages` 字段。

## 练习

1. **简单。** 用上面的四节点 ReAct 图实现一个计算器工具和一个网页搜索工具。验证两轮对话至少产生四个检查点：`list(app.get_state_history(config))` 应返回至少四项。
2. **中等。** 在 `agent` 之前增加一个 `planner` 节点，把结构化的 `plan: list[str]` 写入状态。让 `agent` 标记已完成的计划步骤。如果 checkpoint 恢复后 `plan` 丢失（归约器错误），测试必须失败。
3. **困难。** 构建一个 supervisor 图，使用 `Send` 在三个子图（`researcher`、`writer`、`reviewer`）之间路由。每个子图都有自己的状态和检查点器。在外层图增加 `interrupt_before=["writer"]`，让人类可以审批研究简报。确认从之前检查点进行时间旅行时只会重新运行分叉出的分支。

## 关键术语

| 术语 | 人们口中的说法 | 它实际指什么 |
|------|-----------------|-----------------------|
| StateGraph | “LangGraph 图” | 编译前用于添加节点和边的构建器对象。 |
| Reducer | “字段如何合并” | 当节点返回某字段的更新时应用的 `(old, new) -> merged` 函数；默认覆盖，`add_messages` 则追加。 |
| Thread | “对话 ID” | 用于限定一个会话全部检查点的 `thread_id` 字符串。 |
| Checkpoint | “暂停的状态” | 节点转换后完整图状态的持久化快照，以 `(thread_id, checkpoint_id)` 为键。 |
| Interrupt | “为人类暂停” | `interrupt_before` / `interrupt_after` 在节点边界停止执行；使用 `Command(resume=...)` 恢复。 |
| Time-travel | “从先前步骤分叉” | `graph.invoke(None, config_with_old_checkpoint_id)` 从该检查点向前重放。 |
| Send | “并行子图调度” | 节点可以返回的构造器，用于启动目标节点的 N 次并行执行。 |
| Subgraph | “作为节点的已编译图” | 在另一个图中充当节点的已编译 StateGraph；保留自己的状态作用域。 |

## 延伸阅读

- [LangGraph 文档](https://langchain-ai.github.io/langgraph/) — StateGraph、归约器、检查点器与中断的权威参考。
- [LangGraph 概念：状态、归约器、检查点器](https://langchain-ai.github.io/langgraph/concepts/low_level/) — 本课使用的心智模型，直接来自源码。
- [LangGraph 持久化与检查点](https://langchain-ai.github.io/langgraph/concepts/persistence/) — Postgres/SQLite/Redis 存储、检查点命名空间与 thread ID 的细节。
- [LangGraph 人在回路中](https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/) — `interrupt_before`、`interrupt_after`、`Command(resume=...)` 与编辑状态模式。
- [Yao 等：《ReAct: Synergizing Reasoning and Acting in Language Models》（ICLR 2023）](https://arxiv.org/abs/2210.03629) — 每个 LangGraph 智能体都会实现的模式；阅读它可以理解推理轨迹的依据。
- [Anthropic：Building effective agents（2024 年 12 月）](https://www.anthropic.com/research/building-effective-agents) — 何时以及为何选择链、路由器、orchestrator-workers、evaluator-optimizer 等图形状。
- 第 11 阶段 · 第 09 课（函数调用）— 每个 LangGraph 智能体节点都会复用的工具调用原语。
- 第 11 阶段 · 第 14 课（模型上下文协议）— 可通过 MCP adapter 接入 LangGraph `ToolNode` 的外部工具发现机制。
- 第 11 阶段 · 第 17 课（智能体框架取舍）— 何时选择 LangGraph，而不是 CrewAI、AutoGen 或 Agno。
