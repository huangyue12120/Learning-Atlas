# 分片检查点与原子恢复：Python 练习指南

- 课程路径：`phases/19-capstone-projects/80-checkpoint-sharded-resume`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证分片检查点 manifest、哈希和恢复拒绝。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s tests -v
```

分布式实验需要本机回环通信和多进程；涉及 `fork` 的上游入口请在 Linux / WSL 运行，并确认 PyTorch 支持 gloo。CPU 结果不等同于多 GPU 性能。

## 动手练习

1. 记录各 rank shard 摘要、round-trip、wrong world_size、tampered shard 和 rotation 结果。
2. 破坏私人分片再加载，确认哈希错误先于状态恢复；模拟缺 manifest 或缺 shard 检查失败信息。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

合法布局状态精确往返，错误布局明确拒绝；单文件原子替换不等于多文件事务或断电持久性，轮换应保留可恢复旧代。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
