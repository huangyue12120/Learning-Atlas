---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 08 - computer vision/05. video and 3D vision.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 2f5aab15f8b0b5afebb8fbecd66e4682e9c4a2557db5f164c577d7b08a52ea3f
status: reviewed
---
# 视频与三维视觉

*视频与三维视觉将图像理解扩展到时间和空间维度。本文介绍光流、视频分类（3D CNN、TimeSformer）、目标跟踪（SORT、DeepSORT）、动作识别、深度估计（单目和双目）、点云、NeRF 和三维高斯泼溅（3D Gaussian Splatting）。*

- 前面第 01 至 04 篇都把图像当作彼此独立的静态画面。但现实视觉世界是连续的：物体会移动，场景会变化，空间中还有深度。本篇将计算机视觉扩展到时间维度（视频）和空间维度（三维），介绍模型如何理解运动、跟踪物体、估计深度和重建场景。

- **视频**是按时间顺序采集的一系列图像（帧）。如果帧率为每秒 30 帧，一段 10 秒的视频就包含 300 帧。核心挑战在于建模**时间维度**：物体如何移动、场景如何变化，以及如何关联不同帧中的信息？

- **光流**估计连续两帧之间像素表观运动的方向和幅度。对第 $t$ 帧中的每个像素，光流会给出一个二维位移向量 $(u, v)$，指出该像素在第 $t+1$ 帧中移动到哪里。最终得到与图像大小相同的稠密运动场。

![连续两帧视频及其光流场，用彩色箭头表示像素运动的方向和幅度](../images/optical_flow.svg)

- 光流的计算基于**亮度恒定假设**：像素移动时，其强度值保持不变。若第 $t$ 帧中位置 $(x, y)$ 的像素强度为 $I(x, y, t)$，并在短时间间隔 $\delta t$ 内移动 $(u, v)$：

$$I(x + u\delta t, \, y + v\delta t, \, t + \delta t) = I(x, y, t)$$

- 对等式进行一阶泰勒展开（见第 03 章），再除以 $\delta t$：

$$I_x u + I_y v + I_t = 0$$

- 其中，$I_x, I_y$ 是空间梯度（用 Sobel 算子计算，见文件 01），$I_t$ 是时间梯度（相邻帧之差）。这就是**光流约束方程**。一个方程包含两个未知数 $u, v$，因此还需要额外约束。

- **Lucas–Kanade** 方法假设一个小窗口内的光流恒定（例如 5×5 像素）。这样会得到一个超定方程组（25 个方程、2 个未知数），可用最小二乘法求解（见第 06 章的正规方程）：

```math
\begin{bmatrix} u \\ v \end{bmatrix} = \begin{bmatrix} \sum I_x^2 & \sum I_x I_y \\ \sum I_x I_y & \sum I_y^2 \end{bmatrix}^{-1} \begin{bmatrix} -\sum I_x I_t \\ -\sum I_y I_t \end{bmatrix}
```

- 其中的 2×2 矩阵就是文件 01 介绍的结构张量，也是 Harris 角点检测使用的矩阵。Lucas–Kanade 适用于小幅运动；如果物体在两帧之间移动了几个像素以上，效果就会变差。

- **Farnebäck 方法**对每个像素周围的邻域拟合多项式展开，再估计最能解释两帧变化的位移场。它能为每个像素生成一个向量，得到稠密光流；与 Lucas–Kanade 相比，也能处理幅度更大的运动。

- 现代**深度学习光流**方法（FlowNet、RAFT）使用成对的视频帧端到端地学习光流。**RAFT**（Recurrent All-Pairs Field Transforms，Teed 和 Deng，2020）会计算两帧中所有像素对之间的四维相关性体，并使用基于 GRU 的更新算子迭代细化光流估计。RAFT 的精度达到当时的先进水平，现已成为常用的光流主干网络。

- **双流网络**（Simonyan 和 Zisserman，2014）是早期的视频理解方法之一。一条分支处理单个 RGB 帧以提取外观信息；另一条分支处理一组光流帧以提取运动信息。两条分支的输出在末端融合（取平均或拼接）。这种架构明确区分“物体看起来怎样”和“物体如何运动”。

- **3D 卷积网络**将二维卷积扩展到时间维度。3D 卷积使用尺寸为 $k \times k \times k_t$ 的滤波器，同时覆盖空间和时间维度，直接学习时空特征。

