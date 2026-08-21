---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 32ab66f48dc4dc4adac19a41e368276ba4e7c16ccef8947f2a9ed108d925b289
status: reviewed
---

# 长上下文评估：NIAH、RULER、LongBench、MRCR

> Gemini 3 Pro 宣传拥有 1,000 万词元上下文，但在 100 万词元时，8 针 MRCR 会降至 26.3%。标称容量不等于可用容量。长上下文评估可以测出你所发布模型的实际能力。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 5 第 13 课（问答）、Phase 5 第 23 课（分块策略）  
**预计时间：** 约 60 分钟

## 问题

你有一份 200 页的合同，模型声称支持 100 万词元上下文。你粘贴合同并询问：“What is the termination clause?”模型给出答案，却是根据封面回答，因为终止条款位于深入上下文 12 万词元的位置，已经超过模型真正关注的范围。

这构成了 2026 年的上下文容量差距：规格表写着 100 万或 1,000 万，现实却表明只有 60% 至 70% 可用，而且“可用”程度还取决于任务。

- **检索（大海捞一根针）：** 前沿模型在达到标称最大值前都接近完美。
- **多跳或聚合：** 多数模型超过约 128k 后急剧退化。
- **对分散事实进行推理：** 最先失效的任务。

长上下文评估测量这些维度。下面说明各项基准、它们真正测量的能力，以及怎样为自己的领域构建自定义针测试。

## 概念

![NIAH 基线、RULER 多任务与 LongBench 综合评估](../assets/long-context-eval.svg)

**Needle-in-a-Haystack（NIAH，大海捞针，2023）。** 在长上下文的受控深度放置一项事实，如“the magic word is pineapple”，再要求模型检索。遍历深度 × 长度，是最初的长上下文基准。前沿模型如今已在该基准上饱和，所以它是必要但不充分的基线。

**RULER（Nvidia，2024）。** 13 种任务分属 4 类：检索（单键、多键、多值）、多跳追踪（变量追踪）、聚合（常见词频）、问答。上下文长度可以配置为 4k 至 128k 以上。它能发现通过 NIAH 却无法完成多跳的模型。2024 年发布时，在 17 个声称支持 32k 以上上下文的模型中，只有一半能在 32k 保持质量。

**LongBench v2（2024）。** 503 道选择题，上下文长度为 8k 至 200 万词，分为六类任务：单文档问答、多文档问答、长上下文学习、长对话、代码仓库和长结构化数据。它是评估真实长上下文行为的生产基准。

**MRCR（Multi-Round Coreference Resolution，多轮共指消解）。** 大规模多轮共指任务，提供 8 针、24 针和 100 针版本，用于揭示注意力退化前模型能同时处理多少项事实。

**NoLiMa。** “非词汇针”。针与查询没有字面重叠，检索需要一步语义推理，比 NIAH 更难。

**HELMET。** 拼接许多文档，再针对其中任一文档提问，用于测试选择性注意力。

**BABILong。** 把 bAbI 推理链嵌进无关的信息堆，用于测试干扰信息中的推理，而不只是检索。

### 实际应该报告什么

- **标称上下文窗口。** 规格表数值。
- **有效检索长度。** NIAH 在某个阈值上的通过长度，如 90%。
- **有效推理长度。** 多跳或聚合任务在该阈值上的通过长度。
- **退化曲线。** 按任务类型分别绘制准确率随上下文长度的变化。

规格表应给出两个数字：检索有效长度与推理有效长度。推理有效长度通常只有标称窗口的 25% 至 50%。

```figure
gx-niah-decay
```

## 动手实现

### 步骤 1：为你的领域构建自定义 NIAH

完整实现见 `code/main.py`，骨架如下：

```python
def build_haystack(filler_text, needle, depth_ratio, total_tokens):
    if not (0.0 <= depth_ratio <= 1.0):
        raise ValueError(f"depth_ratio must be in [0, 1], got {depth_ratio}")
    if total_tokens <= 0:
        raise ValueError(f"total_tokens must be positive, got {total_tokens}")

    filler_tokens = tokenize(filler_text)
    needle_tokens = tokenize(needle)
    if not filler_tokens:
        raise ValueError("filler_text produced no tokens")

    # Repeat filler until long enough to fill the haystack body.
    body_len = max(total_tokens - len(needle_tokens), 0)
    while len(filler_tokens) < body_len:
        filler_tokens = filler_tokens + filler_tokens
    filler_tokens = filler_tokens[:body_len]

    insert_at = min(int(body_len * depth_ratio), body_len)
    haystack = filler_tokens[:insert_at] + needle_tokens + filler_tokens[insert_at:]
    return " ".join(haystack)


def score_niah(model, haystack, question, expected):
    answer = model.complete(f"Context: {haystack}\nQ: {question}\nA:", max_tokens=50)
    return 1 if expected.lower() in answer.lower() else 0
```

遍历 `depth_ratio` ∈ {0, 0.25, 0.5, 0.75, 1.0} × `total_tokens` ∈ {1k, 4k, 16k, 64k}，并绘制热力图，得到目标模型的 NIAH 评分卡。

### 步骤 2：多针变体

```python
def build_multi_needle(filler, needles, total_tokens):
    depths = [0.1, 0.4, 0.7]
    chunks = [filler[:int(total_tokens * 0.1)]]
    for depth, needle in zip(depths, needles):
        chunks.append(needle)
        next_chunk = filler[int(total_tokens * depth): int(total_tokens * (depth + 0.3))]
        chunks.append(next_chunk)
    return " ".join(chunks)
```

