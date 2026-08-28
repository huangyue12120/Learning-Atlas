---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/09-code-migration-agent/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: c8415fbb54b54a6a6c1761bf52b1564fa7d565a50f18b55882fa8f4e5a9b07be
status: reviewed
---

# 毕业项目 09——代码迁移智能体（仓库级语言 / 运行时升级）

> Amazon 的 MigrationBench（Java 8 到 17）和 Google 的 App Engine Py2 到 Py3 迁移器定义了 2026 年的标准。Moderne 的 OpenRewrite 能够大规模执行确定性的 AST 重写。Grit 用 codemod 风格 DSL 解决同一问题。生产模式把两者结合起来：用确定性底座安全重写，再用智能体处理含糊情况；每个分支在沙箱中构建，并由测试工作台在 PR 打开前把结果切换为绿色。本毕业项目要求你迁移 50 个真实仓库，并发布通过率和失败分类。

**类型：** 毕业项目
**语言：** Python（智能体）、Java / Python（目标代码）、TypeScript（仪表盘）
**前置课程：** 第 5 阶段（NLP）、第 7 阶段（Transformer）、第 11 阶段（LLM 工程）、第 13 阶段（工具）、第 14 阶段（智能体）、第 15 阶段（自治系统）、第 17 阶段（基础设施）
**涉及阶段：** P5 · P7 · P11 · P13 · P14 · P15 · P17
**用时：** 30 小时

## 问题

大规模代码迁移是 2026 年编码智能体最清晰的生产应用之一。真实标准很明确（迁移后测试套件是否通过？），收益也确实存在（Java 8 代码群迁移是需要大量人力的项目），而且 benchmark 是公开的（MigrationBench 50 仓库子集）。Moderne 的 OpenRewrite 处理确定性部分，智能体层处理 OpenRewrite recipe 无法覆盖的所有内容：含糊重写、构建系统漂移、长尾语法和传递依赖破坏。

你将构建一个智能体，接收 Java 8 仓库（或 Python 2 仓库），产出 CI 变绿的迁移分支。你要测量通过率、测试覆盖率保持情况和每仓库成本，并建立失败分类。与仅确定性工具基线的并排比较，会告诉你智能体的价值到底在哪里。

## 概念

流水线有两层。**确定性底座**（Java 使用 OpenRewrite，Python 使用 libcst）安全地执行大量机械重写：导入、方法签名、空值安全编辑、try-with-resources 和弃用 API 替换。它速度快，并且能产生可审计的 diff。**智能体层**（基于 Claude Opus 4.7 和 GPT-5.4-Codex 的 OpenAI Agents SDK 或 LangGraph）处理 recipe 无法覆盖的情况：构建文件升级（Maven/Gradle/pyproject）、传递依赖冲突、测试 flaky 和自定义注解。

每个仓库获得一个 Daytona 沙箱，并预装目标运行时。智能体反复执行：运行构建、分类失败、应用修复、重新运行。硬限制是每仓库 30 分钟、$8 和 20 个智能体回合。如果所有测试通过且覆盖率差值不为负，分支就打开 PR。否则，仓库会带着证据被归入某个失败类别。

失败分类就是交付物。50 个仓库中什么坏了？传递依赖？自定义注解？构建工具版本？与迁移无关的测试 flaky？每个类别都要有计数和一个示例 diff。未来的 recipe 作者可以据此处理排名前三的类别。

## 架构

```text
目标仓库
      |
      v
OpenRewrite / libcst 确定性 recipe
   （安全、快速、可审计，约覆盖 70–80% 修复）
      |
      v
每个分支一个 Daytona 沙箱
      |
      v
智能体循环（Claude Opus 4.7 / GPT-5.4-Codex）：
   - 运行构建 -> 捕获失败
   - 分类失败（构建、测试、lint）
   - 应用修复（补丁或重试 recipe）
   - 重新运行
   - 预算：30 分钟、$8、20 回合
      |
      v
测试 + 覆盖率差值门
      |
      v（通过）
打开 PR
      |
      v（失败）
按失败类别归档 + 附上复现材料
```

## 技术栈

- 确定性底座：OpenRewrite（Java）或 libcst（Python）
- 智能体：基于 Claude Opus 4.7 + GPT-5.4-Codex 的 OpenAI Agents SDK 或 LangGraph
- 沙箱：每分支一个 Daytona 开发容器，预装目标运行时（Java 17 / Python 3.12）
- 构建系统：Maven、Gradle、uv（Python）
- Benchmark：Amazon MigrationBench 50 仓库子集（Java 8 到 17）、Google App Engine Py2 到 Py3 仓库
- 测试工作台：并行运行器，使用 Jacoco（Java）或 coverage.py（Python）测量覆盖率
- 可观测性：每个仓库使用 Langfuse + trace bundle 记录每个 diff 块
- 仪表盘：失败分类仪表盘，显示各类计数和示例 diff

```figure
ce-migration-funnel
```

## 动手构建

1. **Recipe 阶段。** 首先运行 OpenRewrite（Java）或 libcst（Python）recipe。捕获 70–80% 的机械迁移。以“recipe”提交。

