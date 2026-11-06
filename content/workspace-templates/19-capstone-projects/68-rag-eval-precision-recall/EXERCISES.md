# RAG 评估：Precision、Recall、MRR、nDCG、忠实性与答案相关性：Python 练习指南

- 课程路径：`phases/19-capstone-projects/68-rag-eval-precision-recall`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

分别诊断检索排序与答案依据。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录 recall、MRR、nDCG、faithfulness 与 answer relevance 的对照表。
2. 交换相关文档名次并保持候选集合，核对 recall 不变而 MRR/nDCG 变化；构造有依据却答非所问的答案。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

指标对已知反例响应正确，qrels 与语料版本对应，不能把总体高召回当最终答案正确的证明。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
