# 从零实现分布式数据并行与 FSDP：Python 练习指南

- 课程路径：`phases/19-capstone-projects/48-distributed-fsdp-ddp`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

在 CPU gloo 上核对梯度 all-reduce 与参数广播。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py --world-size 2 --num-steps 3
python3 -m unittest discover -s code -p "test_main.py" -v
```

分布式实验需要本机回环通信和多进程；涉及 `fork` 的上游入口请在 Linux / WSL 运行，并确认 PyTorch 支持 gloo。CPU 结果不等同于多 GPU 性能。

## 动手练习

1. 用 --world-size 2 --num-steps 3 记录梯度等价误差、rank 输出与分片往返结果。
2. 比较完整 batch 与等分 rank batch 的梯度，检查 all_reduce 后除以 world_size，并验证初始参数广播。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

需要支持 gloo 与本机进程通信；param_sum 相同只是校验和线索，不证明全部参数逐元素相等，FSDP 部分是分片示意。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
