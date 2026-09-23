---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 11 - autonomous systems/04. self-driving.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 78739e6ba07242fcb5f61af14d42a3cd081886ff7868ccce5036849fc6b5b68d
status: reviewed
---
# 自动驾驶汽车

*自动驾驶把感知、预测、规划和控制组合成一个需要安全约束的闭环系统。本篇覆盖自动驾驶栈、高精地图、运动预测、规划、端到端驾驶、世界模型、仿真、安全和自动化等级。*


*自驾汽车是商业上最先进的自主系统,将感知,预测,规划,控制整合为一款车辆. 这个文件涵盖自主驱动栈,HD地图,运动预测,规划,端到端驱动,模拟,安全标准,自主程度*

- 自驾车是规模最大的机器人问题 与在受控环境中运行的工厂机器人不同,自驾车必须处理一个开放的世界:不可预测的人类驾驶员,行人行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行走行行走行走行走行走行走行走行走行

- 利害关系也特别高。一辆自驾车在弱势道路使用者中以高速行驶。安全关键故障的容错度接近于零.

## 自动驾驶栈



- 古典自驾式建筑是一个有四个阶段的**模态管道**,每个阶段都注入下一个阶段:

$$\text{Perception} \to \text{Prediction} \to \text{Planning} \to \text{Control}$$

![自动驱动栈:传感器反馈感知,用于预测、规划和最终控制](../images/autonomous_driving_stack.svg)

- ** Perception**(本章第1卷所覆盖)将原始传感器数据处理成结构化的场景表现:被检测出具有3D位置,速度,和类标签的物体;道道标;交通灯;可驾驶地表边界.

- ** 预测**预测其他人员(车辆、行人、骑自行车者)今后将如何行动。鉴于场景的目前状况,预测模块输出出在一定时间范围内(通常为未来3-8秒)每种剂的轨迹.

- ** 规划** 决定自负车应做什么:走哪条路,何时改变车道,何时屈服,何时加速或刹车。它需要预想的场景,为自负飞行器制造出一条安全,舒适并朝着目的地前进的轨迹.

- ** 控制** 将计划轨迹转换成起动器命令:方向角、节流和制动。这是最低的关卡,将抽象的轨迹转化为物理运动.

- 模块化设计具有明显的工程优势:每个模块都可以独立开发,测试,改进. 但是它也有缺点:错误在下游传播(计划者看不见错失的检测),在每个接口丢失信息(规划者看到绑定的盒子,而不是产生这些盒子的丰富的传感器数据).

## 高精地图



- ** 高定(HD)地图**是详细、精确的数字地图,其中编码了道路结构:道道界;道道连接(在相交处与道道相接);交通标志位置;速度限制;横道位置;和公路地表高地。

- HD地图为驱动任务提供了很强的先导. 感知模块不需要从头发现每个帧的道边;它只需要在地图中定位飞行器,并验证现实与所存储的结构相匹配. 这大大简化了规划。

- 建造HD地图需要配备高端LiDAR、相机和RTK-GPS的专用勘测车。随着道路的改变,必须保持和更新地图。这很昂贵,而且不易在地球上的每条道路上推广。

- **无线驱动**(也叫"在线映射")旨在消除对已预先建成的HD地图的依赖. 相反,该车辆从传感器上实时绘制出本地地图。如**MapTR**和**MapTRv2**等模型利用变压器架构,直接从相机图像中预测向量化的地图元素(行车中线,道路边界,行人过道),输出多线作为定点序列.

- 无地平线取而代之的是地图精度可伸缩性:汽车可以开走的任何道路,都可以出地平线. 但是,它要求感知系统足够强大,能够实时地检测出所有相关的道路结构,包括复杂的相交道口,高速公路坡道和建筑区.

- 在实际操作中,许多系统采用混合方式:一种带有粗糙道路地貌的轻量级地图(从现有的地图提供者),由车辆传感器实时丰富.

## 运动预测



- 预测其他道路使用者将到哪里去是自驾车中最难解决的次问题之一. 人类是无法预测的,意图是隐藏的,可能的未来的分枝空间迅速.

