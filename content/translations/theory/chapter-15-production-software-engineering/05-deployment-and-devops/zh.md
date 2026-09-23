---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 15 - production software engineering/05. deployment and devops.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: f0f304083d718a6f4b4b965731db05351fff97806d8487e7dde9b6c4d86fe08e
status: reviewed
---
# 部署与 DevOps

*部署与 DevOps 把模型从实验带到可靠生产环境。本篇覆盖 Docker、模型服务、实验跟踪、可复现性、监控、特征库和流水线编排。*



* 部署是你们的模型不再成为研究文物并开始成为产品的地方。这个文件涵盖ML的多克,模型服务,实验跟踪,可复制性,生产中的监测,地物商店和管线管弦乐,基础设施将一个训练有素的模型从笔记本带到数百万用户. *

- 一个只运行在笔记本电脑上的模型是一个原型. 一种能可靠地运行在规模上,以毫秒为预测服务,从故障中恢复,并且可以不中断时间更新的模型是一种产品. 两者之间的差距是**部署和DevOps**。

- 多数ML工程师花在部署、监测和调试生产问题上的时间比花在培训模型上的时间多。了解这种基础设施对建设真正的ML系统的人来说不是可选的。

## 用于 ML 的 Docker



- 我们在第13章(OS)概念上涵盖了集装箱。在这里,我们集中关注实用的一面:为ML的工作量写出多克文件.

- 一种制作容器图像的秘方:

```dockerfile
# Start from an official CUDA base image
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# System dependencies
RUN apt-get update && apt-get install -y \
    python3.11 python3-pip git \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies (install separately for caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code (changes frequently, so this layer is last)
COPY src/ /app/src/
COPY configs/ /app/configs/
WORKDIR /app

# Entry point
CMD ["python3", "src/scripts/serve.py", "--config", "configs/serve.yaml"]
```

- ** Layer carching**:多克缓存每层. 若为`requirements.txt`没有改变,`pip install`在重建时跳过。在频繁更改的层(源代码)之前,先放出很少变化的地层(系统包,pip安装). 这把10分钟的建筑变成了10秒的重建.

- **GPU访问**:使用`nvidia/cuda`基础图像并运行`docker run --gpus all`。。。该`nvidia-container-toolkit`提供GPU从主机到容器的通过.

- ** 多相相建** 通过将相建环境与运行时间分开来缩小图像大小:

```dockerfile
# Build stage: install build tools, compile dependencies
FROM python:3.11 AS builder
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Runtime stage: only runtime dependencies
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04
COPY --from=builder /root/.local /root/.local
COPY src/ /app/src/
ENV PATH=/root/.local/bin:$PATH
```

- 最终的图像只包含运行时库,不包含编译器,信头,或构建工具. 一个5GB的构建图像成为了2GB运行时的图像.

- ** Docker Compose** 运行多容器设置(模型服务器+负载平衡器+监控):

```yaml
# docker-compose.yml
services:
  model:
    build: .
    ports:
      - "8080:8080"
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
```

## 模型服务



- ** Model service** 正在运行推论作为服务:接收请求,运行模型,返回预测.

- ** FastAPI**(在文件03中涵盖)是低到中通量最简单的方法. 对于高吞吐量和GPU优化服务,使用专用工具:

- ** Triton 推论服务器**(NVIDIA):服务于TensorRT,ONNX,PyTorch和TensorFlow格式的模型. 特征 :
    - ** 动态分批**:收集个别请求并分批进行,以达到GPU的效率。单项请求分成32个组,大大地提高了吞吐量。
    - ** 模块组合**:在单一请求中链式多模式(预处理器_模型_后处理器).
    - **多型号服务**:在同一GPU上服务多型号,共享资源.
    - ** 当前模式执行**:在同一GPU上平行运行多个推论请求.

- **TorchServe**(PyTorch):服务于PyTorch模型,使用REST/gRPC API. 支持模型版本,A/B测试,以及自定义处理器.

- **vLLM**:专为LLM服务。执行PagedAttention(高效的 KV缓存管理),连续分批,并跨GPU的收分数并行. 实现10-20x的吞吐量高于为大语言模型服务的天真.

