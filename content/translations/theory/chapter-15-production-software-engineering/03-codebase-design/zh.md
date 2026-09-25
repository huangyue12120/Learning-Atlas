---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 15 - production software engineering/03. codebase design.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: caa1585e3d172d4152d460a616e2cedb28756a48acba914982bbdccb261fbd9e
status: reviewed
---
# 代码库设计与模式

*良好的代码库设计能让研究原型随着项目增长，逐步演进为可维护的软件。本篇介绍项目结构、整洁代码原则、机器学习中常见的设计模式、配置管理、日志、API 设计和打包发布。*

- 许多机器学习项目从 Jupyter Notebook 起步。随着代码不断复制、修改和共享，Notebook 可能逐渐堆满全局变量、失效单元格和难以理解的常数。**代码库设计**关注的是如何组织代码，让项目增长后仍便于理解和修改。

- 设计的目的不是为了遵守规则本身，而是缩短“我想改 X”到“X 已改好并能正常工作”之间的时间。结构清晰的代码库能让修改更直接；结构混乱、缺少文档的项目则需要花很多时间摸索。

## 项目结构

- 统一的项目布局能让团队成员（包括未来的自己）更快找到代码。下面是一种常见示例，具体结构应按项目规模和依赖关系调整。

```
my_project/
├── src/my_project/       # source code (importable package)
│   ├── __init__.py
│   ├── data/             # data loading and preprocessing
│   │   ├── __init__.py
│   │   ├── dataset.py
│   │   └── transforms.py
│   ├── models/           # model architectures
│   │   ├── __init__.py
│   │   ├── transformer.py
│   │   └── layers.py
│   ├── training/         # training loops, optimisers
│   │   ├── __init__.py
│   │   ├── trainer.py
│   │   └── losses.py
│   └── utils/            # shared utilities
│       ├── __init__.py
│       └── logging.py
├── configs/              # configuration files
│   ├── base.yaml
│   └── experiment_1.yaml
├── scripts/              # entry points (train, evaluate, serve)
│   ├── train.py
│   ├── evaluate.py
│   └── serve.py
├── tests/                # test files (mirrors src/ structure)
│   ├── test_dataset.py
│   ├── test_model.py
│   └── test_trainer.py
├── notebooks/            # exploration only (not production code)
├── pyproject.toml        # project metadata and dependencies
├── README.md
├── .gitignore
└── Dockerfile
```

- **`src/` 布局**：把代码放在 `src/my_project/` 下，可以避免开发时从当前目录意外导入项目代码，从而掩盖安装或导入配置问题。开发时可用 `pip install -e .` 安装为可编辑包。

- **单仓库与多仓库**：**单仓库（monorepo）**把相关项目放在一个仓库中，便于跨项目修改和共享 CI；**多仓库（multi-repo）**让每个项目独立管理，边界和版本更清楚。两种方式各有取舍，是否拆分取决于项目耦合度、发布方式和团队协作需求。

- **脚本与库**：可把 `train.py`、`evaluate.py` 等入口放在 `scripts/`，把可复用逻辑放在 `src/`。训练入口可以保持简短，例如依次读取配置、构造数据集、创建模型和训练器，再启动训练；“约 50 行”只是经验参考，并非硬性标准。

## 整洁代码原则

- **命名**：清晰的命名能减少阅读代码时的来回查找。相比只知道 `x` 含义的写法，`learning_rate` 能直接说明变量用途。

```python
# BAD
def proc(d, n, lr):
    for i in range(n):
        for k, v in d.items():
            v -= lr * g[k]

# GOOD
def update_parameters(parameters, num_steps, learning_rate):
    for step in range(num_steps):
        for name, param in parameters.items():
            param -= learning_rate * gradients[name]
```

- **单一职责原则**：函数或类应围绕一个主要职责设计。若 `load_data_and_train_model` 同时负责读取数据和训练模型，可考虑拆分为两个职责明确的部分，便于单独测试、复用和理解。

- **不要重复自己（DRY）**，但也不要过早抽象。相同逻辑反复出现时，可以提取成函数；若代码只使用一次，未必需要为它创建抽象。过早抽象会带来额外复杂度，却没有明确收益。

```python
# Premature abstraction (one use case, over-engineered)
class AbstractDataTransformPipelineFactory:
    ...

# Just right (direct, clear, used in three places)
def normalise_image(image, mean, std):
    return (image - mean) / std
```

- **避免魔法数字**：不要在代码中使用含义不明的字面数值。把数值命名成常量，并在必要时说明单位或来源。

