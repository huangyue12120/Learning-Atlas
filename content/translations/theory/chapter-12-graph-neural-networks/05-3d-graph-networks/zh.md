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

*三维图网络把距离、角度和空间对称性纳入消息传递，适合分子、材料和三维场景。本篇覆盖 SE(3)/E(n) 等变性、SchNet、DimeNet、EGNN、高阶表示与应用。*



*3D图网将GNN扩展为有空间几何学的数据,其中旋转和翻译必须正确处理. 这个文件涵盖几何图形,SE(3)/E(n)-等同,SchNet,DimeNet,EGNN,Lalor场网络,以及分子属性预测,蛋白质结构,材料科学和药物发现方面的应用 -- -- 从3D物理世界中学习的架构. *

- 文件3和文件4中的GNN在抽象图上运行:节点具有特征,边缘编码连接,但不存在3D空间的概念. 一个社交网络图没有几何图形. 但GNN的很多最有影响的应用都涉及到生活在**物理立体空间的数据**:分子,蛋白质,晶体,点云. 对于这些,节点的空间位置携带了抽象GNNs忽略的关键信息.

- 挑战在于3D数据有**相位对称** (文件 1):旋转一分子不会改变其特性,翻译也一样. 3D GNN必须尊重这些对称性. 一个能量预测,当你旋转分子时变化是物理错误的。

## 几何图



- **相位图**是嵌入于三维空间的相位图. 每个节点$i$有个位置$\mathbf{r}_i \in \mathbb{R}^3$除了它的特性向量$\mathbf{h}_i$。。。边缘可能由相距空间(相距范围内的连接节点)定义.$r_{\text{cut}}$而不是通过明确的债券。

- 对于分子,几何图有原子作为节点(特征:元素类型,电荷等). 和化学联系作为边缘。3D职位$\mathbf{r}_i$由量子力学或实验测量(X-射线晶体学、低温-EM)确定的原子坐标。

- 对于点云(取自LiDAR或3D扫描仪,第8章和第11章),每个点为有位置和可选特征(颜色,强度)的节点. 边缘连接了相邻点,形成一个**k-近邻(kNN)图**或半径图.

- 消息传递的关键几何数量为:

    - ** 原子间距离**:$d_{ij} = \|\mathbf{r}_i - \mathbf{r}_j\|$。。。相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相去相出相去相去相去相去相去相去相去相去相去相去相去相去相去相入相 原子间距离相同的两个分子,无论取向如何,都是相同的形状.

    - ** 双角**:角$\theta_{ijk}$在向量之间$\mathbf{r}_j - \mathbf{r}_i$财务报告和已审计财务报表$\mathbf{r}_k - \mathbf{r}_i$在节点$i$。。。角取出超出对相距离的局部几何.

    - ** 二面体(tors)角度**:角度$\phi_{ijkl}$飞机之间$(i, j, k)$财务报告和已审计财务报表$(j, k, l)$。。。二面体捕捉到结构在3D中如何曲折,对蛋白质骨干几何至关重要.

    - ** 弹性位置向量**:$\mathbf{r}_{ij} = \mathbf{r}_j - \mathbf{r}_i$。。。这些是翻译的不变量,但并非旋转的不变量。使用它们需要等同的(不仅仅是无常的)建筑.

## SE(3) 与 E(n) 等变性



- 3D 物理数据对称组是 ** Euclidean 组**$E(3)$,由所有旋转,反射和翻译组成. 分组**$SE(3)$** (特别欧克利德语)包括旋转和翻译,但不包括反射。

- 一个3DGNN应该:
    - ** 转换-变量**用于分解输出(能,绑定亲和):用同向量移动所有原子不应改变预测。
    - ** 旋转-变异性** 对于平面输出:旋转分子不应改变其能.
    - ** 用于向量/速率输出的旋转-等同物**(Force, pipole moments):旋转分子应当以相同的旋转来旋转所预测的向量.

![SE(3)-等分:旋转一分子会留下没有变化的平面预测(能量),但会相应旋转向量预测(力量)](../images/se3_equivariance.svg)

- 形式上,为平面预测$f$和旋转$R \in SO(3)$:

