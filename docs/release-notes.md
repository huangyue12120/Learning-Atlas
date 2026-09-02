# Learning Atlas v0.17.0 发布说明

发布日期：2026-09-02。

本版完成 T2「中关联理论 A」里程碑：新增 13 篇经维护者逐篇复核的理论译文，连同既有《抽样》和 T1 的 11 篇译文共发布 25 / 104 篇中文理论全文，覆盖 230 / 311 张理论卡关联；实践阅读器范围保持不变。

## 本版交付

- 新增 13 篇 `theory-translation`，保持上游章节顺序、标题层级、公式、代码、图片、表格、Mermaid 和链接语义；逐篇审核记录见 [`docs/t2-theory-review.md`](t2-theory-review.md)。
- 13 篇译文均针对 `maths-cs-ai-compendium` 的 `main` 快照 `9850ee574a370bc1cde59de98b394e953775b67d` 完成语义、结构、公式、代码和图示复核，并将英文原文入口统一保持为官方最新 `main`。
- 理论目录与 API 现在发布 25 篇 `readKind: internal` 的中文全文；缺失、`draft`、`stale` 或来源指纹不匹配的理论仍安全回退到官方英文 `main`。
- 更新 T2 应用回归测试，覆盖 13 个理论 ID、中文阅读入口、审核 revision、来源路径和官方 `main` 链接一致性；来源指纹检查扩展到 1398 条记录。

## 验证

- `python3 scripts/check_translation_correspondence.py`
- `python3 scripts/check_source_fingerprints.py`（1398 条来源指纹）
- `python3 scripts/check_theory_cards.py`（235 张已发布理论卡）
- `python3 scripts/check_repository_hygiene.py`
- `python3 scripts/check_translation_coverage.py --fail-on-missing`（15 个已发布 Phase，0 个缺译）
- `cd apps/local-learning && npm run check && npm test`（22/22）
- `git diff --check`

完整快照、内容计数与剩余理论缺口见[内容清单](content-manifest.md)、[项目进度](project-progress.md)和 [T2 审核表](t2-theory-review.md)。

---

# Learning Atlas v0.16.0 发布说明

发布日期：2026-09-01。

本版开放 Phase 14「Agent 工程」：54 节中文实践课程全部接入本地阅读器，阅读器累计开放 Phase 0–14 的 333 节课程；Phase 15–19 的 190 节内容继续保持 staged。

## 本版交付

- 补齐 Phase 14 第 43–54 节中文学习改编，当前快照的 523 节实践课程均有中文译文。
- 新增并核对 54 份中文测验（01–42 每课 7 题，43–54 每课 6 题），应用按上游题目数量动态处理。
- 新增 54 套 Python 工作区练习指南；工作区仍只复制缺失文件，不覆盖学习者已有修改。
- 将 12 条 P14 理论关联补齐为 rich theory card，包含上下文、直觉、关键点、应用和自检问题，并绑定对应的中文课程锚点。
- 更新覆盖率检查，使监控范围与应用已发布的 Phase 0–14 保持一致；Phase 15–19 的 staged 译文不会误触发缺译 Issue。

## 验证

- `python3 scripts/check_translation_correspondence.py`
- `python3 scripts/check_source_fingerprints.py`（1385 条来源指纹）
- `python3 scripts/check_theory_cards.py`（235 张已发布理论卡）
- `python3 scripts/check_repository_hygiene.py`
- `python3 scripts/check_translation_coverage.py --fail-on-missing`（15 个已发布 Phase，0 个缺译）
- `cd apps/local-learning && npm run check && npm test`（21/21）
- `git diff --check`

完整快照、内容计数与剩余 staged 范围见[内容清单](content-manifest.md)和[项目进度](project-progress.md)。

---

# Learning Atlas v0.15.0 发布说明

发布日期：2026-08-31。

