# 毕业课程 27：带 fixture 任务的评测 Harness：Python 练习指南

- 课程路径：`phases/19-capstone-projects/27-eval-harness-fixture-tasks`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

核对 fixture 任务、确定性验证器与 pass@k。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 比较 apply_known_fixes 与 noop_candidate 的逐任务结果，核对五个 fixture 和失败原因。
2. 把某任务的一个修复改错，检查对应 verifier 失败；计算 1-(1-p)^k 并与第 72 课组合估计区分。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

修复候选通过、空候选失败；code/tasks 必须保留目录和预期文件。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
