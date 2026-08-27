---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/27-finops-llms/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 1430e4cd6817449b618d6065ee9371aee75ed3cfbb05087a13b0c5db29827c34
status: reviewed
---

# 面向 LLM 的 FinOps：单位经济学与多租户归因

> 传统 FinOps 在 LLM 支出上失效。成本是 token 交易，而非资源运行时长；标签无法映射——API 调用是交易，不是资产。工程决策（提示词设计、上下文窗口、输出长度）也是财务决策。2026 年手册要求第一天就插桩三个归因维度：按用户（`user_id`）用于席位定价和扩张，按任务（`task_id` + `route`）用于产品表面成本和优先级，按租户（`tenant_id`）用于单位经济学和续约。四个 token 层——提示词、工具、记忆、响应——若合为一桶会隐藏支出。多租户产品的执行阶梯：每租户速率限制（预期峰值的 2–3 倍，清晰 429 + retry-after）；每日支出上限（签约上限的 1.5–3 倍；触发速率收紧 + 告警）；当支出 z-score > 4 时触发 kill switch（自动暂停 + 呼叫值班）。归因模式：tag-and-aggregate、telemetry-joiner（trace-ID → billing，准确度最高）、sampling-and-extrapolation、model-based allocation、event-sourced、real-time streaming。单位指标：每个已解决查询的成本、每个生成工件的成本——不是 $/M tokens。追溯打标签总会漏；请在请求创建时插桩。

**类型：** 学习
**语言：** Python（标准库，具有 kill switch 的玩具成本归因模拟器）
**前置要求：** 第 17 阶段 · 13（可观测性），第 17 阶段 · 14（缓存）
**用时：** 约 60 分钟

## 学习目标

- 解释传统 FinOps（标签 + 层级）为何在 LLM 支出上失效，并说出三个新归因维度。
- 枚举四个 token 层（提示词、工具、记忆、响应），并解释单桶计费为何隐藏成本。
- 为多租户产品设计执行阶梯（速率 → 支出上限 → kill switch）。
- 选择单位指标（每个已解决查询 / 工件的成本），而不是 $/M tokens。

## 问题

账单显示 $40,000，你不知道：

- 哪个租户花了它。
- 哪项产品功能驱动了它。
- 是否有个别用户滥用。
- 罪魁是提示词膨胀、工具调用还是记忆放大。

供应商侧的 tag-and-aggregate 对云资源（EC2、S3）有效，因为标签能传播到计费条目。LLM API 调用不会自动打标签——必须在调用点盖上用户/任务/租户，并贯穿后续链路。追溯归因总会漏掉边缘情形。

## 概念

### 三个归因维度

**按用户**（`user_id`）：谁花了什么，驱动席位定价、扩张对话，并识别高用量用户。

**按任务**（`task_id` + `route`）：哪个产品表面花了什么，驱动功能优先级和终止高成本功能的决策。

**按租户**（`tenant_id`）：哪个客户有利润，驱动单位经济学、续约定价、层级阈值。

在第一天就于调用点插桩全部三者。追溯总是更差。

### 四个 token 层

| 层 | 示例 | 占总量典型比例 |
|----|------|----------------|
| 提示词 | system + 用户输入 | 40–60% |
| 工具 | 回送的 tool-call 结果 | 20–40%（智能体工作负载） |
| 记忆 | 先前对话 / 检索文档 | 10–30% |
| 响应 | 模型输出 | 10–30% |

把四者都装进同一桶会使优化盲目。在归因模式中拆开它们。

### 执行阶梯

1. **速率限制**，按租户。预期峰值的 2–3 倍，返回带 `Retry-After` 的 429。租户感到摩擦，但不会遇到意外账单。

2. **每日支出上限**，按租户。签约上限的 1.5–3 倍，触发后：收紧速率限制 + 告警客户成功团队。

3. 支出相对租户基线的 **z-score > 4** 时触发 **Kill switch**。自动暂停租户；呼叫值班；升级给运维 + CS。

### 归因模式

