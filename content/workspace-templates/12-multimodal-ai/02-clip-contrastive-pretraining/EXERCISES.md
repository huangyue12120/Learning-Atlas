# CLIP 与对比式视觉—语言预训练：练习指南

- 课程路径：`phases/12-multimodal-ai/02-clip-contrastive-pretraining`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 手算一个包含 4 对样本的 InfoNCE。构造 4x4 相似度矩阵，运行 softmax，取出对角线，再计算交叉熵。将你的 Python 实现与手算结果核对。

2. SigLIP 除了温度还使用偏置参数 `b`：`S'[i,j] = S[i,j]/tau + b`。当批量存在严重类别不平衡时（每行的负样本远多于正样本），`b` 起什么作用？阅读 SigLIP 第 3 节（arXiv:2303.15343）。

3. 为猫与狗构建一个零样本分类器。尝试两个提示词模板：`a photo of a {class}` 和 `a picture of a {class}`。在 100 张测试图像上测量准确率。模板集成是否超过单个模板？

4. 计算在 512 个 GPU、批量 32k 的运行中，softmax InfoNCE 与 sigmoid 成对损失的通信成本。哪一个按 O(N) 扩展，哪一个按 O(N^2) 扩展？引用 SigLIP 第 4 节。

5. 阅读 OpenCLIP 缩放定律论文（arXiv:2212.07143，Cherti 等）。从图中复现其关于数据缩放的结论：在模型规模固定时，ImageNet 零样本准确率与训练数据规模之间的对数线性关系是什么？

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
