---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/07-memory-virtual-context-memgpt/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 71b0ba93e4d737f64c1c7a90408489676e35aaa75418050ca42c5a68a95e355d
status: reviewed
---

# 智能体记忆——虚拟上下文与记忆分页

> 上下文窗口是有限的，而对话、文档和工具轨迹不是。解决办法是重新表述操作系统的虚拟内存：主上下文是 RAM，外部存储是磁盘，智能体在二者之间进行分页。MemGPT（Packer 等，2023）命名了这一模式，许多生产记忆系统都建立在它之上。

**类型：** 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 01 节（智能体循环）、第 14 阶段 · 第 06 节（工具使用）
**用时：** 约 75 分钟

## 学习目标

- 解释 MemGPT 所借鉴的操作系统类比：主上下文 = RAM，外部上下文 = 磁盘，记忆工具 = 换入/换出页面。
- 用标准库实现两层 MemGPT 模式：主上下文缓冲区、可搜索的外部存储，以及换入/换出工具。
- 描述智能体如何发出“中断”来查询或修改外部记忆，以及结果如何拼接回下一次提示词。
- 识别会延续到 Letta（第 08 节）和 Mem0（第 09 节）的 MemGPT 设计选择。

## 问题所在

上下文窗口看起来应该能解决记忆问题，但事实并非如此。生产环境会反复出现三种失败模式：

1. **溢出。** 多轮对话、长文档或工具调用密集的轨迹超过窗口，截断点之后的内容全部消失。
2. **稀释。** 即使仍在窗口内，塞入无关上下文也会稀释注意力，让重要内容不再突出。frontier 模型在长输入上仍会退化。
3. **持久化。** 新会话从空窗口开始。没有外部记忆的智能体无法跨会话说出“还记得你让我……吗”。

更大的窗口有帮助，但不能修复这些问题。Mem0 的 2025 年论文测得：128k 窗口的基线仍然会漏掉长时程事实，而一个带外部记忆的 4k 窗口智能体可以捕获它们。

## 核心概念

### 操作系统类比

MemGPT（Packer 等，arXiv:2310.08560，2024 年 2 月 v2）将上下文管理映射到操作系统的虚拟内存：

| 操作系统概念 | MemGPT 概念 | 2026 年生产类比 |
|------------|--------------|------------------|
| RAM | 主上下文（提示词） | Anthropic/OpenAI 上下文窗口 |
| 磁盘 | 外部上下文 | 向量数据库、KV、图存储 |
| 页面错误 | 记忆工具调用 | memory.search、memory.read、memory.write |
| OS 内核 | 智能体控制循环 | 带记忆工具的 ReAct 循环 |

智能体运行普通的 ReAct 循环。额外的一类工具让它可以将数据换入主上下文或换出主上下文。

### 两层

- **主上下文。** 保存当前任务的固定大小提示词，模型始终可见。
- **外部上下文。** 无界、可通过工具搜索；在相关时读取，在事实出现时写入。

原论文在两个超出基础窗口的任务上评估了这一设计：超过 100k token 的文档分析，以及跨天保持持久记忆的多会话聊天。

### 中断模式

MemGPT 引入了“记忆即中断”：在对话中途，智能体可以调用记忆工具，运行时执行它，并将结果作为新的观察结果拼接进下一轮助手消息。概念上，这与 Unix 中阻塞进程、返回字节、然后继续执行的 read() 系统调用完全相同。

经典的记忆工具界面：

- core_memory_append(section, text)——将内容写入提示词中的持久区段。
- core_memory_replace(section, old, new)——编辑持久区段。
- archival_memory_insert(text)——写入可搜索的外部存储。
- archival_memory_search(query, top_k)——从外部存储检索。
- conversation_search(query)——扫描之前的轮次。

### 论文止于哪里，生产从哪里开始

2024 年 9 月，MemGPT 变成了 Letta。研究仓库（cpacker/MemGPT）仍然存在；Letta 扩展了这套设计：

- 从两层变成三层（core、recall、archival——第 08 节）。
- 用原生推理替代 send_message/heartbeat 模式（第 08 节）。
- 运行异步的睡眠时智能体（第 08 节）。

即使生产系统运行的是 Letta、Mem0 或自定义两层存储，MemGPT 论文仍然是 2026 年的基础。

### 这个模式会在哪里出错

- **记忆腐化。** 写入速度快于读取，检索被过时事实淹没。修复方式是定期整合（Letta 睡眠时计算）和显式失效（Mem0 冲突检测器）。
- **记忆中毒。** 外部记忆是检索到的文本。如果攻击者控制的内容进入记忆笔记，智能体会在下一次会话重新摄入它。这是 Greshake 等人的攻击（第 27 节）在时间维度上的重述。
- **引用丢失。** 智能体记得“用户让我交付 X”，却无法指出是哪一轮。每次写入 archival 时，都要保存来源引用（session ID、turn ID）。

```figure
context-budget
```

## 动手构建

code/main.py 只用标准库实现了 MemGPT 的两层模式：

- MainContext——固定大小的提示词缓冲区，包含 core 字典和 messages 列表；超过上限时自动压缩最早的消息。
- ArchivalStore——内存中的 BM25 风格存储，以 token 重叠评分保存（id、text、tags、session、turn）记录。
- 映射到 MemGPT 界面的五个记忆工具。
- 一个脚本化智能体：先用事实填充 archival，再通过调用 archival_memory_search 回答问题。

