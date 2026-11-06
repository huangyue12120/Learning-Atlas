# 多模态评测：Python 练习指南

- 课程路径：`phases/19-capstone-projects/63-multimodal-eval`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

在留出样本上比较检索、VQA 与 caption 指标。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。 应用会自动补齐相邻先修目录：`62-vision-language-pretraining`；传递依赖一并复制。请保留工作区父目录中的这些同级目录，不要把本课 code/ 单独搬走。

```bash
python3 code/main.py
python3 -m unittest discover -s code -p "test_main.py" -v
```

## 动手练习

1. 记录训练前后 R@K、VQA exact match、BLEU 和各项 delta，确认 eval seed 与训练数据分开。
2. 用已知全对/全错排序和 caption 测指标，再改变参考数量观察裁剪计数、BP 与平滑的作用。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

任务指标有分母和方向，训练损失不代替留出评估；合成数据的收益不外推到真实图文任务。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