本版完成 T1 高关联中文理论里程碑：新增 11 篇经维护者逐篇复核的理论译文，连同既有《抽样》共发布 12 / 104 篇中文理论全文，覆盖 154 / 311 张理论卡关联；实践阅读器范围保持不变。

## 本版交付

- 新增 11 篇 `theory-translation`，保持上游章节顺序、标题层级、公式、代码、图片和链接语义；审核表见 [`docs/t1-theory-review.md`](t1-theory-review.md)。
- 11 篇译文均针对 `maths-cs-ai-compendium` 的 `main` 快照 `9850ee574a370bc1cde59de98b394e953775b67d` 完成语义复核，并将英文原文入口统一保持为官方最新 `main`。
- 理论目录与 API 现在发布 12 篇 `readKind: internal` 的中文全文；缺失、`draft`、`stale` 或来源指纹不匹配的理论仍安全回退到官方英文 `main`。
- 更新 T1 应用回归测试，覆盖 11 个理论 ID、中文阅读入口、审核 revision、来源路径和官方 `main` 链接一致性。

## 验证

- `python3 scripts/check_translation_correspondence.py`
- `python3 scripts/check_source_fingerprints.py`（1319 条来源指纹）
- `python3 scripts/check_theory_cards.py`（223 张理论卡）
- `python3 scripts/check_repository_hygiene.py`
- `cd apps/local-learning && npm run check && npm test`（21/21）
- 使用独立临时 Chrome 完成 1440×1200 与 375×900 页面验收：章节目录、KaTeX 公式、4 个代码复制控件和 8 个 SVG 图片均正常；移动端章节抽屉可打开/关闭并恢复焦点，两个视口均无横向溢出。
- `git diff --check`

完整快照、来源指纹、当前范围和逐篇审核记录见[内容清单](content-manifest.md)、[项目进度](project-progress.md)与 [T1 审核表](t1-theory-review.md)。

---

# Learning Atlas v0.14.0 发布说明

发布日期：2026-08-31。

本版完成 P0 理论卡收尾与根项目许可证治理：223 张当前可见理论卡通过全量结构/链接复核和维护者确认的语义抽样；重复英文原文入口继续保持去重；原创软件与原创学习内容采用分层许可证，并补齐上游与第三方归属边界。

## 本版交付

- 维护者确认 `fast_worker` 对 223 张理论卡的逐卡结构化复核：实践锚点、理论来源、扩展字段和自检问题均通过，未发现具体疑点；技术语义仍明确记录为人工抽样结论，不把脚本当作语义证明。
- 将 C0 · [P0] 理论卡内容与展示重构标记为完成：英文 fallback 的重复目标只渲染一个入口，卡片提供上下文、直觉、关键点、应用和可回答的自检问题。
- 采用分层许可证：原创软件代码使用 Apache-2.0，原创文档/设计/独立学习内容使用 CC BY 4.0；上游 MIT/Apache-2.0、字体 OFL、GSAP Standard license 及其他依赖继续按各自条款分发。
- 新增 `LICENSE`、`LICENSE-CONTENT.md`、`THIRD_PARTY_NOTICES.md` 和 ADR 0023，并同步 README、内容清单、应用说明和项目进度。

## 验证

- `python3 scripts/check_theory_cards.py`（223 / 223）
- `python3 scripts/check_translation_correspondence.py`
- `python3 scripts/check_source_fingerprints.py`
- `python3 scripts/check_repository_hygiene.py`
- `cd apps/local-learning && npm run check && npm test`
- `git diff --check`

许可证边界和当前内容范围见[内容清单](content-manifest.md)与[第三方归属清单](../THIRD_PARTY_NOTICES.md)。

---

# Learning Atlas v0.13.1 发布说明

发布日期：2026-08-31。

本版完成 Issue #4 的上游内容复核：将 `ai-engineering-from-scratch` 的可复现快照从 `39ea8a1c6d0b61f071226eff7ede4d4105fed820` 更新到 `a56b4b8ad43a3767c771953d217036813f697bc7`，并处理唯一命中的本地中文内容指纹漂移。

