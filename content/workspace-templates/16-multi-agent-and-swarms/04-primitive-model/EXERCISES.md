# 多智能体原语模型：练习指南

- 课程路径：`phases/16-multi-agent-and-swarms/04-primitive-model`
- 可运行 Python 文件：`main.py`

## 练习目标

用 agent、handoff、shared state 和 orchestrator 四个稳定原语读懂不同框架的表面 API。

## 动手练习

1. 运行 `main.py`，比较静态编排、交接编排和 LLM 风格选择器的消息池。
2. 给共享状态增加一个 provenance 字段，记录每条消息由哪个角色产生。
3. 把轮询选择器改成“只选择尚未完成的角色”，并写一个断言。
4. 构造一个没有 handoff 的团队，观察它为什么无法从研究转向写作。
5. 用四个原语为一个真实任务画出最小架构图，注明谁拥有控制权。

## 运行与验证

```bash
python3 code/main.py
```

确认三种编排器都能完成默认流程，并记录每种模式的发言顺序和共享状态变化。