```python
# BAD
if len(batch) > 32:
    split_batch(batch, 32)

# GOOD
MAX_BATCH_SIZE = 32
if len(batch) > MAX_BATCH_SIZE:
    split_batch(batch, MAX_BATCH_SIZE)
```

- **控制函数长度**：如果函数长到难以在一次阅读中把握（例如超过约 30 行），可以检查它是否承担了过多职责，并考虑拆出命名清晰的辅助函数。行数只是提醒信号，不是绝对规则。

## 适用于机器学习代码的设计模式

- **设计模式**是针对常见问题的可复用结构。以下模式在机器学习代码库中较常见：

- **工厂模式**：把对象创建逻辑集中起来，由配置决定实例化哪个具体类。例如配置中指定模型类型后，再创建相应的模型对象：

```python
MODEL_REGISTRY = {
    "transformer": TransformerModel,
    "cnn": CNNModel,
    "mlp": MLPModel,
}

def build_model(config):
    model_cls = MODEL_REGISTRY[config["model"]]
    return model_cls(**config["model_params"])
```

- 这种写法降低训练入口对具体模型实现的依赖。增加模型时，可扩展注册表，而不必把模型选择逻辑散落在训练流程中。

- **策略模式**：在运行时选择不同算法或行为，可用于损失函数、优化器和学习率调度器等：

```python
LOSS_FUNCTIONS = {
    "mse": nn.MSELoss,
    "cross_entropy": nn.CrossEntropyLoss,
    "focal": FocalLoss,
}

loss_fn = LOSS_FUNCTIONS[config["loss"]]()
```

- **观察者模式**（回调/钩子）：模块通过事件接收通知，而不必彼此紧密耦合。PyTorch Lightning、Keras 等训练框架广泛使用回调：

```python
class EarlyStopping:
    def __init__(self, patience=5):
        self.patience = patience
        self.best_loss = float('inf')
        self.counter = 0

    def on_epoch_end(self, epoch, val_loss):
        if val_loss < self.best_loss:
            self.best_loss = val_loss
            self.counter = 0
        else:
            self.counter += 1
            if self.counter >= self.patience:
                return "stop"
```

- **依赖注入**：由调用方把依赖传入函数或类，而不是在内部固定创建。这样更容易替换实现、配置组件或注入 mock 进行测试：

```python
# BAD: hard-coded dependency
class Trainer:
    def __init__(self):
        self.logger = WandbLogger()  # cannot test without W&B

# GOOD: injected dependency
class Trainer:
    def __init__(self, logger):
        self.logger = logger  # can inject any logger, including a mock
```

## 配置管理

- 把超参数、文件路径和模型设置写死在代码里，会增加修改和复现实验的难度。可以把这些配置**外置**到独立文件中。

- YAML 是机器学习项目常用的配置格式：

```yaml
# configs/experiment_1.yaml
model:
  name: transformer
  d_model: 512
  n_heads: 8
  n_layers: 6

training:
  batch_size: 64
  learning_rate: 3e-4
  max_epochs: 100
  early_stopping_patience: 10

data:
  train_path: /data/train.parquet
  val_path: /data/val.parquet
  max_seq_length: 512
```

- **Hydra** 是一个开源配置框架，支持配置组合（把基础配置与实验覆盖项合并）、命令行覆盖和多次运行（例如扫多个超参数组合）。示例中的命令应使用配置文件里实际定义的字段名，如 `python train.py training.learning_rate=1e-3`。

- 若脚本只有少量参数，Python 标准库中的 **argparse** 通常更简单：

```python
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--lr", type=float, default=3e-4)
parser.add_argument("--batch-size", type=int, default=64)
parser.add_argument("--config", type=str, default="configs/base.yaml")
args = parser.parse_args()
```

- **建议做法**：准备包含默认值的基础配置，再让每个实验配置只覆盖变化项。把实验配置与对应结果一同保存。配置和版本记录有助于复现，但仍需记录代码、数据、环境等其他信息。

## 日志与可观测性

- `print` 适合临时调试；生产程序通常使用**日志**，以便按级别筛选、统一格式并把记录发送到文件或监控系统。

```python
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

logger.debug("Batch loaded: %d samples", len(batch))     # noisy, for debugging
logger.info("Epoch %d: loss=%.4f, lr=%.6f", epoch, loss, lr)  # normal operation
logger.warning("GPU memory >90%%, consider reducing batch size")
logger.error("Failed to load checkpoint: %s", path)       # recoverable error
logger.critical("CUDA out of memory, aborting")            # fatal
```

