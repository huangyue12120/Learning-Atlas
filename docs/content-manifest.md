# Learning Atlas v0.2 内容清单

冻结日期：2026-08-21。

## 当前发布快照与上游跟踪

| 上游仓库 | 锁定 revision | 许可证 |
| --- | --- | --- |
| `ai-engineering-from-scratch` | `d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051`（`v2026.07-27-gd0ac5d9`） | MIT |
| `maths-cs-ai-compendium` | `9850ee574a370bc1cde59de98b394e953775b67d` | Apache-2.0 |

此表记录 v0.2 的可复现发布快照。两个 submodule 同时配置为跟踪其上游 `main` 分支：每日检查只报告待审核更新，不会自动修改发布内容。中文改编、测验和理论关联的各自 front matter 均记录对应原文路径、revision 与 SHA-256。应用发现实践课程或测验的当前 SHA-256 不匹配时，会降级为“待同步”，不会向学习者发布旧内容。

## 已发布范围

阅读器当前开放 Phase 0–6；Phase 7–11 的译文已完成审核，但尚未接入阅读器。

| 范围 | 经审核实践译文 | 中文测验 | 阅读器状态 |
| --- | ---: | ---: | --- |
| Phase 0「环境与工具」 | 12 | 12 | 已开放 |
| Phase 1「数学基础」 | 22 | 22 | 已开放 |
| Phase 2「机器学习基础」 | 18 | 0 | 已开放 |
| Phase 3「深度学习核心」 | 13 | 0 | 已开放 |
| Phase 4「计算机视觉」 | 28 | 0 | 已开放 |
| Phase 5「自然语言处理基础到进阶」 | 29 | 0 | 已开放 |
| Phase 6「语音与音频」 | 17 | 0 | 已开放 |
| Phase 7「Transformer 深入理解」 | 16 | 0 | 已审核，待接入 |
| Phase 8「生成式 AI」 | 15 | 0 | 已审核，待接入 |
| Phase 9「强化学习」 | 12 | 0 | 已审核，待接入 |
| Phase 10「从零构建 LLM」 | 24 | 0 | 已审核，待接入 |
| Phase 11「LLM 工程」 | 17 | 0 | 已审核，待接入 |
| **合计** | **223** | **34** | — |

理论关联共 201 条：118 条 `approved`，其中当前开放课程的已批准关联会在应用中展示；83 条 `proposed` 仅保留在内容仓库中。Phase 4 当前没有理论关联，Phase 5 的 33 条关联仍为候选，Phase 6 有 14 条已批准关联和 3 条候选关联。第 15 课的中心极限定理卡指向 `chapter 04 - statistics/03. sampling.md`，并提供对应的版本化中文专题笔记。

术语基线与本轮译文语言复核记录在 [`docs/translation-glossary.md`](translation-glossary.md)。

## 内容验证

发布清单使用以下检查：

```bash
python3 scripts/check_translation_correspondence.py
python3 scripts/check_source_fingerprints.py
cd apps/local-learning
npm run check
npm test
```

结构检查覆盖 223 份实践译文与版本化理论译文；来源指纹检查覆盖 660 条记录。Python-first 例外必须在原位置明确链接到锁定的上游非 Python 实现。

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

GitHub Actions 提供三层守门：

- **Upstream freshness** 每日检测 `main` 是否领先于当前发布快照；发现更新时故意失败，以提醒维护者审核。
- **Create upstream synchronization PR** 可手动把上游 commit 指针放入一个独立 PR；它不自动合并。
- **Content and application validation** 在每次推送和面向 `main` 的 PR 中检查译文结构、660 项来源指纹、前端/服务端语法和应用 API 测试。同步 PR 必须在内容更新后通过此检查才能合入。

## 当前边界与限制

- 上下文理论层只呈现经过批准的关联；不会自动发布候选关联。
- 阅读器目前加载 Phase 0–6 的 139 节课程；Phase 7–11 的 84 节译文尚未接入课程目录。
- 中文测验目前覆盖 Phase 0–1 的 34 节课程，后续阶段尚未建立测验改编。
- 除 CLT 专题笔记外，理论知识库的完整中文化不属于本次冻结范围；理论卡仍保留锁定的英文原始笔记链接与课程内中文摘要。
- 应用仅运行在 `localhost`，不提供账户、多设备同步或托管模型服务。
- 学习数据备份不包含模型连接；完整迁移请按首次使用文档复制个人数据目录。
