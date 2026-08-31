---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/08-generative-ai/12-3d-generation/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: ff570bbe7e4e91898a1277b64011cd2f5bdd1e6bd4dbb5687d8e25f14fd1eeff
status: reviewed
---

# 3D 生成

> 3D 是最能利用二维到三维杠杆效应的模态。2023 年的突破是 3D 高斯泼溅。2024—2026 年的生成浪潮在其上叠加多视图扩散 + 3D 重建，根据一条提示词或一张照片生成物体和场景。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 4（视觉）、Phase 8 第 07 课（潜空间扩散）  
**预计时间：** 约 45 分钟

## 问题

3D 内容很难处理：

- **表示。** 网格、点云、体素网格、有符号距离场（SDF）、神经辐射场（NeRF）、3D 高斯，各有取舍。
- **数据稀缺。** ImageNet 有 1400 万张图像。最大的干净 3D 数据集 Objaverse-XL（2023）约有 1000 万个物体，但多数质量不高。
- **内存。** 512³ 体素网格包含 1.28 亿个体素；可用的场景 NeRF 每条射线需要 100 万个样本。生成比重建更难。
- **监督。** 二维图像直接提供像素；3D 通常只有少数二维视图，必须把它们提升为三维表示。

2026 年的技术栈把问题分成两步。先用扩散模型生成*二维多视图图像*，再为这些图像拟合*三维表示*，通常采用高斯泼溅。

## 概念 <!-- learning-atlas: the-concept -->

![3D 生成：多视图扩散 + 3D 重建](../assets/3d-generation.svg)

### 表示：3D 高斯泼溅（Kerbl 等，2023）

把场景表示为由约 100 万个三维高斯组成的点云。每个高斯有 59 个参数：位置（3）、协方差（6，或者四元数 4 + 缩放 3）、不透明度（1）、球谐颜色（3 阶为 48，0 阶为 3）。

渲染 = 投影 + alpha 合成。速度很快（在 4090 上以 1080p 渲染约 100 fps），可以求微分。使用真实照片作为目标，通过梯度下降拟合。消费级 GPU 可在 5～30 分钟内拟合一个场景。

2023—2024 年又出现了两项创新：
- **生成式高斯泼溅。** LGM、LRM、InstantMesh 等模型直接根据一张或少数几张图像预测高斯点云。
- **4D 高斯泼溅。** 为高斯添加逐帧偏移，表示动态场景。

### 多视图扩散

微调预训练图像扩散模型，使其根据文本提示词或单张图像，生成同一物体的多个一致视图。代表方法包括 Zero123（Liu 等，2023）、MVDream（Shi 等，2023）、SV3D（Stability，2024）、CAT3D（Google，2024）。它们通常输出围绕物体的 4～16 个视图，再通过高斯泼溅或 NeRF 提升为 3D。

### 文本到 3D 流水线

| 模型 | 输入 | 输出 | 时间 |
|------|------|------|------|
| DreamFusion（2022） | 文本 | 通过 SDS 生成 NeRF | 每个资产约 1 小时 |
| Magic3D | 文本 | 网格 + 纹理 | 约 40 分钟 |
| Shap-E（OpenAI，2023） | 文本 | 隐式 3D | 约 1 分钟 |
| SJC / ProlificDreamer | 文本 | NeRF / 网格 | 约 30 分钟 |
| LRM（Meta，2023） | 图像 | 三平面 | 约 5 s |
| InstantMesh（2024） | 图像 | 网格 | 约 10 s |
| SV3D（Stability，2024） | 图像 | 新视角 | 约 2 分钟 |
| CAT3D（Google，2024） | 1～64 张图像 | 3D NeRF | 约 1 分钟 |
| TripoSR（2024） | 图像 | 网格 | 约 1 s |
| Meshy 4（2025） | 文本 + 图像 | PBR 网格 | 约 30 s |
| Rodin Gen-1.5（2025） | 文本 + 图像 | PBR 网格 | 约 60 s |
| Tencent Hunyuan3D 2.0（2025） | 图像 | 网格 | 约 30 s |

