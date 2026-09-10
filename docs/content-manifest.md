# Learning Atlas v0.18.0 内容清单

冻结日期：2026-09-10。

## 当前发布快照与上游跟踪

| 上游仓库 | 发布快照 revision | 许可证 |
| --- | --- | --- |
| `ai-engineering-from-scratch` | `d18b8fe5a913c46011a3b06cb6ebd6a924414fd3` | MIT |
| `maths-cs-ai-compendium` | `9850ee574a370bc1cde59de98b394e953775b67d` | Apache-2.0 |

此表记录 v0.18.0 的可复现发布快照。两个 submodule 同时配置为跟踪其上游 `main` 分支：每日检查只报告待审核更新，不会自动修改发布内容。Issue #10 所涉上游提交仅修改图书构建工作流、排版过滤器、主题和渲染测试，没有命中已发布课程、测验或理论关联来源；本次只更新实践 submodule 指针，不改动中文内容。中文改编、测验和理论关联的各自 front matter 均记录对应原文路径、revision 与 SHA-256；中文理论正文还声明跟踪 `main`。应用发现实践课程、测验或中文理论正文的当前 SHA-256 不匹配时，会拒绝发布旧内容；理论原文链接则始终指向官方 `main`。

## 根项目许可证边界

- 原创软件代码（`apps/`、`scripts/`、测试和配置）采用 [Apache-2.0](../LICENSE)。
- 原创文档、设计材料和独立中文学习内容采用 [CC BY 4.0](../LICENSE-CONTENT.md)。
- 两个上游 submodule、由其衍生的译文/摘录，以及字体、npm 依赖和其他第三方资产不被根项目重新许可；其归属、版本和适用许可证见 [第三方归属清单](../THIRD_PARTY_NOTICES.md)。

## 内容快照与阅读器范围

上游实践源现有 Phase 0-19 共 523 节课程；内容仓库现有 523 节经审核中文实践课。首页展示全部 20 个 Phase；实践阅读器开放 Phase 0-15 的 355 节，Phase 16-19 的 168 节只显示“已审核，待接入”。Phase 15 的 22 节课程已全部进入当前开放范围。

| 范围 | 经审核实践译文 | 中文测验 | 阅读器状态 |
| --- | ---: | ---: | --- |
| Phase 0「环境与工具」 | 12 | 12 | 已开放 |
| Phase 1「数学基础」 | 22 | 22 | 已开放 |
| Phase 2「机器学习基础」 | 18 | 18 | 已开放 |
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
| Phase 13「工具与协议」 | 31 | 23 | 已开放 |
| Phase 14「智能体工程」 | 54 | 54 | 已开放 |
| Phase 15「自主系统」 | 22 | 0 | 已开放 |
| Phase 16「多智能体与群体」 | 25 | 0 | 已审核，待接入 |
| Phase 17「基础设施与生产」 | 28 | 0 | 已审核，待接入 |
| Phase 18「伦理、安全与对齐」 | 30 | 0 | 已审核，待接入 |
| Phase 19「综合项目」 | 85 | 0 | 已审核，待接入 |
| **合计** | **523** | **228** | — |

当前开放的 355 节课程中，有 349 节提供 VS Code/Python 工作区模板与练习指南；其余 6 节没有 Python 实作资源。中文测验覆盖当前开放范围内所有存在上游 `quiz.json` 的课程；待接入范围另有 145 份上游 `quiz.json`，其余上游课程没有 `quiz.json`，不属于待补译缺口。Phase 15 的 22 节课程上游均没有 `quiz.json`，因此本版不凭空创建测验。

理论上游快照包含 20 章、104 篇笔记，已全部进入首页理论目录。理论关联共 311 条，已全部完成人工审核并标为 `approved`；当前开放课程的 248 张已批准关联已迁移到结构化上下文卡片并绑定到对应的中文课程标题，展开后提供直觉、关键点、应用和自检问题，尚未接入阅读器的 63 张关联仍保留在后续 Phase 的迁移范围内。T1 新增 11 篇高关联中文理论，连同既有《抽样》和 T2 新增 13 篇中关联理论，共 25 / 104 篇中文理论全文，对应 230 / 311 张理论卡进入应用内中文阅读。应用还会对相同的理论目标去重，并在存在中文全文时保留不同目标的英文入口。第 15 课的中心极限定理卡指向稳定标识 `theory/chapter-04-statistics/03-sampling`，并进入对应的版本化中文全文。

