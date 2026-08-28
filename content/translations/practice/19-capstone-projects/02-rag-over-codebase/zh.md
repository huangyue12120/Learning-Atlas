---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/02-rag-over-codebase/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: efb52a5359a8e837d011362dafe4871f2880f5030a54764b37f8098d4222e5a6
status: reviewed
---

# 毕业项目 02——代码库上的 RAG（跨仓库语义搜索）

> 到 2026 年，所有认真的工程组织都在运行能理解含义而不只是匹配字符串的内部代码搜索。Sourcegraph Amp、Cursor 的代码库问答、Augment 的企业级图谱、Aider 的 repomap、Pinterest 的内部 MCP，形态都一样：摄取多个仓库，用 tree-sitter 解析，按函数和类切块，混合搜索、重排，并带引用回答。本毕业项目要求你构建一个能够处理 10 个仓库共 200 万行代码的系统，并在每次 git push 时经受住增量重索引。

**类型：** 毕业项目
**语言：** Python（摄取）、TypeScript（API + UI）
**前置课程：** 第 5 阶段（NLP 基础）、第 7 阶段（Transformer）、第 11 阶段（LLM 工程）、第 13 阶段（工具）、第 17 阶段（基础设施）
**涉及阶段：** P5 · P7 · P11 · P13 · P17
**用时：** 30 小时

## 问题

到 2026 年，每个前沿编码智能体都带有代码库检索层，因为单靠上下文窗口解决不了跨仓库问题。Claude 的 100 万词元上下文确实有帮助，但并不能消除排序检索的必要性。对原始切块做朴素余弦搜索，会在生成代码、monorepo 重复内容，以及很少被导入的符号长尾上污染结果。生产答案是：在 AST 感知的切块上执行混合（稠密 + BM25）搜索，配合重排器，并由符号引用图提供支持。

你要通过给一支真实的仓库群编索引来学习这一点，而不是只处理一个教程仓库；同时测量 MRR@10、引用忠实度和增量新鲜度。失败模式来自基础设施：一个包含 10 万个文件的 monorepo、一次重新触及一半文件的 push，以及一个必须跨越四个仓库才能正确回答的查询。

## 概念

AST 感知的摄取流水线用 tree-sitter 解析每个文件，提取函数和类节点，并在节点边界切块，而不是使用固定的词元窗口。每个切块有三种表示：稠密嵌入（Voyage-code-3 或 nomic-embed-code）、稀疏 BM25 词项，以及一段简短的自然语言摘要。摘要增加了第三种可检索模态——用户问“X 是如何授权的”，摘要可以提到“authz”，即使代码中只有 check_permission。

检索是混合的。一个查询同时触发稠密搜索和 BM25 搜索，合并两边的 top-k，再把并集交给交叉编码器重排器（Cohere rerank-3 或 bge-reranker-v2-gemma-2b）。重排后的列表进入长上下文合成器（带提示缓存的 Claude Sonnet 4.7，或自托管的 Llama 3.3 70B），并要求按文件及行范围引用每一条主张。没有引用的答案会被后置过滤器拒绝。

增量新鲜度是基础设施问题。Git push 触发 diff：哪些文件变了，哪些符号变了。只有受影响的切块重新嵌入；受影响的跨文件符号边（导入、方法调用）重新计算。索引因此保持一致，而不必每次提交都重新处理 200 万行代码。

## 架构

```text
git push --> webhook --> 摄取 worker（LlamaIndex Workflow）
                           |
                           v
             tree-sitter 解析 + AST 切块
                           |
            +--------------+----------------+
            v              v                v
          稠密         BM25 索引          摘要（LLM）
        （Voyage / bge） （Tantivy）       （Haiku 4.5）
            |              |                |
            +------> Qdrant / pgvector <----+
                            |
                            v
                      符号图（Neo4j / kuzu）
                            |
  query --> LangGraph 智能体（retrieve -> rerank -> synth）
                            |
                            v
                 Claude Sonnet 4.7，100 万词元上下文
                            |
                            v
                 答案 + file:line 引用
```

## 技术栈

- 解析：tree-sitter，配备 17 种语言语法（Python、TS、Rust、Go、Java、C++ 等）
- 稠密嵌入：Voyage-code-3（托管）或 nomic-embed-code-v1.5（自托管），bge-code-v1 作为回退
- 稀疏索引：Tantivy（Rust）和 BM25F，按符号名与正文设置字段权重
- 向量数据库：Qdrant 1.12（混合搜索），或供少于 5000 万向量的团队使用的 pgvector + pgvectorscale
- 切块摘要模型：Claude Haiku 4.5 或 Gemini 2.5 Flash，启用提示缓存
- 重排器：Cohere rerank-3 或自托管 bge-reranker-v2-gemma-2b
- 编排：摄取使用 LlamaIndex Workflows，查询智能体使用 LangGraph
- 合成器：Claude Sonnet 4.7（100 万词元上下文），启用提示缓存
- 符号图：Neo4j（托管）或 kuzu（嵌入式），用于导入和调用边
- 可观测性：每个检索步骤和合成步骤一个 Langfuse span

```figure
ce-hybrid-retrieval
```

## 动手构建

1. **摄取遍历器。** 在每个 push 钩子上遍历 git 历史，收集发生变化的文件。对每个文件使用 tree-sitter 解析，提取带完整源代码范围的函数和类节点。发出切块记录 `{repo, path, start_line, end_line, symbol, body}`。

2. **切块摘要器。** 使用系统前言上的提示缓存，将切块批量发送给 Haiku 4.5。提示语为：“用一句话总结此函数，写出它的公开契约和副作用。”将摘要与切块一起存储。

