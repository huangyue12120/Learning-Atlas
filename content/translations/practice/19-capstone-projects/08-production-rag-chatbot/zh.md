---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/08-production-rag-chatbot/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 84d50fb0bc9bcf443bb006f5841815557b8fe55d10ea57a133762968e22d2bd5
status: reviewed
---

# 毕业项目 08——受监管垂直领域的生产级 RAG 聊天机器人

> Harvey、Glean、Mendable 和 LlamaCloud 在 2026 年都运行着同一种生产形态：使用 docling 或 Unstructured 摄取文档，用 ColPali 处理视觉内容，执行混合搜索，使用 bge-reranker-v2-gemma 重排，用 Claude Sonnet 4.7 合成（提示缓存命中率为 60–80%），用 Llama Guard 4 和 NeMo Guardrails 防护，用 Langfuse 和 Phoenix 监控，并在 200 个问题的黄金集上用 RAGAS 评分。本毕业项目要求你在一个受监管领域（法律、临床或保险）构建系统，通过黄金集、红队和漂移仪表盘的检验。

**类型：** 毕业项目
**语言：** Python（流水线 + API）、TypeScript（聊天 UI）
**前置课程：** 第 5 阶段（NLP）、第 7 阶段（Transformer）、第 11 阶段（LLM 工程）、第 12 阶段（多模态）、第 17 阶段（基础设施）、第 18 阶段（安全）
**涉及阶段：** P5 · P7 · P11 · P12 · P17 · P18
**用时：** 30 小时

## 问题

受监管领域的 RAG（法律合同、临床试验方案、保险保单）是 2026 年生产环境中最常交付的形态，因为投资回报清晰、风险也很具体。Harvey（Allen & Overy）将它用于法律场景，Mendable 交付开发者文档版本，Glean 覆盖企业搜索。模式是：高保真摄取，带重排的混合检索，结合引用强制和提示缓存进行合成，多层安全防护，以及持续监控漂移。

难点不在模型，而在面向司法辖区的合规（HIPAA、GDPR、SOC2）、引用级可审计性、成本控制（命中率高时，提示缓存可带来 60–90% 折扣）、通过 RAGAS 忠实度检测幻觉，以及源文档更新但索引没有跟上的漂移检测。本毕业项目要求你将所有部分部署到 200 个问题的黄金集上，并配套红队套件。

## 概念

流水线有两面。**摄取**：docling 或 Unstructured 解析结构化文档；ColPali 处理视觉丰富的文档；切块获得摘要、标签和基于角色的访问标记。向量进入 pgvector + pgvectorscale（少于 5000 万向量）或 Qdrant Cloud；稀疏 BM25 并行运行。**对话**：LangGraph 处理记忆和多轮交互；每个查询运行混合检索，使用 bge-reranker-v2-gemma-2b 重排，使用 Claude Sonnet 4.7（带提示缓存）合成，让输出通过 Llama Guard 4 和 NeMo Guardrails，并发出带引用锚点的响应。

评测栈有四层。**黄金集**（200 个带引用的标注问答）用于正确性。**红队**（越狱、PII 提取尝试、领域外问题）用于安全性。**RAGAS** 自动逐回合评分忠实度、答案相关性和上下文精确率。**漂移仪表盘**（Arize Phoenix）每周观察检索质量和幻觉分数。

提示缓存是成本杠杆。Claude 4.5+ 和 GPT-5+ 支持缓存系统提示和检索上下文。命中率达到 60–80% 时，每次查询成本会下降 3–5 倍。流水线必须设计稳定的前缀（先放系统提示 + 重排后的上下文），才能取得高缓存命中率。

## 架构

```text
文档（合同、方案、保单）
      |
      v
docling / Unstructured 解析 + ColPali 处理视觉内容
      |
      v
切块 + 摘要 + 角色标签 + 司法辖区标签
      |
      v
pgvector + pgvectorscale  +  BM25（Tantivy）
      |
查询 + 角色 + 司法辖区
      |
      v
LangGraph 对话智能体
   +--- retrieve（混合）
   +--- 按角色 + 司法辖区过滤
   +--- rerank（bge-reranker-v2-gemma-2b 或 Voyage rerank-2）
   +--- synthesize（Claude Sonnet 4.7，提示已缓存）
   +--- guard（Llama Guard 4 + NeMo Guardrails + Presidio 输出 PII 清理）
   +--- cite + return
      |
      v
评测：
  RAGAS 忠实度 / answer_relevance / context_precision（在线）
  Langfuse 标注队列（抽样）
  Arize Phoenix 漂移（每周）
  红队套件（发布前）
```

## 技术栈

- 摄取：结构化文档使用 Unstructured.io 或 docling；视觉丰富的 PDF 使用 ColPali
- 向量数据库：少于 5000 万向量使用 pgvector + pgvectorscale；否则使用 Qdrant Cloud
- 稀疏检索：带字段权重的 Tantivy BM25
- 编排：LlamaIndex Workflows（摄取）+ LangGraph（对话）
- 重排器：自托管 bge-reranker-v2-gemma-2b 或托管 Voyage rerank-2
- LLM：带提示缓存的 Claude Sonnet 4.7；自托管 Llama 3.3 70B 作为回退
- 评测：在线 RAGAS 0.2，DeepEval 用于幻觉和越狱套件
- 可观测性：带标注队列的自托管 Langfuse；Arize Phoenix 用于漂移
- 防护栏：Llama Guard 4 输入/输出分类器、NeMo Guardrails v0.12 策略、Presidio PII 清理
- 合规：切块上的基于角色访问标签；用于 GDPR/HIPAA 的司法辖区标签

```figure
canary-rollout
```

## 动手构建

