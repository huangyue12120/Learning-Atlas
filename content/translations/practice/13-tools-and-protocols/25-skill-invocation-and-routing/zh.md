---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/25-skill-invocation-and-routing/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: f4fa06f11b9425126ba87828fd851254847552c5b73142d6ca5f0ae8c7e056cc
status: reviewed
---

# 技能调用与路由

> 调用先是权威判断，再是相关性判断。好的描述帮助模型选择；好的策略决定这个选择是否获准。

**类型：** 构建
**语言：** Python（标准库）
**前置课程：** Phase 13 · 第 24 课（技能发现与渐进式披露）
**预计时间：** 约 105 分钟

## 学习目标

- 区分用户显式调用、模型隐式调用、应用调用和技能到技能的调用。
- 将人的可见性与模型的可用资格建模为相互独立的策略维度。
- 编写带有正向触发条件和近邻边界的路由描述。
- 在 trace 和测试中分开记录资格、选择、激活、参数绑定和执行。
- 适配运行时专用的调用字段，但不要把它们当成可移植的 frontmatter。

## 问题所在

你安装了一个 `database-migration` 技能。用户可以按名称运行它，但模型也能看到它的描述；当有人提出一般性的数据库问题时，模型可能选择这个技能，于是技能会为本来只需要解释的任务提出 schema 变更。

你增加 `user-invocable: false`，希望阻止人手动运行它；但在另一个运行时中，这个字段可能会被忽略。你再增加 `disable-model-invocation: true`，希望技能完全消失；在理解该字段的运行时中，用户仍然可以显式调用它。

字段名称本身没有错，错在把不同事实混为一谈。“用户能看到它”“模型能选择它”“应用能预加载它”和“其中的工具能执行”是不同事实。一个叫 `invocable` 的布尔值无法表达这些区别。

路由还有第二种失败模式。描述模糊时，多个技能都会显得合理；描述塞满关键词时，无关任务也会触发它们。目录是一个概率式接口：既要足够紧凑，能够装入上下文，又要足够具体，能够完成路由。

## 核心概念

### 五种通道可以启动生命周期

| 行为者 | 调用形式 | 典型用途 | 主要风险 |
|---|---|---|---|
| 人类用户 | 在界面或提示词中点名技能 | 有意选择工作流 | 用户以为宿主会提供它，或授予超出宿主能力的权威 |
| 模型或自主 agent | 根据任务上下文选择目录条目 | 自动执行专家流程 | 误触发路由 |
| 应用 | 通过运行时代码激活或预加载技能 | 固定的产品工作流 | 与某个宿主紧耦合 |
| 另一个技能或子 agent | 将精确技能作为工作流依赖请求 | 组合流程 | 循环、依赖缺失或上下文泄漏 |
| 评测 harness | 在固定场景下激活精确技能 | 可重复测量 | 测试意外绕过了正在研究的生产策略 |

可移植的 Agent Skills 规范定义了包，但没有规定统一的斜杠命令界面、隐式路由标志、应用 API 或子 agent 生命周期。

### 五个调用阶段

```figure
skill-invocation-stages
```

准确使用以下术语：

- **具备资格（Eligible）**：策略允许该行为者请求技能。
- **已选择（Selected）**：用户点名了技能，或路由器判断它与任务相关。
- **已激活（Activated）**：技能指令进入工作上下文。
- **执行中（Executing）**：agent 已在这些指令下开始模型或工具工作。
- **已完成（Completed）**：输出通过了独立的成功检查。

只记录 `skill_used=true` 的 trace 会隐藏真正发生失败的边界。

### 人和模型调用形成 2×2 矩阵

| 人可以调用 | 模型可以调用 | 模式 | 适用示例 |
|:---:|:---:|---|---|
| 是 | 是 | 共享 | 代码解释、测试规划、文档审查 |
| 是 | 否 | 仅人类 | 发布准备、账单导出、破坏性清理计划 |
| 否 | 是 | 仅模型 | 内部风格指南、领域参考、自动支持流程 |
| 否 | 否 | 禁用或仅应用 | 分阶段发布、已弃用包、程序化预加载 |

这个矩阵是策略模型，不是标准 YAML。

某个当前宿主使用 `disable-model-invocation: true` 表示“仅人类”一行，使用 `user-invocable: false` 表示“仅模型”一行；默认值是两者都允许。另一个宿主使用 `agents/openai.yaml` 中的 `allow_implicit_invocation: false`，保留显式调用但关闭隐式选择。这些都是运行时适配器，未知宿主可能忽略它们。

这个容易混淆的细节很重要：`user-invocable: false` 不表示“模型不能使用它”，而是在定义该字段的宿主中移除直接用户调用；`disable-model-invocation: true` 也不表示“技能被禁用”，它只是移除模型发起的选择，同时保留用户显式访问。

### 显式调用以身份为先

显式调用直接提供身份：

```text
/release-readiness v2.4.0
```

或者：

```text
release-readiness check v2.4.0 without publishing
```

