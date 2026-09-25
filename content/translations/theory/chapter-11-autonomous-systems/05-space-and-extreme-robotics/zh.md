---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 11 - autonomous systems/05. space and extreme robotics.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 94db5c1563ff57b1ac4364678dab009f960d7b6af9de303f197ccd7bc6f54ffd
status: reviewed
---
# 空间与极端环境机器人

*空间机器人和极端环境机器人把自主能力推向边界：通信延迟、辐射和非结构化地形，要求机器人能够独立决策。本文介绍行星探测车、轨道服务、通信受限自主、抗辐射计算、水下机器人、搜索与救援、群体机器人以及人机交互。*

- 本章前面介绍的自主系统大多在相对温和的环境中工作，例如有车道线的道路、平坦的仓库地面，以及物体类别已知的厨房。许多重要的机器人应用却发生在人类无法进入，或派人进入代价极高的地方：火星表面、深海海底、核事故现场和燃烧中的建筑。

- 这些**极端环境**有共同难题：通信受限或延迟，地形复杂且难以预测，设备必须承受恶劣条件，附近也没有人能及时维修。机器人必须具备真正的自主能力，不能只靠“有人盯着屏幕”的远程操作。

## 空间机器人

- 太空是极端环境的典型代表。那里没有空气，温度可在 -170°C 到 +120°C 之间变化，辐射会持续轰击电子设备，救援人员则可能远在数百万公里之外。因此，空间机器人必须可靠、节能并能自主运行。

- **行星探测车**在其他天体表面移动和探测。NASA 的火星车（Spirit、Opportunity、Curiosity、Perseverance）是最著名的例子。新一代火星车通常比前一代更自主。

![地球与火星的通信延迟：单程 4–24 分钟，往返 8–48 分钟，无法实时操控](../images/earth_mars_delay.svg)

- **通信延迟**是首要限制。火星与地球之间的无线电信号单程需要 4–24 分钟，具体取决于轨道位置，往返则需要 8–48 分钟。地面人员无法实时用摇杆操控火星车。火星车遇到岩石时，也不能马上向地球求助并等待回复，必须自行判断。

- 早期火星车（Spirit、Opportunity）主要由地面人员参与规划：工程师查看图像、规划路线、上传指令，再由火星车执行。一次行驶周期可能要用掉一个完整的火星日（sol），每天只能行驶约 50–100 米。

- Curiosity 和 Perseverance 上的 **AutoNav**（自主导航）显著提高了自主程度。火星车用双目相机建立局部三维地图（第 8 章介绍过双目深度），评估地形可通行性，例如坡度、粗糙度和岩石大小，再用基于栅格和可通行代价地图的规划器寻找安全路线。地面团队休息时，火星车也能自主行驶，每日行驶距离可超过 100 米。

- 火星车的感知流程受抗辐射处理器限制，这类处理器比消费级硬件慢几个数量级。算法必须节省计算资源：例如使用传统双目匹配，而不是深度神经网络；使用简单的代价地图规划器，而不是学习策略。

- **轨道服务**包括在轨检查、维修、加注燃料或使卫星离轨。随着太空中的卫星越来越密集，这一领域正在发展。NASA 的 OSAM-1，以及 Astroscale、Northrop Grumman MEV 等商业项目，都使用机械臂和对接机构为卫星提供服务。

- 轨道服务的难点是**近距离操作**：服务航天器要接近目标卫星，而目标卫星可能正在翻滚、无法配合，也没有对接接口；整个过程还要在微重力下完成精细操作。航天器必须根据相机图像估计目标的三维位置和朝向。第 8 章介绍的特征检测和 PnP（透视 n 点）求解，以及较新的深度学习位姿估计方法，都能用于此类任务。

- **卫星检查**使用小型航天器观察其他卫星，寻找损坏或异常。检查航天器要自主绕行目标、避免碰撞，并从合适的视角拍摄高分辨率图像。规划器需要在燃料、光照和避碰约束下，安排覆盖所有检查点的轨迹。