1. **摄取。** 使用 Unstructured 或 docling 解析语料（严肃的构建应包含 1000–10000 个文档）。对扫描/视觉密集页面，经过 ColPali 处理。生成带摘要、角色标签和司法辖区标签的切块。

2. **索引。** 将稠密嵌入（Voyage-3 或 Nomic-embed-v2）写入 pgvector + pgvectorscale。通过 Tantivy 建立 BM25 旁路索引。将角色和司法辖区过滤器作为载荷。

3. **混合检索。** 先按角色 + 司法辖区过滤；再并行执行稠密检索 + BM25；用 reciprocal rank fusion 合并；将前 20 个交给重排器，再将前 5 个交给合成器。

4. **使用提示缓存合成。** 将系统提示 + 静态策略放入缓存头；将重排后的上下文作为缓存扩展；用户问题作为不缓存的后缀。稳定运行时目标是 60–80% 的缓存命中率。

5. **防护栏。** 输入经过 Llama Guard 4；NeMo Guardrails rails 阻止领域外问题或策略禁止的主题；Presidio 清理输出中意外出现的 PII；后置过滤器强制引用。

6. **黄金集。** 由领域专家对 200 对问答以（答案、引用）标注。依据精确引用匹配、答案正确性和忠实度（RAGAS）为智能体评分。

7. **红队。** 准备 50 个对抗提示：越狱（PAIR、TAP）、PII 外泄尝试、领域外问题和跨司法辖区泄漏。使用通过/失败和严重程度评分。

8. **漂移仪表盘。** Arize Phoenix 每周追踪检索质量（nDCG、引用忠实度）。下降 5% 时报警。

9. **成本报告。** 使用 Langfuse 报告提示缓存命中率、每查询词元数，以及按阶段划分的每查询美元成本。

## 实际使用

```text
$ chat --role=analyst --jurisdiction=GDPR
> what is the data-retention obligation for EU user profiles under our contract?
[retrieve]  hybrid top-20 filtered to GDPR + analyst-role
[rerank]    top-5 kept
[synth]     claude-sonnet-4.7, cache hit 74%, 0.8s
answer:
  The contract (Section 12.4, Master Services Agreement dated 2024-03-11)
  obligates EU user profile deletion within 30 days of termination per GDPR
  Article 17. The DPA amendment (DPA-v2.1, Section 5) extends this to 14 days
  for "restricted" category data.
  citations: [MSA-2024-03-11 s12.4, DPA-v2.1 s5]
```

## 交付

交付物 outputs/skill-production-rag.md 描述了系统：一个带合规标签部署、通过评分标准、并由实时漂移监控观察的受监管领域聊天机器人。

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | RAGAS 忠实度 + 答案相关性 | 黄金集（200 对问答）上的在线分数 |
| 20 | 引用正确性 | 带可验证来源锚点的答案比例 |
| 20 | 防护栏覆盖率 | Llama Guard 4 通过率 + 越狱套件结果 |
| 20 | 成本 / 延迟工程 | 提示缓存命中率、p95 延迟、每查询美元成本 |
| 15 | 漂移监控仪表盘 | Phoenix 实时仪表盘及每周检索质量趋势 |
| **100** | | |

## 练习

1. 在另一个司法辖区下建立第二个语料切片（例如在 GDPR 旁边加入 HIPAA）。在 20 个跨司法辖区探针上演示角色 + 司法辖区过滤如何阻止跨域泄漏。

2. 测量一周生产流量中的提示缓存命中率。找出哪些查询破坏缓存前缀，并重新组织流水线。

3. 增加带 1 万词元摘要缓冲的多轮记忆。测量对话增长时忠实度是否下降。

4. 将 Claude Sonnet 4.7 换成自托管 Llama 3.3 70B。测量每查询美元成本和忠实度差值。

5. 增加“不确定”模式：如果重排后的最高分低于阈值，智能体说“我没有有把握的引用”，而不是直接回答。测量虚假自信下降了多少。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Prompt caching | “缓存系统提示 + 上下文” | Claude/OpenAI 功能：命中时缓存前缀词元可获得 60–90% 折扣 |
| RAGAS | “RAG 评测器” | 自动评分忠实度、答案相关性和上下文精确率 |
| Golden set | “标注评测集” | 由专家标注、带引用的 200+ 对问答；即 ground truth |
| Jurisdiction tag | “合规标签” | 附加在切块上的 GDPR/HIPAA/SOC2 范围，由检索过滤器强制执行 |
| Citation faithfulness | “有依据的答案率” | 由可检索源片段支持的主张比例 |
| Drift | “检索质量衰减” | nDCG 或引用分数的每周变化；报警阈值为 5% |
| Red team | “对抗性评测” | 发布前的越狱、PII 提取和领域外探针 |

## 延伸阅读

- [Harvey AI](https://www.harvey.ai)——法律生产技术栈参考
- [Glean 企业搜索](https://www.glean.com)——企业规模 RAG 参考
- [Mendable 文档](https://mendable.ai)——开发者文档 RAG 参考
- [LlamaCloud Parse + Index](https://docs.cloud.llamaindex.ai/llamaparse/getting_started)——托管摄取
- [Anthropic 提示缓存](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)——成本杠杆参考
- [RAGAS 0.2 文档](https://docs.ragas.io/)——规范 RAG 评测框架
- [Arize Phoenix](https://github.com/Arize-ai/phoenix)——漂移可观测性参考
- [Llama Guard 4](https://www.llama.com/docs/model-cards-and-prompt-formats/llama-guard-4/)——2026 安全分类器
- [NeMo Guardrails v0.12](https://docs.nvidia.com/nemo-guardrails/)——策略轨道框架
