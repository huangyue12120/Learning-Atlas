# MCP Tasks 扩展：无状态核心上的持久工作：练习指南

- 课程路径：`phases/13-tools-and-protocols/13-mcp-async-tasks`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 增加第二个待处理输入键。发送部分 `tasks/update`，证明两个键都回答前任务仍保持 `input_required`。
2. 给存储加入租户所有权，拒绝错误认证主体提交的有效任务 ID。
3. 加入带过期时间的 worker lease，演示两个服务实例不能并发完成同一任务。
4. 为 `subscriptions/listen` 实现 POST 响应 SSE 适配器，不要加入 GET、`Last-Event-ID` 或会话 header。
5. 增加过期清理，区分过期任务和格式错误的任务 ID，同时不泄露跨租户存在性。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
