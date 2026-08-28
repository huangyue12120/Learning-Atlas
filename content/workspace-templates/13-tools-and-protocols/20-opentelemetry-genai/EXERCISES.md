# OpenTelemetry GenAI——端到端追踪工具调用：练习指南

- 课程路径：`phases/13-tools-and-protocols/20-opentelemetry-genai`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 运行 `main.py`。数一数 spans，并识别哪些是 CLIENT、哪些是 INTERNAL。

2. 打开内容捕获（环境变量），确认出现 `gen_ai.content.prompt` 和 `gen_ai.content.completion` 事件。注意这对 PII 意味着什么。

3. 添加工具执行指标 `gen_ai.tool.execution.duration`，并在每次调用时将它作为直方图样本发出。

4. 将父智能体 span 的 traceparent 传播到 MCP 请求的 `_meta.traceparent` 字段。验证 MCP 服务器能够看到同一个 trace id。

5. 阅读 OTel GenAI 语义约定规范。找出规范列出、但本课代码没有发出的一个属性，并添加它。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
