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

*部署让经过训练的模型进入实际服务。本篇介绍机器学习项目中的 Docker、模型服务、实验跟踪、可复现性、线上监控、特征库和流水线编排。*

- 只在笔记本电脑上运行的模型通常还只是原型。要成为可用服务，还需考虑负载下的稳定性、推理延迟、故障恢复和更新方式。把模型训练结果变成可靠服务，需要部署和运维工作。

- 机器学习工程还包括部署、监控以及排查线上问题。模型训练只是系统中的一部分，实际投入会因团队和项目而异。

## 用 Docker 部署机器学习工作负载

- 第 13 章从操作系统角度介绍了容器；这里重点说明如何为机器学习工作负载编写 Dockerfile。

- **Dockerfile** 是构建容器镜像的配方：

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

- **分层缓存**：Docker 会缓存每个构建层。若 `requirements.txt` 没变，重新构建时通常可以复用安装依赖的缓存层。把不常变化的步骤（如系统和 Python 依赖）放在前面，把源代码等常变内容放在后面，可减少重复构建时间；实际节省多少取决于缓存命中情况。

- **GPU 访问**：可从包含 CUDA 运行时的镜像构建，并使用 `docker run --gpus all` 将 GPU 设备传入容器。主机还需要配置 NVIDIA 驱动和 `nvidia-container-toolkit`，镜像本身不能替代主机驱动。

- **多阶段构建**：把编译依赖的构建环境与较精简的运行环境分开：

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

- **重要限制**：示例运行阶段使用的 CUDA Ubuntu 镜像未显式安装 Python；构建阶段生成的 Python 包也可能依赖 Python 解释器、系统库或特定 ABI。实际镜像需要提供兼容的解释器和运行库，并确保构建、运行阶段的系统环境相容。Dockerfile 第一例使用 Ubuntu 22.04，默认软件源通常提供 Python 3.10；若需要 Python 3.11，需选择合适基础镜像或配置软件源。此外，工作目录、复制的文件路径和 `CMD` 指向的入口脚本必须与项目实际目录结构一致。

- 合理配置多阶段构建后，最终镜像可以不包含编译器和头文件等构建工具，从而减小镜像体积。实际能缩小多少取决于依赖和运行库。

- **Docker Compose** 可协调多个容器，例如模型服务、负载均衡器和监控组件。GPU 资源声明的支持情况取决于 Docker Compose 版本和运行环境：

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

- **模型服务**是把推理作为服务运行：接收请求、执行模型并返回预测。

- **FastAPI** 适合搭建简单服务；若要处理高吞吐量或充分利用 GPU，可评估专门的推理服务框架。实际选择还要考虑模型、批处理、延迟要求和部署方式。

- **NVIDIA Triton Inference Server** 支持 TensorRT、ONNX、PyTorch 和 TensorFlow 等模型格式，常见功能包括：
    - **动态批处理**：将一段时间内到达的独立请求合并成批次，以提高 GPU 利用率。批次大小和等待时间需要配置；例如最多凑成 32 个请求可能提高吞吐量，但也可能增加延迟。
    - **模型集成**：把预处理、模型推理和后处理串联为同一推理流程。
    - **多模型服务**：在同一 GPU 上运行多个模型并共享资源，实际并发能力取决于显存和计算资源。
    - **并发执行**：并行处理多个推理请求；吞吐效果取决于模型和硬件。

- **TorchServe** 是 PyTorch 模型服务工具，可通过 REST 或 gRPC 提供接口，并支持模型版本和自定义处理器。使用前应确认其当前维护状态、版本兼容性和项目需求。

- **vLLM** 面向大语言模型服务，包含 PagedAttention（管理 KV 缓存）、连续批处理和跨 GPU 张量并行等机制。原文所说相较朴素服务可提高 10–20 倍吞吐量属于特定比较结果；实际提升取决于模型、硬件、请求长度、批处理设置和基线实现。

