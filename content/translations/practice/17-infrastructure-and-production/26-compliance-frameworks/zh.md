---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/26-compliance-frameworks/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 20cb93aee9790da3c61c0d106b955b01b033b90ec2262dbeb40dfdd803e4e686
status: reviewed
---

# 合规：SOC 2、HIPAA、GDPR、PCI-DSS、EU AI Act、ISO 42001

> 多框架覆盖是 2026 年企业交易的基本要求。**EU AI Act：** 自 2024 年 8 月 1 日生效。大多数高风险要求于 2026 年 8 月 2 日执行。高风险系统义务的罚款最高为 €15M 或全球年营业额的 3%（Art. 99(4)）；禁止 AI 实践最高为 €35M 或 7%（Art. 99(3)）。若服务欧盟用户，即在全球适用。**Colorado AI Act：** 于 2026 年 6 月 30 日生效（由 SB25B-004 从 2026 年 2 月延后）——高风险系统需影响评估，用户有权上诉 AI 决策。Virginia 对信贷/雇佣/住房/教育相似。**SOC 2 Type II：** 事实上的 B2B AI 要求（金融科技需要 Type II，而非 Type I）。**GDPR：** 有据可查的最大 AI 专项罚款是 €30.5M，针对 Clearview AI（荷兰 DPA，2024 年 9 月）；意大利 Garante 于 2024 年 12 月对 OpenAI 罚款 €15M（后在 2026 年 3 月上诉中推翻）。推理时实时 PII 脱敏是可辩护标准；后处理清理不够。**HIPAA：** 医疗边界——未签 BAA 不得将 PHI 发送至外部 AI 服务。**PCI-DSS：** AI 交互层覆盖需要配置 + 合同协议，并非自动获得。**ISO 42001：** 新兴 AI 治理标准，与 ISO 27001 一起日益成为采购要求。参考档案：OpenAI 对 ChatGPT 支付组件维持 SOC 2 Type 2、ISO/IEC 27001:2022、ISO/IEC 27701:2019、GDPR/CCPA/HIPAA（BAA）/FERPA、PCI-DSS。跨框架映射可减少审计疲劳：访问控制跨越 ISO 27001 A.5.15-5.18、GDPR Art. 32、HIPAA §164.312(a)。

**类型：** 学习
**语言：** （Python 可选——合规是政策 + 流程，而非代码）
**前置要求：** 第 17 阶段 · 25（安全），第 17 阶段 · 13（可观测性）
**用时：** 约 60 分钟

## 学习目标

- 枚举与 LLM 产品相关的七个 2026 年框架，并将每个匹配到客户细分。
- 引用 EU AI Act 执行时间线（2024 年 8 月生效；高风险于 2026 年 8 月执行）和双层罚款上限（高风险义务 €15M / 3%，禁止实践 €35M / 7%）。
- 解释为什么 GDPR 的后处理 PII 清理不够，并说出可辩护标准：推理层实时脱敏。
- 描述跨框架控制映射（例如访问控制映射至 ISO 27001 A.5.15-5.18 + GDPR Art. 32 + HIPAA §164.312(a)）。

## 问题

企业客户的采购要求 SOC 2 Type II、GDPR、HIPAA BAA、ISO 27001 和“EU AI Act 合规声明”。你的团队有 SOC 2 Type I，距离 Type II 还差六个月，且尚未开始 GDPR Article 30 记录。

多框架覆盖不是 LLM 问题，而是企业 SaaS 问题，只是叠加了 LLM 专属要求。2026 年采购团队希望看到一张矩阵：每个框架一行、每个控制一列，而不是 PDF。

## 概念

### 七个框架

| 框架 | 范围 | LLM 专属要求 |
|------|------|--------------|
| SOC 2 Type II | B2B SaaS 基线 | 对 6–12 个月内的流程控制进行审计 |
| HIPAA | 美国医疗 | 必须 BAA；没有已签协议，PHI 不得离开基础设施 |
| GDPR | 欧盟用户 | 实时 PII 脱敏；数据主体权利；Article 30 记录 |
| PCI-DSS | 支付数据 | 对接触支付的 AI 需配置 + 合同 |
| EU AI Act | 服务欧盟用户 | 风险层级分类；高风险系统：符合性评估、文档、日志 |
| Colorado AI Act | 服务 Colorado 居民 | 影响评估；上诉权 |
| ISO 42001 | AI 治理 | 新兴；与 ISO 27001 配对 |

### EU AI Act 时间线

- 2024 年 8 月 1 日：生效。
- 2025 年 2 月 2 日：禁止 AI 实践开始执行。
- 2026 年 8 月 2 日：高风险系统开始执行（符合性评估、文档、日志）。
- 2027 年 8 月：受统一法规约束产品中的高风险系统。

风险层级：不可接受（禁止）、高风险（符合性 + 日志）、有限风险（透明度）、最小风险（无约束）。大多数 B2B LLM SaaS 属有限风险；雇佣、信贷、教育、执法、移民、基本服务则可能触发高风险。

罚款（Article 99）：违反高风险系统义务最高 €15M 或全球年营业额的 3%（Art. 99(4)）；禁止 AI 实践最高 €35M 或 7%（Art. 99(3)）；取较高者。

### GDPR——实时脱敏才是标准

后处理清理（在 LLM 已看到 PII 后才脱敏）不是可辩护立场——模型已经看过数据。2026 年标准是推理层实时脱敏：

- 在 LLM 调用前进行实体识别。
- 一致 tokenization（Mesh 方法）保留语义。
- 仅保存已脱敏提示词 + 获同意的选择加入原文。