当前已有 25 篇中文理论正文满足 `status: reviewed`、来源路径和 SHA-256 三重发布条件，包括既有《抽样》、T1 的 11 篇高关联笔记和 T2 的 13 篇中关联笔记。它们是针对本地同步到 `main` 的快照审核的版本化中文内容；审核 revision 仅用于追溯，目录和阅读器中的原文入口均指向官方 `HenryNdubuaku/maths-cs-ai-compendium` 最新英文 `main`。其余 79 篇理论笔记从目录打开同一官方 `main`，属于可能变化的外部实时参考，不计入本地发布快照。

术语基线与本轮译文语言复核记录在 [`docs/translation-glossary.md`](translation-glossary.md)。

## 内容验证

发布清单使用以下检查：

```bash
python3 scripts/check_translation_correspondence.py
python3 scripts/check_source_fingerprints.py
python3 scripts/check_theory_cards.py
python3 scripts/check_repository_hygiene.py
cd apps/local-learning
npm run check
npm test
```

结构检查覆盖 523 份实践译文与 25 份版本化理论译文；来源指纹检查覆盖 1398 条记录；理论卡契约与实践锚点检查覆盖当前发布的 248 张卡；仓库卫生检查阻止学习数据、本地状态、凭据、私钥和常见令牌误入版本库。Python-first 例外必须在原位置明确链接到锁定的上游非 Python 实现。

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

- **CI / Validate content and application** 在每次推送和面向 `main` 的 PR 中检查译文结构、1398 项来源指纹、仓库卫生、前端/服务端语法和应用 API 测试。同步 PR 必须在内容更新后通过此检查才能合入。
- **Automation / Open upstream synchronization PR** 可手动把上游 commit 指针放入一个独立 PR；它不自动合并。
- **Monitoring / Report upstream source changes** 每日检测 `main` 是否领先于当前发布快照；报告器先按来源路径匹配已登记的译文、测验或理论关联，只有命中中文学习内容时才将报告用于创建或更新 `[Upstream] Source updates require review` Issue。未命中已登记内容的上游站点、构建工具和其他文件不会创建 Issue，也不会让 workflow 失败。
- **Monitoring / Check translation coverage** 每周检查已进入中文学习范围的 Phase 是否有缺少对应中文实践译文的上游课程，并创建或更新 `[Coverage] Chinese practice translations missing` Issue；尚未接入的 Phase 不会被纳入。

`manage_upstreams.py --check` 只判断上游跟踪分支是否有新 commit；**Monitoring / Report upstream source changes** 再对已确认的更新生成改动文件、关联内容、SHA-256 影响和 diff 报告。前者是 freshness 信号，后者是 review 报告层。

由于当前仓库未启用 GitHub Advanced Security，官方 dependency-review action 不支持本仓库并会把 Pull Request 标为失败；对应 workflow 暂停，依赖图和 Dependabot 告警仍由 GitHub 的 Security 页面提供。

上游 freshness 检查将退出码 2 解释为“跟踪分支有新提交”；这不是网络或权限错误。报告器随后按内容元数据中的已登记来源路径筛选影响，再把目标 revision 中的原文 SHA-256 与对应指纹比较：只有命中中文内容时才创建 Issue；命中后，报告明确标注“确认 SHA-256 漂移”才能确认对应英文文件已改变。Issue 会通过 GitHub 的仓库/Issue 关注通知送达维护者；邮件服务不在仓库内保存凭据。

## 当前边界与限制

- 上下文理论层只呈现经过批准的关联；不会自动发布候选关联。
- 实践阅读器目前加载 Phase 0-15 的 355 节课程；Phase 16-19 的 168 节译文已审核但尚未接入；上下文理论层仍只呈现经过批准的关联。
- 中文测验目前覆盖当前开放范围内有上游 `quiz.json` 的 228 节课程；待接入范围另有 145 份上游 `quiz.json`，另有 150 节上游课程没有测验文件。
- 完整理论目录已经开放；当前 25 / 104 篇中文理论全文（包括 T1 的 11 篇高关联笔记、T2 的 13 篇中关联笔记与《抽样》）已通过审核并在应用内发布，其余理论笔记仍以官方 `main` 英文原文为阅读目标。理论卡和中文理论阅读器的原文入口均跟随官方 `main`。
- 理论课程本轮不保存进度、笔记、自测、助理状态或工作区数据；稳定 `theoryId` 只作为后续能力的接口。
- 应用仅运行在 `localhost`，不提供账户、多设备同步或托管模型服务。
- 学习数据备份不包含模型连接；完整迁移请按首次使用文档复制个人数据目录。
