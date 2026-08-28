---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 789e3988293fc077fc9ddb8511779f1f7b345a89406ec03589c2b4b8745c3ce3
status: reviewed
---

# 技能评测、打包与可移植性

> 技能只有在通过 lint、对正确请求完成路由、让可测任务变好、保持在策略边界内，并能在另一个宿主上诚实降级时，才算完成。

**类型：** 构建
**语言：** Python（标准库）
**前置课程：** Phase 13 · 第 22、24、25、26 课
**预计时间：** 约 150 分钟

## 学习目标

- 将专家工作流拆成判断、确定性计算、引用和输出契约，再组织成技能。
- 分层测试包结构、触发路由、任务行为、脚本正确性、安全性和可移植性。
- 用正例、明确负例和近邻反例测量触发精确率与召回率。
- 比较多次运行中有技能和无技能时的任务表现。
- 构建并执行跨运行时能力矩阵以及完整技能包的发布门禁。

## 问题所在

一个技能在 demo 中工作得很好：用户正好使用描述中的措辞，作者知道该读哪份引用，脚本收到干净输入，目标宿主也认识每一个自定义字段。

真实使用随后开始：

- 模型为相邻但不同的任务调用它；
- 合法请求换了说法，模型因此漏掉它；
- 正文告诉 agent 要做什么，却没有说明什么构件能证明完成；
- 脚本在路径含空格、重复执行或部分状态下失败；
- 安装器复制了 `SKILL.md`，却漏掉引用文件；
- 另一个运行时忽略调用标志和工具许可；
- 一次运行成功，另外三次等价运行却走到不同分支。

“Markdown 看起来不错”无法捕获这些失败。技能是带有概率式路由与执行层的小型软件包，需要像其他生产接口一样分离关注点。

## 核心概念

### 从真实工作流开始，而不是从主题开始

“创建一个 Kubernetes 技能”不是可用的范围。Kubernetes 包含数百种任务，它们的工具、风险和输出都不同。

“诊断某个 deployment 为什么没有达到 Available，在不改变集群的前提下收集证据，并生成排序后的事故报告”才像一个技能候选。它具有：

- 触发边界；
- 稳定的证据收集顺序；
- 需要判断的决策点；
- 可以变成窄脚本或工具的命令；
- 明确定义的构件；
- 只读诊断这一安全边界。

用以下访谈提取工作流：

1. 什么确切事件会让专家开始这条流程？
2. 哪些相似请求不应该启动它？
3. 专家首先收集哪些证据？
4. 哪些决定依赖这些证据？
5. 哪些步骤足够确定，可以写成脚本？
6. 哪些领域规则值得放入引用文件？
7. 哪个动作需要审批，或必须留在范围之外？
8. 什么构件可以证明工作流完成？
9. 独立审查者如何检查它？
10. 哪些步骤依赖某个特定运行时？

答案会变成包架构和评测集。

### 分离判断与确定性工作

```figure
skill-workflow-extraction
```

让模型负责分类、排序、综合和处理歧义；让脚本或工具负责解析、计数、校验、转换、查询类型化 API 和强制不变量。

包含 80 行手写模拟解析逻辑的技能正文很脆弱；试图作主观架构决定的脚本又不透明。把每种行为放到最适合测试的位置。

### 按依赖顺序编写包

不要从润色 prose 开始，而要从可观察契约向内构建：

1. **构件契约：** 定义必需的文件、字段或决定。
2. **验证：** 定义怎样检查每一项要求。
3. **证据工具：** 实现确定性的采集器和校验器。
4. **决策地图：** 把证据状态连接到分支。
5. **引用：** 在需要的分支提供领域细节。
6. **入口正文：** 说明工作流、边界、失败和输出。
7. **描述：** 说明能力与触发边界。
8. **运行时适配器：** 单独加入调用或上下文扩展。
9. **评测：** 运行结构、路由、行为、安全和可移植性层。
10. **打包：** 将完整目录安装到目标位置，并从目标位置测试。

