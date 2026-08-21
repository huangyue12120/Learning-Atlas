---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/04-computer-vision/22-3d-gaussian-splatting/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 0ede4133b98620602cbe40bc4ff92f43246dbe70e7575466b38207c470c0d55a
status: reviewed
---

# 从零实现 3D Gaussian Splatting

> 一个场景是一团数百万个 3D 高斯。每一个都有位置、朝向、尺度、不透明度和取决于观察方向的颜色。将它们光栅化，通过光栅化反向传播，就完成了。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 4 第 13 课（3D 视觉与 NeRF）、Phase 1 第 12 课（张量运算）、Phase 4 第 10 课（扩散基础，可选）  
**预计时间：** 约 90 分钟

## 学习目标

- 解释为什么 3D Gaussian Splatting 在 2026 年取代 NeRF，成为照片级 3D 重建的生产默认方案。
- 说出每高斯的六类参数（位置、旋转四元数、尺度、不透明度、球谐颜色、可选特征）及各自贡献的浮点数数量。
- 使用 `alpha` 合成从零实现 2D Gaussian splatting 光栅器，再说明 3D 情况如何投影到相同循环。
- 使用 `nerfstudio`、`gsplat` 或 `SuperSplat` 从 20–50 张照片重建场景，并导出到 `KHR_gaussian_splatting` glTF 扩展或 OpenUSD 26.03 的 `UsdVolParticleField3DGaussianSplat` 模式。

## 问题

NeRF 将场景存为一个 MLP 的权重。每个渲染像素都需要沿射线查询数百次 MLP。训练耗时数小时，渲染耗时数秒，权重也无法编辑——若想移动场景中的椅子，必须重新训练。

3D Gaussian Splatting（Kerbl、Kopanas、Leimkühler、Drettakis，SIGGRAPH 2023）取代了这一切。场景是一组显式 3D 高斯；GPU 光栅化以 100+ fps 渲染；训练只需数分钟。编辑是直接的：平移一部分高斯，就移动了椅子。到 2026 年，Khronos Group 已批准 Gaussian splat 的 glTF 扩展，OpenUSD 26.03 提供 Gaussian splat 模式，Zillow 和 Apartments.com 使用它渲染房地产，而大多数新 3D 重建研究论文都是核心 3DGS 思想的变体。

心理模型很简单，数学的活动部件却足够多，以至于多数介绍从光栅化开始，跳过投影和球谐。本课完整构建它：先做 2D 版本，再扩展到 3D。

## 概念

### 一个高斯携带什么

一个 3D 高斯是空间中的参数化斑团，具有以下属性：

```text
位置             mu         (3,)    世界坐标中的中心
旋转             q          (4,)    编码朝向的单位四元数
尺度             s          (3,)    每轴的对数尺度（渲染时指数化）
不透明度         alpha      (1,)    sigmoid 后的不透明度 [0, 1]
SH 系数          c_lm       (3 * (L+1)^2,)   依视角变化的颜色
```

旋转加尺度构成 3x3 协方差：`Sigma = R S S^T R^T`，即高斯在 3D 中的形状。球谐让颜色随观察方向变化——镜面高光、微妙光泽、依视角辉光——而无需存储每个视图的纹理。SH 阶数为 3 时，每个颜色通道有 16 个系数，仅颜色就要每高斯 48 个浮点数。

一个场景通常有 100–500 万个高斯。每个约存 60 个浮点数（3 + 4 + 3 + 1 + 48 + 其他），五百万高斯场景约为 240 MB——远小于带每点纹理的等价点云，也比以高分辨率重渲染的 NeRF MLP 权重小一个数量级。

### 光栅化，而非光线步进

```mermaid
flowchart LR
    SCENE["数百万个 3D 高斯<br/>（位置、旋转、尺度、<br/>不透明度、SH 颜色）"] --> PROJ["投影到 2D<br/>（相机外参 + 内参）"]
    PROJ --> TILES["分配到图块<br/>（16x16 屏幕空间）"]
    TILES --> SORT["逐图块<br/>按深度排序"]
    SORT --> ALPHA["从前到后<br/>Alpha 合成"]
    ALPHA --> PIX["像素颜色"]

    style SCENE fill:#dbeafe,stroke:#2563eb
    style ALPHA fill:#fef3c7,stroke:#d97706
    style PIX fill:#dcfce7,stroke:#16a34a
```

