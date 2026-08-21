---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/03-deep-learning-core/12-intro-to-jax/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 9fe3133043ee5c5841555859f2e60f3cd11c6ee194ae7dd4ff6788a97d307a50
status: reviewed
---

# JAX 入门

> PyTorch 会修改 tensor，TensorFlow 构建图，JAX 编译纯函数；最后一点会改变你思考深度学习的方式。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 03 第 01–10 课、基础 NumPy  
**预计时间：** 约 90 分钟

## 学习目标

- 使用 JAX 的函数式 API（jax.numpy、jax.grad、jax.jit、jax.vmap）编写纯函数神经网络代码。
- 解释 PyTorch 的即时可变模型与 JAX 的函数式编译模型之间的关键设计差异。
- 使用 jit 编译和 vmap 向量化，比朴素 Python 加速训练循环。
- 在 JAX 中训练简单网络，并将显式状态管理与 PyTorch 的面向对象方式对比。

## 问题

你会用 PyTorch 构建网络：定义 `nn.Module`、调用 `.backward()`、让优化器更新，数百万人都在这样做。

但 PyTorch 的 DNA 中有一项限制：它在 Python 中逐项即时跟踪运算。每一次 `tensor + tensor` 都是一次独立 kernel 启动，每一个训练步骤都重新解释相同 Python 代码。小规模没问题；当要在 2,048 个 TPU 上训练 5400 亿参数模型时，开销就会压垮训练。

Google DeepMind 用 JAX 训练 Gemini，Anthropic 用 JAX 训练 Claude。这些是地球上规模最大的神经网络训练运行；它们选择 JAX，是因为 JAX 把训练循环视为可编译程序，而不是 Python 调用序列。

JAX 是拥有三项超能力的 NumPy：自动微分、编译到 XLA 的 JIT 和自动向量化。你写一个处理单个样本的函数，JAX 可得到处理批次、计算梯度、编译为机器码并跨设备运行的函数，且无需改变原函数。

## 概念

### JAX 理念

JAX 是函数式框架：没有类、没有可变状态、没有 `.backward()`；取而代之的是：

| PyTorch | JAX |
|---------|-----|
| 带状态的 `nn.Module` 类 | 纯函数：`f(params, x) -> y` |
| `loss.backward()` | `jax.grad(loss_fn)(params, x, y)` |
| 即时执行 | 经 XLA 的 JIT 编译 |
| `for x in batch:` 手动循环 | `jax.vmap(f)` 自动向量化 |
| `DataParallel` / `FSDP` | `jax.pmap(f)` 自动并行 |
| 可变的 `model.parameters()` | 不可变的数组 pytree |

这是编译器约束。JIT 需要纯函数，即相同输入始终产生相同输出且没有副作用；该限制让编译器有机会实现 100 倍加速。

### jax.numpy：熟悉的表面

JAX 在加速器上重实现 NumPy API：

```python
import jax.numpy as jnp

a = jnp.array([1.0, 2.0, 3.0])
b = jnp.array([4.0, 5.0, 6.0])
c = jnp.dot(a, b)
```

函数名、广播规则和切片语义相同，但数组位于 GPU/TPU 上，每项操作都可被编译器跟踪。

一个关键区别是 JAX 数组不可变：不能 `a[0] = 5`，而应写 `a = a.at[0].set(5)`。开始一周会觉得别扭，随后就会明白：不可变性使 `grad`、`jit`、`vmap` 等变换可以组合。

### jax.grad：函数式自动微分 <!-- learning-atlas: jaxgrad-functional-autodiff -->

PyTorch 将梯度附于 tensor（`.grad`），JAX 将梯度附于函数。

```python
import jax

def f(x):
    return x ** 2

df = jax.grad(f)
df(3.0)
```

`jax.grad` 接收函数，返回计算梯度的新函数；不需要 `.backward()`，也不把计算图存到 tensor 上。梯度只是另一个可调用、可组合、可 JIT 编译的函数。

这种组合可以任意进行：

```python
d2f = jax.grad(jax.grad(f))
d2f(3.0)
```

二阶导、三阶导、Jacobian、Hessian 都只是组合 `grad`。PyTorch 也能做到（`torch.autograd.functional.hessian`），但它是附加功能；在 JAX 中它是基础。

