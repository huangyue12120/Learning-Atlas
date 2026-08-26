---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/22-skills-and-agent-sdks/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: adc5ec9cd045c954ade287b53453397cfaf3c1152024d5cf01f896b80f4ff2b6
status: reviewed
---

# Agent Skill：可移植契约与运行时边界

> Skill 不是换了个好文件名的长提示词，而是一个可发现的指令、资源和可执行辅助工具包，通过运行时契约进入 agent 上下文。

**类型：** 构建
**语言：** Python（标准库）
**前置课程：** Phase 13 · 第 01 课（工具接口）、Phase 13 · 第 05 课（工具 schema 设计）
**预计时间：** 约 90 分钟

## 学习目标

- 定义 agent skill，同时不把它和提示词、仓库指令、工具、hook、子 agent 或插件混为一谈。
- 阅读可移植的 `SKILL.md` 契约，并把它与运行时特有扩展分开。
- 将发现、选择、激活、资源加载、工具使用和验证解释为不同生命周期阶段。
- 在运行时把 skill 放入 agent catalog 之前验证 skill 包。
- 针对具体任务，在 skill、MCP 工具、hook、子 agent 和普通代码之间做选择。

## 十分钟首次成功

先完成这段，再读后面的长篇解释。你会创建一个小 skill，把完整的 reviewer bundle 安装到真实 agent 宿主中，调用它，验证结果，然后移除它。这个过程用可观察结果证明完整生命周期。

### 真实宿主实验的预检

真实宿主检查点要求 Node.js、`npx`、Python 3、一个支持 skill 的宿主，以及对安装器所选项目或用户范围的写权限。先验证本地命令：

```bash
node --version
npx --version
python3 --version
```

安装前决定要使用的宿主和范围。如果缺少任何条件，就在网站上阅读本课，或继续下面的手动包练习。回退方案能教会契约，但不能证明宿主发现、调用、运行随包脚本或卸载行为。把这些观察标记为 pending。

### 1. 从空工作目录开始

在保存学习工作的任意父目录运行：

```bash
mkdir -p agent-skills-first-run
cd agent-skills-first-run
TARGET_ROOT="$(pwd -P)"
printf 'TARGET_ROOT=%s\n' "$TARGET_ROOT"
ls -A
```

最后一条命令应该不打印任何内容。如果打印出了文件，换一个空目录，让评审边界清晰。

创建第一个 skill 的目录：

```bash
mkdir -p my-first-skill
```

用以下内容创建 `my-first-skill/SKILL.md`：

```markdown
---
name: my-first-skill
description: Turn rough meeting notes into a compact decision record when the user asks to capture a technical decision.
---

# Decision record

Extract the decision, context, alternatives, owner, and next review date.
If the notes do not contain a decision, ask one clarifying question instead
of inventing one.
```

确认文件是在预期目录中创建的：

```bash
test -f my-first-skill/SKILL.md
```

无输出且退出码为 0，表示文件存在。

### 2. 安装完整 reviewer bundle

留在 `agent-skills-first-run` 中运行：

```bash
npx skills add rohitg00/ai-engineering-from-scratch --skill skill-contract-reviewer --full-depth
```

选择你正在使用的 agent 宿主和范围。安装器应列出 `skill-contract-reviewer` 以及写入的目标。由于本课的 skill 是包含 references、脚本和 asset 的嵌套 bundle，所以必须使用 `--full-depth`。

把 `SKILL_ROOT` 设为安装器报告的绝对目录。它必须是包含已安装 `SKILL.md` 的目录，不是课程源目录，也不是当前工作区：

```bash
# Replace the placeholder with the destination printed by the installer.
SKILL_ROOT="$(cd "/absolute/path/to/skill-contract-reviewer" && pwd -P)"
test -f "$SKILL_ROOT/SKILL.md"
printf 'SKILL_ROOT=%s\n' "$SKILL_ROOT"
```

如果 agent 会话已经打开，启动新会话或使用该宿主的 skill rescan 命令。不要假设每个宿主都会热加载 catalog。

### 3. 显式调用

在已安装的 agent 中，以 `agent-skills-first-run` 作为工作目录，使用该宿主支持的语法：