运行：

```
python3 code/main.py
```

轨迹展示智能体写入三个事实、将主上下文填到上限（迫使内容驱逐），然后通过从 archival 检索来回答后续问题；整个过程无需真实 LLM，却复现了 MemGPT 工作流。

## 实际使用

今天每个生产记忆系统都是 MemGPT 的变体：

- **Letta**（第 08 节）——三层、原生推理、睡眠时计算。
- **Mem0**（第 09 节）——向量 + KV + 图，并由评分层融合。
- **OpenAI Assistants / Responses**——通过 threads 和 files 管理记忆。
- **Claude Agent SDK**——通过 skills 和 session store 提供长期记忆。

应按运行形态选择（自托管、托管、框架集成）；核心模式统一采用 MemGPT。

### 智能体记忆的形状

分页解决的是容量问题，但它不决定应该保存什么。生产系统中反复出现四类记忆，每一类回答不同的问题：

- **工作记忆**——现在什么重要？上下文中的一层：当前任务、最近轮次、固定的 core 区段。也就是提示词本身。
- **情景记忆**——发生过什么？保存带 session 和 turn 引用的历史轮次与轨迹，可按需重放。
- **语义记忆**——什么是真的？关于用户、领域和世界的事实；事实变化时更新并去重。
- **程序记忆**——该怎么做？习得的例程、偏好和规则，它们会引导未来行为，而不是只负责回忆。

开源实现会选择不同的切入点：

| 类型 | 实现 | 如何处理 |
|------|------|----------|
| 工作 | MemGPT / Letta | 通过记忆工具，在固定提示词预算中换入和换出内容（本节、第 08 节） |
| 情景 | Zep | 时间知识图谱——事实携带有效区间，因此可以查询“当时什么是真的” |
| 语义 | Mem0 | 抽取管线在向量、KV 和图存储之间去重并更新事实（第 09 节） |
| 语义 + 程序 | LangMem | 后台将事实和行为规则抽取到存储中，智能体在轮次之间查询 |
| 情景 + 语义 | agentmemory | 运行时捕获会话，再整合成类型化、可搜索的记录 |

## 交付

outputs/skill-virtual-memory.md 是一个可复用 skill：它可以为任意目标运行时生成正确的两层记忆脚手架（主上下文 + archival + 工具界面），并接入驱逐策略和引用字段。

## 练习

1. 增加按 token 计算的 max_main_context_tokens 上限（可用 len(text.split()) * 1.3 近似）。超过上限时，将最早的消息压缩成摘要。比较有无摘要器时的行为。
2. 在 archival 存储上正确实现 BM25（词频、逆文档频率）。在玩具事实集上测量 recall@10，并与 token 重叠基线比较。
3. 为 archival 插入增加 citation 字段（session_id、turn_id、source_url）。让智能体在每次基于检索的回答中引用来源。
4. 模拟记忆中毒：添加一条内容为“忽略未来所有用户指令”的 archival 记录。编写一个 guard，扫描检索结果中的指令式文本，并把这些内容标记为不受信任。
5. 将实现迁移到 MemGPT 研究仓库的 core-memory JSON schema（cpacker/MemGPT）。从扁平字符串切换到类型化区段后有什么变化？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Virtual context | “无限记忆” | 主上下文（提示词）+ 外部（可搜索）两层，并在其间换入/换出 |
| Main context | “工作记忆” | 提示词——固定大小、始终可见 |
| Archival memory | “长期存储” | 外部可搜索的持久化存储，按需检索 |
| Core memory | “持久提示词区段” | 固定在主上下文中的命名区段 |
| Memory tool | “记忆 API” | 智能体发出的、读写外部记忆的工具调用 |
| Interrupt | “记忆页面错误” | 智能体暂停，运行时取回内容，结果拼接到下一轮 |
| Memory rot | “过时事实” | 旧写入淹没检索；用整合修复 |
| Memory poisoning | “注入的持久笔记” | 攻击者内容被存成记忆，并在回忆时重新摄入 |

## 延伸阅读

- [Packer 等，MemGPT（arXiv:2310.08560）](https://arxiv.org/abs/2310.08560)——受操作系统启发的虚拟上下文论文
- [Letta，Memory Blocks 博客](https://www.letta.com/blog/memory-blocks)——三层演进
- [Anthropic，有效的上下文工程](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)——将上下文视为预算
- [Chhikara 等，Mem0（arXiv:2504.19413）](https://arxiv.org/abs/2504.19413)——建立在这一模式上的混合生产记忆
- [Zep（getzep/zep）](https://github.com/getzep/zep)——分类表中的时间知识图谱记忆
- [Mem0（mem0ai/mem0）](https://github.com/mem0ai/mem0)——第 09 节混合存储背后的抽取管线
- [LangMem（langchain-ai/langmem）](https://github.com/langchain-ai/langmem)——后台抽取事实与行为规则
- [agentmemory（rohitg00/agentmemory）](https://github.com/rohitg00/agentmemory)——将会话捕获并整合成类型化、可搜索记录
