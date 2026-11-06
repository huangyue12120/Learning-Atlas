# P19 按既有 review 问题复查

后续修复见 [v0.33.0 P19 修复记录](../docs/p19-remediation.md)。以下保留 v0.32.0 检查基线与原始发现。

日期：2026-11-07。检查基线：v0.32.0 / `c872c104c3a2ca26dc491880c7a0f252c337d89d`。

对照 [REVIEW.md](REVIEW.md)、[TRANSLATION-REVIEW.md](TRANSLATION-REVIEW.md)、[ACTIONS-REVIEW.md](ACTIONS-REVIEW.md) 及其后续验收记录，检查 P19 全部 85 篇译文、85 份测验（530 题）、85 份练习指南和 22 张理论卡。结构、来源对应、选项长度和证据覆盖做全量检查；可疑命令与界面行为另做运行复现。本轮没有重新逐题完成 530 题的语义审核，也没有重跑全部 85 个 Python 入口。

结论：确认 **5 项需跟进问题**，另有 **1 项新增解析归属建议**。正文测试命令失败为本轮新复现；长度偏差和精确回看缺口是既有未完成项在 P19 的延续。原 [P19 接入记录](../docs/p19-review.md) 的语义审核不等于这两项已经完成。

数值、逐课统计、失败输出及真实接口提交结果见 [p19-recheck/validation.json](p19-recheck/validation.json)。本轮只新增报告和证据，不修改课程、应用、旧 review、来源快照或审核状态。

## 需跟进问题

### P19-R1 · P1：58–63 课正文测试命令均无法运行

与旧 review 的 T3、T12 及工作区验收问题相关：正文与指南给出不同的执行命令，原运行验收仅覆盖指南。

在实际 `prepareWorkspace` 创建的全新私人工作区中，逐课从工作区根目录执行正文命令：

```bash
python3 -m unittest code/test_main.py
```

6 课全部退出码为 1，报 `AttributeError: module 'code' has no attribute 'test_main'`。`code/` 没有 `__init__.py`，该调用把路径当模块导入，与标准库 `code` 模块冲突。复现环境为 Linux、项目 `.venv` 的 Python 3.14.10；没有修改上游或学习者代码。

