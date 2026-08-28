---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/24-skill-discovery-and-progressive-disclosure/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 5880cb2e0c0d2bc5e83ad8e6e5633e7645db5f67fefd5c78323ff81ef974bc8c
status: reviewed
---

# 技能发现与渐进式披露

> 技能在加载正文之前就能发挥作用。名称和描述让它进入目录；只有当任务真正需要时，更深层的文件才会进入上下文。

**类型：** 构建
**语言：** Python（标准库）
**前置课程：** Phase 13 · 第 22 课（Agent Skills：可移植契约与运行时边界）
**预计时间：** 约 105 分钟

## 学习目标

- 构建一个文件系统发现流水线，将作用域、校验、冲突策略和目录发布分开。
- 解释三级披露：目录元数据、激活后的指令和任务专用资源。
- 设计引用，使 agent 能直接取得所需细节，而不必加载整个包。
- 将目录空间预算与激活技能的上下文预算分开管理。
- 在技能读取资源时拒绝路径穿越和符号链接逃逸。

## 问题所在

你的 agent 安装了 200 个技能。如果在会话开始时加载每个 `SKILL.md`、引用文件、脚本和模板，当前任务会被无关流程淹没；如果什么都不加载，用户又必须记住精确的文件系统路径。

常见折中方案是目录：先向模型展示每个候选技能的紧凑身份和路由描述，选中之后再加载正文。这又带来两个工程问题。

第一，发现不只是递归搜索文件。技能可能位于项目、用户、管理员、插件或内置作用域；两个包可能重名；符号链接可能指向不受信任的根目录之外；格式错误的包还可能耗尽目录空间，或根本无法调用。

第二，渐进式披露可能变成渐进式混乱。如果 `SKILL.md` 只说“读取相关指南”，而包里有十二份指南，模型就必须猜。如果每份指南又指向三个文件，加载过程会变成无界的图遍历。

好的运行时让发现过程具有确定性，也让披露过程有明确意图。

## 核心概念

### 发现是一条编译器流水线

把文件系统视为源输入。不要直接把原始路径发布给模型。

```figure
skill-discovery-pipeline
```

每个阶段都应该产生结构化数据和结构化失败信息。发现日志应该能回答：

- 搜索了哪些根目录？
- 找到了哪些候选项？
- 哪些候选项被拒绝，原因是什么？
- 冲突中哪个包胜出？
- 哪些目录条目因为预算被缩短或省略？

没有这些证据，“模型没有使用我的技能”几乎无法诊断。

### 作用域是运行时策略

可移植规范定义的是技能包，而不是某一种统一的安装路径或优先级顺序。宿主决定去哪里搜索。

一个通用运行时可能使用以下作用域：

| 作用域 | 示例根目录 | 预期所有者 |
|---|---|---|
| 工作区 | `<repo>/.agents/skills/` | 项目维护者 |
| 用户 | `<user-data>/skills/` | 单个开发者 |
| 管理员 | `<system>/skills/` | 机器或组织策略 |
| 插件 | 已签名的插件包 | 插件发布者和安装器 |
| 内置 | 运行时包 | 运行时供应商 |

