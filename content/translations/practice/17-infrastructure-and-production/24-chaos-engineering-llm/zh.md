---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/24-chaos-engineering-llm/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: cd452d8d62dd107244028e88aadbcffcc768cd58a78afe52f3d85a4906f4e79f
status: reviewed
---

# LLM 生产环境的混沌工程

> 2026 年，LLM 混沌工程是一门独立学科。在生产中运行实验前的先决条件：已定义 SLI/SLO、trace+metric+log 可观测性、自动回滚、运行手册、值班。架构有四个平面：控制（实验调度器）、目标（服务、基础设施、数据存储）、安全（护栏 + 中止 + 流量过滤）、可观测性（指标 + trace + log），并将反馈送回 SLO 调整。护栏是强制性的：当每日错误预算燃烧 > 预期 2 倍时，燃烧率告警暂停实验；抑制窗口 + trace-ID 关联会去重告警噪声。节奏：每周小型金丝雀 + SLO 复审；每月 game day + 复盘；每季度跨团队韧性审计 + 依赖映射。LLM 专属实验：内存过载、网络故障、供应商中断、格式错误提示词、KV 缓存驱逐风暴。工具：Harness Chaos Engineering（LLM 衍生的建议、爆炸半径缩小、MCP 工具集成）；LitmusChaos（CNCF）；Chaos Mesh（CNCF Kubernetes 原生）。

**类型：** 学习
**语言：** Python（标准库，用于模拟混沌实验运行器的玩具程序）
**前置要求：** 第 17 阶段 · 23（AI SRE），第 17 阶段 · 13（可观测性）
**用时：** 约 60 分钟

## 学习目标

- 说出五项混沌工程先决条件（SLI/SLO、可观测性、回滚、运行手册、值班），并解释为什么遗漏任何一项都会破坏实践。
- 绘制四个平面（控制、目标、安全、可观测性）及回到 SLO 的反馈环。
- 枚举五种 LLM 专属实验（内存过载、网络失败、供应商中断、格式错误提示词、KV 驱逐风暴）。
- 针对栈选择工具：Harness、LitmusChaos、Chaos Mesh。

## 问题

传统栈中的混沌测试已成熟，LLM 栈增加了新的失败模式：一条含有毒字符的 4K-token 提示词使 tokenizer 停滞 12 秒。上游供应商返回 429；网关重试；重试放大的并发使服务 OOM。突发负载下的 KV 缓存驱逐风暴引起重新 prefill 级联，令计算饱和。

这些都不会出现在单元测试中。混沌工程让你在用户之前发现它们。

## 概念

### 先决条件

没有以下条件，不要在生产中运行混沌：

1. **SLI/SLO**——已定义服务级指标和目标。
2. **可观测性**——trace、指标、日志，已接入仪表盘。
3. **自动回滚**——第 17 阶段 · 20 的策略标志回滚。
4. **运行手册**——结构化，见第 17 阶段 · 23。
5. **值班**——有人响应。

遗漏任何一项，混沌就会变成真实事故。

### 四个平面 + 反馈

**控制平面**——实验调度器（Litmus workflow、Chaos Mesh schedule、Harness UI）。

**目标平面**——服务、pod、节点、负载均衡器、数据存储。

**安全平面**——kill switch、抑制窗口、爆炸半径限制、错误预算闸门。

**可观测性平面**——正常指标 + trace-ID 关联，以区分混沌诱发故障与自然故障。

**反馈环**——发现回流至 SLO 调整、运行手册更新、代码修复。

### 护栏是强制性的

- **燃烧率告警：** 若每日错误预算燃烧超过预期 2 倍，则暂停实验。
- **抑制窗口：** 在实验期间，静默爆炸半径内的非实验告警。
- **Trace-ID 关联：** 所有实验诱发的错误携带标签，以便值班人员去重。

### 五种 LLM 专属实验

1. **内存过载**——以高并发发送长上下文请求，强制 KV 缓存抢占风暴。观察：服务能优雅地拒绝负载，还是崩溃？

2. **网络故障**——切断推理网关和供应商间的连接。观察：回退能否在 SLA 内生效？（第 17 阶段 · 19）

