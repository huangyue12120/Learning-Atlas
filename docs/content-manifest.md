# Learning Atlas v0.13.1 内容清单

冻结日期：2026-08-31。

## 当前发布快照与上游跟踪

| 上游仓库 | 发布快照 revision | 许可证 |
| --- | --- | --- |
| `ai-engineering-from-scratch` | `a56b4b8ad43a3767c771953d217036813f697bc7` | MIT |
| `maths-cs-ai-compendium` | `9850ee574a370bc1cde59de98b394e953775b67d` | Apache-2.0 |

此表记录 v0.13.1 的可复现发布快照。两个 submodule 同时配置为跟踪其上游 `main` 分支：每日检查只报告待审核更新，不会自动修改发布内容。中文改编、测验和理论关联的各自 front matter 均记录对应原文路径、revision 与 SHA-256；中文理论正文还声明跟踪 `main`。应用发现实践课程、测验或中文理论正文的当前 SHA-256 不匹配时，会拒绝发布旧内容；理论原文链接则始终指向官方 `main`。

## 内容快照与阅读器范围

上游实践源现有 Phase 0-19 共 523 节课程；内容仓库现有 511 节经审核中文实践课。首页展示全部 20 个 Phase；实践阅读器开放 Phase 0-13 的 279 节，Phase 14-19 的 232 节只显示“已审核，待接入”。上游 Phase 14 新增的 12 节课程尚无中文改编，仍不进入阅读器；上游 Phase 13 当前已有 31 节课程，中文改编已全部纳入当前开放范围。

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
| Phase 14「智能体工程」 | 42 | 0 | 已审核，待接入 |
| Phase 15「自主系统」 | 22 | 0 | 已审核，待接入 |
| Phase 16「多智能体与群体」 | 25 | 0 | 已审核，待接入 |
| Phase 17「基础设施与生产」 | 28 | 0 | 已审核，待接入 |
| Phase 18「伦理、安全与对齐」 | 30 | 0 | 已审核，待接入 |
| Phase 19「综合项目」 | 85 | 0 | 已审核，待接入 |
| **合计** | **511** | **174** | — |

当前开放的 279 节课程中，有 273 节提供 VS Code/Python 工作区模板与练习指南；其余 6 节没有 Python 实作资源。中文测验覆盖当前开放范围内所有存在上游 `quiz.json` 的课程；另外 105 节上游课程本身没有 `quiz.json`，不属于待补译缺口。

理论上游快照包含 20 章、104 篇笔记，已全部进入首页理论目录。理论关联共 311 条，已全部完成人工审核并标为 `approved`；当前开放课程的 223 张已批准关联已迁移到结构化上下文卡片，展开后提供直觉、关键点、应用和自检问题，尚未接入阅读器的 88 张关联仍保留在后续 Phase 的迁移范围内。应用还会对相同的理论目标去重，并在存在中文全文时保留不同目标的英文入口。第 15 课的中心极限定理卡指向稳定标识 `theory/chapter-04-statistics/03-sampling`，并进入对应的版本化中文全文。

当前只有《抽样》一篇中文理论正文满足 `status: reviewed`、来源路径和 SHA-256 三重发布条件。该正文是针对本地同步到 `main` 的快照审核的版本化中文内容；其审核 revision 仅用于追溯，目录和阅读器中的原文入口均指向官方 `HenryNdubuaku/maths-cs-ai-compendium` 最新英文 `main`。其余 103 篇理论笔记从目录打开同一官方 `main`，属于可能变化的外部实时参考，不计入本地发布快照。

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

结构检查覆盖 511 份实践译文与 1 份版本化理论译文；来源指纹检查覆盖 1308 条记录；理论卡契约检查覆盖当前发布的 223 张卡；仓库卫生检查阻止学习数据、本地状态、凭据、私钥和常见令牌误入版本库。Python-first 例外必须在原位置明确链接到锁定的上游非 Python 实现。

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

GitHub Actions 提供五类自动化检查：

- **CI / Validate content and application** 在每次推送和面向 `main` 的 PR 中检查译文结构、1308 项来源指纹、仓库卫生、前端/服务端语法和应用 API 测试。同步 PR 必须在内容更新后通过此检查才能合入。
- **Automation / Open upstream synchronization PR** 可手动把上游 commit 指针放入一个独立 PR；它不自动合并。
- **Monitoring / Report upstream source changes** 每日检测 `main` 是否领先于当前发布快照；明确发现新提交时故意失败，并自动生成上游文件、关联中文内容、SHA-256 影响和具体 diff 的报告，创建或更新 `[Upstream] Source updates require review` Issue。
- **Monitoring / Check translation coverage** 每周检查已进入中文学习范围的 Phase 是否有缺少对应中文实践译文的上游课程，并创建或更新 `[Coverage] Chinese practice translations missing` Issue；尚未接入的 Phase 不会被纳入。
- **Security / Review dependency changes** 在面向 `main` 的 Pull Request 中运行官方 dependency review；high 及以上严重度的依赖变更会阻断合并。

`manage_upstreams.py --check` 只判断上游跟踪分支是否有新 commit；**Monitoring / Report upstream source changes** 再对已确认的更新生成改动文件、关联内容、SHA-256 影响和 diff 报告。前者是 freshness 信号，后者是 review 报告层。

上游 freshness 检查将退出码 2 解释为“跟踪分支有新提交”；这不是网络或权限错误。报告器随后把目标 revision 中的原文 SHA-256 与内容元数据中的已记录指纹比较：只有报告明确标注“确认 SHA-256 漂移”时，才可确认对应英文文件已改变。Issue 会通过 GitHub 的仓库/Issue 关注通知送达维护者；邮件服务不在仓库内保存凭据。

## 当前边界与限制

- 上下文理论层只呈现经过批准的关联；不会自动发布候选关联。
- 实践阅读器目前加载 Phase 0-13 的 279 节课程；Phase 14-19 的 232 节译文已审核但尚未接入；上下文理论层仍只呈现经过批准的关联。
- 中文测验目前覆盖当前开放范围内有上游 `quiz.json` 的 174 节课程；其余 105 节上游没有测验文件。
- 完整理论目录已经开放，但除 CLT《抽样》外的中文化不属于本次冻结范围。理论卡和中文理论阅读器的原文入口均跟随官方 `main`；没有可发布中文全文时，阅读目标为该最新英文 `main`。
- 理论课程本轮不保存进度、笔记、自测、助理状态或工作区数据；稳定 `theoryId` 只作为后续能力的接口。
- 应用仅运行在 `localhost`，不提供账户、多设备同步或托管模型服务。
- 学习数据备份不包含模型连接；完整迁移请按首次使用文档复制个人数据目录。
