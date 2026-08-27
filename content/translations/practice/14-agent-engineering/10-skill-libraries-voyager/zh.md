---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/10-skill-libraries-voyager/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: c6cf28951a1e4272831bb047e46deda31477551d3f6e142633ec101e6cce5bb2
status: reviewed
---

# Skill 库与终身学习（Voyager）

> Voyager（Wang 等，TMLR 2024）将可执行代码视为 skill。Skill 有名称、可检索、可组合，并由环境反馈持续改进。Claude Agent SDK skills、skillkit 以及 2026 年 skill 库模式都沿用了这套架构。

**类型：** 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 07 节（MemGPT）、第 14 阶段 · 第 08 节（Letta Blocks）
**用时：** 约 75 分钟

## 学习目标

- 说出 Voyager 的三个组件——自动课程、skill 库、迭代式提示——以及每个组件的作用。
- 解释 Voyager 为什么让行动空间成为代码，而不是原始命令。
- 用标准库实现一个支持注册、检索、组合和由失败驱动改进的 skill 库。
- 将 Voyager 模式映射到 2026 年的 Claude Agent SDK skills 和 skillkit 生态。

## 问题所在

每次会话都从头重建能力的智能体会犯三类错误：

1. **浪费 token。** 每项任务都重新诱导同一套推理。
2. **丢失进展。** 在会话 A 学到的纠正不会转移到会话 B。
3. **长时程组合失败。** 复杂任务需要能力层级；一次性提示词无法表达它们。

Voyager 的答案是：把每项可复用能力当作有名字的代码块存入库中，按相似度检索，与其他 skill 组合，并根据执行反馈改进。

## 核心概念

### 三个组件

Voyager（arXiv:2305.16291）围绕以下三点组织智能体：

1. **自动课程。** 由好奇心驱动的提议器根据智能体当前的 skill 集合和环境状态选择下一个任务。探索是自底向上的。
2. **Skill 库。** 每个 skill 都是可执行代码。任务成功后加入新 skill；根据查询与描述的相似度检索 skill。
3. **迭代式提示机制。** 失败时，智能体收到执行错误、环境反馈和自我验证输出，然后改进 skill。

Minecraft 评估（Wang 等，2024）的结果是：独特物品数量为基线的 3.3 倍，石制工具速度为 8.5 倍，铁制工具速度为 6.4 倍，地图遍历长度为 2.3 倍。数字针对 Minecraft，但模式可以迁移。

### 行动空间 = 代码

大多数智能体输出原始命令。Voyager 输出 JavaScript 函数。一个 skill 是：

```text
async function craftIronPickaxe(bot) {
  await mineIron(bot, 3);
  await mineStick(bot, 2);
  await placeCraftingTable(bot);
  await craft(bot, 'iron_pickaxe');
}
```

它由子 skill 组合而成。它按描述和 embedding 建立索引。检索到的是一个程序，而不是一条提示词。

2026 年 Claude Agent SDK skill 是智能体按需加载的、有名字且可检索的代码块及其指令。

### Skill 检索

新任务“制作一把钻石镐”。智能体会：

1. 对任务描述进行 embedding。
2. 查询 skill 库，找到 top-k 个相似 skill。
3. 取回 craftIronPickaxe、mineDiamond、placeCraftingTable 等 skill。
4. 用取回的原语和新逻辑组合出新的 skill。

MCP resources（第 13 阶段）和 Agent SDK skills 都采用同一模式：检索知识或代码，并将范围限定在当前任务。

### 迭代式改进

Voyager 的反馈循环是：

1. 智能体编写一个 skill。
2. skill 在环境中运行。
3. 返回三种信号之一：success、error（带堆栈跟踪）或 self-verification failure。
4. 智能体以该信号为上下文重写 skill。
5. 循环直到成功或达到最大轮数。

这是将 Self-Refine（第 05 节）应用于带环境依据验证的代码生成。CRITIC（第 05 节）则是用外部工具作为验证器的同一模式。

### 课程与探索

