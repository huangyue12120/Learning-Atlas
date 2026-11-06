# Vision Transformer 编码器：Python 练习指南

- 课程路径：`phases/19-capstone-projects/59-vit-transformer`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证 ViT block、CLS 路径和梯度。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。 应用会自动补齐相邻先修目录：`58-vision-encoder-patches`；传递依赖一并复制。请保留工作区父目录中的这些同级目录，不要把本课 code/ 单独搬走。

```bash
python3 code/main.py
python3 -m unittest discover -s code -p "test_main.py" -v
```

## 动手练习

1. 记录 front/vit/total params、各层 CLS norm、注意力行和与 patch/CLS 梯度。
2. 改变 depth/head 数检查维数约束，固定 seed 与 eval 模式比较输出，再确认非因果注意力可读取整张图像。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

CLS 输出形状正确，梯度回到 patch 前端；Pre-LN 不保证所有配置免预热或不发散。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