| 课程 | 正文命令位置 |
| --- | --- |
| 58 `vision-encoder-patches` | [zh.md:115](../content/translations/practice/19-capstone-projects/58-vision-encoder-patches/zh.md#L115) |
| 59 `vit-transformer` | [zh.md:137](../content/translations/practice/19-capstone-projects/59-vit-transformer/zh.md#L137) |
| 60 `projection-layer-modality-align` | [zh.md:117](../content/translations/practice/19-capstone-projects/60-projection-layer-modality-align/zh.md#L117) |
| 61 `cross-attention-fusion` | [zh.md:126](../content/translations/practice/19-capstone-projects/61-cross-attention-fusion/zh.md#L126) |
| 62 `vision-language-pretraining` | [zh.md:121](../content/translations/practice/19-capstone-projects/62-vision-language-pretraining/zh.md#L121) |
| 63 `multimodal-eval` | [zh.md:142](../content/translations/practice/19-capstone-projects/63-multimodal-eval/zh.md#L142) |

指南使用的 discover 命令在相同工作区中可运行，本轮抽验第 58 课 9 项、第 62 课 7 项测试通过：

```bash
python3 -m unittest discover -s code -p "test_main.py" -v
```

建议：保留来源命令，在正文同一教学位置增加显式编者注，说明工作区应使用 discover；将正文命令也纳入后续运行验收。原记录的“69 条测试命令通过”指指南命令，不能据此推断正文命令也通过。

### P19-R2 · P2：正确选项长度仍明显泄露答案

对应 REVIEW C2、后续 A4。以现有 `assessment_review.plain()` 去除 Markdown 标记和空白后计长度：

- P19 正确选项唯一最长：**456/530（86.0%）**；冻结上游为 477/530（90.0%）。
- 不读题、每题只选最长选项，并列时取第一个：通过真实测验接口逐课提交，得到 **464/530（87.5%）**。
- 答案索引 0–3 分别为 129、138、117、146 题；单纯打乱答案位置不能消除长度提示。

| 批次 | 题数 | 正确选项唯一最长 |
| --- | ---: | ---: |
| 01–17 | 118 | 101 |
| 20–29 | 64 | 46 |
| 30–49 | 120 | 107 |
| 50–69 | 120 | 104 |
| 70–87 | 108 | 98 |

例如 [87 课第 3 题](../content/assessments/practice/19-capstone-projects/87-end-to-end-safety-gate/zh.json#L38)，选项长度为 `[6, 74, 7, 7]`，正确选项同时包含完整的模块与动作枚举。公开取题接口没有返回正确答案；高分来自选项本身的提示。

建议：按概念粒度重写干扰项，让各选项在具体程度上可比，保留正确索引及来源语义；不要用无关填充凑长度。统计指标只是风险筛选，不能替代逐题语义判断。

### P19-R3 · P2：530 题全部只能回看整课

对应 F5 的反馈回看及后续 A5。P19 没有正式 `content/assessment-links/practice/19-capstone-projects/*/links.json`；[progress.json](assessment-review/progress.json#L91) 也记录 0/530 条正式证据。真实提交全部 85 课后，530 条反馈的精确 `reference` 均为空。

[app.js:329](../apps/local-learning/public/app.js#L329) 因而统一落到 `#lesson-body`，显示“回看本课正文”。界面没有冒称精确定位，但旧 review 要求的逐题相关段落回看仍未覆盖新里程碑。已有 draft 候选和新测验语义审核不等于正式映射；P19 接入记录已披露这一区别，本项属于已知未完成工作。

建议：逐题核对证据位置、译文/测验指纹及真实渲染锚点后，再发布正式映射；以 530 个真实反馈落点验收。

### P19-R4 · P3：两处旧术语问题仍在新增范围出现

对应 T10、C3 和术语统一后续项，参照 [术语表](../docs/glossary/01.md#L31)：

- [65 课 Mermaid:45](../content/translations/practice/19-capstone-projects/65-hybrid-retrieval-bm25-dense/zh.md#L45) 仍为 `Top-k 切块`，应统一为“分块”。
- [02 课测验解析:61](../content/assessments/practice/19-capstone-projects/02-rag-over-codebase/zh.json#L61) 把交叉编码器 reranking 写为“重新排序”，应统一为“重排”。

第 56 课“重新排序队列”描述的是调度队列操作，不属于 reranking 术语问题，不建议机械替换。

### P19-R5 · P3：当前跟踪表的剩余题数未随发布更新

[docs/review-followups.md:11](../docs/review-followups.md#L11) 标题为“当前 v0.32.0”，A5 状态却仍写“剩余 1655 题”。当前为 2362−177＝**2185 题**；同文件 P19 追加段落和进度 JSON 已给出正确值，当前状态表与它们冲突。

建议只更新顶部当前状态。下方按 v0.28.0、v0.31.0 等版本记录的历史数字保留。

## 补充观察：新增解析的归属标识

对应 T13 的来源边界，但**未发现其所述套话问题**：P19 没有同一句解析用于超过两道题的情况，不能因为源解析为空就判定中文解析错误。

冻结上游共有 148 题 `explanation` 为空。其中 82–87 课的 36 条中文解析已明确写“上游本题未提供解析。改编补充：”；01–12、14–17 课的另外 **112 条**没有采用该标识。例如 [01 课中文第 1 题](../content/assessments/practice/19-capstone-projects/01-terminal-native-coding-agent/zh.json#L22) 的解析有实际内容，而[源题解析为空](../ai-engineering-from-scratch/phases/19-capstone-projects/01-terminal-native-coding-agent/quiz.json#L15)。

建议统一新增解析的来源说明，并在 P19 复核记录中补齐统计。这是归属一致性建议，不是本轮证明的 112 处语义错误，也不否定用户已授权的 Codex 语义复核。

## 已检查且本轮未复现的旧问题

| 旧问题范围 | 本轮证据与边界 |
| --- | --- |
| S1–S4 本地边界、密钥与导入 | API/模块测试 45/45 通过，覆盖 Host/Origin、实际监听端口、跨端点密钥复用、备份恢复及非法导入回滚；本轮没有做新的外部渗透测试 |
| F1–F3、F5、F7 草稿、历史、读前预测、移动焦点 | 1440/375px 专项通过：测验选择与理论卡展开状态在换主题、前进返回、刷新后保留；笔记草稿恢复；读前预测不生成成绩；移动对话框焦点约束、Escape 与焦点归还有效 |
| Markdown 渲染、单一主标题和内容过期门禁 | 既有 `capstone.spec.js`、`markdown.spec.js` 共 5/5 通过；P19 首页/跨阶段导航、stale 降级、引用/列表/公式和安全渲染通过。本轮另加的 3 项临时诊断通过，其中 1 项用于确认 R2/R3，并非证明其质量合格 |
| T1 题目对应、T2 时长 | 85 份测验结构/答案索引对应检查零错误，有 5 条数字/专名意译警告；API 检查 P19 85 课均有可解析时长。结构检查不等于全量语义复核 |
| T3/T4 列表与结构，尤其 P19 60–63 | 85 篇结构检查通过；原 60–63 测试清单已恢复为列表，62 课原先错误的测试描述已修正；本轮另外发现 R1 的命令问题 |
| T5–T11、T14 术语与英文残留 | 除 R4 外，未命中旧 review 指出的奖励投机错误译法、待中文复核英文提示、通用 agent 误写“代理”、系统提示词漏词等模式；代码、产品名和术语中的英文不算漏译 |
| T12 指南与 P19 理论卡 | 85 份指南齐全，未命中旧通用模板；22 张 P19 卡已扩展。全库 311 张卡内容契约校验通过，不等于本轮逐卡重做语义审核 |
| 性能与来源失效 | 正式工作区三组各 20 次目录热请求，中位 71.651/70.283/69.770 ms；文件改写、新增、删除和同大小改写失效测试通过。首组单次最大 125.020 ms，不保证每次或任意负载均低于 100 ms |
| ACTIONS R1/R5、指南监控与可选依赖 | 25 项脚本测试通过，覆盖 P19 监控范围与阅读器一致、缺译文/测验/指南检测；20 个开放 Phase 零缺口；离线锁文件检查通过。未重新触发远程 workflow，不把本地通过当作新增线上验收 |

来源指纹 1645 条、全库 311 张卡、仓库卫生与候选/正式证据统计校验通过。复查使用临时数据库和私人工作区，没有导入或保存真实学习者数据。原上游子模块和共享 Python 环境未改动。

## 可重复的基础检查

从仓库根目录执行：

```bash
python3 scripts/check_translation_correspondence.py content/translations/practice/19-capstone-projects/*/zh.md
python3 scripts/check_assessment_correspondence.py content/assessments/practice/19-capstone-projects/*/zh.json
python3 scripts/check_source_fingerprints.py
python3 scripts/check_theory_cards.py
python3 scripts/check_translation_coverage.py
python3 scripts/assessment_review.py --check
```

应用 API 与现有浏览器专项从 `apps/local-learning/` 运行 `npm test`、`npm run test:browser -- capstone.spec.js markdown.spec.js`；性能使用同目录的 `npm run benchmark`。R1 在每课新建私人工作区根目录执行上述两种命令即可对照；R2/R3 按“最长选项、并列取首个”的规则，通过公开取题接口读取选项，再逐课提交测验接口核对得分及 `reference`。不要对真实学习者数据库执行诊断提交。
