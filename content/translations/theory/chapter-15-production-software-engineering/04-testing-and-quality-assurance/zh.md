---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 15 - production software engineering/04. testing and quality assurance.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 75cfe1f8703e3112959a0c6f1c941c3b0a28020f42344d8b83d66e0079a5fa8c
status: reviewed
---
# 测试与质量保障

*测试能帮助我们检查代码在当前以及后续修改后是否仍符合预期。本篇介绍测试金字塔、pytest 单元测试、模拟、机器学习代码测试、CI/CD、代码检查、格式化和代码审查。*

- 机器学习代码容易缺少测试。“能训练起来就算能用”可能掩盖不报错的缺陷，例如数据加载器打乱顺序不符合预期、损失函数符号写反，或预处理时丢失 5% 的数据。程序仍会运行，但模型效果可能变差，排查指标异常也会耗费时间。

- 测试需要投入时间，但能帮助团队更快地发现回归问题，减少改动后反复排查的成本。

## 测试金字塔

- 测试可以按范围和运行成本分层，从范围窄、速度快到范围广、速度慢：

    - **单元测试**（底层）：单独测试函数或类。通常运行快，可写较多。例如，`normalise_image` 是否把值缩放到 $[0,1]$？
    - **集成测试**（中间层）：检查多个组件能否协同工作。例如，数据加载器生成的批次格式是否符合模型输入要求？
    - **端到端测试**（顶层）：从输入到输出检查完整流程。例如，`python train.py --config test.yaml` 能否无报错完成并产生有效检查点？

- 常见做法是单元测试较多、集成测试较少、端到端测试只覆盖关键流程。这是成本与覆盖面的经验取舍，不是所有项目都必须遵循的固定比例。端到端测试能发现集成问题，但运行较慢，也更容易受环境影响。

## 使用 pytest 编写单元测试

- **pytest** 是常用的 Python 测试框架。按默认发现规则，测试文件名通常以 `test_` 开头，测试函数名也通常以 `test_` 开头。

```python
# tests/test_utils.py

def test_normalise_image():
    import numpy as np
    image = np.array([0, 128, 255], dtype=np.uint8)
    result = normalise_image(image, mean=128, std=128)
    assert result.min() >= -1.0
    assert result.max() <= 1.0
    assert abs(result[1]) < 1e-6  # 128 normalised by mean=128 should be ~0

def test_normalise_empty():
    import numpy as np
    image = np.array([], dtype=np.uint8)
    result = normalise_image(image, mean=128, std=128)
    assert len(result) == 0
```

```bash
pytest tests/                     # run all tests
pytest tests/test_utils.py        # run one file
pytest -v                         # verbose output
pytest -x                         # stop on first failure
pytest -k "normalise"             # run tests matching name pattern
pytest --tb=short                 # shorter tracebacks
```

### 测试夹具

- **测试夹具（fixture）**为多个测试提供可复用的准备工作，避免在每个测试中重复编写相同的设置代码：

```python
import pytest

@pytest.fixture
def sample_dataset():
    """Create a small dataset for testing."""
    return {
        "inputs": torch.randn(10, 3, 32, 32),
        "labels": torch.randint(0, 10, (10,))
    }

@pytest.fixture
def trained_model():
    """Load a small pretrained model."""
    model = SmallModel()
    model.load_state_dict(torch.load("tests/fixtures/small_model.pt"))
    return model

def test_model_output_shape(trained_model, sample_dataset):
    output = trained_model(sample_dataset["inputs"])
    assert output.shape == (10, 10)  # batch_size x num_classes
```

- Fixture 可以设置作用域：`scope="function"`（默认值，每个测试单独创建）、`scope="module"`（每个测试模块创建一次）或 `scope="session"`（每次 pytest 会话创建一次）。若加载模型等准备工作成本高，可以考虑会话级作用域；同时要留意测试之间共享状态的影响。

### 参数化测试

- 若同一函数需要对多组输入验证，可以参数化测试，避免重复编写测试函数：

```python
@pytest.mark.parametrize("input,expected", [
    ([1, 2, 3], 6),
    ([], 0),
    ([-1, 1], 0),
    ([1000000, 1000000], 2000000),
])
def test_sum(input, expected):
    assert sum(input) == expected
```

## 模拟与打补丁

- **模拟（mocking）**是在测试中用替代对象取代真实依赖。这样可以隔离被测函数，不必实际连接数据库、调用 API 或启动 GPU 运算。

```python
from unittest.mock import patch, MagicMock

def test_training_logs_metrics():
    mock_logger = MagicMock()

    with patch("my_project.training.trainer.wandb") as mock_wandb:
        trainer = Trainer(logger=mock_logger)
        trainer.train_one_epoch()

        # verify that the trainer logged metrics
        mock_logger.log.assert_called()
        # verify it logged a loss value
        call_args = mock_logger.log.call_args
        assert "loss" in call_args[1]
```

- **适合模拟的对象**：外部服务（API、数据库、云存储）、成本较高的操作（GPU 计算、大文件 I/O）和非确定性依赖（随机数生成器、时间戳）。

- **不宜过度模拟自己的代码**：若把每个内部组件都替换成 mock，测试可能只验证模拟对象的行为，而没有验证真实组件之间能否协作。通常在系统边界模拟外部依赖，直接测试自己的业务逻辑。打补丁时应针对被测代码实际查找依赖名称的位置。

## 测试机器学习代码

- 机器学习代码的测试有一些特殊挑战：输出可能具有随机性，训练耗时较长，“正确”结果也未必是单个固定值。

### 固定随机种子

