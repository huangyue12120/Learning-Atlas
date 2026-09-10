# 宪法 AI 与规则覆盖：练习指南

- 课程路径：phases/15-autonomous-systems/17-constitutional-ai
- 可运行 Python 文件：main.py

## 练习目标

用四层优先级解析器区分硬编码禁止项和可调整的软编码默认值。

## 动手练习

1. 运行 main.py，确认高 helpfulness 不能覆盖 hardcoded prohibition。
2. 调换 helpfulness 与 ethics 权重，记录它造成的具体失效。
3. 为客服智能体设计一组软编码默认值，并写出操作员不能修改的边界。
4. 从 CAI 论文中找一个 critique-and-revise 可能更差的场景。
5. 设计让组织表达自身价值、但仍保留硬安全底线的配置方式。

## 运行与验证

运行：python3 code/main.py

确认输出列出 safety、ethics、guidelines、helpfulness 的优先级，并保留拒绝原因。