- **Tag-and-aggregate：** 盖元数据 header，后续聚合。简单；粗略。
- **Telemetry joiner：** 通过 trace ID 将 trace 与计费关联。准确度最高，成熟团队的做法。
- **Sampling + extrapolation：** 抽样 5–10%，再相乘。适合粗略支出，成本效益高；会漏长尾。
- **Model-based allocation：** 通过回归推断成本驱动因素，适用于没有标签的遗留数据。
- **Event-sourced：** 将成本作为流中的事件（Kafka / Kinesis），实时。
- **Real-time streaming：** 仪表盘在亚秒级更新。

### 每 X 成本才是单位指标

$/M tokens 是供应商语言。产品指标：

- 每张已解决支持工单的成本。
- 每篇生成文章的成本。
- 每个成功智能体任务的成本。
- 每用户会话分钟的成本。

将成本绑定到产品结果，否则优化没有锚点。

### 成本归因 trace 形状

```
trace_id: abc123
  user_id: u_42
  tenant_id: t_7
  task_id: task_classify_doc
  route: model_haiku
  layers:
    prompt_tokens: 1800
    tool_tokens: 600
    memory_tokens: 400
    response_tokens: 150
  cost_usd: 0.0135
  cached_input: true
  batch: false
```

每次调用都发出，存入数据湖，按维度聚合。第 17 阶段 · 13 的可观测性栈就是这一机制所在。

### 复合节省栈

叠加：缓存 + batch + 路由 + 网关。四者齐用：

- L2 缓存（第 17 阶段 · 14）：输入约便宜 10 倍。
- Batch（第 17 阶段 · 15）：降低 50%。
- 路由至廉价模型（第 17 阶段 · 16）：成本降低 60%。
- 网关效率（第 17 阶段 · 19）：冗余 + 重试。

最佳情形叠加后约为朴素基线的 5–10%。大多数团队启用了 2–3 个杠杆；很少能叠加四个。

### 应当记住的数字

- 归因维度：按用户、按任务、按租户。
- 四个 token 层：提示词、工具、记忆、响应。
- Kill switch：支出 z-score > 4。
- 单位指标：每个已解决查询成本，而非 $/M tokens。
- 叠加优化：可能达到基线的约 5–10%。

```figure
i4-spend-ladder
```

## 使用

`code/main.py` 模拟具有三层执行阶梯的多租户 LLM 服务，注入滥用租户，并演示 kill switch 触发。

## 交付

本课产出 `outputs/skill-finops-plan.md`。给定产品和规模，它会设计归因模式和执行阶梯。

## 练习

1. 运行 `code/main.py`。kill switch 在什么 z-score 触发？如何选择阈值？
2. 设计一张按租户、按任务的成本仪表盘。最先构建哪 5 个视图？
3. 你最大的租户在单位经济学上为负。提出三项按客户影响排序的干预。
4. 计算支持产品每张已解决工单的成本：每张 3M token、每天约 800 张、GPT-5 缓存费率。
5. 请论证追溯打标签能否有效。何时可接受？

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| 按用户归因 | “用户级成本” | 每次调用盖上 `user_id` |
| 按任务归因 | “功能成本” | `task_id` + `route` 标识产品表面 |
| 按租户归因 | “客户成本” | `tenant_id`；驱动单位经济学 |
| 四个 token 层 | “成本层” | 提示词 + 工具 + 记忆 + 响应 |
| 速率限制 | “429 护栏” | 在网关对租户执行上限 |
| 每日支出上限 | “每日天花板” | 带告警的租户级预算 |
| Kill switch | “自动暂停” | 支出 z-score > 4 时触发自动暂停 |
| 每个已解决成本 | “产品单位指标” | 成本绑定产品结果，而不是 token |
| Telemetry joiner | “trace 对计费” | 准确度最高的归因模式 |
| 叠加优化 | “cache+batch+route+gateway” | 复合节省至约 5–10% 基线 |

## 延伸阅读

- [FinOps Foundation — FinOps for AI Overview](https://www.finops.org/wg/finops-for-ai-overview/)
- [FinOps School — Cost per Unit 2026 Guide](https://finopsschool.com/blog/cost-per-unit/)
- [Digital Applied — LLM Agent Cost Attribution 2026](https://www.digitalapplied.com/blog/llm-agent-cost-attribution-guide-production-2026)
- [PointFive — Managed LLMs in Azure OpenAI](https://www.pointfive.co/blog/finops-for-ai-economics-of-managed-llms-in-azure-open-ai)