五步，全都对 GPU 友好。无需每像素 MLP 查询。一张 RTX 3080 Ti 可在 147 fps 渲染 600 万 splat。

### 投影步骤

世界位置为 `mu`、3D 协方差为 `Sigma` 的 3D 高斯，会投影为屏幕位置 `mu'`、2D 协方差 `Sigma'` 的二维高斯：

```text
mu' = project(mu)
Sigma' = J W Sigma W^T J^T          (2 x 2)

W = 视图变换（相机的旋转 + 平移）
J = mu' 处透视投影的 Jacobian
```

二维高斯的 footprint 是椭圆，其轴为 `Sigma'` 的特征向量。椭圆内每个像素都会收到该高斯的贡献，权重为 `exp(-0.5 * (p - mu')^T Sigma'^-1 (p - mu'))`。

### Alpha 合成规则

对于一个像素，覆盖它的高斯按从后到前排序（或等价地以前到后使用反向公式）。颜色采用自 1980 年代以来每个半透明光栅器相同的合成方程：

```text
C_pixel = sum_i alpha_i * T_i * c_i

T_i = prod_{j < i} (1 - alpha_j)       到第 i 个点的透射率
alpha_i = opacity_i * exp(-0.5 * d^T Sigma'^-1 d)   局部贡献
c_i = eval_SH(SH_i, view_direction)    依视角颜色
```

这与 NeRF 的体渲染**是同一个方程**，只是作用对象从射线上的稠密样本变为显式稀疏高斯集合。这一恒等关系解释了为何渲染质量匹敌 NeRF——两者都在积分同一辐射场方程。

### 为什么它可微

每一步——投影、图块分配、alpha 合成、SH 求值——相对于高斯参数都是可微的。给定真值图像，计算渲染像素损失，经光栅器反向传播，以梯度下降更新所有 `(mu, q, s, alpha, c_lm)`。约 30,000 次迭代后，高斯会找到正确位置、尺度和颜色。

### 增密与剪枝

固定的一组高斯无法覆盖复杂场景。训练包括两种自适应机制：

- 当高斯梯度幅度高而尺度小时，在当前位置**克隆**它——该区域重建需要更多细节。
- 当大尺度高斯的梯度很高时，将其**分裂**为两个较小高斯——一个大高斯过于平滑，无法拟合该区域。
- **剪枝**不透明度低于阈值的高斯——它们没有贡献。

每 N 次迭代执行一次增密。场景通常从约 10 万个初始高斯（由 SfM 点播种）增长到训练结束的 100–500 万。

### 用一段话理解球谐

依视角颜色是单位球面上的函数 `c(direction)`。球谐是球面的 Fourier 基。截断到阶数 `L`，每个通道就有 `(L+1)^2` 个基函数。为新视图求颜色，是学习到的 SH 系数与观察方向处基函数的点积。0 阶 = 一个系数 = 常量颜色；3 阶 = 16 个系数 = 足以捕捉 Lambertian 着色、镜面反射和轻微反射。3D Gaussian Splatting 论文默认使用 3 阶。

### 2026 年生产技术栈

```text
1. 拍摄           智能手机 / DJI 无人机 / 手持扫描仪
2. SfM / MVS      COLMAP 或 GLOMAP 推导相机位姿 + 稀疏点
3. 训练 3DGS      nerfstudio / gsplat / inria 官方实现 / PostShot（RTX 4090 上约 10–30 分钟）
4. 编辑           SuperSplat / SplatForge（清理漂浮物、分割）
5. 导出           .ply -> glTF KHR_gaussian_splatting 或 .usd（OpenUSD 26.03）
6. 查看           Cesium / Unreal / Babylon.js / Three.js / Vision Pro
```

