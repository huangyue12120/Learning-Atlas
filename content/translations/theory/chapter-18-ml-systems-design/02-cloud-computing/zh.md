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

*本篇将云计算放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

* 云计算为ML工作量提供按需基础设施,而不拥有硬件。该文件涵盖服务模型、主要云提供商、集装箱和库伯内特、存储、云联网、无服务器计算、成本管理以及作为代码的基础设施*

- 培训前沿模式需要数以千计的GPU数月。没有启动拥有硬件。云计算让您按小时租取,扩大训练规模,降低推论,只支付您使用的费用. 了解云基础设施对任何人建造计算机以外的多功能控制系统都至关重要。

## 云服务模型


![图示](../images/cloud_service_layers.svg)

- 云服务由提供方管理多少来分层:

|Model|You Manage|Provider Manages|Example|
|-------|-----------|-----------------|---------|
|**IaaS** (Infrastructure)|OS, runtime, app|Hardware, virtualisation, networking|AWS EC2, GCP Compute Engine|
|**PaaS** (Platform)|App, data|OS, runtime, scaling, patching|AWS SageMaker, GCP Vertex AI|
|**SaaS** (Software)|Nothing (just use it)|Everything|OpenAI API, Weights & Biases|
|**FaaS** (Function)|Individual functions|Everything else|AWS Lambda, GCP Cloud Functions|

- ** 对于ML**:大多数球队使用混合. IaaS用于自定义培训(全面控制GPU实例),PaaS用于管理下培训和服务(SageMaker,Vertex AI处理管弦),SaaS用于工具(W&B用于实验跟踪,OpenAI API用于基线比较).

## 主要云厂商


### AWS(Amazon 网络服务)


- 最大的云提供商(~32%的市场份额). 关键ML服务:
    - **EC2**:虚拟机。GPU例:p4d(A100),p5(H100),g5(A10G为推论).
    - ** S3**:物体存储。数据集和模型权重的存储标准. 几乎无限容量,~0.023美元/GB/月.
    - ** SageMaker**:管理下的ML平台。处理训练、超参数调整、部署和监测。
    - ** EKS**:管理型Kubernetes。
    - ** Lambda**:无服务器功能。不适合GPU工作量,而可用于预处理和管弦.

### GCP(谷歌云平台)


- 谷歌云(~11%市场份额). 关键ML服务:
    - ** 计算引擎**:VM. 带有A100,H100的GPU实例. ** TPU VMs**用于TPU访问.
    - **GCS**:对象存储(同S3一样).
    - ** Vertex AI**:管理ML平台。原生JAX/TPU支持.
    - **GKE**:管理库伯内特(自谷歌创建库伯内特后最成熟的K8s提供).
    - ** Cloud TPU**:专供GCP使用. v5e和v5p进行大规模训练.

### Azure(微软)


- 微软云(~23%市场份额). 关键ML服务:
    - ** Azure VMS**:带有A100、H100的GPU实例。
    - ** Azure 斑点 存储**:物体存储。
    - ** Azure ML**:管理下的ML平台。
    - ** AKS**:管理型Kubernetes。
    - ** OpenAI Service**:通过Azure API独家访问OpenAI模型.

## 容器与 Kubernetes


- 我们从概念上在第13章(OS)和实际上在第15章(部署)中涵盖了集装箱(Docker)和Kubernetes。在这里,我们着重讨论** 云的具体** 模式:

### 用于 ML 的 Kubernetes


- ** Kubernetes (K8s)** 大型管弦乐容器。关键概念:

    - ** Pod**:最小的可部署部队。包含一个或多个容器,共享联网和存储. 一个模型服务舱可能包含:模型服务器容器+一个用于收集度量衡的侧车容器.

    - ** 调动**:管理一套相同的舱位。指定想要的复制件数量。如果一个吊舱出事,K8s会自动生成替换.

    - **Service**:一组吊舱的稳定网络端点. 客户端连接到服务;K8的线路连接到健康舱. 类型: ClusterIP(内部),NodePort(外部通过节点端口),LoadBalancer(外部通过云LB).

    - ** 说明**:如部署,但因工作繁重。每个舱都有一个持续的身份 和稳定的存储。用于数据库和分布式培训(每个工人都需要稳定的通信身份).

    - ** DaemonSet**:运行每个节点上的一个吊舱. 用于:监测代理(Prometheus node export),日志采集器(Fluentd),GPU设备插件(NVIDIA设备插件).

