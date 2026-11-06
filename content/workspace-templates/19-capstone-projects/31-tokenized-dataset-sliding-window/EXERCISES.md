# 带滑动窗口的词元化数据集：Python 练习指南

- 课程路径：`phases/19-capstone-projects/31-tokenized-dataset-sliding-window`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证滑动窗口输入和右移一位的目标。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录 num windows、input/target shapes、首行数据及相同种子的 batch 一致性。
2. 改变 stride/context_length，手算首末窗口和数量；加入语料不足一个窗口的边界。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

每个窗口 x 与 y 对齐且无越界，不同 epoch 的打乱顺序可复现。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
