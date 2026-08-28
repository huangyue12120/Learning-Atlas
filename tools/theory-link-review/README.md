# 候选理论关联审核页

这是一个临时、本地运行的人工审核工具，用来审核 `content/theory-links/` 中状态为 `proposed` 的候选关联。

## 启动

在仓库根目录执行：

```bash
python3 tools/theory-link-review/server.py
```

然后打开 <http://127.0.0.1:8765/>。

## 使用方式

- 页面动态读取当前 105 条 `proposed` 关联，展示关联章节、课程位置、候选摘要和自动核验说明。
- 选择“通过”“暂缓”或“不通过”后，状态会自动保存到 `tools/theory-link-review/review-results.json`。
- 该结果文件已加入 `.gitignore`，不会进入课程内容提交；同时可以使用页面按钮导出 JSON 备份或导入已有结果。
- 页面不会自动修改 YAML。完成审核后告诉 Codex，Codex 会读取结果，把“通过”的条目改为 `approved`，并按你的其他选择保留 `proposed` 或改为 `rejected`。

自动核验只检查来源文件、SHA-256 指纹和锚点存在性；是否形成足够直接、适合展示的理论关联，仍由人工决定。
