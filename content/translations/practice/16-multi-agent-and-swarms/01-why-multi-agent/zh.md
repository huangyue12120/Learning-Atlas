---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/16-multi-agent-and-swarms/01-why-multi-agent/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 43afcd0c4577433cf152e33711cdee7dc0a0625a37b01a3d30c1588d52dd952e
status: reviewed
---

# 为什么需要多智能体？

> 一个智能体撞上墙了。先把任务拆给多个智能体。

**类型：** 学习
**语言：** TypeScript
**前置要求：** 第 14 阶段（智能体工程）
**用时：** 约 60 分钟

## 学习目标

- 识别单智能体上限（上下文溢出、混合专长、串行瓶颈），并说明何时应拆分为多个智能体
- 比较编排模式（流水线、并行扇出、主管、层级），并为给定任务结构选择合适模式
- 设计具有明确角色边界、共享状态和通信契约的多智能体系统
- 分析多智能体复杂性（延迟、成本、调试难度）与单智能体简洁性之间的取舍

## 问题

你在第 14 阶段构建了一个单智能体。它能工作：读取文件、运行命令、调用 API，并对结果推理。接着你把它指向真实代码库：200 个文件、三种语言、依赖基础设施的测试，以及在写代码前研究外部 API 的要求。

智能体卡住了，瓶颈在任务范围：它超出了一个智能体循环所能处理的范围。上下文窗口被文件内容填满；它忘了 40 次工具调用前读过什么；它同时试图做研究员、编码员和审查员，三件事都做得不好。

这构成单智能体的上限。每当任务需要以下任一条件时，你都会遇到它：

- **比一个窗口能容纳的更多上下文**——读取 50 个文件会轻易超过 20 万 token
- **不同阶段需要不同专长**——研究所需的提示方式不同于代码生成
- **可以并行发生的工作**——为什么要顺序读取三个文件，而不同时读取？

## 概念

### 单智能体上限

单智能体就是一个循环、一个上下文窗口和一个系统提示词。想象一下：

```text
┌─────────────────────────────────────────┐
│              单智能体                   │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │            上下文窗口             │  │
│  │                                   │  │
│  │  研究笔记                         │  │
│  │  + 代码文件                       │  │
│  │  + 测试输出                       │  │
│  │  + 审查反馈                       │  │
│  │  + API 文档                       │  │
│  │  + ……                             │  │
│  │                                   │  │
│  │  ██████████████████████ 已满 ███  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  一个系统提示词同时覆盖                 │
│  研究 + 编码 + 审查 + 测试              │
│                                         │
│  结果：每件事都表现平庸                 │
└─────────────────────────────────────────┘
```

有三件事会失效：

1. **上下文饱和。** 工具结果不断堆积。到第 30 轮时，智能体已经消耗了 15 万 token 的文件内容、命令输出和先前推理；第 5 轮的关键细节会丢失。
2. **角色混淆。** 写着“你是研究员、编码员、审查员和测试员”的系统提示词，会产生一个半做研究、半写代码、却始终没有完成审查的智能体。
3. **串行瓶颈。** 智能体先读文件 A，再读文件 B，然后读文件 C：三次串行 LLM 调用、三次串行工具执行，没有并行。

### 多智能体解决方案

拆分工作。给每个智能体一项工作、一个上下文窗口，以及一条为该工作调优的系统提示词：

```text
┌──────────────────────────────────────────────────────────┐
│                         编排器                            │
│                                                          │
│  “为用户管理构建一个 REST API”                            │
│                                                          │
│         ┌──────────┬──────────┬──────────┐               │
│         │          │          │          │               │
│         ▼          ▼          ▼          ▼               │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│   │ 研究员   │ │ 编码员   │ │ 审查员   │ │ 测试员   │  │
│   │          │ │          │ │          │ │          │  │
│   │ 阅读     │ │ 编写     │ │ 检查     │ │ 运行     │  │
│   │ 文档、   │ │ 基于研究 │ │ 代码质量、│ │ 测试并   │  │
│   │ 找出     │ │ 与规格   │ │ 找出缺陷  │ │ 报告     │  │
│   │ 模式     │ │ 编写代码 │ │          │ │ 结果     │  │
│   └─────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│         │           │            │             │         │
│         └───────────┴────────────┴─────────────┘         │
│                          │                               │
│                       合并结果                            │
└──────────────────────────────────────────────────────────┘
```

每个智能体都拥有：

