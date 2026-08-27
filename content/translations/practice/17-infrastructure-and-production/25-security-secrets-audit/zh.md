---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/25-security-secrets-audit/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 8fa0b2d28ab54c4c0cff0b90f08642aded7a71456dbef7011d96d0fbff11f467
status: reviewed
---

# 安全：密钥、API Key 轮换、审计日志、护栏

> 通过集中式 vault（HashiCorp Vault、AWS Secrets Manager、Azure Key Vault）消除密钥蔓延。绝不将凭证存入配置文件、VCS 中的 env 文件或电子表格。使用 IAM roles 而非静态 key；CI/CD 使用 OIDC。AI 网关模式是 2026 年的解决方案：应用 → 网关 → 模型供应商，网关在运行时从 vault 获取凭证。在 vault 中轮换，所有应用几分钟内取到新密钥——无需重新部署，也无需在 Slack 中询问“谁有新 key”。轮换策略 ≤90 天；每次 commit 使用 TruffleHog / GitGuardian / Gitleaks 扫描。零信任：MFA、SSO、RBAC/ABAC、短期 token、设备状态。PII 清理使用实体识别，在转发前掩盖 PHI/PII；一致 tokenization（Mesh 方法）将敏感值映射为稳定占位符，使 LLM 保留代码/关系语义。网络出站：LLM 服务位于专用 VPC/VNet 子网，仅允许 `api.openai.com`、`api.anthropic.com` 等；阻止所有其他出站。2026 年事故驱动因素：Vercel 供应链攻击通过被入侵的 CI/CD 凭证，从数千个客户部署中外泄 env var。

**类型：** 学习
**语言：** Python（标准库，用于 PII 清理器 + 审计日志写入器的玩具程序）
**前置要求：** 第 17 阶段 · 19（AI 网关），第 17 阶段 · 13（可观测性）
**用时：** 约 60 分钟

## 学习目标

- 枚举四种密钥管理反模式（VCS 中的配置文件、硬编码 env、电子表格、静态 key），并说出替代方案。
- 解释“AI 网关从 vault 拉取”模式为何是 2026 年生产标准。
- 实现具有一致 tokenization 的 PII 清理器（相同值 → 相同占位符），使语义得以保留。
- 说出 2026 年 Vercel 供应链事故及其关于 CI/CD 凭证卫生的教训。

## 问题

实习生提交了带 API key 的 `.env`，很快删除。密钥已进入 git 历史——GitGuardian 扫描捕获它；你的轮换流程是“在 Slack 通知团队，更新 40 份配置文件，重新部署所有服务”。8 小时后，一半服务已上线，另一半仍等待部署窗口。

此外，用户提示词包含“我的 SSN 是 123-45-6789”。提示词会发送给 OpenAI。你有 BAA，但内部政策要求在转发前掩盖 PII；你没有做到。

还有，EKS 集群的 LLM pod 可以访问任意互联网主机。有人通过向攻击者控制的域名发起 DNS 查询外泄数据，无任何阻止。

LLM 服务的安全必须处理全部三个向量：基于 vault 的凭证、PII 清理、网络出站过滤和审计日志。

## 概念

### 集中式 vault + IAM role 拉取

**Vault：** HashiCorp Vault、AWS Secrets Manager、Azure Key Vault、GCP Secret Manager。单一事实来源。

**IAM role：** 应用/网关通过其 IAM 身份而非静态 key 进行认证。Vault 在 token 有效期内返回密钥。

**AI 网关模式：** 网关在请求时从 vault 拉取 `OPENAI_API_KEY`。在 vault 中轮换；下一次请求取得新 key，无需重新部署。

### 轮换策略 ≤ 90 天

所有 API key、vault root token、CI/CD 凭证。尽可能自动轮换，手动轮换则记录和跟踪。

### 密钥扫描

- **TruffleHog**——对 commit 运行正则 + 熵扫描。
- **GitGuardian**——商业产品，准确率高。
- **Gitleaks**——OSS，在 CI 中运行。

每次 commit 都运行。若发现新密钥，阻止 PR。

### 零信任立场

- 所有账户必须 MFA。
- 通过 SAML/OIDC 使用 SSO。
- 使用 RBAC（基于角色）或 ABAC（基于属性）实现细粒度访问。
- 短期 token（以小时而非天计）。
- 设备状态——仅允许启用磁盘加密的公司设备。

### PII / PHI 清理

在提示词离开基础设施之前：