截至 2026 年 8 月，Codex 文档描述了从 `$CWD/.agents/skills` 开始、沿祖先目录搜索直到仓库根目录，并加上用户、管理员和内置位置的项目发现方式。它支持符号链接的技能目录。重名技能可能同时出现，而不是被合并。这些是 Codex 的行为，不是 `SKILL.md` 的规范要求；编写适配器时请核对最新的 [Codex 技能文档](https://learn.chatgpt.com/docs/build-skills)。

不要从目录名称臆造优先级。把它声明为策略并进行测试。本课实验为每个 `Scope` 使用显式整数排名，让同一组候选项每次都得到相同结果。

### 冲突时需要超越 `name` 的身份

两个名为 `release-readiness` 的包可能都是合法的：一个可能是工作区覆盖，另一个可能是用户默认包。因此目录条目至少需要包含：

```json
{
  "name": "release-readiness",
  "description": "Inspect a release candidate for this repository.",
  "scope": "workspace",
  "source": "/repo/.agents/skills/release-readiness",
  "selected": true
}
```

常见的冲突策略包括：

| 策略 | 优点 | 风险 |
|---|---|---|
| 保留每个候选项 | 不隐藏任何内容 | 模型会看到有歧义的名称 |
| 最高优先级作用域胜出 | 简单 | 本地包可能遮蔽受信任的包 |
| 拒绝重复项 | 不会静默遮蔽 | 合法覆盖也会停止工作 |
| 按来源限定名称 | 身份明确 | 面向用户的名称会变长 |

为宿主选择一种策略。即使被遮蔽或被排除在模型目录之外，也要在诊断信息中保留候选项。

### 三级披露

Agent Skills 规范描述了分阶段加载。关键在于每一级都有不同目的。

```figure
skill-disclosure-levels
```

#### 第 1 级：目录元数据

模型需要足够的信息来把这个技能与相邻技能区分开。规范估计每个目录条目大约需要 100 个 token，但实际序列化方式和分词成本属于宿主。

一个有用的描述包含两个子句：

```yaml
description: Validate a release candidate and produce a readiness report. Use when the user asks whether a version, tag, or package is ready to publish.
```

第一句说明能力，第二句说明触发边界。第 25 课会用正例和近邻反例评估这个边界。

#### 第 2 级：激活后的指令

激活后，正文应该同时是一张地图和一套流程。规范建议将 `SKILL.md` 控制在 500 行以内；这是一项设计信号，不是必须填满的目标。

正文应该包含：

- 任务边界；
- 默认工作流；
- 分支条件；
- 指向更深层文件的直接引用；
- 工具和脚本契约；
- 失败与停止行为；
- 预期输出及其验证方式。

不要为了让入口文件变短，就把核心工作流搬进引用文件。激活时必须给模型足够的上下文，让它能正确开始工作。

#### 第 3 级：支持资源

引用文件提供文字或数据；脚本提供确定性计算；资源文件应被复制、填充或转换为交付物，而不是被当作指令。

| 目录 | 模型会读取？ | 模型会执行？ | 典型内容 |
|---|:---:|:---:|---|
| `references/` | 是，按需 | 否 | schema、策略、领域指南 |
| `scripts/` | 可以检查 | 通过获准工具执行 | 校验器、转换器、采集器 |
| `assets/` | 有用时才读 | 否 | 模板、fixture、图片 |

这些名称只是约定，并不自动赋予能力。宿主仍然需要提供文件访问和执行工具。

### 分支专用引用优于主题堆砌

把入口文件写成决策地图：

```markdown
## Choose the path

- For a Python package, read `references/python-release.md`.
- For a container image, read `references/container-release.md`.
- For a documentation-only release, read `references/docs-release.md`.
- If the release combines artifact types, read only the guides for those artifacts.
```

这样每个引用都有可观察的加载条件。“读取 `references/` 获取更多信息”则没有。

保持引用图浅层。官方指南建议从 `SKILL.md` 直接链接，并避免深层链路。一跳引用更容易测试可达性，也能降低某项必要约束始终无法进入上下文的风险。

```figure
skill-reference-map
```

### 目录预算与激活上下文是两种预算

设 `c_i` 是技能 `i` 序列化后的目录成本，`B_c` 是目录预算，`b_j` 是激活正文成本，`r_k` 是实际加载的资源成本：

```text
catalog_cost = sum(c_i for every published skill)
active_cost = sum(b_j for every activated skill) + sum(r_k for every disclosed resource)
```

减少一种预算不会自动减少另一种。简短描述可以节省目录空间，但一个激活后仍有 900 行的正文依然会压垮任务。只有在运行时确实避免加载无关分支时，把正文拆进引用文件才会减少激活成本。

如果上下文窗口大小已知，当前 Codex 会把初始技能列表预算设为上下文窗口的 2%。只有在不知道窗口大小时，8000 字符才是回退值；它不是与 2% 规则叠加的第二个上限。目录超过适用预算时，描述可能被缩短或条目被省略。请把这些数字视为当前 Codex 策略，而不是 Agent Skills 标准的固有属性。

### 资源路径是信任边界

技能应该只读取自己包内的文件。单纯的字符串前缀检查并不够：

```text
references/../../../../.ssh/config
references/external-link -> /private/company-secrets
```

用文件系统语义解析包根和候选路径，拒绝绝对输入，并确认解析后的候选项仍位于根目录之下。提前决定是否允许符号链接；如果允许，每次都检查解析后的目标。

```figure
skill-resource-containment
```

路径包含关系不能证明内容可信。包内的合法引用仍可能包含恶意指令。第 26 课会处理这类威胁。

### 加载过程必须可观察

记录披露事件，但不要记录秘密：

```json
{
  "event": "skill.resource.loaded",
  "skill": "release-readiness",
  "resource": "references/python-release.md",
  "reason": "candidate contains pyproject.toml",
  "bytes": 2840
}
```

加载原因让上下文选择变成可审查的证据，也能帮助发现那些让 agent “以防万一”加载每个文件的指令。

## 动手构建

`code/main.py` 构建一个确定性的发现与披露引擎。

发现部分包括：

- `Scope`：记录来源与优先级元数据；
- `SkillCandidate`：未校验的文件系统候选项；
- `discover_scope(scope)`：枚举直接子级技能目录；
- `resolve_collisions(candidates, precedence)`：应用声明的冲突策略；
- `CatalogEntry` 和 `build_catalog(...)`：发布有边界的元数据；
- `CatalogBudget`：核算序列化条目，而不假装字符数等于通用 token 数。

披露部分包括：

- `load_skill_body(entry, ...)`：执行第 2 级激活；
- `validate_reference(skill_dir, reference)`：检查路径包含关系；
- `load_reference(...)`：执行有界的第 3 级读取。

运行实验：

```bash
cd "$(git rev-parse --show-toplevel)"
cd phases/13-tools-and-protocols/24-skill-discovery-and-progressive-disclosure
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

这段命令要求本地存在课程仓库，并会从本地 clone 的任意子目录解析仓库根目录。

demo 会创建临时的项目和用户作用域，插入一次冲突，在刻意设置得很小的预算下构建目录，激活一个技能，并分别尝试读取合法引用和穿越路径。不会安装任何永久文件。

### 为什么发现是浅层的

`discover_scope` 只检查直接子目录中的 `SKILL.md`。它不会递归地把每个嵌套的 `SKILL.md` 都当作独立包。这样可以保持包边界，避免意外发布安装技能内部的示例或 fixture。

### 为什么实验不解析任意 YAML

实验只支持目录所需的简单 frontmatter。生产运行时应使用安全的 YAML 解析器、显式 schema、大小限制，并禁用自定义对象构造。“仅用标准库”是教学约束，不是默许无声地发明一套不完整 YAML 方言。

## 使用

将以下清单应用到任何发现适配器：

1. 列出每个配置根目录以及谁能写入它。
2. 说明是否允许符号链接技能包。
3. 校验包名、目录名、必需元数据和入口正文大小。
4. 在内部身份中保留来源和作用域。
5. 声明并测试重复名称的处理方式。
6. 测量实际发给模型的序列化目录。
7. 记录正文或资源为何被加载。
8. 让资源读取保持在解析后的包根目录内。
9. 引用缺失时清晰失败。
10. 安装或策略发生变化时重建目录。

## 交付

本课产出 `skill-catalog-builder` 包。它扫描按顺序声明的根目录，拒绝符号链接入口文件和名称不匹配的目录，解析跨作用域冲突，并让选中的元数据适配入口、描述和序列化字符预算。

其 JSON 报告包含选中的条目、被遮蔽的候选项、省略的条目、校验错误、优先级和预算使用情况。正文加载和引用加载仍是独立的运行时操作，因此目录构建器不会执行脚本，也不会把整个包一次性放进上下文。

## 练习

1. 增加插件作用域，并把它放在用户作用域和内置作用域之间。用测试证明冲突结果。
2. 将冲突策略从“最高优先级胜出”改为限定名称。保留两个条目在目录中。
3. 为 `load_reference` 增加字节大小限制。测试恰好达到上限和超过一个字节的情况。
4. 创建两个听起来几乎相同的描述。重写它们，使触发边界不重叠。
5. 增加一个包含每个引用和脚本哈希的 manifest，在加载前检测资源是否被修改。
6. 让 demo 分别报告第 1、2、3 级的字节数。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 技能发现 | “找到每个 SKILL.md” | 搜索配置作用域、校验包、附加来源信息并应用策略 |
| 技能目录 | “已安装技能列表” | 面向模型的、供合格包路由使用的紧凑元数据 |
| 冲突策略 | “哪个重复项胜出” | 针对不同来源同名候选项的声明式规则 |
| 渐进式披露 | “延迟加载” | 从目录到正文再到分支专用资源的分阶段上下文准入 |
| 引用图 | “技能链接的文件” | 可到达的资源结构及其加载条件 |
| 路径包含 | “留在文件夹里” | 确认解析后的资源目标仍处于解析后的包根目录内 |

## 延伸阅读

- [Agent Skills specification](https://agentskills.io/specification)：了解包形状和渐进式披露层级。
- [Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)：了解目录路由元数据。
- [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices)：了解直接引用和入口文件大小。
- [OpenAI: Build skills](https://learn.chatgpt.com/docs/build-skills)：了解当前 Codex 的发现作用域和目录限制。