2. **构建试跑。** 在 Daytona 沙箱中安装目标运行时并运行构建。如果变绿，跳到测试；如果变红，交给智能体。

3. **智能体循环。** 使用工具构建 LangGraph：run_build、read_file、edit_file、run_test、git_diff。智能体对失败分类（dep、syntax、test、build-tool），应用针对性修复，再次运行。

4. **预算上限。** 每仓库墙上时间 30 分钟、成本 $8、智能体回合 20 次。任何一项超限都会停止运行，并将当前 diff 归入 budget_exhausted。

5. **测试 + 覆盖率门。** 构建变绿后运行测试套件。将覆盖率与基础仓库比较。如果覆盖率下降超过 2%，归入 coverage_regression。

6. **打开 PR。** 成功后推送分支，打开带 diff 的 PR，并总结应用了哪些 recipe、智能体创建了哪些提交。

7. **失败分类。** 为每个失败仓库打上类别：dep_upgrade_required、build_tool_drift、custom_annotation、test_flake、syntax_edge_case、budget_exhausted。建立仪表盘。

8. **运行 50 个仓库。** 在 MigrationBench 子集上执行。报告各类别通过率、每仓库成本、覆盖率保持情况，以及与仅确定性方案基线的比较。

## 实际使用

```text
$ migrate legacy-java-service --target java17
[recipe]   27 rewrites applied (JUnit 4->5, HashMap initializer, try-with-resources)
[build]    FAIL: cannot find symbol sun.misc.BASE64Encoder
[agent]    turn 1 classify: removed_jdk_api
[agent]    turn 2 apply: sun.misc.BASE64Encoder -> java.util.Base64
[build]    OK
[tests]    412/412 passing; coverage 84.1% -> 84.3%
[pr]       opened #1841  cost=$3.20  turns=4
```

## 交付

交付物是 outputs/skill-migration-agent.md。给定一个仓库，它先执行确定性 recipe，再运行智能体循环，产出 CI 变绿的迁移分支；如果失败，则将仓库归入某个分类。

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | MigrationBench 通过率 | 50 仓库子集的 pass@1 |
| 20 | 测试覆盖率保持 | 相对基础仓库的平均覆盖率差值 |
| 20 | 每迁移仓库成本 | 通过运行的每仓库美元成本 |
| 20 | 智能体 / 确定性工具集成 | OpenRewrite 处理的修复比例与智能体编写的修复比例 |
| 15 | 失败分析报告 | 带示例的分类完整度 |
| **100** | | |

## 练习

1. 只用 OpenRewrite（不使用智能体）运行迁移流水线。将通过率与完整流水线比较，找出智能体是唯一差异的案例。

2. 实现“lint-clean”检查：迁移后运行代码风格检查器（Java 使用 spotless，Python 使用 ruff）。如果出现新的 lint 错误，让 PR 失败。测量覆盖率保持但风格退化的比例。

3. 增加“最小 diff”优化器：智能体分支通过测试后，再运行一轮以删去不必要的改动。报告 diff 大小减少了多少。

4. 扩展到第三种迁移：Node 18 到 Node 22。复用沙箱包装，并将 recipe 层换成自定义 codemod。

5. 测量首次构建变绿时间（TTFGB）作为 UX 指标。目标：p50 低于 10 分钟。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Deterministic substrate | “Recipe 引擎” | OpenRewrite / libcst：带安全保证的声明式 AST 重写 |
| Codemod | “修改代码的程序” | 机械改变源代码的重写规则 |
| Build drift | “工具版本偏差” | 不同大版本之间 Maven / Gradle / uv 行为的细微变化 |
| Failure class | “分类桶” | 仓库没有迁移成功的标注原因：依赖、语法、测试、构建工具或预算 |
| Coverage delta | “覆盖率保持” | 基础仓库到迁移分支之间测试覆盖率百分比的变化 |
| Agent turn | “工具调用回合” | 智能体循环中的一次计划 -> 行动 -> 观察 |
| Budget exhaustion | “撞到上限” | 仓库在通过前耗尽 30 分钟 / $8 / 20 回合限制 |

## 延伸阅读

- [Amazon MigrationBench](https://aws.amazon.com/blogs/devops/amazon-introduces-two-benchmark-datasets-for-evaluating-ai-agents-ability-on-code-migration/)——2026 年权威 benchmark
- [Moderne.io OpenRewrite 平台](https://www.moderne.io)——确定性底座参考
- [OpenRewrite 文档](https://docs.openrewrite.org)——recipe 编写
- [Grit.io](https://www.grit.io)——另一种 codemod DSL
- [OpenAI 沙箱化迁移 cookbook](https://developers.openai.com/cookbook/examples/agents_sdk/sandboxed-code-migration/sandboxed_code_migration_agent)——Agents SDK 参考
- [Google App Engine Py2 到 Py3 迁移器](https://cloud.google.com/appengine)——另一种迁移 benchmark
- [libcst](https://github.com/Instagram/LibCST)——Python 确定性底座
- [Daytona sandboxes](https://daytona.io)——按分支隔离的沙箱参考
