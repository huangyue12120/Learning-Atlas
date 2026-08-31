---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 61d6c8816e3e613a80375b344ac33445b0452b793c31f1d751ac6151e0bf3a14
status: reviewed
---

# LLM 评估：RAGAS、DeepEval、G-Eval

> 精确匹配和 F1 会漏掉语义等价，人类审核又无法扩展。生产环境使用 LLM 充当评判者，但需要充分校准，数值才可信。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 13 课（问答）、Phase 5 第 14 课（信息检索）  
**预计时间：** 约 75 分钟

## 问题

你的 RAG 系统回答：“June 29th, 2007.”
标准答案是：“June 29, 2007.”
精确匹配得分为 0，F1 约为 75%，人类却会给 100%。

现在把它乘以 10,000 个测试案例，再乘以检索器、分块、提示或模型每次变更的次数。你需要一套能理解含义、以低成本大规模运行、不隐瞒回归，并能暴露正确失效方式的评估器。

2026 年有三个框架负责解决这个问题。

- **RAGAS。** Retrieval-Augmented Generation ASsessment。提供四项 RAG 指标（忠实度、答案相关性、上下文精确率、上下文召回率），后端使用 NLI 与 LLM 评判者。研究依据充分，且较轻量。
- **DeepEval。** 面向 LLM 的 pytest。提供 G-Eval、任务完成度、幻觉和偏差指标，原生适配 CI/CD。
- **G-Eval。** 一种方法，也是 DeepEval 中的一项指标。让 LLM 依据思维链和自定义标准进行评判，输出 0 到 1 的分数。

三者都依赖 LLM 评判者。下面解释这种方法及让结果可信的校准层。

## 概念 <!-- learning-atlas: the-concept -->

![四个评估维度与 LLM 评判者架构](../assets/llm-evaluation.svg)

**LLM 评判者（LLM-as-judge）。** 用依据评分规则打分的 LLM 替换静态指标。给定 `(query, context, answer)`，提示评判 LLM：“Score 0-1 on faithfulness.”并返回分数。

它有效的原因是：LLM 可以用极低成本近似人类判断。GPT-4o-mini 每个评分案例约需 0.003 美元，因此 1,000 个样本的回归评估成本低于 5 美元。

它会静默失败的原因包括：

1. **评判者偏差。** 评判模型偏爱更长的答案、来自同一模型家族的答案，以及符合提示风格的答案。
2. **JSON 解析失败。** 无效 JSON → NaN 分数 → 从聚合值中静默排除。RAGAS 用户很熟悉这种痛苦。应使用 try/except 设门，并明确记录失效方式。
3. **模型版本漂移。** 升级评判模型会改变每一项指标。必须固定评判模型及其版本。

**RAG 四项指标。**

| 指标 | 问题 | 后端 |
|------|------|------|
| 忠实度 | 答案中的每项主张是否来自检索上下文？ | 基于 NLI 的蕴含判断 |
| 答案相关性 | 答案是否回答了问题？ | 根据答案生成假想问题，再与实际问题比较 |
| 上下文精确率 | 检索到的块中有多少真正相关？ | LLM 评判者 |
| 上下文召回率 | 检索是否返回了所需的全部内容？ | LLM 评判者对照标准答案 |

**G-Eval。** 定义自定义标准：“Did the answer cite the correct source?”框架会自动扩展成思维链评估步骤，再给出 0 到 1 的分数。它适合 RAGAS 没有覆盖的领域专用质量维度。

**校准。** 在与人工标签计算相关性之前，不能相信评判者的原始分数。运行 100 个人工标注样本，绘制评判分数与人工分数，计算 Spearman rho。若 rho < 0.7，就需要改进评分规则。

```figure
n5-judge-gauge
```

## 动手实现

### 步骤 1：使用 NLI 计算忠实度（RAGAS 风格）