## 通信约束

- 太空通信受光速、可用带宽和轨道几何限制。火星车若位于火星背面，没有中继卫星就无法与地球通信。

- 这些限制会改变机器人的自主架构。在地球上，机器人可以把高清视频传到云端，在 GPU 集群上推理，再在几毫秒内收到指令；在太空中，机器人必须在本机完成全部工作。

- **高延迟**要求机器人脱离实时人工指导，自主规划和行动。自主软件必须处理正常任务、发现异常、应对危险，并具备可靠的星载状态估计、故障检测和应急规划能力。

- **带宽有限**时，机器人无法传回原始传感器数据。一张高分辨率图像可能有数 MB，而火星到地球的直连速率只有每秒几千比特；经轨道中继会快一些，但带宽仍有限。机器人需要大幅压缩数据、优先选择回传内容，并在本地完成大部分决策。

- **通信窗口**并非持续开放。火星车通常只能在特定轨道几何条件下，通过中继卫星每天与地球通信数小时。其他时间只能独立运行。

- 因此，**星载自主能力**必须可靠。系统要能发现车轮卡住、传感器失效或前方地形无法通行等问题，选择安全的应对方式，并持续工作到下一个通信窗口，再汇报情况、接收新指令。

## 抗辐射计算

- 太空中充满电离辐射，包括宇宙射线、太阳粒子事件和行星磁场捕获的辐射。高能粒子可能翻转内存位（**单粒子翻转，SEU**）、永久损坏晶体管（**总电离剂量，TID**），或引发破坏电路的闩锁效应。

- **抗辐射处理器**专为这种环境设计。它们使用较大的晶体管、冗余逻辑和特殊制造工艺。三模冗余会复制每个电路三份，并投票决定输出。代价是性能降低：先进的抗辐射处理器可能只有 200 MIPS，而消费级 GPU 每秒能执行数十亿次运算。

- BAE Systems 的 **RAD750** 曾用于 Curiosity 和许多其他航天器。它以 200 MHz 运行，处理能力约为 400 MIPS，相当于 20 世纪 90 年代中期的桌面电脑。Perseverance 使用同级别处理器。在这类硬件上运行现代神经网络并不现实，因为模型可能有数百万参数，需要数十亿次乘加运算。

- **模型压缩**因此十分重要。第 6 章介绍的量化、剪枝和知识蒸馏可以缩小神经网络，满足有限的计算预算。一个模型在笔记本 GPU 上几毫秒就能运行，在抗辐射处理器上可能需要几分钟，也可能根本无法装入内存。

- 另一种方案是使用**商用现成（COTS）**处理器，再通过软件缓解辐射影响，例如纠错码、看门狗定时器、定期内存巡检和渐进退化策略。部分现代任务愿意承担更高的软件复杂度和风险，以换取更强的计算能力。

- 未来的行星任务正在探索 FPGA 和专用 AI 加速器，希望它们既能耐受辐射，又比传统抗辐射 CPU 提供更多算力，从而首次让星载深度学习变得可行。

## 非结构化地形中的自主导航

- 地球上的道路通常平坦、有标记且已有地图；火星、月球和灾害现场则没有道路。地面可能有岩石、斜坡、沙地、裂缝，也可能无法承受机器人的重量。

- **地形分类**评估每块地面是否适合通行。特征包括坡度（三维重建得到）、粗糙度（表面法向量的方差）、岩石密度和土壤类型。传统方法从双目深度图计算这些特征，较新的方法则用学习分类器处理视觉和几何特征。

- **视觉惯性里程计（VIO）**跟踪连续相机帧中的视觉特征，并与 IMU 测量融合，以估计机器人运动。这是第 8 章介绍的 SLAM 核心组件之一，经过调整后可用于极端环境。火星上的 VIO 必须应对缺少视觉特征的沙地、阴影强烈的恶劣光照，以及有限算力。

