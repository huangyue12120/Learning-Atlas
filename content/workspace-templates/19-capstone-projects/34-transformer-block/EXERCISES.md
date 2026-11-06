# 从零实现 Transformer Block：Python 练习指南

- 课程路径：`phases/19-capstone-projects/34-transformer-block`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

比较 Pre-LN 与 Post-LN block 的残差和梯度。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录两种输出形状、embedding grad norm 与参数量。
2. 改变层数，固定种子并关闭 dropout 后比较梯度；对 LayerNorm 写均值和方差的数值检查。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

残差形状保持一致；单次梯度比值不能外推成所有训练设置下的优劣。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
