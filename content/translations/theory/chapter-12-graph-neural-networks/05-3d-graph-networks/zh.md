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

*三维图网络将GNN扩展到具有空间几何的数据上，其中旋转和平移必须正确处理。本文件涵盖了几何图、SE(3)/E(n)不变性、SchNet、DimeNet、EGNN、张量场网络以及在分子性质预测、蛋白质结构、材料科学和药物发现中的应用 --这些架构从三维物理世界中学习的体系结构。*

- 文件3和4中的GNN操作抽象图：节点有特征，边编码连接，但没有空间概念。一个社交网络图没有几何。然而，许多GNN在数据存在于**物理三维空间**中的最 impactful应用中发挥作用：分子、蛋白质、晶体、点云等。对于这些，节点的空间位置携带了关键信息，而抽象的GNN忽略了这一点。

- 问题在于三维数据具有**几何对称性**（文件1）：旋转一个分子不会改变其属性，平移也不会改变它。三维GNN必须尊重这些对称性。一个能量预测在旋转分子时发生变化是物理错误的。

## 几何图

- **几何图**是在三维空间中嵌入的图。每个节点$i$有一个位置$\mathbf{r}_i \in \mathbb{R}^3$，除了特征向量$\mathbf{h}_i$之外。边可以由空间接近（连接距离小于$r_{\text{cut}}$）定义，而不是通过明确的键。

- 对于分子，几何图的节点是原子（带有元素类型、电荷等特征），边是化学键。三维坐标 $\mathbf{r}_i$ 是原子的位置，由量子力学或实验测量确定（X射线晶体学、cryo-EM）。

- 对于点云（来自激光雷达或3D扫描仪，第8章和第11章），每个点都是一个节点，带有位置和可选特征（颜色、强度）。边连接相邻的点，形成**k最近邻（kNN）图**或半径图。

- 消息传递的关键几何量是：

    - **原子间距离**：$d_{ij} = \|\mathbf{r}_i - \mathbf{r}_j\|$。距离对旋转和平移不变。具有相同原子间距离的两个分子在任何方向上都具有相同的形状。

    - **键角**：节点 $i$ 处两个向量 $\mathbf{r}_j - \mathbf{r}_i$ 和 $\mathbf{r}_k - \mathbf{r}_i$ 之间的角度 $\theta_{ijk}$。键角捕捉了局部几何的额外信息，超越了距离的简单比较。

    - **二面角（扭动）角度**：的角度 $\phi_{ijkl}$ 在由两个平面定义的区域 $(i, j, k)$ 和 $(j, k, l)$面角捕捉蛋白质主链的扭曲方式，对于理解蛋白质结构至关重要。

    - **相对位置向量**：$\mathbf{r}_{ij} = \mathbf{r}_j - \mathbf{r}_i$。这些是平移不变但不是旋转不变的。使用它们需要等变（而不是不变）架构。

## SE(3) 和 E(n) 等变性

- 三维物理数据的对称群是 **欧几里得群** $E(3)$，包括所有旋转、反射和平移。子群 **$SE(3)$**（特殊欧几里得）包括旋转和平移但排除反射。

- 三维 GNN 应该是：
    - 对于标量输出（能量、结合亲和力）：平移相同向量不会改变预测。
    - 对于标量输出（分子的能量）：旋转分子不会改变其能量。
    - 对于矢量/张量输出（力、偶极矩）：旋转分子时，预测的力向量应该按相同的旋转旋转。

![SE(3)等变性：旋转分子不会改变标量预测（能量），但会相应地旋转向量预测（力）](../images/se3_equivariance.svg)


- 形式上，对于标量预测 $f$ 和旋转 $R \in SO(3)$:

$$f(R\mathbf{r}_1, R\mathbf{r}_2, \ldots) = f(\mathbf{r}_1, \mathbf{r}_2, \ldots) \quad \text{(invariance)}$$
- 对于矢量预测 $\mathbf{F}$:

