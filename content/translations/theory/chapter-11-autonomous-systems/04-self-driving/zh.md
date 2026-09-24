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

*自动驾驶汽车是迄今为止最商业化的自主系统，将感知、预测、规划和控制整合到一个车辆中。本文件涵盖了自动驾驶栈、高分辨率地图、运动预测、规划、端到端驾驶、模拟、安全标准以及自动驾驶等级*

- 自动驾驶汽车无疑是最大的机器人难题，因为它们必须在开放世界中操作：不可预测的人类驾驶员、行人横穿马路、夜间出现的施工区域和瞬息万变的天气。

- 也正因为如此，自动驾驶汽车的安全要求极高。它们在高速公路上与脆弱的路权者共处，对于安全关键故障的容忍度几乎为零。

## 自动驾驶栈

- 传统的自动驾驶架构是一个**模块化管道**，包含四个阶段，每个阶段都向下一个阶段输出数据:

$$\text{Perception} \to \text{Prediction} \to \text{Planning} \to \text{Control}$$
![](../images/autonomous_driving_stack.svg)


- **感知**（在本章第1节中讨论）处理原始传感器数据，将其转换为结构化的场景表示：检测到的对象的3D位置、速度和类别标签；车道标记；交通灯；可行驶表面边界。

- **预测**预测其他agents（车辆、行人、自行车）在未来的行为。给定当前场景的状态，预测模块输出每个agent在时间跨度（通常为3到8秒）内的轨迹。

- **规划**决定ego车辆应该做什么：跟随哪个路径、何时变道、何时让行、何时加速或刹车。它使用预测的场景生成ego车辆的安全、舒适和向目的地前进的轨迹。

- **控制**将计划的轨迹转换为执行命令：转向角度、油门和制动。这是最低级别的模块，将抽象的轨迹转化为实际运动。

- 模块化设计带来了明显的工程优势：每个模块都可以独立开发、测试和改进。但同时也存在弱点：错误会向下传播（一个漏检测到的对象对规划器是不可见的），并且信息在接口之间丢失（规划器看到的是边界框，而不是生成它们的丰富传感器数据）。

## 高分辨率地图（HD地图）

- **高分辨率（HD）地图**是厘米级精确的数字地图，编码了道路结构：车道边界、车道连接（在交叉口连接到哪个车道）、交通标志位置、速度限制、人行横道的位置和道路表面高度。

- HD地图为驾驶任务提供了一个强大的先验信息。感知模块不需要每帧都从头开始发现车道边界，它只需要在地图中定位车辆并验证现实与存储结构匹配即可。这大大简化了规划工作。

- 构建高精度地图需要专门的测绘车辆，配备高端激光雷达、摄像头和RTK-GPS。这些地图必须定期维护和更新，以应对道路的变化。这非常昂贵，并且难以扩展到地球上的每一条路。

- **无地图驾驶**（也称为“在线地图”）旨在消除对预先构建的高精度地图的依赖。相反，车辆在实时从其传感器中构造本地地图。模型如 **MapTR** 和 **MapTRv2** 使用Transformer架构直接从摄像头图像预测矢量化地图元素（车道中心线、道路边界和人行横道），输出为有序点序列。

- 无图模式在准确性上牺牲了可扩展性：只要汽车可以行驶的道路，它都可以进行地图绘制。但需要感知系统能够实时检测到所有相关的道路结构，包括复杂的交叉口、高速公路匝道和施工区域等。

- 实际上，许多系统采用混合方法：一个轻量级的地图，包含现有地图提供商提供的粗略道路拓扑结构，在实时通过车辆传感器进行补充。

## 车辆运动预测

- 预测其他道路使用者将去往何处是自动驾驶中最具挑战性的一个子问题。人类不可预测，意图隐藏，未来可能的分支迅速增加。

- 预测模型的输入是**场景上下文**：最近过去（通常1-2秒）检测到的所有代理的位置和速度，加上静态上下文（车道几何、交通信号、道路边界）。

- 输出是一组每个代理的**预测轨迹**，通常覆盖3-8秒的未来。由于未来是不确定的，好的预测模型会输出多个可能的轨迹，并附带概率，而不是单一的点估计。

- **轨迹预测**作为回归问题：预测每个代理在离散未来时间步的未来 $(x, y)$ 坐标。损失通常是基于 $K$ 预测轨迹的最小平均位移误差（minADE）：

$$\text{minADE}_K = \min_{k \in \{1, \ldots, K\}} \frac{1}{T} \sum_{t=1}^{T} \| \hat{\mathbf{p}}_t^{(k)} - \mathbf{p}_t \|_2$$
- 这是一个“最佳 $K$”指标：如果模型的 $K$ 预测接近真实值，它就会得到奖励。这鼓励多样化的多模态预测。