$$f(R\mathbf{r}_1, R\mathbf{r}_2, \ldots) = f(\mathbf{r}_1, \mathbf{r}_2, \ldots) \quad \text{(invariance)}$$

- 对于向量预测$\mathbf{F}$:

$$\mathbf{F}(R\mathbf{r}_1, R\mathbf{r}_2, \ldots) = R \cdot \mathbf{F}(\mathbf{r}_1, \mathbf{r}_2, \ldots) \quad \text{(equivariance)}$$

- 这些限制直接反映了文件1的内向/等同框架,现在专门适用于三维旋转和翻译组.

- 有两个设计方法:
    1. **Invariant architectures**:仅使用不相干几何特征(距离,角度)作为消息传递的输入. 内部代表作有"平分"(invariant). 简单而高效,但如果不打破对称性,无法产生向量输出.
    2. ** 等效结构**:在整个网络中保持向量(和更高等分角)表示,确保每层均匀. 更能表现,可以自然地预测向量和收发率,但更为复杂.

## SchNet：基于距离的消息传递



- **SchNet**(Schütt等,2017年)是地基无变种3D GNN. 它的关键创新是**连续的滤波器折叠**:而不是使用固定的边缘类型(如分子GNNs中的债券类型),而由SchNet直接从原子间距离生成消息过滤.

- 距离$d_{ij}$首次被扩展为特性向量,使用**射线基础函数(RBFs)**:

$$\text{RBF}(d_{ij}) = \left[\exp\left(-\gamma_1 (d_{ij} - \mu_1)^2\right), \ldots, \exp\left(-\gamma_K (d_{ij} - \mu_K)^2\right)\right]$$

- 每个基础函数都是以高斯为中心$\mu_k$有宽度$\gamma_k$。。。这类似于远程的可学习位置编码:连续距离被映射到高维度特征空间,网络可以学习远程依赖的相互作用. 中心$\mu_k$通常从0到截断半径的间距均匀.

- 来自节点的 SchNet 消息$j$到节点$i$即:

$$\mathbf{m}_{j \to i} = \mathbf{h}_j \odot W_{\text{filter}}(\text{RBF}(d_{ij}))$$

- 地点$W_{\text{filter}}$是一个MLP,将 RBF 扩展图映射为过滤向量,以及$\odot$是元素相乘法(Hadamard产品, 第2章)。滤波器取决于距离,因此相邻的原子与相距遥远的原子相互作用不同. 元素相乘法就像一个取景机制(第六章):由距离依赖的滤波器控制每个特征维度通过多少.

- 由于SchNet只使用相距(invatant),整个模型自动地对旋转和翻译无变化. 除了这种设计选择之外,不需要对称的特殊处理.

## DimeNet 与 SphereNet：角度和二面角



- 仅靠距离无法完全指定三维结构。两种不同的分子相容性可以具有相同的对相 ** DimeNet**(Gasteiger等人,2020年)将**bond角度**纳入消息传递中。

- DimeNet 使用 ** 向导消息通过**: 消息沿着直线边缘流出, 消息处于边缘$(j \to i)$受边缘之间角度的影响$(k \to j)$财务报告和已审计财务报表$(j \to i)$:

$$\mathbf{m}_{kj \to ji} = f\left(\mathbf{m}_{kj}, d_{ji}, \theta_{kji}\right)$$

- 角度$\theta_{kji}$利用球形贝塞尔函数和球形口琴(球上角信息自然基础,相距相近的RBFs)来扩展. 这使得模型在保持偏差的同时可以获取方向信息.

- ** 层网** (Liu等人,2022年)更进一步,包括了**分层角度**$\phi_{lkji}$,捕获完整的三维躯干结构。等级是:
    - 相距 = 捕捉到对相近
    - 角相，捕获局部几何(bent vs. 线性)
    - 双面体 → 捕获 三维扭矩(蛋白质骨干关键,药物绑定)

