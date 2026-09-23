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

*本篇将视频与三维视觉放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

*视频和三维视觉将图像理解扩展至时间和空间领域。这个文件涵盖光学流,视频分类(3D CNNs, TimeSformer),物体跟踪(SORT, DeepSORT),动作识别,深度估计(摩诺克和立体),点云,NeRFs,以及3D高斯克平板. *

- 01-04文件将图像视为孤立快照. 但视觉世界是连续的:物体会移动,场景会改变,深度也会存在. 此文件将计算机视觉延伸至时间域(video)和空间域(3D),涵盖模型如何理解运动,跟踪对象,估计深度,并重建场景.

- 一个**video**是一段时间内捕获的图像(帧)的序列. 以每秒30帧的速度,一出10秒的相片包含300帧. 关键的挑战在于模拟**时段维度**:物体如何移动,场景是如何卷积的,以及我们怎样才能将信息跨框架联系起来?

- ** 物理流** 估计了相像素在两个相接相框之间的明显运动. 对于框中的每个像素$t$,光学流产生2D相位向量$(u, v)$指向该像素在框中移动的地方$t+1$。。。结果是密集的运动场与图像大小相同.

![图示](../images/optical_flow.svg)

- 光学流是在**braights constance假设**下计算出来的:一像素的强度不会随着移动而改变. 如果一个像素位于位置$(x, y)$框中显示$t$有强度$I(x, y, t)$移动到$(u, v)$在小时间间隔内$\delta t$:

$$I(x + u\delta t, \, y + v\delta t, \, t + \delta t) = I(x, y, t)$$

- 将泰勒的一等扩建(第03章)除以$\delta t$:

$$I_x u + I_y v + I_t = 0$$

