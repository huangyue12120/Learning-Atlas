# GitHub Actions 审查：Phase 13 新增 14 课为什么没有被发现（2026-10-23）

范围：`.github/workflows/` 下 4 个 workflow，以及它们调用的 `scripts/manage_upstreams.py`、`scripts/report_upstream_changes.py`、`scripts/check_translation_coverage.py`。本文同时记录本次已做的修复和仍未处理的问题。

## 0. 结论

两条监控 workflow 都按代码运行了，没有报错，也没有漏跑。问题出在设计上。

- **上游检查**（Monitoring / Report upstream source changes）只把“改动命中已登记的中文内容”当作需要审核。新课程还没有中文内容，所以永远不会被登记，也就永远不会触发审核。
- **覆盖率检查**（Monitoring / Check translation coverage）只检查**已锁定**的 submodule 快照，并且每周只跑一次。新课程在 submodule 指针更新之前不在快照里，指针更新之后要等到下一个周一才会被检查。

两者之间留出了一段空窗：上游新增课程以后，到下一次周检之前，没有任何检查会报告它。这次空窗从 10-14 一直持续到今天。如果没有手动发现，要等到 10-26 的周检才会出现 Issue。

## 1. 时间线

| 时间 | 事件 | 监控的表现 |
| --- | --- | --- |
| 10-13 | 锁定 `f0c979b9` | — |
| 10-14 | 上游 `46b04a88` 新增逆向工程轨道（14 节课，Phase 13 第 32–45 课） | — |
| 10-15 至 10-22 | 每日上游检查 | 每天都判定 relevant=true，但原因是另外 190 篇已登记译文和 146 条理论关联被改动，与新课程无关。报告共 2795 个改动文件，超过 60 KB 的上限后只保留摘要，新增课程在 Issue #30 中从未被单独列出。 |
| 10-19 | 周检覆盖率（快照仍是 `f0c979b9`） | 0 个缺失。当时快照里还没有这 14 节课。 |
| 10-22 | 提交 `8499538` 直接推送到 main，把指针移到 `f7aadc1d` | CI 通过：CI 没有覆盖率步骤，覆盖率 workflow 也不在 push 时触发。 |
| 10-26（预计） | 下一次周检 | 才会第一次报告这 14 节课。 |

另外，Issue #30 的内容在 10-22 已经处理完，但没有任何 workflow 会关闭它，直到今天才手动关闭。

## 2. 根因

### R1（P1）上游检查不把“已开放 Phase 的新课程”视为需要审核

`has_relevant_changes()` 只查询已登记产物的来源路径索引。新课程的 `docs/en.md` 和 `quiz.json` 没有对应的产物，表格里显示为“无已记录的中文内容关联”，和站点文件、构建脚本处于同一类。

后果：如果某次上游更新**只**新增课程，不会创建任何 Issue。Issue #30 之所以存在，只是因为同期还有别的已登记内容被改动。

### R2（P1）覆盖率检查只看锁定快照，而且只在每周一运行

`check_translation_coverage.py` 扫描的是本地 submodule 的工作树，所以它只能看到已经同步进来的课程。触发条件只有 `schedule` 和 `workflow_dispatch`。CI 也不运行这个检查。因此，submodule 指针更新后，覆盖缺口最多要等 7 天才会被报告。

### R3（P2）大报告截断后丢失新增课程信息

报告超过 `MAX_REPORT_BYTES`（60,000 字节）时，正文只保留每个上游的 compare 链接和计数。新增课程本来就没有单独的计数，截断之后在 Issue 里完全看不到。

### R4（P2）两类 Issue 都没有自动关闭

问题解决后，两条 workflow 都不会关闭对应的 Issue。Issue #30 因此在内容处理完之后一直开着，维护者无法根据 Issue 状态判断工作是否已经完成。

### R5（P3）发布范围在两处分别维护

`PUBLISHED_PHASES` 写在 `check_translation_coverage.py` 里，注释要求它和 `server.ts` 的 `phases` 常量“保持一致”，但没有任何检查。将来开放 Phase 19 时，只要漏改其中一处，监控就会静默漏掉整整一个 Phase。

### R6（P3）其他维护问题

- 覆盖率脚本默认把报告写到仓库根目录的 `translation-coverage-report.md`，本地运行会留下一个未跟踪文件（根目录原来的那份内容已过期）。
- `python3 -m unittest scripts/test_report_upstream_changes.py` 单独运行时会因为找不到模块而失败，只有 CI 的 `discover -s scripts` 写法能通过。

