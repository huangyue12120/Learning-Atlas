# 时序差分——Q-learning 与 SARSA：练习指南

- 课程路径：`phases/09-reinforcement-learning/04-q-learning-sarsa`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 在 4×4 GridWorld 上实现 Q-learning 与 SARSA。针对 2,000 个回合绘制学习曲线（每 100 个回合的平均回报）。谁收敛得更快？
2. **中等。** 构建悬崖行走环境（4×12，最后一行是悬崖，奖励为 -100，坠落后重置到起点）。比较 Q-learning 与 SARSA 的最终策略。截取各自路径。哪条路径更靠近悬崖？
3. **困难。** 实现 Double Q-learning。在带噪声奖励的 GridWorld 中（每步奖励叠加 σ=5 的高斯噪声），证明 Q-learning 会显著高估 `V*(0,0)`，而 Double Q-learning 不会。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