## 本版交付

- 审核上游 `6cdb135c` 与 `a56b4b8a` 两个提交；新增的 12 节 Phase 14 课程（43–54）尚无中文改编，属于尚未接入阅读器的范围，不伪造或自动发布中文内容。
- 更新《向量、矩阵与运算》中文测验，使其与上游最新 `quiz.json` 的 6 题、阶段、选项、答案和解释对应，并记录新的 revision 与 SHA-256。
- 将上游实践源课程总数、Phase 14 待接入工作量和中文内容缺口同步到内容清单、项目进度和当前版本说明；当前实践阅读器边界仍为 Phase 0–13 的 279 节课程。
- `ai-engineering-from-scratch` 子模块跟踪上游 `main`；其他未命中本地版本化内容的上游改动经核对后保留为上游来源，不复制到 Learning Atlas。

## 验证

- `python3 scripts/check_translation_correspondence.py`
- `python3 scripts/check_source_fingerprints.py`
- `python3 scripts/check_repository_hygiene.py`
- `cd apps/local-learning && npm run check && npm test`

上述内容与应用门禁均通过；完整快照、来源指纹和当前范围见[内容清单](content-manifest.md)。

---

# Learning Atlas v0.13.0 发布说明

发布日期：2026-08-31。

本版完成当前开放课程上下文理论卡的渐进式内容与展示重构：223 张可见卡片从标题/摘要扩展为可展开的学习引导，同时保持理论全文来源和上游 `main` 的可追溯性。根项目许可证治理仍是下一次可再分发公开版本的阻断项。

## 本版交付

- 为当前开放课程的 223 张已批准理论卡补齐 `context`、`intuition`、2–4 个 `key_points`、`application` 和 `check_question` 字段；新增契约检查会拒绝缺失、过短、占位或重复内容。
- 将理论卡渲染拆为可复用的渐进式卡片组件：折叠状态保留上下文、标题、摘要和全文语言，展开后显示学习提示、关键点、自检问题和来源操作；移动端改为单列布局，操作目标保持可触摸尺寸。
- 将当前开放的 223 张理论卡绑定到中文课程中的对应标题锚点，并新增门禁检查，避免卡片只出现在 API 而未注入阅读正文。
- 增加迁移期 summary-only 兼容路径：缺少扩展字段的旧卡只显示已审核的标题、摘要和来源入口，并明确提示待迁移，不由应用生成未经审核的理论内容。
- 对理论来源目标做规范化去重：英文 fallback 只显示一个英文原文入口；中文全文与不同的官方英文 `main` 目标才同时显示。
- 将扩展卡片内容同步提供给学习助理证据和当前段落上下文，避免界面与助理使用不同的理论摘要；API 回归覆盖 223 张卡、HTML 转义和来源操作。
- 新增 `scripts/check_theory_cards.py` 并接入内容验证 workflow；全量来源指纹检查覆盖 1308 条记录，本地 API 测试 20/20 通过。

## 当前边界

- 223 张卡对应当前开放的 Phase 0–13；尚未接入阅读器的 88 张理论关联仍在后续 Phase 接入时迁移，不会因为本版而提前展示。
- 卡片的 `status: approved` 与结构检查不替代维护者对实践锚点、理论来源和技术语义的人工复核；未完成该复核的内容不得作为新的审核结论。
- 阅读器仍开放 Phase 0–13 的 279 节实践课程；Phase 14–19 的 232 节内容只显示“已审核，待接入”。

---

# Learning Atlas v0.12.0 发布说明

发布日期：2026-08-29。

本版将 `/` 升级为学习首页，并开放完整理论课程目录。实践课程仍是默认主线；理论课程可独立浏览，但本轮不增加理论进度、笔记、自测或助理状态。

## 本版交付