## 3. 本次修复

| 问题 | 修复 | 文件 |
| --- | --- | --- |
| R1 | 新增 `adaptation_gaps()`：已开放 Phase 中新增或修改的 `docs/en.md` 和 `quiz.json`，如果没有对应的中文产物，就记为缺口。存在缺口时 relevant=true，报告里会出现“已开放 Phase 中缺少中文适配的上游课程”表，列出建议的中文路径。删除的文件不算缺口，未开放 Phase（19）也不算。 | `scripts/report_upstream_changes.py` |
| R2 | 覆盖率 workflow 增加 `push` 触发：`main` 上 `ai-engineering-from-scratch` 指针、`content/translations/practice/**`、`content/assessments/practice/**`、`server.ts` 或范围脚本变化时立即运行。覆盖率检查同时检查中文测验。CI 增加一个只发警告的覆盖率步骤，在提交和 PR 上生成 warning 注释，并把报告写入 job summary。 | `.github/workflows/translation-coverage.yml`、`content-validation.yml`、`scripts/check_translation_coverage.py` |
| R3 | 截断后的摘要保留缺口计数和缺口表（最多 60 行）。 | `scripts/report_upstream_changes.py` |
| R4 | 覆盖率检查通过时关闭 `[Coverage]` Issue。上游检查的退出码为 0（已与上游一致），或者 relevant=false 时，关闭 `[Upstream]` Issue，并在评论里附上运行链接。 | 两个监控 workflow |
| R5 | 新增 `scripts/published_scope.py` 作为唯一的范围定义，两个监控脚本都从这里导入。`test_monitoring_scope.py` 会解析 `server.ts`，断言两边一致。 | `scripts/published_scope.py`、`scripts/test_monitoring_scope.py` |
| R6 | 覆盖率脚本默认输出到 stdout；生成的报告和日志文件加入 `.gitignore`；测试文件自己设置 `sys.path`，可以单独运行。 | `scripts/check_translation_coverage.py`、`.gitignore`、`scripts/test_*.py` |

为什么 R4 的自动关闭是安全的：报告比较的是“锁定指针 → 上游 main”。只要 relevant 的改动还没有同步进来，它就一直在这段 diff 里，relevant 也一直是 true。同步时，CI 的来源指纹检查会拒绝任何过期的已登记内容。所以 relevant 变回 false，只可能是因为改动已经同步，并且通过了指纹检查。

## 4. 验证

- **回放真实历史**：用 `f0c979b9..f7aadc1d` 的真实 diff（2795 个文件），并去掉 14 节新课的产物，模拟翻译之前的状态：报告 relevant=true，缺口 28 项（14 篇译文 + 14 份测验）。报告大小 59,999 字节，仍在上限之内，缺口表完整保留在截断后的摘要中。只保留新增课程相关的 579 个文件再跑一次，relevant 仍为 true（修复前这种情况会是 false）。
- **当前状态**：上游 `f7aadc1d..04551bee` 的缺口为 0，relevant=false。下一次每日检查不会再开 Issue。
- **覆盖率**：`check_translation_coverage.py --fail-on-missing` 输出 “0 missing adaptations”，退出码 0。临时移走第 45 课的译文后，CI 步骤会输出 `::warning` 并写入 summary，退出码仍为 0（只警告，不阻断）。
- **测试**：`python3 -m unittest discover -s scripts -p 'test_*.py'` 共 14 项通过，其中新增 7 项：新课程触发审核、未开放 Phase 不触发、已翻译或已删除的文件不算缺口、截断后保留缺口表、范围与 `server.ts` 一致、覆盖率同时报告译文和测验缺口、期望路径映射。两个测试文件都可以单独运行。
- **actionlint 1.7.12**：4 个 workflow 无报错。本机没有安装 shellcheck，所以 `run:` 中的 shell 没有经过 shellcheck。关闭 Issue 时的评论文本已在 bash 中单独验证。

需要在首次推送后确认的一点：`push.paths` 中的 `ai-engineering-from-scratch` 用来匹配 submodule 指针变化。下一次同步 submodule 的提交推到 main 后，请确认 Monitoring / Check translation coverage 被触发了。

## 5. 第二轮修复（原“未修改的问题”）

