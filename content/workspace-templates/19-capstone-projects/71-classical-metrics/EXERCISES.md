# 经典指标：Python 练习指南

- 课程路径：`phases/19-capstone-projects/71-classical-metrics`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证经典指标的分词、计数和空输入约定。

## 运行与验证

需要 numpy，项目基础 Python 环境已声明该依赖。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录 exact match、F1、BLEU、ROUGE-L 与 corpus BLEU 对照结果。
2. 重复同一候选 n-gram 验证裁剪计数，再构造空/空与空/非空输入，手算 LCS 和 brevity penalty。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

每个公式对正反例有预期响应，词元化与平滑规则可追溯，指标按 metric_name 分发。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
