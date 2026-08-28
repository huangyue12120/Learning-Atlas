---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/11-llm-observability-dashboard/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 714070c966540405863a30473ef1f3e6b93748ed6a374e221979f1f37de187b7
status: reviewed
---

# 毕业项目 11——LLM 可观测性与评测仪表盘

> Langfuse 转向开放核心，Arize Phoenix 发布了 2026 GenAI 语义约定映射，Helicone 和 Braintrust 都进一步强化了按用户归因成本。Traceloop 的 OpenLLMetry 成为事实上的 SDK 埋点方案。生产形态是 ClickHouse 存 trace、Postgres 存元数据、Next.js 做 UI，再由一小组评测任务（DeepEval、RAGAS、LLM-judge）在抽样 trace 上运行。本毕业项目要求你自托管一个仪表盘，至少接入四个 SDK 家族，并演示在五分钟内捕获一次注入的回归。

**类型：** 毕业项目
**语言：** TypeScript（UI）、Python / TypeScript（摄取 + 评测）、SQL（ClickHouse）
**前置课程：** 第 11 阶段（LLM 工程）、第 13 阶段（工具）、第 17 阶段（基础设施）、第 18 阶段（安全）
**涉及阶段：** P11 · P13 · P17 · P18
**用时：** 25 小时

## 问题

到 2026 年，所有承载生产流量的 AI 团队都会在模型旁边维护一套可观测性平面：成本归因、幻觉检测、漂移监控、越狱信号、SLO 仪表盘和 PII 泄漏告警。Langfuse、Phoenix、OpenLLMetry 这些开源参考方案最终都采用 OpenTelemetry GenAI 语义约定作为摄取 schema。现在可以用一个 SDK 为 OpenAI、Anthropic、Google、LangChain、LlamaIndex 和 vLLM 埋点，并发送兼容的 span。

你要构建一个自托管仪表盘，从至少四个 SDK 家族摄取数据，在抽样 trace 上运行一组小型评测任务，检测漂移并发出告警。测量标准是：给定一次刻意注入的回归（某个提示开始生成 PII），仪表盘能在五分钟内捕获它并触发告警。

## 概念

摄取使用 OTLP HTTP。SDK 产生 GenAI 语义约定 span：gen_ai.system、gen_ai.request.model、gen_ai.usage.input_tokens、gen_ai.response.id、llm.prompts、llm.completions。span 进入 ClickHouse 做列式分析，元数据（用户、会话、应用）进入 Postgres。

评测以抽样 trace 上的批处理任务运行。DeepEval 为忠实度、毒性和答案相关性打分。当 trace 携带检索上下文时，RAGAS 计算检索指标。自定义 LLM-judge 执行领域专用检查（PII 泄漏、违反策略的响应）。评测运行会将结果写回同一个 ClickHouse，以和父 trace 关联的评测 span 形式存储。

漂移检测观察随时间变化的嵌入空间分布（对提示嵌入计算 PSI 或 KL 散度），以及评测分数趋势。告警送入 Prometheus Alertmanager，再转发到 Slack / PagerDuty。UI 使用带 Recharts 的 Next.js 15。

## 架构

```text
生产应用：
  OpenAI SDK  +  Anthropic SDK  +  Google GenAI SDK
  LangChain + LlamaIndex + vLLM
       |
       v
  带 GenAI 语义约定的 OpenTelemetry SDK
       |
       v  OTLP HTTP
  收集器（摄取、抽样、扇出）
       |
       +-------------+-----------+
       v             v           v
   ClickHouse    Postgres    S3 归档
   （span）      （元数据）  （原始事件）
       |
       +---> 评测任务（DeepEval、RAGAS、LLM-judge）
       |     抽样或全部 trace
       |     将评测 span 写回
       |
       +---> 漂移检测器（对提示嵌入计算 PSI / KL）
       |
       +---> Prometheus 指标 -> Alertmanager -> Slack / PagerDuty
       |
       v
   Next.js 15 仪表盘（Recharts）
```

## 技术栈

- 摄取：OpenTelemetry SDK + GenAI 语义约定；OTLP HTTP 传输
- 收集器：带尾部抽样处理器的 OpenTelemetry Collector（用于成本控制）
- 存储：ClickHouse 存 span，Postgres 存元数据，S3 存原始事件归档
- 评测：DeepEval、RAGAS 0.2、Arize Phoenix evaluator pack、自定义 LLM-judge
- 漂移：对池化提示嵌入（sentence-transformers）计算 PSI / KL，每周运行
- 告警：Prometheus Alertmanager -> Slack / PagerDuty
- UI：Next.js 15 App Router + Recharts + server actions
- 开箱即用支持的 SDK：OpenAI、Anthropic、Google GenAI、LangChain、LlamaIndex、vLLM

```figure
ce-otel-drift
```

## 动手构建

1. **收集器配置。** 配置 OpenTelemetry Collector，使用 OTLP HTTP receiver、尾部抽样器（保留 100% 的错误 trace 和 10% 的成功 trace），以及发送到 ClickHouse 和 S3 的 exporter。

