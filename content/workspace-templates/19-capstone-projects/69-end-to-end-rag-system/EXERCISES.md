# 端到端 RAG 系统：Python 练习指南

- 课程路径：`phases/19-capstone-projects/69-end-to-end-rag-system`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

串联导入、分块、检索、改写、重排与生成。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录 chunks indexed、单查询 trace、citations、各阶段 latency 与全部阈值结果。
2. 改变一个 qrels 或拒答阈值触发失败，核对退出码；检查训练 triples 与评估查询无重叠。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

默认 fixture 达标时零退出，失败有逐项指标；mock generator 无法验证真实 LLM 的幻觉与安全性。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
