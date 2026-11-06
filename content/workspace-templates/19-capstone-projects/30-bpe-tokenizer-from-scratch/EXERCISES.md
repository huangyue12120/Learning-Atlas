# 从零实现 BPE 分词器：Python 练习指南

- 课程路径：`phases/19-capstone-projects/30-bpe-tokenizer-from-scratch`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证字节级 BPE 的合并规则与无损往返。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录词表大小、合并数、编码长度与 decoded back，核对特殊词元编号。
2. 添加中文、emoji、空串和未见字符的往返测试，再保存/加载 tokenizer 确认编码一致。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

decode(encode(text)) 与原文相同，特殊词元和合并顺序在序列化后保留。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