- 社会力量模型将行人行为视为一个动态系统，其中每个人体验到吸引力（向目标方向）和排斥力（远离其他行人和障碍物）。 $i$ 的加速度是：

$$\mathbf{a}_i = \frac{\mathbf{v}_i^{\text{desired}} - \mathbf{v}_i}{\tau} + \sum_{j \neq i} \mathbf{f}_{ij}^{\text{repulsive}} + \sum_{\text{walls}} \mathbf{f}_{\text{wall}}$$
- 这是一个类似于本章第2节机器人动力学方程的系统，模型优雅但依赖于手调力参数，并在复杂多体交互中挣扎。

- **图神经网络（GNNs）**用于预测场景为图：每个代理是一个节点，边代表空间关系（接近、车道共享）。节点之间的消息传递捕捉互动：“这辆车正在让路给那个行人”或“这些两辆车辆正在合并到同一个车道。”

- 现代预测架构（例如 **MTR**、**QCNet**）使用基于变换器的模型，这些模型同时推理代理历史、地图上下文和代理间互动。代理通过交叉注意力关注相关地图特征（如当前车道、即将到来的交叉口），以及其他代理（前方车辆、十字路口的行人）。输出是通过自回归或混合模型生成的一组轨迹假设。

- **条件目标预测**首先预测代理最有可能去的地方（一个候选目标点集，比如车道终点或交叉口出口），然后预测到达每个目标的轨迹。这将问题分解为“在哪里”（离散、易于管理）和“如何”（给定目标的连续路径），使得多模态预测问题更加可处理。

## 规划

- 给定预测场景，规划器必须为自动驾驶车辆生成轨迹。这是一个约束优化问题：找到一个既安全又舒适的、高效且合法的轨迹。

- **基于规则的规划器**将驾驶行为编码为一组 if-then 规则：如果行人处于人行横道上，则让步；如果前方车辆的间隙小于 2 秒，则不改变车道；如果 approaching红灯，则减速至停止线。这些规则易于理解和审计，但它们在处理复杂场景时变得难以管理（数以千计的规则、许多边缘情况、规则之间的相互作用）。

- 优化驱动规划者将驾驶视为轨迹优化。ego轨迹参数化（例如，作为未来时间步的序列$(x, y, \theta, v)$状态），并最小化目标函数：

$$\min_{\boldsymbol{\xi}} \underbrace{w_1 \cdot J_{\text{progress}}(\boldsymbol{\xi})}_{\text{get to destination}} + \underbrace{w_2 \cdot J_{\text{comfort}}(\boldsymbol{\xi})}_{\text{smooth ride}} + \underbrace{w_3 \cdot J_{\text{safety}}(\boldsymbol{\xi})}_{\text{avoid collisions}}$$
$$\text{subject to: } \text{kinematic constraints, speed limits, lane boundaries}$$
- 进度项惩罚偏离目标路线。舒适项惩罚高横向加速度、急加速和突然转向，因为乘客会感到这些。安全项惩罚与其他代理的接近程度，使用预测轨迹来评估碰撞风险。

- 这是约束优化（第3章）：在不等式约束下最小化成本函数。$w_1, w_2, w_3$权重竞争不同的目标（急行更快但更不舒服和不安全）。

- **基于学习的规划器**使用训练于人类驾驶数据中的神经网络来生成轨迹。该模型观察场景并直接输出规划轨迹，从专家人类驾驶的例子中隐式学习复杂的权衡关系。

- 优点是，人类驾驶行为被全面捕捉，包括那些难以用公式化表达的细微方面：如何安全地合并、在交叉口何时轻微推进、如何给自行车留出足够的空间。缺点与模仿学习（文件2）中的同分布偏移问题相同：模型可能在训练数据中未充分代表的情况下表现出不可预测的行为。

## 端到端驾驶

- **端到端驾驶** 完全消除了模块化的边界。单个神经网络直接从原始传感器输入（摄像头图像、激光雷达点云）输出驾驶命令（转向、油门、刹车）或规划的轨迹。没有单独的感知、预测和规划模块。

- 该系统通过联合优化整个系统，确保在模块边界上没有信息丢失。感知模块学习提取规划器所需的精确特征，而不是可能无法捕捉任务相关细节的通用对象检测。

- **UniAD**（统一自主驾驶）是一个里程碑式的端到端架构。它通过BEV编码器处理多摄像头图像，然后应用一系列基于变换器的模块：跟踪、在线地图构建、运动预测、 occupancy预测和规划。尽管它内部有模块，但它们都是可微的，并且联合训练整个网络。规划损失会回传整个网络。

- UniAD的规划模块通过关注预测的BEV特征、预测的代理轨迹和预测的 occupancy，生成未来的 ego-车辆 waypoints。这正是多变量链式法则（第3章）在起作用：梯度从规划损失流回图像编码器，告诉感知特征如何更加有用以促进规划。

