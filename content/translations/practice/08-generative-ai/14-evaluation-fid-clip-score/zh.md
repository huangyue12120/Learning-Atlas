---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/08-generative-ai/14-evaluation-fid-clip-score/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 4d3065d894662f8b621270106203c8f7a16d990c47fee5cba6ed66ee6b9c97ea
status: reviewed
---

# 评估——FID、CLIP Score 与人类偏好

> 每个生成模型排行榜都会引用 FID、CLIP score 和人类偏好竞技场的胜率。每个数字都有一种可被执意钻空子的研究者利用的失效模式。如果不了解这些失效模式，你就无法分辨真正的改进与迎合指标的结果。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 8 第 01 课（分类）、Phase 2 第 04 课（评估指标）  
**预计时间：** 约 45 分钟

## 问题

评判生成模型时，要看*样本质量*与*条件遵循*。二者都没有闭式度量。模型必须渲染 1 万张图像，由某个方法为这些图像赋值；你还必须相信这些数字能跨模型家族、分辨率和架构进行比较。三种指标经受住了 2014—2026 年的考验：

- **FID（Fréchet Inception Distance）。** 在 Inception 网络的特征空间中，计算真实分布与生成分布之间的距离。越低越好。
- **CLIP score。** 计算生成图像的 CLIP 图像嵌入与提示词的 CLIP 文本嵌入之间的余弦相似度。越高越好，用于衡量提示词遵循。
- **人类偏好。** 让两个模型使用同一提示词正面对比，请人类（或 GPT-4 级模型）选出更好的结果，再汇总为 Elo 分数。

你还会见到 IS（Inception score，基本退出使用）、KID、CMMD、ImageReward、PickScore、HPSv2、MJHQ-30k。每一项都试图修正前一项的某个失效模式。

## 概念

![FID、CLIP 与偏好：三个维度，不同的失效模式](../assets/evaluation.svg)

### FID——样本质量

Heusel 等（2017）提出如下步骤：

1. 为 N 张真实图像和 N 张生成图像提取 Inception-v3 特征（2048 维）。
2. 对两组特征分别拟合高斯分布：计算均值 `μ_r, μ_g` 和协方差 `Σ_r, Σ_g`。
3. FID = `||μ_r - μ_g||² + Tr(Σ_r + Σ_g - 2 · (Σ_r · Σ_g)^0.5)`。

解释：它是在特征空间中对两个多元高斯分布计算 Fréchet 距离。值越低，分布越相似。

失效模式：
- **小 N 下存在偏差。** FID 会在特征分布上计算均方量；小 N 会低估协方差，产生虚假的低 FID。始终使用 N ≥ 10,000。
- **依赖 Inception。** Inception-v3 在 ImageNet 上训练。人脸、艺术、文字图像等远离 ImageNet 的领域会得到没有意义的 FID。应使用领域专用特征提取器。
- **迎合指标。** 过拟合 Inception 先验可以降低 FID，而不改善视觉质量。可以使用下述 CMMD 识别这种情况。

### CLIP score——提示词遵循

Radford 等（2021）针对一张生成图像 + 提示词计算：

```
clip_score = cos_sim( CLIP_image(x_gen), CLIP_text(prompt) )
```

在 3 万张生成图像上取平均，便得到可以在模型之间比较的标量。

失效模式：
- **CLIP 自身的盲点。** CLIP 的组合推理较弱，经常无法正确处理“蓝色球体上的红色立方体”。模型可能取得很高 CLIP score，却没有真正遵循复杂提示词。
- **短提示词偏差。** 网络上的图像更容易与短提示词匹配。长提示词会因机制原因得到较低 CLIP score。
- **提示词投机。** 在提示词中加入“high quality, 4k, masterpiece”，可以抬高 CLIP score，却不改善图文绑定。

CMMD（Jayasumana 等，2024）修复了其中一部分问题：使用 CLIP 特征替换 Inception，以最大均值差异替换 Fréchet 距离。它更善于检测细微质量差异。

### 人类偏好——真实标准

选择一组提示词，用模型 A 和模型 B 生成结果。向人类（或强大语言模型评审）展示成对图像，再把胜负汇总为 Elo 或 Bradley-Terry 分数。相关基准包括：

