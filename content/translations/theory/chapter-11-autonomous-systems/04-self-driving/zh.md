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

*自动驾驶汽车是商业化程度最高的自主系统之一，把感知、预测、规划和控制集成到一辆车中。本文介绍自动驾驶栈、高精地图、运动预测、规划、端到端驾驶、仿真、安全标准和自动化等级。*

- 自动驾驶汽车是目前规模化应用中最难的机器人问题之一。它不像工厂机器人那样在受控环境中工作，必须应对开放道路上的各种情况：难以预测的驾驶员、突然横穿马路的行人、夜间出现的施工路段，以及随时变化的天气。

- 自动驾驶汽车以高速行驶，周围还有行人等脆弱的道路使用者。发生安全关键故障时，系统几乎没有容错空间。

## 自动驾驶栈

- 传统自动驾驶架构采用**模块化管道**，由四个依次传递信息的阶段组成：

$$\text{Perception} \to \text{Prediction} \to \text{Planning} \to \text{Control}$$


![自动驾驶栈：传感器数据依次经过感知、预测、规划和控制](../images/autonomous_driving_stack.svg)

- **感知**（本章第 1 篇介绍）把原始传感器数据转换为结构化场景表示，包括检测物体的三维位置、速度和类别，车道线、交通灯以及可行驶区域边界。

- **预测**估计其他交通参与者（车辆、行人和骑行者）接下来会怎样移动。给定当前场景状态，预测模块会为每个参与者输出一条轨迹，通常覆盖未来 3 到 8 秒。

- **规划**决定自车该采取什么行动：沿哪条路径行驶、何时变道或让行、何时加速或刹车。规划器利用预测的场景，生成安全、舒适且能驶向目的地的自车轨迹。

- **控制**把规划轨迹转换为执行器命令，例如转向角、油门和制动。这是自动驾驶栈的底层模块，负责把抽象轨迹变成车辆运动。

- 模块化设计让工程师能分别开发、测试和改进各个模块，但模块之间也会传递错误。感知漏检的物体对规划器不可见；接口还会丢失信息，例如规划器只能看到检测框，看不到生成这些框的丰富传感器数据。

## 高精地图

- **高精地图（HD 地图）**是厘米级精度的数字地图，记录车道边界、车道连接关系、交通标志位置、限速、人行横道和路面高度等道路结构。

- 高精地图为驾驶任务提供先验信息。感知模块不必每一帧都从头寻找车道边界，只需确定车辆在地图上的位置，再核对实际道路是否符合地图记录。这能简化规划。

- 制作高精地图需要专业测绘车辆，配备高端激光雷达、摄像头和实时动态 GPS（RTK-GPS）。道路变化后，地图还要维护和更新。这项工作成本高，也难以覆盖全球每一条道路。

- **无图驾驶**（也称在线建图）不依赖预先制作的高精地图，而由车辆实时根据传感器数据构建局部地图。MapTR 和 MapTRv2 等模型使用 Transformer，直接从相机图像预测车道中心线、道路边界和人行横道等矢量地图元素，并按顺序输出点构成的折线。

- 无图驾驶用部分地图精度换取可扩展性：车辆能驶入的道路，系统就可以尝试在线制图。但感知系统必须能实时识别所有相关道路结构，包括复杂路口、高速公路匝道和施工区域。

- 许多系统会采用混合方案：先用地图服务商提供的轻量地图记录粗略道路拓扑，再由车辆传感器实时补充信息。

## 车辆运动预测

- 预测其他道路使用者接下来会去哪里，是自动驾驶中最难的子问题之一。人的意图不容易判断，未来可能的走向也会迅速分岔。

- 预测模型接收**场景上下文**：近期历史（通常为 1–2 秒）内所有已检测交通参与者的位置和速度，以及车道几何、交通信号和道路边界等静态信息。

- 模型为每个参与者输出一组**预测轨迹**，通常覆盖未来 3–8 秒。未来有不确定性，因此好的模型会输出多条带有概率的候选轨迹，而不是只给出一个点估计。

- **轨迹预测**可以表述为回归问题：预测每个参与者在若干未来时间步的 $(x, y)$ 坐标。常见损失是 $K$ 条预测轨迹中的最小平均位移误差（minADE）：

$$\text{minADE}_K = \min_{k \in \{1, \ldots, K\}} \frac{1}{T} \sum_{t=1}^{T} \| \hat{\mathbf{p}}_t^{(k)} - \mathbf{p}_t \|_2$$


- 这是“$K$ 条中取最佳”的指标：只要模型的 $K$ 条预测里有一条接近真实轨迹，就能取得较好的分数。这会鼓励模型输出多样的多模态预测。

- **社会力模型**把行人行为表示为动力系统。每个人都会受到吸引力（朝向目标）和排斥力（远离其他行人和障碍物）的作用。行人 $i$ 的加速度为：

