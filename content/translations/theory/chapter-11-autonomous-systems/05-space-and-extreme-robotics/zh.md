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
# 太空与极端环境机器人

*太空和极端环境机器人必须在通信受限、辐射、地形不确定和救援风险高的条件下自主运行。本篇介绍太空机器人、水下机器人、搜索救援、群体机器人和人机交互。*


*空间和极端环境机器人将自主性推向了极限,即通信延迟,辐射,和无结构地形需要自觉的机器人. 这个文件包括行星轨道飞行器、轨道服务、通信限制自主性、辐射硬化计算、水下机器人、搜索和救援、群机器人以及人与机器人互动*

- 在整个本章中,我们研究了在相对良性的环境中运作的自主系统:道路有道标;仓库有平地;厨房有已知的物体类别。但是机器人的一些最有影响的应用是在人类无法去的地方,或者在人类存在的代价是极端的的环境中:火星地表,深海地底,核灾难地,和被烧毁的建筑物.

- 这些**极地环境** 有着共同的挑战:通信有限或被拖延,地形结构不合理和难以预测,硬件必须活过严酷的条件,当事物出错时附近没有人类来修复. 机器人必须是真正自主的,而不仅仅是"与人类一起观看屏幕的自主".

## 太空机器人



- 空间是极端的终极环境。没有空气,气温从-170°C到+120°C的波动,辐射炸弹电子,帮助距离数百万公里. 空间机器人必须非常可靠、节能和自主。

- **行星漫游者**是探索其他世界表面的移动机器人. NASA的火星漫游者(Spirit, Captainity, Curiosity, Perseverance)是最出名的例子. 每代人都比上一代更自主.

![地球火星通讯延迟:单程4-24分,往返8-48分,使实时控制无法进行.](../images/earth_mars_delay.svg)

- 根本的制约因素是**通信延迟**。火星由无线电(视轨道位置而定)相距4-24分钟,所以往返通信需要8-48分钟. 不能实时摆出一副欢乐相 如果遇到岩石,它不能向地球求救并等待回应. 它必须自己决定。

- 早期的流浪者(Spirit, Captain)大量依赖地上-"走入"规划:人类会研究图像,计划出一条路径,上传命令,而"走入"则会执行. 单个驾驶周期需要整个火星日(Sol). 翻车可以穿行 也许50-100米每索尔。

- ** 关于好奇心和毅力的AutoNav**(自主导航)大大提高了自主权。漫游者使用立体相机来绘制出一幅本地的3D地图(从第8章中召回立体深度),评价地势可转性(斜道,粗糙度,岩石大小),并计划一条使用以网格为主的有可转性成本图的路由. 漫游者在人类团队入睡时自主地行驶,将每日的穿行距离提高到100+米.

- 火星漫游器上的感知管道受到辐射硬化处理器的限制,这些处理器比消费硬件慢(下面讨论)等量级. 算法必须从计算上节俭:古典立体匹配而不是深神经网络,简单的成本图规划者而不是所学的政策.

- ** 轨道服务** 涉及在轨检查、修理、加油或离轨卫星的机器人。随着空间变得拥挤,这是一个越来越大的领域。**OSAM-1**(美国航天局)等飞行任务和商业企业(Astroscale,Northrop Grumman MEV)使用机器人武器和对接机制为卫星服务。

- 挑战在于**近距离操作**:服务航天器必须接近目标卫星(可能倾覆、不合作和缺乏对接接口),并对微重力进行精确操纵。基于视觉的平面估计(从相机图像中确定目标3D的位置和取向)至关重要. 这使用了从第8章:特征检测,PnP(Perspective-n-Point)解析的技术,以及更近的以深层学习为基础的外观模型.

- ** 卫星检查** 使用小型航天器对其它卫星进行视像检查,以了解损坏或异常情况。检查员必须自主地绕过目标,避免相撞,并从最佳角度获取高分辨率图像。这是一个规划问题:找到涵盖所有检查点的轨道,同时尊重燃料限制、照明条件和避免相撞。

## 通信约束



- 在空间中,通信受到光速,可用带宽,轨道几何等限制(火星最远一侧的一圈环形山完全没有中继卫星无法与地球通信).

- 这些制约因素从根本上改变了自治结构。在地球上,机器人可以将HD视频流到云端服务器上,运行GPU集群的推论,并以毫秒得到指令. 在太空中,机器人必须做船上的一切.