约束是 `grad` 只用于纯函数：函数内部不能 print（它会在跟踪时而非执行时运行）、不能修改外部状态、不能不显式管理 key 就生成随机数。

### jit：编译到 XLA

```python
@jax.jit
def train_step(params, x, y):
    loss = loss_fn(params, x, y)
    return loss

fast_step = jax.jit(train_step)
```

首次调用时 JAX 跟踪函数：记录发生哪些操作而不执行；随后将跟踪交给 XLA（Accelerated Linear Algebra），即 Google 的 TPU/GPU 编译器。XLA 融合操作、消除冗余内存复制、生成优化机器码。

后续调用完全跳过 Python，编译代码以接近 C++ 的速度在加速器运行。

JIT 有帮助的场景：

- 训练步骤（相同计算重复数千次）。
- 推理（相同模型、不同输入）。
- 任何以相近形状输入调用超过一次的函数。

JIT 有害的场景：

- 控制流依赖数值的函数（如 `if x > 0`，其中 x 是被跟踪数组）。
- 一次性计算（编译开销超过运行时间）。
- 调试（跟踪隐藏实际执行）。

编译会限制控制流：用 `jax.lax.cond` 替代 if/else，用 `jax.lax.scan` 替代 for 循环。

### vmap：自动向量化

先写处理一个样本的函数：

```python
def predict(params, x):
    return jnp.dot(params['w'], x) + params['b']
```

`vmap` 将它提升为处理批次：

```python
batch_predict = jax.vmap(predict, in_axes=(None, 0))
```

`in_axes=(None, 0)` 表示不沿 `params` 分批（它是共享的），而沿 `x` 的第 0 轴分批。无需手写循环、重塑或传递 batch 维度，JAX 会确定并向量化整个计算。

这不是语法糖。`vmap` 生成融合向量化代码，比 Python 循环快 10–100 倍；而且可以和 `jit`、`grad` 组合：

```python
per_example_grads = jax.vmap(jax.grad(loss_fn), in_axes=(None, 0, 0))
```

这是一行得到逐样本梯度；不使用技巧的话，在 PyTorch 中几乎做不到。

### pmap：跨设备数据并行

```python
parallel_step = jax.pmap(train_step, axis_name='devices')
```

`pmap` 会在全部可用设备（GPU/TPU）复制函数并切分批次。函数内部用 `jax.lax.pmean` 和 `jax.lax.psum` 同步设备间梯度。

Google 用 `pmap`（以及继任者 `shard_map`）在数千个 TPU v5e 上训练 Gemini。编程模式就是：写单设备版本，用 `pmap` 包裹即可。

### Pytrees：通用数据结构

JAX 处理“pytree”——列表、元组、字典和数组的嵌套组合。模型参数是一个 pytree：

```python
params = {
    'layer1': {'w': jnp.zeros((784, 256)), 'b': jnp.zeros(256)},
    'layer2': {'w': jnp.zeros((256, 128)), 'b': jnp.zeros(128)},
    'layer3': {'w': jnp.zeros((128, 10)),  'b': jnp.zeros(10)},
}
```

每种 JAX 变换——`grad`、`jit`、`vmap`——都知道怎样遍历 pytree。`jax.tree.map(f, tree)` 把 f 应用于每片叶子；优化器便这样一次更新全部参数：

```python
params = jax.tree.map(lambda p, g: p - lr * g, params, grads)
```

不需要 `.parameters()`，也没有参数注册；树结构就是模型。

### 函数式与面向对象

PyTorch 将状态存于对象：

```python
class Model(nn.Module):
    def __init__(self):
        self.linear = nn.Linear(784, 10)

    def forward(self, x):
        return self.linear(x)
```

JAX 用带显式状态的纯函数：

```python
def predict(params, x):
    return jnp.dot(x, params['w']) + params['b']
```

params 被传入，什么都不存储、什么都不修改。因此每个函数可测试、可组合、可编译；代价是自行管理 params，或使用 Flax、Equinox 等库。

### JAX 生态

JAX 提供原语，库提供易用性：

| 库 | 角色 | 风格 |
|----|------|------|
| **Flax**（Google） | 神经网络层 | 带显式状态的 `nn.Module` |
| **Equinox**（Patrick Kidger） | 神经网络层 | 基于 Pytree、Pythonic |
| **Optax**（DeepMind） | 优化器 + LR 调度 | 可组合的梯度变换 |
| **Orbax**（Google） | 检查点 | 保存/恢复 pytree |
| **CLU**（Google） | 指标 + 日志 | 训练循环工具 |