$$\mathbf{a}_i = \frac{\mathbf{v}_i^{\text{desired}} - \mathbf{v}_i}{\tau} + \sum_{j \neq i} \mathbf{f}_{ij}^{\text{repulsive}} + \sum_{\text{walls}} \mathbf{f}_{\text{wall}}$$


- 这组微分方程与本章第 2 篇的机器人动力学方程相似。模型形式简洁，但依赖人工调节的力参数，也难以处理复杂的多参与者互动。

- **图神经网络（GNN）**把场景表示为图来预测运动：每个交通参与者是一个节点，边表示空间关系，例如彼此接近或共用车道。节点间的消息传递能表达互动，例如一辆车正在让行人，或两辆车正并入同一车道。

- MTR、QCNet 等现代架构用 Transformer 同时分析参与者历史、地图上下文和参与者之间的互动。模型通过交叉注意力关注相关地图特征（当前车道、前方路口）和其他参与者（前车、人行横道上的行人），再以自回归方式或混合模型生成轨迹假设。

- **目标条件预测**先估计参与者可能前往哪里，例如车道终点或路口出口，再预测它如何到达各个目标点。这样就把问题分成“去哪里”（离散目标）和“怎么去”（连续路径），使多模态预测更容易处理。

## 规划

- 规划器根据预测场景为自车生成轨迹。这是一个约束优化问题：找出一条安全、舒适、高效且合法的轨迹。

- **基于规则的规划器**把驾驶行为写成 if-then 规则，例如“行人进入人行横道时让行”“与前车的时距少于 2 秒时不变道”“接近红灯时减速并停在停止线前”。这些规则容易理解和审计，但复杂场景会产生大量规则、边缘情况和规则间的冲突，维护起来很困难。

- **基于优化的规划器**把驾驶表述为轨迹优化。自车轨迹可参数化为未来时间步的状态序列 $(x, y, \theta, v)$，然后最小化目标函数：

$$\min_{\boldsymbol{\xi}} \underbrace{w_1 \cdot J_{\text{progress}}(\boldsymbol{\xi})}_{\text{get to destination}} + \underbrace{w_2 \cdot J_{\text{comfort}}(\boldsymbol{\xi})}_{\text{smooth ride}} + \underbrace{w_3 \cdot J_{\text{safety}}(\boldsymbol{\xi})}_{\text{avoid collisions}}$$


$$\text{subject to: } \text{kinematic constraints, speed limits, lane boundaries}$$


- 进度代价惩罚偏离预定路线；舒适度代价惩罚较大的横向加速度、加速度变化率（jerk）和突然转向；安全代价则根据预测轨迹评估碰撞风险，并惩罚自车过于接近其他交通参与者。

- 这是第 3 章介绍的约束优化：在不等式约束下最小化代价函数。权重 $w_1, w_2, w_3$ 用来平衡不同目标。激进驾驶可能更快，却会降低舒适性和安全性。

- **基于学习的规划器**使用人类驾驶数据训练神经网络，由模型观察场景并直接输出规划轨迹。模型从专家驾驶示例中学习复杂的取舍关系。

- 这类方法可以从整体上学习人类驾驶行为，包括难以写成规则的细节，例如怎样安全并线、路口何时缓慢前移，以及给骑行者留出多少空间。它也会遇到模仿学习中的分布偏移（本章第 2 篇）：训练数据较少覆盖的场景可能导致不可预测的行为。

## 端到端驾驶

- **端到端驾驶**取消模块边界，用单个神经网络直接把原始传感器输入（相机图像、激光雷达点云）映射为驾驶命令（转向、油门、制动）或规划轨迹，不再设置独立的感知、预测和规划模块。

- 整个系统围绕安全驾驶这一最终任务联合优化，因此模块接口不会丢失信息。感知部分能学到规划器真正需要的特征，而不只输出可能缺少任务相关细节的通用检测结果。

- **UniAD**（Unified Autonomous Driving）是代表性的端到端架构。它先用鸟瞰图（BEV）编码器处理多路摄像头图像，再串联跟踪、在线建图、运动预测、占用预测和规划等 Transformer 模块。虽然模型内部保留这些模块，但它们都可微分，并且整个网络端到端联合训练，规划损失会反向传播到网络各层。

- UniAD 的规划模块关注预测的 BEV 特征、交通参与者轨迹和占用信息，生成自车未来路径点。这体现了第 3 章的多元链式法则：梯度从规划损失一路传回图像编码器，促使感知特征更适合规划。

- 较新的端到端方法也采用 VLA 风格架构（本章第 3 篇）。DriveVLM 等模型接收相机图像和导航指令或路线，通过 VLM 主干生成驾驶动作，把大规模预训练带来的视觉理解和推理能力引入自动驾驶栈。

