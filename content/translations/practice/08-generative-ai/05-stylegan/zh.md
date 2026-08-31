---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/08-generative-ai/05-stylegan/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 4b67d997dd5a842de48754015af22b8a53395131d228b28145656a4fab111e75
status: reviewed
---

# StyleGAN

> 多数生成器会同时把 `z` 混入每一层。StyleGAN 将这个过程拆开：先把 `z` 映射为中间变量 `w`，再通过 AdaIN 在每个分辨率层级*注入* `w`。这一项改动解开了潜空间中的纠缠，让照片级人脸生成连续七年都成为一个已经解决的问题。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 8 第 03 课（GAN）、Phase 4 第 08 课（归一化）、Phase 3 第 07 课（CNN）  
**预计时间：** 约 45 分钟

## 问题

DCGAN 通过一组转置卷积把 `z` 映射为图像。问题在于，`z` 同时控制姿态、光照、身份和背景，所有因素纠缠在一起。沿 `z` 的某一轴移动，四个因素都会变化。你无法要求模型生成“同一个人，不同姿态”，因为表示并未按这种方式分解。

Karras 等（2019，NVIDIA）提出：停止把 `z` 直接送入卷积层。以一个常量 `4×4×512` 张量作为网络输入。学习一个 8 层 MLP，将 `z ∈ Z → w ∈ W`。通过*自适应实例归一化*（AdaIN）在每个分辨率注入 `w`：先归一化每张卷积特征图，再使用 `w` 的仿射投影进行缩放和平移。每层还要加入噪声，以生成随机细节（皮肤毛孔、发丝）。

结果是：`W` 中代表“高层风格”（姿态、身份）与“精细风格”（光照、颜色）的轴近似正交。你可以在低分辨率层使用图像 A 的 `w`，在高分辨率层使用图像 B 的 `w`，从而交换两张图像的风格。这一设计开启了图像编辑、跨领域风格化和整条“StyleGAN 反演”研究路线。

## 概念 <!-- learning-atlas: the-concept -->

![StyleGAN：映射网络 + AdaIN + 逐层噪声](../assets/stylegan.svg)

**映射网络。** `f: Z → W`，一个 8 层 MLP。`Z = N(0, I)^512`。`W` 不必服从高斯分布，它会学习适应数据的形状。

**合成网络。** 从学习得到的常量 `4×4×512` 开始。每个分辨率块执行：`上采样 → 卷积 → AdaIN(w_i) → 噪声 → 卷积 → AdaIN(w_i) → 噪声`。分辨率依次翻倍：4、8、16、32、64、128、256、512、1024。

**AdaIN。**

```
AdaIN(x, y) = y_scale · (x - mean(x)) / std(x) + y_bias
```

其中 `y_scale` 和 `y_bias` 来自 `w` 的仿射投影。先逐特征图归一化，再重新施加风格。这里的“风格”就是特征图的一阶和二阶统计量。

**逐层噪声。** 为每张特征图加入单通道高斯噪声，并使用学习得到的逐通道因子进行缩放。它控制随机细节，不影响全局结构。

**截断技巧。** 推理时采样 `z`，计算 `w = mapping(z)`，然后使用 `w' = ŵ + ψ·(w - ŵ)`，其中 `ŵ` 是许多样本的平均 `w`。`ψ < 1` 用多样性换取质量。几乎每个 StyleGAN 演示都使用 `ψ ≈ 0.7`。

## StyleGAN 1 → 2 → 3

| 版本 | 年份 | 创新 |
|------|------|------|
| StyleGAN | 2019 | 映射网络 + AdaIN + 噪声 + 渐进式增长。 |
| StyleGAN2 | 2020 | 用权重解调替换 AdaIN（修复水滴伪影）；跳跃 / 残差架构；路径长度正则化。 |
| StyleGAN3 | 2021 | 无混叠卷积 + 等变核；消除纹理黏附像素网格的问题。 |
| StyleGAN-XL | 2022 | 类别条件，1024²，ImageNet。 |
| R3GAN | 2024 | 使用更强正则化重新包装 GAN；在 FFHQ-1024 上以少 20 倍的参数缩小与扩散的差距。 |

到 2026 年，StyleGAN3 在三种场景中仍是默认选择：（a）以高 FPS 在窄领域生成照片级图像；（b）少样本领域适应（用 100 张图像训练新数据集并冻结映射网络）；（c）基于反演的编辑（找到能够重建真实照片的 `w`，再编辑该 `w`）。它不适合开放领域文生图，后者应使用扩散。

```figure
gx-stylegan-mapping
```

## 动手构建

`code/main.py` 在一维空间中实现玩具版“Style-GAN lite”：一个映射 MLP；一个合成函数，它接收学习得到的常量向量，再用 `w` 派生的缩放 / 偏置对其调制；以及逐层噪声。该示例会展示，通过仿射调制注入 `w` 的效果不逊于把 `z` 拼接到生成器输入，甚至可能更好。

### 第 1 步：映射网络

```python
def mapping(z, M):
    h = z
    for i in range(num_layers):
        h = leaky_relu(add(matmul(M[f"W{i}"], h), M[f"b{i}"]))
    return h
```

### 第 2 步：自适应实例归一化

```python
def adain(x, w_scale, w_bias):
    mu = mean(x)
    sd = std(x)
    x_norm = [(xi - mu) / (sd + 1e-8) for xi in x]
    return [w_scale * xi + w_bias for xi in x_norm]
```

每张特征图的缩放和偏置都通过线性投影从 `w` 得到。

### 第 3 步：逐层噪声

```python
def add_noise(x, sigma, rng):
    return [xi + sigma * rng.gauss(0, 1) for xi in x]
```

