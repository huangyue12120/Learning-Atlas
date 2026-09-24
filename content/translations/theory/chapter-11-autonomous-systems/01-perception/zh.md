---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 11 - autonomous systems/01. perception.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: bc10942d9ac62dfe067f1b4311f07f88c2cc392e51c10f190a1b664403c1a2e6
status: reviewed
---
# 视觉感知

*视觉感知是自主系统如何感知和解释物理世界的。本文件涵盖了传感器模态、处理、传感器融合、3D物体检测、深度估计、 occupancy网络、车道检测和语义映射，这是每辆机器人、无人机和自动驾驶汽车构建的基础框架。*

- 对于人类而言，感知世界是 effortless的：你看到一辆车 approaching，听到它的引擎声，感受到地面 beneath你的脚，瞬间构建了一个关于周围环境的 mental模型。自主系统必须使用电子传感器和算法来实现同样的事情，而不是眼睛和耳朵。

- 基本挑战在于：传感器只提供原始数字（像素强度、点云、信号反射等），而系统需要将这些数字转换为结构化的理解：“前方有行人12米，向左移动1.5m/s。”这就是感知问题。

- 一切下游（预测、规划、控制）都依赖于感知。一辆自动驾驶汽车拥有完美的规划器但缺乏良好的感知能力，仍然会撞车。感知是瓶颈。

## 感知模态

- 自主系统使用多种传感器类型，每种都有不同的优势和故障模式。单个传感器本身不足以满足需求。

![](../images/sensor_comparison.svg)


- **相机**捕获高分辨率的彩色信息。一张图像包含数百万像素，每个像素记录RGB值（如第8章中所见）。相机便宜、轻便且提供丰富的纹理和色彩信息，对于读取路标、检测交通灯和识别物体至关重要。

- 相机类型包括**单镜头（无内置深度）**、**双镜头（两镜头之间有基线，通过视差实现深度，如第8章中所见）**和**鱼眼相机（超广视角，180°+，带有重径畸变，用于环绕视野停车系统）。**

- 相机的主要弱点是它们在投影时丢失深度信息。3D场景通过透视相机模型（如第8章中所见的内矩阵$K$）映射到2D图像平面上：

$$\begin{bmatrix} u \\ v \\ 1 \end{bmatrix} = \frac{1}{Z} K \begin{bmatrix} X \\ Y \\ Z \end{bmatrix}$$
- 除以$Z$丢弃绝对深度。两个不同大小和距离的对象在相同的投影中会产生相同的结果。从单个图像恢复深度是不明确的，因此需要使用双镜头或学习的单目深度模型。

- 相机在恶劣条件下也表现不佳：直接阳光造成眩光，黑暗减少信号，雨或雾散射光线。

- **激光雷达（Light Detection and Ranging）**发射激光脉冲并测量每个脉冲反射的时间。由于光速已知（$c \approx 3 \times 10^8$ m/s），每个反射点的距离为：

$$d = \frac{c \cdot \Delta t}{2}$$
![](../images/lidar_time_of_flight.svg)


- 这个因子乘以2是因为激光的往返。通过在场景上扫过激光，LiDAR构建了一个**点云**：一组3D坐标$(x, y, z)$，通常带有反射率（亮度）值。

- **旋转激光雷达**（例如Velodyne）将激光阵列旋转360°，产生一个完整的全景视图。典型的单位每秒生成30万多个点，覆盖64到128个垂直通道。结果是一个稀疏但几何准确的3D场景表示。

- **固态激光雷达**没有移动部件，使用光相阵列或MEMS反射镜代替。这使得它们更便宜、更紧凑且更可靠，但通常视野较窄（120° vs 360°）。

- 激光雷达提供精确的深度信息，但数据稀疏（远少于相机像素），没有颜色信息，并且价格昂贵。此外，在强雨、雪或尘埃中，激光脉冲会被颗粒散射，导致性能下降。

- **雷达**（无线电检测和测距）与激光雷达的工作原理相同，都是基于时间飞行原理，但使用的是无线电波（毫米波，通常为77 GHz用于汽车）。无线电波穿透雨、雾、尘埃和雪的能力远优于光，因此雷达是最抗恶劣天气的传感器。

- 摩尔定律也直接测量 **速度** 通过多普勒效应。当物体向传感器移动时，反射波被压缩（频率更高）；当远离时，它们被拉伸（频率更低）。速度是：

