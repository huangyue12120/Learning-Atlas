# MCP 传输：stdio 与无状态 Streamable HTTP：练习指南

- 课程路径：`phases/13-tools-and-protocols/09-mcp-transports`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 从 POST 移除 `Mcp-Method`，确认 HTTP 400 与 `-32020`。
2. 发送 body/header 都为 `2027-01-01` 的版本，确认 HTTP 400、`-32022` 及精确的 supported/requested 数据。
3. 为非 ASCII 资源 URI 发送 Base64 sentinel `Mcp-Name`，确认解码值与 `params.uri` 比较。
4. 在最终响应前断开有限 listen 流，用新 JSON-RPC ID 重新发起并重新获取工具。
5. 给 ping 工具增加显式工作流句柄，并将它绑定到授权 subject，不使用连接亲和性。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
