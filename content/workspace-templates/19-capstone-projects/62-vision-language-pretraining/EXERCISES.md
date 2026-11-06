# 视觉语言预训练：Python 练习指南

- 课程路径：`phases/19-capstone-projects/62-vision-language-pretraining`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

联合图文 InfoNCE 与条件语言模型训练。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。 应用会自动补齐相邻先修目录：`59-vit-transformer`、`60-projection-layer-modality-align`、`61-cross-attention-fusion`；传递依赖一并复制。请保留工作区父目录中的这些同级目录，不要把本课 code/ 单独搬走。

```bash
python3 code/main.py
python3 -m unittest discover -s code -p "test_main.py" -v
```

## 动手练习

1. 记录 contrast loss、LM loss 与 tau 的初末值，沿两条计算图检查各子模块梯度。
2. 分别把 lm_weight 设为零和恢复默认，比较 decoder 梯度；检查 PAD_ID 位置不参与 LM 损失。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

两条损失路径无 NaN 且归属正确；50 步合成演示只验证连接，不能证明大规模收敛。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