- **K8s中的GPU调度**:NVIDIA设备插件将GPU曝光为K8s资源. Pods 请求 GPU :

```yaml
resources:
  limits:
    nvidia.com/gpu: 2  # this pod needs 2 GPUs
```

- K8s 将吊舱排入带有 2个可用的 GPU 的节点。这就是云ML平台如何分配GPU用于培训和推论.

### 自动扩缩容


- ** Horizontal Pod Autoscaler(HPA)**:根据度量衡(CPU的使用,请求率,GPU使用或队列深度等自定义度量衡)来标定输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出

- ** Cluster 自动缩放器**:缩放节点数. 如果由于节点不够而不能安排出吊舱,则集群自动缩放器从云提供方提供新的VM. 当节点被利用不足时会排出并终止.

- **KEDA**(Kubernetes Event-Driven Autoscaleing):基于外部事件源的尺度(Kafka队列深度,HTTP请求率). 适合推论:当请求队列增大时放大模型服务器,当是空的时放大.

## 存储


|Type|Characteristics|Use Case|Example|
|------|----------------|----------|---------|
|**Block**|Low-延迟, attached to one VM|OS disks, databases|AWS EBS, GCP Persistent Disk|
|**Object**|Unlimited capacity, HTTP access|Datasets, model weights, logs|AWS S3, GCS, Azure 斑点|
|**File**|Shared across VMs, POSIX|Shared training data|AWS EFS, GCP Filestore, NFS|
|**Data lake**|Schema-on-read, raw data|Analytics, feature engineering|Delta Lake, Iceberg, Hudi|

- ** 用于ML培训**:数据集被存储在对象存储中(S3/GCS). 训练脚本从对象存储读取数据到RAM. 对于快速随机访问(shuffled data load),要么:(1)在培训前将数据集下载到本地SSD,(2)使用高通量文件系统(Lustre,FSx),或(3)使用能高效地流出和缓存的数据加载库(WebDataset,FFCV).

- **模型重量**:以版本存储在物体存储中。FP16中的70B型号为~140 GB. 从S3以1GB/s的速度装入需要~2.5分. 在本地 SSD 上缓存会减少冷起算时间。

## 云网络