- 对预测模型的输入是: ** scene上下文**:近代所有被检测到的物剂的位置和速度(典型的为1-2秒历史),加上静态上下文(线程几何,交通信号,道路边界等).

- 输出为每剂的一套**预想轨迹**,通常覆盖3-8秒到未来. 由于未来的不确定性,好预测模型输出出多个可能的轨迹,并伴有相联的概率,而不是一个点估计.

- ** 预测**作为一个回归问题:预测未来$(x, y)$在离散的未来时间步骤上,每个剂的坐标。损失一般是:$K$预测轨迹 :

$$\text{minADE}_K = \min_{k \in \{1, \ldots, K\}} \frac{1}{T} \sum_{t=1}^{T} \| \hat{\mathbf{p}}_t^{(k)} - \mathbf{p}_t \|_2$$

- 这是最佳 $K$ 个预测（best-of-$K$）指标：只要模型给出的 $K$ 个轨迹中有一个接近真实轨迹，就能获得较高分数。这鼓励模型生成多样的多模态预测。

- ** 社会力量** 示范行人行为是一种动态系统,每个人在其中都经历有吸引力的力量(向着目标走去)和反感力量(远离其他行人和障碍物)。人的加速$i$即:

$$\mathbf{a}_i = \frac{\mathbf{v}_i^{\text{desired}} - \mathbf{v}_i}{\tau} + \sum_{j \neq i} \mathbf{f}_{ij}^{\text{repulsive}} + \sum_{\text{walls}} \mathbf{f}_{\text{wall}}$$

- 这是一个与本章文件2的机器人动力学方程相类似的微分方程系统. 该模型优雅但依赖于手调力参数,并和复杂的多剂相互作用相抗衡.

- **GNNs)**用于预测场景的模型作为图:每个物剂是一个节点,边缘代表空间关系(相近,道共享). 节点之间传来的信息捕捉到交互:"这辆车正在向行人屈服"或"这两辆车正在合并入同道".

- 现代预测架构（如 **MTR**、**QCNet**）使用基于 Transformer 的模型，共同推理交通参与者的历史、地图上下文以及参与者之间的交互。模型通过交叉注意力关注相关地图特征（当前车道、前方路口）和其他参与者（前车、斑马线上的行人），再以自回归方式或混合模型生成一组轨迹假设。

- **目标条件预测**首先预测某剂可能去的地方(一组候选入球点,如道端点或相交出站等),然后预测通向每个入球的轨迹. 这把问题分解为"哪里"(分明,可管理)和"如何"(持续给定了目标路径),使得多式预测问题更容易被取道.

## 规划



- 考虑到预想的场景,计划者必须为自负飞行器制造出一个轨迹. 这是一个受限制的优化问题:找到安全、舒适、高效和合法的轨道。

- **基于规则的规划者** 将驾驶行为编码为一套如果当时的规则:"如果行人走在横道上,屈服","如果前面与车辆的间隔不足2秒,不要改变车道","如果靠近一盏红灯,减速到停站线停车". 这些规则是可解释和可审计的,但对复杂的情景(上千个规则,许多边缘案例,规则之间的相互作用)来说,它们变得毫无用处.

- ** 基于优化的规划者** 将驾驶作为轨道优化。自我轨迹是参数化的(例如,作为下列序列):$(x, y, \theta, v)$并尽量减少客观函数:

$$\min_{\boldsymbol{\xi}} \underbrace{w_1 \cdot J_{\text{progress}}(\boldsymbol{\xi})}_{\text{get to destination}} + \underbrace{w_2 \cdot J_{\text{comfort}}(\boldsymbol{\xi})}_{\text{smooth ride}} + \underbrace{w_3 \cdot J_{\text{safety}}(\boldsymbol{\xi})}_{\text{avoid collisions}}$$

$$\text{subject to: } \text{kinematic constraints, speed limits, lane boundaries}$$

- 进步一词惩罚偏离所希望的路线的行为。舒适的名词惩罚高平向上加速,混蛋(加速的衍生物)和出乎意料地方向行驶,因为乘客有这种感觉. 安全术语惩罚接近其他物剂的行为,使用预测的轨迹来评价相撞风险.

