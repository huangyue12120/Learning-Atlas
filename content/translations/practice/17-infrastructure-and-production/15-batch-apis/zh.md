---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/15-batch-apis/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 38fa16c914a80a28947766893a261662e947d6931df0045c604c4666604daec8
status: reviewed
---

# Batch API：作为行业标准的 50% 折扣

> 每家主要供应商都提供异步 batch API：50% 折扣，约 24 小时周转。OpenAI、Anthropic、Google 以及大多数推理平台（Fireworks batch tier、Together batch）采用同一模式。将 batch 与提示词缓存叠加，夜间流水线成本将降至同步未缓存成本的约 10%。规则极其简单：只要不是交互式任务，就应放进 batch。内容生成流水线、文档分类、数据提取、报告生成、批量标注、目录打标——凡是可容忍 24 小时延迟的工作，未迁入 batch 前都在桌上留下钱。2026 年的生产模式是将每项新 LLM 工作负载分流为三条通道：交互式（带缓存的同步调用）、半交互式（带回退的异步队列）、batch（夜间运行，叠加缓存输入）。假装交互式、实则可容忍数分钟延迟的工作负载，浪费得最多。

**类型：** 学习
**语言：** Python（标准库，用于模拟 batch 与同步成本的玩具程序）
**前置要求：** 第 17 阶段 · 14（提示词与语义缓存）
**用时：** 约 45 分钟

## 学习目标

- 说出三个供应商 batch API（OpenAI、Anthropic、Google）及其共同的 50% 折扣 + 24 小时周转保证。
- 计算在夜间分类工作负载上叠加 batch + 缓存输入的成本，并与同步未缓存基线比较。
- 将工作负载分流至交互式 / 半交互式 / batch，并说明理由。
- 说出两个陷阱：部分交互性（用户期望比 24 小时更快）和输出模式漂移（每家供应商的 batch 文件格式不同）。

## 问题

你的团队交付一个夜间报告生成流水线：50,000 份文档，逐份总结、对总结聚类、生成一份高管简报。同步运行需 4 小时、每晚 $2,000。你听说了 batch API。

Batch 可为你带来 50% 折扣。你还会在所有 50k 调用共享的系统提示词上启用提示词缓存。叠加后，账单降至每晚 $180——约为基线的 9%。同一条流水线，仅改动三项配置。

Batch 是 LLM 成本工具箱中最便宜却没人使用的杠杆。原因主要在组织上：团队以为“实时”，而实际 SLA 是“早上之前”。本课的目的，就是不要把 90% 的账单留在桌上。

## 概念

### 三种 batch API

**OpenAI Batch API：** 上传包含请求列表的 JSONL 文件。承诺 24 小时周转（实践中通常约 2–8 小时）。输入和输出 token 均享 50% 折扣。端点为 `/v1/batches`。符合条件的缓存输入还能叠加缓存输入定价。

**Anthropic Message Batches：** 上传 JSONL。24 小时周转，50% 折扣。支持 `cache_control`——缓存写入是显式的，batch 内的读取自动发生。

**Google Vertex AI Batch Prediction：** 输入为 BigQuery 或 GCS。对 Gemini 提供类似的 50% 折扣，并与 Vertex 流水线集成。

### 语义：异步，典型延迟

Batch 的意思是“我承诺在 24 小时内返回”，而不是“这会花 24 小时”。典型 P50 为 2–6 小时。供应商会在 GPU 库存利用率低的离峰窗口调度 batch。

### 与缓存叠加

对一个具有相同 4K-token 系统提示词的 50k 文档摘要任务：

- 同步未缓存：50000 × ($input × 4000 + $output × 200)，使用全价。
- 同步缓存：系统提示词在第一次写入后缓存；其余 49999 次获得便宜 10 倍的输入。
- Batch 缓存：以上全部，再加上读写均享 50% 折扣。

这个叠加为：batch + cache = 同步未缓存账单的约 10%。任何夜间运行且共享系统提示词的工作负载都应这样做。

### 工作负载分流

**交互式**——用户等待响应，TTFT 重要。使用带提示词缓存的同步调用，不能 batch。