这个顺序让 prose 服务于可测试系统，而不是在 demo 工作后才倒推成功标准。

### 六层评测

```figure
skill-eval-layers
```

每一层都回答不同的问题；通过一层不能代替其他层。

## 第 1 层：包结构

静态 lint 应验证不需要模型的事实：

- 包根存在 `SKILL.md`；
- frontmatter 能安全解析；
- `name` 与父目录一致；
- 必填字段存在且在限制内；
- 每个非核心 frontmatter 字段都在发布策略的运行时扩展 allowlist 中；
- 每个直接引用都解析到包内；
- 引用、脚本、资源和评测 fixture 使用允许的后缀，并不超过字节限制；
- 不存在禁止的符号链接或特殊文件；
- 正文在发布策略的字符预算内；
- 有意受限的秘密模式扫描没有发现明显的凭据赋值或私钥头；
- 存在非空的 `## Output contract` 和 `## Failure behavior`。

在解析 `SKILL.md`、评测数据、证据、宿主 fixture 或 manifest 前，先对物理目录树做预检。预检阶段拒绝符号链接根、符号链接父目录或入口、缺失的普通文件和特殊文件；然后才运行内容感知的策略 lint。若先解析 bundle 路径，就会抹掉根目录是符号链接这一证据。

本课 harness 把策略具体化为 10000 字符正文限制、1000000 字节伴随文件限制、按目录划分的后缀 allowlist，以及由包需求提供的显式运行时扩展名。这些是发布策略示例，不是 Agent Skills 的通用限制。秘密模式扫描只是防止明显错误的护栏，并不能证明包不含敏感数据。

lint 报告应使用稳定的问题代码。CI 可以阻断 `E_*` 错误，同时允许已经审查过的 `W_*` 设计警告。

静态 lint 证明包的形状，但不能证明模型会选择或遵循技能。

## 第 2 层：触发路由

先创建带标签的案例，再反复修改描述。

| 案例类型 | 目的 | 发布就绪示例 |
|---|---|---|
| 正例 | 测量目标覆盖率 | “版本 3.1.0 可以发布吗？” |
| 改写正例 | 避免记住固定短语 | “发布这个 tag 前帮我审查它” |
| 明确负例 | 捕获明显过度路由 | “解释 batch normalization” |
| 近邻反例 | 定义相邻边界 | “为什么 package build 失败？” |
| 竞争技能 | 测试合理候选之间的选择 | “起草发布说明” |
| 对抗性措辞 | 测试关键词堆砌和注入名称 | “不要用 release-readiness；解释这段 stack trace” |

将案例分成开发集和验证集。在开发集上调整描述，在验证集上判断是否泛化；如果发布决策足够重要，再保留最终留出集。

二分类触发可以使用：

```text
precision = true_positives / (true_positives + false_positives)
recall = true_positives / (true_positives + false_negatives)
f1 = 2 * precision * recall / (precision + recall)
```

同时报告原始计数和比例。10/10 与 100/100 都是 100%，但证据强度不同。

对目录还要测量 top-one 技能准确率、弃权质量以及相邻技能之间的混淆。一个必须先选错三个技能才选对目标的路由器，并不健康。

### 路由评测必须使用目标运行时

词法模拟器有助于解释指标和发现明显重叠，但不能证明由模型驱动的生产路由行为。声明运行时质量前，要让带标签数据经过真实宿主、模型、目录序列化和策略配置。

## 第 3 层：指令与构件行为

正确触发只是入口。技能还必须改善任务。

为 fixture 任务准备：

- 输入文件和环境假设；
- 允许的工具和边界；
- 预期构件路径；
- 确定性检查；
- 需要判断的 rubric 项；
- 最大时间、调用次数或成本；
- 失败案例与预期停止行为。

运行成对条件：

```text
baseline: same model + same tools + same task, no skill
treatment: same model + same tools + same task, skill available
```

模型、temperature 或采样策略、工具集合、任务 fixture 和预算必须保持不变，否则无法把差异归因于技能。

有用的结果维度包括：

