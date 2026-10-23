# Learning Atlas v0.27.0 内容清单

冻结日期：2026-10-23。

## 当前发布快照与上游跟踪

| 上游仓库 | 发布快照 revision | 许可证 |
| --- | --- | --- |
| `ai-engineering-from-scratch` | `f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299` | MIT |
| `maths-cs-ai-compendium` | `9850ee574a370bc1cde59de98b394e953775b67d` | Apache-2.0 |

此表记录 v0.27.0 的可复现发布快照；实践源保持 v0.26.9 锁定的 `f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299`，理论源保持 `9850ee574a370bc1cde59de98b394e953775b67d`，两个上游仍继续跟踪各自的 `main` 分支。每日检查只报告待审核更新，不会自动修改发布内容。本版补齐 Phase 13 第 32–45 课（逆向工程轨道）的 14 篇中文实践译文、14 份中文测验和 14 套 Python 工作区练习指南，并修复监控在已开放 Phase 中漏报新增课程的问题。v0.26.9 的 Issue #30 复核（190 篇实践译文和 146 条理论关联）、Issue #28、#26 的覆盖补齐和 Issue #24 的 1424 个上游变更文件复核沿用前版记录。P18 在 v0.24.0 接入 30 节伦理、安全与对齐课程；T5 和 T6 在理论快照上各新增 16 篇按章节顺序复核的独立理论全文，v0.25.2 补齐 T1–T6 全部 89 篇理论正文及其中文 SVG 图示，v0.26.0 完成 89 篇中英一致性、术语和中文表达复核，逐篇 SHA-256 与复核要点见[理论复核清单](theory-translation-review.md)。中文改编、测验和理论关联的各自 front matter 均记录对应原文路径、revision 与 SHA-256；中文理论正文还声明跟踪 `main`。应用发现实践课程、测验或中文理论正文的当前 SHA-256 不匹配时，会拒绝发布旧内容；理论原文链接则始终指向官方 `main`。

## 根项目许可证边界

- 原创软件代码（`apps/`、`scripts/`、测试和配置）采用 [Apache-2.0](../LICENSE)。
- 原创文档、设计材料和独立中文学习内容采用 [CC BY 4.0](../LICENSE-CONTENT.md)。
- 两个上游 submodule、由其衍生的译文/摘录，以及字体、npm 依赖和其他第三方资产不被根项目重新许可；其归属、版本和适用许可证见 [第三方归属清单](../THIRD_PARTY_NOTICES.md)。

## 内容快照与阅读器范围

上游实践源现有 Phase 0-19 共 542 节课程；内容仓库现有 542 节经审核中文实践课，覆盖全部上游课程。首页展示全部 20 个 Phase；实践阅读器开放 Phase 0-18 的 457 节，Phase 19 的 85 节只显示“已审核，待接入”。Phase 13 第 32–45 课本版接入当前开放范围。

| 范围 | 经审核实践译文 | 中文测验 | 阅读器状态 |
| --- | ---: | ---: | --- |
| Phase 0「环境与工具」 | 13 | 13 | 已开放 |
| Phase 1「数学基础」 | 22 | 22 | 已开放 |
| Phase 2「机器学习基础」 | 21 | 21 | 已开放 |
| Phase 3「深度学习核心」 | 13 | 13 | 已开放 |
| Phase 4「计算机视觉」 | 28 | 28 | 已开放 |
| Phase 5「自然语言处理基础到进阶」 | 29 | 29 | 已开放 |
| Phase 6「语音与音频」 | 17 | 0 | 已开放 |
| Phase 7「Transformer 深入理解」 | 16 | 1 | 已开放 |
| Phase 8「生成式 AI」 | 15 | 0 | 已开放 |
| Phase 9「强化学习」 | 12 | 0 | 已开放 |
| Phase 10「从零构建 LLM」 | 24 | 11 | 已开放 |
| Phase 11「LLM 工程」 | 17 | 17 | 已开放 |
| Phase 12「多模态 AI」 | 25 | 0 | 已开放 |
| Phase 13「工具与协议」 | 45 | 37 | 已开放 |
| Phase 14「智能体工程」 | 54 | 54 | 已开放 |
| Phase 15「自主系统」 | 22 | 0 | 已开放 |
| Phase 16「多智能体与群体」 | 25 | 2 | 已开放 |
| Phase 17「基础设施与生产」 | 29 | 29 | 已开放 |
| Phase 18「伦理、安全与对齐」 | 30 | 30 | 已开放 |
| Phase 19「综合项目」 | 85 | 0 | 已审核，待接入 |
| **合计** | **542** | **307** | — |

