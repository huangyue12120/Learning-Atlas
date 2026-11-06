# 交叉编码器重排器：Python 练习指南

- 课程路径：`phases/19-capstone-projects/66-reranker-cross-encoder`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证两阶段召回、cross-encoder 与候选池选择。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录训练 loss、检索/重排名次与 latency，检查 mean pooling 排除 padding。
2. 固定最终 K，分别设 N=K 和 N>K，比较顺序与集合：前者可改顺序，后者还可替换入选项。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

重排不能找回候选池之外的文档；低 top-1 分数需校准后用作拒答信号，不证明语料必无答案。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
