# v0.28.0 审查修复视觉记录

2026-11-06。截图由真实 Chrome 在临时学习数据库下生成，宽度为 375、768、1024、1440px，高度 900px；正文截图使用减少动态效果设置。交互回归另以默认动态效果运行。原始报告、原型与截图未覆盖。

| 页面 | 原始基线 | 修复后浅色 | 修复后深色 |
| --- | --- | --- | --- |
| 首页 1440 | [原首页](../screenshots/01-home-1440.png) | [浅色](screenshots/home-1440-light.png) | [深色](screenshots/home-1440-dark.png) |
| 阅读器 1440 | [原阅读器](../screenshots/02-reader-1440.png) / [原型](../screenshots/p01-proto-1440.png) | [浅色](screenshots/reader-1440-light.png) | [深色](screenshots/reader-1440-dark.png) |
| 阅读器 375 | [原移动阅读器](../screenshots/04-reader-375.png) / [原型](../screenshots/p07-proto-375.png) | [浅色](screenshots/reader-375-light.png) | [深色](screenshots/reader-375-dark.png) |
| 理论页 1440 | [原深色理论](../screenshots/03-theory-dark-1440.png) | [浅色](screenshots/theory-1440-light.png) | [深色](screenshots/theory-1440-dark.png) |

其余三页面 768/1024px 与移动理论页截图均在 `screenshots/`，按 `页面-宽度-主题.png` 命名。共 40 张截图。附加图片使用 `mermaid-*`、`formula-*`、`theory-figure-*` 展示正文图示、公式与透明 SVG 的双主题对照；`panel-*` 展示目录抽屉、底部面板和桌面辅助区。

自动断言覆盖：主题入口、页面宽度、44px 控件、外链新窗口提示、默认章节不展开、抽屉焦点与 Esc、草稿与选择保留、历史/竞态、模型接口桩、预测/自测反馈、行内取消与撤销。完整证据与提交见[修复跟踪](../../docs/review-remediation-plan.md)。