- 设置相关随机种子有助于让测试可复现：

```python
import random
import numpy as np
import torch

def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
```

- 固定种子不保证所有硬件、库版本和运算都完全确定；某些 CUDA 算子仍可能具有非确定性。对重要测试，应根据环境配置检查确定性要求。

### 数值容差

- 浮点数计算存在舍入误差，因此比较结果时应使用容差（见第 13 章 IEEE 754）：

```python
# BAD: exact comparison fails due to floating point
assert model_output == 0.5

# GOOD: approximate comparison
import numpy as np
assert np.isclose(model_output, 0.5, atol=1e-5)

# For tensors
assert torch.allclose(output, expected, atol=1e-4)
```

### 机器学习代码可以测试什么

- **形状测试**：检查输出维度是否符合预期。

```python
def test_model_output_shape():
    model = MyModel(d_model=256, n_classes=10)
    x = torch.randn(8, 32, 256)  # batch=8, seq=32, dim=256
    output = model(x)
    assert output.shape == (8, 10)
```

- **梯度流**：检查需要训练的参数是否获得梯度，并确认关键参数的梯度不是全零。模型分支、冻结参数或特殊层可能本来就没有梯度，因此应根据预期参与训练的参数选择断言。

```python
def test_gradients_flow():
    model = MyModel()
    x = torch.randn(4, 3, 32, 32)
    y = torch.randint(0, 10, (4,))

    output = model(x)
    loss = F.cross_entropy(output, y)
    loss.backward()

    for name, param in model.named_parameters():
        assert param.grad is not None, f"No gradient for {name}"
        assert param.grad.abs().sum() > 0, f"Zero gradient for {name}"
```

- **单批次过拟合**：尝试让模型记住一个小批次。若模型无法拟合，可能存在数据、梯度或优化流程问题。这只是诊断性测试；能否达到指定损失，取决于模型容量、数据和训练设置。

```python
def test_overfit_one_batch():
    model = MyModel()
    optimiser = torch.optim.Adam(model.parameters(), lr=1e-3)
    x, y = get_single_batch()

    for _ in range(100):
        loss = F.cross_entropy(model(x), y)
        loss.backward()
        optimiser.step()
        optimiser.zero_grad()

    assert loss.item() < 0.01, f"Cannot overfit one batch: loss={loss.item()}"
```

- **数据校验**：检查数据集能否读取、样本形状是否正确，以及标签和数值是否处于有效范围。

```python
def test_dataset_basics():
    dataset = MyDataset("tests/fixtures/small_data.csv")
    assert len(dataset) > 0
    x, y = dataset[0]
    assert x.shape == (3, 224, 224)
    assert 0 <= y < 10
    assert not torch.isnan(x).any()
    assert not torch.isinf(x).any()
```

- **确定性**：在相同输入、随机种子和确定性环境下，重复计算应得到一致结果。使用 dropout 等随机层时，测试还需固定评估模式或明确预期行为。

```python
def test_determinism():
    set_seed(42)
    output1 = model(input_data)
    set_seed(42)
    output2 = model(input_data)
    assert torch.allclose(output1, output2)
```

## CI/CD 流水线

- **持续集成（CI）**会在每次提交或合并请求时自动运行检查。若要在检查失败时阻止合并，还需在代码托管平台配置相应的分支保护规则。

- 以下是 GitHub Actions 工作流示例（`.github/workflows/ci.yml`）：

```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -e ".[dev]"
      - run: ruff check src/
      - run: mypy src/
      - run: pytest tests/ -v --tb=short
```

- **提交前钩子（pre-commit hooks）**可在本地提交前自动运行检查，让部分问题在进入 CI 前就被发现：

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.3.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
```

```bash
pip install pre-commit
pre-commit install    # now hooks run on every git commit
```

## 代码检查与格式化

- **代码检查（linting）**用于发现潜在错误和风格问题；**格式化**工具则统一代码排版。

- **Ruff** 是快速的 Python 代码检查与格式化工具。配置合适时，它可以承担 flake8、isort 和 Black 的一部分工作：

```bash
ruff check src/          # lint
ruff check --fix src/    # lint and auto-fix
ruff format src/         # format
```

- **mypy** 是 Python 静态类型检查器，可在运行前发现部分类型不匹配；它只能检查类型信息和依赖存根覆盖到的部分，不能保证程序运行正确。

```bash
mypy src/
# src/model.py:42: error: Argument 1 to "forward" has incompatible type "int"; expected "Tensor"
```

- 类型提示可帮助读者理解函数接口，也能让静态检查器发现部分错误：

```python
def train(
    model: nn.Module,
    dataloader: DataLoader,
    optimiser: torch.optim.Optimizer,
    num_epochs: int = 10,
) -> float:
    """Train model and return final loss."""
    ...
```

## 代码审查建议

- **作者应做的事**：
    - 发起审查前先检查自己的差异，及时发现明显问题。
    - 让合并请求保持小而聚焦，每个请求尽量围绕一个主题。
    - 说明改动内容、原因和验证方法。
    - 逐项回应审查意见。

- **审查者应做的事**：
    - 尊重作者，针对代码提出意见，而不是评价个人。例如说“这里可以写得更清楚”，而不是“你写得令人困惑”。
    - 区分必须修复的问题（如缺陷、安全问题）和改进建议（如风格、命名），并明确标注。
    - 用问题帮助作者检查假设，例如“如果列表为空会怎样？”。
    - 及时完成审查。合并请求长期无人处理会阻塞作者，也可能促使团队积累更多、更难审查的大批改动。
