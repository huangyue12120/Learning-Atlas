# 多头自注意力：Python 练习指南

- 课程路径：`phases/19-capstone-projects/33-multihead-self-attention`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证多头注意力的形状、因果掩码与训练路径。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录 weights shape、future cells 总质量、行和及重复序列训练损失。
2. 改变未来输入词元，确认较早位置在 eval 模式输出不变；增加 d_model 不能被头数整除的拒绝测试。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

未来注意力质量为零，softmax 行和接近一，输出形状与输入兼容。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
