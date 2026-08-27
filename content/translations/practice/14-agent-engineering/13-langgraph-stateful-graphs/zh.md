---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/13-langgraph-stateful-graphs/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: eff89296945c389b50c9491488940eebee8dc61756ea274a2b1a094709fb4951
status: reviewed
---

# 有状态图编排——持久化执行与检查点

> 智能体是状态机；节点是函数；边是转移；每个节点之后都会为状态建立检查点。从最后一个成功检查点开始，任何失败都可以恢复。LangGraph 是 2026 年低层有状态编排这一模型的参考实现。

**类型：** 学习 + 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 01 节（智能体循环）、第 14 阶段 · 第 12 节（工作流模式）
**用时：** 约 75 分钟

## 学习目标

- 描述 LangGraph 的核心模型：带类型状态、函数节点、条件边和节点后检查点的状态机。
- 说出文档强调的四项能力：持久化执行、流式处理、人机协同、全面记忆。
- 解释 LangGraph 支持的三种编排拓扑：supervisor、点对点（swarm）、分层（嵌套子图）。
- 用标准库实现带类型状态、条件边和检查点/恢复循环的状态图。

## 问题所在

智能体和工作流共享一个问题：40 步运行在第 38 步失败时，你希望从第 38 步恢复，而不是从头开始。把状态当作次要内容的模型，会让运维人员围绕一个假定每次都是全新运行的库手写重试。

LangGraph 的设计答案是：状态是一等的类型化对象，变更是显式的，每个节点之后都持久化检查点。恢复就是调用 load_state(session_id)。

## 核心概念

### 图

图由以下内容定义：

- **状态类型。** 一个类型化字典（或 Pydantic 模型），所有节点都会读取并修改它。
- **节点。** 纯函数 (state) -> state_update。函数返回后，更新会合并进状态。
- **边。** 节点之间的条件转移或直接转移。
- **入口与出口。** START 和 END 哨兵节点标记边界。

例如，可以用 classify、refund、bug、sales、done 节点构建一个智能体——它本身就是一个图形式的路由工作流。

### 持久化执行

每个节点返回后，运行时会序列化状态，并将它写入检查点器（SQLite、Postgres、Redis 或自定义实现）。如果第 N 步失败，运行时可以调用 resume(session_id)，以精确的状态从第 N+1 步继续。

LangGraph 文档明确强调了这对生产用户的重要性：Klarna、Uber、J.P. Morgan。关键不在于图的形状，而在于图形状加检查点让恢复成本很低。

### 流式处理

每个节点都可以产生部分输出。图会将每个节点的增量事件流式传给调用者，让 UI 随图的运行更新。

### 人机协同

在节点之间检查并修改状态。实现方式包括：在关键节点前暂停，将状态呈现给人，接受修改，再恢复。检查点器已经把状态序列化，因此这件事很容易。

### 记忆

短期记忆（一次运行内——状态中的对话历史）和长期记忆（跨运行——通过检查点器和独立长期存储持久化）。LangGraph 通过工具与外部记忆系统（Mem0、自定义系统）集成。

### 三种拓扑

1. **Supervisor。** 中央路由 LLM 将工作分派给专门的子智能体。langgraph-supervisor 中的 create_supervisor() 提供这一能力（不过 LangChain 团队在 2026 年建议直接通过工具调用来完成，以更好地控制上下文）。
2. **Swarm / 点对点。** 智能体通过共享工具界面直接交接，没有中央路由器。
3. **分层。** supervisor 管理子 supervisor，通过嵌套子图实现。

### 这个模式会在哪里出错

- **检查点太小。** 只检查点对话轮次，会让工具状态和记忆写入无法恢复。必须序列化完整状态。
- **非确定性节点。** 恢复假设相同的节点输入会产生相同的状态更新。随机种子、墙上时钟和外部 API 都必须被捕获。
- **过度使用条件边。** 每条边都带条件的图是一种难以推理的状态机。优先使用带少量分支的线性链。

```figure
langgraph-state
```

## 动手构建

code/main.py 用标准库实现了一个有状态图：

- State——包含 messages、step、route、output、human_approval 的类型化字典。
- Node——接收 state 并返回更新字典的可调用对象。
- StateGraph——节点、边、条件边、run 和 resume。
- SQLiteCheckpointer（内存假实现）——每个节点之后序列化状态；load(session_id) 恢复状态。
- 一个示例图：classify -> branch（refund / bug / sales）-> human gate -> send。

运行：

```
python3 code/main.py
```

轨迹展示第一次运行在人工门控处失败、状态持久化，以及恢复后生成最终输出。

## 实际使用

- **LangGraph**——参考实现，适合生产。使用 create_react_agent、create_supervisor，或自行构建图。
- **AutoGen v0.4**（第 14 节）——适合高并发场景的 actor 模型替代方案。
- **Claude Agent SDK**（第 17 节）——带内置 session store 的托管 harness。
- **自定义实现**——当需要精确控制状态形状或检查点后端时。

## 交付

outputs/skill-state-graph.md 会在任意目标运行时生成形状类似 LangGraph 的状态图，并接入检查点和恢复。

## 练习

1. 当分类置信度低于阈值时，增加从 classify 到 end 的条件边。人工设置 route 后恢复运行。
2. 将 SQLite 风格的假实现换成真正的 SQLite 检查点器。测量每一步的序列化开销。
3. 实现并行边：两个节点并发运行，并用自定义 reducer 合并。不可变状态在这里带来什么好处？
4. 阅读 langgraph-supervisor 参考文档。将玩具实现迁移到 create_supervisor。比较轨迹形状。
5. 增加流式处理：每个节点运行时产生部分状态。打印到达的增量。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| State graph | “作为状态机的智能体” | 类型化状态 + 节点 + 边 + reducer |
| Checkpointer | “持久化后端” | 每个节点后序列化状态；支持恢复 |
| Reducer | “状态合并器” | 将当前状态与节点更新组合起来的函数 |
| Conditional edge | “分支” | 由状态函数选择的边 |
| Subgraph | “嵌套图” | 在另一张图中作为节点使用的图 |
| Durable execution | “从失败处恢复” | 带精确状态从最后一个成功节点重启 |
| Supervisor | “路由 LLM” | 专门子智能体的中央分派器 |
| Swarm | “P2P 智能体” | 智能体通过共享工具交接；没有中央路由 |

## 延伸阅读

- [LangGraph 概览](https://docs.langchain.com/oss/python/langgraph/overview)——参考文档
- [langgraph-supervisor 参考](https://reference.langchain.com/python/langgraph/supervisor/)——supervisor 模式 API
- [AutoGen v0.4，Microsoft Research](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/)——actor 模型替代方案
- [Claude Agent SDK 概览](https://platform.claude.com/docs/en/agent-sdk/overview)——session store 与子智能体