| 宿主 | 显式调用 |
|---|---|
| Codex | `skill-contract-reviewer`，或从 `/skills` 中选择它，然后给出评审请求 |
| Claude Code | `/skill-contract-reviewer` 后跟评审请求 |
| 可移植回退 | `Use skill-contract-reviewer to review the target package.` |

在请求中使用打印出来的 `SKILL_ROOT` 和 `TARGET_ROOT` 绝对值。要求宿主在执行前展开它们并显示精确解析后的命令，而不是依赖进程工作目录的命令：

```text
Use skill-contract-reviewer to review <TARGET_ROOT>/my-first-skill. The installed bundle root is <SKILL_ROOT>. Run python3 <SKILL_ROOT>/scripts/check_skill.py <TARGET_ROOT>/my-first-skill. Before running it, show the fully resolved argv. Return the validation report, selected primitives, and one sentence for each selection. Include the resolved script path, resolved target path, cwd, argv, and exit code as execution evidence.
```

解析后的命令应当是这种形状，且不再包含占位符：

```bash
python3 "/absolute/install/path/skill-contract-reviewer/scripts/check_skill.py" \
  "/absolute/workspace/path/agent-skills-first-run/my-first-skill"
```

成功结果有三个性质：

1. 宿主按名称找到 `skill-contract-reviewer`；
2. reviewer 读取包契约并运行随包提供的验证器；
3. 响应包含样例没有结构错误的验证报告，以及有理由的原语选择。

执行证据还必须写出脚本路径、目标路径、cwd、精确参数向量和退出码。只有流畅的报告而没有这些字段，不能证明随包脚本真的运行过。

如果宿主报告 skill 不可用，检查安装目标，执行一次 rescan 或重启，再重试显式请求。不要为了掩盖安装失败而重写 skill 描述。

### 4. 探测隐式选择

开启新的 agent turn，不点名 skill，输入同一任务：

```text
Review <TARGET_ROOT>/my-first-skill as a reusable agent package and tell me whether its package contract is valid.
```

如果宿主展示被选择的 skill，记录它是否选择了 `skill-contract-reviewer`。如果宿主不展示路由信息，把隐式选择标记为未验证。显式调用是可移植回退。

### 5. 清理

只移除已安装的 reviewer bundle：

```bash
npx skills remove skill-contract-reviewer
```

选择和安装时相同的宿主与范围。rescan 或启动新会话后，显式请求 `skill-contract-reviewer` 应报告它不可用。后续课程还会用到 `my-first-skill`；也可以在完成这条学习路线后删除实验目录。

## 问题所在

假设团队有一条可靠的发布流程：查找已经合并的变更，检查迁移说明，更新 changelog，运行打包命令，并生成评审清单。

把这套流程塞进一个提示词很容易复制，却很难运维。提示词没有稳定身份、发现规则、资源边界、可测试的包形状，也没有回答几个基本问题：谁可以调用？模型何时应该选择它？它能运行哪些脚本？哪些文件可信？上下文压缩后什么还会保留？

另一个极端错误，是把所有可复用指令都当成 skill。仓库约定、确定性自动化、外部工具、事件 hook 和委派 agent 解决的是不同问题。把它们全塞进 `SKILL.md`，会得到一个看似可移植、实际却依赖某个宿主未文档化行为的目录。

第一个工程任务是分类：先决定 artifact 是什么，再决定如何打包。

## 核心概念

### Skill 编码程序性知识

Agent skill 是一个以 `SKILL.md` 为入口的目录。入口文件包含 YAML frontmatter，后面是 Markdown 指令。目录还可以包含 references、scripts 和 assets。

```figure
skill-package-anatomy
```

可部署单元是目录，而不是孤立的 Markdown 文件。复制 `SKILL.md` 却漏掉 references，即使 frontmatter 能解析，也仍是损坏的包。

### 相邻抽象

