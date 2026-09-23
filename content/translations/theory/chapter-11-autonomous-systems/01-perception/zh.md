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
# 感知

*感知是自主系统把传感器观测转化为可行动环境模型的过程。本篇覆盖传感器模态、标定、融合、三维检测、深度、占据网络、车道拓扑和语义地图。*


* 概念是自主系统如何感知和解释物理世界。该文件涵盖传感器模式、校正、传感器聚变、三维物体探测、深度估计、占用网络、车道探测和语义制图、每个机器人、无人驾驶飞机和自驾车所依赖的感官基础。*

- 对于一个人类来说,感知世界是无所作为的:你看到一辆车接近,听到它的引擎,感觉到脚下地表,并立刻建立一个周围的心理模型. 一个自主的系统必须做同样的事情,但使用电子传感器和算法而不是眼睛和耳朵.

- 根本的挑战就是:传感器给你生来的数字(像素强度,点云,信号反射),系统必须把这些数字变成一个有条理的理解:"前面有行人12米,左移1.5米/秒". 这就是感知问题。

- 下游的一切(预测,规划,控制)都取决于认知. 一辆有完美规划员的自驾车 但知觉差 仍会崩溃 觉即是入出相.

## 传感器模态



- 自主系统使用多种传感器类型,每个类型都有不同的优点和故障模式. 任何单一的传感器本身都不足以满足需要。

![传感器比较:相机、LiDAR、雷达和IMU在分辨率、深度、天气稳健性、速度测量和成本上评级](../images/sensor_comparison.svg)

- ** Cameras** 以高分辨率获取密集的颜色信息。一个单一的图像包含上百万像素,每个图像记录RGB值(如我们在第8章所见). 相机价格低廉,重量轻,提供丰富的纹理和色彩信息,对阅读标志、检测交通灯和识别物体至关重要。

- 相机类型包括:**Monocular**(单镜,无自有深度),**定型**(由基线相隔出两道相距,通过第8章所覆盖的悬殊使深度得以实现)和**Fisheye**(超宽视场,180-X,有重射线扭曲,用于围观停车系统)。

- 相机的主要弱点是它们在投影时会失去深度信息. 3D场景通过针孔相机模型被映射到2D图像平面上(回顾内在矩阵)$K$摘自第8章:

$$\begin{bmatrix} u \\ v \\ 1 \end{bmatrix} = \frac{1}{Z} K \begin{bmatrix} X \\ Y \\ Z \end{bmatrix}$$

- 师曰.$Z$丢弃绝对深度。两个不同相距大小的物体可以产生相同的预测. 从一幅图像中恢复深度是不易得到的,这就是为什么需要立体相机或所学得的单相干深度模型.

- 相机也在不利的条件下挣扎:直接阳光会引起光泽,黑暗会减少信号,而雨或雾会散开光.

- **LiDAR**(光探测和测距)激光脉冲并测量每个脉冲回弹的时间。由于光线以已知的速度行走$c \approx 3 \times 10^8$m/s),每个反射点相距为:

$$d = \frac{c \cdot \Delta t}{2}$$

![LiDAR飞行时间:激光脉冲从物体上弹出,距离是从往返时间计算出来的](../images/lidar_time_of_flight.svg)

- 2的系数是往返(出站和回站)的原因. LiDAR通过扫射整个场景,构建出**点云**:一组3D坐标$(x, y, z)$,往往带有强度(反射)值。

- ** Spinning LiDAR**(如Velodyne)旋转一个激光阵列360°来产生完整的环绕视图. 典型的单位在64–128个垂直通道中每秒产生30万+分. 结果是场景呈现出稀有但几何精确的立体表现.

- ** 索利德-状态LiDAR**没有移动部件,取而代之的是使用光相相阵列或MEMS镜. 这使得它们更便宜,更紧凑,更可靠,但通常视野更窄(120°对360°).

- LiDAR给出了精确的深度,但生成了稀有的数据("像素"远少于相机),没有色彩信息,而且价格昂贵. 它也会在暴雨,雪地,或灰尘中降解,因为粒子会散去激光脉冲.

- ** Radar**(无线电探测和测距)与LiDAR在飞行时间原则上相同,但使用无线电波(毫米波,一般为77GHz用于汽车)。无线电波穿透了雨,雾,灰尘和雪比光好得多,使雷达成为了最强的天气-扰动传感器.

- 雷达还通过多普勒效应直接测量**速度**。当一个物体向传感器移动时,反射波会被压缩(更高的频率);在移动后会被拉伸(更低的频率). 速度为:

$$v = \frac{\Delta f \cdot c}{2 f_0}$$