当前开放的 457 节课程中，有 449 节提供 VS Code/Python 工作区模板与练习指南；其余 8 节没有 Python 实作资源，其中 P16 的 01、03 课明确保留 TypeScript 上游实现。中文测验覆盖当前开放范围内所有存在上游 `quiz.json` 的课程；Phase 19 待接入范围另有 85 份上游 `quiz.json`；其余 150 节上游课程没有 `quiz.json`，不属于待补译测验缺口。Phase 15 的 22 节课程上游均没有 `quiz.json`，因此不凭空创建测验。

理论上游快照包含 20 章、104 篇笔记，已全部进入首页理论目录。理论关联共 311 条，已全部完成人工审核并标为 `approved`；当前开放课程的 289 张已批准关联已迁移到结构化上下文卡片并绑定到对应的中文课程标题，展开后提供直觉、关键点、应用和自检问题，尚未接入阅读器的 22 张关联仍保留在 Phase 19 的迁移范围内。P18 新增 5 张卡，覆盖对齐训练、提示注入和红队安全评估；它们与既有卡一样通过实践锚点和来源指纹门禁。T1 新增 11 篇高关联中文理论，连同既有《抽样》、T2 新增 13 篇、T3 新增 13 篇、T4 新增 19 篇关联理论、T5 新增 16 篇和 T6 新增 16 篇独立理论，共 89 / 104 篇中文理论全文，其中 311 / 311 张理论卡关联仍可进入应用内中文阅读。应用还会对相同的理论目标去重，并在存在中文全文时保留不同目标的英文入口。第 15 课的中心极限定理卡指向稳定标识 `theory/chapter-04-statistics/03-sampling`，并进入对应的版本化中文全文。

当前已有 89 篇中文理论正文满足 `status: reviewed`、来源路径和 SHA-256 三重发布条件，包括既有《抽样》、T1 的 11 篇高关联笔记、T2 的 13 篇、T3 的 13 篇、T4 的 19 篇关联长尾笔记、T5 的 16 篇和 T6 的 16 篇独立笔记。它们是针对本地同步到 `main` 的快照审核的版本化中文内容；审核 revision 仅用于追溯，目录和阅读器中的原文入口均指向官方 `HenryNdubuaku/maths-cs-ai-compendium` 最新英文 `main`。其余 15 篇理论笔记从目录打开同一官方 `main`，属于可能变化的外部实时参考，不计入本地发布快照。

术语基线见 [`docs/translation-glossary.md`](translation-glossary.md)；89 篇理论译文的中英复核、续查位置和双语散列见 [`docs/theory-translation-review.md`](theory-translation-review.md)。

## 内容验证

发布清单使用以下检查：

```bash
python3 scripts/check_translation_correspondence.py
python3 scripts/check_source_fingerprints.py
python3 scripts/check_theory_cards.py
python3 scripts/check_repository_hygiene.py
python3 scripts/check_translation_coverage.py
cd apps/local-learning
npm run check
npm test
git diff --check
```

结构检查覆盖 542 份实践译文与 89 份版本化理论译文；来源指纹检查覆盖 1560 条记录；理论卡契约与实践锚点检查覆盖当前发布的 289 张卡；仓库卫生检查阻止学习数据、本地状态、凭据、私钥和常见令牌误入版本库。覆盖率检查已报告 19 个已发布 Phase 没有缺失的实践译文、中文测验或练习指南，并通过 `--fail-on-missing` 发布门禁。Phase 13 第 32–45 课的 `main.py` 和测试已在上游课程目录与学习者工作区中运行通过（工作区中站点图示测试跳过，第 45 课另有一项读取第 36 课 fixture 的测试失败，已在练习指南中说明）。Python-first 例外必须在原位置明确链接到锁定的上游非 Python 实现。

## 上游更新流程

先检查 `main` 是否有新提交：

```bash
python3 scripts/manage_upstreams.py --check
```

准备审核新上游版本时，同步到工作区并运行内容检查：

```bash
python3 scripts/manage_upstreams.py --sync
```