- 估计器可以用**扩展卡尔曼滤波器（EKF）**或因子图优化融合视觉与惯性数据。状态向量包含位置、速度、朝向和 IMU 偏置。预测步骤通过积分 IMU 测量更新状态：

$$\mathbf{x}_{t+1} = f(\mathbf{x}_t, \mathbf{u}_t)$$


- 其中，$\mathbf{u}_t$ 是 IMU 测量值，包括加速度和角速度。更新步骤再用视觉特征观测修正预测。这属于第 5 章介绍的贝叶斯估计：IMU 提供先验，视觉观测更新信念。

- **危险规避**对行星着陆至关重要。航天器下降时，需要用机载相机或激光雷达实时寻找安全着陆区。NASA 的 **地形相对导航（TRN）**系统用于 Perseverance，它把机载相机图像与预载的轨道地图比较，在下降过程中估计位置，并引导航天器避开危险地形。这个系统帮助 Perseverance 降落在科学价值很高、地形风险也很大的 Jezero 陨石坑。

## 水下机器人

- 深海环境和太空一样陌生：海底压力超过 1,000 个大气压，能见度接近于零，没有 GPS，通信也受限。水下机器人可用于海洋科学、海上基础设施检查、深海采矿和搜寻任务。

- **自主水下航行器（AUV）**不与水面船只连接，依靠自身电源和计算设备运行。它们会按预设路线巡测，也可以依据机载信息调整任务。AUV 常用于海底测绘、管道检查和环境监测。

- **遥控水下机器人（ROV）**通过缆绳连接水面船只，由缆绳供电和通信。它们适用于需要实时人工控制的任务，例如深海操作、施工和维修。缆绳缓解了通信限制，却缩小了活动范围，也增加了操作复杂度。

- **声学通信**是主要的水下通信方式，因为无线电波在水中衰减很快。声学调制解调器在几公里范围内的数据速率约为每秒 1–10 千比特；陆地无线电则可达到每秒数十亿比特。水下通信比火星通信更加受限，因此 AUV 必须高度自主。

- **水下 SLAM**尤其困难。声呐能测量距离，但角分辨率较低、噪声较大，海底和水面还会造成多路径反射。相机只在很近的距离内有效：清澈水域中也只有数米，浑浊水域更短。第 8 章介绍的特征式视觉 SLAM 必须适应水下视觉条件，包括颜色衰减（红光最先被吸收）、后向散射，以及人造光造成的亮斑和深阴影。

- 没有 GPS 时，机器人可以通过**航位推算**导航：积分多普勒测速仪（DVL）的速度测量。DVL 通过声学多普勒频移测量相对海底的速度。机器人也可偶尔浮出水面获取 GPS 定位，或通过水面应答器进行声学定位。这和只靠 IMU 导航一样会产生漂移：很小的速度误差也会在长时间任务中不断累积。

## 搜索与救援机器人

- 地震、建筑坍塌或工业事故发生后，机器人可以进入结构不稳、有毒、起火或狭窄等人类救援人员难以进入的空间。

- 这类任务要求快速部署（几分钟而非几小时）、在无法使用 GPS 的环境中运行、穿过墙体和瓦砾保持通信，并在杂物、粉尘和弱光环境中穿行于拥挤或局部坍塌的空间。

- **多机器人协同**能让一组机器人比单台机器人更快地搜索大面积区域。机器人需要划分搜索区、避免重复搜索，并共享发现的信息。

- **前沿探索**把机器人派到已探索区域和未探索区域的边界，也就是“前沿”。每台机器人前往最近的未探索边界，完成建图后继续探索。集中式或分布式规划器会把不同前沿分配给机器人，以缩短总探索时间。这是一个覆盖优化问题。

- 瓦砾会干扰通信，机器人可能与操作员或队友失联。系统要能应对间歇性通信：每台机器人都能独立运行，建立自己的局部地图并作出决策；通信恢复后再合并信息。

## 群体机器人