**半交互式**——用户提交任务，数分钟后回来查看。使用异步队列，batch 不可用时回退同步。比如中等量级的 RAG 索引。

**Batch**——用户期望“早上之前”或“下一小时”。内容流水线、大规模分类、离线分析。始终 batch，始终叠加缓存。

常见错误是因为流水线已上线生产，便将一切分类为交互式。生产不是延迟规格——SLA 才是。

### 部分交互性陷阱

某些功能看似交互式，但可容忍 5–10 分钟。例如，一份带“刷新”按钮的夜间客户健康报告，用户点击刷新，等待 10 分钟没问题；团队却用同步方式交付。50 个并发刷新任务的成本，是 batch 后经邮件交付的 10 倍。

要问的问题是：“24 小时对这个用户意味着什么？”若答案是“他们不会注意到”，就 batch。

### 输出模式陷阱

各供应商的 batch 文件格式不同：

- OpenAI：JSONL，每行一个请求。
- Anthropic：JSONL，每行一条消息；嵌入响应格式。
- Vertex：BigQuery 表或带 TFRecord 的 GCS 前缀。

要跨供应商编写“一个 batch 客户端”，意味着每个供应商都要有 adapter 代码。宣称多供应商 batch 的网关（Portkey、LiteLLM 的某些层级）仍只是薄封装原始格式。

### 应当记住的数字

- 各供应商 batch 折扣：输入 + 输出统一 50%。
- 周转 SLA：保证 24 小时，典型 P50 为 2–6 小时。
- 叠加 batch + 缓存输入：约为同步未缓存成本的 10%。
- 工作负载分流规则：若可接受 24 小时延迟，始终 batch。

```figure
batch-lane-triage
```

## 使用

`code/main.py` 对一个 50k 文档工作负载计算同步、同步+缓存、batch 和 batch+缓存的成本，报告以美元和百分比表示的节省。

## 交付

本课产出 `outputs/skill-batch-triager.md`。给定工作负载特征，它会将任务分流至交互式/半交互式/batch，并估算节省。

## 练习

1. 运行 `code/main.py`。对于具有 3K-token 系统提示词和 500-token 输出的 100k 文档流水线，计算完整栈（batch + cache）相对同步基线的节省。
2. 在你熟悉的真实产品中挑选三个功能，将每一个分流至交互式/半交互式/batch。
3. 用户抱怨报告花了 3 小时。这是错误的 batch 分流，还是合理的交互式需求？写出判定标准。
4. 你的 batch API 返回 SLA 为 24 小时，但 P99 为 20 小时。如何向用户沟通？边界情形中的下游系统行为是什么？
5. 计算盈亏平衡点：共享前缀长度达到多少时，batch + cache 比在自有预留 GPU 上夜间运行更便宜？

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| Batch API | “异步折扣” | 24 小时周转下 50% 折扣 |
| JSONL | “batch 格式” | 每行一个 JSON 请求；OpenAI/Anthropic 标准 |
| Message Batches | “Anthropic batch” | Anthropic 的 batch API 产品名称 |
| Batch prediction | “Vertex batch” | Vertex AI 的 batch API 产品 |
| 周转 SLA | “24 小时承诺” | 保证而非典型值；典型为 2–6 小时 |
| 工作负载分流 | “交互性决策” | 交互式 / 半交互式 / batch 路由决策 |
| 输出模式 | “响应格式” | 各供应商 JSONL 布局；不可移植 |
| 叠加折扣 | “batch + cache” | 两者均适用时约为未缓存同步账单的 10% |

## 延伸阅读

- [OpenAI Batch API](https://platform.openai.com/docs/guides/batch) — JSONL 格式与 `/v1/batches` 语义。
- [Anthropic Message Batches](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing) — batch 格式与 `cache_control` 交互。
- [Vertex AI Batch Prediction](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/batch-prediction-gemini) — Gemini batch 语义。
- [Finout — OpenAI vs Anthropic API Pricing 2026](https://www.finout.io/blog/openai-vs-anthropic-api-pricing-comparison)
- [Zen Van Riel — LLM API Cost Comparison 2026](https://zenvanriel.com/ai-engineer-blog/llm-api-cost-comparison-2026/)