若来源指纹检查失败，先逐项更新和审核受影响的译文、测验或理论关联，再提交新的 submodule 指针。不要把未通过检查的同步结果直接发布。

GitHub Actions 提供四类仓库自定义自动化检查：

- **CI / Validate content and application** 在每次推送和面向 `main` 的 PR 中检查译文结构、1560 项来源指纹、仓库卫生、前端/服务端语法和应用 API 测试，并在已开放 Phase 存在翻译覆盖缺口时给出警告。同步 PR 必须在内容更新后通过此检查才能合入。
- **Automation / Open upstream synchronization PR** 可手动把上游 commit 指针放入一个独立 PR；它不自动合并。PR 正文为中文，附带同步后的翻译覆盖率报告。
- **Monitoring / Report upstream source changes** 每日检测 `main` 是否领先于当前发布快照；报告器先按来源路径匹配已登记的译文、测验或理论关联，并列出已开放 Phase 中新增但尚无中文改编的课程原文、测验和 Python 实作；命中任一项时才将报告用于创建或更新 `[Upstream] Source updates require review` Issue。未命中已登记内容、也不在已开放 Phase 的上游站点、构建工具和其他文件不会创建 Issue。新增理论笔记只列出供参考。之后的检查不再需要审核时，该 Issue 自动关闭。
- **Monitoring / Check translation coverage** 每周检查，并在 `main` 更新实践 submodule 指针、中文实践内容或发布范围时立即检查已进入中文学习范围的 Phase 是否有缺少中文实践译文、中文测验或练习指南的上游课程，创建或更新 `[Coverage] Chinese practice translations missing` Issue，缺口补齐后自动关闭；尚未接入的 Phase 不会被纳入。发布范围由 `scripts/published_scope.py` 维护，并由测试与阅读器的 Phase 列表保持一致。

`manage_upstreams.py --check` 只判断上游跟踪分支是否有新 commit；**Monitoring / Report upstream source changes** 再对已确认的更新生成改动文件、关联内容、SHA-256 影响和 diff 报告。前者是 freshness 信号，后者是 review 报告层。

由于当前仓库未启用 GitHub Advanced Security，官方 dependency-review action 不支持本仓库并会把 Pull Request 标为失败；对应 workflow 暂停，依赖图和 Dependabot 告警仍由 GitHub 的 Security 页面提供。

上游 freshness 检查将退出码 2 解释为“跟踪分支有新提交”；这不是网络或权限错误。报告器随后按内容元数据中的已登记来源路径筛选影响，再把目标 revision 中的原文 SHA-256 与对应指纹比较：命中中文内容或已开放 Phase 出现缺少中文适配的新课程时才创建 Issue；命中已登记内容后，报告明确标注“确认 SHA-256 漂移”才能确认对应英文文件已改变。Issue 会通过 GitHub 的仓库/Issue 关注通知送达维护者；邮件服务不在仓库内保存凭据。两条监控 workflow 只在执行、网络或权限出错时失败，需要审核时运行保持成功。所有 action 按 commit SHA 固定，并由 Dependabot 每周更新；CI 使用 `.python-version` 指定的 Python 版本。

## 当前边界与限制

- 上下文理论层只呈现经过批准的关联；不会自动发布候选关联。
- 实践阅读器目前加载 Phase 0-18 的 457 节课程；Phase 19 的 85 节译文已审核但尚未接入；上下文理论层仍只呈现经过批准的关联。
- 中文测验目前覆盖当前开放范围内有上游 `quiz.json` 的 307 节课程；待接入范围另有 85 份上游 `quiz.json`，另有 150 节上游课程没有测验文件。
- 完整理论目录已经开放；当前 89 / 104 篇中文理论全文（包括 T1 的 11 篇高关联笔记、T2 的 13 篇、T3 的 13 篇、T4 的 19 篇关联长尾笔记、T5 的 16 篇、T6 的 16 篇独立笔记与《抽样》）已通过审核并在应用内发布，其余 15 篇理论笔记仍以官方 `main` 英文原文为阅读目标。理论卡和中文理论阅读器的原文入口均跟随官方 `main`。
- 理论课程本轮不保存进度、笔记、自测、助理状态或工作区数据；稳定 `theoryId` 只作为后续能力的接口。
- 应用仅运行在 `localhost`，不提供账户、多设备同步或托管模型服务。
- 学习数据备份不包含模型连接；完整迁移请按首次使用文档复制个人数据目录。
