# 端到端分布式训练：Python 练习指南

- 课程路径：`phases/19-capstone-projects/81-end-to-end-distributed-train`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

组合 tiny GPT、梯度通信、ZeRO 与检查点。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s tests -v
```

分布式实验需要本机回环通信和多进程；涉及 `fork` 的上游入口请在 Linux / WSL 运行，并确认 PyTorch 支持 gloo。CPU 结果不等同于多 GPU 性能。

本地工作区适配：锁定上游通过队列发送检查点快照张量后立即退出，可能导致接收时共享存储连接断开。首次复制时，Learning Atlas 复用本课 `_serialize` / `_deserialize` 传递快照字节；保留训练、检查点和原测试断言。上游文件与已有学习者文件不变。

## 动手练习

1. 记录 20 步 loss、rank norm drift、每 rank shard_bytes 与 step-10 RESUME VERIFIED。
2. 按公式核对优化器字节量，构造损坏检查点并检查拒绝；为进程整体设置超时，确保挂起可回收。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

无非有限 loss、分片大小正确、检查点按当前测试契约恢复；LayerNorm 不维护 BatchNorm 式 running statistics。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