- 更近的端到端方法使用了类似于VLAD架构（本章第3节中的文件）。像**DriveVLM**这样的模型，它们利用相机图像和导航指令（或路线），通过VLB backbone来产生驾驶动作。这直接将大规模预训练带来的视觉理解与推理优势引入到了驾驶栈中。

- 结束到结束的驾驶中的张力是可解释性。一个模块化系统可以报告“我检测到了一个行人位于（x，y）并预测他们将穿越”——失败模式是可以诊断的。一个端到端系统是一个黑盒，它产生一个转向角度。当它失败时，诊断为什么困难，这对于安全认证来说是一个严重的关切。



- **驾驶场景模型**通过学习当前状态和 ego车辆的动作来预测未来驾驶场景的状态：$p(s_{t+1} \mid s_t, a_t)$（如第10章中介绍的）。在驾驶中，这意味着生成现实的未来帧或BEV布局：“如果加速并转向左，3秒后场景会看起来像这样。”

- 驾驶场景模型提供了两种强大的能力用于自动驾驶：

    - **基于想象的规划**：而不是承诺执行某个动作并查看结果，规划者可以“想象”多个候选轨迹通过世界模型滚动出来，评估每个轨迹的安全性和舒适性，并选择最佳。这在基于模型的强化学习（如第2章中介绍）应用于驾驶时

    - ** 学习型模拟**：训练于真实驾驶数据的世界模型实际上是一个数据驱动的模拟器。它生成现实场景（包括罕见边缘情况），而无需手动构建一个手编的模拟器。至关重要的是，它捕捉了实际驾驶的真实模式：其他驾驶员的实际行为、光线变化以及雨对可见性的影响等。

- **GAIA-1**（Wayve）是用于驾驶场景的生成式世界模型。给定一系列过去的相机帧和 ego车辆的动作，它自回归地生成未来的视频帧。它使用一个基于视频扩散架构，并受动作输入条件化。该模型学习生成 plausible未来：遵守交通规则的车辆、在人行道上行走的人以及正确过渡的交通灯等，这些都是从训练数据中涌现出来的，而不是编程规则

- **DriveDreamer**和**genAD**采取类似的方法，但操作在BEV空间而不是像素空间。预测未来BEV布局比生成全视频帧更紧凑（类似于机器人中的Dreamer V3，在文件2中讨论的那样，它在潜在空间中预测，而不是像素空间）。BEV世界模型预测所有代理的位置、道路结构以及可用空间，并且规划者直接使用这些信息

- **神经闭环模拟**使用世界模型来取代手编模拟器进行测试。给定一个真实的驾驶日志作为起点，世界模型生成如果 ego车辆采取了不同动作会发生什么。这使得反事实评估成为可能：“如果我晚刹车0.5秒？”而无需实际重建场景

- **JEPA**框架（第10章）在这里非常自然。驱动世界模型不需要预测像素完美的未来（每个像素的精确RGB值）。他们只需要预测规划所需的关键方面：这些代理在哪里，它们以多快的速度移动，哪里有空闲空间。嵌入空间预测（JEPA风格）捕捉这些语义上有意义的属性，而不会浪费容量在无关视觉细节如精确云纹理上。

- 主要挑战是**长期精确度**。世界模型随着时间的推移会积累错误：帧2中的一个小错误会影响所有后续帧。对于驾驶，3秒预测窗口对战术决策（现在应该合并吗？）是有用的，但30秒窗口（用于战略决策如路线规划）仍然不可靠。当前的工作通过重新锚定（定期使用真实观测重置模型）和不确定性估计（标记当预测变得不可靠时）来缓解这一问题。

## 驾驶世界模型

## 模拟

- 在现实道路上测试自动驾驶汽车是必要的，但不够充分。危险场景（接近碰撞、边缘情况）非常罕见，因此仅通过行驶几百万英里来统计安全是不切实际的。一辆车需要驾驶数百亿英里才能证明其安全性，这几乎是不可行的。

- 模拟提供无限、可控且安全的测试。在真实世界中罕见的场景（如孩子冲入道路、轮胎爆裂或突然障碍物）可以在模拟中进行数百万次测试。

- CARLA 是一个基于虚幻引擎的开源驾驶模拟器。它提供了真实的城市环境、动态天气、交通代理和传感器仿真（摄像头、激光雷达、雷达）。研究人员使用 CARLA 来训练基于强化学习的驾驶代理并评估感知算法。

- **nuPlan**（运动规划）是一个闭环规划基准。与开放环评估（回放记录数据并比较规划器的输出与人类驾驶员的实际轨迹）不同，闭环评估允许规划器的决策影响模拟：如果规划器决定变道，模拟会相应地演化。这测试的是反应行为，而不是轨迹相似性。