第一版报告列出的 8 项中，定时任务的运行延迟是 GitHub 调度的正常行为，保持不变。其余 7 项已在本轮修复：

| 严重度 | 问题 | 修复 | 文件 |
| --- | --- | --- | --- |
| P2 | 需要审核时，监控 workflow 每天以失败结束 | 两条监控 workflow 删除了最后的 “Fail when …” 步骤和 `continue-on-error`。检查步骤只在退出码不是 0 或 2 时失败（执行、网络或权限故障）；退出码 2 改为输出 `::notice`，并通过 Issue 和 summary 提醒。现在红色运行只表示监控本身出了故障。 | `upstream-freshness.yml`、`translation-coverage.yml` |
| P2 | CI 用 Python 3.12，项目要求 3.14 | 所有 `setup-python` 改用 `python-version-file: .python-version`（3.14；`actions/python-versions` 已有 3.14.9）。本机用 3.14.8 运行脚本测试，全部通过。 | 3 个使用 Python 的 workflow |
| P2 | action 按 tag 固定；同步 workflow 保留了 checkout 凭据 | 所有 action 改为按 commit SHA 固定，并以注释标明版本：checkout v4.4.0、setup-python v5.6.0、setup-node v4.4.0、upload-artifact v4.6.2（都是各自 major 版本的最新发布，SHA 与当前 major tag 指向的提交相同，行为不变）。新增 `.github/dependabot.yml`，每周把 action 更新合并成一个 PR。同步 workflow 改为 `persist-credentials: false`，只在 `git push` 这一条命令里通过 `http.extraheader` 临时传入令牌，并用 `::add-mask::` 隐藏。 | 4 个 workflow、`.github/dependabot.yml` |
| P3 | 覆盖率不检查练习指南 | `code/` 下有顶层 `.py` 文件的课程（与阅读器 `resources.workspace` 的判断一致）必须有 `EXERCISES.md`。覆盖率检查和每日上游检查都会把缺少的指南列为缺口；同一课有多个 `.py` 文件只算一项，只有 TypeScript 实作的课程不需要指南。 | `published_scope.py`、`check_translation_coverage.py`、`report_upstream_changes.py` |
| P3 | 理论上游新增笔记没有提示 | 报告新增“新增理论笔记（仅供参考）”一节，列出上游新增、且没有中文译文的笔记（截断后的摘要也保留）。阅读器会以英文 `main` 显示这些笔记，所以它们不触发审核，也不会创建 Issue。 | `report_upstream_changes.py` |
| P3 | 同步 PR 正文是英文，也没有覆盖率信息 | 正文改为中文，包含合并前检查清单、`git diff --submodule=short` 的结果，以及同步后运行覆盖率检查得到的报告。正文超过 60,000 字节时，会在 UTF-8 字符边界截断，并提示到 job summary 查看完整报告。 | `sync-upstreams-pr.yml` |
| P3 | CI 重复执行 `node --check public/app.js` | 已删除，`npm run check` 已经包含这一检查。 | `content-validation.yml` |

### 第二轮验证

- `python3 -m unittest discover -s scripts -p 'test_*.py'`：16 项通过。新增测试覆盖：已有指南的课程不算缺口、同一课多个 `.py` 只算一项、TypeScript 课程不需要指南、新增理论笔记只列出不触发审核。
- 用真实的 `f0c979b9..f7aadc1d` diff 回放翻译之前的状态，得到 42 项缺口（14 篇译文、14 份测验、14 份练习指南）。报告大小为 59,644 字节，relevant=true。当前上游 `f7aadc1d..04551bee` 没有缺口，relevant=false。
- `check_translation_coverage.py --fail-on-missing`：0 项缺口，退出码 0。临时移走第 45 课的 `EXERCISES.md` 后，报告列出 1 项“练习指南”缺口。
- actionlint 1.7.12 搭配 shellcheck 0.10.0 检查 4 个 workflow，没有报错（已确认 shellcheck 集成会对故意写错的脚本报 SC2086）。
- 用桩脚本模拟检查步骤：退出码 0 和 2 时步骤成功，退出码 1 时步骤失败。另外生成了一份 3000 行的覆盖率报告来测试 PR 正文：截断到 59,999 字节，UTF-8 仍然有效。

推送后仍需确认：Dependabot 会在首次运行时打开 PR，确认 SHA 注释被正确更新；同步 workflow 第一次实际运行时，确认 `git push` 能通过临时令牌成功。
