# 分块策略比较：Python 练习指南

- 课程路径：`phases/19-capstone-projects/64-chunking-strategies-advanced`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

比较五种分块策略的答案跨度召回。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录各策略 chunk 数与 recall@k，抽查 chunk 的起止偏移是否映射回原文。
2. 添加跨窗口的代码标识符或 YAML 键值，改变 overlap/语义阈值，比较部分重叠命中与完整答案覆盖。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

原文偏移正确、不同策略可公平对照；语义分块需固定模型版本，任意重叠 recall 不代表完整证据可用。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
