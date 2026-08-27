---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: cb20c86f615eac8c5d965b4469eb737401e21b92e94ad8360fdac07d144a0c03
status: reviewed
---

# 群聊与发言者选择

> 共享会话编排将 N 个智能体放在同一段对话中；选择函数（LLM、轮询或自定义）决定下一个谁发言。这构成涌现式多智能体对话的原型：智能体不知道自己位于静态图中的何处，只对共享池作出反应。AutoGen GroupChat 与 AG2 GroupChat 是参考实现：AutoGen v0.2 的 GroupChat 语义在 AG2 分叉中得到保留；AutoGen v0.4 将其改写为事件驱动 actor 模型。Microsoft 于 2026 年 2 月将 AutoGen 置入维护模式，并将其与 Semantic Kernel 合并到 Microsoft Agent Framework（RC，2026 年 2 月）。GroupChat 原语在 AG2 和 Microsoft Agent Framework 中都得以延续——学习一次，处处使用。

**类型：** 学习 + 构建
**语言：** Python（标准库）
**前置要求：** 第 16 阶段 · 04（原语模型）
**用时：** 约 60 分钟

## 问题

当工作流已知时，静态图（LangGraph）很好。真实会话并不静态：有时编码者问审阅者，有时问研究员，有时问作者。将每一种可能的交接都硬编码，会产生边爆炸。你想要*对共享池作出反应的智能体*，再由某个函数决定下一个谁发言。

这正是 AutoGen GroupChat 所做的事。

## 概念

### 形状

```
              ┌─── 共享池 ────┐
              │  m1  m2  m3 ... │
              └─────────┬──────────┘
                        │（所有人读取全部）
      ┌───────┬─────────┼─────────┬───────┐
      ▼       ▼         ▼         ▼       ▼
    智能体 A  智能体 B  智能体 C  智能体 D  选择器
                                           │
                                           ▼
                                  “下一位发言者 = C”
```

每个智能体都看到每条消息。每一轮都调用选择函数，决定下一个谁发言。

### 三种选择器形式

**轮询。** 固定循环，确定性。随 N 线性扩展，但忽略上下文——即便主题是法务审查，编码者也会轮到发言。

**LLM 选择。** 调用一个读取最近消息池、返回最佳下一位发言者的 LLM。感知上下文但缓慢：每一轮多一次 LLM 调用。AutoGen 的默认值。

**自定义。** 包含任意逻辑的 Python 函数。典型做法：LLM 选择配合回退规则（例如“编码者之后总要让验证者发言”）。

### ConversableAgent API

```
agent = ConversableAgent(
    name="coder",
    system_message="You write Python.",
    llm_config={...},
)
chat = GroupChat(agents=[coder, reviewer, tester], messages=[])
manager = GroupChatManager(groupchat=chat, llm_config={...})
```

`GroupChatManager` 持有选择器。一个智能体完成一轮后，管理者调用选择器，选择器返回下一个智能体。循环持续至终止条件。

### 终止

三种常见模式：

- **最大轮数。** 对总轮数设置硬上限。
- **`"TERMINATE"` token。** 智能体可以发出哨兵消息；任一消息出现时管理者停止。
- **目标达成检查。** 每轮运行一个轻量验证者，完成时停止聊天。

### 谱系：分叉与合并

2025 年初，Microsoft 开始围绕事件驱动 actor 模型重写 AutoGen（v0.4）。社区将 AutoGen v0.2 的 GroupChat 语义分叉为 AG2，保留了早期采用者已集成的 API。

2026 年 2 月，Microsoft 宣布 AutoGen 进入维护模式，事件驱动 actor 模型合并进**Microsoft Agent Framework**（RC，2026 年 2 月，现已与 Semantic Kernel 合并）。GroupChat 概念在两条分支中存续，具体实现各不相同。对于 v0.2 兼容代码，AG2 是首选上游。

### GroupChat 何时适合

- **涌现式对话。** 不希望预先布线每一种可能的下一位发言者。
- **角色混合任务。** 编码者问研究员，研究员问档案员，档案员再问编码者。流程不是 DAG。
- **探索式解决问题。** 想成“头脑风暴会议”，而不是“装配线”。

