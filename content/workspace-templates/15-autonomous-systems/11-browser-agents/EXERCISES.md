# 浏览器智能体与长时程 Web 任务：练习指南

- 课程路径：phases/15-autonomous-systems/11-browser-agents
- 可运行 Python 文件：main.py

## 练习目标

比较 HTML 清洗与读写边界两类防御，理解间接提示注入为何需要纵深防御。

## 动手练习

1. 运行 main.py，记录 sanitizer 与 R/W boundary 各自捕获的攻击。
2. 增加一种 URL fragment 注入规则，并测量正常 fragment 的误报率。
3. 为订机票流程列出所有读取和写入，标出必须 HITL 的写入。
4. 解释 Verified WebArena 如何减少原始基准的不可靠评分。
5. 设计一个浏览器记忆 canary，写明存放位置和触发动作。

## 运行与验证

运行：python3 code/main.py

确认四种 defense 配置都运行，且输出明确区分 visible-text 与 URL-fragment 攻击。