Voyager 的课程模块会根据智能体拥有的能力以及尚未完成的事情，提出“在湖边建一个庇护所”之类的任务。提议器利用环境状态 + skill 清单，选择一个略高于当前能力的任务，这个范围最有利于探索。

对生产智能体而言，这转化为一个“缺少什么”操作符：给定当前 skill 库和领域描述，哪些 skill 还没有覆盖？团队通常会把它手动实现成课程复查。

### 这个模式会在哪里出错

- **Skill 库腐化。** 同一个 skill 被添加 10 次，只是描述略有不同。写入时去重；检索时只返回一个。
- **组合 skill 漂移。** 父 skill 依赖一个已经改进的子 skill。为 skill 加版本；固定到 v1 的父 skill 不会自动拿到 v3。
- **检索质量。** 当 skill 库超过几百个时，仅对描述做向量检索会退化。补充标签过滤和硬约束（“只允许 category=tooling 的 skill”）。

```figure
voyager-skills
```

## 动手构建

code/main.py 实现了一个标准库 skill 库：

- Skill——名称、描述、代码（字符串）、版本、标签、依赖。
- SkillLibrary——注册、搜索（token 重叠）、组合（对依赖做拓扑排序）和改进（更新时递增版本）。
- 一个脚本化智能体：注册三个原始 skill，组合出第四个，遇到失败后继续改进。

运行：

```
python3 code/main.py
```

轨迹展示库写入、检索、组合、一次失败执行以及 v2 改进——完整走过 Voyager 循环。

## 实际使用

- **Claude Agent SDK skills**（Anthropic）——2026 年的参考实现：每个 skill 有描述、代码和指令，在智能体会话中按需加载。
- **skillkit**（npm: skillkit）——为 32+ 个 AI 编程智能体提供跨智能体 skill 管理。
- **自定义 skill 库**——面向领域（数据智能体的 SQL skills、基础设施智能体的 Terraform skills）。Voyager 模式可以缩小使用。
- **OpenAI Agents SDK tools**——低端形式；每个工具都是轻量级 skill。

## 交付

outputs/skill-skill-library.md 会为任意目标运行时生成一个 Voyager 形状的 skill 库，接入注册、检索、版本化和改进。

## 练习

1. 为 compose() 增加依赖环检测。当 skill A 依赖 B，而 B 又依赖 A 时会发生什么？应该报错还是警告？
2. 实现每个 skill 的版本固定。当父 skill 组合子 skill crafting@1 时，crafting@2 的改进不能静默升级父 skill。
3. 用 sentence-transformers embedding（或标准库 BM25 实现）替换 token 重叠检索。在一个含 50 个 skill 的玩具库上测量 retrieval@5。
4. 增加一个“课程”智能体：给定当前库和领域描述，提出 5 个缺失 skill。每周调用一次。
5. 阅读 Anthropic 的 Claude Agent SDK skill 文档。将玩具库迁移到 SDK 的 skill schema。可发现性有什么变化？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Skill | “可复用能力” | 带名称的代码块和描述，可按相似度检索 |
| Skill library | “智能体的做法记忆” | 持久化的 skill 存储，可搜索并组合 |
| Curriculum | “任务提议器” | 根据当前能力缺口自底向上生成目标 |
| Composition | “Skill DAG” | skill 调用 skill；执行时按拓扑排序 |
| Iterative refinement | “自我纠正循环” | 环境反馈、错误和自我验证回流到下一个版本 |
| Action-space-as-code | “程序化行动” | 为跨时间行为输出函数，而非原始命令 |
| Dedup on write | “Skill 合并” | 近似重复的描述合并为一个规范 skill |

## 延伸阅读

- [Wang 等，Voyager（arXiv:2305.16291）](https://arxiv.org/abs/2305.16291)——原始 skill 库论文
- [Claude Agent SDK 概览](https://platform.claude.com/docs/en/agent-sdk/overview)——skill 的 2026 年产品化
- [Anthropic，使用 Claude Agent SDK 构建智能体](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)——实践中的 skills 与 subagents
- [Madaan 等，Self-Refine（arXiv:2303.17651）](https://arxiv.org/abs/2303.17651)——Voyager 底层的改进循环
