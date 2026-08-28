# 结构化输出——JSON Schema、Pydantic、Zod 与受约束解码：练习指南

- 课程路径：`phases/13-tools-and-protocols/04-structured-output`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 运行 `main.py`。添加第四个测试用例，让它的 `total_usd` 为负数。确认校验器在 `minimum` 约束路径上拒绝它。

2. 扩展校验器，支持带判别字段的 `oneOf`。常见情况是：`line_item` 可以是产品或服务，并由 `kind` 标记。严格模式在这里有微妙的规则；请检查 OpenAI 的结构化输出指南。

3. 将同一个 Invoice schema 写成 Pydantic BaseModel，并把 `model_json_schema()` 的输出与手写 schema 比较。找出 Pydantic 默认设置、而手写版本遗漏的那个字段。

4. 测量拒绝率。构造十个不应该被抽取的输入（一段歌词、一份数学证明、一封空邮件），使用严格模式通过真实提供商运行它们。统计拒绝与臆造输出的数量。这就是拒绝感知重试的真实基准。

5. 从头到尾阅读 OpenAI 的结构化输出指南。找出它明确禁止、而普通 JSON Schema 允许的那个构造。然后设计一个非必要地使用该构造的 schema，再将它重构为兼容严格模式的形式。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