| Artifact | 主要工作 | 何时加载或运行 | 不应该冒充什么 |
|---|---|---|---|
| Prompt | 塑造一次模型交互 | 应用或用户把它加入上下文时 | 带资源的版本化包 |
| 仓库指令 | 说明一个代码库的长期规则 | 编码运行时进入该范围时 | 可复用任务工作流 |
| Agent skill | 提供可复用的程序性知识 | 显式或隐式激活时 | 硬授权边界 |
| MCP tool | 暴露带类型的远程能力 | 模型或应用调用时 | 详细操作流程 |
| Hook | 在事件发生时运行确定性逻辑 | 声明的事件发生时 | 概率式模型路由 |
| Subagent | 以独立上下文和状态委派工作 | 编排器创建或调用时 | 静态指令包 |
| Plugin | 分发更大的运行时扩展 | 宿主安装或启用时 | 可移植 skill 契约本身 |
| Learned skill library | 保存从经验中学到的行为 | 策略获取既有程序或轨迹时 | 基于标准的 `SKILL.md` 包 |

一个发布 skill 可以告诉 agent 如何检查发布，MCP server 可以暴露发布注册表，hook 可以禁止直接 push，subagent 可以独立审计候选。它们能组合，是因为各自保持了不同职责。

### “Skill”这个词指两个不同概念

研究系统有时把学习到的程序、成功轨迹或环境相关策略片段叫作 skill。agent 可以在探索时创建这些 artifact，按任务相似度检索、执行，并根据反馈修改 skill library。Phase 14 · 第 10 课会构建这种终身学习库。

本小课程中的 Agent Skill 不同：它是带声明式文件系统契约、catalog 元数据、渐进披露、运行时介导调用和宿主控制工具的作者编写包。它可以由 agent 生成或改进，但该格式不要求学习过程。

| 维度 | Agent Skill 包 | Learned skill library |
|---|---|---|
| 主要单元 | `SKILL.md` 目录 | 程序、策略、轨迹或记忆记录 |
| 创建方式 | 编写、生成或整理 | 通常从环境经验中发现 |
| 选择方式 | catalog 描述加运行时策略 | 对任务状态执行检索或策略选择 |
| 执行方式 | 模型遵循指令并调用宿主工具 | 环境运行保存的行为或代码 artifact |
| 可移植性 | 包契约可以跨兼容宿主 | 往往绑定某个环境和动作空间 |
| 评估方式 | 路由、artifact、安全和宿主兼容性 | 奖励、成功率、迁移和库增长 |

两种概念都在封装可复用能力，但不应仅因为名字相同就共享实现层面的断言。

### 可移植核心

Agent Skills specification 要求两个 frontmatter 字段：

```yaml
---
name: release-readiness
description: Inspect a release candidate when the user asks whether a version is ready to publish.
---
```

`name` 是稳定标识符，必须满足规范命名规则并与父目录同名。`description` 既是文档也是路由元数据，应说明 skill 做什么以及什么时候适用。

可移植的可选字段：

| 字段 | 作用 | 可移植性说明 |
|---|---|---|
| `license` | 声明包的许可条款 | 核心规范 |
| `compatibility` | 声明环境要求 | 核心规范 |
| `metadata` | 携带字符串值的扩展数据 | 核心规范 |
| `allowed-tools` | 建议预批准工具 | 实验性；宿主支持情况不同 |

Markdown body 存放操作指令，应定义工作流、决策点、失败行为以及到辅助资源的直接路径。

```markdown
# Release readiness

Use this workflow for a release candidate, not for ordinary development builds.

1. Read `references/release-policy.md`.
2. Run `python3 scripts/inspect_release.py --format json`.
3. Stop if the report contains a blocking failure.
4. Produce the checklist from `assets/release-checklist.md`.
5. Ask for approval before any publish or tag action.
```

### 运行时扩展是第二层

有些宿主接受额外 frontmatter 或伴随配置。这些字段可能有用，但不会自动变得可移植。

| 行为 | 示例宿主扩展 | 可移植核心？ |
|---|---|:---:|
| 从模型路由中隐藏 skill，但保留用户直接调用 | `disable-model-invocation` | 否 |
| 从用户命令菜单中隐藏 skill，但允许模型路由 | `user-invocable` | 否 |
| 在命令菜单中显示参数帮助 | `argument-hint` | 否 |
| 在委派上下文中运行 skill | `context`、`agent` | 否 |
| 固定模型或推理设置 | `model`、`effort` | 否 |
| 注册生命周期自动化 | `hooks` | 否 |
| 在 Codex 中禁用隐式调用 | `agents/openai.yaml` policy | 否 |