- 一条聚焦的系统提示词（“你是代码审查员。唯一职责是寻找缺陷。”）
- 自己的上下文窗口（不会被其他智能体的工作污染）
- 清楚的输入/输出契约（接收研究笔记，输出代码）

### 这样做的真实系统

**Claude Code 子智能体。** Claude Code 用 `Task` 创建子智能体时，会创建一个具有范围限定任务的子智能体。父智能体保持上下文整洁，子智能体集中处理工作并返回摘要。

**Devin。** 它运行规划智能体、编码智能体和浏览器智能体。规划者拆解步骤，编码者写代码，浏览器研究文档；每个角色都有独立上下文。

**多智能体编码团队（SWE-bench）。** SWE-bench 上表现最好的系统会使用阅读代码库的研究员、设计修复方案的规划者和实施修复的编码员。单智能体系统得分更低。

**ChatGPT Deep Research。** 它并行创建多个搜索智能体，每个探索不同角度，然后综合结果。

### 连续谱

多智能体不是非黑即白，而是一条连续谱：

```text
简单 ──────────────────────────────────────────── 复杂

 单智能体       子智能体        流水线       团队        群体

 ┌───┐       ┌───┐        ┌───┐───┐    ┌───┐───┐    ┌─┐┌─┐┌─┐
 │ A │       │ A │        │ A │ B │    │ A │ B │    │ ││ ││ │
 └───┘       └─┬─┘        └───┘─┬─┘    └─┬─┘─┬─┘    └┬┘└┬┘└┬┘
               │                │        │   │       ┌┴──┴──┴┐
             ┌─┴─┐          ┌───┘───┐    │   │       │ 共享   │
             │ a │          │ C │ D │  ┌─┴───┴─┐    │ 状态   │
             └───┘          └───┘───┘  │ 消息  │    └───────┘
                                       │ 总线  │
 1 个循环      父级 +         逐阶段     │       │    N 个对等体，
 1 个上下文    子任务         处理       └───────┘    涌现行为
                                       显式角色
```

**单智能体。** 一个循环、一条提示词。适合简单任务。

**子智能体。** 父智能体创建子智能体来处理聚焦子任务；父智能体维持计划，子智能体汇报结果。这正是 Claude Code 的做法。

**流水线。** 智能体按顺序运行，智能体 A 的输出成为智能体 B 的输入。适合分阶段工作流：研究 → 编码 → 审查 → 测试。

**团队。** 智能体通过共享消息总线并行运行，各自有角色，由编排器协调。适合需要同时使用不同技能的工作。

**群体。** 多个相同或近似相同的智能体共享状态；没有固定编排器，智能体从队列领取工作。适合高吞吐量并行任务。

### 四种多智能体模式

#### 模式 1：流水线

```text
输入 ──▶ 智能体 A ──▶ 智能体 B ──▶ 智能体 C ──▶ 输出
          （研究）     （编码）      （审查）
```

每个智能体转换数据并将其向前传递，易于理解；某一阶段失败会阻塞其余阶段。

#### 模式 2：扇出 / 扇入

```text
                ┌──▶ 智能体 A ──┐
                │               │
输入 ──▶ 拆分 ──┼──▶ 智能体 B ──┼──▶ 合并 ──▶ 输出
                │               │
                └──▶ 智能体 C ──┘
```

把工作拆给并行智能体，再合并结果。适合可分解为独立子任务的工作。

#### 模式 3：编排器—工作器

```text
                    ┌──────────┐
                    │ 编排器   │
                    └──┬───┬───┘
                  任务 │   │ 任务
                 ┌─────┘   └─────┐
                 ▼               ▼
           ┌──────────┐   ┌──────────┐
           │ 工作器 A │   │ 工作器 B │
           └──────────┘   └──────────┘
```

智能编排器决定要做什么、将工作委派给工作器，并综合结果。编排器本身也是一个智能体，拥有创建工作器的工具。

#### 模式 4：对等群体

```text
         ┌───┐ ◄──── 消息 ────▶ ┌───┐
         │ A │                  │ B │
         └─┬─┘                  └─┬─┘
           │                      │
      消息 │    ┌───────────┐     │ 消息
           └───▶│   共享    │◄────┘
                │   状态    │
           ┌───▶│  / 队列   │◄────┐
           │    └───────────┘     │
      消息 │                      │ 消息
         ┌─┴─┐                  ┌─┴─┐
         │ C │ ◄──── 消息 ────▶ │ D │
         └───┘                  └───┘
```

