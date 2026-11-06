# Capstone 82——越狱攻击分类：Python 练习指南

- 课程路径：`phases/19-capstone-projects/82-jailbreak-taxonomy`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证越狱分类 fixture 与近邻匹配。

## 运行与验证

需要 numpy，项目基础 Python 环境已声明该依赖。

```bash
python3 code/main.py
python3 code/tests.py
```

## 动手练习

1. 记录总 fixture、各类别数量、severity histogram、sample matches 与 outputs/taxonomy.json。
2. 构造空 prompt、越界 severity 和缺类别样本，检查校验；用不同表述观察 trigram 相似度的局限。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

分类覆盖与严重度是可审核标注，近邻类别不是有害性证明；taxonomy.json 保留供后续课读取。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
