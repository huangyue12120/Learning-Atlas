# 工具 Schema 设计——命名、描述与参数约束：练习指南

- 课程路径：`phases/13-tools-and-protocols/05-tool-schema-design`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 修改 `main.py` 中的 `BAD_REGISTRY`，重写每个工具使其通过 linter。测量前后描述长度，并统计规则违反数。

2. 为笔记应用设计一个 MCP 服务器，使用原子工具：list、search、create、update、delete，以及一个 `summarize` slash prompt。对注册表运行 linter，目标是零条发现。

3. 从官方注册表选择一个现有的热门 MCP 服务器，对其工具描述运行 linter。找出至少两项可执行的改进。

4. 将 linter 加入 CI。当 PR 修改工具注册表时，如果出现严重性为 `block` 的发现，就让构建失败。评估驱动的 CI 模式会在未来 Phase 介绍。

5. 从头到尾阅读 Composio 的工具设计实战指南。找出本课未覆盖的一条规则，并将它加入 linter。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