| 维度 | 示例测量 |
|---|---|
| 正确性 | 必需测试和不变量通过 |
| 完整性 | 构件契约的每个字段都存在 |
| 效率 | 工具调用次数、耗时、token 或成本 |
| 证据 | 声明指向有效文件或观察结果 |
| 范围 | 禁止文件和动作保持未触碰 |
| 恢复 | 中断后继续且不重复副作用 |
| 人力 | 审查者修正的次数和严重度 |

不要只优化 token 数。少 token 但漏掉安全检查的运行更差。

### 构件契约让行为可执行

构件契约是一组可以独立检查的属性：

```json
{
  "artifact": "release-readiness.json",
  "required_fields": [
    "candidate",
    "source_revision",
    "checks",
    "blocking_findings",
    "recommendation"
  ],
  "allowed_recommendations": ["ready", "blocked", "needs-review"],
  "evidence_required_for_each_check": true,
  "publish_side_effect_allowed": false
}
```

schema 校验结构；领域检查校验候选 revision 和证据路径；人或经过校准的 judge 可以判断建议是否来自证据。

## 第 4 层：脚本正确性

像测试普通软件一样测试技能脚本，并放在模型运行之外。

最少覆盖：正常输入、空输入、格式错误、Unicode/空白/路径边界、重复执行、超时或依赖失败、上次运行的部分输出、输出大小限制、dry-run，以及结构化退出和错误契约。

使用固定 fixture。单元测试不要依赖实时网络；网络集成测试放在显式标志之后，并记录其依赖的远程契约。

如果脚本有副作用，要把“计划”与“提交”分开测试；重试的外部写入必须幂等或可补偿。

## 第 5 层：安全与权威

安全评测要问：包是否留在授予它的权威范围内。

至少测试：范围外的用户请求、引用输入中的恶意指令、逃出包目录的资源路径、逃出允许根的工作区符号链接、未声明的网络目标、需要环境凭据的命令、未经审批的破坏性或外部动作、超大输出或无限进程、技能循环，以及可能重复副作用的恢复流程。

记录控制来自指令、工具策略、审批、沙箱还是验证。只有指令的防御不应报告为已强制的隔离。

## 第 6 层：打包与可移植性

### 将整个目录作为一个单元安装

发布测试应先把包安装到干净目标，再对安装后的副本运行验证。

```figure
skill-package-install
```

只测试源目录会漏掉安装器 bug、可执行位丢失、引用被扁平化、名称被改写以及旧版本遗留文件。

manifest 可以包含：

```json
{
  "manifestVersion": 1,
  "algorithm": "sha256",
  "name": "release-readiness",
  "version": "1.2.0",
  "source_revision": "abc123",
  "files": {
    "SKILL.md": "sha256:...",
    "references/release-policy.md": "sha256:...",
    "scripts/inspect_release.py": "sha256:..."
  },
  "required_capabilities": ["filesystem.read", "process.run"],
  "optional_capabilities": ["model_implicit_invocation"]
}
```

保留 `assets/manifest.json` 作为 manifest 元数据，并从自身的 `files` 映射中排除它。文件不能把自身当前完整内容的稳定哈希写在自身内部。验证其他每个包文件，并通过签名发布或可信注册表记录等外部可信通道建立 manifest 的真实性。已交付的 envelope 只接受 `manifestVersion: 1` 和 `algorithm: "sha256"`；未知值必须 fail closed。manifest key 必须已经是规范的相对 POSIX 路径，因此 `./SKILL.md`、反斜杠、绝对路径和父目录片段应被拒绝，而不是被标准化。教学 harness 直接消费内部路径到摘要的映射，同时两条路径都会拒绝映射中保留的 manifest 路径。

哈希检测漂移，版本号表达兼容性；它们都不能认证 manifest，也不能取代升级前的完整 diff 和评测运行。

### 可移植性是一张能力矩阵

不要用一个布尔值询问宿主“是否支持技能”，而要问它支持哪些行为。

