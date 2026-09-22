# 内容审核系统：OpenAI、Perspective、Llama Guard：练习指南

- 课程路径：phases/18-ethics-safety-alignment/29-moderation-systems-openai-perspective-llamaguard
- 可运行 Python 文件：main.py

## 练习目标

运行输入、输出和自定义规则三层 moderation harness。

## 动手练习

1. 运行 code/main.py，记录与“内容审核系统：OpenAI、Perspective、Llama Guard”主题直接相关的关键输出。
2. 改变一个主要参数或输入，比较默认设置与修改后的结果，并写下因果解释。
3. 为本课的核心风险或失败模式增加一个最小反例，确认程序仍然能复现该边界。
4. 把输出整理成一张小表，分别标记能力、风险、假阳性和假阴性（适用时）。
5. 写一段部署建议，说明 toy 实现与真实系统之间至少一个不能直接外推的地方。

## 运行与验证

运行命令：python3 code/main.py

确认程序正常退出，并把关键输出、参数和解释记录在私人工作区；本指南不修改上游课程文件。