每个通道的 Sigma 都可学习。

## 常见问题

- **水滴伪影。** StyleGAN 1 会在特征图中产生团块状水滴，因为 AdaIN 把均值归零。StyleGAN 2 使用权重解调，改为缩放卷积权重，从而修复该问题。
- **纹理黏附。** StyleGAN 1 和 2 的纹理跟随像素坐标，而非物体坐标，插值时可以观察到。StyleGAN 3 通过使用加窗 sinc 滤波器的无混叠卷积解决这一问题。
- **模式覆盖。** 截断值 `ψ < 0.7` 会生成干净图像，但只从狭窄锥体中采样；如果需要多样性，应使用 `ψ = 1.0`。
- **反演有损。** 把真实照片反演到 `W` 通常依靠优化或编码器（e4e、ReStyle、HyperStyle）完成。迭代多次后，结果会发生偏移。

## 使用方法

| 用例 | 方法 |
|------|------|
| 照片级人脸（动漫、产品、窄领域） | StyleGAN3 FFHQ / 自定义微调 |
| 根据照片编辑人脸 | e4e 反演 + StyleSpace / InterFaceGAN 方向 |
| 换脸 / 表情动作迁移 | StyleGAN + 编码器 + 混合 |
| 头像流水线 | StyleGAN3 + ADA，针对少量数据微调 |
| 根据少量图像进行领域适应 | 冻结映射网络，微调合成网络 |
| 多模态或文本条件生成 | 不要使用 StyleGAN，应使用扩散 |

当产品级演示只需要“一个人的脸部照片”时，StyleGAN 的推理成本更低（一次前向传播，在 4090 上少于 10 ms），并能在同等质量门槛下生成比扩散更清晰的图像。

## 交付成果

保存为 `outputs/skill-stylegan-inversion.md`。该技能接收一张真实照片，输出反演方法（e4e / ReStyle / HyperStyle）、预期潜变量损失、编辑预算（在出现伪影之前能在 `W` 中移动多远），以及一组效果可靠的编辑方向（年龄、表情、姿态）。

## 练习

1. **简单。** 分别设置 `adain_on=True` 和 `adain_on=False` 运行 `code/main.py`。对于固定潜变量和扰动潜变量，比较输出的分散程度。
2. **中等。** 实现混合正则化：对一个训练批次计算 `w_a`、`w_b`，合成过程的前半段使用 `w_a`，后半段使用 `w_b`。解码器能否学到解耦风格？
3. **困难。** 取一个预训练 StyleGAN3 FFHQ 模型（ffhq-1024.pkl）。在有标签样本上训练 SVM，找到控制“微笑”的 `w` 方向；报告身份开始偏移之前可以推动多远。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 映射网络 | “那个 MLP” | `f: Z → W`，共 8 层，把潜变量几何与数据统计解耦。 |
| W 空间 | “风格空间” | 映射网络的输出；各因素近似解耦。 |
| AdaIN | “自适应实例归一化” | 归一化特征图，再通过 `w` 投影对其缩放和平移。 |
| 截断技巧 | “Psi” | `w = mean + ψ·(w - mean)`，ψ<1 用多样性换取质量。 |
| 路径长度正则化 | “PL reg” | 惩罚 `w` 单位变化引起的图像大幅变化，使 `W` 更平滑。 |
| 权重解调 | “StyleGAN2 的修复” | 归一化卷积权重而非激活，消除水滴伪影。 |
| 无混叠 | “StyleGAN3 的技巧” | 使用加窗 sinc 滤波器；消除纹理在像素网格上的黏附。 |
| 反演 | “为真实图像寻找 w” | 优化或编码 `x → w`，使 `G(w) ≈ x`。 |

## 生产说明：StyleGAN 为什么在 2026 年仍被部署

StyleGAN3 在 4090 上生成一张 1024² FFHQ 人脸所需时间不到 10 ms：`num_steps = 1`，没有 VAE 解码，也没有交叉注意力传播。用生产术语来说，这是所有图像生成器的延迟下限。同分辨率下，一条 50 步 SDXL + VAE 解码流水线约需 3 秒，两者相差 **300 倍**。在头像服务、身份证件流水线、库存人脸生成等窄领域产品中，StyleGAN 能在总拥有成本（TCO）上获胜。

由此带来两个运维结论：

- **无需调度器或批处理器。** 按目标占用率建立静态批次就是最优方案。连续批处理对大语言模型和扩散至关重要，但在这里毫无收益，因为每个请求的 FLOPs 都相同。
- **截断值 `ψ` 是安全调节项。** `ψ < 0.7` 会从映射网络取值范围中的狭窄锥体采样。服务层只能通过它控制样本方差。高峰负载时降低 `ψ`，为高级用户提高它。

## 延伸阅读

- [Karras 等（2019），《A Style-Based Generator Architecture for GANs》](https://arxiv.org/abs/1812.04948)——StyleGAN。
- [Karras 等（2020），《Analyzing and Improving the Image Quality of StyleGAN》](https://arxiv.org/abs/1912.04958)——StyleGAN2。
- [Karras 等（2021），《Alias-Free Generative Adversarial Networks》](https://arxiv.org/abs/2106.12423)——StyleGAN3。
- [Tov 等（2021），《Designing an Encoder for StyleGAN Image Manipulation》](https://arxiv.org/abs/2102.02766)——e4e 反演。
- [Sauer 等（2022），《StyleGAN-XL: Scaling StyleGAN to Large Diverse Datasets》](https://arxiv.org/abs/2202.00273)——StyleGAN-XL。
- [Huang 等（2024），《R3GAN: The GAN is dead; long live the GAN!》](https://arxiv.org/abs/2501.05441)——现代精简 GAN 方案。