$$v = \frac{\Delta f \cdot c}{2 f_0}$$
- $\Delta f$ 是频率偏移，$f_0$ 是传输频率。这给出了即时径向速度，无需跟踪或帧间计算。

- 该交易是分辨率：雷达的角分辨率远低于相机或激光雷达，因此在区分近处物体或检测细微细节方面表现不佳。它在任何天气条件下都能出色地检测远处车辆（超过200米）。

- 超声波传感器发射高频声脉冲（40-70 kHz），测量回波返回时间。它们在非常短距离（0.2-5米）工作，并主要用于停车辅助。它们的物理与激光雷达相同，只是使用声波而不是光。 $d = \frac{v_{\text{sound}} \cdot \Delta t}{2}$ 在哪里 $v_{\text{sound}} \approx 343$ 米/秒。

- **IMU**（惯性测量单元）包含加速度计和陀螺仪，分别用于测量线性加速度和角速度。IMUs提供高频率运动数据（通常为200–1000 Hz），填补了较慢传感器更新之间的空白。它们不直接感知环境，而是跟踪机器人的自身运动，因此对于死reckoning和状态估计至关重要。

- IMUs容易出现漂移，随着时间的推移，测量误差会逐渐积累，导致估计的位置与现实产生偏差。因此，IMU通常会被与其他传感器（如摄像头、GPS和LiDAR）融合使用，而不是单独使用。

- **GNSS**（全球导航卫星系统，包括GPS）通过多颗卫星的信号 triangulation提供地球表面的绝对位置。标准GPS精度为2-5米，不足以支持车道级驾驶。**RTK-GPS**（实时动态）使用固定基准站来纠正误差，实现厘米级精度，但需要清晰的天空视图和基准站基础设施。

## 传感器校准

- 在传感器能够协同工作之前，它们必须进行 **校准**：每个传感器的测量结果都必须与一个共同的坐标系相关联。

- **内禀校准**决定了传感器的内部参数。对于相机而言，这包括焦距、主点和畸变系数（如第8章中讨论）。对于激光雷达而言，这意味着激光束之间精确的角度偏移。一种常见的方法是张氏棋盘格校准，通过在多个角度观察已知平面图案来解出内禀矩阵。

- **外在校准**决定了两个传感器之间的刚性变换（旋转 $R$ 和平移 $\mathbf{t}$）。如果相机和激光雷达安装在同一辆车中，外在校准找到将激光雷达坐标映射到相机坐标的 $4 \times 4$ 变换矩阵：

$$\mathbf{p}_{\text{cam}} = \begin{bmatrix} R & \mathbf{t} \\ \mathbf{0}^T & 1 \end{bmatrix} \mathbf{p}_{\text{lidar}}$$
- 这是一个齐次坐标下的仿射变换，与第2章（线性变换）中我们研究的完全相同。如果这个矩阵计算错误，LiDAR点将投影到错误的像素上，整个融合管道都将崩溃。

- **时间同步**使传感器时钟同步。一个以30 Hz拍摄的相机和一个以10 Hz运行的LiDAR产生不同的时间戳。如果汽车以30 m/s（高速公路速度）行驶，10 ms的时间误差对应着30 cm的空间误差。硬件触发（共享时钟脉冲）或软件同步（通过插值时间戳）是必需的。

## 合成传感器

- 单个传感器无法覆盖所有条件。摄像头能看见颜色和纹理，但缺乏深度信息。激光雷达能精确测量深度，但数据稀疏且无色彩。雷达在任何天气条件下都能工作，但分辨率较低。**合成传感器**将它们的优势结合起来，并补偿各自弱点。

- 早期融合（或数据级融合）在任何处理之前将原始传感器数据合并。例如，将激光雷达点投影到相机图像上以创建RGBD表示（颜色和每个像素的深度），或者为每个激光雷达点着色，使其与它投影到的相机像素的颜色相同。这保留了最多的信息，但需要精确计算，并且对错位敏感。

- **后融合**（或决策层融合）通过每个传感器独立地通过其自己的检测管道来处理，然后合并最终输出（边界框、类别标签和置信度分数）。每个传感器投票，一个融合模块解决分歧。这更简单且模块化，但每个管道无法从另一个传感器的原始数据中受益。

- **中层融合**在中间特征表示上进行操作。每个传感器的原始数据被编码到一个学习特征空间（使用CNNs或transformers），然后这些特征被组合起来。这是现代系统中主导的方法，因为它允许网络从每个模态中提取什么。