- ** 仙人掌**([github.com/cactus-compute/cactus (中文(简体)).](https://github.com/cactus-compute/cactus):一种低纬度的AI引擎,用于在移动和边缘服务上提供设备. Cactus提供**OpenAI相容的API**(聊天完成,流接,工具调用,转录,嵌入,RAG,视觉),完全运行在设备上,当本地模型无法处理请求时,自动有**云回落**. 这种混合架构是指无论推论是本地运行还是云中运行,你的应用代码都使用相同的API，，由引擎根据模型置信度和装置能力决定. SDK可供Python,Swift,克特林,Flutter,React Introduct,和Rust使用,在HuggingFace上预转换模型重量. 支持多模式推论(LLMs,视觉,语音),并有自定义的ARM SIMD内核,用于对ARM CPU进行最快推论,并用于10x下部RAM用量的零复制内存映射(第16章 第17章).

- ** 模式格式优化**:
    - **ONNQ:互操作性的开放格式. 从 PyTorch / TensorFlow 导出, 随地跑.
    - ** 传感器**:NVIDIA的选取器。花序分层,选择最优的内核,量子重. 通常在NVIDIA GPU上比PyTorch快2-5x.
    - ** GGUF/GGML**:用于CPU高效推论的格式,流行于消费者硬件上运行的LLMs.

## 实验跟踪



- 没有实验跟踪,ML的研究就演变成: “我认为上个星期二的模型 有了这个配置,我改变了一些东西是最好的, 但我不记得我改变了什么。”

- **Wights & Biases (W&B)**:最受欢迎的实验跟踪器. 从您的训练脚本中记录任何内容 :

```python
import wandb

wandb.init(project="my-project", config={
    "model": "transformer",
    "lr": 3e-4,
    "batch_size": 64,
})

for epoch in range(num_epochs):
    train_loss = train_one_epoch()
    val_loss = validate()

    wandb.log({
        "train/loss": train_loss,
        "val/loss": val_loss,
        "epoch": epoch,
    })

    # Log model as artifact
    if val_loss < best_loss:
        wandb.save("best_model.pt")

wandb.finish()
```

- W&B提供:用于比较运行的仪表板,超参数扫描工具,模型注册,数据集版本以及团队协作.

- **MLflow**:开源替代. 本地运行或服务器运行 :

```python
import mlflow

mlflow.set_experiment("my-experiment")

with mlflow.start_run():
    mlflow.log_params({"lr": 3e-4, "batch_size": 64})
    mlflow.log_metric("val_loss", 0.042, step=epoch)
    mlflow.pytorch.log_model(model, "model")
```

- ** 模型登记册**:一个训练有素的模型的中央储存库,其中包含版本、中试(dev-Cooting-)和元数据。W&B和ML流量都提供登记册。登记册回答:"目前正在生产哪种模型,谁对其进行培训,其验证准确性如何,以及何种代码/数据产生?

## 可复现性



- 可复制性是指: 给定相同的代码,数据和配置,生成相同的模型. 由于GPU操作中非定型性,数据分流和浮点积分,这在ML中令人惊讶地困难.

- ** 可复制清单**:

|What|How|
|------|-----|
|Code version|Git commit hash|
|Config / hyperparameters|Config file (versioned in git or logged to W&B)|
|Random seeds|Set and log all seeds (Python, NumPy, PyTorch, CUDA)|
|Data version|DVC hash, dataset version tag, or S3 object version|
|Dependencies|`pip freeze`, Docker image hash, or lockfile|
|Hardware|GPU type, number of GPUs, CUDA version|
|Non-determinism|`torch.backends.cudnn.deterministic = True` (slower but reproducible)|

- 给所有东西下注 **:`pip install torch==2.2.1`没有`torch>=2.0`。。。微小的版本凸起可以改变数值行为,可选择执行,或默认超参数.

- ** Docker for republicity**: Docker图像将OS,系统库,Python版本和pip套件都标出. 图像散列是一个完整的环境指纹. 如果你能复制多克图像,你可以复制训练.

## 生产监控



- 部署一个模式不是目的,而是一系列新问题的开始。模型随时间推移而退化,因为真实世界在变化(**概念漂移**)和输入数据分布变化(**数据漂移**)。

- ** 监测内容**:

    - ** 耐心**:推断需要多长时间? 音轨p50 (中间), p95,和 p99. 一个500ms的p99表示每100个用户中就有1个等待了半秒,这可能是不可接受的.

    - ** 过量**:每秒有多少请求? 该系统是否跟上需求?

    - ** 错误率**:请求中有多少部分失败(例外、超时、无效输入)?

    - ** 模型指标**:准确性、精确度、对搁置的设定召回。如果在生产中存在标签数据(例如用户更正),跟踪在线计量。

    - ** 数据漂移**:收到的数据的分布情况是否有所变化? 接受过日间相片训练的模特在夜相上可能失败. 统计测试(KS测试,PSI)将培训分布与现场分布进行比较.

    - ** Feature 漂移**:个人特征分布是否改变? 通常在培训期间分发的特征是双模式,现在表明数据管道问题。

- ** 工具**:
    - ** Prometheus** + ** Grafana**:基础设施监测标准。普罗米修斯收集了度量衡,格拉法纳在仪表盘中可视化出有警报.
    - ** 显然,AI**:开放源代码ML监测。生成数据漂移,模型性能,和数据质量等报告.

- ** 提示器**:不要只是仪表板，，设置自动警报. "如果p99的延迟超过200ms5分钟,就发出Slack通知". "如果数据漂移得分超过阈值,请在待命工程师上页"

## 特征库



- 一个**地物店**是预先计算过的特性的集中存放处,由培训与服务共享. 它能解决两个问题:

    - ** 训练服务软件**:训练期间使用的特性必须与服役期间的特性相同。如果培训有用`user_age_at_signup`计算出一种方式,并用不同的计算方法,模型的预测是默默地错误的.

    - ** Feature再利用**:多种模型经常使用相同的特征(用户人口统计,项目嵌入,汇总统计数据). 一次计算和分享可以避免重复和不一致。

- **Feast**是最受欢迎的开源地物店. 它管理在线功能(低纬度,服务于Redis或DynamoDB)和离线功能(批量,存储于数据仓库以进行训练.

- 地物储存对于推荐系统、欺诈检测和任何从原始数据管道计算地物的应用程序都至关重要。

## 流水线编排



- 生产ML系统不仅仅是一个模型。这是一个**管线**:数据摄取-预处理-特征计算-培训-评价-部署-监测。每一步都取决于前一步,可以独立地失败,可能需要按不同的时间表运行.

- ** 管风琴**

- ** Apache Airflow**:数据管道管弦乐的标准。DAGs(Directed Acycle Graphs)定义任务依赖性. 每个任务独立运行,在失败时可以被再试,并通过网络UI进行监控.

```python
# airflow DAG example (simplified)
from airflow import DAG
from airflow.operators.python import PythonOperator

dag = DAG("training_pipeline", schedule="@daily")

preprocess = PythonOperator(task_id="preprocess", python_callable=preprocess_data, dag=dag)
train = PythonOperator(task_id="train", python_callable=train_model, dag=dag)
evaluate = PythonOperator(task_id="evaluate", python_callable=evaluate_model, dag=dag)
deploy = PythonOperator(task_id="deploy", python_callable=deploy_model, dag=dag)

preprocess >> train >> evaluate >> deploy
```

- **Kubeflow管道**:库贝内特斯上ML特有管弦. 每个步骤在一个容器中运行,GPU资源按要求分配,实验自动跟踪.

- ** Python APIs)和** Dagster**:具有较好开发者经验的现代替代气流,本地Python API,并内置数据行.

- ** 何时协调**:当你的管道有超过2至3个步骤,按时间表运行,涉及多个团队或服务,或需要自动从故障中恢复。单笔培训工作不需要管弦乐手。每天的再培训管道 摄取来自5个来源的数据 训练3个模型,评估它们 并部署最好的一个绝对做的。
