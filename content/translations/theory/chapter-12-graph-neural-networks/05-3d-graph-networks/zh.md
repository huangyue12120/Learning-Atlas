---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 12 - graph neural networks/05. 3d graph networks.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 845efba69aad2e1a123900f0b9d9c39acfa37d18852ac3cf4cdb476c0a01b186
status: reviewed
---
# 三维图网络

*三维图网络把 GNN 扩展到含有空间几何的数据上，并正确处理旋转和平移。本篇介绍几何图、SE(3)/E(n) 等变性、SchNet、DimeNet、EGNN、张量场网络，以及这些方法在分子性质预测、蛋白质结构、材料科学和药物发现中的应用。*

- 第 3、4 篇中的 GNN 处理抽象图：节点带有特征，边表示连接关系，但图中没有三维空间的概念。社交网络就是一例。许多重要的 GNN 应用则涉及**物理三维空间**中的数据，例如分子、蛋白质、晶体和点云。在这些任务中，节点的位置包含关键信息，普通抽象图不会保留这些信息。

- 三维数据具有**几何对称性**（第 1 篇）：旋转或平移一个分子，不应改变其物理性质。三维 GNN 必须遵守这些对称性；如果旋转分子后能量预测发生变化，就不符合物理规律。

## 几何图

- **几何图**是嵌入三维空间中的图。除特征向量 $\mathbf{h}_i$ 外，每个节点 $i$ 还带有位置 $\mathbf{r}_i \in \mathbb{R}^3$。边可以按空间邻近关系建立，例如连接距离小于截断半径 $r_{\text{cut}}$ 的节点，而不一定只按显式化学键建立。

- 在分子图中，节点表示原子，带有元素类型、电荷等特征；边表示化学键。三维位置 $\mathbf{r}_i$ 是原子坐标，可以通过量子力学计算或实验测量得到，例如 X 射线晶体学和冷冻电镜（cryo-EM）。

- 在点云中（例如来自激光雷达或三维扫描仪的数据，见第 8、11 章），每个点都是一个带位置的节点，也可附带颜色、强度等特征。连接邻近点后，可以构造 $k$ 近邻图（kNN 图）或半径图。

- 消息传递中常用的几何量包括：

    - **原子间距离**：$d_{ij} = \|\mathbf{r}_i - \mathbf{r}_j\|$。距离对旋转和平移不变。只知道键长通常不足以确定分子构型；若知道所有点对距离，则构型至多相差刚体变换或镜像反射。
    - **键角**：节点 $i$ 处，向量 $\mathbf{r}_j - \mathbf{r}_i$ 与 $\mathbf{r}_k - \mathbf{r}_i$ 的夹角 $\theta_{ijk}$。键角提供了点对距离以外的局部几何信息。
    - **二面角（扭转角）**：由平面 $(i,j,k)$ 与 $(j,k,l)$ 构成的夹角 $\phi_{ijkl}$，描述三维结构如何扭转，对蛋白质主链几何尤其重要。
    - **相对位置向量**：$\mathbf{r}_{ij} = \mathbf{r}_j - \mathbf{r}_i$。平移所有节点时它保持不变；旋转坐标系时它会随之旋转。因此，使用它需要等变架构，而不能只依赖不变架构。

- 仅使用距离的模型也无法区分镜像反射后的手性构型；这是距离特征本身的信息限制，并非模型计算误差。

## SE(3) 与 E(n) 等变性

- 三维物理空间的欧几里得群 $E(3)$ 包含旋转、反射和平移。其子群**特殊欧几里得群** $SE(3)$ 包含旋转和平移，但不包含反射。

- 三维 GNN 对不同类型的输出应满足不同性质：
    - **标量输出**（如能量、结合亲和力）对平移不变：所有原子一起平移相同向量，预测值不变。
    - 标量输出也应对旋转不变：旋转分子不应改变其能量。
    - **向量或张量输出**（如力、偶极矩）应当等变：旋转分子时，预测出的向量或张量也按对应规则旋转。

![SE(3) 等变性：旋转分子后，标量预测（能量）不变，向量预测（力）则相应旋转](../images/se3_equivariance.svg)

- 对标量预测 $f$ 和旋转 $R \in SO(3)$，旋转不变性写作：