当前 Codex 界面文档使用 `/skills` 进行选择，并支持在请求中使用普通技能名称进行显式调用。Claude Code 文档使用 `/skill-name` 以及宿主专用的参数展开。具体语法、菜单可见性、引号规则和变量展开都属于宿主。

显式请求仍然要经过策略。点名技能不应绕过缺失的权限、工作区约束、审批门或运行时隔离。

### 隐式调用以描述为先

隐式路由时，模型最初看到的是目录元数据，而不是完整正文。因此描述就是技能的路由接口。

较弱的描述：

```yaml
description: Helps with releases.
```

过于宽泛的描述：

```yaml
description: Use for release, version, package, build, deploy, publish, tag, changelog, GitHub, CI, or software tasks.
```

有边界的描述：

```yaml
description: Inspect an already prepared release candidate and produce a readiness report. Use when the user asks whether a version, tag, package, or image is ready to publish; do not use for ordinary build failures or feature development.
```

有边界的版本包含：

1. **能力：** 检查已准备好的候选版本。
2. **输出：** 准备就绪报告。
3. **正向边界：** 用户询问发布构件是否准备就绪。
4. **负向边界：** 普通构建失败和功能开发不在范围内。

当相邻技能共享词汇时，负向边界很有用。但它不能替代近邻反例评测。

### 路由是带有弃权选项的分类

对技能 `s` 和请求 `x`，可以想象一个路由分数：

```text
score(s, x) = capability_match + trigger_match + context_match - exclusion_match - ambiguity_penalty
```

具体打分可能由 LLM 判断，而不是算术公式。工程原则仍然成立：选择必须超过阈值，并且胜过竞争技能。当证据不足时，应当弃权。

```figure
skill-routing-abstention
```

即使描述很强，高影响技能也可能不适合隐式路由。当误触发的代价高于自动选择的便利时，应使用仅人类策略。

### 先判断资格，再排序

不要先给所有发现到的技能打分、选择最强匹配，然后才检查该技能的策略。这样会让被阻止的最高分候选错误地阻止本来合格的低分候选。

隐式路由应按以下顺序进行：

1. 根据请求行为者和当前宿主适配器，过滤具备资格的技能。
2. 只给合格候选项打分。
3. 若最强合格候选项超过阈值且满足歧义规则，就选择它。
4. 如果没有合格候选项，或合格分数不够强，就弃权。

假设 `incident-triage` 得分 `0.80`，但其宿主扩展禁止模型调用；`incident-review` 得分 `0.55` 且允许模型调用。路由器应把 `incident-review` 评估为最佳合格候选。它不应先选择 `incident-triage`、拒绝它，然后停止。

这种顺序也能让策略变化不改变相关性分数的含义。资格定义选择集合，相关性在该集合内排序。

### 路由评测必须包含近邻反例

正例可以证明召回率：

```json
{"prompt":"Is version 2.4.0 ready to publish?","expected":"release-readiness"}
```

清晰的负例可以证明基本精确率：

```json
{"prompt":"Explain rotary position embeddings.","expected":null}
```

近邻反例能暴露边界质量：

```json
{"prompt":"Why did today's package build fail?","expected":"build-diagnostics"}
```

这个近邻反例与发布技能共享 `package` 和 `build`，但属于另一种工作流。只由明显正例和完全无关负例构成的路由集会高估质量。

### 参数有三种表示

调用参数会跨过多个边界：

```figure
skill-argument-boundaries
```

在每个边界都要保留意图，但不要把文本当作代码。

- 宿主解析器决定命令语法和引号规则。
- 技能按宿主规则接收绑定后的文本或变量。
- 指令校验必填值和默认值。
- 工具调用把值转换为类型化 schema，并再次校验。

不要把原始参数插入 shell 命令。优先使用带参数数组的脚本，或使用类型化 MCP 工具。

### 应用调用是显式编排

应用可以因为自己的工作流已经知道任务类型，而激活一个技能。例如，pull request 审查服务可以在用户点击 Review 后预加载 `pull-request-risk-review`。

这会消除路由不确定性，但也会产生对运行时 API 的依赖。把这个适配器放在可移植正文之外：

```figure
skill-host-adapter
```

技能本身应当在另一个兼容客户端中打开时仍然容易理解。

### 技能到技能的调用是一条类似工具的边

假设依赖文件发生变化时，`release-readiness` 会请求 `security-change-review`。

调用方应该提供：

- 目标技能身份；
- 有边界的任务和构件路径；
- 预期的响应契约；
- 发起调用的原因；
- 不可用时的回退方案；
- 最大深度或循环规则。

```json
{
  "target_skill": "security-change-review",
  "task": "Review dependency changes in the candidate diff",
  "inputs": ["artifacts/release.diff"],
  "expected": "risk-report.json",
  "max_depth": 2
}
```

第二个技能不会被盲目粘贴进第一个技能。宿主决定如何激活它、是否共享上下文、是否在分叉上下文中运行，或是否通过工具结果返回。

### 上下文生命周期由宿主决定

