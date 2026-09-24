---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 18 - ML systems design/02. cloud computing.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: f1e6241f57575f368dac8f1ccd2c0ee93b6eb98e0f3d947cf36025d4473a9f5a
status: reviewed
---
# 云计算

*云计算为机器学习工作负载提供无拥有的基础设施，而无需拥有硬件。本文件涵盖了服务模型、主要的云提供商、容器和 Kubernetes、存储、云网络、服务器less计算、成本管理以及基于代码的基础设施*

- 训练前沿模型需要成千上万的 GPU 个月。没有初创公司拥有这些硬件。云计算让你按小时租用，根据训练需求进行缩放，根据推理需求进行缩放，并仅支付所使用的内容。理解云基础设施对于构建超出笔记本电脑的 ML 系统至关重要。

## 云计算服务模型

![IaaS（基础设施即服务）给你最多控制权，SaaS（软件即服务）给你最少控制权。](../images/cloud_service_layers.svg)


- 云服务的层次由提供者管理的程度决定：

| 模型 | 你管理 | 提供者管理 | 示例 |
|-------|-----------|-----------------|---------| **IaaS** (基础设施) | 操作系统、运行时、应用程序 | 硬件、虚拟化、网络 | AWS EC2、GCP Compute Engine |
| **PaaS** (平台) | 应用程序、数据 | 操作系统、运行时、扩展、补丁 | AWS SageMaker、GCP Vertex AI |
| **SaaS** (软件) | 什么都不用做（直接使用） | 所有内容 | OpenAI API, Weights & biases |
| **FaaS** (函数) | 单个函数 | 其他所有内容 | AWS Lambda, GCP Cloud Functions |

- **对于ML**: 大多数团队混合使用。IaaS用于自定义训练（完全控制GPU实例），PaaS用于托管训练和部署（SageMaker、Vertex AI负责 orchestration），以及SaaS用于工具（W&B用于实验跟踪，OpenAI API用于基准比较）。

## 主要提供商

### AWS (亚马逊云服务)

- 最大的云提供商（~32%市场份额）。关键的ML服务：
    - **EC2**: 虚拟机。GPU实例：p4d（A100），p5（H100），g5（A10G用于推理）。
    - **S3**: 对象存储。这是存储数据集和模型权重的标准方式。无限容量，~$0.023/GB/月。
    - **SageMaker**: 管理的ML平台。负责训练、超参数调整、部署和监控。
    - **EKS**: 管理的Kubernetes。
    - **Lambda**: 服务器less函数。不适用于GPU工作负载，但对预处理和 orchestration非常有用。

### GCP (谷歌云平台)

- Google的云（~11%市场份额）。关键的ML服务：
    - **Compute Engine**: VMs。GPU实例带有A100、H100。**TPU VMs**用于访问TPU。
    - **GCS**: 对象存储（类似于S3）。
    - **Vertex AI**: 管理的ML平台。支持JAX/TPU。
    - **GKE**: 管理的Kubernetes（最成熟的K8s提供者，因为Google创建了Kubernetes）。
    - **cloud TPUs**: 仅限于GCP。v5e和v5p用于大规模训练。

### Azure (微软)

- 微软的云（约占23%市场份额）。关键的ML服务：
    - **Azure VMs**: GPU实例，带有A100和H100。
    - **Azure Blob Storage**: 对象存储。
    - **Azure ML**: 管理型的ML平台。
    - **AKS**: 管理型的Kubernetes。
    - **OpenAI Service**: 通过Azure API独家访问OpenAI模型。

## 容器和Kubernetes

- 我们在第13章（操作系统）中概念性地介绍了容器（Docker），并在第15章（部署）中实践了这些概念。在这里，我们专注于**云特定的模式**：

### Kubernetes for ML

- **Kubernetes (K8s)** 通过容器在大规模上进行协调。关键概念包括：

    - **Pod**：最小的可部署单元。包含一个或多个共享网络和存储的容器。一个模型服务 Pod 可能包含：模型服务器容器 + 用于指标收集的侧车容器。

    - **Deployment**：管理一组相同的 Pod。指定所需的副本数。如果 pod 失败，K8s 自动创建一个替换。

    - **Service**：一组 pods 的稳定网络端点。客户端连接到服务；K8s 路由到健康的 pod。类型：ClusterIP（内部），NodePort（通过节点端口外部访问），LoadBalancer（通过云负载均衡器外部访问）。

    - **状态fulSet**：类似于 Deployment，但用于状态型工作负载。每个 pod 都有一个持久的身份和稳定的存储。用于数据库和分布式训练（每个 worker 需要一个稳定的身份进行通信）。

    - **DaemonSet**：在每台节点上运行一个 pod。用于：监控代理（Prometheus node exporter），日志收集器（Fluentd），GPU 设备插件（NVIDIA device plugin）。