3. **嵌入池。** 两个并行队列：稠密队列（Voyage-code-3，批大小 128）和摘要队列（同一模型，但输入为摘要字符串）。将向量写入 Qdrant，载荷为 `{repo, path, start_line, end_line, symbol, kind}`。

4. **BM25 索引。** 使用字段加权的 Tantivy 索引：符号名称权重 4、符号正文权重 1、摘要权重 2。这样既能支持“查找名为 X 的函数”，也能支持“查找实现 X 的函数”。

5. **符号图。** 对每个切块记录边：导入（本文件使用仓库 Z 中的符号 Y）、调用（本函数调用类 C 上的方法 M）和继承。将它们存入 kuzu。查询时用它跨仓库边界扩展检索。

6. **查询智能体。** 使用三个节点构建 LangGraph。`retrieve` 并行触发稠密 + BM25，按（repo、path、symbol）去重。`rerank` 在前 50 个结果上运行交叉编码器，并保留前 10 个。`synth` 将重排后的切块放入上下文，调用 Claude Sonnet 4.7，缓存系统提示，并要求 file:line 引用。

7. **引用强制。** 解析模型输出；没有 `(repo/path:start-end)` 锚点的任何主张都会被标记，要求重新询问或直接丢弃。只向用户返回带引用的答案。

8. **增量重索引。** 每次 webhook 到来时，计算符号级 diff。只重新嵌入文本发生变化的切块。对于导入发生变化的切块，重新计算符号边。测量：对一个 200 万行代码的仓库群，包含 50 个文件的 push 能在 60 秒内完成重索引。

9. **评测。** 为 100 个跨仓库问题标注真实的文件:行答案。测量 MRR@10、nDCG@10、引用忠实度（带可验证锚点的主张比例）以及 p50/p99 延迟。

## 实际使用

```text
$ code-rag ask "how is S3 multipart abort wired into our retry budget?"
[retrieve]  12 chunks dense + 7 chunks bm25, 16 unique after dedup
[rerank]    top-5 kept (cohere rerank-3)
[synth]     claude-sonnet-4.7, cache hit rate 68%, 2.1s
answer:
  Multipart aborts are triggered by `AbortMultipartOnFail` in
  services/uploader/retry.go:122-148, which decrements the per-bucket
  retry budget defined in config/budgets.yaml:34-51 ...
  citations: [services/uploader/retry.go:122-148, config/budgets.yaml:34-51,
              libs/s3client/multipart.ts:44-61]
```

## 交付

交付物 skill 为 `outputs/skill-codebase-rag.md`。给定一组仓库，它会搭建摄取流水线、混合索引和查询智能体，并为任意跨仓库问题返回带引用的答案。评分标准如下：

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | 检索质量 | 在 100 个问题的留出集上测量 MRR@10 和 nDCG@10 |
| 20 | 引用忠实度 | 带可验证 file:line 锚点的答案主张比例 |
| 20 | 延迟与规模 | 在索引语料规模上以 10k QPS 测量 p95 查询延迟 |
| 20 | 增量索引正确性 | 50 文件提交从 git push 到可搜索的耗时 |
| 15 | UX 与答案格式 | 引用可点击性、代码片段预览、后续提问能力 |
| **100** | | |

## 练习

1. 将 Voyage-code-3 换成自托管的 nomic-embed-code。测量 MRR@10 的差值，并报告启用重排后差距是否缩小。

2. 向语料库注入 20% 的生成代码（LLM 生成的样板代码）并重新评测。观察检索污染。向载荷增加 `generated` 标记，并降低这类结果的权重。

3. 在你的语料规模上比较 Qdrant 混合搜索与 pgvector + pgvectorscale。报告批大小为 1 时的 p99。

4. 增加一种基于抽样的漂移检查：每周重跑 100 个问题的评测。当 MRR@10 下降超过 5% 时报警。

5. 扩展到跨语言符号解析：一个 Python 函数通过 gRPC 调用 Go 服务。使用符号图把两者连接起来。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| AST-aware chunking | “按函数切分” | 在 tree-sitter 节点边界切代码，而不是使用固定词元窗口 |
| Hybrid search | “稠密 + 稀疏” | 并行运行 BM25 和向量搜索，合并 top-k，再重排 |
| Cross-encoder rerank | “第二阶段排序” | 同时对（查询、候选）对打分的模型，比余弦相似度更准确 |
| Prompt caching | “缓存系统提示” | 2026 Claude / OpenAI 功能，对重复前缀词元提供最高 90% 的折扣 |
| Symbol graph | “代码图” | 跨文件和仓库表示导入、调用、继承的边 |
| Citation faithfulness | “有依据的答案率” | 用户可以点击锚点并阅读所引用代码段来验证的主张比例 |
| Incremental re-index | “push 到可搜索的时间” | 从 git push 到变化的符号可被查询的墙上时间 |

## 延伸阅读

- [Sourcegraph Amp](https://ampcode.com)——生产级跨仓库代码智能
- [Sourcegraph Cody RAG 架构](https://sourcegraph.com/blog/how-cody-understands-your-codebase)——本毕业项目的参考深度解析
- [Aider repo-map](https://aider.chat/docs/repomap.html)——tree-sitter 排序后的仓库视图
- [Augment Code 企业图谱](https://www.augmentcode.com)——商业符号图 RAG
- [Qdrant 混合搜索文档](https://qdrant.tech/documentation/concepts/hybrid-queries/)——参考实现
- [Voyage AI 代码嵌入](https://docs.voyageai.com/docs/embeddings)——Voyage-code-3 详情
- [Cohere rerank-3](https://docs.cohere.com/reference/rerank)——交叉编码器参考
- [Pinterest MCP 内部搜索](https://medium.com/pinterest-engineering)——内部平台参考
