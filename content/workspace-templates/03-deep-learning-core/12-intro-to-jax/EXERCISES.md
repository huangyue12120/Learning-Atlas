# JAX 入门：练习指南

- 课程路径：`phases/03-deep-learning-core/12-intro-to-jax`
- 可运行 Python 文件：`jax_intro.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 为 MLP 加入 dropout。在 JAX 中 dropout 需要 PRNG key：让 key 穿过前向传播，并为每个 dropout 层拆分。比较带与不带 dropout 的测试准确率。
2. 用 `jax.vmap` 为 32 张 MNIST 图像的批次计算逐样本梯度，计算每个样本的梯度范数。哪些示例梯度最大，为什么？
3. 将手动前向函数替换为适用于任意层数的通用 `mlp_forward(params, x)`，用 `jax.tree.leaves` 自动确定深度。
4. 对比带与不带 `@jax.jit` 的训练步骤，各运行 100 步并计时。你的硬件上加速多少？首次调用的编译开销是多少？
5. 用 `optax.chain(optax.clip_by_global_norm(1.0), optax.adam(1e-3))` 实现梯度裁剪；带与不带裁剪训练，绘制梯度范数以观察效果。

## 运行与验证

在课程目录下执行：

```bash
python3 jax_intro.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