### 4D 与生成式变体

- **4D Gaussian Splatting**——高斯是时间的函数，用于体视频（Superman 2026、A$AP Rocky 的《Helicopter》）。
- **生成式 splat**——文生 splat 模型（World Labs 的 Marble），可幻觉出整个场景。
- **3D Gaussian Unscented Transform**——NVIDIA NuRec 面向自动驾驶仿真的变体。

```figure
cv3-gaussian-splat
```

## 动手实现

### 步骤 1：一个 2D 高斯

先构建 2D 光栅器，3D 情况在投影后会归约到它。

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


def eval_2d_gaussian(means, covs, points):
    """
    means:  (G, 2)      centres
    covs:   (G, 2, 2)   covariance matrices
    points: (H, W, 2)   pixel coordinates
    returns: (G, H, W)  density at every pixel for every Gaussian
    """
    G = means.size(0)
    H, W, _ = points.shape
    flat = points.view(-1, 2)
    inv = torch.linalg.inv(covs)
    diff = flat[None, :, :] - means[:, None, :]
    d = torch.einsum("gpi,gij,gpj->gp", diff, inv, diff)
    density = torch.exp(-0.5 * d)
    return density.view(G, H, W)
```

`einsum` 为每个（高斯、像素）对计算二次型 `diff^T Sigma^-1 diff`。

### 步骤 2：2D splatting 光栅器

从前到后的 alpha 合成。2D 中深度没有意义，因此使用每高斯可学习标量作为顺序。

```python
def rasterise_2d(means, covs, colours, opacities, depths, image_size):
    """
    means:     (G, 2)
    covs:      (G, 2, 2)
    colours:   (G, 3)
    opacities: (G,)     in [0, 1]
    depths:    (G,)     per-Gaussian scalar used for ordering
    image_size: (H, W)
    returns:   (H, W, 3) rendered image
    """
    H, W = image_size
    yy, xx = torch.meshgrid(
        torch.arange(H, dtype=torch.float32, device=means.device),
        torch.arange(W, dtype=torch.float32, device=means.device),
        indexing="ij",
    )
    points = torch.stack([xx, yy], dim=-1)

    densities = eval_2d_gaussian(means, covs, points)
    alphas = opacities[:, None, None] * densities
    alphas = alphas.clamp(0.0, 0.99)

    order = torch.argsort(depths)
    alphas = alphas[order]
    colours_sorted = colours[order]

    T = torch.ones(H, W, device=means.device)
    out = torch.zeros(H, W, 3, device=means.device)
    for i in range(means.size(0)):
        a = alphas[i]
        out += (T * a)[..., None] * colours_sorted[i][None, None, :]
        T = T * (1.0 - a)
    return out
```

它不快——真实实现使用按图块的 CUDA 内核——但数学完全正确且完全可微。

### 步骤 3：可训练 2D splat 场景

```python
class Splats2D(nn.Module):
    def __init__(self, num_splats=128, image_size=64, seed=0):
        super().__init__()
        g = torch.Generator().manual_seed(seed)
        H, W = image_size, image_size
        self.means = nn.Parameter(torch.rand(num_splats, 2, generator=g) * torch.tensor([W, H]))
        self.log_scale = nn.Parameter(torch.ones(num_splats, 2) * math.log(2.0))
        self.rot = nn.Parameter(torch.zeros(num_splats))  # single angle in 2D
        self.colour_logits = nn.Parameter(torch.randn(num_splats, 3, generator=g) * 0.5)
        self.opacity_logit = nn.Parameter(torch.zeros(num_splats))
        self.depth = nn.Parameter(torch.rand(num_splats, generator=g))

    def covs(self):
        s = torch.exp(self.log_scale)
        c, si = torch.cos(self.rot), torch.sin(self.rot)
        R = torch.stack([
            torch.stack([c, -si], dim=-1),
            torch.stack([si, c], dim=-1),
        ], dim=-2)
        S = torch.diag_embed(s ** 2)
        return R @ S @ R.transpose(-1, -2)

    def forward(self, image_size):
        covs = self.covs()
        colours = torch.sigmoid(self.colour_logits)
        opacities = torch.sigmoid(self.opacity_logit)
        return rasterise_2d(self.means, covs, colours, opacities, self.depth, image_size)