2025—2026 年的发展方向是直接生成适合游戏引擎、带 PBR 材质的文本到网格模型。对于通用物体，多视图扩散中间步骤仍是效果最佳的方案。

### NeRF（补充背景）

神经辐射场（Neural Radiance Field，Mildenhall 等，2020）。一个微型 MLP 接收 `(x, y, z, 视角方向)`，输出 `(颜色, 密度)`。沿射线积分完成渲染。它在新视角合成质量上优于基于网格的方法，但渲染慢 100～1000 倍。多数实时应用已经改用高斯泼溅，不过 NeRF 仍主导研究领域。

```figure
v4-3d-multiview
```

## 动手构建

`code/main.py` 实现一个玩具二维“高斯泼溅”拟合：把合成目标图像（平滑渐变）表示为一组二维高斯泼溅之和。通过梯度下降优化位置、颜色和协方差，使结果匹配目标。你会看到两项核心操作：前向渲染（泼溅 + alpha 合成）以及使用梯度下降拟合。

### 第 1 步：二维高斯泼溅

```python
def gaussian_at(x, y, gaussian):
    px, py = gaussian["pos"]
    sigma = gaussian["sigma"]
    d2 = (x - px) ** 2 + (y - py) ** 2
    return math.exp(-d2 / (2 * sigma * sigma))
```

### 第 2 步：对泼溅求和完成渲染

```python
def render(image_size, gaussians):
    img = [[0.0] * image_size for _ in range(image_size)]
    for g in gaussians:
        for y in range(image_size):
            for x in range(image_size):
                img[y][x] += g["color"] * gaussian_at(x, y, g)
    return img
```

真实的 3D 高斯泼溅会按深度排序高斯，再依次执行 alpha 合成。二维玩具示例只做求和。

### 第 3 步：通过梯度下降拟合

```python
for step in range(steps):
    pred = render(size, gaussians)
    loss = mse(pred, target)
    gradients = compute_grads(pred, target, gaussians)
    update(gaussians, gradients, lr)
```

## 常见问题

- **视图不一致。** 如果独立生成 4 个视图，而它们对物体结构的描述彼此冲突，三维拟合会很模糊。解决方法：使用共享注意力的多视图扩散。
- **背面幻觉。** 单张图像 → 3D 必须虚构不可见的一面，质量波动很大。
- **高斯泼溅爆炸。** 不加约束的训练会增长到 1000 万个泼溅并过拟合。必须使用来自原始 3D-GS 论文的致密化 + 剪枝启发式方法。
- **拓扑问题。** 从隐式场（SDF）得到的网格经常有孔洞或自相交。交付前应运行重网格化工具，例如 Blender 的体素重网格化。
- **训练数据许可证。** Objaverse 混合使用多种许可证；商业用途会因模型而异。

## 使用方法

| 任务 | 2026 年选择 |
|------|-------------|
| 根据照片重建场景 | 高斯泼溅（3DGS、Gsplat、Scaniverse） |
| 为游戏生成文本到 3D 物体 | Meshy 4 或 Rodin Gen-1.5（PBR 输出） |
| 图像到 3D | Hunyuan3D 2.0、TripoSR、InstantMesh |
| 根据少量图像合成新视角 | CAT3D、SV3D |
| 动态场景重建 | 4D 高斯泼溅 |
| 头像 / 穿衣人体 | Gaussian Avatar、HUGS |
| 研究 / SOTA | 上周刚发布的最新模型 |

在游戏或电商流水线中交付生产级 3D 时，可以选择 Meshy 4 或 Rodin Gen-1.5，它们输出的 PBR 网格能直接进入 Unity / Unreal。

## 交付成果

