# 端到端评测运行器：Python 练习指南

- 课程路径：`phases/19-capstone-projects/75-end-to-end-eval-runner`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

组合 schema、指标、代码执行、校准与 leaderboard。

## 运行与验证

Python 标准库即可。 应用会自动补齐相邻先修目录：`70-task-spec-format`、`71-classical-metrics`、`72-code-exec-metric`、`73-perplexity-calibration`、`74-leaderboard-aggregation`；传递依赖一并复制。请保留工作区父目录中的这些同级目录，不要把本课 code/ 单独搬走。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录全部任务状态、summary、perplexity、校准与配对差值，确认 rule_based 高于 random。
2. 比较 sequential 与 parallel 输出的任务归属，构造适配器缺失可选 NLL/confidence 的情况，检查报告不伪造指标。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

依赖 70–74 按同级目录加载，全部任务有结果且模型比较遵守同一任务集合。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
