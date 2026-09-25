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

*感知让自主系统获取并理解物理世界的信息。本文介绍传感器模态与校准、传感器融合、三维目标检测、深度估计、占用网络、车道检测和语义地图，这些技术构成机器人、无人机和自动驾驶汽车的感知基础。*

- 人类感知周围环境似乎很轻松：看到汽车驶近，听到发动机声，感受到脚下的地面，就能迅速形成对周围环境的判断。自主系统也要完成这些工作，但它依靠电子传感器和算法，而不是眼睛和耳朵。

- 传感器只提供原始数值，例如像素强度、点云和信号反射。系统必须把这些数值转成结构化信息，例如：“前方 12 米处有一名行人，正以每秒 1.5 米的速度向左移动。”这就是感知问题。

- 预测、规划和控制等下游任务都依赖感知。即使自动驾驶汽车拥有完美的规划器，只要感知不可靠，仍可能发生碰撞。感知能力往往是系统的瓶颈。

## 传感器模态

- 自主系统使用多种传感器。每种传感器都有自己的优势和失效条件，单一传感器无法满足所有需求。

![相机、激光雷达、雷达和 IMU 在分辨率、深度、天气适应性、速度测量和成本方面的比较](../images/sensor_comparison.svg)

- **相机**能以高分辨率捕捉密集的颜色信息。一张图像包含数百万个像素，每个像素记录 RGB 值（见第 08 章）。相机成本低、重量轻，还能提供丰富的纹理和颜色信息，适合读取路牌、检测交通灯和识别物体。

- 相机分为**单目相机**（单镜头，不直接提供深度）、**双目相机**（两镜头之间有基线，可利用视差估计深度，见第 08 章）和**鱼眼相机**（视场角很宽，超过 180°，径向畸变较强，常用于环视停车系统）。

- 相机的主要局限是投影时会丢失深度信息。针孔相机模型将三维场景映射到二维图像平面（见第 08 章的内参矩阵 $K$）：

$$\begin{bmatrix} u \\ v \\ 1 \end{bmatrix} = \frac{1}{Z} K \begin{bmatrix} X \\ Y \\ Z \end{bmatrix}$$

- 除以 $Z$ 会丢掉绝对深度。不同大小、不同距离的物体可能产生相同的投影。单张图像无法唯一确定深度，因此系统需要使用双目相机或学习得到的单目深度模型。

- 强光会造成眩光，黑暗会削弱信号，雨雾会散射光线，因此相机在恶劣天气和光照条件下表现较差。

- **激光雷达**（LiDAR，Light Detection and Ranging）发射激光脉冲，并测量脉冲反射回来的时间。光速已知（$c \approx 3 \times 10^8$ m/s），因此可以计算每个反射点的距离：

$$d = \frac{c \cdot \Delta t}{2}$$

![激光雷达飞行时间测距：激光脉冲从物体反射回来，系统根据往返时间计算距离](../images/lidar_time_of_flight.svg)

- 分母中的 2 用于计算激光的往返距离。激光雷达扫描场景后会生成**点云**，也就是一组三维坐标 $(x, y, z)$；点云通常还包含表示反射强度的数值。

- **旋转式激光雷达**（如 Velodyne）旋转激光阵列，以 360° 视场采集周围环境。典型设备每秒生成 30 万个以上的点，覆盖 64 至 128 个垂直通道，形成稀疏但几何精度较高的三维场景表示。

- **固态激光雷达**没有运动部件，而是使用光学相控阵或 MEMS 反射镜。它通常成本更低、体积更小、可靠性更高，但视场角也较窄（约 120°，而旋转式设备可达 360°）。

- 激光雷达能精确测距，但点云稀疏（点数远少于相机像素）、不包含颜色信息，而且设备成本较高。大雨、大雪或沙尘也会散射激光脉冲，降低测量效果。

- **雷达**（Radio Detection and Ranging）与激光雷达一样，使用飞行时间测距，但发射的是无线电波；车载雷达通常使用 77 GHz 毫米波。无线电波比光更能穿透雨、雾、沙尘和雪，因此雷达对天气的适应性最强。

- 雷达还可以通过多普勒效应直接测量**速度**。物体靠近传感器时，反射波的频率升高；物体远离时，反射波的频率降低。径向速度为：

$$v = \frac{\Delta f \cdot c}{2 f_0}$$

- 其中，$\Delta f$ 是频移，$f_0$ 是发射频率。雷达由此可以即时测量径向速度，无须跟踪物体或比较连续帧。

