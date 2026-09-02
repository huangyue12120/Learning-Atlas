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

# 测试与质量保证

*测试让你知道代码现在能正常工作，也让你知道每次改动之后它仍然正常。本篇涵盖测试金字塔、使用 pytest 的单元测试、模拟、机器学习代码测试、CI/CD 流水线、代码检查、格式化和代码审查——这些实践能在 bug 进入生产环境前发现它们。*

- 机器学习代码常常严重缺乏测试。“它能训练，所以它没问题”是普遍存在的态度。这会导致静默 bug：数据加载器错误地打乱数据，损失函数符号写反，预处理步骤丢掉 5% 的数据。这些 bug 不会让程序崩溃，只会让模型悄悄变差，而你会浪费数周时间去调试那些“应该更高”的指标。

- 测试不是额外负担。它是在不破坏已有功能的前提下快速推进的最快方式。

## 测试金字塔

- 测试按层组织，从快速且范围窄，到缓慢且范围广：

    - **单元测试**（底层）：隔离测试单个函数和类。速度快（毫秒级），数量多（数百到数千个）。“`normalise_image` 是否产生 [0, 1] 范围内的值？”

    - **集成测试**（中层）：测试组件是否能协同工作。速度较慢（秒级）。“数据加载器是否产生模型所期望格式的批次？”

    - **端到端测试**（顶层）：测试从输入到输出的完整流水线。速度慢（分钟级）。“`python train.py --config test.yaml` 是否能无错误完成，并产生有效的 checkpoint？”

- 金字塔形状意味着：编写大量单元测试、较少的集成测试，以及少量端到端测试。单元测试能捕获大多数 bug，并在几秒内运行完；端到端测试能发现集成问题，但速度慢且脆弱。

## 使用 pytest 的单元测试

- **pytest** 是标准的 Python 测试框架。测试函数的名称以 `test_` 开头，所在文件的名称也以 `test_` 开头：

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

### Fixtures（测试夹具）

- **Fixture** 为测试提供可复用的设置。不要在每个测试中重复设置代码，而是只定义一次：

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

- Fixture 可以有不同的**作用域**：`scope="function"`（默认，每个测试都新建）、`scope="module"`（每个文件一次）、`scope="session"`（每次测试运行一次）。对于加载模型这类昂贵的设置，可以使用 `scope="session"`。

### 参数化测试

- 用多个输入测试同一个函数，而不重复编写代码：

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

- **Mocking（模拟）**是在测试期间用假的依赖替换真实依赖。这样可以在不需要数据库、API 或 GPU 的情况下隔离测试一个函数。

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

- **什么时候使用模拟**：外部服务（API、数据库、云存储）、昂贵的操作（GPU 计算、大文件 I/O）和非确定性行为（随机数生成器、时间戳）。

- **什么时候不要使用模拟**：不要模拟你自己的代码。如果什么都模拟，测试验证的是模拟对象的行为，而不是你的代码是否正常。应该在边界处模拟，直接测试自己的逻辑。

## 测试机器学习代码

- 机器学习代码有独特的测试挑战：输出具有概率性，训练速度慢，而且“正确”并不总是容易定义。

### 确定性随机种子

- 在所有地方设置随机种子，让测试可以复现：

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

### 数值容差

- 浮点数比较需要使用容差（第 13 章，IEEE 754）：

```python
# BAD: exact comparison fails due to floating point
assert model_output == 0.5

# GOOD: approximate comparison
import numpy as np
assert np.isclose(model_output, 0.5, atol=1e-5)

# For tensors
assert torch.allclose(output, expected, atol=1e-4)
```

### 机器学习代码要测试什么

- **形状测试**：验证输出具有预期维度。

```python
def test_model_output_shape():
    model = MyModel(d_model=256, n_classes=10)
    x = torch.randn(8, 32, 256)  # batch=8, seq=32, dim=256
    output = model(x)
    assert output.shape == (8, 10)
```

- **梯度流**：验证可训练参数的梯度非零。

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

- **在一个批次上过拟合**：模型应该能够记住一个批次。如果做不到，说明存在根本性问题。

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

- **数据验证**：验证数据加载产生有效输出。

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

- **确定性**：相同输入 + 相同种子 → 相同输出。

```python
def test_determinism():
    set_seed(42)
    output1 = model(input_data)
    set_seed(42)
    output2 = model(input_data)
    assert torch.allclose(output1, output2)
```

## CI/CD 流水线

- **持续集成（CI）**：在每次提交或 PR 上自动运行测试。如果测试失败，PR 就不能合并。这可以阻止损坏的代码进入 `main`。

- **GitHub Actions** 示例（`.github/workflows/ci.yml`）：

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

- **Pre-commit hooks（提交前钩子）**：在每次提交前于本地运行检查，在问题进入 CI 之前发现它们：

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

- **代码检查**无需运行代码就能发现 bug 和风格问题。**格式化**则自动强制统一风格。

- **Ruff**：快速的 Python 代码检查器和格式化工具，用一个工具替代 flake8、isort 和 black：

```bash
ruff check src/          # lint
ruff check --fix src/    # lint and auto-fix
ruff format src/         # format
```

- **mypy**：Python 静态类型检查器，在运行前捕获类型错误：

```bash
mypy src/
# src/model.py:42: error: Argument 1 to "forward" has incompatible type "int"; expected "Tensor"
```

- 类型提示让代码能够自我说明，也能捕获 bug：

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

## 代码审查最佳实践

- **对于作者**：
    - 在请求审查前自行检查 diff。你会发现明显的问题。
    - 让 PR 保持小而聚焦。一个 PR 只处理一个关注点。
    - 写清楚说明：改了什么、为什么改、如何测试。
    - 回复每一条评论（即使只回复“已完成”）。

- **对于审查者**：
    - 保持友善。批评代码，不要针对个人。“这里可以更清楚”比“这很令人困惑”更好。
    - 区分阻断问题（bug、安全问题）和建议（风格、命名）。使用标签：“nit:”“suggestion:”“blocking:”。
    - 通过提问而非命令来沟通。“如果这个列表为空会怎样？”比“处理空情况”更有帮助。
    - 及时批准。等待数日的 PR 会阻塞作者，也会促使大家积累大批量改动，而大 PR 更难审查。
