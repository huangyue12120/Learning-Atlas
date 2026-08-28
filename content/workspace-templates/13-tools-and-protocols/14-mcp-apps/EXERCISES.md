# 无状态协议上的 MCP Apps：练习指南

- 课程路径：`phases/13-tools-and-protocols/14-mcp-apps`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 把客户端能力改为空扩展映射，确认 `tools/list` 保留工具但移除 UI 绑定。
2. 发送 `Mcp-Name: ui://notes/other.html`，但请求体读取时间线，确认错误为 `-32020`。
3. 把资源改成 `cacheScope: private`，说明支持这一设置的用户专属条件。
4. 把脚本移到 `https://static.example.com/app.js`，将该 origin 加入 `resourceDomains`，并解释新的供应链风险。
5. 增加 `notes_open` 工具，让按钮点击通过宿主路由，并把用户审批保留在宿主中。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