Optax 是标准优化器库。它分离梯度变换（Adam、SGD、裁剪）与参数更新，因此易于组合：

```python
optimizer = optax.chain(
    optax.clip_by_global_norm(1.0),
    optax.adam(learning_rate=1e-3),
)
```

### 何时使用 JAX 而非 PyTorch

| 因素 | JAX | PyTorch |
|------|-----|---------|
| TPU 支持 | 一等支持（Google 构建两者） | 社区维护（torch_xla） |
| GPU 支持 | 好（经 XLA 的 CUDA） | 最佳（原生 CUDA） |
| 调试 | 难（跟踪 + 编译） | 易（即时、逐行） |
| 生态 | 研究导向（Flax、Equinox） | 庞大（HuggingFace、torchvision 等） |
| 招聘 | 小众（Google/DeepMind/Anthropic） | 主流（几乎所有地方） |
| 大规模训练 | 更优（XLA、pmap、mesh） | 好（FSDP、DeepSpeed） |
| 原型速度 | 较慢（函数式开销） | 较快（可变即可运行） |
| 生产推理 | TensorFlow Serving、Vertex AI | TorchServe、Triton、ONNX |
| 使用者 | DeepMind（Gemini）、Anthropic（Claude） | Meta（Llama）、OpenAI（GPT）、Stability AI |

诚实答案是：除非有明确理由，否则使用 PyTorch。理由包括可用 TPU、需要逐样本梯度、超大规模多设备训练，或在 Google/DeepMind/Anthropic 工作。

### JAX 中的随机数

JAX 没有全局随机状态，每次随机运算都要求显式 PRNG key：

```python
key = jax.random.PRNGKey(42)
key1, key2 = jax.random.split(key)
w = jax.random.normal(key1, shape=(784, 256))
```

起初令人烦恼，但它保证跨设备、跨编译的可复现性；PyTorch 的 `torch.manual_seed` 无法在多 GPU 设置中保证这种性质。

```figure
batchnorm-effect
```

## 构建实现

### 步骤 1：设置与数据

用 JAX 和 Optax 在 MNIST 上训练三层 MLP：784 个输入、256 和 128 神经元的两个隐藏层、10 个输出类别。

```python
import jax
import jax.numpy as jnp
from jax import random
import optax

def get_mnist_data():
    from sklearn.datasets import fetch_openml
    mnist = fetch_openml('mnist_784', version=1, as_frame=False, parser='auto')
    X = mnist.data.astype('float32') / 255.0
    y = mnist.target.astype('int')
    X_train, X_test = X[:60000], X[60000:]
    y_train, y_test = y[:60000], y[60000:]
    return X_train, y_train, X_test, y_test
```

### 步骤 2：初始化参数

没有类，只有返回 pytree 的函数：

```python
def init_params(key):
    k1, k2, k3 = random.split(key, 3)
    scale1 = jnp.sqrt(2.0 / 784)
    scale2 = jnp.sqrt(2.0 / 256)
    scale3 = jnp.sqrt(2.0 / 128)
    params = {
        'layer1': {
            'w': scale1 * random.normal(k1, (784, 256)),
            'b': jnp.zeros(256),
        },
        'layer2': {
            'w': scale2 * random.normal(k2, (256, 128)),
            'b': jnp.zeros(128),
        },
        'layer3': {
            'w': scale3 * random.normal(k3, (128, 10)),
            'b': jnp.zeros(10),
        },
    }
    return params
```

这完成了手动 He 初始化：从一个种子拆出三把 PRNG key，每个权重都是嵌套字典中的不可变数组。

### 步骤 3：前向传播

```python
def forward(params, x):
    x = jnp.dot(x, params['layer1']['w']) + params['layer1']['b']
    x = jax.nn.relu(x)
    x = jnp.dot(x, params['layer2']['w']) + params['layer2']['b']
    x = jax.nn.relu(x)
    x = jnp.dot(x, params['layer3']['w']) + params['layer3']['b']
    return x

def loss_fn(params, x, y):
    logits = forward(params, x)
    one_hot = jax.nn.one_hot(y, 10)
    return -jnp.mean(jnp.sum(jax.nn.log_softmax(logits) * one_hot, axis=-1))
```