### 何时失败

- **严格确定性。** LLM 选择器可能不一致。同一提示词、不同运行，下一位发言者不同。
- **谄媚级联。** 智能体服从说话最自信的人。明确提示反方。
- **上下文膨胀。** 每个智能体阅读每条消息；10 轮后上下文巨大。使用投影（第 15 课）限定视图。
- **热门发言者。** 选择器偏好其专长，某个智能体主导对话。应把发言均衡作为选择器特征。

### 群聊与主管

相同原语，不同默认值：

- 主管：一名智能体规划，其他执行。选择器是“问规划者下一步做什么”。
- 群聊：所有智能体都是对等体；选择器是共享池上的函数。

两者都使用第 04 课的四种原语。群聊默认使用 LLM 选择的编排和完整池共享状态。

```figure
swarm-speaker
```

## 动手构建

`code/main.py` 用标准库从零实现 GroupChat。包含三个智能体（编码者、审阅者、管理者）、轮询和 LLM 选择变体，以及 `TERMINATE` token 终止。

演示会打印两个变体的对话记录以及选择器的决策跟踪。

运行：

```
python3 code/main.py
```

## 实际使用

`outputs/skill-groupchat-selector.md` 为给定任务配置 GroupChat 选择器——轮询、LLM 选择或自定义，以及要使用哪些选择器输入（最近消息、智能体专长、发言次数）。

## 交付物

检查表：

- **最大轮数上限。** 始终需要；典型任务为 10–20。
- **发言均衡指标。** 跟踪每个智能体的轮数；失衡超过阈值时告警。
- **终止 token。** `TERMINATE` 或专门的验证者智能体。
- **投影或范围化记忆。** 约 10 条消息后，可考虑每个智能体只获得范围限定的视图，防止上下文膨胀。
- **选择器日志。** 对 LLM 选择变体，同时记录选择器输入和选择。否则无法调试。

## 练习

1. 运行 `code/main.py`。比较轮询和 LLM 选择下的对话；各自是哪名智能体主导？
2. 在选择器中加入“每智能体最多发言次数”规则。它如何影响对话记录？
3. 实现目标达成终止：当审阅者返回“approved”时停止。它多常在轮数上限前触发？
4. 阅读 AutoGen GroupChat 稳定文档（https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/design-patterns/group-chat.html）。找出 `GroupChatManager` 使用的默认选择器。
5. 阅读 AG2 仓库（https://github.com/ag2ai/ag2），并将其 v0.2 GroupChat 与 v0.4 事件驱动版本比较。v0.4 增加了哪项具体属性（吞吐量、容错、可组合性）？

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| GroupChat | “一个聊天室中的智能体” | 共享消息池 + 选择器函数；AutoGen / AG2 原语。 |
| 发言者选择 | “下一个谁说话” | 选择下一个智能体的函数：轮询、LLM 选择或自定义。 |
| GroupChatManager | “会议主持人” | 持有选择器并循环各轮的 AutoGen 组件。 |
| ConversableAgent | “基础智能体” | AutoGen 基类；可以发送与接收消息的智能体。 |
| 终止 token | “停止词” | 结束聊天的哨兵字符串（通常是 `TERMINATE`）。 |
| 热门发言者 | “一个智能体主导” | 选择器不断选中同一智能体的失效模式。 |
| 上下文膨胀 | “池无限增长” | 每个智能体读取所有先前消息；上下文随轮数增长。 |
| 投影 | “范围限定视图” | 共享池中按角色限定的视图，防止上下文膨胀。 |

## 延伸阅读

- [AutoGen group chat docs](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/design-patterns/group-chat.html) — 参考实现
- [AG2 repo](https://github.com/ag2ai/ag2) — 社区维护的 AutoGen v0.2 延续
- [Microsoft Agent Framework docs](https://learn.microsoft.com/en-us/agent-framework/) — 合并后的后继框架，RC 于 2026 年 2 月发布
- [AutoGen v0.4 release notes](https://microsoft.github.io/autogen/stable/) — 事件驱动 actor 模型重写的细节