- **群体机器人**使用大量简单、低成本的机器人，通过局部互动形成复杂的集体行为。单台机器人能力有限，整个群体却能完成任何单台机器人都无法完成的任务。

- 群体机器人的灵感来自生物群体：蚂蚁用身体搭桥，蜜蜂共同选择蜂巢位置，鱼群协同移动以躲避捕食者。这些群体都通过简单的局部规则行动，例如跟随邻居、避免碰撞、向食物移动，最后形成复杂的整体行为。

- **去中心化控制**不设中央指挥者。每台机器人遵循相同的局部规则，只对邻居和周围环境作出反应。群体整体行为从局部互动中**涌现**。因此，单台机器人故障不会让整个群体停止，也不存在单点故障。

- **一致性算法**让群体只通过局部通信对集体决策达成一致，例如决定移动方向或任务优先级。简单的一致性协议会让每台机器人把自己的数值与邻居的数值取平均：

$$x_i(t+1) = \frac{1}{|N_i| + 1} \left( x_i(t) + \sum_{j \in N_i} x_j(t) \right)$$


![群体一致性：机器人从分散位置出发，反复与邻居取平均并逐渐汇聚到共同位置](../images/swarm_consensus.svg)

- 其中，$N_i$ 表示机器人 $i$ 的邻居集合。反复迭代后，所有机器人会趋向同一个值，即全局平均值。收敛速度取决于通信图的拓扑，特别是图的代数连通度，也就是图拉普拉斯矩阵的次小特征值（与第 2 章的特征值概念有关）。要收敛到全局算术平均，通信图及平均权重还需满足连通性、双随机等条件；只做邻居均值，尤其在有向或时变图上，不能保证收敛到初始值的算术平均。

![Reynolds 群集运动的三条规则：分离避免碰撞，对齐统一方向，内聚使群体保持在一起](../images/reynolds_flocking.svg)

- **群集运动算法**（Reynolds 规则）用三条简单规则协调机器人运动：

    - **分离**：远离距离过近的邻居，避免碰撞。
    - **对齐**：朝邻居的平均朝向转向，保持共同方向。
    - **内聚**：朝邻居的平均位置移动，让群体留在一起。

- 每条规则都会为机器人的速度贡献一个向量。加权求和这些向量，就能形成自然的群体运动。这是第 1 章介绍的向量线性组合，权重决定各类行为的相对重要性。

- 群体机器人可用于环境监测（把传感器分散到大片区域）、精准农业（协调无人机喷洒作物）、集体施工，以及大范围搜寻。

## 人机交互

- 许多现实中的自主系统都要与人协同工作。人和机器人如何交流、共享控制权并建立信任，与机器人的技术能力同样重要。

![共享自主的控制范围：从人完全遥操作（alpha=1），经过混合控制，到机器人完全自主（alpha=0）](../images/shared_autonomy_spectrum.svg)

- **共享自主**结合人和机器人的控制。全遥操作由人控制所有动作；全自主则由机器人控制。共享自主让人提供高层意图，机器人负责低层执行。例如，人指向物体说“把那个拿起来”，机器人再自行规划抓取和机械臂动作。

- 数学上，共享自主可以把人的输入 $\mathbf{u}_h$ 和机器人的自主动作 $\mathbf{u}_r$ 混合起来：

$$\mathbf{u} = \alpha \mathbf{u}_h + (1 - \alpha) \mathbf{u}_r$$


- 其中，$\alpha \in [0, 1]$ 是混合系数。$\alpha = 1$ 时由人完全控制（遥操作）；$\alpha = 0$ 时由机器人完全自主控制。**自适应共享自主**会根据当前情况调整 $\alpha$：机器人有把握时多承担控制，缺乏把握或遇到新情况时则把更多控制权交给人。

- **遥操作**仍适用于超出当前自主能力的任务。操作员通过机器人的摄像头远程控制机器人。延迟是主要难题：即使 100 毫秒的延迟也会让操作变得困难，而太空中的数秒延迟几乎不允许精细操作。**预测显示**会展示机器人未来状态；**虚拟夹具**则用软件限制危险动作，帮助操作员补偿延迟。