- **高潜伏度**指机器人必须在没有人类实时指导的情况下进行规划和行动. 自主软件必须处理名义操作,检测出异常情况并应对危险而无需等待人类输入. 这需要强有力的机载状态估计、断层探测和应急规划。

- ** 有限度带宽** 表示机器人不能传输原始传感器数据. 单一高分辨的图像可能是数兆字节,但火星对地数据速率通过直接对地连接(轨道中继较高,但仍然有限)每秒只有几千比特. 机器人必须积极压缩数据,优先处理要发送的数据,并在当地作出大多数决定。

- ** 通信窗口** 间断。火星漫游者只能在特定的轨道地貌中与地球通信,通常每个梭子通过中继卫星进行几个小时. 在这些窗户外,"漫游"完全靠自己.

- 对大赦国际来说,** 机上自主** 必须高度可靠。系统需要检测出某事是否出错(一个车轮卡住,传感器已失效,前方地形无法通行),决定安全响应,并持续运行到下一个通信窗口,当它能够报告并收到更新指令时.

## 抗辐射计算



- 太空被电离辐射所淹没:宇宙射线,太阳粒子事件,被困于行星磁场的辐射. 高能粒子可以在内存中翻转位点(**单事件扰动,SEUs**),永久损坏晶体管(**总电离剂量,TID**),或者在回路中引起破坏性的挂接.

- ** 硬化(rad-hard)** 处理器的设计能够承受这种环境。它们使用更大的晶体管几何仪,冗余逻辑(三相模块冗余:每台电路对输出投出三张票),以及专用制造工艺. 成本是性能:最先进的rad-hard处理器可能提供200个MIPS,而消费者GPU每秒的操作量为数十亿个.

- **RAD750**(BAE系统)为好奇心和许多其他航天器提供动力。它以200兆赫运行,拥有大约400个MIPS的处理功率,可与1990年代中期的台式计算机相媲美. 恒用相类似的处理器类. 运行现代神经网络(百万参数,数十亿倍积分操作)对于这种硬件来说是不可行的.

- ** 模块压缩**变得至关重要。第6章(定量、分泌、知识分馏)的技术用于收缩神经网络,以适应极端计算预算。一个在笔记本电脑GPU上运行以毫秒为单位的模型可能需要在rad-hard处理器上几分钟,或者可能根本不适合内存.

- 另一种方法是使用**商业现成(COTS)** 软件中的辐射减缓处理器:错误校正代码、监督计时器、定期内存洗涤和优雅的降解策略。一些现代特派团利用这种方法,以软件复杂性和风险增加为代价,使用更强大的计算。

- 未来的行星飞行任务正在探索**FPGA**和专门的AI加速器,这些加速器可以耐辐射,同时提供比传统硬度CPU多得多的计算,有可能首次使机上深入学习成为可能。

## 非结构化地形中的自主导航



- 在地球上,道路平坦,有良好的标志和地图。在火星上,月亮上,或者一个灾难地点,没有道路. 地势无结构:岩石,坡地,沙地,碎屑等地,地表可能不支持机器人的重量.

- ** 火车分类** 评价每一块地段是否安全可穿越。地貌包括坡度(从3D重建),粗糙度(地表常态变化),岩石密度和土壤类型等. 古典方法从立体深度图中计算出这些特征;现代方法在视觉和几何特征上使用已学到的分类器.

- ** 视觉-惯性偏振测量(VIO)** 通过跟踪相机相框上的视觉特征并用IMU的测量来估计机器人的运动. 这是SLAM(第8章)的核心部分,适应了极端条件。在火星上,VIO必须处理:无地貌的沙地地(为跟踪而选择视觉特征),严酷的照明(极光阴影)和有限的计算.

- 估计值将使用**扩展卡尔曼滤波器** 或系数图优化,从而影响视觉和惯性数据。状态向量包括位置、速度、取向和IMU偏差。预测步骤使用IMU集成:

$$\mathbf{x}_{t+1} = f(\mathbf{x}_t, \mathbf{u}_t)$$

- 地点$\mathbf{u}_t$是IMU测量(加速和角速度)。更新步骤用视觉特征观测来校正预测. 这是贝叶斯人的估计(第五章):IMU提供了一种先验的,视觉观察更新了信仰.

- ** 在行星着陆期间,严重避险** 至关重要。当航天器向地表下降时,它必须使用机上相机或LiDAR实时识别安全着陆区. NASA的**Train相对导航(TRN)**系统在恒定上将机载相机图像比作预装轨道图以确定其降落时的位置,再从危险地上向外方向行走. 这使得能够降落在杰斯罗-克拉特,这是一个科学上丰富但地形危险的地点,对前几次任务来说风险太大。

