# 用于模态对齐的投影层：Python 练习指南

- 课程路径：`phases/19-capstone-projects/60-projection-layer-modality-align`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证冻结编码器与可训练模态投影。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。 应用会自动补齐相邻先修目录：`59-vit-transformer`；传递依赖一并复制。请保留工作区父目录中的这些同级目录，不要把本课 code/ 单独搬走。

```bash
python3 code/main.py
python3 -m unittest discover -s code -p "test_main.py" -v
```

## 动手练习

1. 记录 initial/final loss、cosine similarity、projector params，确认主干和文本表的 requires_grad。
2. 对正交与反向向量手算 1-cos，再运行一次投影更新，检查冻结模块权重不变。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

反向向量损失为 2，梯度只进入选定投影；演示对齐不代表真实多模态理解。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