- **信任校准**要让人对机器人保持恰当的信任。信任过高会让人放松警惕、错过介入时机；信任过低则会造成不必要的干预和功能闲置。人的信任应符合机器人的实际能力：在机器人擅长的情况下信任它，在接近能力边界时保持谨慎。

- 研究发现，机器人的透明度（是否解释决策）、可靠性（失败是否可预测）和沟通方式（是否表达不确定性）都会影响人的信任。如果机器人能说“我有 40% 的把握认为这条路线安全，要继续吗？”，人就能更好地作决定；如果它一言不发地向前行驶，人就难以判断风险。

- 机器人运动的**可读性**是指机器人通过动作让附近的人看懂自己的意图。机器人伸手拿物体时，运动轨迹应尽早让人看出它要拿哪个物体。规划器可以选择让观察者尽早推断目标的轨迹，并将其形式化为：根据观察到的部分轨迹，最大化真实目标的后验概率：

$$\pi^* = \arg\max_\pi P(G \mid \xi_{0:t})$$


- 其中，$G$ 是目标，$\xi_{0:t}$ 是截至时刻 t 已观察到的轨迹。这与第 5 章的贝叶斯推断有关：观察者对可能目标有一个先验，机器人轨迹则提供证据并更新这个信念。

## 编程任务（使用 Colab 或 notebook）

1. 模拟群体机器人的一致性算法，让机器人对目标位置达成一致。从随机初始位置出发，观察它们如何汇聚。

代码直接对机器人当前坐标和最近邻坐标取平均，没有指定共同目标；邻居图还会随位置变化，且未必对称，因此不一定收敛到所有初始位置的全局平均值。绘图取用第 29 步，而循环实际执行 30 次更新。

```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

n_robots = 10
rng = jax.random.PRNGKey(0)
positions = jax.random.uniform(rng, (n_robots, 2), minval=-5, maxval=5)

# Communication graph: each robot talks to its 3 nearest neighbours
def get_neighbours(positions, k=3):
    dists = jnp.linalg.norm(positions[:, None] - positions[None, :], axis=-1)
    # For each robot, find k nearest (excluding self)
    neighbours = jnp.argsort(dists, axis=1)[:, 1:k+1]
    return neighbours

history = [positions.copy()]

for step in range(30):
    neighbours = get_neighbours(positions)
    new_positions = jnp.zeros_like(positions)
    for i in range(n_robots):
        nbr_pos = positions[neighbours[i]]
        new_positions = new_positions.at[i].set(
            (positions[i] + nbr_pos.sum(axis=0)) / (len(neighbours[i]) + 1)
        )
    positions = new_positions
    history.append(positions.copy())

# Plot convergence
fig, axes = plt.subplots(1, 3, figsize=(15, 4))
for ax, step_idx, title in zip(axes, [0, 10, 29], ["Initial", "Step 10", "Final"]):
    h = history[step_idx]
    ax.scatter(h[:, 0], h[:, 1], s=50)
    ax.set_xlim(-6, 6); ax.set_ylim(-6, 6)
    ax.set_aspect("equal"); ax.grid(True); ax.set_title(title)
plt.suptitle("Swarm Consensus: Robots Converge to Agreement")
plt.tight_layout()
plt.show()
```

2. 实现 Reynolds 群集运动规则（分离、对齐、内聚），模拟机器人群体协同移动。

图中标为“Step 200”的快照取自历史索引 199；代码执行 200 次更新并保存了索引 200 的状态，因此图上最后一个快照少了一步。

