# 交叉注意力融合：Python 练习指南

- 课程路径：`phases/19-capstone-projects/61-cross-attention-fusion`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证文本因果自注意力与图像交叉注意力缓存。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s code -p "test_main.py" -v
```

## 动手练习

1. 记录 causal mask、logits shape 和 cached/uncached 最大误差。
2. 改变未来文本词元，确认较早位置输出不变；改变图像 memory 后重建缓存，验证不能复用旧 K/V。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

输出跟随 query 长度，固定 memory 的缓存路径在容差内等价；padding/可见性掩码按实际场景处理。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