保存为 `outputs/skill-3d-pipeline.md`。该技能接收 3D 简报（输入：文本 / 一张图 / 少量图；输出：网格 / 泼溅 / NeRF；用途：渲染 / 游戏 / VR），输出流水线（多视图扩散 + 拟合，或直接网格模型）、基础模型、迭代预算、拓扑后处理和所需材质通道。

## 练习

1. **简单。** 分别使用 4、16、64 个高斯运行 `code/main.py`。报告相对于目标的最终 MSE。
2. **中等。** 扩展到彩色高斯（RGB）。确认重建结果与目标颜色模式相符。
3. **困难。** 使用 gsplat 或 Nerfstudio，根据 50 张照片重建一个真实物体。报告拟合时间和留出视图上的最终 SSIM。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 3D 高斯泼溅 | “3DGS” | 用一组三维高斯表示场景；通过可微 alpha 合成渲染。 |
| NeRF | “神经辐射场” | 输出三维点颜色 + 密度的 MLP；沿射线积分渲染。 |
| 三平面 | “三个二维平面” | 把 3D 分解为三个轴对齐的二维特征网格；比体积表示便宜。 |
| SDS | “得分蒸馏采样” | 使用二维扩散得分作为伪梯度，训练三维模型。 |
| 多视图扩散 | “一次生成多个视图” | 输出一批一致相机视图的扩散模型。 |
| PBR | “基于物理的渲染” | 包含反照率、粗糙度、金属度、法线通道的材质。 |
| 致密化 | “增加泼溅” | 3DGS 训练启发式：在高梯度区域拆分 / 克隆泼溅。 |

## 生产说明：3D 尚无统一底座

图像已有潜空间扩散 + DiT，视频已有时空 DiT；3D 在 2026 年仍没有单一主导运行时。生产决策树会根据表示分叉：

- **NeRF / 三平面。** 推理过程是光线步进 + 每个样本执行一次 MLP 前向传播。一次 512² 渲染需要数百万次 MLP 前向传播。应积极批处理光线样本；SDPA/xformers 同样适用。
- **多视图扩散 + LRM 重建。** 两阶段流水线。第 1 阶段（多视图 DiT）与第 07 课的扩散服务器相同。第 2 阶段（LRM Transformer）对各视图执行一次前向传播。整体延迟形态是“扩散 + 单步”，应分别为各阶段选择服务原语。
- **SDS / DreamFusion。** 这是逐资产优化，而非推理。应构建作业系统，不要构建请求处理器。

对于多数 2026 年产品，合适方案是“收到请求后运行多视图扩散模型，异步重建为 3DGS，再提供 3DGS 进行实时查看”。这样可以把工作负载清楚分为快速的 GPU 推理服务器与缓慢的离线优化器。

## 延伸阅读

- [Mildenhall 等（2020），《NeRF: Representing Scenes as Neural Radiance Fields》](https://arxiv.org/abs/2003.08934)——NeRF。
- [Kerbl 等（2023），《3D Gaussian Splatting for Real-Time Radiance Field Rendering》](https://arxiv.org/abs/2308.04079)——3DGS。
- [Poole 等（2022），《DreamFusion: Text-to-3D using 2D Diffusion》](https://arxiv.org/abs/2209.14988)——SDS。
- [Liu 等（2023），《Zero-1-to-3: Zero-shot One Image to 3D Object》](https://arxiv.org/abs/2303.11328)——Zero123。
- [Shi 等（2023），《MVDream》](https://arxiv.org/abs/2308.16512)——多视图扩散。
- [Hong 等（2023），《LRM: Large Reconstruction Model for Single Image to 3D》](https://arxiv.org/abs/2311.04400)——LRM。
- [Gao 等（2024），《CAT3D: Create Anything in 3D with Multi-View Diffusion Models》](https://arxiv.org/abs/2405.10314)——CAT3D。
- [Stability AI（2024），《Stable Video 3D (SV3D)》](https://stability.ai/research/sv3d)——SV3D。
