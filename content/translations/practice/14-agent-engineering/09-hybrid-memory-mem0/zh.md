---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/09-hybrid-memory-mem0/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: f7e13f26fd141cdf48067ab7f09c16bc63d35f6eb65063d4378dc29c7d3a2ebb
status: reviewed
---

# 混合记忆：向量 + 图 + KV

> 混合记忆并行运行三个存储：向量负责语义相似度，KV 负责快速事实查找，图负责实体–关系推理；检索时再用评分层融合三者。这是生产外部记忆中广泛使用的模式，Mem0（Chhikara 等，2025）是其中一个参考实现。

**类型：** 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 07 节（MemGPT）、第 14 阶段 · 第 08 节（Letta Blocks）
**用时：** 约 75 分钟

## 学习目标

- 解释为什么单一存储（只有向量、只有图或只有 KV）不足以支撑智能体记忆。
- 说出 Mem0 的三个并行存储，以及每一个优化的目标。
- 描述 Mem0 的融合评分——相关性、重要性、新近性——并解释为什么它是加权和，而不是层级结构。
- 用标准库实现一个玩具三存储记忆：add() 将内容写入三处，search() 融合结果。

## 问题所在

对于三类查询中的任意一类，单一存储都会出错：

- **语义相似度**——“上周我们讨论过智能体漂移的什么内容？”向量存储胜出；KV 和图会漏掉。
- **事实查找**——“用户的电话号码是多少？”KV 胜出；向量浪费资源，图则过度设计。
- **关系推理**——“哪些客户共享同一个计费实体？”图胜出；向量和 KV 无法回答。

生产智能体会在一次会话中发出这三类查询。单一存储对其中两类总会不合适。Mem0 的贡献是将三者接在统一的 add/search 界面后，用一个评分函数融合它们。

## 核心概念

### 三个并行存储

Mem0（arXiv:2504.19413，2025 年 4 月）在 add(text, user_id, metadata) 上的流程是：

1. 从文本中抽取候选事实（由 LLM 驱动的步骤）。
2. 将每个事实写入向量存储（embedding），用于语义搜索。
3. 将每个事实按 (user_id, fact_type, entity) 写入 KV 存储，用于 O(1) 查找。
4. 将每个事实作为类型化边写入图存储（Mem0g），用于关系查询。

在 search(query, user_id) 上：

1. 向量存储按 embedding 余弦相似度返回 top-k。
2. KV 存储按从查询中推导的 (user_id, type, entity) 键返回直接命中。
3. 图存储返回从查询实体可到达的子图。
4. 评分层融合三者。

### 融合评分

```
score = w_relevance * relevance(q, record)
      + w_importance * importance(record)
      + w_recency * recency(record)
```

- **相关性**——向量余弦相似度、KV 精确匹配、图路径权重。
- **重要性**——在写入时标记或学习得到（有些事实更重要：姓名、ID、政策）。
- **新近性**——根据距离上次写入或读取的时间进行指数衰减。

权重按产品调节。聊天智能体提高 w_recency；合规智能体提高 w_importance；检索智能体提高 w_relevance。

### Mem0g 与时间推理

Mem0g 增加了冲突检测器。当新事实与已有边矛盾时，已有边会被标记为无效，但不会删除。时间查询（“用户 3 月份住在哪里？”）会遍历在该时间点有效的子图。

这正是 Letta 的失效模式所推广的合规级行为。

### 基准数字

Mem0 论文报告了以下 2025 年结果：

- **LoCoMo**（长篇对话记忆）：91.6
- **LongMemEval**（长时程情景记忆）：93.4
- **BEAM 1M**（百万 token 记忆基准）：64.1

对比基线（完整上下文 128k LLM、扁平向量存储、扁平 KV）都低 10 个百分点以上。基准本身不能证明某个选择正确——运行形态才是关键——但这些数字说明融合设计不是舍入误差。

### 范围分类

Mem0 按范围拆分记忆：

