# 从头实现自注意力：练习指南

- 课程路径：`phases/07-transformers-deep-dive/02-self-attention-from-scratch`
- 可运行 Python 文件：`self_attention.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 修改 `scaled_dot_product_attention`，使其接收可选遮蔽矩阵，并在 softmax 前把特定位置设为负无穷（因果 / 解码器遮蔽采用这种方式）
2. 从头实现多头注意力：把 Q、K、V 拆分成 `n_heads` 个块，分别运行注意力，拼接结果，再通过最终权重矩阵 Wo 投影
3. 取两个长度相同、内容不同的句子，将它们送入同一个 SelfAttention 实例并比较注意力模式。什么发生了变化？什么保持不变？

## 运行与验证

在课程目录下执行：

```bash
python3 self_attention.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
