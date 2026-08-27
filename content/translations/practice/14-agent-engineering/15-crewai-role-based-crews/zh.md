---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/15-crewai-role-based-crews/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: cf08c2959fa6c2fc70a935fe932a8693664c61e39a7d7979bc049f487bc70561
status: reviewed
---

# 基于角色的智能体团队——角色、任务、流程

> 四个原语：Agent、Task、Crew、Process。两种顶层形状：Crews（自治、基于角色的协作）与 Flows（事件驱动、确定性）。CrewAI 是 2026 年的参考实现，其文档直截了当地说：“对于任何生产就绪的应用，从 Flow 开始。”

**类型：** 学习 + 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 12 节（工作流模式）、第 14 阶段 · 第 14 节（Actor 模型）
**用时：** 约 75 分钟

## 学习目标

- 说出 CrewAI 的四个原语（Agent、Task、Crew、Process）以及各自拥有的内容。
- 区分 Sequential、Hierarchical 和计划中的 Consensus 流程；为每个工作负载选择一种。
- 区分 Crews（自治的基于角色）与 Flows（事件驱动的确定性），并解释文档给出的生产建议。
- 使用 @tool 装饰器和 BaseTool 子类接入工具；推理结构化输出与自由文本的差异。
- 说出 CrewAI 的四种记忆类型以及各自在何时发挥价值。
- 用标准库实现三智能体 crew（researcher、writer、editor），生成一份 brief。
- 识别 CrewAI 的三种失败模式：提示词膨胀、manager-LLM 税、脆弱的交接。

## 问题所在

采用多智能体框架的团队会撞上同一堵墙。“自治协作”在 demo 中听起来很棒，但客户提交 bug 后，你需要确定性重放；财务询问每次 LLM 路由的 crew 需要多少钱；值班人员需要知道凌晨 3 点哪个智能体卡住了。

自由形式的 LLM 路由 crew 无法干净地回答这些问题。纯 DAG 可以全部回答，却失去了头脑风暴智能体所需的探索形状。

CrewAI 的拆分诚实地呈现了这种权衡：Crews 用于协作、基于角色、探索性的工作；Flows 用于事件驱动、代码拥有、可审计的生产工作。同一个框架有两种形状，按界面选择。

## 核心概念

### 四个原语

CrewAI 的界面很小。记住下面这些，剩下的就是配置。

- **Agent。** role + goal + backstory + tools +（可选）llm。backstory 承担关键作用：它影响语气、判断和智能体何时停止。Tools 是智能体可以调用的函数（后文详述）。
- **Task。** description + expected_output + agent +（可选）context +（可选）output_pydantic。可复用的工作单元。expected_output 是契约；context 列出其输出会传入的上游任务；output_pydantic 强制结构化形状。
- **Crew。** 容器。拥有 agents 列表、tasks 列表、process，以及可选的 memory、verbose、manager_llm 设置。
- **Process。** 执行策略。Sequential、Hierarchical、Consensus（计划中）。它决定运行形状。

Agents 不会直接看到彼此。Tasks 引用 agents，Crew 编排 tasks，Process 决定下一个 task 的执行者。这构成了 CrewAI 的核心心智模型。