```

`log_scale`、`opacity_logit` 和 `colour_logits` 都是无约束参数，渲染时通过正确激活映射。这是每种 3DGS 实现的标准模式。

### 步骤 4：让 2D 高斯拟合目标图像

```python
import math
import numpy as np

def make_target(size=64):
    yy, xx = np.meshgrid(np.arange(size), np.arange(size), indexing="ij")
    img = np.zeros((size, size, 3), dtype=np.float32)
    # Red circle
    mask = (xx - 20) ** 2 + (yy - 20) ** 2 < 10 ** 2
    img[mask] = [1.0, 0.2, 0.2]
    # Blue square
    mask = (np.abs(xx - 45) < 8) & (np.abs(yy - 40) < 8)
    img[mask] = [0.2, 0.3, 1.0]
    return torch.from_numpy(img)


target = make_target(64)
model = Splats2D(num_splats=64, image_size=64)
opt = torch.optim.Adam(model.parameters(), lr=0.05)

for step in range(200):
    pred = model((64, 64))
    loss = F.mse_loss(pred, target)
    opt.zero_grad(); loss.backward(); opt.step()
    if step % 40 == 0:
        print(f"step {step:3d}  mse {loss.item():.4f}")
```

200 步后，64 个高斯会落入两个形状。整个方法就是对显式几何图元进行梯度下降。

### 步骤 5：从 2D 到 3D

3D 扩展保持同一循环，增加的内容：

1. 每高斯旋转从单角度变为四元数。
2. 协方差为 `R S S^T R^T`，其中 `R` 由四元数构建，`S = diag(exp(log_scale))`。
3. 投影 `(mu, Sigma) -> (mu', Sigma')` 使用相机外参和 `mu` 处透视投影的 Jacobian。
4. 颜色变为球谐展开，在观察方向上求值。
5. 深度排序使用真实相机空间 z，不再是可学习标量。

每个生产实现（`gsplat`、`inria/gaussian-splatting`、`nerfstudio`）都在 GPU 上使用按图块 CUDA 内核完成这些步骤。

### 步骤 6：球谐求值

3 阶的 SH 基每个通道有 16 项，求值如下：

```python
def eval_sh_degree_3(sh_coeffs, dirs):
    """
    sh_coeffs: (..., 16, 3)   last dim is RGB channels
    dirs:      (..., 3)       unit vectors
    returns:   (..., 3)
    """
    C0 = 0.282094791773878
    C1 = 0.488602511902920
    C2 = [1.092548430592079, 1.092548430592079,
          0.315391565252520, 1.092548430592079,
          0.546274215296039]
    x, y, z = dirs[..., 0], dirs[..., 1], dirs[..., 2]
    x2, y2, z2 = x * x, y * y, z * z
    xy, yz, xz = x * y, y * z, x * z

    result = C0 * sh_coeffs[..., 0, :]
    result = result - C1 * y[..., None] * sh_coeffs[..., 1, :]
    result = result + C1 * z[..., None] * sh_coeffs[..., 2, :]
    result = result - C1 * x[..., None] * sh_coeffs[..., 3, :]

    result = result + C2[0] * xy[..., None] * sh_coeffs[..., 4, :]
    result = result + C2[1] * yz[..., None] * sh_coeffs[..., 5, :]
    result = result + C2[2] * (2.0 * z2 - x2 - y2)[..., None] * sh_coeffs[..., 6, :]
    result = result + C2[3] * xz[..., None] * sh_coeffs[..., 7, :]
    result = result + C2[4] * (x2 - y2)[..., None] * sh_coeffs[..., 8, :]

    # degree 3 terms omitted here for brevity; full 16-coefficient version in the code file
    return result