激活后，技能正文可能留在对话中，也可能在压缩期间被总结，或者在委派上下文中运行。工具许可可能只持续一个回合，而指令保留更久。子 agent 可能收到技能，却没有父 agent 的完整历史。

不要编写依赖隐形生命周期假设的技能。把持久输出放进文件或类型化状态，确保重新进入安全，并说明中断后必须重新加载什么。

```markdown
On resume, read `artifacts/release-readiness.json` if it exists.
Revalidate the candidate commit before continuing.
Do not repeat an external write whose idempotency key is already recorded.
```

## 动手构建

`code/main.py` 将策略与路由实现为分离的适配器。

模型包括：

- `Actor`：表示人类、模型、自主 agent、应用、技能和 harness 调用方；
- `SkillMetadata`：表示路由身份；
- `InvocationPolicy`：表示人/模型矩阵；
- `InvocationRequest` 和 `InvocationDecision`：表示可追踪的输入和结果；
- `CorePolicyAdapter`：不带宿主扩展的可移植行为；
- `ExtensionPolicyAdapter`：识别运行时字段；
- `build_invocation_matrix(policy)`：生成 2×2 视图；
- `route_request(skills, request, adapter)`：先过滤资格，再相关性排序、选择和拒绝。

运行：

```bash
cd phases/13-tools-and-protocols/25-skill-invocation-and-routing
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

demo 会打印显式人类、隐式模型、自主 agent、应用、技能组合和 harness 通道的矩阵与决策。扩展适配器的结果展示了：先移除被阻止的最高词法匹配，再对合格替代项排序。它还包含精确名称 allowlist。不需要模型 API。这个确定性路由器的目的是让策略边界可检查，而不是声称词法匹配能够复现生产模型的路由。

### 为什么核心适配器和扩展适配器要分开

如果一个解析器为每个看到的 frontmatter 字段都赋予含义，它就会悄悄把运行时约定提升成伪标准。分离的适配器迫使调用方明确当前启用了哪些宿主语义。

`CorePolicyAdapter` 只使用应用提供的策略；`ExtensionPolicyAdapter` 只识别显式列出的宿主字段，并记录哪个字段改变了决策。

## 使用

发布技能前先写调用契约：

```yaml
actors:
  human: allow
  model: deny
  application: allow
  skill: deny
explicit_name: release-readiness
arguments:
  candidate: required
  publish: fixed_false
ambiguity: ask_user
missing_dependency: stop
context:
  durable_state: artifacts/release-readiness.json
  max_composition_depth: 2
```

这个契约是适配器和测试的设计文档。除非某个标准明确采用它，否则它不是可移植的 `SKILL.md` frontmatter。

## 交付

本课产出 `skill-invocation-router` 包。它包含调用模型参考、示例宿主策略和一个不执行实际工作的 CLI；CLI 会评估一个人类、模型、自主 agent、应用、技能组合或 harness 请求，并返回包含通道、适配器、分数和原因的 JSON 决策。

这个单请求 CLI 是策略探针，而不是完整触发评测。使用第 27 课中的带标签正例和近邻设计，计算混淆矩阵计数、精确率、召回率和多次运行稳定性。

## 练习

1. 创建人/模型矩阵的全部四行，并为每行写一个合法用例。
2. 为 `CorePolicyAdapter` 增加仅应用调用的激活方式。证明人和模型调用方仍会被拒绝。
3. 为部署技能编写十个近邻反例。每条提示都要共享技能词汇，但属于不同工作流。
4. 在前两个路由分数之间增加歧义间隔。间隔太小时返回 `ask`。
5. 为技能到技能请求增加最大组合深度，并检测两个技能组成的循环。
6. 让同一组带标签数据经过核心和扩展适配器。解释每个改变的决策。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 显式调用 | “斜杠命令” | 行为者直接提供技能身份，但仍受策略约束 |
| 隐式调用 | “模型自己选择” | 路由器根据任务上下文，从合格目录元数据中选择 |
| 用户可调用 | “人可以使用” | 宿主专用的菜单或直接调用属性，不是核心字段 |
| 模型可调用 | “agent 可以使用” | 在宿主策略下具备隐式模型选择资格 |
| 调用适配器 | “frontmatter 解析器” | 将宿主字段和 API 映射到声明式策略模型的代码 |
| 近邻反例 | “困难负例” | 形似技能目标输入、但不应触发的请求 |
| 弃权 | “没有选技能” | 证据不足或有歧义时的有意路由结果 |

## 延伸阅读

- [Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)：了解正向触发条件、具体性和评测。
- [Evaluating skills](https://agentskills.io/skill-creation/evaluating-skills)：了解触发和输出评测设计。
- [OpenAI: Build skills](https://learn.chatgpt.com/docs/build-skills)：了解当前 Codex 的显式和隐式调用控制。
- [Claude Code skills](https://code.claude.com/docs/en/skills)：了解一个宿主中的 `user-invocable`、`disable-model-invocation`、参数和委派上下文。