2. **ClickHouse schema。** 建立 spans 表，字段对应 GenAI 语义约定：gen_ai_system、gen_ai_request_model、input_tokens、output_tokens、latency_ms、prompt_hash、trace_id、parent_span_id，另加用于长载荷的 JSON 容器。按 user_id 和 app_id 添加二级索引。

3. **SDK 覆盖测试。** 使用每个 SDK（OpenAI、Anthropic、Google、LangChain、LlamaIndex、vLLM）和 OpenLLMetry 自动埋点编写小型客户端应用。验证每个 SDK 都产生落入 ClickHouse 的规范 GenAI span。

4. **评测任务。** 定时任务读取最近 15 分钟的抽样 trace，运行 DeepEval 忠实度、毒性和答案相关性评测。输出是与父 trace 关联的评测 span。

5. **自定义 LLM-judge。** 构建 PII 泄漏 judge：给定响应，调用守护模型，为 PII 泄漏可能性打分。高分响应进入分诊队列。

6. **漂移检测。** 每周任务计算本周池化提示嵌入与前 4 周基线之间的 PSI。如果 PSI 高于阈值，就发出告警。

7. **仪表盘。** 用 Next.js 15 建立页面：概览（span/sec、每用户成本、p95 延迟）、trace（搜索 + 瀑布图）、评测（忠实度趋势、毒性）、漂移（PSI 随时间变化）和告警。

8. **告警链路。** Prometheus exporter 读取评测分数聚合值和延迟百分位数；Alertmanager 将警告路由到 Slack，将严重违约路由到 PagerDuty。

9. **回归探针。** 注入一个 bug：被评测的聊天机器人有 1% 的概率泄漏伪造 SSN。测量 MTTR，即从 bug 部署到 Slack 告警的时间。

## 实际使用

```text
$ curl -X POST https://my-otel-collector/v1/traces -d @trace.json
[collector]  accepted 1 trace, 3 spans
[clickhouse] inserted 3 spans (app=chat, user=u_42)
[eval]       DeepEval faithfulness 0.82, toxicity 0.03
[drift]      weekly PSI 0.08 (below 0.2 threshold)
[ui]         live at https://obs.example.com
```

## 交付

交付物是 outputs/skill-llm-observability.md。给定一个 LLM 应用，仪表盘会摄取其 trace，运行评测，在漂移时告警，并在 Next.js 中展示按用户划分的成本明细。

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | Trace schema 覆盖 | 产生规范 GenAI span 的 SDK 家族数量（目标为 6+） |
| 20 | 评测正确性 | DeepEval / RAGAS 分数与人工标注集比较 |
| 20 | 仪表盘 UX | 注入回归后的 MTTR（目标低于 5 分钟） |
| 20 | 成本 / 规模 | 无积压时持续摄取 1k spans/sec |
| 15 | 告警 + 漂移检测 | Prometheus/Alertmanager 链路端到端运行 |
| **100** | | |

## 练习

1. 为 Haystack 框架增加自定义埋点。在 ClickHouse 中验证规范 span 落库，并检查 gen_ai.* 属性是否忠实。

2. 在同一批 trace 上用 Phoenix evaluator 替代 DeepEval。测量两个评测引擎之间的分数漂移。

3. 锐化漂移检测器：不再全局计算，而是按 app-id 计算 PSI。展示每个应用的漂移轨迹。

4. 增加“用户影响”页面：使用 sparkline 展示每用户成本和每用户失败率。

5. 构建尾部抽样策略：保留毒性 > 0.5 的 100% trace，再对其余 trace 做 10% 的分层抽样。测量引入的抽样偏差。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| GenAI semconv | “OTel LLM 属性” | 2025 OpenTelemetry 中关于 LLM span 属性（系统、模型、词元）的规范 |
| Tail sampling | “trace 结束后抽样” | trace 完成后由收集器决定保留还是丢弃（可以查看错误） |
| PSI | “总体稳定性指数” | 比较两个分布的漂移指标；> 0.2 通常表示有意义的漂移 |
| LLM-judge | “把模型当评测器” | 一个 LLM 依据标准为另一个 LLM 的输出打分（忠实度、毒性、PII） |
| Tail-sampling policy | “保留规则” | 决定哪些 trace 持久化、哪些丢弃的规则；错误 trace + 抽样率 |
| Eval span | “关联的评测 trace” | 携带评测分数、并与原始 LLM 调用 span 关联的子 span |
| Cost per user | “单位经济学” | 某时间窗口内归因到 user_id 的美元成本；关键产品指标 |

## 延伸阅读

- [Langfuse](https://github.com/langfuse/langfuse)——开放核心可观测性平台参考
- [Arize Phoenix](https://github.com/Arize-ai/phoenix)——具有强漂移支持的另一种方案
- [OpenLLMetry（Traceloop）](https://github.com/traceloop/openllmetry)——自动埋点 SDK 家族
- [OpenTelemetry GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/)——摄取 schema
- [Helicone](https://www.helicone.ai)——另一种托管可观测性方案
- [Braintrust](https://www.braintrust.dev)——以评测为先的平台
- [ClickHouse 文档](https://clickhouse.com/docs)——列式 span 存储
- [DeepEval](https://github.com/confident-ai/deepeval)——评测库
