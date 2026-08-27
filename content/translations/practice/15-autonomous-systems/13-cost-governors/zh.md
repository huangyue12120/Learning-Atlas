---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/15-autonomous-systems/13-cost-governors/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 4bbc8166514794ae938da3981b90bf55549cde613ad6b5440da67115dbb7fd83
status: reviewed
---

# 动作预算、迭代上限与成本治理器

> 一个中型电商智能体的团队启用“订单跟踪”skill 后，月度 LLM 成本从 1,200 美元跃升到 4,800 美元。智能体发现了一个新循环，并在循环内持续花钱。Microsoft 的 Agent Governance Toolkit（2026 年 4 月 2 日）规定了针对此类问题的防御：每请求 `max_tokens`、每任务 token 与美元预算、每日/月度上限、迭代上限、分层模型路由、提示词缓存、上下文窗口化、对昂贵动作的 HITL 检查点、预算触发时的紧急停止开关。Anthropic 的 Claude Code Agent SDK 以不同名称提供同样原语。财务速度限制——例如 10 分钟内花费超过 50 美元就切断访问——比月度上限更快地捕获循环。

**类型：** 学习
**语言：** Python（标准库，分层成本治理器模拟器）
**前置要求：** 第 15 阶段 · 10（权限模式）、第 15 阶段 · 12（持久执行）
**用时：** 约 60 分钟

## 问题所在

自治智能体在每一轮都花费真金白银。聊天机器人的坏输出是一条坏回复；智能体的坏循环是一张账单。业界对这种失效模式的术语是“拒绝钱包服务（Denial of Wallet）”——智能体持续推理、持续调用工具、持续计费，却没有任何东西阻止它，因为没有任何东西被设计来阻止它。

修复需要一组覆盖不同时间尺度和粒度的限制：每请求、每任务、每小时、每天、每月。设计良好的栈能在数分钟内捕获失控循环，在数小时内捕获慢性泄漏，在一天内捕获糟糕发布。对于长时程自治智能体，同一栈也能保持预算仍然存在。

本课关注工程约束：数学很简单，团队常因缺乏纪律而失败。下面列出的限制都由 Microsoft Agent Governance Toolkit 或 Anthropic Claude Code Agent SDK 文档明确命名。

## 核心概念

### 成本治理器栈

1. **每请求 `max_tokens`。** 很简单，防止任何一次调用产生无界 completion。
2. **每任务 token 预算。** 在整个运行中不超过 N 个 token；到达上限就硬停止。
3. **每任务美元预算。** 与 token 类似，但以货币计。Claude Code 中为 `max_budget_usd`。
4. **每工具调用上限。** 例如不超过 N 次 `WebFetch` 调用、N 次 `shell_exec` 调用。
5. **迭代上限（`max_turns`）。** 智能体循环的总迭代次数；防止无限推理循环。
6. **每分钟 / 每小时 / 每天 / 每月上限。** 滚动窗口，在不同时间尺度捕获泄漏。
7. **财务速度限制。** 例如“若 10 分钟内花费超过 50 美元，就切断访问”。在月度上限触发前捕获基于循环的消耗。
8. **分层模型路由。** 默认使用较小模型；仅当分类器判断任务值得时升级至较大模型。
9. **提示词缓存。** 系统提示词和稳定上下文存于提供方缓存；重复发送的 token 成本接近零。
10. **上下文窗口化。** 压缩 / 摘要，使活跃上下文低于阈值；直接降低 token 成本。
11. **昂贵动作上的 HITL 检查点。** 在已知昂贵的动作（长工具调用、大下载、昂贵模型升级）前，要求人类确认。
12. **预算越界时的紧急停止开关。** 任何上限触发时中止会话。记录该上限；需要单独路径才可重新启用。

### 为什么要用栈，而非一个上限

单个月度上限只有在钱包已被耗尽后才能捕获失控智能体；单个每请求上限在会话层什么也捕获不到。不同失效模式需要不同时间尺度：

- **失控循环**（智能体卡在每 5 秒一次的重试中）：由速度限制捕获。
- **慢性泄漏**（智能体每任务做约 2 倍预期工作）：由每日上限捕获。
- **糟糕发布**（新版本使用 5 倍 token）：由每周 / 每月上限捕获。
- **合法激增**（真实需求，而非 bug）：由带清晰日志的每小时 / 每日上限捕获。