- **C3D**（Tran 等，2015）堆叠了使用 3×3×3 滤波器的 3D 卷积，证明无需显式计算光流，时间卷积也能学到运动特征。代价是计算量较大：与对应的二维卷积相比，3D 卷积的参数量和计算量都会增加到 $k_t$ 倍。

- **I3D**（Inflated 3D，Carreira 和 Zisserman，2017）采用了更实用的做法：从预训练的二维 CNN（如 Inception 或 ResNet）出发，将每个二维滤波器沿时间维度复制，再除以 $k_t$，从而扩展为 3D 滤波器。这种方法在增加时间建模能力的同时，将 ImageNet 预训练迁移到视频任务。二维的 $k \times k$ 滤波器会变为 $k \times k \times k_t$ 滤波器，并按以下方式初始化：对所有时间位置 $j$，$W_{\text{3D}}[:,:,j] = W_{\text{2D}} / k_t$。

- **SlowFast 网络**使用两条并行路径，分别处理不同时间分辨率的视频：
    - **Slow 路径**以较低帧率处理视频（例如每 16 帧取一帧），并使用较高空间分辨率和较多通道，以捕捉精细空间信息。
    - **Fast 路径**以较高帧率处理视频（例如每 2 帧取一帧），但空间分辨率较低、通道数较少（通常为 Slow 路径的 $1/8$），以捕捉快速的时间变化。
    - 横向连接通过带步长的卷积将 Fast 路径的信息融合到 Slow 路径。

- 其核心观察是，空间信息和时间信息所需的带宽不同：物体外观变化较慢，运动却可能很快。SlowFast 的结构专门利用了这种差异。

- **TimeSformer**（Bertasius 等，2021）将视觉 Transformer 用于视频。直接计算完整时空注意力的成本极高：对 $T$ 帧、每帧 $N$ 个图像块，复杂度为 $O((T \times N)^2)$。TimeSformer 将其分解为**分解注意力**：每个模块交替计算时间注意力（每个图像块关注不同帧中相同空间位置的信息）和空间注意力（每个图像块关注同一帧中不同空间位置的信息）。复杂度因此降为 $O(T^2N + TN^2)$。

> 注：原文将分解注意力的复杂度写为 $O(T^2 + N^2)$，但按每帧 $N$ 个图像块、共 $T$ 帧计算，还需乘上相应的图像块数和帧数因子；译文按此更正。

- **VideoMAE**（Tong 等，2022）将掩码自编码器（见文件 04）扩展到视频。视频存在很强的时间冗余：相邻帧往往几乎相同。因此可以使用很高的掩码比例（90%–95%），即使遮住大部分图像块，仍有足够信息用于重建。VideoMAE 在未标注视频上预训练 ViT 主干网络，再将其迁移到下游任务。

- **动作识别**将视频片段分类为多个动作类别之一（例如“跑步”“做饭”“弹吉他”），相当于视频领域的图像分类。常用基准包括 Kinetics-400（400 个动作类别、约 30 万段视频）、Something-Something（174 个需要时间推理的细粒度动作）以及 ActivityNet（200 个类别，视频较长且未裁剪）。

- **时间动作检测**比分类更进一步：给定一段长而未裁剪的视频，找出每个动作的开始时间、结束时间和类别。这是目标检测在时间维度上的对应任务。ActionFormer 等方法使用 Transformer 处理时间特征并预测动作边界。

- **视频目标跟踪**会在第一帧识别某个目标后，持续跟踪它在后续帧中的位置。

- **SORT**（Simple Online and Realtime Tracking，Bewley 等，2016）将检测模型（逐帧独立检测对象）与用于运动预测的**卡尔曼滤波器**、用于数据关联的**匈牙利算法**结合起来。

- **卡尔曼滤波器**为每个跟踪目标维护状态估计（位置、速度、大小），并使用线性运动模型预测它在下一帧的位置。收到新的检测结果后，滤波器根据预测和观测各自的不确定性，为两者加权并更新状态估计。这是贝叶斯更新（见第 05 章）在目标跟踪中的应用。

- **匈牙利算法**用于求解二分图指派问题：给定 $M$ 个跟踪目标和 $N$ 个新检测结果，找出总成本最低的一对一匹配（使用文件 03 中的 IoU 距离）。未匹配的检测结果会启动新轨迹；未匹配的轨迹则会在宽限期后终止。

> 注：原文写作 bilinear assignment problem；匈牙利算法求解的是二分图指派问题。

