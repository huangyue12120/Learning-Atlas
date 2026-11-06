# 梯度裁剪与混合精度：Python 练习指南

- 课程路径：`phases/19-capstone-projects/45-gradient-clipping-amp`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证混合精度、反缩放、梯度裁剪和跳步。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录 pre/post clip norm、scale、skipped 标志与注入非有限梯度那一步的处理。
2. 改变裁剪阈值，确认 post norm 不超过阈值容差；CPU 与 CUDA 路径分别说明是否真正启用 GradScaler。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

AMP 顺序为反缩放后检查/裁剪再更新，非有限梯度不更新权重；梯度上限不等于 AdamW 参数步长上限。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