全是纯函数：params 进、预测出；没有 `self`，没有存储状态。`loss_fn` 从零计算交叉熵：softmax、log、负均值。

### 步骤 4：JIT 编译的训练步骤

```python
@jax.jit
def train_step(params, opt_state, x, y):
    loss, grads = jax.value_and_grad(loss_fn)(params, x, y)
    updates, opt_state = optimizer.update(grads, opt_state, params)
    params = optax.apply_updates(params, updates)
    return params, opt_state, loss

@jax.jit
def accuracy(params, x, y):
    logits = forward(params, x)
    preds = jnp.argmax(logits, axis=-1)
    return jnp.mean(preds == y)
```

`jax.value_and_grad` 一次返回损失值和梯度；`@jax.jit` 把两个函数都编译到 XLA。第一次调用后，每个训练步骤都不再触及 Python。

### 步骤 5：训练循环

```python
optimizer = optax.adam(learning_rate=1e-3)

X_train, y_train, X_test, y_test = get_mnist_data()
X_train, X_test = jnp.array(X_train), jnp.array(X_test)
y_train, y_test = jnp.array(y_train), jnp.array(y_test)

key = random.PRNGKey(0)
params = init_params(key)
opt_state = optimizer.init(params)

batch_size = 128
n_epochs = 10

for epoch in range(n_epochs):
    key, subkey = random.split(key)
    perm = random.permutation(subkey, len(X_train))
    X_shuffled = X_train[perm]
    y_shuffled = y_train[perm]

    epoch_loss = 0.0
    n_batches = len(X_train) // batch_size
    for i in range(n_batches):
        start = i * batch_size
        xb = X_shuffled[start:start + batch_size]
        yb = y_shuffled[start:start + batch_size]
        params, opt_state, loss = train_step(params, opt_state, xb, yb)
        epoch_loss += loss

    train_acc = accuracy(params, X_train[:5000], y_train[:5000])
    test_acc = accuracy(params, X_test, y_test)
    print(f"Epoch {epoch + 1:2d} | Loss: {epoch_loss / n_batches:.4f} | "
          f"Train Acc: {train_acc:.4f} | Test Acc: {test_acc:.4f}")
```

10 个 epoch，测试准确率约 97%。第一个 epoch 因 JIT 编译较慢，第 2–10 个会很快。

留意不存在的内容：没有 `.zero_grad()`、`.backward()` 或 `.step()`。整个更新是一处组合函数调用；梯度计算、Adam 变换和参数应用都在 `train_step` 内部完成。

## 应用

### Flax：Google 标准

Flax 是最常见 JAX 神经网络库。它重新加入 `nn.Module`，但状态仍显式管理：

```python
import flax.linen as nn

class MLP(nn.Module):
    @nn.compact
    def __call__(self, x):
        x = nn.Dense(256)(x)
        x = nn.relu(x)
        x = nn.Dense(128)(x)
        x = nn.relu(x)
        x = nn.Dense(10)(x)
        return x

model = MLP()
params = model.init(jax.random.PRNGKey(0), jnp.ones((1, 784)))
logits = model.apply(params, x_batch)
```

结构和 PyTorch 相同，但 `params` 与模型分离。`model.init()` 创建 params，`model.apply(params, x)` 运行前向；模型对象本身无状态。

### Equinox：Pythonic 替代方案

Equinox（Patrick Kidger）将模型表示为 pytrees：

```python
import equinox as eqx

model = eqx.nn.MLP(
    in_size=784, out_size=10, width_size=256, depth=2,
    activation=jax.nn.relu, key=jax.random.PRNGKey(0)
)
logits = model(x)
```

模型自身就是 pytree，不需 `.apply()`；参数就是模型的叶子，更接近 JAX 的思维。

### Optax：可组合优化器

Optax 将梯度变换与更新解耦：

```python
schedule = optax.warmup_cosine_decay_schedule(
    init_value=0.0, peak_value=1e-3,
    warmup_steps=1000, decay_steps=50000
)

optimizer = optax.chain(
    optax.clip_by_global_norm(1.0),
    optax.adamw(learning_rate=schedule, weight_decay=0.01),
)
```