- 地点$\Delta f$是频率变化和$f_0$是传输频率。这使得瞬间射线速度无需任何跟踪或帧到帧计算.

- 取舍是分辨率:雷达比相机或LiDAR具有许多相干角分辨率,使其在区分相邻物体或探测出细节上差. 它擅长在任何天气下探测远距离(200多米)的车辆。

- ** Ultrasonic传感器** 发射高频声波脉冲(40-70千赫)并测量回声回放时间。它们的工作范围很短(0.2至5米),主要用于停车援助。他们的物理原理与LiDAR相同,但用声音代替光线,所以$d = \frac{v_{\text{sound}} \cdot \Delta t}{2}$地点$v_{\text{sound}} \approx 343$小时/秒。

- **IMU**(惯性测量单位)中包含分别测量线性加速和角速度的加速计和陀螺仪. IMU提供高频运动数据(通常为200–1000 Hz)来填补较慢传感器更新之间的空白. 他们不直接感知环境,而是跟踪机器人的自发动作,使得它们对于死后和状态估计至关重要.

- IMU受到**干燥**:小的测量错误随时间而累积,导致估计位置偏离现实。这就是为什么IMU几乎总是与其他传感器(相机、全球定位系统、LiDAR)相接,而不是单独使用。

- **GNSS**(全球导航卫星系统,包括全球定位系统)通过多颗卫星的三角信号在地球表面提供绝对位置。标准GPS精度为2~5米,不足以进行车道一级行驶. **RTK-GPS**(Real-Time Kinematic)使用固定基站来校正出错,实现厘米平分精度,但需要清晰的天景和基站基础设施.

## 传感器标定



- 在传感器可以一起工作之前,它们必须被**校正**:每个传感器的测量必须与一个共同的坐标框架相接.

- **Intrinsic校正**决定了传感器的内部参数. 对于相机,这意味着焦距、主点和扭曲系数(如第8章所涵盖)。对LiDAR来说,指激光束之间的精确角相抵. 一种常见的方法是张作霖的"检查板校正",从多角度观察出已知的平面图案来解析内在矩阵.

- **外向校正** 确定刚性转换(旋转)$R$翻译$\mathbf{t}$介于两个传感器之间。如果一个相机和LiDAR安装在同一辆车上,外部校正就会发现$4 \times 4$将 LiDAR 坐标指向相机坐标的变换矩阵 :

$$\mathbf{p}_{\text{cam}} = \begin{bmatrix} R & \mathbf{t} \\ \mathbf{0}^T & 1 \end{bmatrix} \mathbf{p}_{\text{lidar}}$$

- 这是同位素坐标的同位素转化, 正是我们在第二章(线性转换)中研究的那种. 使这个矩阵错误意味着LiDAR将项目指向错误的像素,整个聚变管中断.

- ** 时间校正** 同步传感器钟. 摄相机拍摄时为30赫兹,LiDAR拍摄时为10赫兹。如果一辆车以30m/s的速度行驶(高速行驶速度),则一个10ms的计时出错相当于30cm的空间出错. 硬件触发(共享时钟脉冲)或软件同步(时间戳之间的插入)是不可或缺的.

## 传感器融合



- 没有单个传感器覆盖所有条件. 相机可以看到颜色和纹理但失去深度. LiDAR精确地测量了深度,但又稀少又无色. 雷达在任何天气都起作用,但分辨率很低。**传感器聚变**结合其长处并弥补了个别弱点.

- ** 早期聚变**(或数据级聚变)在进行任何处理之前结合原始传感器数据。例如,将LiDAR指向相机图像来创建 RGBD 代表(颜色+深度每像素),或者用相机像素的颜色来描绘每个LiDAR点。这保存了大多数信息,但需要精确校正,并且对错配敏感.

- **Late聚变**(或决策级聚变)通过自己的检测管独立处理每个传感器,再将最终输出(边框,类标签,置信分数)合并. 每个传感器投票,一个聚变模块调和了分歧. 这更简单,模块化程度更高,但每条管线都无法从其他传感器的原始数据中受益.

- ** 中层聚变**在中间特征表示上运作。每个传感器的原始数据被编码成一个已学到的特征空间(使用CNN或变压器),然后这些特征被合并. 这是现代系统中的主导方法,因为它让网络学习从每一种模式中提取什么.

![BEV聚变管道:相机和LiDAR被独立编码后投放到共享的鸟眼-视网格中](../images/bev_fusion_pipeline.svg)