$$f(R\mathbf{r}_1, R\mathbf{r}_2, \ldots) = f(\mathbf{r}_1, \mathbf{r}_2, \ldots) \quad \text{(invariance)}$$

- 对向量预测 $\mathbf{F}$，旋转等变性写作：

$$\mathbf{F}(R\mathbf{r}_1, R\mathbf{r}_2, \ldots) = R \cdot \mathbf{F}(\mathbf{r}_1, \mathbf{r}_2, \ldots) \quad \text{(equivariance)}$$

- 这正是第 1 篇介绍的不变性与等变性框架在三维旋转和平移群上的应用。

- 常见设计有两种：
    1. **不变架构**：消息传递只使用距离、角度等不变几何量，内部表示为标量。结构简单、计算高效，但无法在保持对称性的同时自然地产生向量输出。
    2. **等变架构**：在网络各层中保留向量或更高阶张量表示，并保证每层都等变。它能自然预测向量和张量输出，但结构更复杂。

## SchNet：基于距离的消息传递

- **SchNet**（Schütt 等，2017）是经典的不变三维 GNN。它的关键做法是**连续滤波卷积**：不像传统分子 GNN 那样只按键类型区分边，而是直接根据原子间距离生成消息滤波器。

- 首先用**径向基函数**（RBF）把距离 $d_{ij}$ 展开为特征向量：

$$\text{RBF}(d_{ij}) = \left[\exp\left(-\gamma_1 (d_{ij} - \mu_1)^2\right), \ldots, \exp\left(-\gamma_K (d_{ij} - \mu_K)^2\right)\right]$$

- 每个基函数都是以 $\mu_k$ 为中心、由 $\gamma_k$ 控制宽度的高斯函数。这类似于针对距离的可学习位置编码：把连续距离映射到高维特征空间，让网络学习距离相关的相互作用。中心 $\mu_k$ 通常均匀分布在 0 到截断半径之间。

- SchNet 从节点 $j$ 发往节点 $i$ 的消息为：

$$\mathbf{m}_{j \to i} = \mathbf{h}_j \odot W_{\text{filter}}(\text{RBF}(d_{ij}))$$

- 其中，$W_{\text{filter}}$ 是把 RBF 特征映射为滤波器向量的 MLP，$\odot$ 表示逐元素乘法（Hadamard 积，第 2 章）。滤波器取决于距离，因此不同距离的原子会以不同方式相互作用。逐元素乘法也起到门控作用：距离相关的滤波器控制各特征维度传递多少信息。

- SchNet 只使用距离这类不变量，因此模型对旋转和平移不变。距离特征也不包含手性信息，所以它无法单靠这些特征区分镜像分子。

## DimeNet 与 SphereNet：角度和二面角

- 只知道相邻原子间距离，通常无法唯一确定三维构型；相同键长的结构仍可能有不同键角。**DimeNet**（Gasteiger 等，2020）把键角纳入消息传递，以补充局部方向信息。

- DimeNet 使用**方向消息传递**：消息沿有向边传播，边 $(j \to i)$ 上的消息会受边 $(k \to j)$ 与 $(j \to i)$ 之间夹角影响：

$$\mathbf{m}_{kj \to ji} = f\left(\mathbf{m}_{kj}, d_{ji}, \theta_{kji}\right)$$

- DimeNet 使用球贝塞尔函数和球谐函数展开角度信息。它们是球面上的自然基，作用类似于 RBF 对距离的展开；这样模型便能使用方向相关信息，同时保持旋转不变性。

- **SphereNet**（Liu 等，2022）进一步加入**二面角** $\phi_{lkji}$，捕捉完整的三维扭转结构：
    - 距离描述点对之间的远近；
    - 角度描述局部几何，例如弯曲或共线；
    - 二面角描述三维扭转，对蛋白质主链和药物结合很重要。

- 几何信息越丰富，计算量通常越大：距离计算为 $O(|E|)$，角度计算为 $O(|E| \cdot k)$，二面角计算为 $O(|E| \cdot k^2)$，其中 $k$ 是平均度数。

## E(n) 等变 GNN（EGNN）

- **EGNN**（Satorras 等，2021）直接采用等变设计：每层既更新节点特征，也更新节点位置，并在整个网络中保持等变性。

- 节点 $i$ 的 EGNN 更新为：

