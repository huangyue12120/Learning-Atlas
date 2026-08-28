# 无状态 MCP 网关与注册表准入：练习指南

- 课程路径：`phases/13-tools-and-protocols/17-mcp-gateways-and-registries`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 给外层和转发请求元数据增加 trace context，并在审计事件中记录关联关系。
2. 增加支持 Tasks 的后端，并在 `Mcp-Name` 中按任务 ID 路由 `tasks/get`。
3. 改变一个后端描述，证明 discovery 和直接调用都会被阻断。
4. 增加主体专属服务器能力，解释为什么 discovery 必须使用私有缓存。
5. 写一个旧版适配器接口，但不要把任何旧状态加入现代 `Gateway` 类。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
