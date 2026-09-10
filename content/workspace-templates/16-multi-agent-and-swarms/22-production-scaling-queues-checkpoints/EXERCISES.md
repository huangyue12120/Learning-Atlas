# 生产扩展：队列、检查点与持久性：练习指南

- 课程路径：`phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints`
- 可运行 Python 文件：`main.py`

## 练习目标

实现可恢复检查点、逐智能体队列和异步 I/O 基准，理解至少一次投递与有效恰好一次的边界。

## 动手练习

1. 运行 `main.py`，记录队列状态转移、检查点写入和恢复位置。
2. 在一个超级步骤中途模拟崩溃，确认恢复从最后已提交步骤开始。
3. 比较 async 与线程基准，说明等待 token 时线程为何浪费资源。
4. 为副作用增加 `run_id`、`step_id` 去重键，重复消费后检查有效结果仍只有一次。
5. 为租约过期、毒性消息和无限重试各写一个停止或隔离策略。

## 运行与验证

```bash
python3 code/main.py
```

确认检查点、队列和 async/thread 对照均有输出，并记录一次崩溃恢复与幂等重放结果。
