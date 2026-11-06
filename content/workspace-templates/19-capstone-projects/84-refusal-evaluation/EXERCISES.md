# 毕业项目 84——拒答评估：Python 练习指南

- 课程路径：`phases/19-capstone-projects/84-refusal-evaluation`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

比较模拟拒答策略的两类错误与校准。

## 运行与验证

需要 numpy，项目基础 Python 环境已声明该依赖。

```bash
python3 code/main.py
python3 code/tests.py
```

## 动手练习

1. 记录各 mock policy 的 accuracy、under/over refusal、ECE 与分类别 under-refusal。
2. 手算 5/30 的误拒答率，改变安全/不安全样本比例，检查分母与类别切片不被总体准确率掩盖。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

两类错误和校准分别报告；确定性 mock 只验证评估实现，真实模型需独立测试。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