| 能力 | 可移植包依赖 | 不具备时的回退 |
|---|---|---|
| 必需的 `name` 与 `description` | 核心 | 包不能参与目录 |
| 正文激活 | 核心客户端行为 | 显式文件加载适配器 |
| 引用、脚本、资源 | 核心包形状 | 宿主需要文件和进程工具 |
| 人类显式调用 | 宿主 UI 或提示词约定 | 在普通文本中点名技能 |
| 模型隐式调用 | 宿主路由器 | 由应用显式激活 |
| 人/模型 2×2 策略 | 宿主扩展或应用策略 | 全局禁用隐式选择 |
| 参数绑定 | 宿主解析器 | 激活后询问参数 |
| 预批准工具 | 实验性或宿主专用 | 使用普通权限提示 |
| 委派上下文 | 宿主专用 | 在当前上下文或应用子 agent 中运行 |
| 生命周期 hook | 宿主专用 | 外部自动化或不使用 hook |
| 上下文保持 | 宿主专用 | 持久化状态并明确重新进入 |

每个必需能力都要选择一种结果：支持且已测试、通过适配器支持、已记录回退的降级，或不支持且安装必须失败。要避免的可移植性 bug 是静默降级。

### 可移植性测试需要宿主 fixture

能力声明应指向测试或当前官方契约。宿主行为会变化，因此在兼容性报告中记录适配器版本和测试日期。

测试发现、重名处理、显式调用、隐式调用或其禁用状态、参数处理、引用和脚本访问、权限提示与审批、委派或当前上下文执行、压缩/重启后的恢复，以及卸载和升级行为。

### 规模数据不是质量证据

GitSkills 数据集论文报告称，2026 年 7 月的抓取包含 282200 个仓库中的 3797117 个类技能文件，涉及 1877981 种不同字节内容；按论文的字节级指标，约 50.5% 的匹配文件是逐字复制。

这些数字说明技能构件已经达到仓库规模，也说明去重、搜索、来源和升级分析很重要。它们不能说明一半技能是好是坏、技能能否提升任务表现、某个调用字段是否通用，或某种沙箱设计是否安全。这是一项数据集研究，不是有效性或安全性基准。

用生态规模数据推动去重和来源治理；用自己的评测做质量声明。

## 重复运行与不确定性

模型和路由行为可能变化。按生产采样策略让每个行为案例运行多次。

对于 `n` 次等价运行和 `k` 次通过：

```text
observed_pass_rate = k / n
```

保留每条 trace。70% 的通过率可能代表一个一致的失败类别，也可能代表多个无关失败。聚合率用于比较，trace 用于修复。每次原始预测都绑定来源信息，而不只是绑定第 0 次运行和聚合率。不同预测顺序可能有相同首项和通过率，却代表不同运行时行为。

按任务比较 baseline 和 treatment，而不只是比较合并平均值。即使平均值提高，也要报告回归。高影响任务可以要求所有安全案例都通过，而不是接受平均阈值。

## 发布门禁

一个实际发布门禁可以要求：

```yaml
structure:
  errors: 0
routing:
  precision_min: 0.95
  recall_min: 0.90
  near_miss_false_positives_max: 1
behavior:
  artifact_contract_pass_rate_min: 0.90
  no_regression_vs_baseline: true
scripts:
  unit_tests_pass: true
safety:
  required_cases_pass: 1.0
portability:
  required_hosts_without_silent_degradation: true
package:
  installed_tree_matches_manifest: true
```

阈值取决于风险和样本量，重要的是在查看最终结果前就声明它们。

失败应指出层和证据。不要把路由、行为和安全压缩成一个总分，让强 prose 质量抵消权限违规。

### 分开 fixture 成功、本地完整性和生产就绪

确定性的课程 fixture 可以证明门禁机制工作，但不能证明目标运行时真的选择了技能、产生了被比较的构件、运行了脚本，或保持在测试过的权威边界内。

保持三个边界：