- **BEVFusion**是一个具有代表性的中层聚变架构. 它将相机特性和LiDAR特性都投射到一个常见的**鸟眼-视(BEV)**代表,一个由上而下地网格的场景. 相机的特性是使用预测深度分布来"提升"到3D,再被溅入BEV网格. LiDAR特性已经是3D并直接被活化到同一个网格上. 引信的BEV特性随后由检测头处理.

- BEV的表示力很强,因为它提供了一个统一的,度量坐标框架,其中空间推理(距离,大小,重叠)是直截了当的. 在相机图像中,附近的自行车和远方的卡车可能占用了同样数量的像素. 在BEV中,它们的真实大小和位置是明确的.

## 三维目标检测



- 感知的核心任务是在3D中检测出物体:它们在哪里,有多大,是什么,它们面临什么? 每个探测器都是有位置的**3D边框**$(x, y, z)$,维度$(l, w, h)$,标题角度$\theta$分类标签和信心分数

- ** 基于LiDAR的探测**直接在点云上运行。挑战在于点云无序,不规则,并因密度而异(相近物体有上千个点,相去遥远的则有上下数个点). 从第8章中回顾,PointNet用共享的MLP和一通-不定式聚合(最大集合)来处理这个问题.

- **PointPillers**通过将地平面的圆盘化为垂直柱("柱")的网格来将点云转换为结构化的表示. 每个支柱内的所有点被小点网编码成固定大小的特性向量. 结果是一个由标准2D的CNN主干线处理而成的2D伪图像,然后是检测头(像第8章的SSD架构). 这是迅速而有效的。

- ** CenterPoint** 检测物体是点而不是框。它预测了BEV中对象中心的热映射,然后递回每个峰值的框属性(大小,高度,方向,速度). 这是CenterNet(第8章)的3D模拟:无锚地,培训期间不需要NMS,自然延伸至通过连接中心点跨帧进行跟踪.

- ** Camera - 仅3D检测** 必须从2D图像推断出深度,这从根本上来说更难. 现代方法如**BEVDet**和**BEVFormer**使用变压器架构来"提升"2D图像特性到3D. BEVFormer使用空间交叉注意:BEV查询处理投放在每个相机图像上的特定3D参考点,从相关位置取出特征.

- 基于LiDAR和相机的3D探测之间的精度差距正在迅速缩小,其动力是更好的深度估计,更大的模型,以及时间聚变(使用多帧来积累深度提示,类似于立体匹配如何工作但跨时间).

## 深度估计



- 深度估计是给每个像素或点分配距离值的问题.

- **Stereo配对**使用两个相机,用已知基线相隔$b$。。。相同的3D点出现在两个图像中稍有不同的水平位置上(**分差**$d$) (中文(简体)). 深度按(从第8章)计算:

$$Z = \frac{f \cdot b}{d}$$

- 地点$f$是焦距。挑战在于如何在两个图像之间找到正确的对应关系,特别是在无纹理区域、被隔离区和重复模式中。现代立体声网络(如RAFT-Stereo)采用与相關音量相接的迭代完善.

- ** 分子深度估计** 从一个图像预测出深度。由于这个位置不合理(无限多的3D场景可以产生相同的图像),网络必须学习统计学前科:"地板平平","对象随着距离变小","纹理梯度表示还原表面".

- ** " 深度任何东西 " **(载于第8章),通过对带有自导自导的大型无标签数据集进行培训,然后对贴有标签的数据进行微调,从而实现强烈的单相深度。关键洞察力是,规模-变化性损失处理出固有的模糊性:模型预测出相对深度(顺序)而不是绝对米.

- ** LiDAR-相机深度聚变** 工程在相机图像上进行稀疏的LiDAR深度测量作为监控. 网络学习"填充"稀有点之间的空隙,生成将LiDAR的精度与相机分辨率相结合的密集深度地图.

## 占据网络



- 传统感知输出出一个边框列表,每个被检测到的对象一个. 但现实世界中有许多东西不整齐地装入盒子中:奇特地形状的碎片,建筑障碍,倒挂的树枝,一堵被部分倒塌的墙.

![在不规则外形上设置垃圾箱;占用网按实际几何设置](../images/occupancy_vs_bbox.svg)

- ** 占用网络** 代表场景为密集的3D voxel网格. 每只花瓶(一个小的空间立方体,如:0.2m×0.2m×0.2m)被归类为自由取出,被占用取出,或未知,可选取语义标签(道路,人行道,车辆,植被等).

- 这是从以物体为中心的感知("探测出汽车")到以场景为中心的感知("3D空间的哪些部分被占用了?")的转变. 优点是通俗性:系统不需要预先定义的对象类别列表来避免与任意障碍相撞.

