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

*好的代码库设计让机器学习实验能够演化为可维护的软件。本篇讨论项目结构、整洁代码、ML 设计模式、配置、可观测性、API、打包，以及与 AI 编程代理协作的审查纪律。*



*好代码库设计是将研究原型从生产软件中分离出来的. 该文件涵盖项目结构、清洁代码原则、与ML有关的设计模式、配置管理、伐木、API设计和包装*

- 大部分ML代码开始作为Jupyter笔记本. 笔记本会长出,被复制,被修改,共享,最终成为无法保存的全球变量,死细胞和魔法数的缠绕. ** 代码基础设计** 是组织代码的学科,以便随着项目的发展而保持其可理解性和可修改性。

- 这不是为了遵守规则。是要缩短"我想改变X"到"X被改变和工作"之间的时间. 在设计良好的密码库里,时间是分钟。在一个设计不好的年代里,这是通过无证的意大利面进行考古研究的日子.

## 项目结构



- 一致的工程布局让任何人(包括未来你)立即通航代码库.

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

- **`src/`布局**: 将源代码置于下`src/my_project/`防止从当前目录中意外地导入(该目录掩盖了在生产过程中会出现的进口错误)。安装方式`pip install -e .`促进发展。

- ** Monorepo vs multiple-repo**: a **monorepo** 将所有相关项目保存在一个存储库中(较容易跨项目更改,共享 CI). 一个**多重力**给每个项目自己的存储器(更清洁的边界,独立的版本). 多数ML球队从单列起步,必要时再分出.

- ** 脚本对库**:保留出入口(`train.py`, `evaluate.py`(单位:千美元)`scripts/`。。。保留可重复使用的逻辑`src/`。。。一个训练脚本应该是~50行:解析配置,构建数据集,构建模型,构建教练员,培训. 所有的复杂性都住在图书馆里

## 整洁代码原则



- **"南明"**:你所能做的最有影响力的一件事. 名为变量`x`需要您读取周围的代码才能理解它. 名为变量`learning_rate`是自文件化的。

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

- ** 单一责任原则**:每个职能/类别都做一件事。一个名为`load_data_and_train_model`正在做两件事,应该分开。这使得每块可以独立检验,可再用,可以理解.

- ** DRY(不要重复自己)**，，但不能过早地进行. 如果复制-粘贴代码三次,请将其取入函数. 但不要为您只用过一次的代码创建抽象化。早生抽象比重复更糟糕:它增加了复杂性而未证明好处.

```python
# Premature abstraction (one use case, over-engineered)
class AbstractDataTransformPipelineFactory:
    ...

# Just right (direct, clear, used in three places)
def normalise_image(image, mean, std):
    return (image - mean) / std
```

- ** Magic 数字**:永远不要使用无法解释的字面值。

```python
# BAD
if len(batch) > 32:
    split_batch(batch, 32)

# GOOD
MAX_BATCH_SIZE = 32
if len(batch) > MAX_BATCH_SIZE:
    split_batch(batch, MAX_BATCH_SIZE)
```

- **功能应该很短**:如果一个函数不适合一个屏幕(~30行),它可能做得太多. 将逻辑块提取到带有描述性名称的辅助函数中。职能机构然后读作高层次摘要。

## ML 设计模式



- 设计模式是对常见问题的可再用解决方案. 这些是与ML代码库最相关的:

- ** 事实图案**:创建对象而未指定确切的类. 当你的配置说有用`model: "transformer"`需要立即对准班级:

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

- 这使培训脚本与具体的示范实施脱钩。增加一款新模型意味着在登记册上添加一行,而不是修改培训循环.

- **战略模式**:运行时的交换算法。用于损失、选择器、排程器:

```python
LOSS_FUNCTIONS = {
    "mse": nn.MSELoss,
    "cross_entropy": nn.CrossEntropyLoss,
    "focal": FocalLoss,
}

loss_fn = LOSS_FUNCTIONS[config["loss"]]()
```

- ** 观察员模式**(召回/呼声):让模块对事件作出反应,而不进行紧密的组合。培训框架(PyTorch Lightning,Keras)广泛使用回调:

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

- ** 依赖性注射**:将依赖性传入函数/类,而不是在内部创建。这使得测试(插入一个模拟)和配置具有灵活性:

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



- 硬编码高参数,文件路径,和模型设置使得实验无法复制并修改痛苦. ** 外部配置** 输入文件。

- ** YAML ** 是 ML 配置的最常用格式 :

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

- **Hydra**(Facebook)是一个支持组成(以实验特定覆盖的集合基配置),命令行覆盖(英语:commission-line overs (facebook))的配置框架.`python train.py training.lr=1e-3`和多行的,

- **argparse** 对于有以下几个参数的脚本来说更为简单:

```python
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--lr", type=float, default=3e-4)
parser.add_argument("--batch-size", type=int, default=64)
parser.add_argument("--config", type=str, default="configs/base.yaml")
args = parser.parse_args()
```

- ** 最佳实践**:所有默认都有一个基础配置,每个实验配置只覆盖更改的内容. 追踪每个实验的配置 与它的结果。

## 日志与可观测性



- `print`语句用于调试。** 记录**用于生产:

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

- **为什么不打印**:在不更改日志调用时,记录支持级别(过滤出生产中的调试消息),格式化(时间戳,模块名称),以及处理器(写入文件,发送到监控系统).

- ** 固定记录** 输出机器可分解格式(JSON)和人可读信息。这使得可以搜索和提醒特定字段:

```python
logger.info("training_step", extra={
    "epoch": 5, "step": 1200, "loss": 0.0342, "lr": 2.1e-4
})
```

## API 设计



- 如果您的模型会被其他服务(网络应用,移动应用,另一个ML管道)所使用,它需要**API**(应用程序编程接口).

- **REST API** 使用HTTP方法:`GET`读取,`POST`创建/预测,`PUT`更新,`DELETE`要删除。端点遵循基于资源命名 :

```
POST /api/v1/predict          # send input, get prediction
GET  /api/v1/models           # list available models
GET  /api/v1/models/{id}      # get model details
POST /api/v1/models/{id}/predict  # predict with a specific model
```

- ** FastAPI** 是用于ML服务的去Python框架:

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

- FastAPI 自动生成 API 文档(Swagger UI at)`/docs`),用 Pydantic 模型验证输入/输出,并支持对高吞吐量的ASync.