- 新增 Phase 0-19 实践课程地图和 20 章、104 篇笔记的理论目录；新学习者从 Phase 0 第一课开始，有学习记录时按“学习中、需复习、连续完成区段后的第一节未开始课程”选择继续目标。
- Phase 0-13 的 279 节课程继续使用实践阅读器；Phase 14-19 统一显示“已审核，待接入”，不生成可进入阅读器的目标。
- 新增 `/learn?lessonId=...` 实践规范链接和 `/theory?theoryId=...` 理论阅读器；原有 `/?lessonId=...` 深链接继续兼容。
- 理论目录在服务启动时从本地同步到上游 `main` 的快照建立缓存。只有 `status: reviewed` 且 SHA-256 与当前理论源匹配的中文正文会在应用内发布；draft、stale、缺失或指纹不符均回退到官方上游最新英文 `main`。中文正文的审核 revision 只用于追溯，不锁定原文入口。
- 第 15 课的 CLT 理论卡现在进入应用内《抽样》中文全文。理论阅读器支持两张上游 SVG、两处 KaTeX 公式、三段 Python 代码、章节目录、代码复制、审核来源追溯和上游 `main` 原文入口。
- 首页保留纸张色、深青、琥珀、Atlas Sans SC 与 Source Serif 4，使用真实 CLT、Transformer 与 RAG 教学图；GSAP 动画在移动端、低性能设备和 reduced-motion 下退化为静态最终状态。
- 新增课程首页与理论阅读器页面规范、ADR 0022，并同步领域语言以区分“理论课程”和连接实践与理论的“上下文理论层”。

## 当前边界

- 理论个人学习数据仍未建立。进度、笔记、自测、助理和工作区只属于实践课程。
- 中文理论正文是针对本地 `main` 快照审核的版本化内容；审核 revision 只作追溯，原文入口跟随官方 `main`，可能随上游变化。上游同步后，SHA-256 不匹配的旧译文会暂不发布，直到重新审核。
- Phase 14-19 只进入首页课程地图，不进入实践阅读器。

# Learning Atlas v0.11.0 发布说明

发布日期：2026-08-28。

本版完成 105 条候选实践—理论关联的人工审核与正式发布，并修复理论关联元数据的严格 YAML 格式和原文标题锚点问题；阅读器仍保持只开放 Phase 0–13 的边界。

## 本版交付

- 完成此前 105 条 `proposed` 实践—理论关联的逐条人工审核，全部更新为 `approved`；理论关联总数仍为 311 条，当前没有待审核候选。
- 修复 14 个关联文件中的严格 YAML 解析问题，并修正 1 个课程标题锚点；全量 311 个关联的 YAML、来源 SHA-256 和标题锚点校验通过。
- 让本地应用的轻量 YAML 标量解析器兼容合法的带引号标量，并同步更新受影响的理论卡 API 断言；应用 API 测试 14/14 通过。
- 审核期间使用临时本地工具记录人工选择；审核结果未写入版本库，工具已在审核完成后移除。

## 当前边界

- 阅读器开放 Phase 0–13 的 279 节课程；Phase 14–19 的 232 节已审核内容仍暂存于内容仓库，接入前还需补齐课程目录和端到端验收。
- 理论卡只展示已批准关联；当前 311 条关联均已批准，尚未接入阅读器的课程关联会在对应课程接入后展示。

# Learning Atlas v0.10.0 发布说明

发布日期：2026-08-28。

本版补齐当前开放课程的中文测验与 VS Code/Python 实作入口，并接入上游 Phase 13 新增课程；阅读器仍保持只开放 Phase 0–13 的边界。

## 本版交付