- 地点$I_x, I_y$是空间梯度(Sobel,文件01)和$I_t$是时间梯度(相继框架之间的偏差)。这是**光学流量约束等式**. 一个等式,两个未知数($u, v$我们需要一个额外的限制。

- **Lucas-Kanade** 假设流量在一个小窗口(如5x5像素)内是常数. 这给出了一个由最小平方解析的系统(25个方程,2个未知数)(从第06章算起的普通方程):

```math
\begin{bmatrix} u \\ v \end{bmatrix} = \begin{bmatrix} \sum I_x^2 & \sum I_x I_y \\ \sum I_x I_y & \sum I_y^2 \end{bmatrix}^{-1} \begin{bmatrix} -\sum I_x I_t \\ -\sum I_y I_t \end{bmatrix}
```

- 2x2矩阵是从文件01(哈里斯角检测中使用的同樣的矩阵)中生成的结构收发器. Lucas-Kanade对小动作效果良好,但当物体在帧间移动超过几个像素时失败.

- ** Farneback的方法** 适合向每个像素相邻的多名扩展,并估计离场,这最能解释框之间的变化。它产生密集流(每个像素的向量)并处理比卢卡斯-克纳德更大的运动.

- 现代**深层学习光学流**方法(FlowNet,RAFT)从对相框中学习到光学流端到末相预测. **RAFT**(Recurrent All-Pairs Field Transforms,Teed and Deng,2020)计算出两个帧中所有对像素之间的4D相通量,并使用基于GRU的更新操作器来迭代地完善流量估计. RAFT实现了最先进的精度,并成为了标准流中枢.

- ** 二流网络**(Simonyan和Zisserman,2014年)是视频理解的早期方法. 一个流会处理单个RGB帧(出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出自"出 两条溪流相接于端(由平均或通合). 这种建筑明确区分了"事物的外观"和"它们是如何移动".

- **3D 革命网络** 将2D 革命扩展到时间维度. 3D 卷积应用大小过滤器$k \times k \times k_t$跨越空间和时间维度,直接学习瞬间特征。

- ** C3D** (Tran等,2015年)用3x3x3滤波器堆叠了3D分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解的分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分解出分 成本很高:三维卷积$k_t$乘以比其2D对等参数和计算数。

- **I3D**(充气了3D,Carreira和Zisserman,2017年)采取了更实际的方法:从预先训练的2D CNN(如Inception或ResNet)开始,通过沿时间维度重复重量并被除去来将所有2D滤波器"充气"到3D.$k_t$。。。这在添加时间建模的同时将ImageNet预训转移到了视频. 2D 一个$k \times k$过滤器变成一个$k \times k \times k_t$过滤器已禁用$W_{\text{3D}}[:,:,j] = W_{\text{2D}} / k_t$所有时间位置$j$.

- ** SlowFast Networks**(Feichtenhofer等,2019年)使用两种平行路径在不同时间分辨率下运作:
    - **Slow路径**以低帧速率(如每16帧)处理帧,具有高空间分辨率和多通道,捕捉出细微的空间细节.
    - ** 快速路径** 以高帧速率(每2帧)处理帧,空间分辨率降低,通道减少(典型做法是:$1/8$,捕捉时间变化快。
    - 横向连接从快到慢 通过被扭曲的卷积。

- 洞察力是空间和时间信息有不同的带宽要求:物体外观变化缓慢,但运动可以快. 慢快与这种不对称的设定相匹配.

- ** TimeSformer**(Bertasius等,2021)将"视觉变形器"应用于视频. 它分解出全相片的注意力(这太贵了:$O((T \times N)^2)$(单位:千美元)$T$框架和$N$每个帧的补丁)被分到**divided attention**:在时间注意(每个补丁在同一空间位置上跨时间出席)和空间注意(每个补丁在同一框架范围内跨空间出席)之间,每个区块替代. 这降低了从$O(T^2 N^2)$改为$O(T^2 + N^2)$.

- ** VideoMAE**(Tong等,2022年)将蒙面自编码器的想法(文件04)扩展至视频. 由于视频时间冗余度高:相邻的相框看起来几乎完全相同,因此遮掩了大多数补丁仍然留下足够的信息进行重建,所以使用了极高的遮掩比(90-95%). VideoMAE在无标签视频上预取了ViT主干线,并转移到下游任务.

- ** Action recognition**将一段视频剪辑分入许多动作类别(如"跑出","烹饪","弹出吉他"等)之一. 这是图像分类的视频模拟。标准基准包括Kinetics-400(400个动作类,~300K剪辑),Something-Something(174个需要时间推理的精细动作),以及ActiveNet(200个有长而未剪辑的视频的课).

- ** 临时动作探测** 超越了分类:给一个长而无线的视频,找到每个动作的起步时间,结束时间和类别. 这是物体探测的时间模拟。ActionFormer等方法使用变形器处理时间特征并预测动作边界.

- ** 视频对象跟踪** 在第一个帧中识别出某个特定对象后,跟踪该对象跨帧.

- **SORT**(简在线和实时跟踪,Bewley等,2016年) 将检测模型(在每个帧中独立地检测出物体)与**卡尔曼滤波器**用于运动预测和**匈牙利算法**用于任务结合.

- **卡尔曼滤波器** 保持每个被跟踪物体的状态估计(位置,速度,大小),并使用线性运动模型预测下个框架的位置. 当一个新的探测到来时,卡尔曼滤波器通过将预测与观测结合起来来更新其估计,并按各自的不确定性进行加权. 这是适用于跟踪的巴伊西亚语更新(第05章)。

- ** 匈牙利算法** 解决了双线指派问题: 给定$M$跟踪物体和$N$新的检测,找到最佳的一对一匹配,以最小化总成本(使用IoU距离文件03). 无法匹配的检测开始新的轨道;无法匹配的轨道在宽限期后被终止.

- **DeepSORT**通过添加**深外观特征**来扩展SORT:每个被探测到的物体通过一个能产生外观嵌入(描述向量)的小型CNN传递. 相配成本将IoU距离与相容距离(第01章)结合入嵌空间. 这处理封存和再识别:即使一个物体消失在另一个后方的多个帧上,它的外观嵌入允许在再出现时重新相配.

- ** ByteTrack**(Zhang等,2022年)改进了跟踪工作,使用了每一次检测,包括低信心检测。大多数追踪器丢弃了低于置信阈值的检测. ByteTrack首先将高自信检测与已存在的轨道相匹配,再将剩余的低自信检测与未匹配的轨道相匹配. 这可以恢复暂时被占有或模糊的物体(因此探测信心较低).

- **3D视觉**恢复了2D图像投影中丢失的第三个空间维度(文件01).

- **深度估计**预测从相机到场中每个点的距离.

- **Stereo深度**使用两个相机,用已知基线相隔。$b$。。。左边和右边图像的不同水平位置也出现同一点(这个偏移称为**dispity **$d$) (中文(简体)). 深度与差异成反比:

$$Z = \frac{f \cdot b}{d}$$

- 地点$f$是焦距,并且$b$是基线距离。计算差分需要找到两个图像之间的相应相接点(stereo satching),这是沿着水平扫描线进行的1D搜索(因为相机是水平对齐的,在3D项目中一个相接点到两个相片中的同一行).

- ** 分子深度估计** 从一个图像中预测出深度,而这个图像根本上是不正确的(无限多的3D场景可以产生相同的2D图像). 然而人类却毫不费力地利用了 相对的体积、纹理梯度、遮住和大气雾霾等提示。深层网络从培训数据中学习这些提示。

- 如**MiDAS**和**深度 Anything**等模型从单个图像中预测出相对深度图(排序哪个物体更接近). 尽管理论上含糊不清,但他们都接受了关于各种数据集的培训,其损失程度不尽相同,结果非常准确。

- **点云** 是三维点的一组$(x, y, z)$,可选地带有颜色或其他属性,被LiDAR传感器或立体重建所捕获. 与图像不同的是,点云无序和不规则的间隔.

- **PointNet**（Qi 等，2017）直接处理点云：对每个点独立应用共享的 MLP，再用最大池化聚合结果。最大池化对点的排列具有不变性，因此解决了点的顺序问题。**PointNet++** 增加分层分组，以捕捉多个尺度的局部结构。

- ** 神经辐射场(NERFs)**(Mildenhall等,2020年)代表了3D场景,作为连续函数来映射出一个3D位置.$(x, y, z)$和取景方向$(\theta, \phi)$颜色$(r, g, b)$和密度$\sigma$。。。此函数由 MLP 参数化 :

$$F_\theta: (x, y, z, \theta, \phi) \to (r, g, b, \sigma)$$

- 为了制造出像素,从相机中射出一束射线,穿过像素进入了场景. 点沿射线进行取样,MLP预测每个点的颜色和密度. 像素颜色由**卷渲染**来计算: 以密度加权的颜色沿射线:

$$C(\mathbf{r}) = \int_{t_n}^{t_f} T(t) \cdot \sigma(\mathbf{r}(t)) \cdot \mathbf{c}(\mathbf{r}(t), \mathbf{d}) \, dt$$

- 地点$T(t) = \exp(-\int_{t_n}^{t} \sigma(\mathbf{r}(s)) \, ds)$是累积的传送(迄今吸收了多少光)。在实践中,这一构成部分是抽样的近似部分。$N$沿着射线的分数和相片:

$$\hat{C} = \sum_{i=1}^{N} T_i \cdot (1 - \exp(-\sigma_i \delta_i)) \cdot c_i$$

- NERF通过最小化MSE来进行训练,介于被制成的像素和从一组所出照片中取出地真像素之间. 训练后,NERF可以从任何相机位置来渲染出相片现实主义的新观点. 限制是速度:渲染需要评价MLP上百万次(每个像素的样本点各一个),使得实时渲染变得困难.

- **3D高斯平板活泼**(Kerbl等,2023年)通过将场景作为由3D高斯原始人组成的集合来代表NERF的限速活性,而不是连续的量子活性. 每个高斯函数有一个3D位置(平均值),一个3D共变矩阵(控制外形和取向),不透明,和颜色(代表球形口音以取景依赖效果).

- 将每个3D高斯函数投影到图像平面上(生成一个2D高斯函数"平板"),按深度排序,并使用α相混合来进行复合. 这是一个光栅化过程,在GPU上实时运行(100+FPS),比NERF的射线行进速度快. 高斯电镀匹配或超过NERF质量,同时允许实时渲染.

- **SLAM**(同時定位和地圖)是构建未知环境的地图同时跟踪相机在其中位置的问题. 它对于机器人、自主驾驶和AR至关重要。

- ** 视线光度测量** 通过跟踪图像的特性,估计相机从相框到相框的运动。地物点(SIFT,ORB from file 01)相接相接相接相接相框相接相接相接相机的旋转和翻译相机取自使用**基本矩阵**的函文相接相机相接相机相接相机相接相机相接相机的相接相机相接相机相接相机相接相机相接相机相接相机相接相机相接相机相接相机相接相机相接相机相接相机相接相接相机相接相机相接相机相接相接相接相机相接相机相机相接相机相相接相机相接相机相相机相接相

- ** 基于Feature的SLAM**通过保持一长相图来扩展视觉偏振. **ORB-SLAM**(Mur-Artal等,2015年)是被最广泛使用的基于地物的SLAM系统. 它有三个平行线程:
    1. ** 跟踪**:将每个新框中的ORB特性与地图相匹配,使用 PnP(Perspective-n-Point)和RANSAC估算相机外观
    2. ** 本地映射**:从匹配的特性对新映射点进行三角定位,使用捆绑调整优化其位置(在看到每个点的所有视图中最小化再预测错误)
    3. ** 闭合页**:当相机重访先前绘制的区域(使用袋式可视文字)时,通过全球优化地图来纠正累积漂移

- **LiDAR SLAM**使用从LiDAR传感器取出3D点云来代替(或除此之外)相机图像. LiDAR提供直接的深度测量,使几何估计更坚固,但硬件成本更高. LOAM(LiDAR Odometry and Magazine)等方法在相接扫描之间使用迭接最接近点(ICP)对接来记录点云.

- ** 视觉-惯性 SLAM** 将相机数据同IMU(加速计+陀螺仪)的测量相接。IMU提供高频回转和加速估计,可以弥合相机帧之间的空隙并处理快动或临时视觉特征损失.

- ** VR/AR** 应用是计算机视觉最需要的消费者之一。

- ** Pose 估测**决定了从图像中得出人体(或相貌,或手)的位置和取向. **Body spost**通常作为一组2D或3D键位(联:肩,肘,腕,臀,膝,踝等)来表示. 如**OpenPose**和**MediaPipe** 等模型使用热映射回归来预测这些关键点:对于每个关节,模型输出出一个热映射,峰值表示关节位置.

- **Top-down**方法首先检测出装有边框探测器(文件03)的人,然后估计出每个盒子内的姿势. ** Bottom-up** 方法首先检测图像中的所有键点,然后将其分组为使用部分亲和字段的个体(将连接关节之间的关联编码的活性字段).

- ** 场景重建**从传感器数据中构建出环境3D模型. 在AR中,这可以将虚拟物体放入真实表面,将虚拟物体挤入真实表面后方,并投放虚拟阴影. 实时场景重建方法(如ARKit和ARCore中以深度传感器为基础的系统)构建出一个稀少的环境网格,随着用户的移动而更新.

- ** 实时渲染** VR 中的制约是极端的:两只眼睛都需要在90+ FPS(以避免运动疾病)时分开制成,从头部运动到显示更新的延迟时间不到20毫秒. 诸如**发泡渲染**(只在用户视线的情况下在高分辨率下投放,使用眼睛跟踪)和**再预测**(根据新的头部姿势对上个框架进行打压以填补空白,而下一个框架则产生)等技术对于满足这些制约因素至关重要。

- 实时神经渲染(3D高斯克平板),强力跟踪(可视-惯性SLAM),高效的姿势估计的趋同使相片现实性,交互式的AR/VR体验越来越可行.

## 编程任务（使用 Colab 或 notebook）


1. 从零开始执行Lucas-Kanade光学流算法. 计算两个合成相框之间的流出,其中正方形向右移动.
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

2. 为2D对象跟踪执行简单的卡尔曼过滤. 模拟一个吵闹的轨道,并显示卡尔曼过滤器如何平滑估计.
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

3. 实施简化的NERF式容积渲染管. 铸出射线通过一个简单的3D场景(已知颜色和密度的花圈),并通过将每道射线相接而成像.
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