```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

n = 30
rng = jax.random.PRNGKey(1)
k1, k2 = jax.random.split(rng)
pos = jax.random.uniform(k1, (n, 2), minval=-5, maxval=5)
vel = jax.random.uniform(k2, (n, 2), minval=-0.5, maxval=0.5)

dt = 0.1
separation_radius = 1.0
neighbour_radius = 3.0

trajectories = [pos.copy()]

for _ in range(200):
    new_vel = jnp.zeros_like(vel)
    for i in range(n):
        diffs = pos - pos[i]
        dists = jnp.linalg.norm(diffs, axis=1)

        # Neighbours within radius (exclude self)
        nbr_mask = (dists < neighbour_radius) & (dists > 0)
        sep_mask = (dists < separation_radius) & (dists > 0)

        # Separation: steer away from very close neighbours
        if sep_mask.any():
            sep = -diffs[sep_mask].sum(axis=0)
        else:
            sep = jnp.zeros(2)

        # Alignment: match average velocity of neighbours
        if nbr_mask.any():
            align = vel[nbr_mask].mean(axis=0) - vel[i]
        else:
            align = jnp.zeros(2)

        # Cohesion: steer toward average position of neighbours
        if nbr_mask.any():
            cohesion = pos[nbr_mask].mean(axis=0) - pos[i]
        else:
            cohesion = jnp.zeros(2)

        new_vel = new_vel.at[i].set(vel[i] + 1.5 * sep + 0.5 * align + 0.3 * cohesion)

    # Limit speed
    speeds = jnp.linalg.norm(new_vel, axis=1, keepdims=True)
    vel = jnp.where(speeds > 2.0, new_vel / speeds * 2.0, new_vel)
    pos = pos + vel * dt
    trajectories.append(pos.copy())

# Plot snapshots
fig, axes = plt.subplots(1, 3, figsize=(15, 4))
for ax, idx, title in zip(axes, [0, 50, 199], ["Start", "Step 50", "Step 200"]):
    p = trajectories[idx]
    v = vel if idx == 199 else jnp.zeros_like(vel)
    ax.scatter(p[:, 0], p[:, 1], s=20, c="blue")
    ax.set_aspect("equal"); ax.grid(True); ax.set_title(title)
    lim = max(abs(p).max() + 1, 6)
    ax.set_xlim(-lim, lim); ax.set_ylim(-lim, lim)
plt.suptitle("Reynolds' Flocking: Separation + Alignment + Cohesion")
plt.tight_layout()
plt.show()
```

3. 模拟共享自主控制：人提供带噪声的方向输入，机器人提供通往目标的平滑路径，再用不同的 alpha 值混合两者的控制。

```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

goal = jnp.array([10.0, 5.0])
pos = jnp.array([0.0, 0.0])
dt = 0.1

rng = jax.random.PRNGKey(3)

fig, axes = plt.subplots(1, 3, figsize=(15, 4))
for ax, alpha in zip(axes, [1.0, 0.5, 0.0]):
    pos = jnp.array([0.0, 0.0])
    path = [pos.copy()]

    for step in range(150):
        # Robot autonomy: smooth path to goal
        direction = goal - pos
        u_robot = direction / (jnp.linalg.norm(direction) + 1e-6) * 1.0

        # Human input: roughly correct direction but noisy
        noise = jax.random.normal(jax.random.fold_in(rng, step), (2,)) * 0.5
        u_human = u_robot + noise

        # Blend
        u = alpha * u_human + (1 - alpha) * u_robot
        pos = pos + u * dt
        path.append(pos.copy())

        if jnp.linalg.norm(pos - goal) < 0.3:
            break

    path = jnp.stack(path)
    ax.plot(path[:, 0], path[:, 1], "b-", alpha=0.7)
    ax.plot(*goal, "r*", markersize=15)
    ax.plot(0, 0, "go", markersize=10)
    ax.set_title(f"α={alpha:.1f} ({'human' if alpha==1 else 'robot' if alpha==0 else 'shared'})")
    ax.set_xlim(-1, 12); ax.set_ylim(-3, 8)
    ax.set_aspect("equal"); ax.grid(True)

plt.suptitle("Shared Autonomy: Blending Human and Robot Control")
plt.tight_layout()
plt.show()
```