把每个扩展当作适配器：没有扩展时核心工作流仍要有效，写清回退方案，并测试消费它的宿主。运行时可能忽略未知字段、拒绝字段，或者保留字段却不实现其行为。

### Frontmatter 是可执行元数据

在读取 skill body 之前，元数据就会改变系统行为：

- 错误的 `name` 可能使发现失败；
- 模糊的 `description` 可能路由错误请求；
- 只给人用的 flag 可能把 skill 从模型 catalog 中移除；
- 工具许可可能改变宿主是否请求授权；
- 上下文设置可能把执行移到独立 agent 会话。

应像评审配置代码一样评审 frontmatter：验证它、版本化它，并把行为纳入 eval。

### Skill 生命周期

```figure
skill-runtime-lifecycle
```

每条箭头都是一个有独立失败模式的边界：

1. **发现：** 在配置位置找到候选包；
2. **验证：** 在加入 catalog 前拒绝格式错误或不安全的包；
3. **编目：** 暴露紧凑的 `name` 和 `description`，而不是整个包；
4. **选择：** 判断 skill 是否相关；
5. **激活：** 把 body 加载到模型可见上下文；
6. **披露：** 只有分支需要时才读取 references 或 assets；
7. **执行：** 在宿主权限和隔离规则下使用工具；
8. **验证：** 独立检查产出的 artifact，而不是相信模型的声称。

把这些阶段合并，会产生错误心智模型。被发现的 skill 不等于已激活；激活的 skill 不等于可以执行它描述的所有动作；获准的工具调用也不等于结果正确。

### Skill 与工具正交

MCP 回答“应用可以调用哪些能力，它们的 schema 是什么？”Skill 回答“agent 应该如何处理这类任务？”

```figure
skill-tool-orthogonality
```

Skill 可以点名工具，但实际能力注册表由宿主拥有。如果工具不存在，skill 应声明回退或清楚失败；绝不能暗示仅写下能力名称就能创建能力。

### Skill 与仓库指令是不同范围

仓库指令描述你已经进入的环境：命令、约定、生成文件和边界。Skill 提供可以跨多个仓库使用的任务程序。

两者同时生效时，当前用户请求和仓库规则约束 skill。通用重构 skill 不能覆盖禁止编辑生成文件的仓库规则。

### Skill 不会导入另一个 Skill

一个 skill 可以指示 agent 调用另一个 skill，但这不是语言级 import。第二个 skill 仍要经过运行时发现、资格判断、激活、权限和上下文处理。

把跨 skill 依赖写成可观察的工作流边：

```markdown
After producing the candidate changelog, invoke the `release-risk-review` skill.
Pass the candidate path and require a blocking or non-blocking verdict.
If that skill is unavailable, stop and report the missing dependency.
```

这样依赖可测试，也给宿主留下执行策略的机会。

## 动手构建

`code/main.py` 实现一个面向标准的验证器和 artifact 选择器，只使用标准库，让每条规则都清晰可见。

验证器提供：

- `parse_frontmatter(text)`：分离元数据和 body；
- `validate_skill_text(text, directory_name, allowed_runtime_extensions=())`：检查必需字段、命名、未知扩展、body 存在性和可移植限制；
- `ValidationIssue` 与 `SkillReport`：返回结构化证据，而不是一个不透明布尔值；
- `FrontmatterSyntaxError`：无法安全解释输入时抛出。

选择器提供 `TaskShape` 和 `select_primitives(task)`，把任务需求映射到普通代码、仓库指令、skill、hook、subagent 或 MCP 工具。

运行实验：