- 这是受限制的优化(第3章):尽量减少受到不平等制约的成本函数。重量$w_1, w_2, w_3$(攻击性驾驶速度快,但不太舒适,安全性也较差)。

- ** 基于学习的规划者** 利用接受过人类驾驶数据培训的神经网络产生出轨迹。该模型观察现场,直接输出计划轨迹,从人类驾驶专家的例子中吸取复杂的取舍。

- 其优点是人类驾驶行为被整体地抓住,包括微妙而难于正规化的方面:如何激烈地合并,何时在十字路口向前推进,给骑自行车的人多少空间. 缺点是模仿学习(文件2)的同一分布转移问题:在培训数据中代表性不高的情况下,模型可能表现不可预测。

## 端到端驾驶



- ** 端到端驱动** 完全去除模块边界。单个神经网络取原始的传感器输入(相机图像,LiDAR点云)并直接输出驱动指令(steering,prottle,brake)或计划轨迹. 没有单独的感知、预测或规划模块。

- 吸引力在于整个系统都为最终任务(安全驾驶)共同优化,因此在模块边界没有丢失任何信息. 感知模块学习精确地取出规划者所需的特征,而不是可能不捕捉任务相关细节的通用对象检测.

- **UniAD**(统一自主驾驶)是一个标志性的端到端架构. 它通过一个BEV编码器处理多相机图像,然后应用以变压器为基础的模块的级联:跟踪,在线映射,运动预测,占用率预测和规划. 虽然它有内部模块,但它们都是不同的,经过联合培训的端到端,规划损失通过整个网络进行回传.

- UniAD的规划模块通过关注预测的BEV特征,预测的物剂轨迹和预测的入住量,产生出未来的自负车辆出行点. 这就是动作中的多变链规则(第3章):梯度从规划丢失一直流回图像编码器,告诉感知特征如何对规划更有用.

- 更近期的端到端方法使用VLA风格的架构(本章文件3). 如**DriveVLM**等型号取相机图像和导航指令(或路线),并使用VLM主干线产生驱动动作. 这使得大规模预训(视觉理解,推理)的好处直接被推入了驱动堆.

- 端到端驱动的紧张是**可解释性**. 一个模块化系统可以报告"我检测出行人于(x,y)并预言他们会穿越"，，故障模式是可诊断的. 端到端系统是产生方向角的黑匣子. 失败后,诊断为何困难,这是对安全认证的严重关切.

## 驾驶世界模型



- 一个**世界模式** 学会预测驾驶场的未来状态,$p(s_{t+1} \mid s_t, a_t)$(如第十章所介绍). 在驾驶中,这意味着生成现实的未来相框或BEV布局:"如果我加速并左转,场景将在3秒后看起来像这样".

- 世界模型提供了两种强大的自我驾驶能力:

    - **以想象为基础的规划**:计划者不但没有承诺采取行动并看到结果,还可以通过世界模式推出多个候选的轨迹来"想象",评价每个轨迹是否安全舒适,选择最佳. 这是适用于驾驶的基于模型的RL(覆盖在本章文件2中).

    - ** 学习模拟**:接受过真实驱动数据培训的世界模型实际上是一个由数据驱动的模拟器。它产生现实的情景(包括罕见的边缘案例),而无需人工建造手动模拟器. 关键的是,它捕捉了真实驱动的统计规律:其他驱动器的实际行为方式,照明的变化方式,雨水如何影响能见度.

- **GAIA-1** (Wayve)是一款以基因为主的驱动世界模型. 鉴于过去相机帧和自负车辆动作的顺序,它自动地生成了未来的视频帧. 它使用以动作输入为条件的视频传播架构. 该模型学习产生可信的未来:遵守交通规则的车辆,行人行道上行走的行人,以及正确过渡的交通信号灯,都来自训练数据而不是编程规则.

- ** DriveDreamer**和**GenAD**采取类似的做法,但在BEV空间而不是像素空间中运行. 预测未来的BEV布局比生成完整的视频帧更为紧凑(类似于机器人中的DreamerV3在潜在空间而不是像素空间中如何预测,文件2中对此有讨论). BEV世界模型预测所有物剂将在哪里,道路结构会是什么样子,以及存在自由空间的地方,规划者直接使用这个.

