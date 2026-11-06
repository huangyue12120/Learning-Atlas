# 第 44 课：带线性预热的余弦学习率：Python 练习指南

- 课程路径：`phases/19-capstone-projects/44-cosine-lr-warmup`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证线性预热、余弦衰减与 AdamW 参数组。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录每步 learning rate、gradient L2、ASCII 曲线及 schedule CSV。
2. 手算第 0、warmup、total_steps 三个边界，改变 warmup_steps/lr_min 并检查越界参数拒绝。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

边界值与定义一致，bias/norm 的 weight decay 分组正确；非零 lr_min 是可选策略。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