![](../images/bev_fusion_pipeline.svg)


- **BEVFusion** 是一种代表性的中等融合架构。它将相机特征和激光雷达特征投影到一个共同的 **鸟瞰图 (BEV)** 表示，这是一个场景的顶部向下网格。相机特征通过预测深度分布“提升”到3D空间，然后在BEV网格上散播。激光雷达特征已经是3D的，并直接在相同的网格上进行体素化处理。融合后的BEV特征随后由检测头处理。

- BEV表示力强大，因为它提供了一个统一的、以米为尺度的空间坐标系，使得空间推理（距离、大小、重叠）变得简单。在相机图像中，一个近处的自行车和远处的卡车可能占据相同的像素数量。在BEV中，它们的真实大小和位置是清晰的。

## 三维物体检测

- 感知的核心任务是检测三维物体：它们在哪里，多大，是什么，以及它们面向哪个方向？每个检测都是一个**三维边界框**，包含位置。 $(x, y, z)$维度 $(l, w, h)$角度差 $\theta$类别标签和置信度分数。

- **基于激光雷达的检测**直接处理点云。挑战在于点云无序、不规则且密度变化大（近处物体有数千个点，远处物体只有几个）。回想第8章，PointNet通过共享MLP和不变性聚合（最大池化）来处理这些情况。

- **PointPillars** 将点云转换为结构化的表示，通过将地面平面 discret化为垂直柱（“pillar”）来实现。每个柱子内的所有点都被编码成一个固定大小的特征向量。结果是一个2D伪图像，可以使用标准的2D CNN骨干网络进行处理，并随后添加一个检测头（例如第8章中的SSD架构）。这种方法速度快且有效。

- **CenterPoint**将对象检测视为点而不是框。它预测一个物体中心的热图，然后在每个峰值上回归盒子属性（大小、高度、方向和速度）。这与BEV中的CenterNet（第8章）类似：不使用锚点，训练期间不需要NMS，并且自然扩展到跟踪，通过关联不同帧中的中心点来实现。

- **仅相机的三维检测**必须从二维图像中推断深度，这本质上更难。现代方法如 **BEVDet** 和 **BEVFormer** 使用 transformer 架构将 2D 图像特征“提升”到 3D。BEVFormer 使用空间交叉注意力：BEV 查询在每个相机的图像上投影特定的 3D 参考点，从相关位置拉取特征。

- 激光雷达（LiDAR）和相机在三维检测上的差距正在迅速缩小，这得益于深度估计的改进、模型规模的扩大以及时间融合（通过多个帧累积深度线索，类似于立体匹配但跨时间）。

## 深度估计

- 深度估计是为每个像素或点分配距离值的问题。

- 立体匹配使用两台相机，它们之间的距离是已知的。 $b$同一个三维点在两张图像中以轻微不同的水平位置出现（**视差**） $d$深度计算如下（参见第8章）：

$$Z = \frac{f \cdot b}{d}$$
- where $f$ is the focal length. The challenge is finding correct correspondences between the two images, especially in textureless regions, occlusions, and repetitive patterns. Modern stereo networks (e.g., RAFT-Stereo) use iterative refinement with correlation volumes.

- **Monocular depth estimation** predicts depth from a single image. Since this is ill-posed (infinitely many 3D scenes can produce the same image), the network must learn statistical priors: "floors are flat," "objects get smaller with distance," "texture gradient indicates receding surfaces."

- **Depth Anything** (covered in chapter 8) achieves strong monocular depth by training on massive unlabelled datasets with self-supervision, then fine-tuning on labelled data. The key insight is that scale-invariant losses handle the inherent ambiguity: the model predicts relative depth (ordering) rather than absolute metres.

- **激光雷达相机深度融合** 将稀疏的激光雷达深度测量投影到相机图像作为监督。网络学习“填补”这些点之间的间隙，产生具有激光雷达准确性和相机分辨率结合的密集深度图。

## 占有性网络

- 传统感知输出一个检测到对象的边界框列表。但现实世界中包含许多不完全符合盒子形状的东西：奇形怪状的垃圾、施工障碍物、高垂枝条、部分坍塌的墙壁等。

![](../images/occupancy_vs_bbox.svg)


- **占有性网络** 代表场景为一个密集的3D体素网格。每个体素（例如，0.2m × 0.2m × 0.2m的小立方体）被分类为自由、占用或未知，并且可选地赋予语义标签（道路、人行道、车辆、植被等）。