- **VPC** (虚拟的私人云:云中一个孤立的网络. 您的VMS,数据库,服务 在VPC内部通信。对外交通通过负载平衡器或网关进入.

- ** 子网**:将VPC分成几个部分。公共子网有互联网接入(用于API服务器). 私人子网不(对于数据库,GPU工人). 这是相当于最低特权安全原则的网络。

- ** 安全小组**(AWS)/**防火墙规则**(GCP):允许何种交通的控制。"从任何地方进入80号港口的HTTP。仅允许从我的IP进入端口的SSH. 封锁其他一切". 配置不整的保安集团是云安全事件的首要原因.

- ** 服务网**(伊斯蒂奥,特使):管理K8s内部的服务间通信。提供:mTLS加密(每一次服务到服务呼叫都是加密的),交通通路(A/B测试:向新模式的流量的10%),回路,超时,断电,可观察性(服务称哪个,需要多长时间).

## 无服务器


- **Serverless** (AWS Lambda, GCP Cloud 函数):您上传一个函数,而云提供者在被触发时运行. 没有服务器可以管理, 没有缩放配置。每一次引用费用(通常为每1M引用0.20美元+计算时间).

- ** Cold 开始**:在一段时间后第一次援引需要更长的时间(提供者必须分配一个容器并加载您的代码)。冷起子为0.5-5秒,使无服务器不适合耐久敏感ML推论.

- ** 对于ML**:无服务器对于:预处理(在发送到模型之前修改图像大小),后处理(格式模型输出,发送通知),管弦(在新数据到达时触发培训管道)和轻量级推论(能容忍冷起动的小模型)都是有用的.

- 无服务器是 ** 不** 适合: GPU 推论(大多数无服务器平台中没有GPU支持),长期训练工作(Lambda的15分钟超时),或状态服务(引用之间没有持续状态).

## 成本管理


- 云成本是ML团队的首要业务考虑. 一个H100实例成本~$8/hour. A 64-GPU training run costs ~$500分/小时. 为期一个月的培训费用为36万美元。成本优化是工程学,而不是会计学.

- ** 现货/可控情况**:未使用的云容量以60-90%的折扣出售。供应商可以提前30秒至2分钟收回。用于:容错培训(经常检查点、恢复新情况)、批量推断、数据处理。不用于:对耐久性敏感的服务(中断=停机时间).

- ** 保留情况**:承诺使用1-3年,折扣30-60%。用于:稳定状态推论服务于您知道基线负载的地方.

- ** 自动升级**:在高峰时段扩大,在夜间/周末缩小。一个在高峰需要10个GPU,夜间需要2个的模型服务器通过自动缩放对运行10个GPU24/7来节省~60%.

- ** 正确尺寸**:不使用H100来做对A10G进行精细操作的7B型号。将GPU与工作量匹配. 使用剖面分析(第16章)来确定哪个GPU最适合.

- ** 套装成本**:物品存储费用低廉($0.023/GB/month for S3 Standard), but accumulates. A team storing every training checkpoint (10 GB each, 100 per experiment, 50 experiments) accumulates 50 TB = $1,150个月。设定生命周期政策,以自动删除旧的检查站。

## 多区域部署


- 对于全球ML系统(服务于全球用户),部署在一个单一区域意味着远方用户的高度耐用性(在东京打入一个美国服务器的用户会增加~150ms网络往返)和单一故障点(如果该区域下线,则整个服务已下线).

- ** 多边区域模式**:

    - ** 主动被动**:一个主要区域处理所有交通。二级区域有暖能备用(复制数据,随时可接收流量). 在初级故障时,DNS切换到二级. 故障期间的停工时间:30秒至几分钟.

    - ** 主动活动**:两个区域同时处理交通问题。用户被路由到最近的区域. 这两个区域都有最新数据(同步或同步复制)。单地故障期间无停站时间，，交通自动改道.

- ** 数据复制**:困难部分。模型权重可以轻易地复制(每个区域复制到S3). 地物储存数据必须以可接受的陈旧方式复制。用户数据可能具有**数据居住要求**(GDPR:欧洲用户数据必须留在欧洲).

- **GPU云定价比较**(近似,2026年):

|GPU|AWS|GCP|Azure|Typical Use|
|-----|-----|-----|-------|-------------|
|A10G (24 GB)|$1.00/hr (g5)|$0.90/hr|$0.90/hr|Small model inference|
|A100 (80 GB)|$4.10/hr (p4d)|$3.70/hr|$3.40/hr|Training, large inference|
|H100 (80 GB)|$8.00/hr (p5)|$7.50/hr|$7.00/hr|Frontier training|
|TPU v5e|n/a|$1.20/hr|n/a|JAX training at scale|

- 定点/预价通常比这些费率低60%-70%。价格因区域和可用性而异。

## 基础设施即代码


- **IaC**在版本控制的配置文件中定义了基础设施(VM,网络,数据库,K8s集群). 与其在AWS控制台上点击按钮,不如写出描述自己想要的代码,一个工具创建它.

- **Terraform** (HashiCorp):标准IaC工具. 与所有主要云提供商合作. 声明:您描述所期望的状态,Terraform会找出创建/修改/删除以达到它的方法.

```hcl
# main.tf ， create a GPU VM for inference
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

- ** IaC为何重要**:可复制性(从代码中重建整个基础设施)、审计(历史显示谁改变了什么)、灾后恢复(在同一个配置不同的区域重建)和环境等同(dev、cluding和prod使用具有不同参数的同一种模板)。

- ** Pulumi**:类似Terraform但使用真实的编程语言(Python, TypeScript, Go)来代替HCL. 当您的基础设施逻辑复杂时(条件性,循环性,动态配置)是有用的.