## 水下机器人



- 深海与太空一样陌生:压出压力(1000+全洋深度的大气),能见度接近零,没有GPS,通信有限. 水下机器人对海洋科学、近海基础设施检查、深海采矿和搜索作业至关重要。

- ** AUVs**(水下自主车辆)操作无节制,自带电能并进行计算。它们遵循预先编程的勘测模式,或使用机上智能来适应发现. AUV用于海底测绘、管道检查和环境监测。

- **ROVs**(远程运行的车辆)由提供电力和通信的电缆同水面船只接上。它们被用于需要人类实时控制的任务:深海操纵、建造和修理。绳索可以去除通信的制约,但限制了范围并增加了操作的复杂性.

- ** 声波通信**是水下的主要通信方法(无线电波在水中迅速减弱)。相较于陆地上的张量,声调调制解调器在几公里范围内的数据速率达到1-10克/秒。这比火星通信更受制约,迫使AUV高度自主.

- ** 水下LAMM**尤其具有挑战性。声纳提供测距测量,但角分辨度差,噪音大(海底和地表的多路径反射)。相机只在很短的距离内工作(在清水中几米,在扰动条件下较少). 基于地貌的视觉 SLAM(第8章)必须适应水下场景独特的视觉特征:颜色衰减(红光被先被吸收),后散射,以及产生亮点和深影的人工照明.

- 没有全球定位系统的导航使用**死计数**(利用声波多普勒转动测量海底速度的多普勒高速日志DVL集成速度),借助于偶尔从地表转发器上对全球定位系统进行校正或声波定位。这与IMU唯一的导航相同:小速度出错在长时间的任务中累积.

## 搜索与救援机器人



- 在地震,建筑倒塌,或工业事故后,机器人会进入对人类救援人员来说太危险的空间:结构不稳定的建筑物,有毒的环境,火灾,或者被封闭的空间.

- 要求是:快速部署(分钟,而非小时),在全球定位系统所拒绝的环境(内部建筑、地下)运作,通过墙壁和瓦砾进行强力通信,以及能够以碎片、灰尘和灯光不佳的方式导航高度杂乱的、部分倒塌的空间。

- **多机器人协调**在搜索和救援中很有价值,因为一队机器人能够覆盖大面积的速度快于单个机器人. 挑战在于协调:机器人必须划分搜索区域,避免重复努力,分享发现.

- **Frontier-based exploration**将机器人指定为被探索和未探索空间的界限("边"). 每个机器人都航行到最近的未探索边界,绘制地图,然后继续前进。中央或分布式规划师将疆域分配给机器人,以将探索时间减少到最小程度。这是一个覆盖优化的问题。

- 通过瓦砾进行通信是不可靠的。机器人可能与操作员和对方失去联系. 系统必须坚固以断断续续的通信:每个机器人都应该能够独立运行,建立自己的本地地图并做出自己的决定,然后在恢复通信时合并信息.

## 群体机器人



- ** Swarm 机器人** 使用大量简单而低成本的机器人,通过本地互动实现复杂的集体行为. 没有一个单一的机器人能够单独完成,但整个群星可以完成任何个体都无法完成的任务.

- 灵感来源于生物群:蚂蚁用身体搭起桥梁,蜜蜂对巢穴地作出集体决定,鱼校通过协调运动来躲避捕食者. 在每一种情况下,简单的当地规则(跟随相邻者,避免相撞,走向食物)都会产生复杂的全球行为.

- ** 权力下放控制** 意味着没有中央指挥官。每个机器人都遵循相同的本地规则,只对其相邻者和即时环境作出反应. 全球行为**产生于这些地方互动**。这使得群生具有内在的坚固性:如果一个机器人失败,群生会继续. 不存在一个失败点。

- ** Consensus算法** 使一群人能够只通过本地通信就集体决定达成一致(例如,哪个方向移动,哪个任务优先). 一个简单的共识协议 每一个机器人平均对它的邻国的价值:

$$x_i(t+1) = \frac{1}{|N_i| + 1} \left(x_i(t) + \sum_{j \in N_i} x_j(t) \right)$$

![Swarm共识:机器人开始分散,与邻居反复平均,并汇合到一个共享的地点](../images/swarm_consensus.svg)

- 地点$N_i$是机器人的一组$i$邻居 这被延长,直到所有机器人都汇合到同值(全球平均值). 趋同率取决于通信图的地貌,具体来说是其代数连接(图Laplacian的第二小等同值,从第二章连接到等同值).

