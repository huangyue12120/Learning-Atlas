# 优化器：练习指南

- 课程路径：`phases/03-deep-learning-core/06-optimizers`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 实现 Nesterov 动量：在 lookahead 位置 `w-lr*beta*v` 而非当前位置求梯度，与标准动量在圆数据上比较收敛。
2. 实现前 10% 步从 0 到 max_lr 的线性 warmup，后续 cosine 衰减到 0；比较 Adam 有无 warmup 达到 90% 准确率所需 epoch。
3. 跟踪 Adam 每参数有效 lr `lr*m_hat/(sqrt(v_hat)+eps)`，在 10、50、200 步画分布；所有参数更新速度相同吗？
4. 实现全局范数梯度裁剪，最大 1.0；高 lr=0.01 Adam 有/无裁剪、10 个种子统计发散（loss NaN）次数。
5. 大权重 [-5,5] 初始化，200 epoch、weight_decay=0.1 比较 Adam/AdamW，画权重 L2 范数；AdamW 应更快收缩。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
