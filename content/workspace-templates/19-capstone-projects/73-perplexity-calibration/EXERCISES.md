# 困惑度与校准：Python 练习指南

- 课程路径：`phases/19-capstone-projects/73-perplexity-calibration`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证词元加权困惑度与置信度校准。

## 运行与验证

需要 numpy，项目基础 Python 环境已声明该依赖。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录 perplexity、avg_nll、tokens、ECE、Brier 和 populated_bins。
2. 用不同长度样本检查 NLL 加权，再注入负 NLL、越界 confidence 和稀疏分箱检查契约。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

传入的是非负 -log p，perplexity 不低于 1；ECE 与 Brier 含义分开，箱数不能独自决定可信度。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
