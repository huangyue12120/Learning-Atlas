# 第 41 课：完整评测流水线：Python 练习指南

- 课程路径：`phases/19-capstone-projects/41-eval-pipeline`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

把困惑度、精确匹配、F1 与裁判分数汇入评估报告。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录四类原始指标、聚合分数与逐任务样本，检查 perplexity 先按有效词元累计 NLL 再取 exp。
2. 构造不同长度 batch 对比正确加权与平均 batch perplexity 的差异；改变指标权重检查聚合方向。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

原始指标与归一化规则可追溯；mock judge 只测试评估接口，不能证明真实回答质量。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