- 雷达的取舍在于分辨率：它的角分辨率远低于相机和激光雷达，因此难以区分距离较近的物体或检测细节。它能在各种天气下探测 200 米以外的车辆。

- **超声波传感器**发射高频声脉冲（40–70 kHz），再测量回声返回的时间。它的工作距离很短（0.2–5 米），主要用于停车辅助。它与激光雷达采用相同的测距原理，只是用声波代替光波：$d = \frac{v_{\text{sound}} \cdot \Delta t}{2}$，其中 $v_{\text{sound}} \approx 343$ m/s。

- **惯性测量单元**（IMU）包含加速度计和陀螺仪，分别测量线性加速度和角速度。IMU 通常以 200–1000 Hz 的高频率提供运动数据，补足更新较慢的传感器之间的空档。IMU 不直接感知环境，而是跟踪机器人的自身运动，因此常用于航位推算和状态估计。

- IMU 会发生**漂移**：测量误差随时间累积，使估计位置逐渐偏离真实位置。因此，系统通常会把 IMU 与相机、GPS 或激光雷达等传感器融合使用。

- **全球导航卫星系统**（GNSS，包括 GPS）通过多个卫星信号的三角测量确定地表绝对位置。标准 GPS 的精度约为 2–5 米，无法满足车道级驾驶需求。**实时动态 GPS**（RTK-GPS）使用固定基站校正误差，可达到厘米级精度，但需要开阔的天空视野和基站设施。

## 传感器标定

- 传感器要协同工作，必须先完成**标定**，把各自的测量结果关联到同一个坐标系。

- **内参标定**用于确定传感器的内部参数。相机内参包括焦距、主点和畸变系数（见第 08 章）；激光雷达内参包括各激光束之间精确的角度偏移。张正友棋盘格标定是一种常见方法：从多个角度拍摄已知的平面图案，据此求出相机内参矩阵。

- **外参标定**用于确定两个传感器之间的刚体变换，包括旋转 $R$ 和平移 $\mathbf{t}$。如果相机和激光雷达安装在同一辆车上，外参标定要计算一个 $4 \times 4$ 变换矩阵，把激光雷达坐标映射到相机坐标：

$$\mathbf{p}_{\text{cam}} = \begin{bmatrix} R & \mathbf{t} \\ \mathbf{0}^T & 1 \end{bmatrix} \mathbf{p}_{\text{lidar}}$$

- 这是齐次坐标下的仿射变换，与第 02 章线性变换中介绍的形式相同。矩阵若有误，激光雷达点就会投影到错误的图像位置，整个融合流程也会出错。

- **时间标定**用于同步传感器时钟。以 30 Hz 采集图像的相机和以 10 Hz 运行的激光雷达会产生不同时间戳。汽车以 30 m/s（高速公路速度）行驶时，10 ms 的时间误差相当于 30 cm 的位置误差。系统需要用硬件触发（共享时钟脉冲）或软件同步（插值时间戳）。

## 传感器融合

- 单一传感器无法覆盖所有条件。相机可以识别颜色和纹理，但缺少深度；激光雷达能精确测距，但点云稀疏且没有颜色；雷达适应各种天气，但分辨率较低。**传感器融合**结合各类传感器的优势，弥补各自的局限。

- **早期融合**（也称数据级融合）在处理前合并原始传感器数据。例如，把激光雷达点投影到相机图像上，生成每个像素同时包含颜色和深度的 RGB-D 表示；也可以根据每个点投影到的相机像素，为激光雷达点赋予颜色。早期融合保留的信息最多，但要求精确标定，也容易受传感器错位影响。

- **晚期融合**（也称决策级融合）让各传感器独立运行检测流程，再合并边界框、类别标签和置信度等最终结果。各传感器分别给出判断，融合模块再处理分歧。这种方法结构简单、模块清楚，但各检测流程无法利用其他传感器的原始数据。

- **中层融合**处理各传感器的中间特征表示。系统先用 CNN 或 Transformer 把原始数据编码到学习得到的特征空间，再组合这些特征。现代系统常采用这种方法，让网络学习从不同模态提取哪些信息。

![相机和激光雷达分别编码，再投影到同一个鸟瞰图网格中的 BEV 融合流程](../images/bev_fusion_pipeline.svg)

- **BEVFusion**是一种典型的中层融合架构。它把相机特征和激光雷达特征投影到共同的**鸟瞰图**（BEV）表示，即场景的俯视网格。相机特征根据预测的深度分布“提升”到三维，再投影到 BEV 网格；激光雷达特征本身已经是三维数据，可以直接体素化到同一网格。检测头随后处理融合后的 BEV 特征。