$$\mathbf{F}(R\mathbf{r}_1, R\mathbf{r}_2, \ldots) = R \cdot \mathbf{F}(\mathbf{r}_1, \mathbf{r}_2, \ldots) \quad \text{(equivariance)}$$
- 这些约束直接复制了文件 1 中的不变性/等变性框架，现在专门应用于三维旋转和平移群。

- 有两种设计方法：
    1. **不变架构**：仅使用距离（如分子 GNN 中的键类型）作为消息传递的输入几何特征。内部表示是标量（不变）。简单且高效，但不能自然预测矢量输出而不破坏对称性。
    2. **等变架构**：在整个网络中保持矢量（和更高阶张量）表示，并确保每一层都是等变的。更表达丰富，可以自然预测矢量和张量，但更复杂。

## SchNet: 基于距离的消息传递

- **SchNet**（Schütt 等，2017 年）是 3D GNN 的基础不变架构。其关键创新是 **连续滤波卷积**：而不是使用固定类型的边集（如分子 GNN 中的键类型），SchNet 直接从原子间的距离生成消息过滤器。

- 距离 $d_{ij}$ 首先通过 **径向基函数 (RBFs)** 扩展为特征向量：

$$\text{RBF}(d_{ij}) = \left[\exp\left(-\gamma_1 (d_{ij} - \mu_1)^2\right), \ldots, \exp\left(-\gamma_K (d_{ij} - \mu_K)^2\right)\right]$$
- 每个基函数是一个以 $\mu_k$ 为中心的高斯，宽度为 $\gamma_k$。这类似于距离的可学习位置编码：连续的距离被映射到一个高维特征空间中，网络可以学习距离依赖的相互作用。中心 $\mu_k$ 通常均匀分布在 0 到截断半径之间。

- SchNet 从节点 $j$ 到节点 $i$ 的消息为：

$$\mathbf{m}_{j \to i} = \mathbf{h}_j \odot W_{\text{filter}}(\text{RBF}(d_{ij}))$$
- $W_{\text{filter}}$ 是一个 MLP，将 RBF 扩展映射到滤波器向量。$\odot$ 是逐元素乘法（Hadamard 产品，第 2 章）。滤波器取决于距离，因此靠近的原子相互作用不同，而远处的原子则不同。逐元素乘法类似于门控机制（第 6 章）：距离依赖的滤波器控制每个特征维度通过的程度。

- 因为SchNet仅使用距离（不变），整个模型自动对旋转和平移具有不变性。除了这个设计选择外，不需要额外处理对称性。

## DimeNet 和 SphereNet：角度和二面角

- 距离本身无法完全指定三维结构。两个不同的分子构型可以具有相同的两两距离，但不同键角度（这就是“距离几何歧义”的问题）。DimeNet（Gasteiger et al., 2020）通过将**键角度**纳入消息传递来解决这个问题。

- DimeNet 使用 **方向消息传递**：消息沿着有向边流动，而 $(j \to i)$ 边上的消息受到 $(k \to j)$ 和 $(j \to i)$ 边之间角度的影响。

$$\mathbf{m}_{kj \to ji} = f\left(\mathbf{m}_{kj}, d_{ji}, \theta_{kji}\right)$$
- 该角度 $\theta_{kji}$ 使用球谐函数和球面波函数（用于球面上方向信息的自然基，类似于距离的RBF）扩展。这使得模型能够访问方向信息，并保持不变性。

- **SphereNet**（Liu et al., 2022）进一步引入了**二面角**$\phi_{lkji}$，捕捉完整的三维扭曲结构。层次结构如下：
    - 距离 → 捕捉彼此的接近程度
    - 角度 → 捕捉局部几何（弯曲 vs. 直线）
    - 二面角 → 捕捉三维扭转（对于蛋白质骨架和药物结合至关重要）

- 每一层都增加了几何分辨率，但代价是计算复杂度的增加（距离为 $O(|E|)$，角度为 $O(|E| \cdot k)$，二面角为 $O(|E| \cdot k^2)$，其中 $k$ 是平均度数）。

## 以E(n)为对称的GNN（EGNN）

