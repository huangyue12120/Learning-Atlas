# Learning Atlas 审查修复跟踪

基线：`237ecff`（包含 Issue #34），分支：`fix/review-remediation`。实施日期：2026-11-06。
原始报告、原型与截图保留于 `review/`，不覆盖基线。原生 JavaScript、现有 API、SQLite 与课程审批范围保持不变。

| 阶段 | 问题 | 状态 | 验收条件 | 验证结果 | 提交 |
| --- | --- | --- | --- | --- | --- |
| 1 | S1–S4、安全与错误处理 | 已通过 | Host/Origin/JSON 边界、key 地址隔离、安全头、v0.27.4 | 安全回归 2/2；应用语法通过 | `fix(server): enforce local request and credential boundaries` |
| 2 | P1–P3、目录与默认入口 | 已通过 | 索引按依赖失效、批量 SQL、完整课程状态、20 次热请求中位降幅 ≥90% | API/缓存 30/30；20 次中位 569.63 ms，降低 91.6% | `perf(course): cache file dependencies and batch learner progress` |
| 3 | Markdown、D1/D2、深色图示 | 已通过 | marked + DOMPurify、稳定锚点、代码复制、系统中文字体、共享主题 | Chrome 2/2；应用语法通过；金额/引用/列表/HTML/代码/锚点/公式/双主题 | `fix(reader): render sanitized Markdown with shared theme tokens` |
| 4 | F1–F4、F6–F8、阅读器 | 已通过 | 外壳只初始化一次、SQLite 草稿、历史/竞态、翻页/筛选、响应式目录 | Chrome 5/5；API/持久化 31/31；语法通过 | `feat(reader): preserve lesson drafts and browser navigation` |
| 5 | F5/F7、P3、环境课 | 已通过 | 预测不计分、完整反馈、主动复习、60 秒撤销、备份 v4/v3、Python-first | API 35/35；Chrome 7/7；脚本 18/18（原 16 + 门禁 2）；结构与测验检查通过 | `feat(learning): add predictions and recoverable learner data operations` |
| 6 | 跨页面验收与发布 | 待实施 | 焦点/触控/主题、API 数量、截图对照、全部回归、v0.28.0 文档同步 | 待验证 | 待提交 |

## 回归清单

- 中文内容 T1–T14、Actions 已有修复记录保留；复跑六项内容检查与 16 项脚本测试。
- API：安全、随机监听端口、非法/超大 JSON、模型地址隔离、缓存失效、迁移、未知课程备份、撤销冲突与事务回滚。
- 浏览器：草稿/选项、历史、快速切课、预测/自测、复习、导入取消、键盘、模型本地桩。
- 视觉：375/768/1024/1440px，浅色/深色/减少动态效果，无页面横向溢出；代码和表格独立滚动。
- 使用临时数据目录和临时内容夹具，不写入个人数据，不修改真实上游文件。

## 后续任务（不阻塞本轮）

- 批量改善测验干扰项与选项长度偏差。
- 为全部 1832 道题人工建立精确段落映射。
- 学习助理流式输出与上下文裁剪。
- 重整重型 Python 可选依赖。
- 拆分大型发布说明、术语表；补充英文提示词示例的中文对照。

## 性能基线

2026-11-06，同环境、随机本机端口、临时 SQLite，预热 1 次再连续 20 次 `/api/course`：中位 6751.87 ms（6105.93–8778.45 ms）。

目录热请求中位 569.63 ms（459.95–763.05 ms），达到 ≥90% 降幅；100 ms 目标尚未达到，当前挂载文件系统逐文件 stat 是主要剩余成本，保持每次请求立即校验依赖，不用时间窗口牺牲来源门禁。

## 内容门禁补查

启用“待中文复核”发布门禁后，发现仍有 5 篇 `reviewed` 内容带该标记（并非原有练习提示批次）：P1 第 1 课总结表和 P17/P18 的 4 组参考链接。已逐项对照本地上游：总结表保留 9 条公式并译为中文，参考链接保留完整 URL、补充中文含义。课程数量与理论关联审批范围不变。环境课与练习指南新增显式 Python-first 编者注。
