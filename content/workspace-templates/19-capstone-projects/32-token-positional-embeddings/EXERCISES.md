# 词元与位置嵌入：Python 练习指南

- 课程路径：`phases/19-capstone-projects/32-token-positional-embeddings`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

比较词元嵌入与可学习/正弦位置嵌入。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录组合输出形状、参数量和邻位余弦曲线。
2. 把序列长度增加到 learned max_context_length 之外，检查报错；比较正弦表示的合法长输入。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

输出为 [batch,seq,d_model]，无参数位置编码与可学习表的长度约束分开说明。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
