# MARL——MADDPG、QMIX、MAPPO：练习指南

- 课程路径：`phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo`
- 可运行 Python 文件：`main.py`

## 练习目标

在小型网格世界中区分独立学习、集中训练分散执行（CTDE）、价值分解和集中式 critic。

## 动手练习

1. 运行 `main.py`，比较 independent、MADDPG 风格、QMIX 风格和 MAPPO 风格的步数。
2. 改变两个目标位置，观察联合信息如何避免智能体互相阻塞。
3. 为局部 actor 隐藏全局状态，确认部署接口仍然只接收局部观察。
4. 写出 QMIX 单调混合假设可能不成立的任务，并说明后果。
5. 记录 MAPPO 集中式价值估计降低方差的证据，而不是把它描述成集中控制。

## 运行与验证

```bash
python3 code/main.py
```

确认四种风格都能完成默认基准，并保存一份 CTDE 与部署约束的对照说明。
