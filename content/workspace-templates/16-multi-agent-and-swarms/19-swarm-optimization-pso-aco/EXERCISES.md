# 面向 LLM 的群体优化（PSO、ACO）：练习指南

- 课程路径：`phases/16-multi-agent-and-swarms/19-swarm-optimization-pso-aco`
- 可运行 Python 文件：`main.py`

## 练习目标

用 PSO 搜索连续提示参数、用 ACO 更新智能体路由，理解无梯度群体搜索的探索—利用权衡。

## 动手练习

1. 运行 `main.py`，记录 PSO 最优位置和每轮 fitness 改善。
2. 改变惯性、个体学习和群体学习系数，比较收敛速度与早熟收敛。
3. 修改任务类型分布，观察 ACO 信息素是否偏向少数专家。
4. 为信息素增加衰减或质量门控，验证旧路线能否被重新探索。
5. 对比群体优化与手动提示调整，写出一次搜索成本不值得的情形。

## 运行与验证

```bash
python3 code/main.py
```

确认输出包含 PSO 与 ACO 结果及信息素表，并保存一项参数变化的观察。