- **用户记忆**——跨会话持久化，按 user_id 键控。
- **会话记忆**——在一个 thread 内持久化。
- **智能体记忆**——每个智能体实例的状态。

每次写入都选择一个范围。检索可以跨范围查询，并使用各范围的权重。未经思考地混合范围，正是“助手把 Alice 的信息告诉了 Bob”这类事故的来源。

### 这个模式会在哪里出错

- **Embedding 漂移。** 前几百次查询看起来正确的向量结果，会随着语料增长而退化。定期对使用次数最高的前 N 条记录重新 embedding。
- **KV schema 蔓延。** (user_id, type, entity) 看似简单，直到每个团队都添加自己的 type。每季度审计一次类型集合。
- **图爆炸。** 一个嘈杂的抽取器每条消息增加 50 条边。限制每次 add 的图写入数量，丢弃低置信度的边。

```figure
ae-memory-fusion
```

## 动手构建

code/main.py 只用标准库实现三存储模式：

- VectorStore——用朴素 token 重叠相似度代替 embedding。
- KVStore——以 (user_id, fact_type, entity) 为键的字典。
- GraphStore——类型化边（subject、relation、object、valid）。
- Mem0——带 add()、search()、融合评分和按范围检索的顶层 facade。
- 一个多用户、多会话对话的完整轨迹示例。

运行：

```
python3 code/main.py
```

输出会展示三条独立的召回路径以及融合后的 top-k。修改 main() 顶部的评分权重，观察排名变化。

## 实际使用

- **Mem0（Apache 2.0）**——可用于生产。可以使用 Postgres + Qdrant + Neo4j 自托管，或使用托管云。
- **Letta**——core/recall/archival 三层；自行选择向量和图后端。
- **Zep**——带时间知识图谱和事实抽取的商业替代方案。
- **自定义构建**——当需要精确控制抽取器（合规）或融合权重（新近性占主导的语音智能体）时使用。

## 交付

outputs/skill-hybrid-memory.md 会生成一个三存储记忆脚手架，接入融合评分器、范围分类和时间失效。

## 练习

1. 将玩具向量相似度替换为真实 embedding 模型（sentence-transformers、Ollama、OpenAI embeddings）。在合成的长对话上测量 recall@10。写入 1000 条后排名是否漂移？
2. 增加时间查询：search(query, as_of=timestamp)。只返回在该时间点或之前有效的记录。哪个存储需要改动最多？
3. 实现冲突检测器：如果新事实与图中的边冲突，使旧边失效并同时记录两者。在“用户住在柏林”→“用户住在里斯本”上测试。
4. 让融合评分器增加 user_feedback 维度（对检索记录点踩或点赞）。如何避免被利用（智能体只返回它已经喜欢的记录）？
5. 阅读 Mem0 文档（docs.mem0.ai）。将玩具实现迁移为 mem0 客户端调用。在相同的 20 个测试查询上比较检索质量。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Hybrid memory | “向量加图加 KV” | 三个存储并行写入，检索时融合 |
| Fact extraction | “记忆摄入” | LLM 将文本拆成（实体、关系、事实）元组的步骤 |
| Fusion scoring | “相关性排序” | 相关性、重要性、新近性的加权和 |
| Scope | “记忆命名空间” | user / session / agent——决定谁能看到什么 |
| Mem0g | “记忆图” | 带时间有效性的类型化边，用于关系查询 |
| Temporal invalidation | “软删除” | 将矛盾边标记为无效，但永不删除 |
| Embedding drift | “检索腐化” | 语料增长后向量质量退化；定期重做 embedding |

## 延伸阅读

- [Chhikara 等，Mem0（arXiv:2504.19413）](https://arxiv.org/abs/2504.19413)——原始论文
- [Mem0 文档](https://docs.mem0.ai/platform/overview)——生产 API、SDK 和托管云
- [Packer 等，MemGPT（arXiv:2310.08560）](https://arxiv.org/abs/2310.08560)——虚拟上下文前身
- [Letta，Memory Blocks 博客](https://www.letta.com/blog/memory-blocks)——三层同类设计
