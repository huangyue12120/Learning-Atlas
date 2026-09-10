# 自治智能体的权限模式：练习指南

- 课程路径：phases/15-autonomous-systems/10-claude-code-permission-modes
- 可运行 Python 文件：main.py

## 练习目标

用两阶段分类器模拟权限审批，辨认单个动作安全但组合后越权的轨迹。

## 动手练习

1. 运行 main.py，找出只在 Stage 2 被捕获的动作和两阶段都漏掉的组合。
2. 增加一个 curl 外传规则，测量它对 benign-action 样本的误报率。
3. 列出 default 模式会触及的文件、网络、凭据和 shell 状态。
4. 为 24 小时无人值守运行设置 max_turns、max_budget_usd、工具上限和 allowlist。
5. 写一条每个动作都被批准但最终外传凭据的轨迹，说明需要哪一层控制。

## 运行与验证

运行：python3 code/main.py

确认输出包含 Stage 1、Stage 2 和组合风险，并记录分类器不是完整安全方案。