- 每一级别均以计算复杂程度为代价,增加几何分辨率(距离为:$O(|E|)$,角度为$O(|E| \cdot k)$双面体是$O(|E| \cdot k^2)$地点$k$是平均学位。

## E(n) 等变图神经网络（EGNN）



- ** EGNN**(Satorras等,2021年)采取等同方法:它不只使用不相干特征,而是更新了每个层的双节点特征**和**节点位置,始终保持等分.

- EGNN 节点更新$i$:

$$\mathbf{m}_{ij} = \phi_e\left(\mathbf{h}_i, \mathbf{h}_j, d_{ij}^2, a_{ij}\right)$$

$$\mathbf{r}_i' = \mathbf{r}_i + C \sum_{j \neq i} (\mathbf{r}_i - \mathbf{r}_j) \cdot \phi_r(\mathbf{m}_{ij})$$

$$\mathbf{h}_i' = \phi_h\left(\mathbf{h}_i, \sum_j \mathbf{m}_{ij}\right)$$

- 关键是位置更新:节点位置由相对位置向量的加权和调整$(\mathbf{r}_i - \mathbf{r}_j)$。。。重量来自消息函数$\phi_r$,它只取决于数量变化不定(地貌和距离)。这种构造是**可证实的等同**:如果所有输入职位由$R$,所有产出职位由同一员额轮换$R$.

- EGNN是优雅的,因为它在没有明确使用球形口琴或不可减少的表示的情况下实现了等效. 相对位置向量携带方向信息,不常态消息函数控制该方向信息如何被使用.

- 简洁性伴随着取舍: EGNN只使用向量表示(命令一). 它不能代表像四分卫瞬间那样的更高级的收发机,或者没有扩展的应力收发机.

## 张量场网络与高阶表示



- **传感器场网**(Thomas等,2018年)及其接班人(**SE(3)-Transfers**,**MACE**,**Equifers**)使用旋转组中**不可减少表示**的全机来构建等分层.

- 在表示论(与第2章的线性代数相接)中,3D中的旋转可以被分解成以整数顺序为特征的不可减少的成分.$\ell$:
    - $\ell = 0$: scalars (1个组件,无变异). 能量,充电。
    - $\ell = 1$:向量(3个组件,与位置向量相旋转). 力量,双管瞬间。
    - $\ell = 2$:等级-2对称可追溯到无分量的收分数(5个组件). 四分卫时刻 压力减速器
    - 高级$\ell$:捕捉日益复杂的角结构.

- 它们叫做"球状抗拉器" 它们在旋转下变形$R$通过**维格纳-D矩阵**$D^\ell(R)$: 平面图不变,向量由$R$,由更复杂的矩阵旋转的等分-2角.

- ** 等效电文通过** 有球形收发器使用** Clebsch-Gordan收发器产品** 来结合不同订单的特性:

$$(\mathbf{f}^{\ell_1} \otimes \mathbf{f}^{\ell_2})^{\ell_{\text{out}}} = \sum_{m_1, m_2} C^{\ell_{\text{out}}, m_{\text{out}}}_{\ell_1, m_1, \ell_2, m_2} \cdot f^{\ell_1}_{m_1} \cdot f^{\ell_2}_{m_2}$$

- 克莱布希-戈尔丹系数$C$是固定的数学常数,可以保证等分数的等分数产物。这是基质相乘的SO(3)-等同相仿.

- **MACE**(Batatia等,2022年)使用高序电文(多相邻地物的产品)来达到高精度并减少通訊层. 通过构建体序相互作用(从相距到相距到相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相

- ** Equiformer** (Liao & Smidt, 2023)将等效球形拉伸特性与变压器的注意机制(文件4)相融合,创建了SE(3)-等同变压器. 注意分数是从不定的特性计算出来的,而数值汇总则在等分的拉伸特性上进行。

## 应用



- **分子属性预测**:给一分子的三维结构,预测能量,力等特性,二极分秒,HOMO-LUMO差分,毒性,可溶性. 这是3D GNN最成熟的应用. 接受量子化学数据集(QM9,OC20)培训的模型在许多特性上实现了化学精度,使得数百万候选分子得以虚拟筛选.

- ** 分子动力学加速**:利用量子力学(密度函数理论,DFT)计算原子之间的电能极其昂贵($O(n^3)$(单位:千美元)$n$电子). 3D GNN在分子动力学模拟中经过了预测力的训练,可以取代 DFT,实现速度快到.$10^3$–$10^6$在保持接近DFT准确性的同时. 这使得可以模拟更大的系统和更长的时间尺度,揭示出传统方法所看不见的现象.

- ** 蛋白质结构**:蛋白质是氨基酸的链,可折叠成复杂的3D结构. 蛋白质骨干是一个几何图形,其中节点为残基,边缘连接了空间相近的残基. 3D GNN用于蛋白质功能预测,绑定站点识别和蛋白质设计(反折叠:给定了理想的结构,预测氨基酸序列). **AlphaFold**使用几何和以图表为基础的推理,从序列中预测出蛋白质结构.

- ** 材料科学和催化物**:晶体材料具有周期性立体结构。GNNs建模了重复单元细胞并预测出材料属性:波段间隙,形成能,机械强度. 开放催化项目(OC20/OC22)将GNN作为预测催化表面吸附能的基准,并加速寻找可再生能源的新催化剂.

- ** 药物发现**:3D GNNs预测药物分子如何与靶蛋白结合. 绑定的亲和性取决于药物与蛋白质绑定口袋之间的3D形状互补和化学相互作用. 类似**DiffDock**的模型使用等效GNNs与扩散模型(第8章)来预测绑定的外形(蛋白质口袋中药物的3D取向).

## 图生成



- 上方所有建筑**分析**现有图表. **Graph生成** 创建了新的:设计出具有所期望的特性的分子,生成一个用于测试的合成社交网络,或者提出一种新的蛋白质结构. 这是图级预测的基因对应物.

- 挑战在于,图表是分散的、可变的和组合的。生成一个图表意味着决定要创建多少个节点,它们有什么特征,以及需要连接的对. 可能图的空间会随着节点的数量而超能地增长.

- ** 自动递归生成**一次建立图一节点(或一边缘). ** GraphRNN** (You等, 2018) 相继生成图:一个RNN维持一个状态,在每个步骤上生成一个新节点,并决定将它连接到哪个现有节点. 生成顺序将人工序列强加于固有的无序图上,但BFS通过保持最近产生的节点相关而命令帮助.

- **基于VAE的生成** 将图表编码成一个连续的潜在空间(使用GNN编码器),然后从被取样的潜在向量解码出新的图表. **GraphVAE** 生成概率偶联矩阵$\hat{A} \in [0, 1]^{n \times n}$在一个镜头中,但这个尺度是$O(n^2)$并产生密集的产出,必须加以阈值。潜入空间允许平滑地插入:在两个分子嵌入物之间移动产生化学上有效的中间结构.

- ** 基于扩散的生成** 将扩散框架(第8章)应用于图表。前进过程逐渐地给节点特征和边缘结构增加了噪音. 反相过程会学习去出自"地"(demoise),从噪音中生成出有效的图表. ** DiGress**(Vignac等人,2023年)对节点类型和边缘类型都适用离散扩散,自然处理图表数据的绝对性质。

- 对于**分子生成**,关键制约是**化学有效性**:所生成的分子必须服从活性规则(碳形式4 键,氧形式2等). 如** Junction Tree VAE (JT-VAE)**等方法将分子分解为有效的子结构(环,链,功能组),通过集成这些构件来生成,通过构造保证有效性.

- ** 目标定向生成** 对特定特性的选择:生成一个与目标蛋白质有高结合度,毒性低和溶解性好的分子. 这把图生成与地产预测结合起来(使用3D GNN作为地产评估员),循环:生成-评价-精度. 强化学习(第6章)或巴伊西亚优化指导通过化学空间进行搜索.

- ** DiffDock**(Corso等,2023年)使用SE(3)-等分扩散来预测一药物分子如何连接到蛋白质绑口袋中. 该模型通过从随机投放中去诺来生成3D绑定的姿势(药物相对于蛋白质的位置和取向),将本文中的3D等效网络与第八章的传播框架相融合.

## 编程任务（使用 Colab 或 notebook）



1. 利用原子间距离来构建一个简单的不变量的3D通訊層. 应用到小分子(水:H-O-H)上,并验证出输出对自转无变.
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

2. 计算出三个原子之间的相接角,并验证其为自转-变相.
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

3. 演示等效位置更新(EGNN- style). 利用相距加权相对向量来更新节点位置并验证等效.
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
