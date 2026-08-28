# 智能体框架取舍——图、角色与 actor 编排：练习指南

- 课程路径：`phases/11-llm-engineering/17-agent-framework-tradeoffs`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 对同一个任务——“研究 Anthropic 总部，写一份 200 字简报并引用来源”——分别用 LangGraph（四个节点：plan、search、write、cite）和 CrewAI（三个角色：researcher、writer、editor）实现。报告每次运行的词元成本和代码行数。
2. **中等。** 用 AutoGen（researcher ↔ writer 聊天，editor 通过 `GroupChat` 加入）和 Agno（带 `search_tools`、`write_tools` 以及 session store 的单智能体）实现同一个任务。按以下维度给四种实现排序：(a) 每次运行成本；(b) 崩溃后恢复能力；(c) 在写作步骤前插入人工审批的能力。
3. **困难。** 构建一个决策树脚本 `pick_framework.py`，接收简短的问题描述（JSON：`{has_typed_state, has_roles, has_dialogue, has_parallel_fanout, needs_resume}`），返回一个推荐以及一句话理由。用你自己设计的六个案例验证它。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
