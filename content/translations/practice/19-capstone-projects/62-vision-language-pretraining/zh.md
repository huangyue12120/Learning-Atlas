---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/62-vision-language-pretraining/docs/en.md
  revision: 3f9715c62a3bedcffb68a260f1a65ee2dd9cc10a
  sha256: 3c17a427a68580a8b67a51c21d791c3b09f94ce9e5ed890338edc4b132491b92
status: reviewed
---

# 视觉语言预训练

> 编码器、投影层和解码器已经接好，现在把它们一起训练。两个目标驱动学习：对比图像—文本损失 InfoNCE 把匹配对拉近，语言模型损失要求解码器为图像生成标题。二者同时教会网络检索正确图像和写出图像标题。

**类型：** 构建
**语言：** Python
**前置课程：** Phase 19 第 30–37 课（Track B 基础）
**预计时间：** 约 90 分钟

## 学习目标

- 实现批量图像—标题对上的 InfoNCE 对比损失。
- 将对比损失与自回归语言模型损失组合。
- 合成 200 对、无需下载真实数据集的图像—标题语料。
- 运行 50 步演示训练并观察两种损失下降。

## 问题

视觉语言模型需要两种能力：它要能排序——给定标题，在众多图像中找到正确的那张；它也要能生成——给定图像，写出一段标题。只在一种能力上预训练，只能得到半个系统。CLIP 把排序做到了极致，却无法生成标题；GPT-4V 能生成标题，但排序要用单独的检索头。多目标预训练在一次训练中同时获得两种能力。

InfoNCE 处理排序这一半。对于一批 N 个样本对，模型把 N 个匹配对视为正样本，把 `N^2 - N` 个错配对视为负样本，然后在得到的 `(N, N)` 相似度矩阵上执行交叉熵损失。LM 损失处理生成这一半：以图像为条件的标准下一词元预测。两种损失都可微，并且共享编码器和投影层权重；解码器只用 LM 损失训练。

## 概念

```mermaid
flowchart TB
  Batch[N 个图像—标题对的批次] --> Enc[视觉编码器]
  Batch --> Tok[对标题分词]
  Enc --> Pool[CLS 池化 + 投影]
  Tok --> TxtEnc[文本编码器均值池化]
  Pool --> ImgEmb[图像嵌入 N x D]
  TxtEnc --> TxtEmb[文本嵌入 N x D]
  ImgEmb --> Sim[相似度矩阵 N x N]
  TxtEmb --> Sim
  Sim --> CL[双向 InfoNCE]
  Enc --> Dec[交叉注意力解码器]
  Tok --> Dec
  Dec --> LM[语言建模交叉熵]
  CL --> Total[对比损失 + LM]
  LM --> Total
```

### InfoNCE

将 N 个图像嵌入和 N 个文本嵌入分别按行堆叠并做 L2 归一化，计算 `S = I T^T / tau`，其中 `tau` 是可学习的温度。对角线是匹配对，非对角线是负样本；以对角线为目标执行行方向交叉熵，使第 `i` 行的最高值位于第 `i` 列，再沿列方向对称执行一次，取两者平均。这就是八行左右的 CLIP 损失。

### 温度

温度 `tau` 控制 softmax 的尖锐程度。太小（例如 `tau = 0.01`）时，梯度几乎只来自最难的负样本，训练会很嘈杂；太大时 softmax 变平，梯度会消失。CLIP 把 `tau` 作为参数学习，本文演示也采用同样做法。

### 语言模型损失

解码器通过交叉注意力读取图像 memory，在每个位置预测下一个文本词元。损失是以 next-position target 为目标的标准交叉熵，padding 位置会从损失中屏蔽。

### 组合两种损失

总损失为 `total = contrastive + lm_weight * lm`，其中 `lm_weight` 是标量，常取 1.0。两种损失都会把梯度传入编码器和投影层，而解码器只会收到 LM 损失的梯度。这是 CoCa 和 BLIP 采用的多任务配方，只是权重各有不同。SigLIP 只保留对比项，并把 softmax 换成 sigmoid 成对损失。