“What are the three magic words?”一类问题要求找回全部三根针。单针成功率无法预测多针成功率。

### 步骤 3：多跳变量追踪（RULER 风格）

```python
haystack = """X1 = 42. ... (filler) ... X2 = X1 + 10. ... (filler) ... X3 = X2 * 2."""
question = "What is X3?"
```

答案需要链接三次赋值。前沿模型在 128k 上的准确率往往会降至 50% 至 70%。

### 步骤 4：在你的技术栈上运行 LongBench v2

```python
from datasets import load_dataset
longbench = load_dataset("THUDM/LongBench-v2")

def eval_model_on_longbench(model, subset="single-doc-qa"):
    tasks = [x for x in longbench["test"] if x["task"] == subset]
    correct = 0
    for x in tasks:
        answer = model.complete(x["context"] + "\n\nQ: " + x["question"], max_tokens=20)
        if normalize(answer) == normalize(x["answer"]):
            correct += 1
    return correct / len(tasks)
```

需要报告各类别准确率。聚合分数会掩盖任务级的巨大差异。

## 陷阱

- **只做 NIAH 评估。** 在 100 万词元通过 NIAH 无法说明多跳能力。务必运行 RULER 或自定义多跳测试。
- **均匀深度采样不足。** 许多实现只测试 depth=0.5。应测试 depth=0、0.25、0.5、0.75、1.0，因为“中间丢失”效应确实存在。
- **针与填充文本存在词汇重叠。** 若针和填充文本共享关键词，检索会变得很容易。应使用 NoLiMa 风格、没有字面重叠的针。
- **忽略延迟。** 100 万词元提示的预填充需要 30 至 120 秒。测量准确率时也要测量首词元时间。
- **供应商自行报告的数值。** OpenAI、Google、Anthropic 都会发布自家分数。应在你的用例上独立复跑。

## 使用现成工具

2026 年的技术栈：

| 场景 | 基准 |
|------|------|
| 快速健全性检查 | 自定义 NIAH，3 个深度 × 3 个长度 |
| 生产模型选择 | 在目标长度运行 RULER（13 项任务） |
| 真实问答质量 | LongBench v2 单文档问答子集 |
| 多跳推理 | BABILong 或自定义变量追踪 |
| 会话或对话 | 在目标长度运行 MRCR 8 针 |
| 模型升级回归 | 固定的自有 NIAH + RULER 工具，每个新模型都运行 |

生产经验法则：在预期长度通过 NIAH 和至少一项推理任务前，不能相信上下文窗口的标称容量。

## 交付成果

保存为 `outputs/skill-long-context-eval.md`：

```markdown
---
name: long-context-eval
description: Design a long-context evaluation battery for a given model and use case.
version: 1.0.0
phase: 5
lesson: 28
tags: [nlp, long-context, evaluation]
---

Given a target model, target context length, and use case, output:

1. Tests. NIAH depth × length grid; RULER multi-hop; custom domain task.
2. Sampling. Depths 0, 0.25, 0.5, 0.75, 1.0 at each length.
3. Metrics. Retrieval pass rate; reasoning pass rate; time-to-first-token; cost-per-query.
4. Cutoff. Effective retrieval length (90% pass) and effective reasoning length (70% pass). Report both.
5. Regression. Fixed harness, rerun on every model upgrade, surface deltas.

Refuse to trust a context window from the model card alone. Refuse NIAH-only evaluation for any multi-hop workload. Refuse vendor self-reported long-context scores as independent evidence.
```

## 练习

1. **简单。** 构建包含 3 个深度（0.25、0.5、0.75）× 3 个长度（1k、4k、16k）的 NIAH，在任意模型上运行，并把通过率绘制成 3×3 热力图。
2. **中等。** 添加三针变体，在每个长度测量找回全部 3 根针的比例，并与相同长度的单针通过率比较。
3. **困难。** 构建变量追踪任务（X1 → X2 → X3，3 跳），嵌入 64k 填充文本。在三个前沿模型上测量准确率，报告各模型的有效推理长度。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| NIAH | 大海捞针 | 在填充文本中放入一项事实，再让模型检索。 |
| RULER | 加强版 NIAH | 横跨检索、多跳、聚合和问答的 13 种任务。 |
| 有效上下文（effective context） | 真实容量 | 准确率仍保持在阈值以上的长度。 |
| 中间丢失（lost in the middle） | 深度偏差 | 模型对长输入中部内容关注不足。 |
| 多针（multi-needle） | 同时处理多项事实 | 放入多项事实，测试同时调度注意力的能力，而非单纯检索。 |
| MRCR | 多轮共指 | 含 8、24 或 100 根针的共指任务，用于暴露注意力饱和。 |
| NoLiMa | 非词汇针 | 针和查询不共享字面词元，必须进行推理。 |

## 延伸阅读

- [Kamradt（2023），Needle in a Haystack analysis](https://github.com/gkamradt/LLMTest_NeedleInAHaystack)：原始 NIAH 仓库。
- [Hsieh 等（2024），RULER: What's the Real Context Size of Your Long-Context LMs?](https://arxiv.org/abs/2404.06654)：多任务基准。
- [Bai 等（2024），LongBench v2](https://arxiv.org/abs/2412.15204)：真实长上下文评估。
- [Modarressi 等（2024），NoLiMa: Non-lexical needles](https://arxiv.org/abs/2404.06666)：难度更高的针。
- [Kuratov 等（2024），BABILong](https://arxiv.org/abs/2406.10149)：干扰信息中的推理。
- [Liu 等（2024），Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172)：深度偏差论文。
