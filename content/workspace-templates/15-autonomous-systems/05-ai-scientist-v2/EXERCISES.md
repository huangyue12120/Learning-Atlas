# AI Scientist v2：研讨会级自主研究：练习指南

- 课程路径：phases/15-autonomous-systems/05-ai-scientist-v2
- 可运行 Python 文件：main.py

## 练习目标

把研究智能体拆成可观察阶段，识别“外观精致但实验有缺陷”的结果，并为生成代码配置沙箱。

## 动手练习

1. 运行 main.py，记录 clean paper 与 polished-but-flawed 的比例。
2. 分别用 --experiment-failure 0.20 --novelty-mislabel 0.10 和更高概率重跑，比较缺陷占比。
3. 列出 Docker 之外还需要的两项文件、网络或资源限制。
4. 设计一个能发现图表漂亮但实验失败的独立评估器。
5. 设计分层人工复核流程，说明哪些样本优先交给领域专家。

## 运行与验证

运行：python3 code/main.py

重跑：python3 code/main.py --experiment-failure 0.20 --novelty-mislabel 0.10

确认输出包含阶段分布、clean 和 polished-but-flawed 两类，并记录风险解释。