- **DeepSORT**在 SORT 的基础上加入**深度外观特征**：每个检测到的对象都经过一个小型 CNN，生成外观嵌入（描述向量）。匹配成本结合 IoU 距离和嵌入空间中的余弦距离（见第 01 章）。即使对象被遮挡数帧后再次出现，外观嵌入也能帮助重新识别和匹配。

- **ByteTrack**（Zhang 等，2022）利用所有检测结果改进跟踪，包括置信度较低的结果。多数跟踪器会丢弃低于置信度阈值的检测框。ByteTrack 先将高置信度检测结果与现有轨迹匹配，再将剩余的低置信度结果与尚未匹配的轨迹关联。这能找回暂时被遮挡或画面模糊、因而检测置信度较低的对象。

- **三维视觉**用于恢复二维图像投影中丢失的第三个空间维度（见文件 01）。

- **深度估计**用于预测场景中每个点到相机的距离。

- **双目深度估计**使用两台间隔已知基线距离 $b$ 的相机。同一场景点在左右图像中的水平位置不同，这个偏移称为**视差** $d$。深度与视差成反比：

$$Z = \frac{f \cdot b}{d}$$

- 其中，$f$ 是焦距，$b$ 是基线距离。计算视差需要在两幅图像中找到对应点（即双目匹配）。由于两台相机水平排列，三维空间中高度相同的点会投影到两幅图像的同一行，因此只需沿水平方向搜索。

- **单目深度估计**根据单张图像预测深度。从根本上说，这是一个病态问题：无数个三维场景都可能生成相同的二维图像。但人类可以轻松利用相对大小、纹理梯度、遮挡和大气雾霾等线索估计深度，深度网络也会从训练数据中学习这些线索。

- **MiDaS** 和 **Depth Anything** 等模型可从单张图像预测相对深度图，用于判断哪些对象更近。它们在多样化数据集上训练，使用尺度不变损失；尽管该问题存在理论上的歧义，仍能得到相当准确的结果。

- **点云**是由三维点 $(x, y, z)$ 构成的集合，还可以包含颜色等属性。点云可由 LiDAR 传感器或双目重建获得。与图像不同，点云没有固定顺序，点的分布也不规则。

- **PointNet**（Qi 等，2017）直接处理点云：对每个点独立应用共享的多层感知机，再通过最大池化聚合结果。最大池化具有置换不变性，因此解决了点的顺序问题。**PointNet++**通过分层分组捕捉多个尺度的局部结构。

- **神经辐射场（NeRF）**（Mildenhall 等，2020）用一个连续函数表示三维场景：输入三维位置 $(x, y, z)$ 和观察方向 $(\theta, \phi)$，输出颜色 $(r, g, b)$ 与密度 $\sigma$。这个函数由多层感知机参数化：

$$F_\theta: (x, y, z, \theta, \phi) \to (r, g, b, \sigma)$$

- 为了渲染一个像素，从相机穿过该像素向场景中发射一条射线。在射线上采样若干点，再由多层感知机预测每个点的颜色和密度。像素颜色通过**体渲染**计算：沿射线对颜色按密度加权积分：

$$C(\mathbf{r}) = \int_{t_n}^{t_f} T(t) \cdot \sigma(\mathbf{r}(t)) \cdot \mathbf{c}(\mathbf{r}(t), \mathbf{d}) \, dt$$

- 其中，$T(t) = \exp(-\int_{t_n}^{t} \sigma(\mathbf{r}(s)) \, ds)$ 是累计透射率，表示仍能穿过此前介质的光线比例。实际计算时，会沿射线采样 $N$ 个点，将积分近似为求和：

> 注：原文将 $T(t)$ 解释为“到目前为止被吸收的光量”，但该式定义的是累计透射率，即仍能穿过介质的光线比例。

$$\hat{C} = \sum_{i=1}^{N} T_i \cdot (1 - \exp(-\sigma_i \delta_i)) \cdot c_i$$

- NeRF 使用一组带相机位姿标注的照片训练，最小化渲染像素与真实像素之间的均方误差（MSE）。训练完成后，它可以从任意相机位置渲染逼真的新视角。其缺点是速度慢：每个采样点、每个像素都要计算一次多层感知机，渲染一张图像需要执行数百万次计算，因此难以实时渲染。

