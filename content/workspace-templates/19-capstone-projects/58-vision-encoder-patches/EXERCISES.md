# 视觉编码器图块：Python 练习指南

- 课程路径：`phases/19-capstone-projects/58-vision-encoder-patches`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证 patch 展平、卷积投影与二维位置编码。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s code -p "test_main.py" -v
```

## 动手练习

1. 记录 grid、patch 数、含 CLS 的序列长度、Conv2d 与 unfold reference 最大误差。
2. 用可识别的像素排列检查无投影的分块还原，再改变图像尺寸检查网格约束和位置编码形状。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

224×224、16×16 patch 时有 196 patch 加 1 CLS；固定位置编码支持新网格不等于质量自动保持。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