- 新增 Phase 13 第 24–31 课共 8 节经审核中文实践译文，当前内容仓库累计维护 511 节 Phase 0–19 译文；阅读器开放范围扩展到 Phase 13 的 31 节，共 279 节课程。
- 为当前开放范围内所有存在上游 `quiz.json` 的课程建立 174 份中文测验改编：Phase 0–5、Phase 7、Phase 10–11 和 Phase 13 均已覆盖；另外 105 节上游课程没有测验文件，不作为缺失项。
- 为当前开放范围内的 273 节 Python 课程建立 VS Code 工作区模板与练习指南，并修正应用把代码文件复制到工作区根目录后的指南路径；新增补齐 Phase 1 数学基础第 16–22 课的练习指南。
- 清理 Phase 5 的 29 份测验改编中的中英混杂文本和重复提示语，保留每题的来源、阶段和正确选项；来源指纹检查覆盖 1308 条记录。
- 更新本地应用、内容清单、项目进度和版本号至 v0.10.0；修正 Phase 13 课程数量的 API 测试断言。

## 当前边界

- 阅读器开放 Phase 0–13 的 279 节课程；Phase 14–19 的 232 节已审核内容仍暂存于内容仓库，接入前还需补齐课程目录和端到端验收。
- 中文测验覆盖当前开放范围内所有存在上游 `quiz.json` 的课程；没有对应上游测验文件的课程不会凭空生成题目。
- 当前开放范围的 279 节课程中，273 节提供 VS Code/Python 工作区模板与练习指南，其余课程没有 Python 实作资源。
- 理论卡只展示已批准关联；Phase 19 的 19 条已批准关联随尚未接入阅读器的课程内容暂不展示，`proposed` 关联不会自动展示。

# Learning Atlas v0.9.0 发布说明

发布日期：2026-08-28。

本版完成 Phase 19「综合项目」的中文学习改编，继续保持阅读器当前 Phase 0–13 的集成边界；v0.1 的应用与内容边界仍记录在 [`ADR 0018`](adr/0018-freeze-v0-1-around-reviewed-practice-and-context.md) 中。

## 本版交付

- 新增 Phase 19 共 85 节经审核中文实践译文，累计维护 503 节 Phase 0–19 译文；正文保留代码、公式、链接、图示结构和来源指纹，并完成占位文本与残留整段英文清理。
- 新增 22 条 Phase 19 实践—理论关联，其中 19 条已标为 `approved`、3 条保留为 `proposed`；理论关联总数为 311 条，其中 206 条 `approved`、105 条 `proposed`，候选关联不会自动展示。
- 保持 `ai-engineering-from-scratch` 锁定在 `39ea8a1c6d0b61f071226eff7ede4d4105fed820`，`maths-cs-ai-compendium` 锁定在 `9850ee574a370bc1cde59de98b394e953775b67d`。
- 更新内容清单、项目进度和本地应用版本号至 v0.9.0；结构检查覆盖 503 份实践译文和 1 份中文理论笔记，来源指纹检查覆盖 1160 条记录。

## 当前边界

- 阅读器继续开放 Phase 0–13 的 271 节课程；Phase 14–19 的 232 节已审核内容暂存于内容仓库，接入前还需补齐课程目录和端到端验收。
- 中文测验仍覆盖 Phase 0–1 的 34 节课程。
- 理论卡只展示已批准关联；Phase 19 的 19 条已批准关联随尚未接入阅读器的课程内容暂不展示，另有 3 条 `proposed` 关联以及其他候选关联不会自动展示。

---

# Learning Atlas v0.8.0 发布说明

发布日期：2026-08-27。

本版扩展版本化中文内容范围，保留阅读器当前 Phase 0–13 的集成边界；v0.1 的应用与内容边界仍记录在 [`ADR 0018`](adr/0018-freeze-v0-1-around-reviewed-practice-and-context.md) 中。

## 本版交付