- **三维高斯泼溅**（3D Gaussian Splatting，Kerbl 等，2023）用一组三维高斯基元表示场景，而不是连续的体积函数，从而解决 NeRF 的速度问题。每个高斯基元包含三维位置（均值）、控制形状和朝向的三维协方差矩阵、不透明度，以及颜色；颜色用球谐函数表示，以支持视角相关效果。

- 渲染时，将每个三维高斯基元投影到图像平面，得到二维高斯“泼溅”，再按深度排序，并使用 Alpha 混合从前向后合成。这个光栅化过程可由 GPU 实时执行（每秒 100 帧以上），比 NeRF 的光线步进快几个数量级。三维高斯泼溅的画质可匹敌甚至超过 NeRF，同时支持实时渲染。

- **同步定位与建图（SLAM）**指在未知环境中一边构建地图、一边跟踪相机位置。这项技术是机器人、自动驾驶和增强现实的基础。

- **视觉里程计**通过跟踪图像中的特征，估计相机从一帧到下一帧的运动。它会匹配连续帧中的特征点（如 SIFT、ORB，见文件 01），再根据这些对应点，通过**本质矩阵**估计相机的旋转和平移。本质矩阵编码两个视图之间的几何关系，可由文件 01 中介绍的内参和外参推导得到。

- **基于特征的 SLAM**在视觉里程计基础上维护一张持续更新的地图。**ORB-SLAM**（Mur-Artal 等，2015）是使用最广泛的基于特征的 SLAM 系统之一，包含三个并行线程：
    1. **跟踪**：将每个新帧中的 ORB 特征与地图匹配，并通过 PnP（透视 n 点）和 RANSAC 估计相机位姿。
    2. **局部建图**：根据匹配特征三角化新的地图点，并通过束调整优化这些点的位置，使所有观测到该点的视图中的重投影误差最小。
    3. **回环检测**：利用视觉词袋检测相机是否回到已建图区域，再通过全局优化地图来校正累计漂移。

- **LiDAR SLAM**使用 LiDAR 传感器采集的三维点云，而不是（或同时使用）相机图像。LiDAR 能直接测量深度，因此几何估计更稳健，但硬件成本更高。LOAM（LiDAR Odometry and Mapping）等方法使用迭代最近点（ICP）配准连续扫描得到的点云。

- **视觉惯性 SLAM**将相机数据与惯性测量单元（IMU）的测量值（加速度计 + 陀螺仪）融合。IMU 能高频估计旋转和加速度，填补相机帧之间的信息空隙，也能应对快速运动或视觉特征暂时丢失的情况。

- **VR/AR**是对计算机视觉要求最高的应用场景之一。

- **姿态估计**从图像中确定人体（或面部、手部）的位置和朝向。**人体姿态**通常表示为一组二维或三维关键点（关节）位置，例如肩、肘、腕、髋、膝和踝。**OpenPose** 和 **MediaPipe** 等模型使用热图回归预测这些关键点：每个关节对应一张热图，峰值表示关节位置。

- **自顶向下**方法先用边界框检测器（见文件 03）检测人物，再在每个框内估计姿态。**自底向上**方法先检测图像中的所有关键点，再用部件亲和场将它们分组成不同个体。部件亲和场是表示相连关节关联关系的向量场。

- **场景重建**根据传感器数据构建环境的三维模型。在 AR 中，这使虚拟物体能够放置在真实表面上、被真实物体遮挡，并投下虚拟阴影。基于深度传感器的 ARKit、ARCore 等实时场景重建系统会构建稀疏网格，并随着用户移动持续更新。

- VR 对**实时渲染**的要求极高：为避免晕动症，左右眼需要分别以每秒 90 帧以上的速度渲染；从头部移动到显示更新的延迟必须低于 20 毫秒。**注视点渲染**（通过眼动追踪，只在用户注视处以高分辨率渲染）和**重投影**（根据新的头部姿态扭曲上一帧，在下一帧完成前填补画面）等技术是满足这些要求的关键。

- 实时神经渲染（三维高斯泼溅）、稳健跟踪（视觉惯性 SLAM）和高效姿态估计逐渐融合，使逼真、可交互的 AR/VR 体验越来越可行。

## 编程任务（使用 Colab 或笔记本）

1. 从头实现 Lucas–Kanade 光流算法，计算一个正方形向右移动的两帧合成图像之间的光流。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