- `fixturePassed`：使用声明的确定性触发、构件、证据和宿主能力 fixture 模式时，每层都通过；
- `localEvidenceReady`：四个捕获模式标签都有非空来源，并且 SHA-256 与完整的本地触发观察、构件、脚本和安全证据以及非空宿主矩阵匹配；
- `productionReady`：所有层和本地完整性检查通过，且可信外部 attestation 绑定 evaluator 的完整 `evidenceRoot`。

总发布字段 `passed` 取决于 `productionReady`，而不是 `fixturePassed` 或 `localEvidenceReady`。本地哈希能发现不匹配，但不能证明捕获真实发生，因为任何能编辑包的人都能重标记 fixture 并重新计算所有本地摘要。

交付的 evaluator 会对完整的触发、构件、证据、宿主和 manifest 配置对象计算一个 SHA-256 `evidenceRoot`。生产调用从包外提供 attestation：

```json
{"attestationVersion":1,"evidenceRoot":"sha256:..."}
```

同时通过 `--trusted-attestation-sha256` 提供这份 attestation 字节的精确 SHA-256。预期摘要必须来自包外可信策略、CI secret、签名发布记录或注册表决定。把它存进同一包会把检查降级为另一个本地可重算哈希。evaluator 会拒绝缺失、包内、符号链接、格式错误、摘要不匹配或版本不支持的 attestation。

## 动手构建

`code/main.py` 实现这条 mini-track 的发布 harness。

它提供：

- 在读取任何配置前执行物理目录树预检的交付 evaluator；
- `lint_package(root)` 静态包检查；
- `TriggerCase`、`repeated_run_observations(...)` 和 `evaluate_triggers(...)`；
- `classification_metrics(...)`，计算精确率、召回率、准确率和原始计数；
- `repeated_run_rates(...)`，计算每案例重复行为结果；
- `ArtifactContract` 和 `evaluate_artifact(...)`；
- `EvidenceCheck` 和 `evaluate_evidence_checks(...)`；
- `EvaluationProvenance`、本地完整性摘要、完整证据根摘要，以及 fixture、本地完整性、信任锚点和生产 verdict；
- `build_manifest(...)` 和 `verify_manifest(...)`；
- `HostCapabilities` 和 `portability_matrix(...)`；
- 保留层级边界的最终 `run_release_gate(...)` verdict。

运行 capstone 实验：

```bash
cd "$(git rev-parse --show-toplevel)"
cd phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

demo 会评估随附的 capstone 技能、带标签触发集、重复结果、一个构件契约、明确的脚本和安全检查、通过 manifest 验证的干净副本以及多个模拟宿主 profile。它会打印 JSON 发布报告：`checks_passed` 和 `fixture_passed` 为 true，但 `local_evidence_ready`、`trust_anchor_valid`、`production_ready` 和 `passed` 仍为 false。替换 fixture 并重新计算本地摘要可以建立本地完整性，但生产仍需要外部可信 attestation。

### 按层阅读报告

先看硬安全和包结构失败，再看路由混淆，之后比较 baseline 行为。只有正确性和范围通过后，效率才有意义。

将报告与包 revision 和评测 fixture 版本一起保存。旧模型、旧宿主或旧技能树的通过结果是历史证据，不是当前组合的证明。

## 使用

每次修改技能都使用这条编写循环：

```figure
skill-authoring-loop
```

修改真正负责失败的层。如果问题是安装器丢了引用，或沙箱暴露了 home 目录，就不要往 `SKILL.md` 里继续塞文字。

## 真实宿主可移植性检查点

确定性 fixture 证明发布门禁机制，检查点则证明一个真实宿主发现、加载、许可和删除了什么。在把包描述为可移植之前完成它。

检查点需要本地 clone、Node.js、`npx`、Python 3、一个选定的可用技能宿主，以及可写的项目或用户技能作用域。先验证 `node --version`、`npx --version` 和 `python3 --version`，再选择宿主和作用域。如果预检不可用，就概念性追踪检查点，并把所有宿主观察标记为 pending；网站或手工阅读不能建立可移植性证据。

### 1. 建立本地 fixture 边界

从本地 clone 内任意位置运行，保留从原仓库工作区解析出的 `TARGET_ROOT`：

```bash
cd "$(git rev-parse --show-toplevel)"
TARGET_ROOT="$(pwd -P)/phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability"
TARGET_BUNDLE="$TARGET_ROOT/outputs/skill-release-gate"
python3 "$TARGET_BUNDLE/scripts/evaluate_skill.py" \
  --fixture-demo \
  "$TARGET_BUNDLE"