![](../images/open_vs_closed_loop.svg)


- 开环评估和闭环评估之间的区别至关重要：

    - 开环：重新播放记录的场景，计算模型输出与人类驾驶员行为的相似度。这很容易设置，但误导性很强：一个总是预测“直行”的模型在高速公路上可能误差很小，但在第一个转弯时就会撞车。

    - 循环闭合：模型的动作改变了模拟状态，而模拟则根据这些动作进行演化。这测试了模型从自身错误中恢复并应对动态情况的能力。它非常昂贵但意义深远。

- **场景生成**创建了系统压力测试用例。对抗性场景（例如车辆突然刹车、隐藏在 parked车后的行人）通过优化性能最差的情况来生成。这与机器学习中的对抗训练有关（第6章）：找到导致损失最大的输入。

## 安全

- 自动驾驶的安全由工程标准而非ML指标来管理。

- **ISO 26262**（功能安全）是汽车电子系统安全关键的行业标准。它根据潜在危害的严重性、暴露度和可控制性，定义了从A（最低）到D（最高）的**汽车安全完整性等级（ASILs）**。自动驾驶系统的感知和规划组件通常为ASIL-D，这是最高的级别，需要进行详尽验证、冗余设计和故障安全设计。

- **SOTIF**（系统意图功能的安全性，ISO 21448）关注不同类型的危害：不是硬件故障（由ISO 26262覆盖），而是系统按设计工作但仍然产生不安全结果的情况。一个感知模型将白色卡车误分类为天空（真实事件）是一个SOTIF问题：硬件工作正常，但算法的限制导致了危险。

- **操作设计域（ODD）**定义了自动驾驶系统设计时考虑的条件：特定地理区域、道路类型（仅限高速公路、城市或两者）、天气条件（无重型雪），速度范围和时间OfDay。超出ODD的操作是不允许的：如果系统无法处理雪，它必须不得在雪中驾驶。

- **故障安全** vs **故障可操作**设计：
    - 故障安全：当检测到故障时，系统过渡到一个安全状态（例如，拉起并停车）。这是最低要求。
    - 故障可操作：即使发生故障，系统仍能继续以安全方式运行，使用冗余组件。具有冗余转向、制动和计算平台的自动驾驶汽车可以在单个组件失败的情况下仍然安全地驾驶到安全地点。

- **冗余**是基础。关键感知传感器被复制：多个覆盖重叠视野的摄像头，同时LiDAR和雷达提供独立的深度测量，两个计算平台运行相同的软件。如果任何单个组件失败，其他组件提供的信息足以安全驾驶。

## 自动化等级

![](../images/sae_autonomy_levels.svg)


- SAE J3016标准定义了六个驾驶自动化级别，从0（无自动化）到5（全自动化）：

    - **级别0（无自动化）**：人类完全负责。系统可能提供警告（车道偏离警报），但不控制车辆。

    - **第一级（辅助驾驶）**：系统控制方向盘或车速，但不能同时进行。自适应巡航控制（保持速度和跟随距离）或车道保持辅助（使汽车在车道内居中）是第一级。

    - **Level 2（部分自动化）**：系统同时控制转向和速度，但人类必须始终监控，并准备好接管。特斯拉Autopilot、通用Super Cruise以及大多数当前的“自动驾驶”功能属于Level 2。人类仍然是负责驾驶的人。

    - **三级（条件自动化）**：系统驱动和监控环境，但在特定条件下（ODD）。人类可以退出，但必须在系统要求时立即接管（通常有10+秒的缓冲时间）。梅赛德斯驾驶辅助（在某些高速公路上，速度低于60公里/小时）是第一个获得认证的三级系统。

    - **Level 4（高度自动化）**：系统完全自主驾驶，无需人工干预。如果遇到超出其ODD的情况，它能够安全停止。Waymo的自动驾驶出租车服务在特定地理区域运行至Level 4。

    - **Level 5 (全自动化)**：系统可以像人类一样在任何条件下驾驶，无需方向盘或油门。这尚未实现。

- 关键的区别在于**谁负责安全**。在Levels 0-2中，人类负责。在Levels 3-5中，系统负责（在ODD范围内）。这些具有深远的法律、保险和伦理影响。

- 当前行业状态是混合状态：Level 2（广泛部署），Level 3（开始部署），以及Level 4（有限地理区域部署）。Level 5仍然是长期研究目标。

## 编程任务（使用CoLab或笔记本）

1. 实现一个简单的轨迹优化规划器。给定起始位置、目标和障碍物，找到最平滑且碰撞-free的路径，使用梯度下降法。
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

2. 模拟一个恒速运动预测模型，并将其与地面真实值进行比较，对于转弯车辆。
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

3. 实现一个简单的规则基规划器，根据检测到的障碍物决定是否保持车道或停车。
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