- **神经闭路模拟**使用世界模型来取代手建模拟器进行测试. 鉴于一个真正的驾驶记录作为起点,世界模型会产生如果自负车采取了不同行动会发生什么. 这样可以进行反事实评价:“如果我在0.5秒后刹车呢?” 不需要重新创造这个情景

- 与**JEPA**框架(第十章)的联系是自然的。驱动世界模型不需要预测像素完美的未来(每个像素精确的RGB值). 他们需要预测规划中很重要的方面:代理人在哪里,他们移动的速度有多快,自由空间在哪里. 嵌入-空间预测(JEPA-style)捕捉出这些具有分解意义的属性,而不将能力浪费在像精确的云纹等无关的视觉细节上.

- 主要挑战在于**长期忠诚**。世界模型随时间推移而累积出错误:帧2的一个小错误会转移出所有后续的帧. 对于驾驶来说,3秒的预测视野对于战术决策(我是否应该现在合并?)是有用的,但30秒的视野(像路线规划这样的战略决策需要)仍然不可靠. 目前的工作通过重新选择(定期用真实的观察来重新确定模型)和不确定性估计(预测变得不可靠时会摇摆)减轻了这种情况。

## 仿真



- 在真正的公路上驾驶自驾汽车进行测试是必要的,但还不够。危险的情景(近碰撞,边缘病例)是罕见的,因此由英里驱动的测试效率低下. 一辆汽车需要开上亿英里的车 才能从统计学上证明安全 这不可行

- ** 模拟**提供无限、可控制和安全的测试。现实世界中罕见的情景(一个孩子跑入道路,轮胎爆裂,突然障碍)可以在模拟中测试上千万次.

- ** CARLA**是一款开源驱动模拟器,由不真实引擎所建. 它提供现实的城市环境,动态天气,交通代理,以及传感器模拟(相机,LiDAR,雷达). 研究人员使用CARLA来培训基于RL的驾驶员并评价感知算法.

- **nu Plan** (Motional)是一个闭路规划基准. 与开放评价(重放已记录的数据并比较计划员的输出与人驾驶员的实际轨迹)不同,闭放评价让计划员的决定会影响模拟:如果计划员决定改变车道,模拟则会相应演变. 这测试了反应行为,而不仅仅是轨迹相似.

![Open-loop 不交互重放日志; Closed-loop 让模型的动作改变模拟状态](../images/open_vs_closed_loop.svg)

- 将**开放-开放**和**封闭-开放**的评价加以区分至关重要:

    - Open-loop:重放被记录的情景,计算模型的输出与人类驱动器动作有多相近. 这很容易设置,但误导:一个总是预测"走直"的模型可能会在高速公路上出现低误差,但在一转弯时会崩溃.

    - 闭路:模型的动作会改变模拟状态,而模拟则会因应而演变. 这考验了模型从自己的错误中恢复和对动态情况作出反应的能力. 其费用要高得多,但意义要大得多。

- ** 假设生成** 产生强调该系统的试验案例。不良情景(车辆突然刹车,行人隐藏在停放的汽车后)是通过优化自驾系统表现最差的情况产生的. 这与ML的对抗性培训有关(第六章):寻找最大限度地减少损失的投入。

## 安全



- 自驾车的安全性受工程标准规范,而不只是ML度量衡.

- **ISO 26262**(功能安全)是安全关键电子系统的汽车标准. 它根据潜在危害的严重程度、暴露程度和可控性,从A(最低)到D(最高)界定了**自传式安全完整性水平。自动驾驶系统的感知和规划组件一般是ASIL-D,是最高的一级,需要广泛的核查,冗余,并进行故障安全设计.

- ** SOTIF**(预期功能的安全,ISO 21448)处理的是不同类别的危害:不是硬件故障(ISO 26262覆盖),而是系统按照设计运作但依然产生不安全结果的情况. 一个将一辆白色卡车错误地归类为"天空"的感知模型(一个真正的事件)是一个SOTIF问题:硬件工作正常,但算法的局限性造成了危险.

