---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/23-sre-for-ai/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 70af1683e56bf583059a01d153b808ad3ba0e76f89a811dc57d03cd6f108da01
status: reviewed
---

# AI SRE：多智能体事故响应、运行手册、预测性检测

> AI SRE 通过 RAG 使用以基础设施数据（日志、运行手册、服务拓扑）为依据的 LLM，自动化调查、文档与协调阶段。2026 年的架构模式是多智能体编排——由 supervisor 协调专用智能体（日志、指标、运行手册）；AI 提出假设和查询，人类批准判断。Datadog Bits AI 和 Azure SRE Agent 已作为托管产品提供。运行手册正在演进：NeuBird Hawkeye 使用对抗式评估（两个模型分析同一事故；一致 = 置信，不一致 = 不确定性）；运维记忆跨团队变更持续保留。自动修复保持谨慎：AI 提议，人类批准。完全自主的动作范围很窄（重启 pod、回滚特定部署），并受严格护栏约束——凡是销售“设置后忘记”的人都在过度推销。新兴前沿是事故前预测。MIT 研究报告称，使用历史日志 + GPU 温度 + API 错误模式训练的 LLM 可提前 10–15 分钟预测 89% 的中断。预测：截至 2026 年末，95% 的企业 LLM 将拥有自动故障切换。

**类型：** 学习
**语言：** Python（标准库，用于模拟多智能体事故分诊的玩具程序）
**前置要求：** 第 17 阶段 · 13（可观测性），第 17 阶段 · 24（混沌工程）
**用时：** 约 60 分钟

## 学习目标

- 绘制多智能体 AI SRE 架构：supervisor + 专用智能体（日志、指标、运行手册）+ 人类批准闸门。
- 解释为什么自动修复的范围很窄（重启 pod、回退部署），而不是广泛范围（重新设计服务）。
- 说出对抗式评估模式（NeuBird Hawkeye）：两个模型一致 = 置信；不一致 = 升级。
- 引用 MIT 89% 的提前检测结果及运维约束：没有行动的预测只是仪表盘。

## 问题

一名值班工程师在凌晨 3 点被呼叫：“结账服务错误率高。”他们查看 Datadog、Loki、三份运行手册和部署日志。30 分钟后才发现根因是 KV 缓存尖峰引起的 vLLM OOM。他们重启 pod，错误消失。

到 2026 年，这项调查的前 20 分钟可以自动化。按服务归组日志、关联近期部署、匹配运行手册——都是 RAG + tool-use。一个受监督的智能体可在人工打开 Datadog 前完成首次分诊并呈现假设。

完全自主修复是另一个问题。重启 pod：安全。若策略允许，扩展 GPU 池：安全。重新设计服务：绝对不安全。关键是划出这条狭窄界线。

## 概念

### 多智能体架构

```
          事故
             │
             ▼
          Supervisor
        /    |    \
       ▼     ▼     ▼
  日志智能体  指标智能体  运行手册智能体
       │     │     │
       └─────┴─────┘
             │
             ▼
        假设 + 证据
             │
             ▼
        人类批准
             │
             ▼
        行动（窄集合）
```

Supervisor 将事故拆解为子查询。专用智能体拥有工具访问（日志搜索、PromQL、文档检索）。Supervisor 综合结果，向人类呈现假设 + 证据；人类批准或重定向。

### 自动修复范围

**安全（狭窄）：** 重启 pod、回退特定部署、在预批准范围内扩展池、启用预批准 feature flag。

**不安全（广泛）：** 改变服务拓扑、修改资源限制、部署新代码、改变 IAM、修改数据库。

凡是销售“设置后忘记”的人都在过度推销。随着 AI SRE 成熟，安全集合会扩大，但边界是真实的。

### 对抗式评估（NeuBird Hawkeye）

两个模型独立分析同一事故。若在根因上达成一致，置信度高；若不一致，则将两个假设都展示给人类并升级。模式简单，却可有效过滤臆造的根因。

### 运维记忆