def lucas_kanade(frame1, frame2, window_size=5):
    """Lucas-Kanade optical flow."""
    # Compute gradients
    Ix = jnp.zeros_like(frame1)
    Iy = jnp.zeros_like(frame1)
    It = frame2 - frame1

    # Sobel-like gradients
    Ix = Ix.at[1:-1, :].set((frame1[2:, :] - frame1[:-2, :]) / 2)
    Iy = Iy.at[:, 1:-1].set((frame1[:, 2:] - frame1[:, :-2]) / 2)

    H, W = frame1.shape
    half_w = window_size // 2
    u = jnp.zeros_like(frame1)
    v = jnp.zeros_like(frame1)

    for i in range(half_w, H - half_w):
        for j in range(half_w, W - half_w):
            Ix_win = Ix[i-half_w:i+half_w+1, j-half_w:j+half_w+1].ravel()
            Iy_win = Iy[i-half_w:i+half_w+1, j-half_w:j+half_w+1].ravel()
            It_win = It[i-half_w:i+half_w+1, j-half_w:j+half_w+1].ravel()

            A = jnp.stack([Ix_win, Iy_win], axis=1)
            ATA = A.T @ A
            ATb = -A.T @ It_win

            # Check if the system is well-conditioned
            det = ATA[0,0] * ATA[1,1] - ATA[0,1] * ATA[1,0]
            if jnp.abs(det) > 1e-6:
                flow = jnp.linalg.solve(ATA, ATb)
                u = u.at[i, j].set(flow[0])
                v = v.at[i, j].set(flow[1])

    return u, v

# Create two frames: a white square that moves right
frame1 = jnp.zeros((64, 64))
frame1 = frame1.at[20:40, 15:35].set(1.0)

frame2 = jnp.zeros((64, 64))
frame2 = frame2.at[20:40, 20:40].set(1.0)  # shifted 5 pixels right

u, v = lucas_kanade(frame1, frame2, window_size=7)

# Visualise
fig, axes = plt.subplots(1, 3, figsize=(14, 4))
axes[0].imshow(frame1, cmap='gray'); axes[0].set_title('Frame 1'); axes[0].axis('off')
axes[1].imshow(frame2, cmap='gray'); axes[1].set_title('Frame 2'); axes[1].axis('off')

# Quiver plot of flow (subsample for clarity)
step = 4
Y, X = jnp.mgrid[0:64:step, 0:64:step]
axes[2].imshow(frame1, cmap='gray', alpha=0.5)
axes[2].quiver(X, Y, u[::step, ::step], v[::step, ::step],
               color='#e74c3c', scale=50, width=0.005)
axes[2].set_title('Optical Flow'); axes[2].axis('off')

plt.tight_layout(); plt.show()

# Check average flow in the moving region
region_u = u[20:40, 15:35]
print(f"Average horizontal flow in object region: {region_u[region_u != 0].mean():.2f} pixels")
```

2. 实现用于二维目标跟踪的简易卡尔曼滤波器。模拟带噪轨迹，并展示卡尔曼滤波如何平滑估计结果。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def kalman_predict(x, P, F, Q):
    """Kalman filter prediction step."""
    x_pred = F @ x
    P_pred = F @ P @ F.T + Q
    return x_pred, P_pred

def kalman_update(x_pred, P_pred, z, H, R):
    """Kalman filter update step."""
    y = z - H @ x_pred                        # innovation
    S = H @ P_pred @ H.T + R                  # innovation covariance
    K = P_pred @ H.T @ jnp.linalg.inv(S)      # Kalman gain
    x_updated = x_pred + K @ y
    P_updated = (jnp.eye(len(x_pred)) - K @ H) @ P_pred
    return x_updated, P_updated

# State: [x, y, vx, vy]
dt = 1.0
F = jnp.array([[1, 0, dt, 0],    # state transition
                [0, 1, 0, dt],
                [0, 0, 1, 0],
                [0, 0, 0, 1]])
H = jnp.array([[1, 0, 0, 0],     # observation: we measure x, y
                [0, 1, 0, 0]])
Q = jnp.eye(4) * 0.01            # process noise
R = jnp.eye(2) * 4.0             # measurement noise (noisy detector)

# Simulate ground truth: circular motion
n_steps = 50
t = jnp.linspace(0, 2 * jnp.pi, n_steps)
true_x = 10 * jnp.cos(t) + 20
true_y = 10 * jnp.sin(t) + 20

# Noisy observations
key = jax.random.PRNGKey(42)
noise = jax.random.normal(key, (n_steps, 2)) * 2.0
obs_x = true_x + noise[:, 0]
obs_y = true_y + noise[:, 1]

# Run Kalman filter
x = jnp.array([obs_x[0], obs_y[0], 0.0, 0.0])  # initial state
P = jnp.eye(4) * 10.0                             # initial uncertainty

kalman_x, kalman_y = [], []
for i in range(n_steps):
    x, P = kalman_predict(x, P, F, Q)
    z = jnp.array([obs_x[i], obs_y[i]])
    x, P = kalman_update(x, P, z, H, R)
    kalman_x.append(x[0])
    kalman_y.append(x[1])

kalman_x = jnp.array(kalman_x)
kalman_y = jnp.array(kalman_y)

# Visualise
plt.figure(figsize=(8, 8))
plt.plot(true_x, true_y, 'k-', linewidth=2, label='Ground Truth')
plt.scatter(obs_x, obs_y, c='#e74c3c', s=20, alpha=0.5, label='Noisy Observations')
plt.plot(kalman_x, kalman_y, '#3498db', linewidth=2, label='Kalman Filter')
plt.legend(); plt.grid(alpha=0.3)
plt.title('Kalman Filter Tracking')
plt.xlabel('x'); plt.ylabel('y')
plt.axis('equal'); plt.show()

obs_error = jnp.mean(jnp.sqrt((obs_x - true_x)**2 + (obs_y - true_y)**2))
kalman_error = jnp.mean(jnp.sqrt((kalman_x - true_x)**2 + (kalman_y - true_y)**2))
print(f"Observation RMSE: {obs_error:.2f}")
print(f"Kalman filter RMSE: {kalman_error:.2f}")
print(f"Error reduction: {(1 - kalman_error/obs_error) * 100:.1f}%")
```