```bash
cd "$(git rev-parse --show-toplevel)"
cd phases/13-tools-and-protocols/22-skills-and-agent-sdks
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

这段命令要求本地有代码克隆，并且可以从该克隆内任意位置开始，让 `git rev-parse --show-toplevel` 解析仓库根目录。

demo 会为一个有效可移植 skill、一个带宿主扩展的 skill、一个无效包和若干任务形状决策打印 JSON。检查 issue code。包验证器应解释如何修复 artifact，而不是替作者猜测。

### 校验顺序很重要

先校验便宜的结构事实，再校验更深层的内容规则：

```figure
skill-validation-order
```

这个顺序可以防止次生错误掩盖第一个坏掉的不变量。

## 使用

写 skill 前先填写这张决策卡：

| 问题 | 如果是 | 可能的原语 |
|---|---|---|
| 是否需要跨多个步骤复用模型判断？ | 流程稳定，但决策会变化 | Skill |
| 是否每次事件触发都必须执行？ | 漏掉一次执行不可接受 | Hook 或应用代码 |
| 模型是否需要带类型输入的外部能力？ | 操作位于模型上下文之外 | Tool 或 MCP server |
| 工作是否需要隔离上下文、状态或所有权？ | 独立 worker 返回有界结果 | Subagent |
| 指导是否只针对一个仓库？ | 描述本地命令和限制 | 仓库指令 |
| 一次交互是否足够？ | 不需要包生命周期 | Prompt |

很多生产工作流会使用多行。决策卡防止一个 artifact 假装拥有所有属性。

## 交付

本课在 `outputs/` 下生成 `skill-contract-reviewer` bundle，包含：

- 评审候选 skill 包的可移植 `SKILL.md`；
- 可移植契约和原语选择的参考清单；
- 确定性验证脚本；
- 覆盖 prompt、skill、tool、hook、普通代码和 subagent 的任务形状 fixtures。

安装完整 bundle，而不只是入口文件：

```bash
cd "$(git rev-parse --show-toplevel)"
python3 scripts/install_skills.py /tmp/aiefs-skills --phase 13 --type skill
```

课程安装器会报告每个复制的 Phase 13 skill，并写入 `/tmp/aiefs-skills/manifest.json`。这个干净目标检查包形状；前面的首次成功循环则检查真实宿主中的发现和调用。

后续课程会分别深入各生命周期阶段：第 24 课构建发现和渐进披露，第 25 课构建调用策略和路由，第 26 课分离权限与沙箱，第 27 课把整个包变成可评估的发布 artifact。

## 练习

1. 用自己团队的五种工作流运行 `TaskShape` 分类。对选择多个原语的每个案例进行辩护。
2. 增加边界测试，证明 500 字符的 `compatibility` 通过，而 501 字符的值作为规范错误失败。
3. 把一个运行时扩展加入 allowlist，写测试证明同一个文件仍能和仅可移植 skill 区分开。
4. 把 400 行提示词拆成 `SKILL.md`、一个 reference、一个脚本契约和一个输出模板，让每个文件只负责一种信息。
5. 为引用了不可用 MCP 工具的 skill 设计失败响应。不要静默替换成权限更宽的工具。
6. 评审一个已有 skill，把每句话标为路由、程序、策略、reference 指针或输出契约。移动不属于当前位置的内容。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| Agent skill | “保存的提示词” | 可发现的程序性指令目录，以及可选资源 |
| 可移植核心 | “所有运行时共有的字段” | Agent Skills specification 定义的契约 |
| 运行时扩展 | “额外 frontmatter” | 需要兼容适配器才能生效的宿主专属配置 |
| 激活 | “skill 运行了” | skill body 进入模型可见上下文；执行可能稍后发生 |
| Skill 依赖 | “导入另一个 skill” | 经过运行时调用、可用性和策略检查的边 |
| 工具契约 | “函数 schema” | 能力的输入、输出、权限、副作用、错误和证据 |

## 延伸阅读

- [Agent Skills specification](https://agentskills.io/specification)：可移植目录和 frontmatter 契约。
- [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices)：范围、指令和资源组织建议。
- [OpenAI：Build skills](https://learn.chatgpt.com/docs/build-skills)：当前 Codex 发现和调用行为。
- [Claude Code skills](https://code.claude.com/docs/en/skills)：一种运行时的调用、参数、工具和委派上下文扩展。
