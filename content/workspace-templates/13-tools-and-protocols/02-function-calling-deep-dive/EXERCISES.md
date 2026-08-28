# 函数调用深潜——OpenAI、Anthropic、Gemini：练习指南

- 课程路径：`phases/13-tools-and-protocols/02-function-calling-deep-dive`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 运行 `main.py`，确认三个提供商的声明 JSON 序列化的是同一个底层 `Tool` 对象。修改规范工具，添加一个枚举参数，确认只有 Gemini 转换器需要处理 OpenAPI 的差异。

2. 为每个提供商添加 `ListToolsResponse` 解析器，提取模型在 `list_tools` 或发现调用后返回的工具列表。OpenAI 原生没有这个接口；记录这一不对称之处。

3. 实现 `tool_choice` 转换：把规范的 `ToolChoice(mode="force", tool_name="x")` 映射到三种提供商的形状，再映射 `mode="any"` 和 `mode="none"`。对照本课的差异表。

4. 选择三家提供商中的一家，从头到尾阅读它的函数调用指南。找出一个其他两家不支持的 schema 字段。候选项包括：OpenAI 的 `strict`、Anthropic 的 `disable_parallel_tool_use`、Gemini 的 `function_calling_config.allowed_function_names`。

5. 编写一个测试向量：工具调用的参数违反声明的 schema。让它通过每个提供商的校验器（作为代理，使用第 01 课的标准库校验器即可），记录会触发哪些错误。说明在生产环境中你会选择哪家提供商来获得严格性。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