近期执法：Clearview AI（荷兰 DPA，2024 年 9 月）的 €30.5M 是迄今最大有据可查 AI 专项 GDPR 罚款；OpenAI（意大利 Garante，2024 年 12 月）的 €15M 是最大 LLM 专项罚款，但已在 2026 年 3 月上诉中推翻，裁决仍在进一步复核中。后处理主张未能通过审计。

### HIPAA——BAA 不是可选项

未签署 Business Associate Agreement，不能将 PHI 发送至外部 AI 服务。三大 hyperscaler LLM 平台（Bedrock、Azure OpenAI、Vertex）提供 BAA，OpenAI 直连 API 提供 BAA，Anthropic 直连 API 也提供 BAA。发送 PHI 前必须确认。

### SOC 2 Type II

Type I：控制已设计和记录。
Type II：控制在 6–12 个月内有效运行。

2026 年 B2B 采购默认要求 Type II。Type I 是起步，Type II 是门槛。

常见审计驱动因素：访问日志（谁看了什么）、变更管理（如何部署）、风险评估（每季度）、事故响应（是否经过测试）。第 17 阶段 · 25 的审计日志可直接复用。

### 跨框架映射

一份访问控制策略满足多框架控制：

| 控制 | 框架 |
|------|------|
| 访问日志 | ISO 27001 A.5.15-5.18、GDPR Art. 32、HIPAA §164.312(a) |
| 变更管理 | ISO 27001 A.8.32、PCI DSS Req. 6、HIPAA breach-notification 范围 |
| 传输中加密 | ISO 27001 A.8.24、GDPR Art. 32、HIPAA §164.312(e) |
| 密钥管理 | ISO 27001 A.8.19、PCI DSS Req. 8、SOC 2 CC6.1 |

合规工具（Drata、Vanta、Secureframe）能自动化这种映射，在规模上值得成本。

### ISO 42001——新兴标准

2023 年末发布。与 ISO 27001 一起日益成为采购要求。它是 AI 治理框架，包含风险管理、数据质量、透明度、人类监督。

### OpenAI 的参考档案

OpenAI 对 ChatGPT 支付组件维持 SOC 2 Type 2、ISO/IEC 27001:2022、ISO/IEC 27701:2019、GDPR/CCPA/HIPAA（BAA）/FERPA、PCI-DSS。这大致是 2026 年企业级基本要求。

### 应当记住的数字

- EU AI Act 罚款：高风险义务最高 €15M / 3%（Art. 99(4)）；禁止实践最高 €35M / 7%（Art. 99(3)）。
- EU AI Act 高风险执行：2026 年 8 月 2 日。
- 最大有据可查 AI 专项 GDPR 罚款：€30.5M，Clearview AI（荷兰 DPA，2024 年 9 月）。
- 最大 LLM 专项 GDPR 罚款：€15M，OpenAI（意大利 Garante，2024 年 12 月；2026 年 3 月上诉推翻）。
- SOC 2 Type II 窗口：控制运行 6–12 个月。
- Colorado AI Act 生效日期：2026 年 6 月 30 日（由 SB25B-004 从 2026 年 2 月延后）。

```figure
i4-control-matrix
```

## 使用

`code/main.py` 是 Python 编写的合规映射表：给定一个控制，列出其满足的框架。

## 交付

本课产出 `outputs/skill-compliance-matrix.md`。给定客户细分和地理范围，它会指定所需框架和控制。

## 练习

1. 你的第一位企业客户要求 SOC 2 Type II、HIPAA BAA、EU AI Act 声明。赢得交易的最小可行合规立场是什么？
2. 将三个假设 LLM 产品按 EU AI Act 风险层级分类。高风险时有什么变化？
3. 你意外将 PHI 发送至未签 BAA 的供应商。逐步完成事故响应。
4. 请论证对于中端市场 AI 供应商，ISO 42001 在“2026 年是否必要”。
5. 将你的 LLM 审计日志字段（第 17 阶段 · 25）映射到至少三个框架控制。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| SOC 2 Type II | “已审计控制” | 独立证明的、在 6–12 个月内运行的控制 |
| HIPAA BAA | “医疗合同” | Business Associate Agreement；PHI 必需 |
| GDPR | “欧盟隐私” | 实时 PII 脱敏是可辩护的 2026 年标准 |
| EU AI Act | “欧盟 AI 规则” | 高风险在 2026 年 8 月执行；€15M / 3%（高风险义务）— €35M / 7%（禁止实践） |
| Colorado AI Act | “美国州 AI 法” | 2026 年 6 月 30 日生效（由 SB25B-004 延后）；影响评估 |
| ISO 42001 | “AI 治理” | 新兴的 AI 风险 + 透明度框架 |
| ISO 27001 | “安全 ISMS” | 信息安全管理系统基线 |
| 符合性评估 | “EU AI 文档包” | 高风险要求：文档、测试、日志 |
| 跨框架映射 | “一个控制，多套框架” | 一项策略满足多个框架控制 |

## 延伸阅读

- [OpenAI Security and Privacy](https://openai.com/security-and-privacy/) — 参考合规档案。
- [GuardionAI — LLM Compliance 2026: ISO 42001, EU AI Act, SOC 2, GDPR](https://guardion.ai/blog/llm-compliance-guide-iso-42001-eu-ai-act-soc2-gdpr-2026)
- [Dsalta — SOC 2 Type 2 Audit Guide 2026: 10 AI Controls](https://www.dsalta.com/resources/ai-compliance/soc-2-type-2-audit-guide-2026-10-ai-powered-controls-every-saas-team-needs)
- [EU AI Act official text](https://eur-lex.europa.eu/eli/reg/2024/1689/oj) — 主要来源。
- [Colorado AI Act](https://leg.colorado.gov/bills/sb24-205) — 主要来源。
- [ISO/IEC 42001:2023](https://www.iso.org/standard/81230.html) — AI 管理体系标准。