### 一个 harness 的预算表面

Claude Code Agent SDK 提供（公开文档）：

- `max_turns` —— 迭代上限。
- `max_budget_usd` —— 美元上限；越界时中止会话。
- `allowed_tools` / `disallowed_tools` —— 工具允许列表与拒绝列表。
- 工具使用前的钩子点，用于自定义成本记账。

将它与权限模式阶梯（第 10 课）结合。一个没有 `max_budget_usd` 的 `autoMode` 会话是未受治理的自治。Anthropic 明确将自动模式定位为需要预算控制；分类器与成本相互独立。

### 欧盟 AI 法案与 OWASP Agentic Top 10

Microsoft 的 Agent Governance Toolkit 涵盖 OWASP Agentic Top 10 和欧盟 AI 法案第 14 条（人类监督）要求。对在欧盟生产运行的系统，日志记录和上限强制执行不是可选项。

### 已观察到的 1,200 → 4,800 美元案例

Microsoft 文档中的真实案例：一个电商智能体在增加新工具后，月度成本增长三倍。该工具允许智能体在每个会话中轮询订单状态。系统没有循环检测、每工具上限或周环比增长告警。修复方案是增加每工具上限和每日增长告警。每个新工具面都可能引入新循环，因此需要自己的上限和告警。

```figure
cost-governor-stack
```

## 实际运行

`code/main.py` 模拟带与不带分层成本治理器栈的智能体运行。模拟智能体在若干轮后漂移进轮询循环；分层栈会在速度窗口内捕获它，而单个月度上限要到数天后才会触发。

## 交付物

`outputs/skill-agent-budget-audit.md` 审计拟议智能体部署的成本治理器栈，并标记缺失层。

## 练习

1. 运行 `code/main.py`。确认在轮询循环轨迹中，速度限制先于迭代上限触发。现在禁用速度限制，测量迭代上限捕获它之前智能体“花费”多少。

2. 为一个浏览器智能体（第 11 课）设计每工具上限集合。哪个工具需要最严格的上限？哪个工具可以无风险地无限运行？

3. 阅读 Microsoft Agent Governance Toolkit 文档。列出该工具包命名的每种上限类型。将每种映射到失控循环、慢性泄漏、糟糕发布或激增之一。

4. 为一个真实任务（例如“分类仓库中的 50 个 issue”）给无人值守的隔夜运行定价。将 `max_budget_usd` 设为点估计的两倍，并说明为何是两倍。

5. Claude Code 的 `max_budget_usd` 在会话聚合成本上触发。设计一个你会在外部强制执行的互补速度限制。什么会触发切断？重新启用是什么样子？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|---|---|---|
| 拒绝钱包服务 | “失控账单” | 智能体循环产生花费，而没有上限阻止它 |
| max_tokens | “每请求上限” | 单次 completion 大小的上限 |
| max_turns | “迭代上限” | 会话中智能体循环迭代次数的上限 |
| max_budget_usd | “美元紧急停止开关” | 会话成本上限；越界时中止 |
| 速度限制 | “速率上限” | 短时间窗口的花费上限（例如 50 美元 / 10 分钟） |
| 分层路由 | “先用小模型” | 默认使用廉价模型；仅在分类器判定值得时升级 |
| 提示词缓存 | “缓存的系统提示词” | 提供方侧缓存使重复发送 token 成本接近零 |
| HITL 检查点 | “人类批准闸门” | 昂贵动作前要求人类确认 |

## 延伸阅读

- [Anthropic Claude Code Agent SDK——智能体循环与预算](https://code.claude.com/docs/en/agent-sdk/agent-loop)——`max_turns`、`max_budget_usd`、工具允许列表。
- [Microsoft Agent Framework——人在回路与治理](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop)——成本治理器检查点。
- [Anthropic——Claude Managed Agents 概览](https://platform.claude.com/docs/en/managed-agents/overview)——提供方侧成本控制。
- [Anthropic——提示词缓存（Claude API 文档）](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)——缓存机制。
- [Anthropic——在实践中衡量智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)——长时程智能体的成本画像。
