# 结果评估器：Python 练习指南

- 课程路径：`phases/19-capstone-projects/53-result-evaluator`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

在配对种子结果上区分改进、退化、噪声与失败。

## 运行与验证

需要 numpy，项目基础 Python 环境已声明该依赖。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录 verdict、改进量、p_value 和 rationale，按 metric direction 手算一组差值。
2. 构造小于效果阈值但统计显著的样本、单配对样本和一个非 ok 终态，核对三条判定路径。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

实用阈值与统计条件分开报告；配对不自动排除全部混杂，对数变换后的阈值必须明确尺度。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
