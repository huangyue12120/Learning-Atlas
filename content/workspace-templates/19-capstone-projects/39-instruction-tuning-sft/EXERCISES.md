# 毕业课程 39：通过监督微调进行指令调优：Python 练习指南

- 课程路径：`phases/19-capstone-projects/39-instruction-tuning-sft`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证指令数据、assistant-only 标签与 SFT 评估。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录 baseline/final EM、各类别 EM 与样本生成，查看标签中提示词和 padding 的 -100 掩码。
2. 增加一个很长提示词与很短回答，检查截断后仍有有效监督词元；对比训练/留出样本确认无重复泄漏。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

移位损失与掩码对应，loss 下降和 EM 分别报告，不把低损失直接解释成指令泛化。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
