---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/06-devops-troubleshooting-agent/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: d6716091fbc7f7d6ee75c4a90de13f56d98d3f66bd6ab99f488d18ef4619c39f
status: reviewed
---

# 毕业项目 06——面向 Kubernetes 的 DevOps 故障排查智能体

> AWS 的 DevOps Agent 已正式发布，Resolve AI 分享了 K8s playbook，NeuBird 展示了语义监控，Metoro 把 AI SRE 与每个服务的 SLO 连接起来。生产形态已经清晰：告警 webhook 触发后，智能体读取遥测数据，遍历 K8s 对象图，给根因假设排序，并带审批按钮发布 Slack 简报。默认只读，每次修复都必须由人工放行。本毕业项目就是这样的智能体，要在 20 个合成事故上评测，并与 AWS 的 Agent 在三个共同案例上比较。

**类型：** 毕业项目
**语言：** Python（智能体）、TypeScript（Slack 集成）
**前置课程：** 第 11 阶段（LLM 工程）、第 13 阶段（工具与 MCP）、第 14 阶段（智能体）、第 15 阶段（自治系统）、第 17 阶段（基础设施）、第 18 阶段（安全）
**涉及阶段：** P11 · P13 · P14 · P15 · P17 · P18
**用时：** 30 小时

## 问题

2025–2026 年的 SRE 叙事变成了：“AI 智能体分诊事故，人类批准修复。”AWS DevOps Agent、Resolve AI、NeuBird、Metoro 和 PagerDuty AIOps 都在生产环境交付了这种形态。智能体读取 Prometheus 指标、Loki 日志、Tempo trace、kube-state-metrics，以及 K8s 对象知识图谱。它在五分钟内给出带遥测引用的根因假设排序结果，而且没有通过 Slack 的明确人工批准，绝不会执行破坏性命令。

大部分难点不在推理，而在范围控制和安全。智能体需要一个默认只读的 RBAC 面、经过加固的 MCP 工具服务器，以及记录每条“考虑过”和“实际执行”命令的审计日志。它还要知道自己何时超出能力范围并升级处理，同时运行成本要足够低，以免 OOM kill 级联产生 5000 美元的智能体账单。

## 概念

智能体在知识图谱上工作。节点是 K8s 对象（Pod、Deployment、Service、Node、HPA、PVC）和遥测来源（Prometheus 序列、Loki 流、Tempo trace）。边编码所有关系（Pod -> ReplicaSet -> Deployment）、调度关系（Pod -> Node）和观测关系（Pod -> Prometheus 序列）。kube-state-metrics 同步让图保持新鲜，每次告警时都会重新采样。

告警触发后，智能体从受影响对象开始定位根因。它沿边遍历，拉取相关遥测切片（最近 15 分钟），并起草假设。假设依据证据排序：有多少遥测引用支持它、证据有多新、具体程度如何。排名前 3 的假设连同图路径可视化和修复动作审批按钮发送到 Slack。

修复必须经过门控。默认允许的动作是只读操作。破坏性动作（缩容、回滚、删除 Pod）需要 Slack 审批；ArgoCD 回滚钩子需要智能体永远不会持有的认证 token。审计日志记录智能体“考虑过”的每条命令，而不只是执行过的命令，这样审阅过程才能捕获险些发生的事故。

## 架构

```text
PagerDuty / Alertmanager webhook
           |
           v
     FastAPI 接收器
           |
           v
   LangGraph 根因分析智能体
           |
           +---- 只读 MCP 工具 ----+
           |                      |
           v                      v
   K8s 知识图谱              遥测切片
     （Neo4j / kuzu）      Prometheus、Loki、Tempo
   所有权 + 调度             最近 15 分钟，限定范围
           |
           v
   假设排序（证据权重）
           |
           v
   Slack 简报 + 审批按钮
           |
           v（已批准）
   ArgoCD 回滚钩子 / PagerDuty 升级
           |
           v
   审计日志：考虑过 vs 已执行，每条命令
```

## 技术栈

- 可观测性来源：Prometheus、Loki、Tempo、kube-state-metrics
- 知识图谱：Neo4j（托管）或 kuzu（嵌入式），存储 K8s 对象及遥测边
- 智能体：LangGraph，按工具设置允许列表，默认只读
- 工具传输：通过 StreamableHTTP 的 FastMCP；破坏性工具使用独立服务器，并置于审批门之后
- 模型：根因推理使用 Claude Sonnet 4.7，日志摘要使用 Gemini 2.5 Flash
- 修复：ArgoCD 回滚 webhook、PagerDuty 升级、Slack 审批卡片
- 审计：只追加的结构化日志（考虑过、执行过、已批准、结果）
- 部署：带狭窄 RBAC 角色的 K8s deployment；使用独立 namespace

```figure
ce-rootcause-walk
```

## 动手构建

1. **图摄取。** 每 30 秒将 kube-state-metrics 同步到 Neo4j/kuzu。节点：Pod、Deployment、Node、Service、PVC、HPA。边：OWNED_BY、SCHEDULED_ON、EXPOSES、MOUNTS、SCALES。遥测覆盖边：OBSERVED_BY（某个 Pod 被某条 Prometheus 序列观测）。

2. **告警接收器。** 创建接受 PagerDuty 或 Alertmanager webhook 的 FastAPI 端点。提取受影响对象和 SLO 违约信息。