```

学习到的 `sh_coeffs` 存储该高斯“每个方向的颜色”。渲染时对当前观察方向求值，即得到 RGB 三向量。

## 使用现成工具

实际 3DGS 工作中，使用 `gsplat`（Meta）或 `nerfstudio`：

```bash
pip install nerfstudio gsplat
ns-download-data example
ns-train splatfacto --data path/to/data
```

`splatfacto` 是 nerfstudio 的 3DGS 训练器。典型场景在 RTX 4090 上需要 10–30 分钟。

2026 年重要导出选项：

- `.ply`——原始高斯云（可移植，文件最大）。
- `.splat`——PlayCanvas / SuperSplat 量化格式。
- glTF `KHR_gaussian_splatting`——Khronos 标准，可跨查看器移植（2026 年 2 月 RC）。
- OpenUSD `UsdVolParticleField3DGaussianSplat`——USD 原生，适用于 NVIDIA Omniverse 和 Vision Pro 流水线。

对于 4D / 动态场景，`4DGS` 和 `Deformable-3DGS` 用随时间变化的均值和不透明度扩展同一机制。

## 交付产物

本课产出：

- `outputs/prompt-3dgs-capture-planner.md`——为指定场景类型规划拍摄会话（照片数量、相机路径、光照）的提示词。
- `outputs/skill-3dgs-export-router.md`——根据下游查看器或引擎，选择正确导出格式（`.ply` / `.splat` / glTF / USD）的技能。

## 练习

1. **（简单）** 在另一张合成图像上运行上方 2D splat 训练器。令 `num_splats` 取 `[16, 64, 256]`，为每种绘制 MSE 与步数的关系，找出收益递减点。
2. **（中等）** 扩展 2D 光栅器，使每高斯 RGB 颜色通过二阶谐波依赖标量“视角”。在一对目标图上训练并验证模型重建二者。
3. **（困难）** 克隆 `nerfstudio`，在任一 20 张照片拍摄的场景（桌面、植物、人脸、房间）上训练 `splatfacto`。导出 glTF `KHR_gaussian_splatting`，并在查看器（Three.js `GaussianSplats3D`、SuperSplat、Babylon.js V9）中打开。报告训练时间、高斯数量和渲染 fps。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| 3DGS | “Gaussian splat” | 由数百万 3D 高斯组成的显式场景表示；每高斯有位置、旋转、尺度、不透明度、SH 颜色 |
| 协方差（Covariance） | “高斯形状” | `Sigma = R S S^T R^T`；一个高斯的朝向与各向异性尺度 |
| Alpha 合成 | “从后到前混合” | 与 NeRF 体渲染相同方程，现作用于显式稀疏集合 |
| 增密（Densification） | “克隆和分裂” | 在重建欠拟合位置自适应加入新高斯 |
| 剪枝（Pruning） | “删除低不透明度” | 移除训练中坍塌至接近零不透明度的高斯 |
| 球谐（Spherical harmonics） | “依视角颜色” | 球面上的 Fourier 基；将颜色存为观察方向函数 |
| Splatfacto | “nerfstudio 的 3DGS” | 2026 年训练 3DGS 的最简单途径 |
| `KHR_gaussian_splatting` | “glTF 标准” | 使 3DGS 可跨查看器和引擎移植的 Khronos 2026 扩展 |

## 延伸阅读

- [3D Gaussian Splatting for Real-Time Radiance Field Rendering（Kerbl 等，SIGGRAPH 2023）](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/)——原始论文。
- [gsplat（Meta/nerfstudio）](https://github.com/nerfstudio-project/gsplat)——生产级 CUDA 光栅器。
- [nerfstudio Splatfacto](https://docs.nerf.studio/nerfology/methods/splat.html)——参考训练配方。
- [Khronos KHR_gaussian_splatting 扩展](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_gaussian_splatting/README.md)——2026 年可移植格式。
- [OpenUSD 26.03 发布说明](https://openusd.org/release/)——`UsdVolParticleField3DGaussianSplat` 模式。
- [THE FUTURE 3D：2026 Gaussian Splatting 现状](https://www.thefuture3d.com/blog-0/2026/4/4/state-of-gaussian-splatting-2026)——行业概览。