- 这是一种从对象为中心的感知（“检测到汽车”）转向场景为中心的感知（“3D空间中的哪些部分是占用的？”）的转变。优势在于通用性：系统不需要预先定义的对象类别列表来避免与任意障碍物发生碰撞。

- 占有性网络通过传感器输入（相机、激光雷达或两者），将它们编码为一个3D特征体积，并预测每个体素的标签。3D特征体积通常通过将2D特征提升到3D（类似于BEV构建但扩展垂直）并使用3D卷积或稀疏卷积来处理。

- **TPVFormer** (三视点视角) 通过将3D体积分解为三个正交平面（顶部向下、前方和侧方）来避免全3D注意力的立方成本。每个平面使用2D注意力，它们在每个体素处组合特征。这类似于如何用SVD将矩阵分解为更简单的因子（第2章），将一个复杂的3D问题分解为易于管理的2D部分。

- 输出的体素网格直接告诉规划器哪些空间区域可以安全占用，哪些不能，使其成为感知和规划之间的自然接口。

## 车道检测与道路拓扑结构

- 对于在结构化道路上行驶的车辆，理解 **车道几何** 是至关重要的。系统必须知道车道在哪里、如何弯曲、它们是如何合并和分裂的以及车辆位于哪个车道。

- 经典方法通过拟合检测到的车道标记的参数曲线来实现。一个常见的模型是三次多项式：

$$x(y) = a_0 + a_1 y + a_2 y^2 + a_3 y^3$$
- 其中 $y$ 是前方的距离，$x$ 是横向偏移量。这是一个多项式近似（回忆第3章中的泰勒级数），因为道路是平滑曲线，低度多项式很好地捕捉了它们。系数通过检测到的车道点进行最小二乘回归来估计。

- 现代方法使用神经网络直接检测车道。 **LaneNet** 将每条车道视为一个实例，并通过嵌入分支将属于同一车道的像素分组，随后进行曲线拟合。 **GANet** 使用图论方法，将车道拓扑结构表示为有向图，其中节点是车道点，边编码连接（在交叉口处合并、分裂或连接）。

- **道路拓扑** 超出了单个车道曲线的范围，捕捉了整个结构： lanes如何相互连接，哪些车道允许左转，高速公路入口如何与主干道合并。这通过有向图建模，其中交叉口是节点，车道段是边，并带有属性（速度限制、车道类型、转弯限制）。

- 图结构对于路线规划至关重要：除了“车道在哪里”之外，还需要知道“哪条车道序列通往目的地”。

## 语义映射

- 视觉感知并不仅限于在单帧中检测对象。随着时间的推移，自主系统构建一个 **语义地图**：一个持久、结构化的环境表示，通过累积多个观察来积累信息。

- 最简单地，语义地图是一个二维网格（ **占用图**），其中每个单元格存储被占用的概率。随着机器人移动并使用传感器扫描时，这些概率通过贝叶斯更新进行更新：

$$P(\text{occupied} \mid z_{1:t}) = \frac{P(z_t \mid \text{occupied}) \cdot P(\text{occupied} \mid z_{1:t-1})}{P(z_t)}$$
- 这是贝叶斯定理在行动（来自第5章）：每次新的测量 $z_t$ 更新每个细胞的先验信念。通常使用对数概率表示法来避免许多小概率相乘时出现的数值问题：

$$l_t = l_{t-1} + \log \frac{P(z_t \mid \text{occupied})}{P(z_t \mid \text{free})}$$
- 将对数几率相加等价于乘以概率（回想 $\log(ab) = \log a + \log b$），而累积的和自然地随着时间积累证据。

- 更丰富的地图为每个单元分配语义标签（道路、人行道、建筑物、植被）并可以扩展到3D。这些与 occupancy网络密切相关，但强调持久性和时间聚合而不是单帧预测。

- **SLAM**（同时定位与建图），在第8章中讨论，该算法在构建地图的同时，同时跟踪机器人在其中的位置。视觉惯性SLAM融合了相机和IMU数据；LiDAR SLAM使用点云注册。感知流水线将检测结果和深度估计输入到SLAM系统中，后者维护全局地图。

- 现代方法越来越多地使用神经隐式表示（如第8章中的NeRFs）来构建密集、逼真的场景地图，可以在任何3D点进行查询。这些神经地图在网络权重中存储了整个场景的压缩表示，从而能够执行诸如新颖视图合成和详细空间查询等任务。

