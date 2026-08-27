---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/33-instructions-as-executable-constraints/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 6ba9752ebfeb92b1a187a7cbace37940438fb57ad11f5518e8688195b5796f6a
status: reviewed
---

# 将智能体指令写成可执行约束

> 用散文写出的指令只是愿望。用约束写出的指令就是测试。工作台把每条规则变成智能体可以在运行时检查、审阅者可以事后验证的东西。

**类型：** 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 32 节（最小工作台）
**用时：** 约 50 分钟

## 学习目标

- 区分路由说明与操作规则。
- 将启动规则、禁止操作、完成定义、不确定性处理和审批边界表达为机器可检查的约束。
- 实现一个规则检查器，依据规则集为一次运行评分。
- 让规则集便于 diff，使审阅能够看出发生了什么变化。

## 问题所在

典型的 `AGENTS.md` 读起来像入职文档。它告诉智能体要“谨慎”“彻底测试”“不确定时先询问”。三天后，智能体交付了没有测试的改动，写入了禁止目录，而且从不提问，因为它根本不知道边界在哪里。

当指令具有操作性时，它们很强；当指令只是愿望时，它们很弱。解决办法是编写工作台能够解释、审阅者能够评分的规则。

## 核心概念

规则应放在 `docs/agent-rules.md` 中，与简短的根路由器分开。每条规则都有名称、类别和检查项。

```mermaid
flowchart LR
  Router[AGENTS.md] --> Rules[docs/agent-rules.md]
  Rules --> Checker[rule_checker.py]
  Checker --> Report[rule_report.json]
  Report --> Reviewer[审阅者]
```

### 覆盖大多数规则的五个类别

| 类别 | 规则回答的问题 | 示例 |
|----------|---------------------------|---------|
| 启动 | 工作开始前必须满足什么？ | “状态文件存在且是最新的” |
| 禁止 | 什么事情绝不能发生？ | “不要编辑 `scripts/release.sh`” |
| 完成定义 | 什么能证明任务完成？ | “pytest 退出码为 0 且验收行通过” |
| 不确定性 | 不确定时智能体该做什么？ | “创建问题笔记，而不是猜测” |
| 审批 | 什么需要人工批准？ | “任何新依赖、任何生产环境写入” |

不属于这五类的规则，通常应该拆成两条规则。强制拆分。

### 规则是机器可读的

每条规则都有一个 slug、一个类别、一行描述，以及一个 `check` 字段；该字段命名 `rule_checker.py` 中的函数。增加规则就意味着增加检查项；检查器会随着工作台一起增长。

### 规则便于 diff

规则在一个 Markdown 文件中按标题一条一条存放。重命名会在 diff 中显现。新规则放在所属类别的顶部。过期规则要删除，而不是注释掉，因为工作台是真实来源，不是团队对上季度感受的聊天日志。

### 规则与框架防护栏的区别

框架防护栏（OpenAI Agents SDK guardrails、LangGraph interrupts）在运行时层面执行规则。本节的规则集是人类可读、可审阅的契约，由这些防护栏实现。两者都需要：运行时在回合期间捕获违规，规则集证明运行时执行的是正确规则。

### 渐进披露：一张地图，而不是一部百科全书

`AGENTS.md` 之所以不断变长，是因为每次事故都会新增一条规则，却没有事故会删除一条规则。一年后，文件有两千行，智能体读完第一屏就用尽注意力预算，只按被告知内容的一小部分行动。巨型指令文件失败的原因，与四十页入职文档失败的原因相同：读者快速浏览一次，之后再也不会回到真正重要的部分。

文件应分层组织。根路由器保持足够小，让每次会话都能阅读，并且只放指针。深度放在主题文件中，只有任务触及对应主题时智能体才加载它。给智能体一张地图，而不是整部百科全书，让它走到需要的那一页。

```text
AGENTS.md                  # 路由器，< 50 行：本代码库是什么、去哪里查、5 条硬规则
docs/
  agent-rules.md           # 完整规则集（本节）
  architecture.md          # 任务触及模块边界时加载
  testing.md               # 任务写入或运行测试时加载
  deploy.md                # 仅发布工作加载，并由审批规则控制
feature_list.json          # 待办列表（第 14 阶段 · 第 36 节）
```

| 层级 | 存放位置 | 何时读取 | 大小预算 |
|------|----------|----------|----------|
| 路由器 | `AGENTS.md` | 每个会话，始终读取 | 少于约 50 行 |
| 规则 | `docs/agent-rules.md` | 每个会话，启动时读取 | 每个类别一屏 |
| 主题文档 | `docs/<topic>.md` | 只有任务触及该主题时 | 需要多深就多深 |

两个测试能让分层保持诚实。可达性测试：智能体从路由器出发，最多经过两跳就应能找到任意规则，因此路由器必须按路径链接每个主题文档，而不是用散文描述它。新鲜度测试：路由器要短到让审阅者每次 PR 都能重读；这才是阻止它悄悄长回被替代百科全书的唯一办法。一个不再解析的指针，比缺少一条规则更糟，因此路由器中的断链本身就是启动检查违规。

```figure
wb-rule-checkoff
```

## 动手构建

`code/main.py` 会提供：

