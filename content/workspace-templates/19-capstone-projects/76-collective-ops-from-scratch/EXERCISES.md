# 从零实现集合通信原语：Python 练习指南

- 课程路径：`phases/19-capstone-projects/76-collective-ops-from-scratch`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

在队列 mesh 与 CPU gloo 间核对集合通信。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s tests -v
```

分布式实验需要本机回环通信和多进程；涉及 `fork` 的上游入口请在 Linux / WSL 运行，并确认 PyTorch 支持 gloo。CPU 结果不等同于多 GPU 性能。

## 动手练习

1. 记录 allreduce、broadcast、allgather、reduce_scatter 的 max_abs_diff 与 measured/expected bytes。
2. 改变可整除张量长度与 world_size，手算 2T(N-1)/N；检查不整除的 reduce_scatter 明确拒绝。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

结果按 1e-5 等测试容差比较，队列网络不等于 NCCL 性能；通信失败必须有超时回收。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