1. 实体识别（spaCy NER、Presidio、商业产品）。
2. 掩盖匹配实体：`"My SSN is 123-45-6789"` → `"My SSN is [SSN_TOKEN_A3F]"`。
3. 一致 tokenization（Mesh 方法）：相同值映射为同一占位符，让 LLM 保留关系。
4. 可选：对 LLM 响应进行反向映射。

静态正则过滤可捕获基本模式；NER 可捕获更多。两者都要使用。

### 输入 + 输出护栏

输入：阻止已知越狱、禁止主题；按用户限流。

输出：对泄露密钥进行正则清理（API key 模式、拒绝上下文中的邮箱模式），并以分类器检测策略违规。

### 网络出站白名单

LLM 服务位于专用子网：

- 白名单：`api.openai.com`、`api.anthropic.com`、向量数据库端点、vault 端点。
- 其余一切：丢弃。
- DNS 通过仅允许列表的解析器（避免 DNS 隧道外泄）。

### 审计日志

每次 LLM 调用的不可变日志包括：

- 时间戳。
- 用户 / 租户。
- 提示词哈希（为隐私而非原始提示词）。
- 模型 + 版本。
- Token 计数。
- 成本。
- 响应哈希。
- 任意护栏触发。

按监管要求保留（SOC 2 为 1 年，HIPAA 为 6 年）。

### 2026 年 Vercel 事故

供应链攻击：被入侵的 CI/CD 凭证从数千个客户部署中外泄 env var。教训：CI/CD 凭证等同生产凭证。保存在 vault 中，收窄作用域，积极轮换。

### 应当记住的数字

- 轮换策略：≤ 90 天。
- 每次 commit 扫描：TruffleHog / GitGuardian / Gitleaks。
- Vercel 2026：CI/CD 凭证被入侵 → 数千个客户 env var 泄露。
- 审计日志保留：SOC 2 = 1 年，HIPAA = 6 年。

```figure
i4-vault-rotation
```

## 使用

`code/main.py` 实现具有一致 tokenization 的玩具 PII 清理器和仅追加审计日志。

## 交付

本课产出 `outputs/skill-llm-security-plan.md`。给定监管范围和当前状态，它会规划 vault 迁移、清理器、出站规则和审计日志。

## 练习

1. 运行 `code/main.py`。发送两个引用同一 SSN 的提示词，确认二者得到相同占位符。
2. 为一个调用 OpenAI + Anthropic + Weaviate 的 EKS 上 vLLM 部署设计网络出站策略。
3. 你在 git 历史中发现一个 key（两年前）。正确响应是什么——轮换 key、清理历史，还是两者？说明理由。
4. 审计日志每天增长 10 GB。设计保留层（热 30 天、温 12 个月、冷 6 年）。
5. 请论证反向 tokenization（将真实值重新替换进 LLM 响应）相对于保持占位符可见，是否值得复杂度。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| Vault | “密钥存储” | 集中式凭证管理服务 |
| IAM role | “基于身份的认证” | 应用承担的角色；返回短期凭证 |
| 面向 CI/CD 的 OIDC | “云签发 token” | CI 中没有静态 key——通过 OIDC 获得身份 |
| TruffleHog / GitGuardian / Gitleaks | “密钥扫描器” | commit 时检测密钥 |
| RBAC / ABAC | “访问控制” | 基于角色与基于属性 |
| PII 清理 | “数据掩盖” | 移除或 token 化敏感实体 |
| 一致 tokenization | “稳定占位符” | 相同值每次映射为同一 token |
| Mesh 方法 | “Mesh tokenization” | 保留语义的 tokenization 模式 |
| 出站白名单 | “出站允许列表” | 只能访问获准域名 |
| 审计日志 | “不可变历史” | 用于合规的仅追加记录 |

## 延伸阅读

- [Doppler — Advanced LLM Security](https://www.doppler.com/blog/advanced-llm-security)
- [Portkey — Manage LLM API keys with secret references](https://portkey.ai/blog/secret-references-ai-api-key-management/)
- [Datadog — LLM Guardrails Best Practices](https://www.datadoghq.com/blog/llm-guardrails-best-practices/)
- [JumpServer — Secrets Management Best Practices 2026](https://www.jumpserver.com/blog/secret-management-best-practices-2026)
- [Microsoft Presidio](https://github.com/microsoft/presidio) — PII 检测和匿名化。
- [HashiCorp Vault docs](https://developer.hashicorp.com/vault/docs)