- 在建筑学上,入住网络将传感器输入(cameras,LiDAR,或两者兼收并收),将其编码为3D特性体积,并预测出每伏克塞尔的标签. 3D特征体积一般通过将2D特征提升到3D来构建(类似于BEV构造但垂直延伸)并用3D分化或稀疏分化来进行处理.

- **TPVFormer**(Tri-Perspective View)通过将3D音量分为三正弦平面(上下相接,前相接,侧相接相接相接)来避免了三维全能关注的立方体成本. 每平面使用2D注意力,其特征被结合到每个花瓶上. 这让人想起了SVD如何将矩阵分解成更简单的因子(第二章):将一个硬的3D问题分解成可管理的2D片.

- 输出 voxel 网格直接告诉规划者哪个空间区域是安全的,哪些没有,使其成为感知和规划之间的自然界面.

## 车道检测与道路拓扑



- 对于结构化道路上的车辆,理解**车道几何**至关重要. 系统必须知道车道在哪里,车道如何曲线,车道合并和分道行驶,车辆在哪个车道.

- 古典方法与被探测到的道标相匹配参数曲线. 一个常见的模型是三级多诺米:

$$x(y) = a_0 + a_1 y + a_2 y^2 + a_3 y^3$$

- 地点$y$是前面的纵向距离,并且$x$页:1 这是一种多诺相近(从第3章中召回泰勒系列),之所以选取,是因为道路是平滑的曲线被低度多诺相接而成. 系数是通过所检测出道口上最小平方回归法来估算的.

- 现代方法使用神经网络直接检测道. **LaneNet**将每个车道作为实例对待,并使用嵌入分支来组合属于同道的像素,再进行曲线相接. ** GANet** 采用以图表为基础的方法,代表道道地貌,作为指向图,其中节点为道口和边缘编码连接(道道在相交处合并,分出或相接).

- **行道地貌**超越了单行道曲线来捕捉全行道结构:行道之间如何相通,由哪条道允许左转而行道相通,其中一出行道的行道在行道上会合并. 这是以定向图为模型,其中相交点为节点,道段为有属性的边缘(速度限制,道型,转弯限制).

- 图表结构对于路线规划至关重要:规划者需要知道的不仅仅是"车道在哪里",而是"哪一个车道顺序通向目的地".

## 语义地图



- 感知不以单帧探测物体而为结束. 随着时间的推移,一个自主的系统构建出**语义图**:持续地、有条理地代表其环境,通过许多观测积累信息。

- 最简单的是,一个语义图是一个2D网格(一个**占用网格**),每个细胞存储被占用的概率. 当机器人用传感器移动和扫描时,它利用贝叶斯语的更新来更新这些概率:

$$P(\text{occupied} \mid z_{1:t}) = \frac{P(z_t \mid \text{occupied}) \cdot P(\text{occupied} \mid z_{1:t-1})}{P(z_t)}$$

- 这是Bayes的定理(来自第五章):每个新的测量$z_t$更新每个单元格的先前的信念。通常使用**log-odds** 表示法来避免数字问题,因为许多小概率乘以:

$$l_t = l_{t-1} + \log \frac{P(z_t \mid \text{occupied})}{P(z_t \mid \text{free})}$$

- 添加对数等于乘法概率(回顾$\log(ab) = \log a + \log b$),且运行中的总和自然会随着时间的推移而积累出证据.

- 更丰富的地图为每个细胞(道路,人行道,建筑,植被)分配语义标签并可以延伸至3D. 这些都与占用网络密切相关,但强调持久性和时间汇总,而不是单一框架的预测。

- **SLAM**(同时定位和绘图),涵盖于第8章,是构建地图同时跟踪机器人在地图内位置的算法. 视觉-惯性 SLAM引信相机和IMU数据; LiDAR SLAM使用点云注册. 感知管道将探测和深度估计输入维持全球地图的SLAM系统。

- 现代方法越来越多地使用神经隐含的表示法(如第8章的NERFs)来构建密集的,光现实主义的地图,在任何3D点都可以被询问. 这些神经图将整个场景的压缩表现存储在网络权重中,使任务如新颖的视图合成和详细的空间查询成为可能.

## 编程任务（使用 Colab 或 notebook）



1. 3D LiDAR工程使用投影矩阵将相机图像指向了2D相机. 视同属于图像界限内的分数。
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

2. 使用 Bayesian 日志代码更新, 构建一个简单的 2D 占用网格。模拟范围传感器扫描环境,并观看地图出现.
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

3. 利用差异从一对立体图像中计算出深度。模拟三维点的两个相机视图,计算差分,并恢复深度.
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
