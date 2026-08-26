---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/17-mcp-gateways-and-registries/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 41e8d73e5467c233a63e24307ca963ce616ef198b728cf8212abd27eb646438c
status: reviewed
---

# MCP 网关与注册表——企业控制平面

> 企业不能让每个开发者随意安装随机 MCP 服务器。网关集中处理认证、RBAC、审计、限流、缓存和工具投毒检测，然后将合并后的工具面作为单一 MCP 端点暴露出来。官方 MCP Registry（由 Anthropic、GitHub、PulseMCP 和 Microsoft 共同维护，并验证名称空间）是权威上游。本课说明网关应处于什么位置，带你走过一个最小实现，并概览 2026 年的供应商生态。

**类型：** 学习
**语言：** Python（标准库，最小网关）
**前置课程：** Phase 13 · 15（工具投毒）、Phase 13 · 16（OAuth 2.1）
**时间：** 约 45 分钟

## 学习目标

- 解释 MCP 网关所处的位置（位于 MCP 客户端与多个后端 MCP 服务器之间）。
- 实现网关的五项职责：认证、RBAC、审计、限流、策略。
- 在网关层执行固定工具哈希清单。
- 区分官方 MCP Registry 与元注册表（Glama、MCPMarket、MCP.so、Smithery、LobeHub）。

## 问题

一家《财富》500 强企业拥有 30 个获批 MCP 服务器、5000 名开发者，以及合规和审计要求；安全团队还希望集中处理策略。让每个开发者在自己的 IDE 中安装任意服务器是不可接受的。

网关模式如下：

1. 网关作为单一 Streamable HTTP 端点运行，开发者连接到它。
2. 网关持有每个后端 MCP 服务器的凭据。
3. 每个开发者请求都通过网关自己的 OAuth 完成认证并确定作用域。
4. 网关将调用路由到后端服务器，并应用策略。
5. 所有调用都记录下来用于审计。

Cloudflare MCP Portals、Kong AI Gateway、IBM ContextForge、MintMCP、TrueFoundry、Envoy AI Gateway 都在 2025–2026 年发布了网关或网关功能。

与此同时，官方 MCP Registry 作为权威上游发布：它收录经过筛选、名称空间验证、使用反向 DNS 命名的服务器，网关可以从中拉取。元注册表（Glama、MCPMarket、MCP.so、Smithery、LobeHub）则聚合多个来源的服务器。

## 概念

### 网关的五项职责

1. **认证。** 使用 OAuth 2.1 识别开发者，并映射到用户角色。
2. **RBAC。** 按用户制定策略：允许使用哪些服务器、工具和作用域。
3. **审计。** 记录每次调用的主体、内容、时间和结果。
4. **限流。** 设置按用户 / 工具 / 服务器的上限，防止滥用。
5. **策略。** 拒绝投毒描述、执行 Rule of Two、清理 PII。

### 网关作为单一端点

对开发者而言，网关看起来像一个 MCP 服务器；内部则将请求路由到 N 个后端。会话 ID（Phase 13 · 09）会在边界处重写。

### 凭据保管

开发者永远看不到后端令牌。网关持有这些令牌（或者代理到负责持有令牌的身份提供商）。在网关上拥有 `notes:read` 的开发者，可以在网关自己的后端凭据下传递式访问 notes MCP 服务器——但这必须受到绑定传递访问的策略约束。

### 网关层的工具哈希固定

网关保存已批准工具描述的清单（SHA256 哈希）。在发现阶段，它获取每个后端的 `tools/list`，将哈希与清单比较，并移除描述发生变化的工具。这是 Phase 13 · 15 中的 Rug Pull 防御在集中层的应用。

### 策略即代码

高级网关使用 OPA/Rego、Kyverno 或 Styra 表达策略。例如，“用户 `alice` 只能对组织 `acme` 中的仓库调用 `github.open_pr`”这样的规则可以声明式编码。简单网关使用手写 Python。两种形状都成立。

### 面向会话的路由

当用户会话包含多个服务器时，网关会进行多路复用：开发者的单个 MCP 会话持有 N 个后端会话，每台服务器一个。任何后端发出的通知都会经过网关路由到开发者的会话。

### 命名空间合并

网关合并所有后端的工具命名空间，通常在冲突时加前缀。结果可能是 `github.open_pr`、`notes.search`。这样路由就不会产生歧义。

### 注册表

