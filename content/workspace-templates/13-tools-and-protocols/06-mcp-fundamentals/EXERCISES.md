# MCP 基础：无状态请求与 JSON-RPC：练习指南

- 课程路径：`phases/13-tools-and-protocols/06-mcp-fundamentals`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 把一个请求的协议版本改为 `2027-01-01`，确认错误码是 `-32022`，且数据中声明了受支持版本。
2. 删除第二个请求的 `io.modelcontextprotocol/clientCapabilities`，确认服务器不会复用第一个请求的能力。
3. 反转内存中的工具注册表，确认 `tools/list` 仍返回相同的确定性顺序。
4. 把 `cacheScope` 从 `public` 改为 `private`，解释两种情况下哪些授权上下文可以复用响应。
5. 增加可选的 `clientInfo` 缺失测试。因为客户端身份是推荐而非必需字段，请求仍应有效。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