3. **供应商中断模拟**——OpenAI 100% 429。观察：路由是否故障切换到 Anthropic？（第 17 阶段 · 16、19）

4. **格式错误提示词**——注入使 tokenizer 停滞的 payload（例如深度嵌套 unicode、巨大的 UTF-8 codepoint）。观察：一条请求会锁住 worker 吗？

5. **KV 驱逐风暴**——饱和 vLLM block budget 以强制驱逐。观察：LMCache 能恢复，还是服务退化？

### 节奏

- **每周**——在 staging 中进行小型金丝雀实验，可能覆盖 5% 生产。
- **每月**——针对一个特定场景的计划 game day；跨团队参加；复盘。
- **每季度**——跨团队韧性审计；依赖图更新。

### 工具

- **Harness Chaos Engineering**——商业产品；AI 衍生实验建议、爆炸半径缩小、MCP 工具集成。
- **LitmusChaos**——CNCF graduated；基于 Kubernetes workflow。
- **Chaos Mesh**——CNCF sandbox；Kubernetes 原生 CRD 风格。
- **Gremlin**——商业产品；支持面广。
- **AWS FIS** / **Azure Chaos Studio**——托管云产品。

### 从小开始

第一个实验：稳态流量下杀掉一个 decode 副本的 pod，观察重路由和恢复。若其工作且看起来安全，再升级到网络混沌。

第一个 LLM 专属实验：对一个供应商注入 5 分钟 429，观察回退。大多数团队会发现其回退未经完整测试。

### 应当记住的数字

- 四个平面：控制、目标、安全、可观测性。
- 燃烧率暂停：每日预算燃烧为预期的 2 倍。
- 节奏：每周金丝雀、每月 game day、每季度审计。
- 五种 LLM 实验：内存、网络、供应商、格式错误提示词、KV 风暴。

```figure
i4-chaos-guard
```

## 使用

`code/main.py` 模拟带安全平面闸门的三种混沌实验，报告哪些实验将触发燃烧率中止。

## 交付

本课产出 `outputs/skill-chaos-plan.md`。给定栈和成熟度，它会选择最初三项实验和工具。

## 练习

1. 运行 `code/main.py`。哪项实验触发燃烧率闸门，为什么？
2. 为基于 vLLM 的 RAG 服务设计最初五项混沌实验，包含成功标准。
3. 燃烧率告警暂停一项实验。如何判断根因是混沌还是自然因素？
4. 请论证混沌应在生产运行还是只在 staging 运行。生产何时才是正确答案？
5. 说出三种通用网络混沌无法复现的 LLM 专属失败模式。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| SLI / SLO | “服务目标” | 指标 + 目标；必要先决条件 |
| 爆炸半径 | “范围” | 受实验影响的服务 / 用户集合 |
| 燃烧率告警 | “预算闸门” | 错误预算燃烧率 > 预期 2 倍时触发 |
| Game day | “月度演练” | 计划的跨团队混沌练习 |
| LitmusChaos | “CNCF workflow” | 已 graduated 的 CNCF Kubernetes 混沌工具 |
| Chaos Mesh | “CNCF CRD” | CNCF sandbox、Kubernetes 原生混沌 |
| Harness CE | “商业 AI 辅助” | 带 AI 建议的 Harness 混沌工程 |
| 格式错误提示词 | “tokenizer 炸弹” | 使 tokenization 停滞的输入 |
| KV 驱逐风暴 | “抢占级联” | 大规模驱逐触发重新 prefill |

## 延伸阅读

- [DevSecOps School — Chaos Engineering 2026 Guide](https://devsecopsschool.com/blog/chaos-engineering/)
- [Ankush Sharma — Observability for LLMs (book)](https://www.amazon.com/Observability-Large-Language-Models-Engineering-ebook/dp/B0DJSR65TR)
- [LitmusChaos (CNCF)](https://litmuschaos.io/)
- [Chaos Mesh (CNCF)](https://chaos-mesh.org/)
- [Harness Chaos Engineering](https://www.harness.io/products/chaos-engineering)
- [AWS FIS](https://aws.amazon.com/fis/)