| 组件 | 损失面 | 影响范围 |
|---|---|---|
| InfoNCE | 联合空间中的成对排序 | 编码器 + 投影层 + 文本头 |
| LM | 以图像为条件的词元预测 | 编码器 + 投影层 + 解码器 |
| 组合 | 多任务 | 整个堆栈 |

### 为什么演示 50 步就足够

模拟语料包含 200 对随机图像与随机 caption id。batch size 为 16，运行 50 步 SGD 后，即使绝对损失仍高于真实数据模型，两项损失也应明显下降。demo 的目的只是端到端确认梯度连接正常，并验证加入 LM 损失不会使对比目标失稳，不代表模型已达到真实数据性能。

```figure
ch-infonce-diagonal
```

## 动手构建

`code/main.py` 实现：

- `MultimodalModel`：组合小型 ViT 编码器、MLP 投影层、对嵌入 ID 做均值池化的微型文本编码器，以及第 61 课的交叉注意力解码器。
- `info_nce_loss(image_emb, text_emb, temperature)`：双向、CLIP 风格的对比损失。
- `lm_loss(logits, target_ids, padding_id)`：屏蔽 padding 的下一词元交叉熵。
- `make_mock_corpus(seed, n_pairs)`：返回 200 对确定性的 `(image, caption_ids)` 样本。
- 训练循环：使用 batch size 16、Adam 优化器和可学习的 log-temperature 参数运行 50 步，每 5 步打印两种损失。

```bash
python3 code/main.py
```

输出应显示对比损失和 LM 损失均下降；合成数据上的数值重点是验证梯度路径和目标组合。

## 使用

这正是以下方案使用的损失配方：

- **CLIP（2021）。** 只做图像—文本对比，并用独立的冻结编码器标题探针。
- **CoCa（2022）。** 在同一个模型中把图像—文本对比与图像标题生成 LM 损失结合，正是本课构建的模式。
- **BLIP（2022）与 BLIP-2。** 对比损失加 LM 损失再加图像—文本匹配头，三种损失组合。
- **SigLIP（2023）。** 用 sigmoid 成对损失替换 InfoNCE，承担相同的对比角色，只是函数形式不同。
- **LLaVA 系列。** 两阶段训练：第一阶段是在冻结 LM 上做对齐（余弦相似度），第二阶段解冻 LM 并加入 LM 损失。第 60 课对应第一阶段，本课对应第二阶段。

## 测试

`code/test_main.py` 覆盖：

- InfoNCE 损失在图像行与文本行方向上对称
- 当相似度矩阵是由大正数构成的完美对角阵时，InfoNCE 损失返回 0
- LM 损失正确屏蔽 padding 位置
- 模型前向传播无误地产生两种损失
- 5 步训练循环能降低组合损失

```bash
python3 -m unittest code/test_main.py
```

## 练习

1. 用 SigLIP 风格的 sigmoid 成对损失替换 InfoNCE，比较其在模拟语料上的收敛。
2. 加入 hard-negative mining：每隔一个 batch，从上一批选择最难的非对角错配对并追加进去，观察对比损失是否下降更快。
3. 加入第三个图像—文本匹配头，复现 BLIP 的三头设置。
4. 用由图像 hash 条件化的 Markov 链生成标题，比较可学习信号的作用。
5. 分别用 `lm_weight = 0` 和 `lm_weight = 1` 训练同一模型并比较对比损失；加入 LM 损失后，排序目标不应退化。

## 关键术语

| 术语 | 含义 |
|---|---|
| InfoNCE | 在相似度矩阵上执行交叉熵的噪声对比估计 |
| 温度 | 控制对比 softmax 尖锐程度的标量 |
| hard negative | 模型容易混淆的非对角错配对 |
| LM loss | 标题生成侧的下一词元交叉熵 |
| 联合嵌入空间 | 图像与文本投影后共同所在的空间 |

## 延伸阅读

- CLIP：原始对比训练方案。
- CoCa：对比与标题生成的联合模型。
- SigLIP：可扩展性更好的 sigmoid 成对损失。