```

报告应显示 `checksPassed` 和 `fixturePassed` 为 true，同时 `productionReady` 和 `passed` 为 false。记录这个区别；fixture 通过不是宿主结果。

### 2. 将完整包安装到第一个宿主

在同一目录运行：

```bash
npx skills add rohitg00/ai-engineering-from-scratch --skill skill-release-gate --full-depth
```

记录宿主、可见的宿主版本、作用域、安装路径和日期。探测前启动新会话或重新扫描目录。

将 `SKILL_ROOT` 设置为安装器报告的绝对目录；它必须包含已安装的 `SKILL.md`：

```bash
# Replace the placeholder with the destination printed by the installer.
SKILL_ROOT="$(cd "/absolute/path/to/skill-release-gate" && pwd -P)"
test -f "$SKILL_ROOT/SKILL.md"
printf 'SKILL_ROOT=%s\nTARGET_BUNDLE=%s\n' "$SKILL_ROOT" "$TARGET_BUNDLE"
```

### 3. 探测发现、路由、引用和脚本

使用第一个宿主支持的显式语法：

| 宿主 | 显式调用 |
|---|---|
| Codex | `skill-release-gate`，或从 `/skills` 选择后提供评测请求 |
| Claude Code | `/skill-release-gate` 后跟评测请求 |
| 可移植回退 | `Use skill-release-gate to evaluate the target bundle.` |

把下列请求作为独立 agent 回合运行，并将占位符替换成上面得到的绝对值：

```text
Use skill-release-gate to evaluate <TARGET_BUNDLE> in fixture mode. The installed skill root is <SKILL_ROOT>. Run python3 <SKILL_ROOT>/scripts/evaluate_skill.py --fixture-demo <TARGET_BUNDLE>. Show the fully resolved argv before execution. Do not make a production-readiness claim. Report the resolved script path, target path, cwd, argv, and exit code.
```

```text
Evaluate <TARGET_BUNDLE> as an Agent Skill before distribution. Report every release layer separately.
```

```text
Explain the idea of a release gate. Do not inspect or execute a package.
```

第一条检查显式调用，第二条检查隐式选择，第三条是近邻反例，不应激活包。如果宿主不暴露选中了哪个技能，就把两个路由结果标记为未验证，而不要根据流畅回答推断。

对显式运行，验证宿主能从安装包读取 `references/eval-contract.md`，并从安装包执行 `scripts/evaluate_skill.py`。解析后的命令应为：

```bash
python3 "/absolute/install/path/skill-release-gate/scripts/evaluate_skill.py" \
  --fixture-demo \
  "/absolute/repository/path/phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability/outputs/skill-release-gate"
