# 流水线并行与气泡分析：Python 练习指南

- 课程路径：`phases/19-capstone-projects/79-pipeline-parallel`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

比较 GPipe 调度空泡与真实两 stage 通信。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s tests -v
```

分布式实验需要本机回环通信和多进程；涉及 `fork` 的上游入口请在 Linux / WSL 运行，并确认 PyTorch 支持 gloo。CPU 结果不等同于多 GPU 性能。

## 动手练习

1. 记录 Gantt、closed-form/measured bubble fraction、不同 microbatch 数与 gloo 实验结果。
2. 改变 stage/microbatch 数核对 (N-1)/(M+N-1)，在测试中验证 send/recv 配对顺序而不引入永久挂起。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

理想调度与实测节拍分开，激活内存与通信依赖可解释；混合 ZeRO 时以每 stage 数据并行组为分片单位。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