- 新增 Phase 14–18 共 147 节经审核中文实践译文，累计维护 418 节 Phase 0–18 译文；正文完成 `$stop-slop` 语言复核，保留代码、公式、链接、图示结构和来源指纹。
- 新增 66 条实践—理论关联，其中 49 条 `approved`、17 条 `proposed`；应用仍只展示当前开放课程中的已批准关联。
- 保持 `ai-engineering-from-scratch` 锁定在 `39ea8a1c6d0b61f071226eff7ede4d4105fed820`，`maths-cs-ai-compendium` 锁定在 `9850ee574a370bc1cde59de98b394e953775b67d`。
- 更新内容清单与术语/审核记录；结构检查覆盖 418 份实践译文和 1 份中文理论笔记，来源指纹检查覆盖 1031 条记录。

## 当前边界

- 阅读器继续开放 Phase 0–13 的 271 节课程；Phase 14–18 已审核内容暂存于内容仓库，接入前还需补齐课程目录和端到端验收。
- 中文测验仍覆盖 Phase 0–1 的 34 节课程。
- 理论卡只展示已批准关联；Phase 14 的 12 条关联及其他标为 `proposed` 的关联不会自动展示。

---

## v0.7.0 历史版本

发布日期：2026-08-27。

本版在 v0.6 的课程范围和阅读器基础上，同步上游实践源并修复 freshness 检查；v0.1 的应用与内容边界仍记录在 [`ADR 0018`](adr/0018-freeze-v0-1-around-reviewed-practice-and-context.md) 中。

### 本版交付

- 将 `ai-engineering-from-scratch` 从 `7c3323508a5186739feecd76838ba1ae962c736f` 同步到 `39ea8a1c6d0b61f071226eff7ede4d4105fed820`；`maths-cs-ai-compendium` 保持在原锁定版本。
- 更新受上游改动影响的 19 份中文译文，完成结构对应和来源 SHA-256 复核；阅读器继续开放 Phase 0–13 共 271 节经审核中文实践课。
- 上游 Phase 13 现在包含第 24–31 课，但这些课程尚无中文改编，仍未接入阅读器；已接入的中文范围仍为 Phase 13 的 23 节课程。
- Phase 12 的 12 条已批准理论关联、Phase 13 的 8 条已批准理论关联继续随课程开放；异步任务和生产认证的 2 条候选关联仍保留在内容仓库，不会自动展示。
- 保留 Phase 0–1 的 34 份中文测验；Phase 2–13 尚未建立测验改编。
- 累计维护 223 条理论关联，其中 138 条已批准、85 条候选；应用只展示已批准关联，并支持同一课程段落下的多个已批准理论卡。
- 完成 Phase 12–13 理论关联复核：已同步受影响关联的上游指纹和原文锚点；视觉词元、跨模态生成、约束解码等关联保持最直接的理论锚点，异步任务和生产认证关联继续保留候选状态。
- 建立中文术语基线，并对现有译文完成一轮 `$stop-slop` 语言复核，重点处理模板化转折、填充语和夸张式引导。
- 课程侧栏以“未开始、学习中、已理解、需复习”呈现学习进度，当前课程单独突出。
- 代码块使用本地浏览器资源完成语法高亮；不依赖 CDN。
- 学习助理支持兼容模型的模型列表发现、单条对话删除和按课清空历史；回答优先使用课程内证据。
- 提供 JSON 与 Markdown 导出，以及经过校验、事务化的 JSON 恢复。
- 第 15 课补建中心极限定理专题理论笔记，并更新正式理论卡指向。

### 使用与备份

请阅读 [首次使用与恢复](first-use.md)。升级前先导出 JSON；需要连同模型连接和私人工作区迁移时，停止应用后复制整个个人数据目录。

### 已知限制

- 中文测验只覆盖 Phase 0–1。
- 学习助理由学习者自带的 OpenAI 兼容接口提供；应用不会托管或同步模型 key。
- 本版不提供联网搜索和多设备同步。
- JSON 恢复会替换学习数据，不能撤销；模型连接和私人工作区不会随 JSON 恢复。
- 理论卡只展示已批准关联，完整理论章节的中文化将单独推进。