- BEV 表示提供统一的度量坐标系，让系统能直接推理距离、尺寸和重叠关系。在相机图像里，近处的自行车和远处的卡车可能占据相同数量的像素；在 BEV 中，系统能区分它们的实际尺寸和位置。

## 三维目标检测

- 感知需要确定三维目标的位置、大小、类别和朝向。每个检测结果都包含一个**三维边界框**：位置 $(x, y, z)$、尺寸 $(l, w, h)$、航向角 $\theta$、类别标签和置信度。

- **基于激光雷达的检测**直接处理点云。点云没有固定顺序，结构不规则，密度也不均匀：近处目标可能有数千个点，远处目标只有少数几个点。第 08 章介绍的 PointNet 使用共享 MLP 和置换不变聚合（最大池化）处理这类数据。

- **PointPillars**把地面平面离散成垂直柱体（pillar），将点云转换为结构化表示。每个柱体内的点由一个小型 PointNet 编码为固定维度的特征向量。这样得到的二维伪图像可以交给标准二维 CNN 主干处理，再连接检测头（如第 08 章的 SSD）。这种方法速度快、效果好。

- **CenterPoint**把目标检测表述为中心点预测，而不是直接预测边界框。它先在 BEV 中预测目标中心热图，再为每个峰值回归边界框属性（尺寸、高度、朝向和速度）。这是三维版的 CenterNet（见第 08 章）：它不依赖锚框，训练时无须 NMS，也能通过关联不同帧中的中心点扩展到跟踪任务。

- **纯相机三维检测**必须从二维图像推断深度，难度更高。**BEVDet** 和 **BEVFormer** 等方法使用 Transformer，把二维图像特征“提升”到三维。BEVFormer 使用空间交叉注意力：BEV 查询把特定三维参考点投影到各相机图像，再从对应位置提取特征。

- 随着深度估计改进、模型变大、时间融合累积多帧深度线索，基于相机的三维检测与激光雷达检测之间的精度差距正在缩小。时间融合跨帧累积深度线索，作用类似双目匹配。

## 深度估计

- 深度估计要为每个像素或点分配一个距离值。

- **双目匹配**使用两台间隔已知基线 $b$ 的相机。同一个三维点在两张图像中的水平位置略有不同，这种差异称为**视差** $d$。深度按下式计算（见第 08 章）：

$$Z = \frac{f \cdot b}{d}$$

- 其中，$f$ 是焦距。双目匹配需要在两张图像之间找到正确的对应点；无纹理区域、遮挡和重复图案都会增加难度。RAFT-Stereo 等现代立体网络通过相关体积和迭代优化细化匹配结果。

- **单目深度估计**从单张图像预测深度。这个问题没有唯一解，因为无数种三维场景都可能生成同一张图像。网络必须学习统计先验，例如地面通常平坦、物体离相机越远看起来越小、纹理梯度能体现表面的远近。

- 第 08 章介绍的 **Depth Anything** 使用大规模无标注数据进行自监督训练，再用带标注的数据微调，取得了较强的单目深度估计效果。它使用尺度不变损失处理深度本身的歧义，预测物体的相对深度顺序，而不是绝对米数。

- **激光雷达—相机深度融合**把稀疏激光雷达测量投影到相机图像中，作为深度监督信号。网络学习补全这些测量点之间的区域，生成结合激光雷达精度和相机分辨率的稠密深度图。

## 占用网络

- 传统感知系统为每个检测到的目标输出一个边界框。但现实中有许多物体不适合用方框表示，例如形状不规则的碎片、施工隔离物、伸出的树枝和部分坍塌的墙壁。

![不规则物体的边界框会占据大量空白区域，栅格占用表示则贴合实际几何形状](../images/occupancy_vs_bbox.svg)

- **占用网络**用稠密的三维体素网格表示场景。系统把每个体素（例如边长 0.2 米的小立方体）标记为空闲、占用或未知，也可以附加道路、人行道、车辆和植被等语义标签。

- 这种方法把感知重点从物体转向场景：系统不只检测汽车，还要判断三维空间的哪些部分被占用。它的优势是通用性强，无须预先列出所有物体类别，也能避开任意障碍物。

- 占用网络接收相机、激光雷达或两者的数据，将其编码为三维特征体积，再预测每个体素的标签。系统通常先把二维特征提升到三维（类似 BEV 构建，但还要覆盖垂直方向），再使用三维卷积或稀疏卷积处理。

