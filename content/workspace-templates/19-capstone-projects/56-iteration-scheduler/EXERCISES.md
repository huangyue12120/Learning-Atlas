# 迭代调度器：Python 练习指南

- 课程路径：`phases/19-capstone-projects/56-iteration-scheduler`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

在多执行槽中验证 UCB、剪枝和双预算。

## 运行与验证

需要 numpy，项目基础 Python 环境已声明该依赖。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录每个分支的 runs、mean、paper_triggered、pruned 与 stop_reason。
2. 降低 max_experiments/max_seconds，并改变 prune floor，检查总派发、在途任务处理和单分支一次触发。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

未尝试分支可探索，剪枝后不再派发队列项；墙钟上限应按调度粒度解释，不当成内核即时截止。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