- **EGNN**（萨托拉斯等人，2021年）采用不变性方法：它不仅更新节点特征，还更新节点位置，在每一层都保持不变性。

- 节点 $i$ 的 EGNN 更新：

$$\mathbf{m}_{ij} = \phi_e\left(\mathbf{h}_i, \mathbf{h}_j, d_{ij}^2, a_{ij}\right)$$
$$\mathbf{r}_i' = \mathbf{r}_i + C \sum_{j \neq i} (\mathbf{r}_i - \mathbf{r}_j) \cdot \phi_r(\mathbf{m}_{ij})$$
$$\mathbf{h}_i' = \phi_h\left(\mathbf{h}_i, \sum_j \mathbf{m}_{ij}\right)$$
- 关键是位置更新：节点位置通过相对位置向量 $(\mathbf{r}_i - \mathbf{r}_j)$ 的加权和进行调整。权重来自消息函数 $\phi_r$，它仅依赖于不变量（特征和距离）。这种构造是 **可证明等价的**：如果所有输入位置都旋转了 $R$，那么所有输出位置也会被相同的 $R$ 旋转。

- EGNN的优点在于它通过不显式使用球谐函数或不可约表示来实现不变性。相对位置向量携带方向信息，而不变消息函数控制如何使用这些方向信息。

- 简单性伴随着一个代价：EGNN仅使用向量表示（顺序为1）。它无法代表如四极矩或应力张量等更高阶张量，除非进行扩展。

## 张量场网络和更高阶表示

- **张量场网络**（Thomas et al., 2018）及其后续工作（如**SE(3)-变换器**、**MACE**、**Equiformer**）使用旋转群的完全代表来构建不变层。

- 在表示论中（与第2章的线性代数相关），三维中的旋转可以分解为由整数阶数 $\ell$ 定义的不可约成分：
    - $\ell = 0$：标量（1个组件，不变）。能量、电荷。
    - $\ell = 1$：向量（3个组件，像位置矢量那样旋转）。力、偶极矩。
    - $\ell = 2$：秩-2对称无迹张量（5个组件）。四极矩、应力张量。
    - 更高阶 $\ell$：捕获越来越复杂的角结构。

- 这些被称为 **球形张量**, 它们在旋转 $R$ 时通过 **Wigner-D 矩阵** $D^\ell(R)$ 变换:标量保持不变, 向量旋转为 $R$, 级数为 2 的张量旋转为一个更复杂的矩阵。

- **等价消息传递**使用球形张量的 **克莱布斯通积** 来结合不同阶次特征：

$$(\mathbf{f}^{\ell_1} \otimes \mathbf{f}^{\ell_2})^{\ell_{\text{out}}} = \sum_{m_1, m_2} C^{\ell_{\text{out}}, m_{\text{out}}}_{\ell_1, m_1, \ell_2, m_2} \cdot f^{\ell_1}_{m_1} \cdot f^{\ell_2}_{m_2}$$
- Clebsch-Gordan系数 $C$ 是固定数学常数，确保张量积是等价的。这是 SO(3) 等价于矩阵乘法的 SO(3)-等价形式。

- MACE（Batatia et al., 2022）通过使用多个邻居特征的乘积来实现高精度，而不需要过多的消息传递层。它通过构建体有序交互（基于距离的2体、基于角度的3体、基于张量积的多体）来高效捕捉复杂的原子相互作用。

- **等价器**（Liao & Smidt，2023）结合了不变的球形张量特征与变换注意力机制（文件4），创建了一个SE(3)等价的图变换器。注意力分数从不变特征计算得出，而值聚合操作在等价张量特征上进行。

## 应用

- **分子性质预测**：给定一个分子的三维结构，预测如能量、力、偶极矩、HOMO-LUMO间隙、毒性、溶解度等性质。这是3D GNNs最成熟的应用之一。基于量子化学数据集（QM9、OC20）训练的模型在许多性质上实现了化学准确性，能够对数百万个候选分子进行虚拟筛选。