- **GPU scheduling in K8s**: the NVIDIA device plugin exposes GPUs as a K8s resource. Pods request GPUs:

```yaml
resources:
  limits:
    nvidia.com/gpu: 2  # this pod needs 2 GPUs
```

- K8s schedules the pod onto a node with 2 available GPUs. This is how cloud ML platforms allocate GPUs for training and inference.

### 自动缩放

- **水平 Pod 自动缩放器 (HPA)**: 根据指标（CPU 使用率、请求速率、自定义指标如 GPU 利用率或队列深度）调整 pod 数量。

- **集群自动缩放器**: 根据节点利用率调整节点数量。如果无法调度 pods，因为没有足够的节点，集群自动缩放器从云提供商处 provision 新的 VM。当节点处于低效状态时，它会 drains和终止它们。

- **KEDA**（基于外部事件驱动的自动扩展）：根据外部事件源（如 Kafka 队列深度、HTTP 请求速率）进行扩展。非常适合推理：当请求队列增长时，增加模型服务器的数量；当队列为空时，减少数量。

## 存储

| 类型 | 特性 | 使用场景 | 示例 |
|------|----------------|----------|---------| **块** | 低延迟，附加到一个 VM | 操作系统磁盘、数据库 | AWS EBS、GCP 持久磁盘 |
| **对象** | 无限容量，HTTP 访问 | 数据集、模型权重、日志 | AWS S3、GCS、Azure Blob |
| **文件** | 共享给多个VM，POSIX | 共享的训练数据 | AWS EFS, GCP Filestore, NFS |
| **数据湖** | 按需模式读取，原始数据 | 分析，特征工程 | Delta Lake, Iceberg, Hudi |

- **对于机器学习训练**: 数据集存储在对象存储（S3/GCS）。训练脚本从对象存储读取数据到RAM。为了快速随机访问（打乱数据加载），可以：(1) 在训练前将数据下载到本地SSD；(2) 使用高吞吐量文件系统（Lustre, FSx）；或(3) 使用高效的数据加载库（WebDataset, FFCV）。

- **模型权重**: 存储在对象存储并带有版本控制。一个70B的FP16模型大约是140GB。从S3以1 GB/s下载需要2.5分钟。在本地SSD上缓存可以减少推理时冷启动时间。

## 云网络

- **VPC** (虚拟专用网络): 在云中隔离的网络。您的VM、数据库和服务在VPC内部通信。外部流量通过负载均衡器或网关进入。

- **子网**: 将VPC划分为段落。公共子网有互联网访问（API服务器）。私有子网没有（数据库、GPU工作者）。这是网络等效于安全原则的最少特权。

- **安全组** (AWS) / **防火墙规则** (GCP): 控制允许哪些流量。"允许来自任何地方的HTTP端口80的入站。只允许从我的IP地址进行SSH端口22的入站。阻止其他一切。"配置错误的安全组是云安全事件的主要原因。

- **服务网格** (Istio, Envoy): 管理K8s内部的服务到服务通信。提供：mTLS加密（每个服务到服务调用都加密），流量路由（A/B测试:将10%的流量路由到新模型），重试、超时、断路器和观察力（哪个服务调用了哪个，它花了多长时间）。

## 服务器less

- **服务器less** (AWS Lambda, GCP云函数): 您上传一个函数，并由云提供商在触发时运行。无需管理服务器，无需配置缩放。您按调用次数付费（通常每百万次调用$0.20 +计算时间）。

- **冷启动**: 一段时间内无活动后首次调用需要更长的时间（提供商必须分配一个容器并加载您的代码）。冷启动是0.5到5秒，使服务器less不适合对延迟敏感的机器学习推理。

- **对于机器学习**: 服务器less适用于：预处理（在发送给模型之前调整图像大小），后处理（格式化模型输出、发送通知）， orchestration（当新数据到达时触发训练管道），和轻量级推理（具有冷启动容忍度的小模型）。

- 服务器less不适合：GPU推理（大多数服务器less平台不支持GPU），长时间运行的训练任务（Lambda的15分钟超时），或有状态的服务（每次调用之间没有持久化状态）。

## 成本管理