```python
from typing import Callable
from transformers import pipeline

nli = pipeline("text-classification",
               model="MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli",
               top_k=None)

# `llm` is any callable: prompt str -> generated str.
# Example: llm = lambda p: client.messages.create(model="claude-haiku-4-5", ...).content[0].text
LLM = Callable[[str], str]


def atomic_claims(answer: str, llm: LLM) -> list[str]:
    prompt = f"""Break this answer into simple factual claims (one per line):
{answer}
"""
    return llm(prompt).splitlines()


def faithfulness(answer: str, context: str, llm: LLM) -> float:
    claims = atomic_claims(answer, llm)
    if not claims:
        return 0.0
    supported = 0
    for claim in claims:
        result = nli({"text": context, "text_pair": claim})[0]
        entail = next((s for s in result if s["label"] == "entailment"), None)
        if entail and entail["score"] > 0.5:
            supported += 1
    return supported / len(claims)
```

先把答案拆成原子主张，再用 NLI 逐条对照检索上下文。忠实度就是获得支持的主张比例。

### 步骤 2：答案相关性

```python
import numpy as np
from sentence_transformers import SentenceTransformer

# encoder: any model implementing .encode(texts, normalize_embeddings=True) -> ndarray
# e.g., encoder = SentenceTransformer("BAAI/bge-small-en-v1.5")

def answer_relevance(question: str, answer: str, encoder, llm: LLM, n: int = 3) -> float:
    prompt = f"Write {n} questions this answer could be the answer to:\n{answer}"
    generated = [line for line in llm(prompt).splitlines() if line.strip()][:n]
    if not generated:
        return 0.0
    q_emb = np.asarray(encoder.encode([question], normalize_embeddings=True)[0])
    g_embs = np.asarray(encoder.encode(generated, normalize_embeddings=True))
    sims = [float(q_emb @ g_emb) for g_emb in g_embs]
    return sum(sims) / len(sims)
```

若答案所暗示的问题与实际问题不同，相关性就会下降。

### 步骤 3：G-Eval 自定义指标

```python
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams, LLMTestCase

metric = GEval(
    name="Correctness",
    criteria="The answer should be factually accurate and match the expected output.",
    evaluation_steps=[
        "Read the expected output.",
        "Read the actual output.",
        "List factual claims in the actual output.",
        "For each claim, mark supported or unsupported by the expected output.",
        "Return score = fraction supported.",
    ],
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
)

test = LLMTestCase(input="When was the first iPhone released?",
                   actual_output="June 29th, 2007.",
                   expected_output="June 29, 2007.")
metric.measure(test)
print(metric.score, metric.reason)
```

评估步骤就是评分规则。明确步骤比隐含的“score 0-1”提示更稳定。

### 步骤 4：CI 门禁

```python
import deepeval
from deepeval.metrics import FaithfulnessMetric, ContextualRelevancyMetric


def test_rag_system():
    cases = load_regression_cases()
    faith = FaithfulnessMetric(threshold=0.85)
    rel = ContextualRelevancyMetric(threshold=0.7)
    for case in cases:
        faith.measure(case)
        assert faith.score >= 0.85, f"faithfulness regression on {case.id}"
        rel.measure(case)
        assert rel.score >= 0.7, f"relevancy regression on {case.id}"
```

把它保存成 pytest 文件，每个 PR 都运行，并阻止存在回归的合并。

### 步骤 5：从零实现玩具评估器

实现见 `code/main.py`。它只使用标准库，以答案主张和上下文的重叠近似忠实度，以答案词元和问题词元的重叠近似相关性。它不适合生产，但能展示指标形式。

## 陷阱

- **未校准。** 与人工标签相关性只有 0.3 的评判者只会产生噪声。发布前必须运行校准。
- **自我评估。** 使用同一个 LLM 生成并评判，会让分数虚高 10% 至 20%。评判者应来自不同模型家族。
- **成对评判的位置偏差。** 评判模型偏爱先展示的选项。务必随机化顺序，并把两个顺序各运行一次。
- **原始聚合值掩盖失效。** 平均分 0.85 往往掩盖 5% 的灾难性失败。务必检查最差分位数。
- **标准数据集腐化。** 没有版本的评估集随时间漂移，会破坏纵向比较。每次变更都要给数据集打标签。
- **LLM 成本。** 大规模运行时，评判调用会成为主要成本。应使用满足校准阈值的最便宜模型，如 GPT-4o-mini、Claude Haiku、Mistral-small。