梯度裁剪、学习率预热和权重衰减都被组合为变换链。每项变换查看、修改梯度，再传给下一项；没有单体优化器类。

## 交付物

**安装：**

```bash
pip install jax jaxlib optax flax
```

GPU 支持：

```bash
pip install jax[cuda12]
```

TPU（Google Cloud）：

```bash
pip install jax[tpu] -f https://storage.googleapis.com/jax-releases/libtpu_releases.html
```

**性能注意事项：**

- 第一次 JIT 调用很慢（编译）；基准测试前先预热。
- 不要在 JIT 内部对 JAX 数组使用 Python 循环；用 `jax.lax.scan` 或 `jax.lax.fori_loop`。
- `jax.debug.print()` 可在 JIT 内工作，普通 `print()` 不行。
- 用 `jax.profiler` 或 TensorBoard 分析；XLA 编译可能隐藏瓶颈。
- JAX 默认预分配 75% GPU 内存；设置 `XLA_PYTHON_CLIENT_PREALLOCATE=false` 可禁用。

**检查点：**

```python
import orbax.checkpoint as ocp
checkpointer = ocp.PyTreeCheckpointer()
checkpointer.save('/tmp/model', params)
restored = checkpointer.restore('/tmp/model')
```

**本课产出：**

- `outputs/prompt-jax-optimizer.md`——选择正确 JAX 优化器配置的提示词。
- `outputs/skill-jax-patterns.md`——涵盖 JAX 函数式模式的技能。

## 练习

1. 为 MLP 加入 dropout。在 JAX 中 dropout 需要 PRNG key：让 key 穿过前向传播，并为每个 dropout 层拆分。比较带与不带 dropout 的测试准确率。
2. 用 `jax.vmap` 为 32 张 MNIST 图像的批次计算逐样本梯度，计算每个样本的梯度范数。哪些示例梯度最大，为什么？
3. 将手动前向函数替换为适用于任意层数的通用 `mlp_forward(params, x)`，用 `jax.tree.leaves` 自动确定深度。
4. 对比带与不带 `@jax.jit` 的训练步骤，各运行 100 步并计时。你的硬件上加速多少？首次调用的编译开销是多少？
5. 用 `optax.chain(optax.clip_by_global_norm(1.0), optax.adam(1e-3))` 实现梯度裁剪；带与不带裁剪训练，绘制梯度范数以观察效果。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| XLA | “让 JAX 快的东西” | Accelerated Linear Algebra：从计算图融合操作并生成优化 GPU/TPU kernel 的编译器 |
| JIT | “即时编译” | 首次调用时 JAX 跟踪函数、编译到 XLA，后续调用运行已编译版本 |
| 纯函数 | “没有副作用” | 输出只依赖输入的函数：无全局状态、无修改、无未显式提供 key 的随机性 |
| vmap | “自动批处理” | 将处理一个样本的函数变换为处理一个批次的函数，无需重写 |
| pmap | “自动并行” | 跨多个设备复制函数并切分输入批次 |
| Pytree | “嵌套数组字典” | JAX 可遍历和变换的列表、元组、字典、数组等任意嵌套结构 |
| 跟踪 | “记录计算” | JAX 以抽象值执行函数来构建计算图，不计算真实结果 |
| 函数式自动微分 | “函数的 grad” | 通过变换函数而非向 tensor 附加梯度存储来计算导数 |
| Optax | “JAX 的优化器库” | 可组合梯度变换库：Adam、SGD、裁剪、调度可串联 |
| Flax | “JAX 的 nn.Module” | Google 的 JAX 神经网络库，提供层抽象但保持状态显式 |

## 延伸阅读

- JAX 文档：https://jax.readthedocs.io/ ——官方文档，含 grad、jit、vmap 的优秀教程。
- Bradbury 等，《JAX: composable transformations of Python+NumPy programs》（2018）——解释设计理念的原始论文。
- Flax 文档：https://flax.readthedocs.io/ ——Google 的 JAX 神经网络库。
- Patrick Kidger，《Equinox: neural networks in JAX via callable PyTrees and filtered transformations》（2021）——Flax 的 Pythonic 替代方案。
- DeepMind，《Optax: composable gradient transformation and optimisation》——标准优化器库。
- Colin Raffel，《You Don't Know JAX》（2020）——来自 T5 作者的 JAX 陷阱与模式实用指南。
