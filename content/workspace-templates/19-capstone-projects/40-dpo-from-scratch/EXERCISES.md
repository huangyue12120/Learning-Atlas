# 第 40 课：从零实现直接偏好优化：Python 练习指南

- 课程路径：`phases/19-capstone-projects/40-dpo-from-scratch`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证参考策略、序列概率与 DPO/IPO 目标。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录 chosen-rejected 初末 margin、训练 loss 和逐偏好对的结果。
2. 确认参考模型冻结；手算一对 beta>0 时的 DPO 损失和梯度符号，再核对 IPO 的 1/(2*beta) 目标。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

目标公式与实现一致；长度归一化改变目标定义，应作为对照而非标准 DPO 的必要步骤。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