- **分子动力学加速**：计算原子间的力使用量子力学（密度泛函理论，DFT）非常昂贵（$O(n^3)$对于$n$电子）。一个3D GNN被训练来预测力可以取代DFT在分子动力学模拟中使用，实现速度提升$10^3$–$10^6$同时保持接近DFT的准确性。这使得能够模拟更大的系统和更长的时间尺度，揭示传统方法无法发现的现象。

- **蛋白质结构**: 蛋白质是由氨基酸链折叠成复杂三维结构的。蛋白质主链是一个几何图，其中节点是残基，边连接空间相邻的残基。3D GNNs用于蛋白质功能预测、结合位点识别和蛋白质设计（逆折叠：给定一个期望的结构，预测氨基酸序列）。**AlphaFold**使用几何和图论推理来从序列中预测蛋白质结构。

- **材料科学与催化**：晶体材料具有周期性3D结构。GNNs模型重复单元格并预测材料属性：带隙、形成能、机械强度。Open Catalyst Project（OC20/OC22）通过预测催化表面的吸附能来基准GNN，加速寻找可再生能源的新催化剂。

- **药物发现**：3D GNNs预测药物分子如何与目标蛋白质结合。结合亲和力取决于药物和蛋白结合口袋的三维形状互补性和化学相互作用。使用扩散模型（第8章）的等变GNN（DiffDock）来预测结合位姿（药物在蛋白口袋中的3D方向）。

## 图生成

- 以上所有架构都 **分析** 已有的图。 **图生成** 创建新的：设计具有所需特性的分子，为测试生成合成社会网络，或提出新的蛋白质结构。这是与图级预测相对应的生成性 counterpart。

- 问题在于图是离散、可变大小和组合的。生成一个图意味着决定创建多少个节点、它们有什么特征以及如何连接这些节点。可能的图空间随着节点数量的指数级增长而增加。

- **自回归生成**逐个构建图，逐个节点或边。**图RNN**（You et al., 2018）按顺序生成图：RNN保持状态，每一步生成一个新节点，并决定将其连接到哪些现有节点。生成顺序人为地给无序的图添加了一个顺序，但BFS排序有助于保留最近生成的节点相关性。

- **VAE-based generation** 将图编码到一个连续的隐变量空间（使用GNN编码器），然后从采样的隐向量中解码新的图。 **Graph VAE** 在一次操作中生成一个概率邻接矩阵 $\hat{A} \in [0, 1]^{n \times n}$，但这个过程随着 $O(n^2)$ 的增加而变得复杂，并且输出是稠密的，必须进行阈值处理。隐变量空间允许平滑插值：从两个分子嵌入之间移动可以生成化学上有效的中间结构。

- **基于扩散生成**将扩散框架（第8章）应用于图。前向过程逐渐在节点特征和边结构中添加噪声。后向过程学习去噪，从噪声中生成有效的图。**DiGress**（Vignac et al., 2023）将离散扩散应用到节点类型和边类型的组合上，自然地处理了图数据的类别性质。

- 对于分子生成，关键约束是化学有效性：生成的分子必须遵守原子配位规则（碳形成4个键，氧形成2个，等等）。方法如“连接树变分自编码器”（JT-VAE）将分子分解为有效的子结构（环、链、功能组），然后通过组装这些构建块来生成，保证了生成的分子的有效性。

- **目标导向生成**优化特定属性：生成与靶蛋白结合力高的分子，低毒性，和良好的溶解性。这将图生成与属性预测（使用3D GNN作为属性评估器）结合起来，在循环中进行：生成 → 评估 → 精炼。强化学习（第6章）或贝叶斯优化引导搜索通过化学空间。

- **DiffDock**（Corso et al., 2023）使用SE(3)-不变扩散来预测药物分子如何在蛋白质结合口袋中.Dock。该模型通过从随机放置开始去噪，结合此文件中的3D不变网络和第8章中的扩散框架来生成3D绑定姿态（药物相对于蛋白的位置和方向）。

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

3. 展示等价变换位置更新（EGNN风格）。使用距离加权相对向量更新节点位置，并验证等价性。
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