- **PartiPrompts（Google）：** 1600 个多样提示词，分为 12 类。
- **HPSv2：** 10.7 万条人类标注，广泛用作自动代理指标。
- **ImageReward：** 13.7 万对提示词—图像偏好，使用 MIT 许可证。
- **PickScore：** 在 Pick-a-Pic 的 260 万条偏好上训练。
- **Chatbot-Arena 式图像竞技场：** https://imagearena.ai/ 等。

失效模式：
- **评审方差。** 非专家与专家偏好不同，应同时使用两类评审。
- **提示词分布。** 精心挑选提示词会偏袒某一类模型，必须记录所用分布。
- **大语言模型评审奖励投机。** GPT-4 评审会被漂亮但错误的输出欺骗，应以人类评审进行三角验证。

## 组合使用

生产评估报告应包含：

1. 在 1 万～3 万个样本上，相对于留出真实分布计算 FID（样本质量）。
2. 在同一批样本及其提示词上计算 CLIP score / CMMD（遵循程度）。
3. 在盲测竞技场中相对于上一版模型计算胜率（总体偏好）。
4. 失效模式分析：随机抽取 50 个输出，标记已知问题（手部结构、文字渲染、物体数量一致性）。

任何单项指标都可能说谎。三项相互印证的指标 + 定性审查才能构成一项可信主张。

```figure
gx-fid-distributions
```

## 动手构建

`code/main.py` 在合成“特征向量”上实现 FID、类似 CLIP score 的指标和 Elo 聚合（用四维向量代替 Inception 特征）。你会看到：

- 在小 N 与大 N 下计算 FID，观察偏差。
- 把“CLIP score”实现为两组特征之间的余弦相似度。
- 根据合成偏好流应用 Elo 更新规则。

### 第 1 步：用四行实现 FID

```python
def fid(real_features, gen_features):
    mu_r, cov_r = mean_and_cov(real_features)
    mu_g, cov_g = mean_and_cov(gen_features)
    mean_diff = sum((a - b) ** 2 for a, b in zip(mu_r, mu_g))
    trace_term = trace(cov_r) + trace(cov_g) - 2 * sqrt_cov_product(cov_r, cov_g)
    return mean_diff + trace_term
```

### 第 2 步：CLIP 式余弦相似度

```python
def clip_like(image_feat, text_feat):
    dot = sum(a * b for a, b in zip(image_feat, text_feat))
    norm = math.sqrt(dot_self(image_feat) * dot_self(text_feat))
    return dot / max(norm, 1e-8)
```

### 第 3 步：Elo 聚合

```python
def elo_update(r_a, r_b, winner, k=32):
    expected_a = 1 / (1 + 10 ** ((r_b - r_a) / 400))
    actual_a = 1.0 if winner == "a" else 0.0
    r_a_new = r_a + k * (actual_a - expected_a)
    r_b_new = r_b - k * (actual_a - expected_a)
    return r_a_new, r_b_new
```

## 常见问题

- **N=1000 时计算 FID。** N 小于 1 万时，这项启发式指标不可靠。论文报告低 N FID 属于迎合指标。
- **跨分辨率比较 FID。** Inception 会缩放到 299×299，从而改变特征分布。只能在匹配分辨率下比较。
- **只报告一个随机种子。** 至少运行 3 个种子并报告标准差。
- **通过负向提示词抬高 CLIP score。** 一些流水线会通过过度迎合提示词提升 CLIP。应检查视觉饱和问题。
- **提示词重叠造成 Elo 偏差。** 如果两个模型在训练时都见过基准提示词，Elo 就毫无意义。应使用留出提示词集。
- **付费众包造成的人类评估偏差。** Prolific、MTurk 标注者偏年轻，也更熟悉技术。应加入招募的艺术 / 设计专家。

## 使用方法

2026 年生产评估方案：

| 支柱 | 最低要求 | 推荐方案 |
|------|----------|----------|
| 样本质量 | 对 1 万样本与留出真实数据计算 FID | + 对 5000 样本计算 CMMD + 逐类别子集 FID |
| 提示词遵循 | 对 3 万样本计算 CLIP score | + HPSv2 + ImageReward + VQA 式问答 |
| 偏好 | 相对基线进行 200 对盲测 | + 2000 对人类评审 + 大语言模型评审 + Chatbot Arena |
| 失效分析 | 人工标记 50 个样本 | 人工标记 500 个样本 + 自动安全分类器 |

