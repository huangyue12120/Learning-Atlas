# 毕业项目课程 25：验证门与观测预算：Python 练习指南

- 课程路径：`phases/19-capstone-projects/25-verification-gates-observation-budget`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证调用门链与累计观察预算。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录 allowed/refused、deny reason、cumulative tokens 和 observations recorded。
2. 降低总预算并设置单工具预算，比较最先拒绝的门；为超长输出检查截断后的计费口径。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

拒绝发生在副作用前，预算记录与实际纳入上下文的观察一致。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
