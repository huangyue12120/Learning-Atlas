# Capstone：无状态工具生态系统：练习指南

- 课程路径：`phases/13-tools-and-protocols/23-capstone-tool-ecosystem`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 运行 `main.py`，区分输出证明的事实与仍需集成证据的生产断言。
2. 增加第二个静态后端，为同名工具定义碰撞规则，再用真实 `tools/list` 调用替换两个列表。
3. 用 A2A 测试服务器替换 writer stub，记录 Agent Card、消息请求、超时路径和返回 artifact。
4. 增加能跨进程重启存活的任务存储，证明客户端可以用 `tasks/get` 恢复，遵守 `pollIntervalMs`，并无需 `tasks/result` 读取已完成任务的最终结果。
5. 构建最小 MCP App，在浏览器中用严格 CSP 和显式权限验证 `app.callServerTool`。
6. 通过 OTel SDK 把模拟 span 导出到本地 collector，断言接收、trace ID、父子关系和错误状态。
7. 为仓库维护规则写 `AGENTS.md`，再为可复用研究流程写独立 skill bundle。解释为什么两个文件都不授予工具权限。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
