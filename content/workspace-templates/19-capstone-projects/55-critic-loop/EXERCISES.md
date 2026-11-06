# 批评器循环：Python 练习指南

- 课程路径：`phases/19-capstone-projects/55-critic-loop`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证五维批评、修订与停止顺序。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录每轮 score vector、mean、suggestions 和 verdict，检查目标/平台期/预算优先级。
2. 使用不改变评分的 reviser，确认平台期或预算终止；再让某维退化检查 trace 能指出变化。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

每轮建议与实际修改关联，平台期不被记为达到目标，评分数值本身不证明论文质量。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
