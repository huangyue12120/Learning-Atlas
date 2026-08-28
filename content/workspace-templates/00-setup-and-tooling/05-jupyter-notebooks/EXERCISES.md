# Jupyter Notebooks：练习指南

- 课程路径：`phases/00-setup-and-tooling/05-jupyter-notebooks`
- 可运行 Python 文件：`notebook_tips.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 打开 JupyterLab，创建 notebook，用 `%timeit` 比较列表推导式与 numpy 创建 100,000 个随机数数组的速度
2. 创建包含 markdown 和代码单元格的 notebook：加载 CSV、显示 dataframe、绘制图表；然后用 Kernel > Restart & Run All 验证可从上到下运行
3. 将 `notebook_tips.py` 的代码粘入 Colab notebook，并使用免费 GPU 运行

## 运行与验证

在课程目录下执行：

```bash
python3 notebook_tips.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