- ** 业务设计域** 界定了自驾系统在下列条件下运行:具体地理区域、道路类型(仅高速公路、城市、两地)、天气条件(无大雪)、速度范围以及白天时间。ODD以外的操作是不允许的:如果系统不能处理下雪,它就不得在下雪中行驶.

- ** 故障保险**与** 故障保险** 设计:
    - 故障安全:当检测出断层时,系统会向安全状态过渡(例如,拉倒和停止). 这是最起码的要求。
    - 操作失败:尽管存在故障,该系统仍继续安全运行,使用冗余组件. 配备了冗余方向盘,制动和计算功能的自驾车可以在单个组件故障后幸存下来并仍能驾驶到安全地点.

- ** 解雇**是根本问题。临界感知传感器被复制:多个相机覆盖了相重叠的视域,LiDAR和雷达都提供独立的深度测量,双计算平台运行同一软件. 如果任何单个组件失败,其他部件则提供足够的信息来安全地驱动.

## 自动驾驶等级



![SAE自主水平从L0(无自动化)到L5(完全自动化),显示责任从人转移到系统的地方.](../images/sae_autonomy_levels.svg)

- **SAE J3016**标准定义了从0(无自动化)到5(全自动化)的6个驾驶自动化等级:

    - ** 0级(不自动化)**:人类什么都做. 该系统可能提供警告(出站提示),但并不控制车辆。

    - ** 1级(司机协助)**:系统控制方向或速度,但两者不同时进行。适应性巡航控制(保持速度并跟随距离)或车道守备协助(保持车道以车道为中心)为一级.

    - ** 第2级(Partial Automation)**:系统同时控制方向和速度,但人必须随时监测并准备接任. Tesla Autopilot,GM超级巡航,以及目前大多数"自驾车"的功能都是第2级. 人类仍然是负责的驱动者.

    - ** 第三级(有条件自动化)**:系统驱动并监测环境,但只在具体条件下(ODD). 人类可以脱离,但必须在系统要求时做好准备接任(带有时间缓冲,一般为10+秒). 梅赛德斯驱动驾驶所(某些高速公路上,低于60km/h)是第一个认证的三级系统.

    - ** 第4级(高度自动化)**:系统驱动和处理其ODD范围内的所有情况,不需要人干预。如果在ODD之外遇到某种情况,它可以安全地停止自己. Waymo的机器人轴服务在特定地理区域运行于4级.

    - ** 第5级(Full Automation)**:系统在各种条件下,将人类的能动器驱动到任何地方. 不需要方向盘或踏板。这还不存在。

- 关键区别在于**谁负责安全**。在0 -2级,人类负责。在3至5级,该系统负责(在其ODD范围内)。这具有深刻的法律、保险和道德影响。

- 目前的工业状态是二级(广泛部署)、三级(开始部署)和四级(有限的地域部署)的混合。5级仍然是长期的研究目标.

## 编程任务（使用 Colab 或 notebook）



1. 执行简单的轨道优化规划器。鉴于一个起步位置,目标,以及障碍,利用梯度下移找到最平滑的无相撞路径.
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Trajectory: N waypoints, each (x, y)
N = 20
start = jnp.array([0.0, 0.0])
goal = jnp.array([10.0, 0.0])
obstacle = jnp.array([5.0, 0.0])
obs_radius = 1.5

# Initialise: straight line from start to goal
waypoints_init = jnp.linspace(start, goal, N)

def cost(waypoints):
    wp = jnp.concatenate([start[None], waypoints, goal[None]], axis=0)

    # Smoothness: penalise acceleration (second differences)
    accel = wp[2:] - 2 * wp[1:-1] + wp[:-2]
    smooth_cost = jnp.sum(accel ** 2)

    # Obstacle avoidance: penalise proximity
    dists = jnp.linalg.norm(wp - obstacle, axis=1)
    collision_cost = jnp.sum(jnp.maximum(0, obs_radius + 0.5 - dists) ** 2)

    return 10 * smooth_cost + 100 * collision_cost

grad_cost = jax.grad(cost)

# Optimise the interior waypoints
waypoints = waypoints_init[1:-1]
lr = 0.01
for _ in range(500):
    g = grad_cost(waypoints)
    waypoints = waypoints - lr * g