团队流动是传统 SRE 的隐形杀手——部落知识会离开。AI SRE 将运行手册 + 复盘存储到向量数据库；智能体在每起新事故中检索。新工程师加入时，AI 已拥有完整历史。

### 事故前预测

MIT 2025 年研究：在测试集上，使用历史日志、GPU 温度和 API 错误模式训练的 LLM，在事故发生前 10–15 分钟预测了 89% 的中断。

没有行动的预测只是仪表盘。运维问题是“预测后我们做什么？”预防性排空？呼叫？自动扩缩容？答案取决于策略。

### 2026 年产品

- **Datadog Bits AI**——Datadog 内部的托管 SRE copilot。
- **Azure SRE Agent**——Azure 原生。
- **NeuBird Hawkeye**——对抗式评估 + 运维记忆。
- **PagerDuty AIOps**——分诊 + 去重。
- **Incident.io Autopilot**——事故指挥官 + 协调。

### 作为代码的运行手册

运行手册从 Confluence 页面演变为带结构化章节（症状、假设、核验、行动）的版本化 Markdown。结构化运行手册提供更好的 RAG 检索。任何 AI-SRE 推广都应从将无结构运行手册转为结构化开始。

### 应当记住的数字

- MIT 提前检测：89% 的中断，提前 10–15 分钟。
- 多智能体分诊：supervisor +（日志、指标、运行手册）+ 人类。
- 安全的自动修复集合：重启 pod、回退部署、在范围内扩展。
- 对抗式评估：两个模型独立；一致 = 置信。

```figure
i4-incident-agents
```

## 使用

`code/main.py` 模拟多智能体分诊：日志智能体发现错误，指标智能体发现 CPU 尖峰，运行手册智能体匹配已知问题。Supervisor 为假设排序。

## 交付

本课产出 `outputs/skill-ai-sre-plan.md`。给定当前值班方式、事故量和团队成熟度，它会设计 AI SRE 推广方案。

## 练习

1. 运行 `code/main.py`。日志与指标智能体不一致时会怎样？Supervisor 如何解决？
2. 为你的服务定义三项“安全”的自动修复动作，并说明每项理由。
3. 编写一份结构化运行手册模板：章节、必填字段、核验命令。
4. 预测性检测提前 12 分钟触发。你的策略是什么——呼叫、预排空，还是两者？
5. 请论证三人团队应在 2026 年采用 AI SRE，还是等待。考虑成熟度、规模、风险。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| AI SRE | “值班智能体” | 由 LLM 支持的事故调查 + 协调 |
| Supervisor 智能体 | “编排器” | 将事故拆成子查询的顶层智能体 |
| 专用智能体 | “领域智能体” | 拥有工具访问的子智能体（日志、指标、运行手册） |
| 自动修复 | “AI 修好它” | 狭窄、预批准的行动；不是广泛重新设计 |
| 运维记忆 | “向量运行手册” | 放入向量数据库供 RAG 的复盘 + 运行手册 |
| 对抗式评估 | “双模型检查” | 独立分析；一致 = 置信 |
| NeuBird Hawkeye | “对抗式那个” | 采用对抗评估 + 记忆模式的产品 |
| Bits AI | “Datadog 的 SRE 智能体” | Datadog 托管 AI SRE |
| 事故前预测 | “提前检测” | 对中断预测提前 10–15 分钟 |

## 延伸阅读

- [incident.io — AI SRE Complete Guide 2026](https://incident.io/blog/what-is-ai-sre-complete-guide-2026)
- [InfoQ — Human-Centred AI for SRE](https://www.infoq.com/news/2026/01/opsworker-ai-sre/)
- [DZone — AI in SRE 2026](https://dzone.com/articles/ai-in-sre-whats-actually-coming-in-2026)
- [Datadog Bits AI](https://www.datadoghq.com/product/bits-ai/)
- [NeuBird Hawkeye](https://www.neubird.ai/)
- [awesome-ai-sre](https://github.com/agamm/awesome-ai-sre)