3. **只读工具面。** 通过 FastMCP 包装 kubectl、Prometheus query、Loki logql 和 Tempo traceql。每个工具只有狭窄的 RBAC 动词（get、list、describe）。默认服务器中不得有 delete、exec、scale。

4. **根因分析智能体。** 使用三个节点构建 LangGraph：sample 拉取最近 15 分钟的遥测切片，walk 查询图中的邻近对象，hypothesize 起草带遥测引用的根因候选并排序。

5. **证据评分。** 每个假设的分数 = 新近度 * 特异性 * 图路径长度的倒数 * 引用数量。返回前 3 个。

6. **Slack 简报。** 发布一条附件，包含假设、图路径可视化（在服务器端渲染的子图图像），以及至多一个修复动作的审批按钮。

7. **修复门。** 破坏性工具（缩容、回滚、删除）位于第二个 MCP 服务器，并置于审批 token 后。只有 Slack 卡片获得人工批准后，智能体才能调用它们。

8. **审计日志。** 只追加 JSONL：对每个候选命令记录它是否被考虑、是否执行，以及由谁批准。每天发送到 S3。

9. **合成事故套件。** 构建 20 个场景：OOMKill 级联、DNS 抖动、HPA 震荡、PVC 写满、噪声邻居、故障 sidecar、错误 ConfigMap 发布、证书轮换、镜像拉取退避等。按根因准确率和形成假设所需时间为智能体评分。

## 实际使用

```text
webhook: alert.pagerduty.com -> checkout-api SLO breach, error rate 14%
[graph]   affected: Deployment checkout-api (3 Pods, Node ip-10-2-3-4)
[walk]    neighbors: ReplicaSet checkout-api-abc, Service checkout-api,
           recent rollout 14m ago
[sample]  prometheus error_rate 14%, up-trend; loki 500s on /api/v2/pay
[hypo]    #1 bad rollout: latest image checkout-api:v2.41 fails /healthz
          citations: deploy.yaml (rev 42), prometheus errorRate, loki 500 stack
[slack]   [ROLL BACK to v2.40]  [ESCALATE]  [IGNORE]
          (approval required; agent does not roll back unilaterally)
```

## 交付

交付物是 outputs/skill-devops-agent.md。给定一个 K8s 集群和告警来源，智能体会产生根因假设排序结果，并提供由 Slack 门控的修复流程。

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | 场景套件上的 RCA 准确率 | 20 个合成事故中正确根因的比例 ≥80% |
| 20 | 安全性 | 审计日志中没有 Slack 审批时，破坏性动作防护绝不触发 |
| 20 | 形成假设所需时间 | 从告警到 Slack 简报的 p50 小于 5 分钟 |
| 20 | 可解释性 | 每个假设都有图路径和遥测引用 |
| 15 | 集成完整性 | PagerDuty、Slack、ArgoCD、Prometheus 端到端工作 |
| **100** | | |

## 练习

1. 在 AWS DevOps Agent 演示过的同三个事故上运行你的智能体，发布并排比较，并报告智能体在哪些地方出现分歧。

2. 增加“险些发生”审计：标记智能体考虑过、但如果没有批准就会造成破坏的任何命令。测量一周内的险些发生率。

3. 将假设模型从 Claude Sonnet 4.7 换成自托管的 Llama 3.3 70B。测量 RCA 准确率差值和每个事故的美元成本。

4. 构建因果过滤器：区分相关的遥测峰值和真正的根因。使用 20 个场景的标签训练一个小分类器。

5. 增加回滚 dry-run：在具有相同 manifest 的 staging 集群上执行 ArgoCD 回滚。Slack 审批按钮出现前，在真实集群中验证回滚计划。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| K8s knowledge graph | “集群图” | 节点 = K8s 对象 + 遥测序列；边 = 所有权、调度、观测 |
| Read-only-by-default | “范围化 RBAC” | 智能体服务账户只有 get/list/describe 动词；破坏性动词位于审批之后的独立服务器 |
| Audit log | “考虑过 vs 已执行” | 只追加记录每条候选命令、是否运行、由谁批准 |
| Hypothesis ranking | “证据分数” | 新近度 × 特异性 × 图路径长度倒数 × 引用数量 |
| Slack approval card | “HITL 门” | 带修复按钮的交互式 Slack 消息；人工点击前智能体不能继续 |
| Telemetry citation | “证据指针” | 支持某项主张的 Prometheus 查询、Loki 选择器或 Tempo trace URL |
| MTTR | “恢复时间” | 从告警触发到 SLO 恢复的墙上时间 |

## 延伸阅读

- [AWS DevOps Agent GA](https://aws.amazon.com/blogs/aws/aws-devops-agent-helps-you-accelerate-incident-response-and-improve-system-reliability-preview/)——2026 年的权威参考
- [Resolve AI K8s 故障排查](https://resolve.ai/blog/kubernetes-troubleshooting-in-resolve-ai)——竞品参考
- [NeuBird 语义监控](https://www.neubird.ai)——语义图方法
- [Metoro AI SRE](https://metoro.io)——SLO 优先的生产视角
- [kube-state-metrics](https://github.com/kubernetes/kube-state-metrics)——集群状态来源
- [LangGraph](https://langchain-ai.github.io/langgraph/)——参考智能体编排器
- [FastMCP](https://github.com/jlowin/fastmcp)——Python MCP 服务器框架
- [ArgoCD 回滚](https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/)——门控的修复目标
