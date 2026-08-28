# 完整 Transformer——编码器 + 解码器：练习指南

- 课程路径：`phases/07-transformers-deep-dive/05-full-transformer`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 在 `d_model=512, n_heads=8, ffn_expansion=4, swiglu=True` 时计算 `encoder_block` 的参数量。实现该块并用 `sum(p.numel() for p in block.parameters())` 验证。
2. **中等。** 从 post-norm 切换到 pre-norm。初始化两者，并在随机输入上测量堆叠 12 层后的激活范数。Post-norm 的激活应该爆炸，pre-norm 则保持有界。
3. **困难。** 在玩具复制任务（逆序复制 `x`）上实现四层编码器—解码器，训练 100 步并报告损失。换成 RMSNorm + SwiGLU + RoPE 后，损失是否下降？

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