## 使用现成工具

2026 年的技术栈：

| 用例 | 框架 |
|------|------|
| RAG 质量监控 | RAGAS（4 项指标） |
| CI/CD 回归门禁 | DeepEval + pytest |
| 自定义领域标准 | DeepEval 内的 G-Eval |
| 在线真实流量监控 | 使用无参考模式的 RAGAS |
| 人在回路中的抽查 | 带标注界面的 LangSmith 或 Phoenix |
| 红队与安全评估 | Promptfoo + DeepEval |

典型技术栈用 RAGAS 监控、DeepEval 做 CI、G-Eval 评估新维度。三者都应运行，因为它们之间有价值的分歧可以暴露问题。

## 交付成果

保存为 `outputs/skill-eval-architect.md`：

```markdown
---
name: eval-architect
description: Design an LLM evaluation plan with calibrated judge and CI gates.
version: 1.0.0
phase: 5
lesson: 27
tags: [nlp, evaluation, rag]
---

Given a use case (RAG / agent / generative task), output:

1. Metrics. Faithfulness / relevance / context-precision / context-recall + any custom G-Eval metrics with criteria.
2. Judge model. Named model + version, rationale for cost vs accuracy.
3. Calibration. Hand-labeled set size, target Spearman rho vs human > 0.7.
4. Dataset versioning. Tag strategy, change log, stratification.
5. CI gate. Thresholds per metric, regression-window logic, bottom-quantile alert.

Refuse to rely on a judge untested against ≥50 human-labeled examples. Refuse self-evaluation (same model generates + judges). Refuse aggregate-only reporting without bottom-10% surfacing. Flag any pipeline where judge upgrade lands without parallel baseline eval.
```

## 练习

1. **简单。** 在 10 个含已知幻觉的 RAG 示例上使用 RAGAS，确认忠实度指标能发现每个幻觉。
2. **中等。** 人工为 50 个问答答案标注 0 至 1 的正确性分数，再用 G-Eval 打分，测量评判者与人工分数之间的 Spearman rho。
3. **困难。** 使用 DeepEval 构建 pytest CI 门禁，故意让检索器退化，并确认门禁失败。通过检查最低 10% 样本的阈值加入最差分位数警报。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| LLM 评判者（LLM-as-judge） | 用 LLM 打分 | 给评判模型一套评分规则，让它把输出评为 0 至 1 分。 |
| RAGAS | RAG 指标库 | 开源评估框架，提供 4 项无参考 RAG 指标。 |
| 忠实度（faithfulness） | 答案有依据吗？ | 检索上下文所蕴含的答案主张比例。 |
| 上下文精确率（context precision） | 检索块相关吗？ | 前 K 个块中真正发挥作用的比例。 |
| 上下文召回率（context recall） | 检索完整吗？ | 检索块支持的标准答案主张比例。 |
| G-Eval | 自定义 LLM 评判者 | 评分规则 + 思维链评估步骤 + 0 至 1 分。 |
| 校准（calibration） | 先验证再信任 | 评判分数与人工分数的 Spearman 相关系数。 |

## 延伸阅读

- [Es 等（2023），RAGAS: Automated Evaluation of Retrieval Augmented Generation](https://arxiv.org/abs/2309.15217)：RAGAS 论文。
- [Liu 等（2023），G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment](https://arxiv.org/abs/2303.16634)：G-Eval 论文。
- [DeepEval 文档](https://deepeval.com/docs/metrics-introduction)：开放生产技术栈。
- [Zheng 等（2023），Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685)：偏差、校准与局限。
- [MLflow GenAI Scorer](https://mlflow.org/blog/third-party-scorers)：集成 RAGAS、DeepEval 与 Phoenix 的统一框架。