$$\mathbf{m}_{ij} = \phi_e\left(\mathbf{h}_i, \mathbf{h}_j, d_{ij}^2, a_{ij}\right)$$

$$\mathbf{r}_i' = \mathbf{r}_i + C \sum_{j \neq i} (\mathbf{r}_i - \mathbf{r}_j) \cdot \phi_r(\mathbf{m}_{ij})$$

$$\mathbf{h}_i' = \phi_h\left(\mathbf{h}_i, \sum_j \mathbf{m}_{ij}\right)$$

- 位置更新把相对位置向量 $(\mathbf{r}_i - \mathbf{r}_j)$ 按标量权重加权求和。权重由消息函数 $\phi_r$ 计算，且只依赖不变量（节点特征和距离）。因此输入位置若都经旋转 $R$ 变换，输出位置也会随之旋转 $R$；该构造可证明具有等变性。

- EGNN 不必显式使用球谐函数或不可约表示。相对位置向量携带方向信息，依赖不变量的消息函数则决定如何利用这些信息。

- EGNN 的表示主要是标量和向量（一阶张量）。若要表示四极矩、应力张量等更高阶结构，需要进一步扩展模型。

## 张量场网络与高阶表示

- **张量场网络**（Thomas 等，2018）及其后续架构（如 **SE(3)-Transformer**、**MACE**、**Equiformer**）使用旋转群的**不可约表示**构建等变层。

- 在表示论中（与第 2 章的线性代数相关），三维旋转可分解为由整数阶数 $\ell$ 标记的不可约表示：
    - $\ell = 0$：标量，有 1 个分量，在旋转下不变，例如能量和电荷；
    - $\ell = 1$：向量，有 3 个分量，像位置向量一样旋转，例如力和偶极矩；
    - $\ell = 2$：二阶对称无迹张量，有 5 个分量，例如四极矩和应力张量；
    - 更高的 $\ell$：表示更复杂的角向结构。

- 这类对象称为**球张量**。在旋转 $R$ 下，它们通过 Wigner-D 矩阵 $D^\ell(R)$ 变换：标量保持不变，向量按 $R$ 旋转，更高阶张量则按相应矩阵变换。

- 使用球张量的**等变消息传递**会通过 Clebsch–Gordan 张量积组合不同阶的特征：

$$(\mathbf{f}^{\ell_1} \otimes \mathbf{f}^{\ell_2})^{\ell_{\text{out}}} = \sum_{m_1, m_2} C^{\ell_{\text{out}}, m_{\text{out}}}_{\ell_1, m_1, \ell_2, m_2} \cdot f^{\ell_1}_{m_1} \cdot f^{\ell_2}_{m_2}$$

- Clebsch–Gordan 系数 $C$ 是固定的数学常数，可保证张量积保持等变性。这是 SO(3) 等变网络中组合特征的一种基本运算。

- **MACE**（Batatia 等，2022）通过组合多个邻居特征构造高阶消息，以较少的消息传递层实现高精度。它构造不同体阶的相互作用：二体项来自距离，三体项来自角度，更高体项来自张量积，从而高效表示复杂的原子相互作用。

- **Equiformer**（Liao 和 Smidt，2023）把等变球张量特征与 Transformer 注意力结合，构成 SE(3) 等变图 Transformer。注意力分数由不变量计算，值的聚合则作用于等变张量特征。

## 应用

- **分子性质预测**：根据分子的三维结构预测能量、力、偶极矩、HOMO–LUMO 能隙、毒性和溶解度等。这是三维 GNN 的成熟应用方向。QM9、OC20 等数据集上已有模型取得较高精度；具体精度取决于数据集、目标性质和模型，不能一概称为“化学精度”。

- **分子动力学加速**：用密度泛函理论（DFT）计算原子间作用力的成本很高，原文以电子数 $n$ 给出 $O(n^3)$ 的量级估算。训练三维 GNN 预测力，可以在分子动力学模拟中减少对 DFT 的调用；原文报告的加速范围为 $10^3$–$10^6$，实际速度和精度取决于系统、训练数据与模拟条件。这样可以模拟更大的系统和更长的时间尺度。

