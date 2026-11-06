# v0.31.0 七项尾项验收

2026-11-06，以 `6d8fbf8`（PR #37）为基线。本轮完成性能验收及四项工程/内容尾项；全库题目审核与精确回看继续分批进行，不能将七项全部标记完成。

## 题库与回看

数学基础剩余 21 课、106 题逐题读取题干、全部选项、正确索引、解析及正文。连同既有数学首课 5 题和 Phase 0 的 66 题，共 177/1832 题，剩余 1655 题。核对者为 Codex；记录不是外部人工签核，也不改变正式理论关联的审批范围。每题说明、证据和双指纹位于 `content/assessment-links/practice/01-math-foundations/*/links.json`，全库数量见 [progress.json](../assessment-review/progress.json)。

纠正负特征值、带条件的梯度下降、CLT 标准化、PCA 方差与任务效果、正交变换可含反射、view 步幅兼容、有限差分、拒绝采样维度、独立多重检验、bootstrap 抽样假设、KKT、单位根 N=1 例外、循环卷积与线性卷积等表述。补充显式编者注，原上游代码和公式未改。

Phase 1 正确选项唯一最长从 86/111 降到 50/111，全库从 1535/1832 降到 1499/1832。该统计用于发现提示性偏差，不证明语义正确；全部检索候选仍为 draft，未确认题目不会自动获得正式回看记录。

浏览器核对 Phase 0/1 全部 35 课、177 个实际渲染落点并提交正确答案确认评分。初测发现两处回退：历史 HTML 注释内标题污染索引，以及导语不在正文。排除隐藏注释并改用正文证据后通过复测；没有放宽精确锚点断言。

## 性能与四项修复

真实工作区、Node v22.23.1、I/O 线程 64，独立执行三组各 20 次热请求。最终中位为 **64.138 / 62.182 / 69.227 ms**，均低于 100 ms；本次修改前基线为 61.294 / 61.598 / 62.868 ms，也已达标。因此本轮没有提交额外缓存调度改动，不把环境改善归功于代码。此前高负载记录保留，不保证任意宿主和并发负载下达标。[原始测量](performance.json)同时保留前后结果。新增同大小写入并恢复 mtime、原子替换的即时失效测试；全部依赖检查和 SHA 门禁保持。

- 已确认的“奖励劫持”统一为“奖励投机”；通用“自主 agent”“研究代理”统一为智能体，代码标识符保持。发布内容扫描已加入脚本回归。
- 模型返回 HTML、非法 JSON、无效结构时显示中文错误，草稿保留且数据库不保存半条回复；API 与真实浏览器均验证。
- P13/45 私人工作区复制第 36 课目标和图示数据，仅在参考测试未修改时调整两处路径，原断言保留。39 项运行中 37 通过、2 项按上游编译器/记录平台条件跳过；缺少相邻目录导致的失败和站点缺失跳过已消除。学习者修改与上游文件保持。
- diff 背景使用 primitive → semantic → component token；理论卡说明可读内容，移除维护者文案。浏览器截图另存新目录，默认测试截图改用临时目录。

## 回归与截图

应用语法、API 43/43、脚本 24/24、浏览器 60 项分批全部通过。六项内容校验、候选/177 条正式证据指纹、版本/锁文件和差异卫生通过；测验保留 6 条既有英文关键词意译警告。完整计数见 [validation.json](validation.json)。所有验收使用临时数据库与工作区。

[screenshots](screenshots/) 保存 44 张本轮截图，覆盖 375/768/1024/1440px、浅深主题、首页/阅读器/理论页、辅助面板、公式/图示及回看/流式状态。旧基线位于 [review/remediation](../remediation/README.md)、[review/followups](../followups/README.md)和 [review/assessment-review](../assessment-review/README.md)，不覆盖原图。本轮目视检查移动深色与桌面浅色截图，无横向溢出；其他宽度由浏览器断言验证。

复现：`cd apps/local-learning && npm test`；`ATLAS_REVIEW_SCREENSHOTS_DIR=../../review/seven-issue-remediation/screenshots npm run test:browser`；`npm run benchmark`。内容检查与脚本使用仓库根目录的 `scripts/`。

对应提交主题：`fix(review): close runtime gaps and review math quizzes`。剩余范围按 [七项跟踪](../../docs/seven-issue-remediation.md)继续记录。