- 云成本是机器学习团队的首要运营关注点。一个H100实例的成本大约为$8/hour. A 64-GPU training run costs ~$500公里/小时。一个月的训练跑成本约360万元。成本优化是工程，不是会计。

- **Spot/preemptible实例**：闲置的云容量以60%-90%的折扣出售。提供商可以在30秒到2分钟内收回它们。适用于：故障 tolerant训练（频繁检查点，恢复在新实例上），批量推理，数据预处理。不适用于：对延迟敏感的服务（中断 = 停机）。

- **预留实例**：承诺一年到三年的使用，享受30%-60%的折扣。适用于：已知基准负载的稳定状态推理服务。

- **自动缩放**：在高峰时段增加资源，夜间和周末减少。一个需要在高峰期运行10个GPU的模型服务器，在自动缩放的情况下比全天24小时运行10个GPU节省约60%的成本。

- **适配性**：不要使用H100来运行一个在A10G上运行良好的7B模型。匹配GPU的工作负载。通过章节16的性能分析来确定最佳的GPU配置。

- **存储成本**: 对象存储便宜（$0.023/GB/month for S3 Standard), but accumulates. A team storing every training checkpoint (10 GB each, 100 per experiment, 50 experiments) accumulates 50 TB = $1,150/month。设置生命周期策略自动删除旧的检查点。

## 多区域部署

- 对于全球ML系统（为世界各地的用户提供服务），在单个地区部署意味着对遥远用户的高延迟（东京用户访问美国服务器需要约150毫秒的网络往返时间）和单一故障点（如果该区域崩溃，整个服务将 offline）。

- **多区域模式**:

    - **主动-被动**: 一个主地区处理所有流量。另一个次要地区有一个冷备用（复制的数据，准备好接收流量）。在主地区故障时，DNS会切换到次级地区。故障恢复期间的 downtime: 30秒到几分钟。

    - **主动-主动**: 两个区域同时处理流量。用户被路由到最近的区域。两个区域都有最新的数据（异步或同步复制）。单个地区故障时，没有 downtime——流量会自动重新路由。

- **数据复制**: 最难的部分。模型权重可以轻松地复制（在每个区域中将副本复制到S3）。特征存储数据必须以可接受的滞后性进行复制。用户数据可能有**数据 residency要求**（GDPR: 欧洲用户的数据必须留在欧洲）。

- **GPU云定价比较**（近似，2026）:

| GPU | AWS | GCP | Azure | 通用用途 |
|-----|-----|-----|-------|-------------| A10G（24 GB）| $1.00/hr (g5) | $0.90/hr | $0.90/hr | 小模型推理 |
| A100（80 GB）| $4.10/hr (p4d) | $3.70/hr | $3.40/hr | 训练、大型推理 |
| H100（80 GB）| $8.00/hr (p5) | $7.50/hr | $7.00/hr | 领先训练 |
| TPU v5e | n/a | $1.20/hr | n/a | JAX大规模训练 |

- 通常，这些价格比点击AWS控制台按钮的费用低60%-70%。价格因地区和可用性而异。

## 基础设施即代码

- **IaC** 定义基础设施（VM、网络、数据库、K8s集群）在版本控制的配置文件中。而不是在AWS控制台中点击按钮，而是编写描述你想要的内容的代码，并由工具创建它。

- **Terraform**（HashiCorp）：标准IaC工具。与所有主要云提供商兼容。声明式：你描述所需的状态，Terraform会找出如何创建、修改或删除以达到该状态。

```hcl
# main.tf — create a GPU VM for inference
resource "aws_instance" "model_server" {
  ami           = "ami-0abcdef1234567890"  # Deep Learning AMI
  instance_type = "g5.xlarge"               # A10G GPU

  tags = {
    Name = "model-server-prod"
  }
}

resource "aws_s3_bucket" "model_weights" {
  bucket = "my-model-weights-prod"

  versioning {
    enabled = true
  }
}
```

```bash
terraform init      # download provider plugins
terraform plan      # show what will change
terraform apply     # create the infrastructure
terraform destroy   # tear it all down
```

- **IaC的重要性**：可重现性（从代码重建整个基础设施）、审计（Git历史显示谁更改了什么）、灾难恢复（在相同配置的另一个区域重建）和环境一致性（开发、测试和生产使用相同的模板，但参数不同）。

- **Pulumi**：像Terraform一样，但使用真实编程语言（Python、TypeScript、Go）而不是HCL。当你的基础设施逻辑复杂时（条件语句、循环、动态配置）非常有用。
