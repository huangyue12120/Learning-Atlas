# 语言模型评测框架：Python 练习指南

- 课程路径：`phases/19-capstone-projects/49-lm-eval-harness`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证任务规范、模型适配器与多指标 leaderboard。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code -p "test_main.py" -v
```

## 动手练习

1. 记录五种任务的分数、correct/total、overall_score 和输出位置。
2. 改写一个已知目标为错误值，确认对应指标下降；切换 include-per-example 查看个体错误并检查批处理不漏样本。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

评分对已知正反例响应正确；code_exec 仅运行可信课程样例，删去 builtins 不是任意 Python 的安全沙箱。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
