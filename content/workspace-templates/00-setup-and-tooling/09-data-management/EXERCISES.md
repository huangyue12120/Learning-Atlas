# 数据管理：练习指南

- 课程路径：`phases/00-setup-and-tooling/09-data-management`
- 可运行 Python 文件：`data_utils.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 使用 `mrpc` 配置加载 `glue` 数据集，并查看前 5 个样本
2. 流式读取 `c4` 数据集，统计 10 秒内可处理的样本数
3. 将数据集转为 Parquet，比较其与 CSV 的文件大小
4. 用固定种子创建 70/15/15 的 train/val/test 划分并验证大小

## 运行与验证

在课程目录下执行：

```bash
python3 data_utils.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
