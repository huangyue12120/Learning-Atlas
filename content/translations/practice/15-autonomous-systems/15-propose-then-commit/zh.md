---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/15-autonomous-systems/15-propose-then-commit/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 066d62177805838d9d0678e12e73824d860440642edd386b738307c20ee579c4
status: reviewed
---

# 人在回路：先提议后提交

> 2026 年对 HITL 的共识是先提议后提交：拟议动作带幂等键持久化到耐久存储，并连同意图、数据来源链、触及的权限、爆炸半径和回滚计划呈现给审阅者；只有正向确认后才提交；执行后还要验证副作用真的发生。LangGraph 的 `interrupt()` 加 PostgreSQL 检查点、Microsoft Agent Framework 的 `RequestInfoEvent` 和 Cloudflare 的 `waitForApproval()` 都实现同一形状。规范失效模式是橡皮图章式批准：“批准？”未经审阅就被点击。已记录的缓解是带显式检查清单的挑战—响应。

**类型：** 学习
**语言：** Python（标准库，带幂等性的先提议后提交状态机）
**前置要求：** 第 15 阶段 · 12（持久执行）、第 15 阶段 · 14（绊线）
**用时：** 约 60 分钟

## 问题所在

智能体要采取一个动作。用户必须决定：批准还是不批准。若决定瞬间作出，它可能不是审阅；若决定有结构，它会慢但值得信赖。工程问题是如何使结构化审阅成为阻力最小的路径。

2023 年代的 HITL 模式是同步提示：“智能体想向 X 发送正文为 Y 的邮件——批准吗？”用户点击批准。所有人觉得系统安全。实践中，这个界面被大量橡皮图章化：用户快速批准，批准几乎不能预测结果；当智能体出错时，审计轨迹展示长长的批准历史，用户却无法回忆。

2026 年模式——先提议后提交——将 HITL 放到耐久基底上，附加结构化元数据，并要求正向提交。每个托管智能体 SDK 都提供一种版本：LangGraph `interrupt()`、Microsoft Agent Framework `RequestInfoEvent`、Cloudflare `waitForApproval()`。API 名称不同，形状不变。

## 核心概念

### 先提议后提交状态机

1. **提议。** 智能体产生拟议动作。它被持久化至耐久存储（PostgreSQL、Redis、Durable Object），包括：
   - 意图（智能体为何这样做）
   - 数据来源链（哪一个来源导致此提议）
   - 触及的权限（哪些 scope / 文件 / 端点）
   - 爆炸半径（最坏情况是什么）
   - 回滚计划（若提交后，如何撤销）
   - 幂等键（每个提议唯一；重新提交返回同一记录）
2. **呈现。** 审阅者看到附有全部元数据的提议。审阅者是人，而不是智能体审阅自身。
3. **提交。** 正向确认，动作执行。
4. **验证。** 执行后读回并确认副作用。若验证失败，系统进入已知坏状态，告警随即介入。

### 幂等键 <!-- learning-atlas: the-idempotency-key -->

没有幂等键，一次暂时性失败后的重试可能重复执行已批准动作。具体例子：用户批准“从 A 向 B 转账 100 美元”。网络短暂波动，工作流重试。用户只批准过一次，转账却执行两次。幂等键将批准绑定到单一、唯一副作用；第二次执行是空操作。

这与 Stripe 和 AWS API 使用的幂等模式相同。Microsoft Agent Framework 文档明确将它用于智能体批准。

### 耐久性：为什么批准比进程活得更久

批准等待室是一段智能体不拥有的状态。工作流暂停（第 12 课）。当批准到达，工作流从准确位置恢复。因此 LangGraph 将 `interrupt()` 与 PostgreSQL 检查点配对，而不只使用内存状态；两天后到达的批准仍能找到完好的工作流。

### 橡皮图章式批准与挑战—响应缓解

HITL 的默认 UI（“批准” / “拒绝”按钮）会产生没有真正审阅的快速批准。已记录的缓解是挑战—响应检查清单：在批准按钮可用前，要求对具体问题作出正向回答。具体形态：

- “你了解它触及的资源吗？[ ]”
- “你已核实爆炸半径可接受吗？[ ]”
- “若失败，你有回滚计划吗？[ ]”