# Plot
full_path = jnp.concatenate([start[None], waypoints, goal[None]], axis=0)
theta = jnp.linspace(0, 2 * jnp.pi, 100)

plt.figure(figsize=(10, 4))
plt.plot(full_path[:, 0], full_path[:, 1], "b.-", label="Optimised path")
plt.plot(waypoints_init[:, 0], waypoints_init[:, 1], "r--", alpha=0.5, label="Initial (straight)")
plt.fill(obstacle[0] + obs_radius * jnp.cos(theta),
         obstacle[1] + obs_radius * jnp.sin(theta), alpha=0.3, color="red", label="Obstacle")
plt.plot(*start, "go", markersize=10); plt.plot(*goal, "g*", markersize=15)
plt.legend(); plt.axis("equal"); plt.grid(True)
plt.title("Trajectory Optimisation: Smooth Collision-Free Path")
plt.show()
```

2. 模拟匀速运动预测模型，并将转弯车辆的预测结果与真实轨迹比较。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Ground truth: vehicle turning right
dt = 0.1
T = 40  # 4 seconds
v = 10.0  # m/s
omega = 0.3  # rad/s (turning rate)

# True trajectory (constant turn rate)
t = jnp.arange(T) * dt
theta = omega * t
gt_x = (v / omega) * jnp.sin(theta)
gt_y = (v / omega) * (1 - jnp.cos(theta))

# Constant velocity prediction from t=0
# Assumes the car continues straight at its current heading
obs_steps = 10  # observe first 1 second
vx0 = v * jnp.cos(theta[obs_steps - 1])
vy0 = v * jnp.sin(theta[obs_steps - 1])
pred_t = jnp.arange(T - obs_steps) * dt
pred_x = gt_x[obs_steps - 1] + vx0 * pred_t
pred_y = gt_y[obs_steps - 1] + vy0 * pred_t

plt.figure(figsize=(8, 6))
plt.plot(gt_x[:obs_steps], gt_y[:obs_steps], "ko-", label="Observed")
plt.plot(gt_x[obs_steps:], gt_y[obs_steps:], "g-", linewidth=2, label="True future")
plt.plot(pred_x, pred_y, "r--", linewidth=2, label="Constant velocity prediction")
plt.legend(); plt.axis("equal"); plt.grid(True)
plt.xlabel("x (m)"); plt.ylabel("y (m)")
plt.title("Constant Velocity Prediction vs Turning Vehicle")
plt.show()
```

3. 实施一个简单的基于规则的规划员,根据所发现的障碍来决定车道的保持和停站。
```python
import jax.numpy as jnp

def rule_based_planner(ego_speed, obstacles, speed_limit=13.9):
    """
    Simple rule-based planner.
    ego_speed: current speed (m/s)
    obstacles: list of (distance, speed) tuples for vehicles ahead
    speed_limit: max allowed speed (m/s), default ~50 km/h

    Returns: (target_speed, action_label)
    """
    min_following_distance = 2.0 * ego_speed  # 2-second rule
    emergency_distance = 5.0  # metres

    if not obstacles:
        return speed_limit, "cruise"

    # Find closest obstacle ahead
    closest_dist, closest_speed = min(obstacles, key=lambda o: o[0])

    if closest_dist < emergency_distance:
        return 0.0, "EMERGENCY STOP"
    elif closest_dist < min_following_distance:
        # Match speed of vehicle ahead
        target = min(closest_speed, speed_limit)
        return target, "following"
    else:
        return speed_limit, "cruise"

# Test scenarios
scenarios = [
    (13.9, [], "Empty road"),
    (13.9, [(30.0, 10.0)], "Slower car ahead"),
    (13.9, [(3.0, 0.0)], "Stopped car very close"),
    (13.9, [(50.0, 13.9)], "Car ahead at same speed"),
]

for speed, obs, desc in scenarios:
    target, action = rule_based_planner(speed, obs)
    print(f"{desc:30s}  →  {action:15s} target_speed={target:.1f} m/s ({target*3.6:.0f} km/h)")
```