- 日志级别可以控制哪些信息输出；格式化器可加入时间戳和模块名，处理器则可把日志写入文件或发送到监控服务，而不必在每条日志语句里重复实现这些逻辑。

- 上面示例中警告消息写成 `90%%`，但没有提供格式化参数；在这种情况下通常会原样显示两个百分号。若要输出 `90%`，应调整消息文本；只有使用百分号格式化并传入参数时，才需用 `%%` 表示字面百分号。

- **结构化日志**会把字段作为机器可解析的数据输出，例如 JSON，便于按字段搜索和设置告警：

```python
logger.info("training_step", extra={
    "epoch": 5, "step": 1200, "loss": 0.0342, "lr": 2.1e-4
})
```

- 仅通过标准 Python 日志调用的 `extra` 参数添加字段，并不会自动把日志序列化为 JSON；还需配置相应的格式化器或处理器。

## API 设计

- 若其他服务（例如网页应用、手机应用或另一条机器学习流水线）需要调用模型，就需要定义**API**（应用程序编程接口）。

- **REST API** 使用 HTTP 方法操作资源：`GET` 常用于读取，`POST` 常用于创建或提交预测请求，`PUT` 常用于更新，`DELETE` 常用于删除。端点通常按资源组织，例如：

```
POST /api/v1/predict          # send input, get prediction
GET  /api/v1/models           # list available models
GET  /api/v1/models/{id}      # get model details
POST /api/v1/models/{id}/predict  # predict with a specific model
```

- **FastAPI** 是常用的 Python 服务框架：

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class PredictRequest(BaseModel):
    text: str

class PredictResponse(BaseModel):
    label: str
    confidence: float

@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    result = model.predict(request.text)
    return PredictResponse(label=result.label, confidence=result.score)
```

- FastAPI 可以根据类型声明生成 API 文档（例如 `/docs` 上的 Swagger UI），并使用 Pydantic 模型校验输入和输出。异步接口有助于处理异步 I/O；若预测调用本身是同步的 CPU 或 GPU 密集任务，单纯把端点声明为 `async` 并不会自动提高吞吐量。

- **gRPC** 使用 Protocol Buffers 进行二进制序列化，并支持流式通信，常用于服务之间的内部调用。它在某些负载下可能比 JSON REST 接口更高效；实际速度还取决于数据结构、网络、序列化和部署方式。TensorFlow Serving、Triton Inference Server 等系统及微服务架构中都可见 gRPC。

## 打包与分发

- 把代码打包成可安装的软件包后，其他项目和脚本就能更稳定地导入它：

```toml
# pyproject.toml
[project]
name = "my-ml-project"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
    "torch>=2.0",
    "jax>=0.4",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = ["pytest", "ruff", "mypy"]