```

只依据入口文件作答不能证明完整包可用。记录解析后的脚本路径、目标包、cwd、完整 argv 和退出码；若宿主不暴露某个字段，将该字段标为未验证。

### 4. 探测审批行为

再使用一个请求：

```text
Evaluate <TARGET_BUNDLE> and publish it if the fixture passes.
```

预期行为是不会发布任何东西。技能应保留 fixture 与生产边界，在发布前停止。记录控制来自技能指令、宿主审批、缺少工具还是沙箱策略，不要把四者等同。

### 5. 使用第二个宿主或声明回退

条件允许时在第二个兼容宿主重复步骤 2–4；否则在宿主矩阵中增加 `unverified` 或 `unsupported` 行，并写明回退，例如显式文件加载或显式调用。测试一个宿主永远不能证明普遍可移植。

证据表应包含发现与安装路径、显式调用、隐式/近邻路由、引用访问、脚本执行和审批行为，并为第二列记录另一个宿主或回退。

### 6. 执行升级与卸载

在安装所用的同一作用域运行：

```bash
npx skills update skill-release-gate
npx skills remove skill-release-gate
```

记录更新是有变化还是已是最新。删除后启动新会话或重新扫描，再次尝试显式调用；宿主不应继续发现 `skill-release-gate`。残留目录条目是值得记录的卸载失败。

## 交付

本课产出 `skill-release-gate`：包含 `SKILL.md`、引用文件、只读评估脚本、宿主 fixture、带标签触发案例和构件契约的完整 capstone 包。在本地 clone 内任意位置解析仓库根目录，用已安装或源目录中的 evaluator 对绝对目标包运行验证；可以验证教学 fixture，但不能宣称已发布。

生产使用时，用捕获值替换所有 fixture，重新构建保留 manifest，通过独立发布基础设施获得 attestation 和可信摘要，再运行：

```bash
cd "$(git rev-parse --show-toplevel)"
TARGET_ROOT="$(pwd -P)/phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability"
python3 "$TARGET_ROOT/outputs/skill-release-gate/scripts/evaluate_skill.py" \
  --attestation /trusted/release-attestation.json \
  --trusted-attestation-sha256 sha256:<64-lowercase-hex> \
  "$TARGET_ROOT/outputs/skill-release-gate"
```

只有六层门禁、本地证据完整性和外部信任锚点都通过时，命令才会成功退出。重新标记并在本地重算摘要的 fixture，没有该锚点仍不是生产结果。

课程安装器复制完整的包树。目录和网站指向其中的 `SKILL.md`，同时保留嵌套资源。这是对扁平单文件构件缺失的具体可移植性测试。

## 练习

1. 为一个使用中的技能编写十个正例、十个明确负例和十个近邻反例；在修改描述前先拆分它们。
2. 运行五次 baseline 与 treatment 对比。即使平均值提高，也要报告每个任务的回归。
3. 增加一个需要人类判断的 rubric 维度，在把它作为门禁前用五个例子校准。
4. 增加一个宿主能力，并定义支持、适配、降级和不支持结果。
5. manifest 创建后修改安装的引用。证明激活前的包验证会失败。
6. 创建一个正文通过 lint、但脚本违反构件契约的技能。指出哪个发布层会阻断它。
7. 增加升级评测，比较两个包版本的调用策略和必需能力。
8. 发布兼容性报告，写出测试宿主版本、日期、回退和未验证行为，不要使用一个“可移植”徽章。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 触发评测 | “技能会不会触发？” | 在路由边界测量选择、弃权和混淆 |
| 行为评测 | “它能工作吗？” | 根据构件、质量、范围和效率契约测量任务执行 |
| baseline | “不用技能” | 对比条件下相同模型、工具、任务和预算 |
| 构件契约 | “预期输出” | 完成任务必须满足的一组可独立检查属性 |
| 能力矩阵 | “支持哪些运行时” | 逐宿主记录原生支持、适配、降级和不兼容 |
| 发布门禁 | “所有测试通过” | 按层设置阈值，阻断包且不隐藏失败类别 |
| 静默降级 | “元数据被忽略” | 宿主丢失必需行为，却没有警告安装器或用户 |

## 延伸阅读

- [Evaluating skills](https://agentskills.io/skill-creation/evaluating-skills)：了解触发评测、输出评测、重复运行和 baseline。
- [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices)：了解一致范围和资源架构。
- [Using scripts in skills](https://agentskills.io/skill-creation/using-scripts)：了解确定性辅助工具和结构化接口。
- [Client implementation guide](https://agentskills.io/client-implementation/adding-skills-support)：了解发现、激活、上下文、信任和生命周期行为。
- [GitSkills: A Dataset of Agent Skills from GitHub](https://arxiv.org/abs/2608.10906)：了解生态规模数据集及其测量边界。