## 编程任务（使用 Colab 或笔记本）

1. 将三维激光点投影到二维相机图像上，使用投影矩阵。可视化哪些点落在图像边界内。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Simulated LiDAR points in 3D (x=forward, y=left, z=up)
rng = jax.random.PRNGKey(0)
points_3d = jax.random.uniform(rng, (200, 3), minval=jnp.array([5, -10, -2]),
                                maxval=jnp.array([50, 10, 3]))

# Camera intrinsic matrix (focal length 500, image centre 320x240)
K = jnp.array([[500, 0, 320],
               [0, 500, 240],
               [0,   0,   1.0]])

# Extrinsic: LiDAR to camera (identity rotation, small translation)
R = jnp.eye(3)
t = jnp.array([0.0, 0.0, -0.5])

# Project: p_cam = K @ (R @ p_lidar + t)
p_cam = (R @ points_3d.T).T + t
p_img = (K @ p_cam.T).T
p_img = p_img[:, :2] / p_img[:, 2:3]  # divide by Z

# Filter points in front of camera and within image
mask = (p_cam[:, 2] > 0) & (p_img[:, 0] > 0) & (p_img[:, 0] < 640) & \
       (p_img[:, 1] > 0) & (p_img[:, 1] < 480)
depth = p_cam[mask, 2]

plt.figure(figsize=(8, 5))
plt.scatter(p_img[mask, 0], p_img[mask, 1], c=depth, cmap="viridis", s=5)
plt.colorbar(label="Depth (m)")
plt.xlim(0, 640); plt.ylim(480, 0)
plt.title("LiDAR points projected onto camera image")
plt.xlabel("u (pixels)"); plt.ylabel("v (pixels)")
plt.show()
```

2. 使用贝叶斯对数概率更新构建一个简单的二维覆盖网格。模拟环境中的范围传感器扫描，并观察地图的生成过程。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Grid setup: 50x50 cells, each 0.2m
grid_size = 50
log_odds = jnp.zeros((grid_size, grid_size))

# Sensor model: log-odds update values
l_occ = 0.85   # confidence that a hit means occupied
l_free = -0.4  # confidence that a pass-through means free

# Simulated obstacle: a wall from (5,20) to (5,30) in grid coords
wall_y = jnp.arange(20, 30)

# Robot at (25, 25), scanning outward
robot = jnp.array([25, 25])

for angle_deg in range(0, 360, 5):
    angle = jnp.radians(angle_deg)
    direction = jnp.array([jnp.cos(angle), jnp.sin(angle)])

    for step in range(1, 25):
        cell = (robot + direction * step).astype(int)
        r, c = int(cell[0]), int(cell[1])
        if r < 0 or r >= grid_size or c < 0 or c >= grid_size:
            break

        # Check if this cell is the wall
        is_wall = (r == 5) and (c >= 20) and (c < 30)
        if is_wall:
            log_odds = log_odds.at[r, c].add(l_occ)
            break
        else:
            log_odds = log_odds.at[r, c].add(l_free)

# Convert log-odds to probability
prob = 1.0 / (1.0 + jnp.exp(-log_odds))

plt.figure(figsize=(6, 6))
plt.imshow(prob.T, origin="lower", cmap="RdYlGn_r", vmin=0, vmax=1)
plt.colorbar(label="P(occupied)")
plt.plot(25, 25, "b*", markersize=10, label="Robot")
plt.legend()
plt.title("2D Occupancy Grid from Bayesian Updates")
plt.show()
```

3. 通过立体图像对计算深度。模拟两个相机视角下的三维点，计算 disparity并恢复深度。
```python
import jax
import jax.numpy as jnp

# Camera parameters
f = 500.0     # focal length in pixels
b = 0.12      # baseline in metres (12 cm)

# 3D points at known depths
depths_true = jnp.array([5.0, 10.0, 20.0, 50.0, 100.0])

# Disparity = f * b / Z
disparities = f * b / depths_true

# Recover depth from disparity
depths_recovered = f * b / disparities

for z, d, z_r in zip(depths_true, disparities, depths_recovered):
    print(f"True depth: {z:6.1f}m  Disparity: {d:6.2f}px  Recovered: {z_r:6.1f}m")

# Notice: disparity is inversely proportional to depth
# Close objects have large disparity, far objects have tiny disparity
# This is why stereo is most accurate at short range
```