> **已根据** CrewAI 0.86（2026-05）验证。新版本可能重命名或合并流程类型；依赖具体形状前，请查看 [CrewAI Processes 文档](https://docs.crewai.com/concepts/processes)。

### Sequential、Hierarchical 与 Consensus

- **Sequential。** Tasks 按声明顺序运行。task N 的输出以 context 形式提供给 task N+1。成本最低、最可预测；顺序固定时使用。
- **Hierarchical。** manager Agent（单独的 LLM 调用）在专家之间路由。CrewAI 根据 manager_llm 配置或默认值生成 manager。manager 每轮选择下一个 task，也可以拒绝或重新路由。当有四个或更多专家且顺序真正取决于上一步输出时使用。
- **Consensus。** 已计划但目前尚未在公共 API 中实现。文档为未来基于投票的流程保留了这个名称。今天不要依赖它。

Hierarchical 在每次专家调用之外增加一次 manager LLM 调用。五步运行的 token 成本可能增加到三倍。只有真正需要路由时才支付它。

### Crews 与 Flows

这是 2026 年文档开篇采用的框架：

- **Crew。** LLM 驱动的自治。框架在运行时选择形状。适合研究、头脑风暴、初稿以及路径本身就是答案一部分的场景。难以重放，难以测试，但原型成本低。
- **Flow。** 由你拥有的事件驱动图。@start 标记入口，@listen(topic) 标记另一个步骤发出该 topic 后触发的步骤。每一步都是普通 Python（内部可以调用 Crew）。适合生产：可观测、可测试、确定。

文档给出的 2026 年生产建议是：从 Flow 开始。当自治值得其成本时，在 Flow 步骤中以 Crew.kickoff() 调用的形式嵌入 Crew。Flow 提供审计轨迹，Crew 提供探索能力。组合起来，不要二选一。

### 工具集成

给 Agent 工具的方式有三种。选择符合需求的最简单方式。

1. **@tool 装饰器。** 纯函数变成工具。签名就是 schema；docstring 是 LLM 看到的描述。最适合一次性辅助函数。

   ```python
   from crewai.tools import tool

   @tool("Search the web")
   def search(query: str) -> str:
       """Return top results for the query."""
       return run_search(query)
   ```

2. **BaseTool 子类。** 带显式参数 schema、异步支持和重试的基于类的工具。当工具有状态（客户端、缓存）或需要结构化参数时使用。

   ```python
   from crewai.tools import BaseTool
   from pydantic import BaseModel

   class SearchArgs(BaseModel):
       query: str
       limit: int = 10

   class SearchTool(BaseTool):
       name = "web_search"
       description = "Search the web and return top results."
       args_schema = SearchArgs

       def _run(self, query: str, limit: int = 10) -> str:
           return self.client.search(query, limit=limit)
   ```

3. **内置工具包。** CrewAI 提供一方适配器：SerperDevTool、FileReadTool、DirectoryReadTool、CodeInterpreterTool、RagTool、WebsiteSearchTool。一次 import 即可接入。

结构化输出使用 Pydantic。在 Task 上传入 output_pydantic=MyModel。CrewAI 会根据模型验证 LLM 响应，并进行强转或重试。将它与紧凑的 expected_output 字符串结合。自由文本输出适合草稿；结构化输出才是下游 Flow 可以消费的内容。

### 记忆钩子

CrewAI 开箱提供四种记忆类型。它们可以组合：一个 Crew 可以同时启用四种。

> **已根据** CrewAI 0.86（2026-05）验证。近期版本将所有内容路由到统一的 Memory 系统，并由它包装这四种存储。下面的概念模型仍然成立，但新版本的公共类界面可能合并为一个 Memory 入口；请查看[当前 CrewAI 记忆文档](https://docs.crewai.com/concepts/memory)。

- **短期。** 单次运行中的对话缓冲区，运行结束时清除。
- **长期。** 跨运行持久化。存储在向量数据库中（默认 Chroma，可替换），根据当前任务的相似度检索。
- **实体。** 按实体保存事实。“客户 X 使用企业套餐。”以实体而非相似度为键，跨运行保留。
- **上下文。** 组装时检索。在 Agent 需要的时刻拉取相关记忆，而不是预加载。

在 Crew 上用 memory=True 或按类型配置启用。后端使用你配置的 embedding 提供方（默认 OpenAI，也可换成本地实现）。记忆是 CrewAI 相对轻量框架体现价值的地方之一；纯 LangGraph 要求你自己接入每一种存储。

### 基于角色的团队适用时机

- 三到六个有明确角色、以协作为主的智能体。起草、审查、规划、头脑风暴。
- LLM 对下一步的判断本身就是价值所在的路由（Hierarchical）。
- 团队更愿意阅读 role + goal + backstory，而不是图定义的任何地方。

### 不适用时机

- 严格排序的确定性 DAG。使用 LangGraph（第 13 节）。图形状才是正确抽象；CrewAI 的角色框架会增加摩擦。
- 亚秒级延迟预算。Hierarchical 增加往返；即便是 Sequential，也会串行化包含 backstory 和之前输出的提示词。
- 单智能体循环。跳过框架；第 01 节的智能体循环加工具注册表更短。

第 17 节（智能体框架权衡）会用矩阵展开这些内容。概括来说，CrewAI 属于“协作式、基于角色”的框架。

### 依赖形状

它独立于 LangChain。支持 Python 3.10 到 3.13，使用 uv。Star 数请查看 [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI)（截至 2026-05 的快照）。AWS Bedrock 集成已有文档；厂商基准报告称其在 QA 工作负载上比 LangGraph 有明显加速，但方法（数据集、硬件、评估指标）未发布，因此只能把框架厂商数字视为方向性参考。

### 这个模式会在哪里出错

- **Backstory 造成提示词膨胀。** 每个智能体 2000 字的 backstory 和一个五智能体 crew，会在第一次工具调用前就耗尽上下文预算。保持 backstory 少于 200 字。在智能体之间复用短语，不要重复五遍团队风格。
- **Manager-LLM token 税。** Hierarchical 流程在每次专家调用前都增加一次 manager LLM 调用。五任务 crew 会从五次变成六次 LLM 调用，而且 manager 调用携带完整任务列表和之前输出。除非路由取决于输出，否则切换到 Sequential。
- **脆弱交接。** Task N 的 expected_output 是“大纲”。Task N+1 以 context 读取它，并试图解析三个区段；LLM 生成了四个。下游 Agent 临时发挥。用 Task N 的 output_pydantic 修复，让 Task N+1 读取类型化对象而不是自由文本。
- **Crew 直接上生产。** 没有 Flow 包装就将自由形式 Crew 发布到生产。输出变化大，无法重放，值班人员无法把坏运行与好运行做 diff。用 Flow 包装。

```figure
ae-crew-vs-flow
```

## 动手构建

code/main.py 用标准库实现了两种形状以及一个三智能体 crew。

形状包括：

- Agent、Task 数据类，与 CrewAI 的界面对应。
- SequentialCrew.kickoff(inputs) 按声明顺序运行任务，将输出作为 context 传递。
- HierarchicalCrew.kickoff(topic) 加入 manager Agent，每轮选择下一个专家，在 done 时停止。
- 带 @start 和 @listen(topic) 装饰器的 Flow、一个小型事件循环和轨迹。
- 模仿 CrewAI @tool 形状的 tool(name) 装饰器。
- 带 short_term、long_term、entity 存储的 Memory；用 numpy 模拟相似度。
- 以角色和输入前缀为键的硬编码模拟 LLM 响应。没有网络，确定性运行。

具体 demo 是一个 researcher、writer、editor crew，生成关于“2026 智能体工程”的 brief。Researcher 拉取（模拟的）来源，Writer 起草，Editor 收紧内容。同一个 crew 再通过 Flow 运行一次，展示确定性形状。

运行：

```bash
python3 code/main.py
```

轨迹覆盖：Sequential crew 通过 context 串联输出；带 manager 选择的 Hierarchical crew（researcher、writer、editor，最后 done）；使用显式 topic（researched、drafted、edited）运行相同三步的 Flow；通过 @tool 路由工具调用；以及跨两次 kickoff 持久化的长期记忆。

Crew 轨迹是流动的，manager 原则上可以重新排序。Flow 轨迹是固定的。这一选择就是本节的课程。

## 实际使用

- **CrewAI Flow** 用于生产。即使 Flow 只有一步、只调用 Crew.kickoff() 也一样；Flow 提供审计边界。
- **CrewAI Crew（Sequential）** 用于顺序清晰的协作工作，特别是初稿和审查循环。
- **CrewAI Crew（Hierarchical）** 用于路由取决于输出且拥有四个或更多专家的场景。
- **LangGraph**（第 13 节）用于显式状态机、持久化恢复和严格顺序。
- **AutoGen v0.4**（第 14 节）用于 actor 模型并发和故障隔离。
- **OpenAI Agents SDK**（第 16 节）用于带 handoff 和 guardrail 的 OpenAI 优先产品。
- **Claude Agent SDK**（第 17 节）用于带子智能体和 session store 的 Claude 优先产品。

## 交付

outputs/skill-crew-or-flow.md 会为任务选择 Crew 或 Flow，并搭建最小实现。它会硬性拒绝没有 backstory 的 Crew、没有显式 topic 的 Flow，以及专家少于三个的 Hierarchical。

## 陷阱

- **把 backstory 当装饰。** 它会塑造输出。为每个 Agent 测试三个变体；差异真实存在。选一个并冻结。
- **跳过 expected_output。** 每个 task 没有契约，下游 task 就会接收 LLM 随便生成的内容。Crew 可以运行，审计却会失败。
- **记忆始终开启。** 每次运行都写长期记忆，向量数据库不断增长，检索越来越嘈杂。只在事实确实持久的任务上写入。
- **Manager prompt 漂移。** Hierarchical 的 manager 提示词是隐式的。如果路由变奇怪，在 verbose 模式导出并阅读它。
- **Crew 中的工具副作用。** Crew 调用工具的次数可能超过预期。POST、DELETE、支付等操作应属于 Flow 步骤，绝不能放在 Crew 工具中。

## 练习

1. 将 Sequential crew 转换为 Flow。数一数变异性降低的接触点，并记录可读性在哪里下降。
2. 为 crew 增加实体记忆：让客户事实在 kickoff 之间持久化。验证检索会拉取正确实体。
3. 实现 Hierarchical 流程：只有当 writer 输出至少有三段时，manager 才允许路由到 editor。追踪重试。
4. 为（模拟的）网页搜索接入 BaseTool 子类。比较它与 @tool 装饰器版本的轨迹形状。
5. 在 editor task 上增加 output_pydantic=Brief，其中 Brief 有 title、summary、sections。让 writer task 有一次输出格式错误的 JSON，验证 CrewAI 的重试行为。
6. 阅读 CrewAI 的文档导读。将玩具实现迁移到真正的 crewai API。标准库版本省略了哪些保证？
7. 将 AgentOps 或 Langfuse（第 24 节）接入真实运行。标准库版本漏掉了哪些轨迹？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Agent | “Persona” | 角色 + 目标 + 背景故事 + 工具 |
| Task | “工作单元” | 描述 + 预期输出 + 负责人 + 可选结构化输出 |
| Crew | “智能体团队” | Agent + Task + Process 的容器 |
| Process | “执行策略” | Sequential / Hierarchical / Consensus（计划中） |
| Flow | “确定性工作流” | 事件驱动、代码拥有、可测试 |
| Backstory | “Persona 提示词” | 塑造 Agent 语气和判断 |
| @tool | “函数工具” | 将函数变成 Agent 可调用工具的装饰器 |
| BaseTool | “类工具” | 带参数 schema、重试和异步支持的类工具 |
| Entity memory | “按实体的事实” | 作用域为客户 / 账户 / 问题的记忆 |
| Long-term memory | “跨运行记忆” | kickoff 之间保留的向量记忆 |
| Contextual memory | “即时检索” | Agent 需要时才拉取的记忆 |
| Manager LLM | “路由智能体” | Hierarchical 流程中选择下一个 task 的额外 LLM |
| expected_output | “Task 契约” | 告诉 Agent（和审计）应返回何种形状的字符串 |

## 延伸阅读

- [CrewAI 文档导读](https://docs.crewai.com/en/introduction)——概念和推荐的生产路径
- [CrewAI Flows 指南](https://docs.crewai.com/en/concepts/flows)——事件驱动形状、@start、@listen
- [CrewAI 工具参考](https://docs.crewai.com/en/concepts/tools)——@tool、BaseTool、内置工具包
- [CrewAI 记忆](https://docs.crewai.com/en/concepts/memory)——短期、长期、实体、上下文
- [Anthropic，构建有效的智能体](https://www.anthropic.com/research/building-effective-agents)——多智能体何时有帮助、何时没有
- [LangGraph 概览](https://docs.langchain.com/oss/python/langgraph/overview)——状态机替代方案