- **gRPC**在内部服务与服务通信方面比REST快. 它使用协议缓冲(二进制序列化,比JSON更小更快)并支持流线. 由TensorFlow Service,Triton Inference Server所使用,以及许多微服务架构.

## 打包与分发



- 使您的代码可以安装为软件包, 让其他人(以及您的脚本) 完整导入 :

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

```bash
pip install -e ".[dev]"    # install in editable mode with dev dependencies
```

- ** Ediable 安装** (`-e`:对您的源代码的修改立即被反射而无需重新计时. 开发期间至关重要。

- ** 依赖性**:`requirements.txt`带有准确版本(E)`torch==2.2.1`没有`torch>=2.0`确保可复制。使用`pip freeze > requirements.txt`以获取当前环境。更复杂的依赖管理,使用`uv`, `poetry`,或`pip-tools`.

## 与 AI 编程代理协作



- AI编码代理(Claude Code, GitHub 副驾驶, Cursor等) . 现已成为专业工程工作流程的一部分。使用良好,它们大大地加速了发展。用来不好,它们引入了微妙的bug,侵蚀了您对自身代码库的理解,并产生了一种虚假的生产力感.

- 正确的心理模型:**一个代理是一个快而缺乏经验的对子程序员**. 它能快速地写出代码,知道语法和标准模式,并且阅读的文档比以往要多. 但它不理解你的具体系统,你的商业限制,你的边缘案例, 或你设计决定背后的原因。你是高级工程师 代理是初级工程师 你指挥、审查、负责

### 代理擅长什么



- ** Boilerplate和脚手架**:生成多克文件,CI配置,测试固定装置,数据类定义,argparse设置. 这些都遵循了众所周知的模式,并且很乏味地用手写作. 让代理生成,然后审查是否正确.

- ** 写作测试**:描述函数的行为,剂生成测试案例. 它常常抓住您会错过的边缘大小写(空输入, 负值, Unicode)。总是读到生成的测试，，它们验证你的假设,而不仅仅是你的代码.

- ** 重构**:"将此块摘录为函数","将本类转换为使用数据类","为本模块添加类型提示". 在意图明确,而微妙出错的风险也较低的地方进行机械转换.

- **"探索与原型"**:"写出一个快速的脚本来作为推断后期的基准"或"教我如何使用"HuggingFace sorderiser API". 特工给你一个工作起点 比阅读文档快

- **文档和docstrings**:代理可以从您的代码结构生成文档. 精度审查,但咕噜声的工作是自动化的.

- ** 调试协助**:贴出误差追踪并请求诊断。代理人经常可以识别出根源并提出一个定律,特别是对于常见的问题(形状不匹配,导入错误,CUDA出自内存).

### 何时不要依赖代理



- **小说架构决定**:如果你正在设计一个新的培训管道,经纪人会给你一个通用的答案. 它不知道你的数据限制, 延迟要求,或团队的专门知识。使用代理来实施您已经思考过的设计。

- ** 安全关键代码**:认证、加密、输入消毒。毒剂可能生成看起来正确但有微妙弱点的代码(SQL注射,不安全的默认,时间攻击). 安全代码应该由理解威胁模型的人来写,并由其他人审查.

- **Performance-critics 内环**:代理将写出正确而天真代码. 对于GPU内核,内存关键数据结构,或对耐久性敏感的服务路径,你需要理解硬件的限制(第13章第16章)并刻意优化.

- ** 代码你不明白**:如果代理生成200行,而你无法解释每行做什么,就不要承诺. 您正在维护您不明白的代码, 当它崩溃时, 您无法调试它。这是最常见和最危险的故障模式.

### 审查纪律



- ** 承诺前始终读取生成代码的每行**。这不是可选的。代理代码是草稿,不是成品. 把它当做同事的拉拉要求一样对待:批判性地审查.

- ** 检查什么**:
    - ** 校正**:它真的照你说的做吗? 特工们常常会解决一个 和你想像的完全不同的问题
    - ** Edge case**:它处理空输入,无值,负数,非常大输入吗? 特工们经常忽略边缘案件处理
    - ** Hallucized APIs**:代理人可以调用不存在的函数或使用参数,特别是对于较新或较不常见的库. 验证每个API的通话都是真实的.
    - ** 超工程**:代理往往产生多于必要的代码. 一个50行的10行问题的解决方案增加了复杂性,没有好处. 简化无情.
    - ** 安全**:硬码机密,用户输入未密闭,缺省无保障. 特工们不以为然
    - ** 样式一致性**:生成的代码是否与您的项目的常规相匹配(命名,模式,错误处理)?

### 如何编写高质量提示



- 代理输出的质量与您的指示质量直接成正比. 模糊提示得到模糊的代码。

- ** Bad**:"写出一个数据加载器"
- ** Good** :"为 CSV 文件写一个PyTorch DataLoader,并有栏"text"和"label". 使用 HuggingFace 代号“ bert- base- uncased” 的文本进行调试, 其文本最大长度=512。返回输入_ids,注意_mask,并标签为开关. 通过跳过这些行处理CSV在标签栏中缺失值的情况".

- ** 提供上下文**:向代理人介绍您的项目结构、现有的守则、限制和公约。上下文越多,产出就越好.

- ** 具体说明限制**:“只使用标准库”、“必须用 Python 3.10 工作”、“不要使用全局变量”、“遵循现有的模式 ”`src/models/transformer.py`."

- ** 要求解释**:"执行X并解释关键设计决定". 这迫使特工阐明其推理,让你更容易发现有缺陷的假设.

### 用质量门禁捕获代理错误



- 您现有的质量基础设施(文件 04) 捕获代理错误 以及人为错误 :

    - ** 类型检查(mypy)**:捕捉出幻觉的API签名和类型不匹配.
    - ** 涂料(ruff)**:捕获未用进口品、未定义变量和样式违规。
    - ** 测试(pytest)**:如果代理的代码通过您的测试套房,则更可能正确. 如果没有测试,请在 * 要求代理执行该特性之前写出 * (测试驱动的开发工作对代理特别有效).
    - ** CI管道**:在每次犯罪时自动执行上述所有措施。

- "代理写作码"+"质量门验证"的组合比单独写作更有成效. 特工动作快但草率;大门很通畅,但不写代码. 一起获得速度和正确性.

### 生产力陷阱



- 编码剂的最大风险是**生产力的幻觉**. 在10分钟内可以生成500行代码. 但是如果你花了2小时去调试这500行 因为你不了解, 你比自己在30分钟内写200行要慢。

- 与代理人合作的真正生产力来自:
    1. **保持控制**:由你决定架构,代理填写执行.
    2. **了解生成的内容**:如果无法解释,则重写或要求代理简化.
    3. ** 投资质量门**:测试、类型和将成本摊销在每种代理互动中。
    4. ** 利用代理来弥补你的弱点**:如果你对算法很在行,但写作测试却很慢,就让代理写作测试. 如果您在UI代码上速度快, 但对数据库查询不熟悉, 请代理起草 SQL。发挥你的优势, 代表你的空白。

- 最能从编码器中获取的工程师 已经知道如何编码 代理将您现有的技能放大; 它不会替换它。了解数据结构,算法,系统设计,和软件工程(这整个章节)是让你有效引导代理并严格评价其输出的方法.