![雷诺兹的三条羊群规则: 分离可以避免相撞,对齐方向,凝聚力和群体在一起](../images/reynolds_flocking.svg)

- ** Flocking算法**(Reynolds' rules)产生协调的群动,每个机器人有三条简单的规则:
    - ** 分离**:远离距离太近的邻国(避免碰撞)。
    - ** 调整**:向邻居的平均方向行进(朝同一方向行走)。
    - ** 配合**:向邻国的平均地位方向行进(与该组保持距离)。

- 每条规则都是对机器人速度的向量贡献. 这些载体的加权总和产生自然的群集行为. 这是向量的线性组合(第一章),其中权重控制了每种行为的相对重要性.

- 成群机器人的应用包括环境监测(在大面积分布传感器)、精密农业(协调用于作物喷洒的无人机)、建筑(机器人集体组装结构)和搜索作业(有效覆盖了大面积区域)。

## 人机交互



- 大多数现实世界的自主系统与人类并肩运作,而不是孤立地运作. 人和机器人之间的互动,他们如何沟通,共享控制,建立信任,与机器人的技术能力同样重要.

![共享自主谱:从完全人类远程操作(alpha=1)到混合控制到完全机器人自主(alpha=0)](../images/shared_autonomy_spectrum.svg)

- ** 分享自主性** 结合了人和机器人的控制。与其说完全的远程操作(人类控制一切)或完全自主(机器人控制一切),共享自主让人类提供高层次的意向,而机器人则处理低层次的处决. 例如,一个人类可能指向一个物体并说"捡起",机器人自主地计划了抓取和手臂运动.

- 数学上,共享自主可以模拟为人类输入的混合$\mathbf{u}_h$机器人的自主动作$\mathbf{u}_r$:

$$\mathbf{u} = \alpha \mathbf{u}_h + (1 - \alpha) \mathbf{u}_r$$

- 地点$\alpha \in [0, 1]$是混合参数。何时$\alpha = 1$,人类有完全的控制(电信操作). 何时$\alpha = 0$机器人是完全自主的 适应性共享自主调整$\alpha$基于情况:机器人在自信时掌握更多的控制权,在不确定或情况新颖时放弃控制权.

- ** 对于超出目前自主能力的任务,电信业务**仍然很重要。人类操作员对机器人进行远程控制,通过机器人相机观看现场. 挑战是**适切性**:即使100米的延迟也使得远程操作变得困难,而空间多秒的延迟则几乎不可能进行精细的操纵. 预测性显示(显示机器人的预测未来状态)和虚拟固定(防止操作员指挥危险运动的软件指南)有助于补偿.

- ** 信任校正** 是确保人类对机器人有适当信任的问题:不是太多(过度信任会导致自满,在需要时无法干预),也不是太少(不信任导致不必要的干预和使用不足)。信任应该与机器人的实际能力相适应:相信它能很好地处理情况,并在接近其能力边缘的情况下持怀疑态度.

- 研究显示,信任受到以下因素的影响:机器人的透明度(它是否解释其决定?),可靠性(它是预测失败还是随机失败?),以及通信(它是否表示不确定性?). 一个机器人说,“我百分之四十相信这是一条安全的道路, 我应该继续吗?” 能够比默默地推动人类作出更好的决策。

- **可识别性**在机器人运动中指机器人以向附近的人类传达其意图的方式移动. 如果一个机器人到达某个物体,其路径应该能够使它的目标对象明显,甚至在它到达之前. 这涉及规划出轨迹,最大限度地使观察者及早推断出目标的能力,鉴于观察到的部分轨迹,可将其正规化为最大地实现真正目标的后几率:

$$\pi^* = \arg\max_\pi P(G \mid \xi_{0:t})$$

- 地点$G$目标是$\xi_{0:t}$是迄今为止观测到的轨迹。这使用了贝叶斯推论(第五章):观察者有一个比可能的目标更先入为主,机器人的轨迹提供了更新这种信念的证据.

## 编程任务（使用 Colab 或 notebook）



1. 模拟一组机器人就目标位置达成一致的共识算法. 起先随机起步位置并观看会合.
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

2. 执行雷诺兹的群集规则(分化,会合,会聚)并模拟一群人一起移动.
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

3. 模拟共享自主混合:人提供吵闹的方向输入,机器人的自发系统为入球提供了平滑的路径. 用不同的α值来混合它们.
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