- 能把规则加载进 dataclass 的 `agent-rules.md` 解析器。
- `rule_checker.py` 风格的检查函数，每个 `check` 引用对应一个函数。
- 一个违反两条规则的演示智能体运行，以及能够捕获这些违规的检查过程。

运行：

```text
python3 code/main.py
```

输出包括解析后的规则集、运行轨迹、每条规则的通过/失败结果，以及保存在脚本旁边的 `rule_report.json`。

## 现实中的生产模式

三个模式把能维持一个季度的规则集，与一周就开始腐烂的规则集区分开来。

**在写入时标注严重级别。** 每条规则都带有 `severity`：`block`、`warn` 或 `info`。检查器会报告三种级别；运行时只在 `block` 时拒绝。大多数团队早期会把严重级别定得过高，然后在截止日期压力下悄悄削弱它；在写入时标注会迫使团队预先校准。将它与验证门（第 14 阶段 · 第 38 节）配合，任何对 `block` 规则的覆盖都会被签入 `overrides.jsonl` 审计日志。

**把规则过期作为强制机制。** 每条规则都带有 `expires_at` 日期（默认是从创建日起 90 天）。如果一条未过期规则连续 60 天零违规，检查器就发出警告；下一个季度审阅要么说明保留理由，要么将它弱化为 `info`，要么删除它。Cloudflare 的生产 AI Code Review 数据（2026 年 4 月，30 天内覆盖 5,169 个代码库的 131,246 次审阅运行）显示，明确设置过期时间的规则集每个代码库少于 30 条；没有过期时间的规则集增长到 80 条以上，而且大多数从未触发。

**Markdown 作为源文件，JSON 作为缓存。** `agent-rules.md` 是作者维护的文件；`agent-rules.lock.json` 是检查器在热路径上读取的缓存。锁文件由 pre-commit hook 重新生成。Markdown diff 便于审阅；JSON 解析不会发生在每一轮中。这与 `package.json` / `package-lock.json` 和 `Cargo.toml` / `Cargo.lock` 是同一种形状。

## 实际使用

在生产环境中：

- Claude Code、Codex、Cursor 在会话开始时读取规则，并在拒绝操作时引用规则。检查器在 CI 中重新运行这些规则，捕获静默漂移。
- OpenAI Agents SDK guardrails 将相同的检查注册为输入和输出防护栏。Markdown 是文档面；SDK 是运行时面。
- LangGraph interrupts 会在运行中的节点违反规则时触发。中断处理器读取规则，询问人类，然后恢复运行。

规则集可以在三者之间移植，因为它不过是 Markdown 加函数名。

## 交付

`outputs/skill-rule-set-builder.md` 会访谈项目所有者，将他们已有的散文式指令分类为五个类别，并生成带版本的 `agent-rules.md` 以及检查器桩代码。

## 练习

1. 如果你的产品确实需要，增加第六个类别。说明为什么它不能归入五个已有类别中的任何一个。
2. 扩展检查器，让规则可以携带严重级别（`block`、`warn`、`info`），并据此聚合报告。
3. 把检查器接入 CI：如果最新智能体运行中有一条 `block` 级别规则失败，就让构建失败。
4. 给每条规则增加一个“过期”字段。连续 90 天没有检查失败后，将规则列入审阅范围。
5. 找一份真实的 `AGENTS.md`，把它改写成五类规则。其中有多少行是操作性的？有多少行只是愿望性的？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Operational rule（操作规则） | “真正的指令” | 工作台能在运行时检查的规则 |
| Aspirational rule（愿望规则） | “要小心” | 没有检查项的规则；要么删除，要么升级 |
| Definition of done（完成定义） | “验收” | 证明任务完成的客观、由文件承载的证据 |
| Block severity（阻断级别） | “硬规则” | 违规会停止运行；没有操作员不能静默绕过 |
| Rule expiry（规则过期） | “清理陈旧规则” | 在 N 天内没有失败的规则，进入退休审查 |

## 延伸阅读

- [OpenAI Agents SDK guardrails](https://openai.github.io/openai-agents-python/guardrails/)
- [LangGraph interrupts](https://langchain-ai.github.io/langgraph/how-tos/human_in_the_loop/breakpoints/)
- [Anthropic，Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [Rick Hightower，Agent RuleZ: A Deterministic Policy Engine](https://medium.com/@richardhightower/agent-rulez-a-deterministic-policy-engine-for-ai-coding-agents-9489e0561edf)——生产环境中的 block/warn/info 严重级别
- [Cloudflare，Orchestrating AI Code Review at Scale](https://blog.cloudflare.com/ai-code-review/)——13.1 万次审阅运行，规则组合经验
- [microservices.io，GenAI development platform — part 1: guardrails](https://microservices.io/post/architecture/2026/03/09/genai-development-platform-part-1-development-guardrails.html)——规则与 CI 之间的纵深防御
- [Type-Checked Compliance: Deterministic Guardrails (arXiv 2604.01483)](https://arxiv.org/pdf/2604.01483)——以 Lean 4 作为“规则即检查”的上界
- [logi-cmd/agent-guardrails](https://github.com/logi-cmd/agent-guardrails)——合并门实现：范围、变更测试、违规预算
- 第 14 阶段 · 第 32 节——这套规则集所嵌入的最小工作台
- 第 14 阶段 · 第 38 节——消费规则报告的验证门
- 第 14 阶段 · 第 39 节——为规则合规性评分的审阅者智能体
