# 构建 MCP 服务器：无状态 Python 与 TypeScript：练习指南

- 课程路径：`phases/13-tools-and-protocols/07-building-an-mcp-server`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 删除某个请求的能力，证明服务器不会复用上一个请求的声明。
2. 反转 `TOOLS`、`PROMPTS` 和笔记插入顺序，确认所有列表结果仍稳定。
3. 增加 destructive `notes_delete` 工具，并在执行器内部做授权检查；保留 `destructiveHint` 作为 UX 提示。
4. 增加带 `ttlMs`、`cacheScope` 和确定性顺序的 `resources/templates/list`。
5. 为 `2025-11-25` 构建独立旧版适配器，并测试现代请求绝不会进入该适配器。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