检查清单把审批变成强制函数。无法勾选框的审阅者要么请求澄清（升级），要么拒绝（安全默认）。Anthropic 的智能体安全研究明确援引由检查清单驱动的 HITL，作为橡皮图章批准模式的缓解。

### 什么算有后果

不是每个动作都需要先提议后提交。2026 年指导意见：

- **有后果动作**（始终 HITL）：不可逆写入、金融交易、对外通信、生产数据库修改、破坏性文件系统操作。
- **可逆动作**（有时 HITL）：对本地文件的编辑、预发布环境更改、具备清晰回滚的可逆写入。
- **读取与检查**（从不 HITL）：读文件、列出资源、调用只读 API。

### 动作后验证

“提交运行过”不同于“副作用已发生”。网络分区和竞态条件会导致工作流以为成功，后端却未持久化。验证步骤在提交后重新读取目标资源来确认。这与数据库事务中的 `RETURNING` 子句，或 `PutObject` 后使用 AWS `GetObject` 的模式相同。

### 欧盟 AI 法案第 14 条

第 14 条要求欧盟的高风险 AI 系统具有有效的人类监督。“有效”不是装饰性措辞。监管语言明确排除橡皮图章模式。先提议后提交加挑战—响应，是在 Microsoft Agent Governance Toolkit 合规文档中可经受第 14 条审查的形状。

```figure
mx-propose-then-commit
```

## 实际运行

`code/main.py` 用标准库实现先提议后提交状态机。耐久存储是 JSON 文件；幂等键是 `(thread_id, action_signature)` 的哈希。驱动程序模拟三种情况：干净批准流程、暂时失败后重试（不能重复执行），以及橡皮图章默认值与挑战—响应流程。

## 交付物

`outputs/skill-hitl-design.md` 审阅拟议 HITL 工作流是否符合先提议后提交形状，并标记缺失的元数据、幂等性、验证或挑战—响应层。

## 练习

1. 运行 `code/main.py`。确认已批准提议的重试使用耐久记录且不会重新执行。现在将幂等键改为包含时间戳，展示重试会重复执行。

2. 将 `rollback` 字段加入提议记录。模拟一个验证步骤失败的执行，展示回滚自动触发。

3. 阅读 Microsoft Agent Framework 的 `RequestInfoEvent` 文档。找出该 API 包含而玩具引擎缺少的一项元数据字段。加入它，并解释它防护什么。

4. 为特定动作（例如“发布到公开 Twitter 帐号”）设计挑战—响应检查清单。审阅者必须回答哪三个问题？为什么是这三个？

5. 选一个同步“批准？”提示就足够的情形（无需耐久存储），解释为什么，并命名你接受的风险类别。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|---|---|---|
| 先提议后提交 | “两阶段批准” | 持久化提议 + 正向提交 + 验证 |
| 幂等键 | “重试安全 token” | 每个提议唯一；第二次执行为空操作 |
| 数据来源链 | “它从哪里来” | 导致此提议的具体源内容 |
| 爆炸半径 | “最坏情况” | 动作出错时的影响范围 |
| 橡皮图章 | “快速批准” | “批准”未经过真正审阅就被点击 |
| 挑战—响应 | “强制检查清单” | 审阅者必须正向确认具体问题 |
| RequestInfoEvent | “MS Agent Framework 原语” | 带结构化元数据的耐久 HITL 请求 |
| `interrupt()` / `waitForApproval()` | “框架原语” | LangGraph / Cloudflare 中同一形状的等价物 |

## 延伸阅读

- [Microsoft Agent Framework——人在回路](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop)——`RequestInfoEvent`、耐久批准。
- [Cloudflare Agents——人在回路](https://developers.cloudflare.com/agents/concepts/human-in-the-loop/)——`waitForApproval()` 与 Durable Objects。
- [Anthropic——在实践中衡量智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)——HITL 是长时程风险的缓解。
- [欧盟 AI 法案——第 14 条：人类监督](https://artificialintelligenceact.eu/article/14/)——高风险系统的监管基线。
- [Anthropic——Claude 宪法（2026 年 1 月）](https://www.anthropic.com/news/claudes-constitution)——围绕监督的宪法框架。
