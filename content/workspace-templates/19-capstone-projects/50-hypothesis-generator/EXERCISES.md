# 假设生成器：Python 练习指南

- 课程路径：`phases/19-capstone-projects/50-hypothesis-generator`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证结构化假设解析、新颖性过滤和排名队列。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 检查 JSON 队列的 novelty/specificity/testability、总分与逐轮拒绝日志。
2. 提高新颖性阈值并构造全部解析失败的草稿，检查空队列与日志，再改变温度桶比较入选候选。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

每个保留项可解析、排名可复算，近重复被拒绝；模拟采样不代表真实研究新颖性。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