四项支柱都出现在同一份报告中，才能构成主张。单独一项只是营销。

## 交付成果

保存为 `outputs/skill-eval-report.md`。该技能接收新模型检查点 + 基线，输出完整评估计划：样本量、指标、失效模式探针和签署标准。

## 练习

1. **简单。** 运行 `code/main.py`。在同一组合成分布上比较 N=100 与 N=1000 时的 FID，报告偏差大小。
2. **中等。** 根据合成 CLIP 式特征实现 CMMD（公式见 Jayasumana 等，2024）。比较它与 FID 对质量差异的敏感度。
3. **困难。** 复现 HPSv2 设置：从 Pick-a-Pic 子集中取 1000 对图像—提示词，在偏好数据上微调小型 CLIP 评分器，再测量它与留出集的一致率。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| FID | “Fréchet Inception Distance” | 对真实与生成 Inception 特征的高斯拟合计算 Fréchet 距离。 |
| CLIP score | “图文相似度” | CLIP 图像嵌入与文本嵌入之间的余弦相似度。 |
| CMMD | “FID 的替代品” | CLIP 特征 MMD；偏差更小，不采用高斯假设。 |
| IS | “Inception score” | `Exp KL(p(y\|x) \|\| p(y))`；与现代模型的相关性很差，已退出使用。 |
| HPSv2 / ImageReward / PickScore | “学习得到的偏好代理” | 在人类偏好上训练的小模型；用作自动评审。 |
| Elo | “国际象棋等级分” | 对两两胜负执行 Bradley-Terry 聚合。 |
| PartiPrompts | “基准提示词集” | Google 精选的 1600 条提示词，分为 12 类。 |
| FD-DINO | “自监督替代品” | 使用 DINOv2 特征的 FD；更适合 ImageNet 之外的领域。 |

## 生产说明：评估本身也是推理工作负载

为 1 万个样本计算 FID，意味着要生成 1 万张图像。在单张 L4 上，以 50 步 SDXL 基础模型生成 1024² 图像，需要约 11 小时的单请求推理。评估预算真实存在；它恰好属于离线推理场景，即最大化吞吐量而忽略 TTFT：

- **尽量批处理，不考虑延迟。** 离线评估应使用能装入内存的最大静态批次。在 80GB H100 上使用 `num_images_per_prompt=8` 调用 `pipe(...).images`，实际耗时比单请求快 4～6 倍。
- **缓存真实特征。** 真实参考集的 Inception（FID）或 CLIP（CLIP-score、CMMD）特征只提取*一次*，保存为 `.npz`。不要在每次评估时重新计算。

对于 CI / 回归门禁：每个 PR 在 500 个样本子集上运行 FID + CLIP score（约 30 分钟）；每晚运行完整 1 万样本 FID + HPSv2 + Elo。

## 延伸阅读

- [Heusel 等（2017），《GANs Trained by a Two Time-Scale Update Rule Converge to a Local Nash Equilibrium (FID)》](https://arxiv.org/abs/1706.08500)——FID 论文。
- [Jayasumana 等（2024），《Rethinking FID: Towards a Better Evaluation Metric for Image Generation (CMMD)》](https://arxiv.org/abs/2401.09603)——CMMD。
- [Radford 等（2021），《Learning Transferable Visual Models from Natural Language Supervision (CLIP)》](https://arxiv.org/abs/2103.00020)——CLIP。
- [Wu 等（2023），《HPSv2: A Comprehensive Human Preference Score》](https://arxiv.org/abs/2306.09341)——HPSv2。
- [Xu 等（2023），《ImageReward: Learning and Evaluating Human Preferences for Text-to-Image Generation》](https://arxiv.org/abs/2304.05977)——ImageReward。
- [Yu 等（2023），《Scaling Autoregressive Models for Content-Rich Text-to-Image Generation (Parti + PartiPrompts)》](https://arxiv.org/abs/2206.10789)——PartiPrompts。
- [Stein 等（2023），《Exposing flaws of generative model evaluation metrics》](https://arxiv.org/abs/2306.04675)——失效模式综述。
