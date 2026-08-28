# 构建 MCP 客户端：发现、路由与双时代回退：练习指南

- 课程路径：`phases/13-tools-and-protocols/08-building-an-mcp-client`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 让伪服务器返回没有共同版本的 `-32022`，确认客户端失败且不发送 `initialize`。
2. 将伪旧版服务器列入 allowlist，让有界 `initialize` 超时，证明 peer 保持 `unknown` 且不可用。
3. 为两个授权上下文增加 `cacheScope: "private"` 的工具列表，确认客户端不会跨上下文共享缓存。
4. 把冲突策略改为拒绝，让启动错误同时包含两个 peer 名称。
5. 增加有限的 `subscriptions/listen` 模拟器。流丢失时用新 ID 重新监听并重新获取工具。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
