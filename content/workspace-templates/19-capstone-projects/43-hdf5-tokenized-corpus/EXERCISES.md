# 第 43 课：HDF5 分词语料库：Python 练习指南

- 课程路径：`phases/19-capstone-projects/43-hdf5-tokenized-corpus`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证 HDF5 分片写入、索引、校验与滑窗读取。

## 运行与验证

需要 data 依赖组中的 h5py 与 numpy。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 检查 validate 全部分片通过，记录 token_count、dataset shape、sha256 和 batch 形状。
2. 用不足一个 chunk 的末尾数据测试最终 resize；损坏一个私人分片，确认 validate_corpus 报错。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

有效词元数量与最终数据一致，SWMR 写端先创建结构再启用，读端使用兼容设置。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
