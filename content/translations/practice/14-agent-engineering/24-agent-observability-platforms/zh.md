---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/24-agent-observability-platforms/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: aa3f70277a5ad92c61142f4be10b0c68df38981115001dcc870d7987d827751b
status: reviewed
---

# 智能体可观测性：Langfuse、Phoenix、Opik

> 三个开源智能体可观测性平台在 2026 年占据主导。Langfuse（MIT）——每月 600 万+ 安装，追踪 + 提示词管理 + 评估 + session 重放；Arize Phoenix（Elastic 2.0）——深入的智能体专用评估、RAG 相关性、OpenInference 自动插桩；Comet Opik（Apache 2.0）——自动提示词优化、防护栏、LLM 评判的幻觉检测。

**类型：** 学习
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 23 节（OTel GenAI）
**用时：** 约 45 分钟

## 学习目标

- 说出三个主要开源智能体可观测性平台及其许可证。
- 区分各平台最擅长的内容：Langfuse（提示词管理 + sessions）、Phoenix（RAG + 自动插桩）、Opik（优化 + 防护栏）。
- 解释为什么到 2026 年有 89% 的组织报告已建立智能体可观测性。
- 用标准库实现带 LLM-judge 评估的 trace 到 dashboard 管线。

## 问题所在

OTel GenAI（第 23 节）给你 schema，但你仍需要一个平台来接收 span、运行评估、保存提示词版本并暴露回归。三个竞争者分别强调生命周期的不同部分。

## 核心概念

### Langfuse（MIT）

- 每月 600 万+ SDK 安装，19k+ GitHub stars。
- 功能：追踪、带版本化与 playground 的提示词管理、评估（LLM-as-judge、用户反馈、自定义）、session 重放。
- 2025 年 6 月：以前的商业模块（LLM-as-a-judge、标注队列、提示词实验、Playground）以 MIT 许可证开源。
- 最擅长：与提示词管理闭环紧密结合的端到端可观测性。

### Arize Phoenix（Elastic License 2.0）

- 更深入的智能体专用评估：轨迹聚类、异常检测、RAG 检索相关性。
- 原生 OpenInference 自动插桩。
- 与托管 Arize AX 搭配用于生产。
- 没有提示词版本管理；它被定位为更大平台旁边的漂移/行为回归工具。
- 最擅长：RAG 相关性、行为漂移、异常检测。

### Comet Opik（Apache 2.0）

- 通过 A/B 实验自动优化提示词。
- 防护栏（PII 脱敏、主题约束）。
- LLM-judge 幻觉检测。
- Comet 自己测得的基准：Opik 在 23.44 秒内完成日志 + 评估，Langfuse 需 327.15 秒（约 14 倍差距）——厂商基准只能作为方向性参考。
- 最擅长：优化循环、自动实验、防护栏执行。

### 行业数据

根据 Maxim（2026 年现场分析），89% 的组织已经建立智能体可观测性；质量问题是生产环境的首要障碍（32% 的受访者提到）。

### 如何选择

| 需求 | 选择 |
|------|------|
| 带提示词管理的一体化方案 | Langfuse |
| 深度 RAG 评估 + 漂移 | Phoenix |
| 自动优化 + 防护栏 | Opik |
| 开源许可证、不要 ELv2 | Langfuse（MIT）或 Opik（Apache 2.0） |
| Datadog / New Relic 集成 | 任意一个——都能导出 OTel |

### 这个模式会在哪里出错

- **没有评估策略。** 没有评估的追踪只是昂贵的日志记录。
- **没有依据地自行实现 LLM-judge。** CRITIC 模式（第 05 节）同样适用——评判者需要外部工具来验证事实。
- **提示词版本没有关联 trace。** 生产回归时，无法二分定位到造成问题的提示词。

```figure
wb-trace-ingest
```

## 动手构建

code/main.py 实现标准库 trace collector + LLM-judge evaluator：

- 接收 GenAI 形状的 span。
- 按 session 分组，为失败运行打标签（防护栏触发、低置信度评估）。
- 一个根据 rubric 为智能体响应打分的脚本化 LLM-judge。
- 类似 dashboard 的摘要：失败率、主要失败原因、评估分数分布。

运行：

```
python3 code/main.py
```

输出每个 session 的评估分数和失败分类，对应 Langfuse/Phoenix/Opik 会展示的内容。

## 实际使用

- **Langfuse** 自托管或云端；通过 OTel 或其 SDK 接入。
- **Arize Phoenix** 自托管；用 OpenInference 自动插桩。
- **Comet Opik** 自托管或云端；提供自动优化循环。
- **Datadog LLM Observability** 适合已经运行 Datadog 的混合运维 + ML 团队。

## 交付

outputs/skill-obs-platform-wiring.md 会选择一个平台，并将 trace + eval + 提示词版本接入现有智能体。

## 练习

1. 将一周的 OTel trace 导出到 Langfuse cloud（免费层）。哪些 session 失败了？为什么？
2. 为你的领域写一个 LLM-judge rubric（事实正确性、语气、范围遵循）。在 50 条 trace 上测试。
3. 比较 Langfuse 的提示词版本与 Phoenix 的轨迹聚类。哪个更快告诉你出了什么问题？
4. 阅读 Opik 防护栏文档。为一次智能体运行接入 PII 脱敏防护栏。
5. 在自己的语料上对三者做基准。忽略厂商发布的数字，测自己的结果。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Tracing | “Span 收集器” | 接收 OTel / SDK span；按 session 建索引 |
| Prompt management | “提示词 CMS” | 与 trace 绑定的版本化提示词 |
| LLM-as-judge | “自动评估” | 另一个 LLM 根据 rubric 为智能体输出打分 |
| Session replay | “Trace 回放” | 逐步查看过去的运行以调试 |
| RAG relevancy | “检索质量” | 检索到的上下文是否匹配查询 |
| Trace clustering | “行为分组” | 将相似运行聚类，用于漂移检测 |
| Guardrail enforcement | “日志时策略” | 对记录内容做 PII/毒性/范围检查 |

## 延伸阅读

- [Langfuse 文档](https://langfuse.com/)——追踪、评估、提示词管理
- [Arize Phoenix 文档](https://docs.arize.com/phoenix)——自动插桩、漂移
- [Comet Opik](https://www.comet.com/site/products/opik/)——优化 + 防护栏
- [OpenTelemetry GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/)——三者共同消费的 schema
