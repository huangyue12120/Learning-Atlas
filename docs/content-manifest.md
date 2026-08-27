# Learning Atlas v0.8.0 内容清单

冻结日期：2026-08-27。

## 当前发布快照与上游跟踪

| 上游仓库 | 锁定 revision | 许可证 |
| --- | --- | --- |
| `ai-engineering-from-scratch` | `39ea8a1c6d0b61f071226eff7ede4d4105fed820` | MIT |
| `maths-cs-ai-compendium` | `9850ee574a370bc1cde59de98b394e953775b67d` | Apache-2.0 |

此表记录 v0.8.0 的可复现发布快照。两个 submodule 同时配置为跟踪其上游 `main` 分支：每日检查只报告待审核更新，不会自动修改发布内容。中文改编、测验和理论关联的各自 front matter 均记录对应原文路径、revision 与 SHA-256。应用发现实践课程或测验的当前 SHA-256 不匹配时，会降级为“待同步”，不会向学习者发布旧内容。

## 内容快照与阅读器范围

内容仓库现有 Phase 0–18 共 418 节经审核中文实践课。阅读器当前开放 Phase 0–13 的 271 节；Phase 14–18 的 147 节已完成审核，待后续补齐课程目录和端到端验收后接入。上游 Phase 13 当前已有 31 节课程，其中第 24–31 课尚无中文改编，因此仍未接入阅读器。

| 范围 | 经审核实践译文 | 中文测验 | 阅读器状态 |
| --- | ---: | ---: | --- |
| Phase 0「环境与工具」 | 12 | 12 | 已开放 |
| Phase 1「数学基础」 | 22 | 22 | 已开放 |
| Phase 2「机器学习基础」 | 18 | 0 | 已开放 |
| Phase 3「深度学习核心」 | 13 | 0 | 已开放 |
| Phase 4「计算机视觉」 | 28 | 0 | 已开放 |
| Phase 5「自然语言处理基础到进阶」 | 29 | 0 | 已开放 |
| Phase 6「语音与音频」 | 17 | 0 | 已开放 |
| Phase 7「Transformer 深入理解」 | 16 | 0 | 已开放 |
| Phase 8「生成式 AI」 | 15 | 0 | 已开放 |
| Phase 9「强化学习」 | 12 | 0 | 已开放 |
| Phase 10「从零构建 LLM」 | 24 | 0 | 已开放 |
| Phase 11「LLM 工程」 | 17 | 0 | 已开放 |
| Phase 12「多模态 AI」 | 25 | 0 | 已开放 |
| Phase 13「工具与协议」 | 23 | 0 | 已开放 |
| Phase 14「智能体工程」 | 42 | 0 | 已审核，待接入 |
| Phase 15「自主系统」 | 22 | 0 | 已审核，待接入 |
| Phase 16「多智能体与群体」 | 25 | 0 | 已审核，待接入 |
| Phase 17「基础设施与生产」 | 28 | 0 | 已审核，待接入 |
| Phase 18「伦理、安全与对齐」 | 30 | 0 | 已审核，待接入 |
| **合计** | **418** | **34** | — |

理论关联共 289 条：187 条 `approved`，其中当前开放课程的已批准关联会在应用中展示；102 条 `proposed` 仅保留在内容仓库中。Phase 4 当前没有理论关联，Phase 5 的 33 条关联仍为候选，Phase 6 有 14 条已批准关联和 3 条候选关联，Phase 7 有 17 条已批准关联，Phase 8 有 10 条已批准关联和 6 条候选关联，Phase 9 有 1 条已批准关联和 9 条候选关联，Phase 10 有 11 条已批准关联和 13 条候选关联，Phase 11 有 6 条已批准关联和 11 条候选关联，Phase 12 有 12 条已批准关联，Phase 13 有 8 条已批准关联和 2 条候选关联，Phase 14 有 12 条候选关联，Phase 15 有 12 条已批准关联和 1 条候选关联，Phase 16 有 9 条已批准关联，Phase 17 有 24 条已批准关联和 3 条候选关联，Phase 18 有 4 条已批准关联和 1 条候选关联。第 15 课的中心极限定理卡指向 `chapter 04 - statistics/03. sampling.md`，并提供对应的版本化中文专题笔记。

术语基线与本轮译文语言复核记录在 [`docs/translation-glossary.md`](translation-glossary.md)。

## 内容验证

发布清单使用以下检查：

```bash
python3 scripts/check_translation_correspondence.py
python3 scripts/check_source_fingerprints.py
python3 scripts/check_repository_hygiene.py
cd apps/local-learning
npm run check
npm test
```

结构检查覆盖 418 份实践译文与 1 份版本化理论译文；来源指纹检查覆盖 1031 条记录；仓库卫生检查阻止学习数据、本地状态、凭据、私钥和常见令牌误入版本库。Python-first 例外必须在原位置明确链接到锁定的上游非 Python 实现。

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

- **CI / Validate content and application** 在每次推送和面向 `main` 的 PR 中检查译文结构、1031 项来源指纹、仓库卫生、前端/服务端语法和应用 API 测试。同步 PR 必须在内容更新后通过此检查才能合入。
- **Automation / Open upstream synchronization PR** 可手动把上游 commit 指针放入一个独立 PR；它不自动合并。
- **Monitoring / Report upstream source changes** 每日检测 `main` 是否领先于当前发布快照；明确发现新提交时故意失败，并自动生成上游文件、关联中文内容、SHA-256 影响和具体 diff 的报告，创建或更新 `[Upstream] Source updates require review` Issue。
- **Monitoring / Check translation coverage** 每周检查已进入中文学习范围的 Phase 是否有缺少对应中文实践译文的上游课程，并创建或更新 `[Coverage] Chinese practice translations missing` Issue；尚未接入的 Phase 不会被纳入。
- **Security / Review dependency changes** 在面向 `main` 的 Pull Request 中运行官方 dependency review；high 及以上严重度的依赖变更会阻断合并。

`manage_upstreams.py --check` 只判断上游跟踪分支是否有新 commit；**Monitoring / Report upstream source changes** 再对已确认的更新生成改动文件、关联内容、SHA-256 影响和 diff 报告。前者是 freshness 信号，后者是 review 报告层。

上游 freshness 检查将退出码 2 解释为“跟踪分支有新提交”；这不是网络或权限错误。报告器随后把目标 revision 中的原文 SHA-256 与内容元数据中的已记录指纹比较：只有报告明确标注“确认 SHA-256 漂移”时，才可确认对应英文文件已改变。Issue 会通过 GitHub 的仓库/Issue 关注通知送达维护者；邮件服务不在仓库内保存凭据。

## 当前边界与限制

- 上下文理论层只呈现经过批准的关联；不会自动发布候选关联。
- 阅读器目前加载 Phase 0–13 的 271 节课程；Phase 14–18 的 147 节译文已审核但尚未接入，上游新增的 Phase 13·24–31 也尚未接入；上下文理论层仍只呈现经过批准的关联。
- 中文测验目前覆盖 Phase 0–1 的 34 节课程，后续阶段尚未建立测验改编。
- 除 CLT 专题笔记外，理论知识库的完整中文化不属于本次冻结范围；理论卡仍保留锁定的英文原始笔记链接与课程内中文摘要。
- 应用仅运行在 `localhost`，不提供账户、多设备同步或托管模型服务。
- 学习数据备份不包含模型连接；完整迁移请按首次使用文档复制个人数据目录。
