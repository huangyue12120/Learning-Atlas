---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/08-memory-blocks-sleep-time-compute/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: c9d406091f226f33e6b8336bd887d12e7a8cdbe769b257a6c6bda4988eff6f3b
status: reviewed
---

# 记忆块与睡眠时计算

> 模型可以直接编辑的离散功能记忆块，以及在主智能体空闲时异步整合记忆的睡眠时智能体。这两个想法让记忆可以扩展到单次对话之外。

**类型：** 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 07 节（MemGPT）
**用时：** 约 75 分钟

## 学习目标

- 说出 Letta 使用的三层记忆（core、recall、archival）及每层的作用。
- 解释记忆块模式：Human block、Persona block，以及用户自定义 block 如何成为一等类型化对象。
- 描述睡眠时计算是什么、为什么位于关键路径之外，以及为什么它可以运行比主智能体更强的模型。
- 实现一个脚本化的双智能体循环：主智能体提供响应，睡眠时智能体在轮次之间整合记忆块。

## 问题所在

MemGPT（第 07 节）解决了虚拟内存的控制流，但生产环境出现了三个问题：

1. **延迟。** 每次记忆操作都在关键路径上。如果智能体必须在用户等待时修剪、摘要或协调内容，尾部延迟会爆炸。
2. **记忆腐化。** 写入不断累积，互相矛盾的事实仍然存在，检索会被过时内容淹没。
3. **结构丢失。** 扁平 archival 存储无法表达“Human block 永远在提示词中；Persona block 永远在提示词中；Task block 按会话切换”。

Letta（letta.com）是原始 MemGPT 项目在 2024 年采用的平台名称——论文中的模式仍叫 MemGPT——而 2026 年的 Letta V1 重写是后续的独立步骤。记忆块让结构明确；睡眠时计算将整合移出关键路径。

## 核心概念

### 三层

| 层 | 范围 | 所在位置 | 写入者 |
|----|------|----------|--------|
| Core | 始终可见 | 主提示词内部 | 智能体工具调用 + 睡眠时重写 |
| Recall | 对话历史 | 可检索 | 自动记录每一轮 |
| Archival | 任意事实 | 向量 + KV + 图 | 智能体工具调用 + 睡眠时摄入 |

Core 是 MemGPT 的核心。Recall 是带有被驱逐尾部的对话缓冲区。Archival 是外部存储。这种拆分清理了 MemGPT 两层设计中承担过多含义的问题。

### 记忆块

记忆块是 core 层中一种类型化、持久化、可编辑的区段。原始 MemGPT 论文定义了两种：

- **Human block**——关于用户的事实（姓名、角色、偏好、目标）。
- **Persona block**——智能体的自我概念（身份、语气、约束）。

Letta 将它推广到任意用户定义的 block：用于当前目标的 Task block、用于代码库事实的 Project block、用于硬约束的 Safety block。每个 block 都有 id、label、value、limit（字符上限）、description（让模型知道何时编辑它）。

可以通过工具界面编辑 block：

- block_append(label, text)
- block_replace(label, old, new)
- block_read(label)
- block_summarize(label)——压缩接近上限的 block。

### 睡眠时计算

Letta 在 2025 年加入的能力是：在后台、关键路径之外运行第二个智能体。睡眠时智能体处理对话 transcript 和代码库上下文，将 learned_context 写入共享 block，并整合或使 archival 记录失效。

由此产生的性质包括：

- **没有延迟成本。** 主响应不需要等待记忆操作。
- **可以使用更强的模型。** 睡眠时智能体不受延迟约束，因此可以使用更昂贵、更慢的模型。
- **自然的整合窗口。** 用户不在等待时，去重、摘要和使矛盾事实失效。

这种形状与人类的工作方式相似：你完成任务，睡一觉，长期记忆在夜间沉淀。

### 原生推理