- **官方 MCP Registry（`registry.modelcontextprotocol.io`）。** 由 Anthropic、GitHub、PulseMCP 和 Microsoft 共同维护。名称空间已验证（反向 DNS：`io.github.user/server`），并经过基本质量预筛选。
- **Glama。** 以搜索为中心的元注册表，聚合多个来源。
- **MCPMarket。** 偏商业的目录，包含供应商列表。
- **MCP.so。** 社区目录，开放提交。
- **Smithery。** 类似包管理器的安装流程。
- **LobeHub。** 集成在 LobeChat 应用 UI 中的注册表。

企业网关默认从官方 Registry 拉取，允许管理员从元注册表精选补充，并拒绝任何未固定的内容。

### 反向 DNS 命名

官方 Registry 要求公共服务器使用反向 DNS 名称：`io.github.alice/notes`。名称空间可以防止抢注，也让信任委托更清晰。

### 2026 年 4 月供应商概览

| 供应商 | 优势 |
|--------|----------|
| Cloudflare MCP Portals | 边缘托管；集成 OAuth；有免费层 |
| Kong AI Gateway | K8s 原生；细粒度策略；日志发送到 OpenTelemetry |
| IBM ContextForge | 企业 IAM；合规；审计导出 |
| TrueFoundry | 偏 DevOps；指标优先 |
| MintMCP | 面向开发者平台 |
| Envoy AI Gateway | 开源；可定制过滤器 |

Phase 17（生产基础设施）会进一步深入网关运维。

```figure
t3-gateway-funnel
```

## 动手使用

`code/main.py` 提供一个约 150 行的最小网关：用假 Bearer 令牌认证用户，持有逐用户 RBAC 策略，将请求路由到两个后端 MCP 服务器，把每次调用写入审计日志，执行限流，并拒绝任何工具描述哈希与固定清单不匹配的后端工具。

注意观察：

- `RBAC` 字典以 `user_id` 为键，值为允许的 `server_tool` 条目。
- `AUDIT_LOG` 是只追加的事件列表。
- 限流对每个用户使用令牌桶。
- 固定清单是 `server::tool -> hash` 字典。

## 交付物

本课产出 `outputs/skill-gateway-bootstrap.md`。给定一个企业 MCP 计划（用户、后端、合规要求），该 skill 会生成网关配置规范。

## 练习

1. 运行 `code/main.py`。先以允许的用户发起调用，再以不允许的用户发起调用，然后发送一组超过限流的突发请求。验证三条流程。

2. 增加一条策略，在结果返回客户端前清理 PII。用简单的正则处理 SSN 形状的字符串；注意它的缺口（电子邮件、电话号码）。

3. 扩展审计日志，发出 OpenTelemetry GenAI spans。Phase 13 · 20 会介绍准确的属性。

4. 为一个有 50 名开发者、五个后端（notes、github、postgres、jira、slack）的团队设计 RBAC 策略。谁能对每个后端只读？谁能写入？

5. 从头到尾阅读 Cloudflare 的企业 MCP 文章。找出 Cloudflare 提供、但这个标准库网关没有的一项功能。

## 术语

| 术语 | 人们会怎么说 | 它实际表示什么 |
|------|----------------|------------------------|
| 网关 | “MCP 代理” | 位于客户端与后端之间、负责集中处理的服务器 |
| 凭据保管 | “后端令牌留在服务器端” | 开发者看不到上游令牌 |
| 面向会话的路由 | “多后端会话” | 网关在一个开发者会话下复用 N 个后端会话 |
| 工具哈希固定 | “已批准清单” | 每个已批准工具描述的 SHA256；在中央阻止 Rug Pull |
| RBAC | “逐用户策略” | 面向工具和服务器的基于角色的访问控制 |
| 策略即代码 | “声明式规则” | 在网关执行的 OPA/Rego、Kyverno、Styra 策略 |
| 审计日志 | “谁、做了什么、何时做” | 只追加的合规事件日志 |
| 限流 | “逐用户令牌桶” | 防止滥用的每分钟上限 |
| 官方 MCP Registry | “权威上游” | 经过名称空间验证的 `registry.modelcontextprotocol.io` |
| 反向 DNS 命名 | “注册表名称空间” | `io.github.user/server` 约定 |

## 延伸阅读

- [Official MCP Registry](https://registry.modelcontextprotocol.io/)——权威上游，名称空间已验证
- [Cloudflare — Enterprise MCP](https://blog.cloudflare.com/enterprise-mcp/)——带 OAuth 和策略的网关模式
- [agentic-community — MCP gateway registry](https://github.com/agentic-community/mcp-gateway-registry)——开源参考网关
- [TrueFoundry — What is an MCP gateway?](https://www.truefoundry.com/blog/what-is-mcp-gateway)——功能对比文章
- [IBM — MCP context forge](https://github.com/IBM/mcp-context-forge)——IBM 的企业网关