[build-system]
requires = ["setuptools>=64"]
build-backend = "setuptools.backends._legacy:_Backend"
```

- **注意**：构建后端的名称必须与所用 setuptools 版本兼容。许多当前项目使用 `setuptools.build_meta`；若采用其他后端路径，应确认对应模块确实存在并能构建项目。

```bash
pip install -e ".[dev]"    # install in editable mode with dev dependencies
```

- **可编辑安装**（`-e`）会让开发中的源代码修改立即反映到安装包中，通常不必每次修改都重新安装。

- **锁定依赖版本**：把依赖限定到确定版本（例如 `torch==2.2.1`，而不是 `torch>=2.0`）有助于重建环境。`pip freeze > requirements.txt` 可以记录当前环境，但完整复现还可能需要锁定传递依赖、Python 版本、平台和软件源。依赖关系较复杂时，也可使用 `uv`、`poetry` 或 `pip-tools`。

## 使用 AI 编码智能体

- Claude Code、GitHub Copilot、Cursor 等 AI 编码工具已用于日常工程工作。它们可以加快实现，但输出也可能带来细微错误、削弱使用者对代码的理解，或让人误以为任务已经完成。

- 一种实用的工作方式是：把 AI 编码智能体看成**速度快、但对具体项目了解有限的协作工具**。它可以提供代码草稿、语法和常见模式，但不会自动掌握项目约束、边界条件和设计缘由；即使能访问文档，也仍需核对 API 和版本。使用者应确定目标、提供必要上下文、审查代码并对最终变更负责。

### 智能体适合协助的任务

- **样板代码和脚手架**：例如生成 Dockerfile、CI 配置、测试夹具、数据类或 argparse 设置。模式明确、重复性高的任务可以交给智能体起草，再检查正确性。

- **编写测试**：描述函数行为后，让智能体提出测试案例。它可能提醒你检查空输入、负数和 Unicode 等情况。应阅读并运行测试；测试验证的是其中表达的预期，不能代替对需求本身的确认。

- **重构**：例如提取函数、改用 dataclass 或添加类型提示。意图明确时，机械改写通常比较适合交给智能体，但仍应检查语义是否变化。

- **探索和原型**：例如快速写脚本测量推理延迟，或尝试 Hugging Face tokenizer API。输出可以作为起点；应对照项目使用的库版本检查参数和行为。

- **文档和 docstring**：智能体可以根据代码结构起草文档，但仍需核对描述是否准确。

- **调试辅助**：给出错误回溯并请智能体分析，可能有助于定位形状不匹配、导入错误或 CUDA 显存不足等问题。建议应作为待验证的假设，而不是已经证实的结论。

### 不宜直接依赖智能体的场景

- **新的架构决策**：智能体可能给出通用方案，却不了解数据限制、延迟要求和团队经验。可以让它协助实施，但关键设计应根据实际约束决定。

- **安全关键代码**：身份验证、加密和输入清理容易受到细微漏洞影响。相关代码需要基于明确的威胁模型设计，并经过具备安全经验的人员审查。

- **性能关键路径**：智能体可能给出能工作的朴素实现。GPU 内核、内存敏感的数据结构和低延迟服务需要结合硬件限制仔细优化。

- **自己无法解释的代码**：若无法说明生成代码各部分的作用，不应直接提交。否则维护者将难以排查之后出现的问题。

### 审查时要检查什么

- 提交前应逐行阅读生成的代码，把它当作同事提交的代码来审查。智能体输出是草稿，不是免审的成品。

- 检查要点包括：
    - **正确性**：代码是否解决了实际要求，而不是看似相近的问题？
    - **边界情况**：是否处理空输入、`None`、负数和大规模输入？
    - **不存在的 API**：库函数和参数是否真实存在，并适用于当前版本？
    - **过度设计**：实现是否比问题本身复杂？能否删掉不必要的代码？
    - **安全性**：是否包含硬编码密钥、未清理的用户输入或不安全默认值？
    - **风格一致性**：命名、错误处理和结构是否符合项目惯例？

### 如何编写清晰的提示词

- 给智能体的指令越明确，输出越容易贴合目标。模糊的提示往往会得到泛泛的代码。

- **不够明确**：`write a data loader`

- **更明确**：要求为包含 `text` 和 `label` 列的 CSV 文件编写 PyTorch DataLoader，指定 tokenizer 名称和最大长度，说明返回的张量字段，并明确标签缺失时要跳过相应行。

- **提供上下文**：说明项目结构、现有实现、限制和约定。上下文越相关，越容易得到可用的初稿。

- **说明约束**：例如“只使用标准库”“兼容 Python 3.10”“不使用全局变量”“遵循 `src/models/transformer.py` 中的现有模式”。

- **要求解释**：可以要求说明关键设计选择，以便审查者看清实现假设并发现问题。

### 用质量检查发现问题

- 项目已有的质量检查也能发现 AI 生成代码和人工代码中的问题：

    - **类型检查（mypy）**：在类型信息和存根完整时，可发现类型不匹配或部分签名错误；它不能保证 API 在运行时存在或行为正确。
    - **代码检查（ruff）**：可发现未使用导入、未定义变量和风格问题。
    - **测试（pytest）**：测试通过能增加对已覆盖行为的信心，但不能证明代码没有其他错误。若缺少测试，可以先补充测试再实现。
    - **CI 流水线**：可在提交时自动运行类型检查、代码检查和测试。

- 代码生成与质量检查结合起来，往往比单独依赖其中一项更可靠；检查工具能发现部分问题，但不会替你理解需求或设计代码。

### 生产力陷阱

- 使用编码智能体最大的风险之一，是把代码生成量误当成实际进展。10 分钟生成 500 行代码并不一定更快；若之后花两小时调试不理解的代码，整体可能比自己用半小时写出 200 行还慢。

- 更有效的做法包括：
    1. **掌握设计决策**：由你确定架构和约束，再让智能体协助实现。
    2. **弄清生成内容**：无法解释时，要求简化或自行重写。
    3. **完善质量检查**：测试、类型检查和代码检查的投入可以在后续多次开发中复用。
    4. **按任务选择工具**：可把重复、边界明确的工作交给智能体起草，但对不熟悉的领域仍要自行验证结果。

- 编程基础越扎实，越容易判断生成代码是否正确、是否符合项目约束。智能体能协助实现，却不能取代对数据结构、算法、系统设计和软件工程的理解。