没有中心编排器。智能体点对点通信，决策从交互中涌现。它更难调试，但可以扩展到很多智能体。

### 何时不应使用多智能体

多智能体会增加复杂性。智能体之间的每条消息都是潜在故障点；调试会从“读一段对话”变成“追踪五个智能体之间的消息”。

**以下情况应保持单智能体：**

- 任务可以放进一个上下文窗口（工作数据少于约 10 万 token）
- 不需要在不同阶段使用不同系统提示词
- 串行执行已经足够快
- 任务本身足够简单，拆分增加的开销大于价值

**复杂性成本：**

- 每个智能体边界都是有损压缩步骤：智能体 A 的完整上下文会被摘要为发给智能体 B 的消息
- 协调逻辑（谁在何时、按什么顺序做什么）本身就是缺陷来源
- 延迟增加：N 个智能体至少意味着 N 次串行 LLM 调用；若需来回交流则更多
- 成本倍增：每个智能体独立消耗 token

经验法则：若任务少于 20 次工具调用且可放入 10 万 token，请保持单智能体。

```figure
swarm-messages
```

## 构建

### 步骤 1：过载的单智能体

下面是一个尝试做完所有事情的单智能体：它有一条巨大的系统提示词，以及一个容纳研究、代码和审查结果的上下文窗口。

```typescript
type AgentResult = {
  content: string;
  tokensUsed: number;
  toolCalls: number;
};

async function singleAgentApproach(task: string): Promise<AgentResult> {
  const systemPrompt = `You are a full-stack developer. You must:
1. Research the requirements
2. Write the code
3. Review the code for bugs
4. Write tests
Do ALL of these in a single conversation.`;

  const contextWindow: string[] = [];
  let totalTokens = 0;
  let totalToolCalls = 0;

  const research = await fakeLLMCall(systemPrompt, `Research: ${task}`);
  contextWindow.push(research.output);
  totalTokens += research.tokens;
  totalToolCalls += research.calls;

  const code = await fakeLLMCall(
    systemPrompt,
    `Given this research:\n${contextWindow.join("\n")}\n\nNow write code for: ${task}`
  );
  contextWindow.push(code.output);
  totalTokens += code.tokens;
  totalToolCalls += code.calls;

  const review = await fakeLLMCall(
    systemPrompt,
    `Given all previous context:\n${contextWindow.join("\n")}\n\nReview the code.`
  );
  contextWindow.push(review.output);
  totalTokens += review.tokens;
  totalToolCalls += review.calls;

  return {
    content: contextWindow.join("\n---\n"),
    tokensUsed: totalTokens,
    toolCalls: totalToolCalls,
  };
}
```

这种做法的问题：

- 上下文窗口随每个阶段增长。到审查阶段，它同时包含研究笔记、代码和先前推理。
- 系统提示词过于通用，无法针对每个阶段调优。
- 没有任何工作并行运行。

### 步骤 2：专业智能体

现在将其拆分。每个智能体只做一项工作：

```typescript
type SpecialistAgent = {
  name: string;
  systemPrompt: string;
  run: (input: string) => Promise<AgentResult>;
};

function createSpecialist(name: string, systemPrompt: string): SpecialistAgent {
  return {
    name,
    systemPrompt,
    run: async (input: string) => {
      const result = await fakeLLMCall(systemPrompt, input);
      return {
        content: result.output,
        tokensUsed: result.tokens,
        toolCalls: result.calls,
      };
    },
  };
}

const researcher = createSpecialist(
  "researcher",
  "You are a technical researcher. Read documentation, find patterns, and summarize findings. Output only the facts needed for implementation."
);

const coder = createSpecialist(
  "coder",
  "You are a senior TypeScript developer. Given requirements and research notes, write clean, tested code. Nothing else."
);

const reviewer = createSpecialist(
  "reviewer",
  "You are a code reviewer. Find bugs, security issues, and logic errors. Be specific. Cite line numbers."
);
```

每位专家都有聚焦提示词，并获得一个只包含自身所需输入的干净上下文窗口。

### 步骤 3：通过消息协调

用显式消息传递把这些专家连接起来：

