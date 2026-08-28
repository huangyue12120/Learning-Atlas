# 并行工具调用与工具流式传输：练习指南

- 课程路径：`phases/13-tools-and-protocols/03-parallel-and-streaming-tool-calls`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 运行 `main.py` 并改变模拟延迟。确认并行/串行比率大约为 `max/sum`（真实运行会因为线程调度、序列化和测试工具开销而略偏离理想值）。延迟分布在什么情况下会让并行失去意义？

2. 扩展累加器，处理“调用在流式传输中途被取消”的情况：丢弃其缓冲区并发出 `cancelled` 事件。哪家提供商明确记录了这个情况？检查 Anthropic 的 `content_block_stop` 语义和 OpenAI 的 `finish_reason: "length"` 行为。

3. 用 `asyncio.gather` 替换线程池。对两者做基准比较。如果执行器确实进行 I/O，你应该会看到 async 因上下文切换开销更低而略有收益。

4. 选出两个不应该并行的工具（例如先 `create_file` 再 `write_file`）。在注册表中添加一个 `ordering_dependency` 图，并让并行扇出受该图控制。这是依赖感知调度所需的最小机制，未来的智能体工程 Phase 会将其形式化。

5. 阅读 OpenAI 的并行函数调用章节和 Anthropic 的 `disable_parallel_tool_use` 文档。找出一种 Anthropic 建议禁用并行的真实工具类型。（提示：对同一资源进行后果性修改。）

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