- **TPVFormer**（Tri-Perspective View，三视角表示）把三维体积拆成三个互相垂直的平面：俯视、正视和侧视，从而避免完整三维注意力的立方计算成本。每个平面使用二维注意力，再在各体素处合并特征。这与第 02 章的 SVD 类似：把复杂的三维问题分解成较易处理的二维部分。

- 体素网格会直接告诉规划器哪些空间可以安全占用，因此能自然衔接感知和规划。

## 车道检测与道路拓扑

- 在结构化道路上行驶时，车辆需要理解**车道几何**：车道的位置和曲率、车道如何合并或分叉，以及车辆当前所在的车道。

- 经典方法为检测到的车道线拟合参数曲线。常用模型是三次多项式：

$$x(y) = a_0 + a_1 y + a_2 y^2 + a_3 y^3$$

- 其中，$y$ 是前方的纵向距离，$x$ 是横向偏移。这种多项式近似（见第 03 章泰勒级数）适用于曲率平滑、低阶多项式就能较好拟合的道路。系统通过对检测到的车道点进行最小二乘回归来估计系数。

- 现代方法使用神经网络直接检测车道。**LaneNet**把每条车道作为一个实例，通过嵌入分支把属于同一车道的像素归组，再拟合曲线。**GANet**使用图结构表示车道拓扑：车道点是节点，边表示连接关系，包括车道的合并、分叉和交叉口连接。

- **道路拓扑**描述的不只是单条车道曲线，还包括完整道路结构：车道之间如何连接、哪些车道允许左转、高速公路入口匝道在哪里汇入。系统用有向图表示道路拓扑，交叉口是节点，车道段是带属性的边；边属性可以包括限速、车道类型和转向限制。

- 路线规划需要道路图结构提供信息：规划器既要知道车道位置，也要找到通往目的地的车道序列。

## 语义地图

- 自主系统不会只检测单帧中的物体。系统会随着时间积累多次观察，建立**语义地图**，持续保存并组织环境信息。

- 最简单的语义地图是二维**占用栅格**，每个单元格记录被占用的概率。机器人移动并扫描环境时，会使用贝叶斯更新这些概率：

$$P(\text{occupied} \mid z_{1:t}) = \frac{P(z_t \mid \text{occupied}) \cdot P(\text{occupied} \mid z_{1:t-1})}{P(z_t)}$$

- 这是贝叶斯定理在地图中的应用（见第 05 章）：每次新的测量 $z_t$ 都会更新各单元格的先验概率。为避免连续相乘多个很小的概率产生数值问题，系统常使用**对数几率**表示：

$$l_t = l_{t-1} + \log \frac{P(z_t \mid \text{occupied})}{P(z_t \mid \text{free})}$$

- 对数几率相加等价于概率相乘，因为 $\log(ab) = \log a + \log b$。运行总和会随着新观测不断累积证据。

- 更丰富的地图会为每个单元格附加道路、人行道、建筑和植被等语义标签，也可以扩展到三维。它们与占用网络密切相关，但更关注信息的持久保存和时间累积，而不是单帧预测。

- **同步定位与建图**（SLAM，Simultaneous Localisation and Mapping）会在构建地图的同时跟踪机器人位置（见第 08 章）。视觉惯性 SLAM 融合相机和 IMU 数据；激光雷达 SLAM 使用点云配准。感知流程把检测结果和深度估计传给 SLAM，后者维护全局地图。

- 现代方法越来越多地使用 NeRF 等神经隐式表示（见第 08 章）构建稠密、逼真的地图，并支持在任意三维位置查询。神经地图把整个场景压缩存储在网络权重中，可用于新视角合成和精细空间查询。

## 编程任务（使用 Colab 或笔记本）

1. 使用投影矩阵把三维激光雷达点投影到二维相机图像中，并可视化落在图像边界内的点。

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

**说明：**原代码调用 jax.random，却只导入 jax.numpy，没有导入 jax。代码注释把点定义为 x 向前、y 向左、z 向上，但内参矩阵按相机坐标中 z 为深度的针孔模型投影；由于代码使用单位旋转矩阵，没有把激光雷达坐标转换到相机坐标系。

2. 使用贝叶斯对数几率更新建立简单的二维占用栅格。模拟测距传感器扫描环境，观察地图逐步形成。

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

3. 根据双目图像的视差计算深度。模拟三维点在两台相机中的视图，计算视差并恢复深度。

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

**说明：**原代码直接用已知深度计算视差，再从视差反算深度；它没有生成两个相机视图，也没有从图像位置计算视差，因此只能验证公式的往返计算。