```typescript
type AgentMessage = {
  from: string;
  to: string;
  content: string;
  timestamp: number;
};

async function multiAgentApproach(task: string): Promise<AgentResult> {
  const messages: AgentMessage[] = [];
  let totalTokens = 0;
  let totalToolCalls = 0;

  const researchResult = await researcher.run(task);
  messages.push({
    from: "researcher",
    to: "coder",
    content: researchResult.content,
    timestamp: Date.now(),
  });
  totalTokens += researchResult.tokensUsed;
  totalToolCalls += researchResult.toolCalls;

  const coderInput = messages
    .filter((m) => m.to === "coder")
    .map((m) => `[From ${m.from}]: ${m.content}`)
    .join("\n");

  const codeResult = await coder.run(coderInput);
  messages.push({
    from: "coder",
    to: "reviewer",
    content: codeResult.content,
    timestamp: Date.now(),
  });
  totalTokens += codeResult.tokensUsed;
  totalToolCalls += codeResult.toolCalls;

  const reviewerInput = messages
    .filter((m) => m.to === "reviewer")
    .map((m) => `[From ${m.from}]: ${m.content}`)
    .join("\n");

  const reviewResult = await reviewer.run(reviewerInput);
  messages.push({
    from: "reviewer",
    to: "orchestrator",
    content: reviewResult.content,
    timestamp: Date.now(),
  });
  totalTokens += reviewResult.tokensUsed;
  totalToolCalls += reviewResult.toolCalls;

  return {
    content: messages.map((m) => `[${m.from} -> ${m.to}]: ${m.content}`).join("\n\n"),
    tokensUsed: totalTokens,
    toolCalls: totalToolCalls,
  };
}
```

每个智能体只接收发给它的消息。研究员读取文档所用的 5 万 token 不会进入审查员的上下文。

### 步骤 4：比较

```typescript
async function compare() {
  const task = "Build a rate limiter middleware for an Express.js API";

  console.log("=== Single Agent ===");
  const single = await singleAgentApproach(task);
  console.log(`Tokens: ${single.tokensUsed}`);
  console.log(`Tool calls: ${single.toolCalls}`);

  console.log("\n=== Multi-Agent ===");
  const multi = await multiAgentApproach(task);
  console.log(`Tokens: ${multi.tokensUsed}`);
  console.log(`Tool calls: ${multi.toolCalls}`);
}
```

多智能体版本使用更多总 token（三个智能体、三次独立 LLM 调用），但每个智能体的上下文保持整洁。由于系统提示词更专业化，每个阶段的质量都会提升。

## 使用

本课产出一个用于判断何时应转向多智能体的可复用提示词。参见 `outputs/prompt-multi-agent-decision.md`。

## 练习

1. 添加第四位专家：“测试员”智能体。它从编码员接收代码、从审查员接收反馈，然后编写测试。
2. 修改流水线，让审查员能够把反馈发回编码员，形成修订循环（最多 2 轮）。
3. 将串行流水线改为扇出：并行运行研究员和“需求分析员”智能体，再在把输出传给编码员前合并结果。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| 群体（Swarm） | “AI 智能体的蜂群大脑” | 一组拥有共享状态、没有固定领导者的对等智能体。行为从局部交互中涌现。 |
| 编排器（Orchestrator） | “老板智能体” | 工具中包含创建和管理其他智能体的智能体。它负责规划和委派，但不一定执行实际工作。 |
| 协调器（Coordinator） | “交通警察” | 根据规则在智能体间路由消息的非智能体组件（通常只是代码，不是 LLM）。 |
| 共识（Consensus） | “智能体达成一致” | 多个智能体必须在继续前达成一致的协议，用于需要化解冲突输出的场景。 |
| 涌现行为 | “智能体自己想出来了” | 从智能体交互中出现、却未被显式编程的系统级模式；可能有用，也可能有害。 |
| 扇出 / 扇入 | “智能体版 map-reduce” | 将任务拆给并行智能体（扇出），再合并结果（扇入）。 |
| 消息传递 | “智能体彼此交谈” | 智能体间的通信机制：从一个智能体发送给另一个智能体的结构化数据，替代共享上下文窗口。 |

## 延伸阅读

- [The Landscape of Emerging AI Agent Architectures](https://arxiv.org/abs/2409.02977) —— 多智能体模式综述
- [AutoGen: Enabling Next-Gen LLM Applications](https://arxiv.org/abs/2308.08155) —— Microsoft 的多智能体对话框架
- [Claude Code subagents documentation](https://docs.anthropic.com/en/docs/claude-code) —— Claude Code 如何用 Task 委派工作
- [CrewAI documentation](https://docs.crewai.com/) —— 基于角色的多智能体框架