- 端到端驾驶面临**可解释性**问题。模块化系统可以报告“我在坐标 (x, y) 检测到行人，并预测他会横穿马路”，便于诊断故障。端到端系统只输出转向角，内部过程像黑盒；发生故障时，工程师很难查明原因，这会给安全认证带来困难。

## 驾驶世界模型

- **世界模型**根据当前场景状态和自车动作，预测驾驶场景的未来状态：$p(s_{t+1} \mid s_t, a_t)$（第 10 章介绍过）。在驾驶中，这可以是生成未来视频帧或 BEV 布局，例如“如果我加速并向左转，三秒后场景会是什么样”。

- 世界模型为自动驾驶提供两种能力：

    - **基于想象的规划**：规划器先在世界模型中滚动预测多条候选轨迹，再评估每条轨迹的安全性和舒适度，并选择合适的行动。这个过程把本章第 2 篇介绍的基于模型强化学习用于驾驶。

    - **学习式仿真**：用真实驾驶数据训练的世界模型可以充当数据驱动仿真器，生成包括罕见边缘情况在内的场景，减少手工搭建仿真器的工作。模型还可以学习真实驾驶的统计规律，例如其他驾驶员的行为、光照变化和雨天能见度。

- **GAIA-1**（Wayve）是面向驾驶场景的生成式世界模型。它根据过去的相机帧和自车动作，自回归地生成未来视频帧。模型采用受动作输入条件化的视频扩散架构，可以从训练数据中学到合理的未来场景，例如遵守交通规则的车辆、在人行道上行走的人，以及按规律变化的交通灯。

- **DriveDreamer** 和 **GenAD** 也采用类似方法，但在 BEV 空间而非像素空间建模。与生成完整视频相比，预测未来 BEV 布局更紧凑，类似于本章第 2 篇介绍的 DreamerV3 在潜在空间中预测。BEV 世界模型预测交通参与者的位置、道路结构和可行驶空闲区域，规划器可以直接使用这些信息。

- **神经闭环仿真**用世界模型替代手工仿真器来测试策略。以真实驾驶记录为起点，模型可以推演自车采取另一种动作后的场景变化，从而开展反事实评估，例如“如果晚 0.5 秒刹车会怎样”，无需在现实中重现该场景。

- 驾驶世界模型也可以采用**JEPA**框架（第 10 章）。它不必预测每个像素的精确 RGB 值，只需预测规划需要的信息：交通参与者的位置和速度、可行驶空间等。JEPA 式嵌入空间预测能表达这些语义特征，不必把模型容量花在云朵纹理等无关细节上。

- 世界模型的主要难题是**长时域保真度**。预测误差会随时间累积，例如第 2 帧的微小错误可能影响后续所有帧。三秒预测可支持“现在是否并线”这类战术决策；路线规划等战略决策需要的 30 秒预测仍不可靠。研究者会定期用真实观测重新锚定模型，并估计不确定性，以标出不可靠的预测。

## 仿真

- 在真实道路上测试自动驾驶汽车不可或缺，但单靠实路测试仍不够。近碰撞等危险边缘场景很少出现，按行驶里程测试效率低。若要用统计方法证明安全，一辆车需要行驶数亿英里，这在现实中不可行。

- **仿真**提供数量充足、可控且安全的测试环境。儿童突然跑到路上、轮胎爆裂或障碍物突然出现等罕见情形，都可以在仿真中反复测试数百万次。

- **CARLA** 是基于 Unreal Engine 的开源驾驶仿真器，提供真实感城市环境、动态天气、交通参与者和传感器仿真，包括相机、激光雷达和雷达。研究者用 CARLA 训练强化学习驾驶智能体并评估感知算法。

- **nuPlan**（Motional）是闭环规划基准。开环评估会回放记录数据，再比较规划器输出与人类驾驶轨迹；闭环评估则让规划决策影响仿真环境。例如规划器决定变道后，仿真会继续演化。这种评估检验系统的反应能力，而非只比较轨迹相似度。

![开环评估只回放日志；闭环评估会让模型动作改变仿真状态](../images/open_vs_closed_loop.svg)

- **开环评估**和**闭环评估**的区别很重要：

    - 开环评估：回放记录的场景，比较模型输出与人类驾驶动作的相似程度。它容易实现，却可能产生误导。例如，一个总是预测“直行”的模型在高速公路数据上误差可能很小，但遇到第一个弯道就会撞车。

    - 闭环评估：模型动作会改变仿真状态，仿真再根据新状态演化。这能检验模型能否从自己的错误中恢复，并应对动态情况。闭环评估成本更高，但结果更有意义。