- **蛋白质结构**：蛋白质是由氨基酸链折叠成的复杂三维结构。蛋白质主链可表示为几何图，节点是残基，边连接空间上接近的残基。三维 GNN 可用于预测蛋白质功能、识别结合位点和设计蛋白质；逆折叠是给定目标结构预测氨基酸序列。AlphaFold 结合几何与图结构推理，根据序列预测蛋白质结构。

- **材料科学与催化**：晶体材料具有周期性三维结构。GNN 可对重复晶胞建模，并预测带隙、形成能和机械强度等性质。Open Catalyst Project 的 OC20/OC22 基准用于评估 GNN 对催化表面吸附能的预测，以加快新型可再生能源催化剂的筛选。

- **药物发现**：三维 GNN 可预测药物分子与目标蛋白的结合方式。结合亲和力取决于药物与蛋白结合口袋之间的三维形状互补性和化学相互作用。DiffDock 使用等变 GNN 和扩散模型（第 8 章）预测结合姿态，即药物在蛋白结合口袋中的三维位置与方向。

## 图生成

- 前述架构主要**分析**已有图。**图生成**则构造新图，例如设计具有特定性质的分子、生成供测试使用的合成社交网络，或提出新的蛋白质结构。这是图级预测的生成式对应任务。

- 图是离散的、大小可变且具有组合结构。生成图时，模型要决定节点数量、节点特征以及哪些节点对之间有边。节点数增加时，可能图的数量超指数增长。

- **自回归生成**逐个节点或边地构造图。**GraphRNN**（You 等，2018）用 RNN 维护状态，每一步生成一个新节点，并决定它连接到哪些已有节点。生成顺序给原本无序的图引入了人为顺序；按广度优先搜索（BFS）排序可让最近生成的节点继续参与后续生成。

- **基于 VAE 的生成**先用 GNN 编码器把图映射到连续潜在空间，再从采样的潜在向量解码新图。**GraphVAE** 一次生成概率邻接矩阵 $\hat{A} \in [0, 1]^{n \times n}$，计算和输出规模为 $O(n^2)$；稠密输出还需阈值化。潜在空间可用于平滑插值，但插值结果是否满足化学约束仍需验证。

- **基于扩散的生成**把扩散过程（第 8 章）用于图：正向过程逐渐扰动节点特征和边结构，反向过程学习去噪，从噪声中生成图。**DiGress**（Vignac 等，2023）对节点类型和边类型进行离散扩散，以适应图数据的类别变量。

- 分子生成的关键约束是**化学有效性**：生成的分子必须符合原子价态规则，例如常见中性结构中的碳通常形成 4 个键、氧通常形成 2 个键。**连接树 VAE**（JT-VAE）将分子分解为环、链和官能团等有效子结构，再将它们组装起来；这种构造方式可帮助保证生成结果有效。

- **目标导向生成**针对特定性质优化，例如提高分子对目标蛋白的结合亲和力，同时降低毒性、改善溶解度。它可以把图生成与性质预测器（如三维 GNN）放进“生成 → 评估 → 改进”的循环中，并用强化学习（第 6 章）或贝叶斯优化搜索化学空间。

- **DiffDock**（Corso 等，2023）使用 SE(3) **等变**扩散，预测药物分子如何对接到蛋白结合口袋。模型从随机位置和朝向开始去噪，生成药物相对蛋白的三维结合姿态；它结合了本篇介绍的三维等变网络与第 8 章的扩散框架。

## 编程任务（使用 CoLab 或 笔记本）

1. 使用原子间距离构建一个简单的不变3D消息传递层。将其应用于小分子（水：H-O-H），并验证输出对旋转是不变的。
```python
import jax
import jax.numpy as jnp

# Water molecule: O at origin, two H atoms
positions = jnp.array([[0.0, 0.0, 0.0],     # O
                        [0.96, 0.0, 0.0],    # H1
                        [-0.24, 0.93, 0.0]])  # H2

# Node features: [atomic number]
features = jnp.array([[8.0], [1.0], [1.0]])

# Compute pairwise distances (invariant)
def pairwise_distances(pos):
    diff = pos[:, None, :] - pos[None, :, :]
    return jnp.sqrt(jnp.sum(diff**2, axis=-1) + 1e-8)

# Simple distance-based message passing
def invariant_message_pass(features, positions):
    dists = pairwise_distances(positions)
    # RBF expansion with 4 centres
    centres = jnp.array([0.5, 1.0, 1.5, 2.0])
    rbf = jnp.exp(-5.0 * (dists[:, :, None] - centres[None, None, :]) ** 2)

    # Message: features weighted by distance-dependent filter
    messages = jnp.einsum("ij,jd->id", rbf.sum(axis=-1), features)
    return messages

output1 = invariant_message_pass(features, positions)

# Rotate the molecule by 90 degrees around z-axis
R = jnp.array([[0, -1, 0], [1, 0, 0], [0, 0, 1]], dtype=float)
rotated_positions = (R @ positions.T).T

output2 = invariant_message_pass(features, rotated_positions)

print(f"Original output:\n{output1}")
print(f"\nRotated output:\n{output2}")
print(f"\nInvariant: {jnp.allclose(output1, output2, atol=1e-5)}")
```

