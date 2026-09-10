# 动作预算、迭代上限与成本治理器：练习指南

- 课程路径：phases/15-autonomous-systems/13-cost-governors
- 可运行 Python 文件：main.py

## 练习目标

观察请求、迭代、速度和月度成本四层上限如何分别阻断突发、循环、慢漏和坏发布。

## 动手练习

1. 运行 main.py，确认 polling loop 先触发 velocity limit 还是 iteration cap。
2. 关闭 velocity limit，记录到 iteration cap 时多消耗的 tokens 和 dollars。
3. 为浏览器智能体设计每个工具的调用上限，说明最紧的工具及其理由。
4. 为夜间处理 50 个 issue 的任务估算成本，并把 max_budget_usd 设为估算值的两倍。
5. 设计一个外部速度限制的触发、暂停和人工重新启用流程。

## 运行与验证

运行：python3 code/main.py

确认输出列出 turns、tokens、dollars 和最终触发的 governor。
