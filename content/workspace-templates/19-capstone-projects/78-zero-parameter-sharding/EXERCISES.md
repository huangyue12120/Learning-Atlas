# ZeRO 优化器状态分片：Python 练习指南

- 课程路径：`phases/19-capstone-projects/78-zero-parameter-sharding`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证优化器状态分片、梯度归约与参数重建。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s tests -v
```

分布式实验需要本机回环通信和多进程；涉及 `fork` 的上游入口请在 Linux / WSL 运行，并确认 PyTorch 支持 gloo。CPU 结果不等同于多 GPU 性能。

## 动手练习

1. 记录各 rank loss、最终 norm、optim_shard_bytes 与 DDP/ZeRO-1 内存表。
2. 手算 4P+12P/N，改变 rank 数检查 shard 所有权和全参数重建；区分已分配梯度填零与真正释放存储。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

分片优化器状态大小符合当前简化模型，更新后各 rank 参数一致；公式不含激活与通信临时内存。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
