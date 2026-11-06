# 排行榜聚合：Python 练习指南

- 课程路径：`phases/19-capstone-projects/74-leaderboard-aggregation`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证均分、胜率和配对 bootstrap。

## 运行与验证

需要 numpy，项目基础 Python 环境已声明该依赖。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录总体/分类别均分、成对 diff_mean、CI 与 significant 标记。
2. 固定 seed，用完全相同模型分数验证零差区间，再用少量大胜与多数小败比较均分和胜率。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

输入均在 [0,1]，配对重采样保留相同任务对应；区间与样本和独立性假设一并解释。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