Letta V1（letta_v1_agent，2026）用原生推理替代 send_message/heartbeat 和内联的 Thought: token。Responses API（OpenAI）以及带 extended thinking 的 Messages API（Anthropic）会在单独的通道输出推理，并在多轮中传递（生产环境中跨提供方加密传递）。控制循环仍然是 ReAct；思考轨迹是结构化的，而不是提示词形状的。

### 这个模式会在哪里出错

- **Block 膨胀。** 无限 block_append 很快就会达到上限。接入 block summarizer，在写入会导致超限之前先压缩。
- **静默漂移。** 睡眠时智能体重写了 block，而主智能体从未察觉。为 block 加版本，并在轨迹中展示 diff。
- **有毒整合。** 睡眠时智能体把攻击者可触达的内容处理进 core。第 27 节同样适用于睡眠时界面。

```figure
memory-blocks
```

## 动手构建

code/main.py 实现了：

- Block——id、label、value、limit、description。
- BlockStore——CRUD，以及 near_limit(label) 辅助方法。
- 两个脚本化智能体——PrimaryAgent 服务一个轮次，SleepTimeAgent 在轮次之间整合。
- 一条轨迹：展示三轮对话中的 block 写入，以及一次睡眠时处理如何摘要某个 block 并使过时事实失效。

运行：

```
python3 code/main.py
```

transcript 展示了这种拆分：主轮次很快，只产生原始写入；睡眠时处理负责压缩和清理。

## 实际使用

- **Letta**（letta.com）作为参考实现，可自托管或使用托管云。
- **Claude Agent SDK skills** 作为块形知识：skill 是一个命名、版本化、可检索的指令块，智能体按需加载。
- **自定义构建** 适合想控制存储后端的团队。使用 Letta API 契约，以便未来迁移。

## 交付

outputs/skill-memory-blocks.md 会为任意运行时生成形状类似 Letta 的 block 系统，并接入睡眠时钩子、安全规则和引用连线。

## 练习

1. 增加 block_summarize 工具：当 near_limit 返回 true 时，用模型生成的摘要替换 block value。哪个触发阈值能同时最小化摘要调用和 block 溢出？
2. 对 archival 实现睡眠时去重：文本 token 重叠超过 90% 的两条记录合并为一条。只在睡眠时处理，不要放在关键路径上。
3. 为 block 增加版本。每次写入都记录旧值和 diff。暴露 block_history(label)，让运维人员可以调试“智能体为什么忘了 X”。
4. 将睡眠时智能体视为不受信任的写入者。当它们修改 Persona 或 Safety block 时，要求第二个智能体审核后才能提交。
5. 将示例迁移到 Letta API（letta_v1_agent）。block schema 有何变化？原生推理如何改变轨迹形状？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Memory block | “可编辑提示词区段” | core memory 中类型化、持久化、LLM 可编辑的片段 |
| Human block | “用户记忆” | 关于用户的事实，固定在 core 中 |
| Persona block | “智能体身份” | 自我概念、语气和约束，固定在 core 中 |
| Sleep-time compute | “异步记忆工作” | 第二个智能体在关键路径之外做整合 |
| Core / Recall / Archival | “三层” | 三层记忆拆分：始终可见 / 对话 / 外部 |
| Block limit | “上限” | 每个 block 的字符上限，迫使进行摘要 |
| Native reasoning | “思考通道” | 提供方级推理输出，而不是提示词级 Thought: |
| Learned context | “睡眠时输出” | 睡眠时智能体写入共享 block 的事实 |

## 延伸阅读

- [Letta，Memory Blocks 博客](https://www.letta.com/blog/memory-blocks)——block 模式
- [Letta，Sleep-time Compute 博客](https://www.letta.com/blog/sleep-time-compute)——异步整合
- [Letta，重新架构智能体循环](https://www.letta.com/blog/letta-v1-agent)——原生推理重写
- [Packer 等，MemGPT（arXiv:2310.08560）](https://arxiv.org/abs/2310.08560)——起源
