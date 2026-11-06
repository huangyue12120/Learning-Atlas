# 毕业课程 38：通过替换头部进行分类器微调：Python 练习指南

- 课程路径：`phases/19-capstone-projects/38-classifier-finetuning`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

比较冻结主干与全量分类微调。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录两种方案的 trainable params、precision、recall、F1 与混淆矩阵。
2. 使用不同长度文本检查 mean/last pooling 的 padding 掩码；冻结主干后确认其权重没有变化。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

可训练参数与冻结策略一致，指标只针对演示数据，不外推到生产分类质量。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