- **场景生成**会主动构造用来检验系统弱点的案例。系统表现最差的对抗场景可以通过优化搜索出来，例如车辆突然刹车，或行人躲在停放车辆后面。这与第 6 章介绍的对抗训练相关：寻找能使损失最大的输入。

## 安全

- 自动驾驶安全需要满足工程标准，不能只看机器学习指标。

- **ISO 26262**（功能安全）是汽车安全关键电子系统的标准。它根据潜在危险的严重性、暴露度和可控性，定义从 A（最低）到 D（最高）的**汽车安全完整性等级（ASIL）**。自动驾驶感知和规划组件通常按 ASIL-D 设计，需要大量验证、冗余和故障安全机制。

- **预期功能安全（SOTIF，ISO 21448）**处理另一类危险：系统并非发生硬件故障，而是按设计运行仍产生不安全结果。例如，感知模型把白色卡车误判为天空（曾发生过的事故）；硬件工作正常，危险来自算法能力的局限。

- **运行设计域（ODD）**规定自动驾驶系统适用的条件，包括地理范围、道路类型（仅高速公路、城市道路或两者）、天气（例如不包括大雪）、速度范围和时段。系统不得在 ODD 之外运行；如果无法处理降雪，就不能在雪天行驶。

- **故障安全**和**故障运行**是两种设计方式：

    - 故障安全：发现故障后，系统转入安全状态，例如靠边停车。这是最低要求。
    - 故障运行：发生故障时，系统借助冗余组件继续安全运行。若转向、制动和计算平台都有冗余，单个组件失效后，车辆仍可能驶往安全地点。

- **冗余**是安全设计的基础。关键感知传感器会采用冗余配置，例如视野互相重叠的多台摄像头、独立提供深度信息的激光雷达和雷达，以及运行相同软件的双计算平台。一个组件失效时，其他组件仍需提供足够信息，让车辆安全行驶。

## 自动驾驶等级

![SAE 自动驾驶等级：从 L0（无自动化）到 L5（完全自动化），展示责任如何在人与系统之间转移](../images/sae_autonomy_levels.svg)

- **SAE J3016** 标准把驾驶自动化分为六级，从 0 级（无自动化）到 5 级（完全自动化）：

    - **0 级（无自动化）**：驾驶任务由人完成。系统可以提供车道偏离警报等提醒，但不控制车辆。

    - **1 级（驾驶辅助）**：系统控制转向或车速其中一项，不能同时控制两者。自适应巡航控制（维持车速和跟车距离）或车道保持辅助（让车辆留在车道内）属于 1 级。

    - **2 级（部分自动化）**：系统同时控制转向和车速，但驾驶员必须持续监控，并准备随时接管。Tesla Autopilot、GM Super Cruise 以及多数现有“自动驾驶”功能属于 2 级，驾驶员仍负责监督驾驶任务。

    - **3 级（有条件自动化）**：系统在特定运行设计域内驾驶并监控环境。驾驶员可以暂时不操控车辆，但系统请求接管时必须准备好接手，通常会留出 10 秒以上。Mercedes Drive Pilot 在某些高速公路上以低于每小时 60 公里的速度运行，是首个获认证的 3 级系统。

    - **4 级（高度自动化）**：系统在其运行设计域内处理所有驾驶情况，无需人工干预。遇到运行设计域之外的情况时，系统能自行安全停车。Waymo 的无人出租车在特定地区按 4 级运行。

    - **5 级（完全自动化）**：系统能像人类驾驶员一样在所有道路和条件下行驶，不需要方向盘或踏板。目前还没有达到 5 级的系统。

- 关键在于驾驶任务由谁承担：0–2 级由人负责，3–5 级由系统在运行设计域内负责。这里的责任分配描述驾驶任务和接管要求，不等同于事故发生后的法律责任；后者还取决于具体法规。

- 原文所述行业状态是：2 级已广泛部署，3 级开始部署，4 级只在有限地区运行，5 级仍是长期研究目标。实际部署情况会随时间和地区变化。

## 编程任务（使用 Colab 或 notebook）

1. 实现简单的轨迹优化规划器。给定起点、目标和障碍物，用梯度下降寻找平滑且无碰撞的路径。

代码把初始航点放在穿过障碍物中心的直线上，且只惩罚离散航点靠近障碍物；对称初值可能使横向梯度为零，代码也没有检查航点之间的路径段，因此不能保证找到无碰撞路径。

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

2. 模拟恒速运动预测模型，并将预测结果与转弯车辆的真实轨迹比较。

预测序列从最后一个观测点开始计时，而真实未来轨迹从下一个时间步开始绘制；两条曲线存在一个时间步的偏移。

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

3. 实现简单的规则规划器，根据检测到的障碍物决定保持车道或停车。

代码实际根据前方车辆距离和速度调整目标车速，输出巡航、跟车或紧急停车标签；它没有车道检测或车道保持逻辑。

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