3. 实现一个简化版 NeRF 体渲染流程：让射线穿过由已知颜色和密度的球体构成的简单三维场景，并沿每条射线积分以渲染图像。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def render_ray(origin, direction, spheres, n_samples=64, t_near=1.0, t_far=6.0):
    """Volume render a single ray through a scene of spheres."""
    t_vals = jnp.linspace(t_near, t_far, n_samples)
    deltas = jnp.concatenate([jnp.diff(t_vals), jnp.array([1e-3])])

    colour = jnp.zeros(3)
    transmittance = 1.0

    for i in range(n_samples):
        point = origin + t_vals[i] * direction

        # Compute density and colour at this point
        density = 0.0
        point_colour = jnp.zeros(3)

        for center, radius, col, sigma in spheres:
            dist = jnp.linalg.norm(point - center)
            # Soft sphere: density falls off with distance from surface
            d = jnp.exp(-jnp.maximum(0, dist - radius) * sigma) * sigma
            density += d
            point_colour += d * jnp.array(col)

        # Normalise colour by total density
        point_colour = jnp.where(density > 1e-6, point_colour / density, point_colour)

        # Volume rendering equation
        alpha = 1.0 - jnp.exp(-density * deltas[i])
        colour += transmittance * alpha * point_colour
        transmittance *= (1.0 - alpha)

    return colour

# Scene: three coloured spheres
spheres = [
    (jnp.array([0.0, 0.0, 4.0]), 0.8, [1.0, 0.2, 0.2], 5.0),   # red
    (jnp.array([1.5, 0.5, 5.0]), 0.6, [0.2, 1.0, 0.2], 5.0),   # green
    (jnp.array([-1.0, -0.5, 3.5]), 0.5, [0.2, 0.2, 1.0], 5.0), # blue
]

# Camera setup
img_h, img_w = 64, 64
focal = 60.0
origin = jnp.array([0.0, 0.0, 0.0])

image = jnp.zeros((img_h, img_w, 3))
for i in range(img_h):
    for j in range(img_w):
        # Compute ray direction
        px = (j - img_w / 2) / focal
        py = -(i - img_h / 2) / focal
        direction = jnp.array([px, py, 1.0])
        direction = direction / jnp.linalg.norm(direction)

        colour = render_ray(origin, direction, spheres)
        image = image.at[i, j].set(jnp.clip(colour, 0, 1))

plt.figure(figsize=(6, 6))
plt.imshow(image)
plt.title('NeRF-style Volume Rendering\n(3 spheres)')
plt.axis('off')
plt.tight_layout(); plt.show()
print(f"Image shape: {image.shape}")
print(f"Rendered {img_h * img_w} rays with 64 samples each")
```