2. 计算三个原子之间的键角，并验证它对旋转是不变的。
```python
import jax.numpy as jnp

def bond_angle(r_i, r_j, r_k):
    """Angle at node j between edges j->i and j->k."""
    v1 = r_i - r_j
    v2 = r_k - r_j
    cos_angle = jnp.dot(v1, v2) / (jnp.linalg.norm(v1) * jnp.linalg.norm(v2))
    return jnp.arccos(jnp.clip(cos_angle, -1, 1))

# Three atoms
r1 = jnp.array([1.0, 0.0, 0.0])
r2 = jnp.array([0.0, 0.0, 0.0])
r3 = jnp.array([0.0, 1.0, 0.0])

angle_original = bond_angle(r1, r2, r3)
print(f"Original angle: {jnp.degrees(angle_original):.1f}°")

# Apply random rotation
R = jnp.array([[0.36, 0.48, -0.80],
               [-0.80, 0.60, 0.00],
               [0.48, 0.64, 0.60]])
r1_rot, r2_rot, r3_rot = R @ r1, R @ r2, R @ r3

angle_rotated = bond_angle(r1_rot, r2_rot, r3_rot)
print(f"Rotated angle:  {jnp.degrees(angle_rotated):.1f}°")
print(f"Invariant: {jnp.allclose(angle_original, angle_rotated, atol=1e-4)}")
```

3. 展示等变的位置更新（EGNN 风格）。使用按距离加权的相对位置向量更新节点位置，并验证旋转前后的输出满足等变关系。
```python
import jax
import jax.numpy as jnp

def egnn_position_update(positions, features):
    """Simple EGNN-style equivariant position update."""
    n = positions.shape[0]
    new_positions = jnp.zeros_like(positions)

    for i in range(n):
        shift = jnp.zeros(3)
        for j in range(n):
            if i != j:
                r_ij = positions[i] - positions[j]
                d_ij = jnp.linalg.norm(r_ij)
                # Weight based on distance (simple: inverse distance)
                weight = 1.0 / (d_ij + 1.0)
                # Scale by feature similarity
                feat_sim = jnp.dot(features[i], features[j])
                shift = shift + weight * feat_sim * r_ij
        new_positions = new_positions.at[i].set(positions[i] + 0.1 * shift)

    return new_positions

# 3 atoms
pos = jnp.array([[0.0, 0.0, 0.0], [1.0, 0.0, 0.0], [0.0, 1.0, 0.0]])
feat = jnp.array([[1.0, 0.5], [0.5, 1.0], [0.8, 0.3]])

# Update positions
pos_new = egnn_position_update(pos, feat)

# Now rotate input, update, and check if output is rotated consistently
R = jnp.array([[0.0, -1.0, 0.0], [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]])
pos_rot = (R @ pos.T).T
pos_new_from_rot = egnn_position_update(pos_rot, feat)

# Should be the same as rotating the original output
pos_new_then_rot = (R @ pos_new.T).T

print(f"Update then rotate:\n{jnp.round(pos_new_then_rot, 4)}")
print(f"\nRotate then update:\n{jnp.round(pos_new_from_rot, 4)}")
print(f"\nEquivariant: {jnp.allclose(pos_new_then_rot, pos_new_from_rot, atol=1e-4)}")
```

**说明：**任务 2、3 的代码各检查一个固定旋转，只能作为示例验证；一般性的旋转不变性或等变性来自公式对任意旋转的性质。