- **Cactus**（[github.com/cactus-compute/cactus](https://github.com/cactus-compute/cactus)）是面向手机和边缘设备的低延迟 AI 推理引擎。项目介绍了兼容 OpenAI API 的接口，涵盖聊天补全、流式输出、工具调用、转录、嵌入、RAG 和视觉等功能，并支持本地推理与云端回退。若两种执行方式使用相同接口，应用代码可以保持一致；模型选择或回退策略仍受设备能力与配置影响。项目还提供 Python、Swift、Kotlin、Flutter、React Native 和 Rust SDK，以及 Hugging Face 上的转换后模型权重。其多模态推理、ARM SIMD 内核和零拷贝内存映射等能力及性能数据，需按具体模型、设备和版本评估；“内存降低 10 倍”是依赖测量条件的项目描述，不是通用保证。

- **模型格式与推理优化**：
    - **ONNX**：用于模型交换和跨框架部署的开放格式。
    - **TensorRT**：NVIDIA 的推理优化工具，可融合层、选择内核，并在适用时量化权重。相较 PyTorch 的 2–5 倍加速并非所有模型和设备都能达到。
    - **GGUF/GGML**：常用于消费级硬件上的高效本地推理，具体性能取决于量化方式和运行时。

## 实验跟踪

- 没有实验跟踪时，很容易忘记某次训练使用的配置、代码和数据版本，也难以判断哪次结果更好。

- **Weights & Biases（W&B）**可在训练脚本中记录指标和配置：

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

- **注意**：示例中的 `best_loss` 没展示初始化和更新逻辑，因此只是示意。`wandb.save` 用于同步文件；若要创建可版本化的 W&B Artifact，应使用相应的 Artifact API。

- W&B 提供运行对比仪表板、超参数搜索、模型注册表、数据集版本管理和团队协作等功能；不同功能的使用方式依服务配置而定。

- **MLflow** 是开源的实验跟踪工具，可在本地或服务器上运行：

```python
import mlflow

mlflow.set_experiment("my-experiment")

with mlflow.start_run():
    mlflow.log_params({"lr": 3e-4, "batch_size": 64})
    mlflow.log_metric("val_loss", 0.042, step=epoch)
    mlflow.pytorch.log_model(model, "model")
```

- **模型注册表**集中保存训练出的模型及其版本、阶段和元数据，例如模型当前是否部署、由谁训练、验证指标是什么，以及使用了哪些代码和数据。

## 可复现性

- 可复现性是指使用相同的代码、数据和配置重新运行实验，并得到一致或足够接近的结果。机器学习中，GPU 算子、数据打乱和浮点累加可能具有非确定性，因此位级完全一致并不总能实现。

- **可复现实验的记录清单**：

| 项目 | 记录方式示例 |
| --- | --- |
| 代码版本 | Git 提交哈希 |
| 配置与超参数 | 纳入版本控制的配置文件，或记录到 W&B |
| 随机种子 | 设置并记录 Python、NumPy、PyTorch 和 CUDA 等随机种子 |
| 数据版本 | DVC 哈希、数据集版本标签或 S3 对象版本 |
| 依赖 | `pip freeze`、Docker 镜像摘要或锁文件 |
| 硬件 | GPU 型号、数量和 CUDA 版本 |
| 非确定性设置 | 例如 `torch.backends.cudnn.deterministic = True`（可能降低速度） |

- **锁定依赖**：指定确定的依赖版本（如 `torch==2.2.1`，而非 `torch>=2.0`），有助于减少环境差异。小版本变化也可能影响数值结果、优化器实现或默认设置。

- **Docker 有助于固定环境**：镜像可以固定操作系统层、系统库、Python 版本和软件包。记录镜像摘要便于识别镜像内容；但这仍不能固定主机驱动、GPU 硬件、外部数据、远程依赖和所有非确定性行为，因此不能单独保证完整复现。

## 线上监控

- 模型部署后还需持续监控。真实世界和输入数据的变化可能让模型表现下降：**概念漂移**指输入与目标之间的关系变化，**数据漂移**指输入数据分布变化。

- **监控指标**：
    - **延迟**：跟踪 p50（中位数）、p95 和 p99。p99 为 500 毫秒表示约 99% 的请求不超过该延迟，剩余约 1% 更慢；是否可接受取决于服务目标。
    - **吞吐量**：每秒能处理多少请求，系统是否能跟上需求。
    - **错误率**：因异常、超时或输入无效而失败的请求比例。
    - **模型指标**：在有标签的验证集或线上反馈上监测准确率、精确率、召回率等。离线指标不一定代表线上表现。
    - **数据漂移**：检查线上输入分布是否与训练数据不同。可用 KS 检验或 PSI 等方法比较，但漂移信号本身不等于模型质量已下降。
    - **特征漂移**：检查单个特征的分布变化。若训练期间近似单峰的特征变成明显双峰，可能说明数据管道或使用人群发生了变化，需要进一步调查。

- **监控工具**：
    - **Prometheus** 和 **Grafana**：常见的基础设施监控组合。Prometheus 收集指标，Grafana 用仪表板展示并配置告警。
    - **Evidently AI**：可生成数据漂移、模型表现和数据质量报告的开源工具。

- **告警**：除了查看仪表板，还应设置自动告警。例如 p99 延迟持续 5 分钟超过 200 毫秒时通知 Slack；数据漂移超过阈值时通知值班人员。阈值应依据服务等级目标和误报成本设定。

## 特征库

- **特征库（feature store）**集中管理预计算特征，供训练和线上服务复用，主要用于减少两类问题：

    - **训练—服务偏差**：训练与服务阶段应使用定义一致的特征。如果训练时的 `user_age_at_signup` 与服务时的计算方式、时间窗口或缺失值处理不同，预测可能失准。
    - **特征复用**：多个模型可能使用相同的用户属性、物品嵌入或聚合统计。集中管理可以减少重复计算和实现不一致。

- **Feast** 是开源特征库之一，可管理在线特征（通常存于 Redis 或 DynamoDB 等低延迟存储）和离线特征（通常存于数据仓库，供训练使用）。

- 特征库适用于推荐、欺诈检测等需要跨模型共享特征或同时支持线上与离线计算的场景；是否必要取决于系统复杂度。

## 流水线编排

- 生产机器学习系统通常由多个步骤组成：数据接入 → 预处理 → 特征计算 → 训练 → 评估 → 部署 → 监控。每一步可能依赖前序步骤、独立失败，或按不同周期运行。

- **编排工具**负责定义这些任务的依赖关系、调度、重试和监控。

- **Apache Airflow** 是常见的数据流水线编排工具。它用 DAG（有向无环图）定义任务依赖；任务可以独立运行、失败重试，并通过 Web 界面监控。

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

- 这是简化示例。实际 Airflow DAG 还需按使用的 Airflow 版本设置开始日期、任务参数和连接配置等；示例中的任务函数也必须先定义。

- **Kubeflow Pipelines** 面向 Kubernetes 上的机器学习流水线，每个步骤可以在容器中运行，并请求所需 GPU 资源；实验跟踪能力取决于具体组件和配置。

- **Prefect** 和 **Dagster** 是其他流水线编排工具，提供 Python API、开发辅助功能和数据血缘追踪等能力。

- **何时需要编排**：当流水线有多个步骤、按计划运行、涉及多个团队或服务，或需要自动故障恢复时，可以考虑使用编排器。“超过两三步”只是经验判断；单次运行的简单训练脚本未必需要编排工具。
