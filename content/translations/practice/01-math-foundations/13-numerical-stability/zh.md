---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/01-math-foundations/13-numerical-stability/docs/en.md
  revision: 7157ca74a135fad2165f680ec4b4e592f075ec21
  sha256: 1f803ae9c3db1ab75678a37007833c86479ef7810778c396201e3c5d91e731c6
status: reviewed
---

# 数值稳定性

> 浮点数是一层会泄漏的抽象：训练中它会突然咬你一口，而你根本不会预见它的到来。

**类型：** 实作
**学习实现：** Python
**前置课程：** Phase 1 · 第 01–04 课
**预计学习：** 约 120 分钟

## 学习目标

- 使用减去最大值的技巧，实现数值稳定的 softmax 和 log-sum-exp
- 识别浮点计算中的溢出、下溢和灾难性抵消
- 使用中心有限差分，将解析梯度与数值梯度进行核对
- 解释为什么训练时更适合使用 bfloat16 而非 float16，以及损失缩放如何防止梯度下溢

## 问题

你的模型训练了三个小时，随后损失变成 NaN。你加了一条打印语句。第 9,000 步时 logits 还很正常；第 9,001 步时它们变成了 `inf`；到第 9,002 步，每个梯度都是 `nan`，训练彻底失败。

或者：模型顺利完成了训练，但准确率比论文报告的低 2%。你检查了所有内容：架构一致、超参数一致、数据也一致。问题在于论文使用 float32，而你使用 float16 时没有进行正确的缩放。32 位累积的舍入误差悄无声息地吞掉了你的准确率。

又或者：你从头实现了交叉熵损失。logits 较小时它运行正常，但 logits 超过 100 后就返回 `inf`。softmax 发生了溢出，因为 `exp(100)` 大于 float32 能表示的最大值。所有机器学习框架都会用一个两行代码的技巧处理这个问题，而你此前并不知道这个技巧存在。

数值稳定性并非纯理论问题。它决定了一次训练是成功，还是悄无声息地失败。你最终需要调试的每一个严重机器学习 bug，迟早都会归结到浮点数。

## 概念

### IEEE 754：计算机如何存储实数 <!-- learning-atlas: ieee-754-how-computers-store-real-numbers -->

计算机按照 IEEE 754 标准，将实数存储为浮点值。一个浮点数由三部分组成：符号位、指数和尾数（有效数）。

```
Float32 layout (32 bits total):
[1 sign] [8 exponent] [23 mantissa]

Value = (-1)^sign * 2^(exponent - 127) * 1.mantissa
```

尾数决定精度，也就是能保留多少位有效数字；指数决定范围，也就是能表示多大或多小的数。

```
Format     Bits   Exponent  Mantissa  Decimal digits  Range (approx)
float64    64     11        52        ~15-16          +/- 1.8e308
float32    32     8         23        ~7-8            +/- 3.4e38
float16    16     5         10        ~3-4            +/- 65,504
bfloat16   16     8         7         ~2-3            +/- 3.4e38
```

float32 大约提供 7 位十进制有效数字。这意味着它能区分 1.0000001 和 1.0000002，却无法区分 1.00000001 和 1.00000002。超过 7 位之后，一切都只是舍入噪声。

float16 大约只有 3 位有效数字，能表示的最大数是 65,504。对于机器学习而言，这个上限小得令人不安，因为 logits、梯度和激活值经常会超过它。

bfloat16 是 Google 为解决 float16 范围问题给出的方案。它和 float32 一样使用 8 位指数，因此范围相同，最高可达 3.4e38；但它只有 7 位尾数，精度比 float16 更低。训练神经网络时，范围通常比精度更重要，因此 bfloat16 往往更胜一筹。

### 为什么 0.1 + 0.2 != 0.3

数字 0.1 无法用二进制浮点数精确表示。在二进制中，它是一个无限循环小数：

```
0.1 in binary = 0.0001100110011001100110011... (repeating forever)
```

float32 会将其截断为 23 位尾数。存储的值约为 0.100000001490116。类似地，0.2 存储为约 0.200000002980232。两者之和是 0.300000004470348，而不是 0.3。

```
In Python:
>>> 0.1 + 0.2
0.30000000000000004

>>> 0.1 + 0.2 == 0.3
False
```

这对机器学习很重要，因为：

1. `if loss < threshold` 这类损失比较可能给出错误结果
2. 累加许多小值，例如数千步训练中的梯度更新，会逐渐偏离真实和
3. 如果用 `==` 比较浮点数，校验和与可复现性测试会失败

解决方法：绝不要用 `==` 比较浮点数。请使用 `abs(a - b) < epsilon` 或 `math.isclose()`。

### 灾难性抵消

两个几乎相等的浮点数相减时，有效数字会相互抵消，剩余的舍入噪声反而被提升为前导数字。

```
a = 1.0000001    (stored as 1.00000011920929 in float32)
b = 1.0000000    (stored as 1.00000000000000 in float32)

True difference:  0.0000001
Computed:         0.00000011920929

Relative error: 19.2%
```

仅一次减法就产生了 19% 的相对误差。在机器学习中，下列情况都会遇到这个问题：

- 对均值很大的数据计算方差：当 E[x] 很大时使用 `E[x^2] - E[x]^2`
- 两个几乎相等的对数概率相减
- 用过小的 epsilon 计算有限差分梯度

解决方法：重新排列公式，避免两个很大且几乎相等的数相减。计算方差时，请使用 Welford 算法或先对数据做中心化；处理对数概率时，则应始终在对数空间中计算。

### 溢出与下溢

当结果太大而无法表示时，就会发生溢出；当结果太小，也就是比最小可表示正数更接近零时，就会发生下溢。

```
Float32 boundaries:
  Maximum:  3.4028235e+38
  Minimum positive (normal): 1.175e-38
  Minimum positive (denorm): 1.401e-45
  Overflow:  anything > 3.4e38 becomes inf
  Underflow: anything < 1.4e-45 becomes 0.0
```

`exp()` 函数是机器学习中最主要的溢出来源：

```
exp(88.7)  = 3.40e+38   (barely fits in float32)
exp(89.0)  = inf         (overflow)
exp(-87.3) = 1.18e-38   (barely above underflow)
exp(-104)  = 0.0         (underflow to zero)
```

`log()` 函数则会在另一个方向遇到问题：

```
log(0.0)   = -inf
log(-1.0)  = nan
log(1e-45) = -103.3      (fine)
log(1e-46) = -inf        (input underflowed to 0, then log(0) = -inf)
```

在机器学习中，`exp()` 出现在 softmax、sigmoid 和概率计算中；`log()` 出现在交叉熵、对数似然和 KL 散度中。如果没有采用正确的技巧，`log(exp(x))` 这种组合就是一片雷区。

### Log-sum-exp 技巧 <!-- learning-atlas: log-sum-exp-trick -->

直接计算 `log(sum(exp(x_i)))` 在数值上非常危险。如果任意一个 `x_i` 很大，`exp(x_i)` 就会溢出；如果所有 `x_i` 都是很大的负数，每个 `exp(x_i)` 都会下溢为零，而 `log(0)` 等于 `-inf`。

这个技巧是：在取指数之前减去最大值。

```
log(sum(exp(x_i))) = max(x) + log(sum(exp(x_i - max(x))))
```

其原理是：减去 `max(x)` 后，最大的指数项是 `exp(0) = 1`，因此不可能发生溢出。求和中至少有一项为 1，所以总和至少为 1，而 `log(1) = 0`，也就不可能整体下溢到 `-inf`。

证明：

```
log(sum(exp(x_i)))
= log(sum(exp(x_i - c + c)))                    (add and subtract c)
= log(sum(exp(x_i - c) * exp(c)))               (exp(a+b) = exp(a)*exp(b))
= log(exp(c) * sum(exp(x_i - c)))               (factor out exp(c))
= c + log(sum(exp(x_i - c)))                    (log(a*b) = log(a) + log(b))
```

令 `c = max(x)`，溢出就被消除了。

这个技巧在机器学习中随处可见：

- Softmax 归一化
- 交叉熵损失计算
- 序列模型中的对数概率求和
- 高斯混合模型
- 变分推断

### 为什么 softmax 需要减去最大值

Softmax 将 logits 转换为概率：

```
softmax(x_i) = exp(x_i) / sum(exp(x_j))
```

如果不使用这个技巧，logits [100, 101, 102] 会导致溢出：

```
exp(100) = 2.69e43
exp(101) = 7.31e43
exp(102) = 1.99e44
sum      = 2.99e44

These overflow float32 (max ~3.4e38)? No, 2.69e43 < 3.4e38? Actually:
exp(88.7) is already at the float32 limit.
exp(100) = inf in float32.
```

使用这个技巧时，减去 max(x) = 102：

```
exp(100 - 102) = exp(-2) = 0.135
exp(101 - 102) = exp(-1) = 0.368
exp(102 - 102) = exp(0)  = 1.000
sum = 1.503

softmax = [0.090, 0.245, 0.665]
```

所得概率完全相同，但计算过程是安全的。这不是优化，而是保证正确性的必要条件。

### NaN 与 Inf：检测和预防

`nan`（Not a Number，非数）与 `inf`（infinity，无穷大）会像病毒一样在计算中传播。梯度更新中只要出现一个 `nan`，权重就会变成 `nan`，随后每个输出也都会成为 `nan`。训练在一步之内就会失败。

`inf` 的产生方式：

- 对很大的正数调用 `exp()`
- 除以零：`1.0 / 0.0`
- `float32` 累加发生溢出

`nan` 的产生方式：

- `0.0 / 0.0`
- `inf - inf`
- `inf * 0`
- 对负数调用 `sqrt()`
- 对负数调用 `log()`
- 任何涉及已有 `nan` 的算术运算

检测方法：

```python
import math

math.isnan(x)       # True if x is nan
math.isinf(x)       # True if x is +inf or -inf
math.isfinite(x)    # True if x is neither nan nor inf
```

预防策略：

1. 限制 `exp()` 的输入：`exp(clamp(x, -80, 80))`
2. 在分母中加入 epsilon：`x / (y + 1e-8)`
3. 在 `log()` 内部加入 epsilon：`log(x + 1e-8)`
4. 使用稳定实现，例如 log-sum-exp 和稳定 softmax
5. 使用梯度裁剪防止权重爆炸
6. 调试时，在每次前向传播后检查 `nan`/`inf`

### 数值梯度检查

解析梯度，也就是反向传播得到的梯度，可能存在 bug。数值梯度检查使用有限差分计算梯度，以此验证解析梯度。

中心差分公式：

```
df/dx ~= (f(x + h) - f(x - h)) / (2h)
```

它具有 O(h^2) 的精度，远优于只有 O(h) 精度的前向差分 `(f(x+h) - f(x)) / h`。

选择 h 时，如果它太大，近似就不准确；如果它太小，灾难性抵消会破坏结果。典型取值为 `h = 1e-5` 到 `1e-7`。

检查方法是计算解析梯度与数值梯度之间的相对误差。

```
relative_error = |grad_analytical - grad_numerical| / max(|grad_analytical|, |grad_numerical|, 1e-8)
```

经验规则：

- relative_error < 1e-7：非常完美，梯度正确
- relative_error < 1e-5：可以接受，梯度大概率正确
- relative_error > 1e-3：存在问题
- relative_error > 1：梯度完全错误

实现新层或新损失函数时，务必检查梯度。PyTorch 提供了 `torch.autograd.gradcheck()` 来完成这项工作。

### 混合精度训练

现代 GPU 配备了专用硬件 Tensor Core，计算 float16 矩阵乘法的速度比 float32 快 2–8 倍。混合精度训练正是利用了这一点：

```
1. Maintain float32 master copy of weights
2. Forward pass in float16 (fast)
3. Compute loss in float32 (prevents overflow)
4. Backward pass in float16 (fast)
5. Scale gradients to float32
6. Update float32 master weights
```

纯 float16 训练的问题在于：梯度通常非常小，可能只有 1e-8 或更小。float16 会把任何小于约 6e-8 的值下溢为零。所有梯度更新都变成零后，模型便会停止学习。

解决方法是损失缩放：

```
1. Multiply loss by a large scale factor (e.g., 1024)
2. Backward pass computes gradients of (loss * 1024)
3. All gradients are 1024x larger (pushed above float16 underflow)
4. Divide gradients by 1024 before updating weights
5. Net effect: same update, but no underflow
```

动态损失缩放会自动调整缩放因子。先从一个较大的值开始，例如 65536；如果梯度溢出为 `inf`，就将其减半；如果经过 N 步仍未溢出，就将其加倍。

### bfloat16 与 float16：为何 bfloat16 更适合训练

```
float16:   [1 sign] [5 exponent]  [10 mantissa]
bfloat16:  [1 sign] [8 exponent]  [7 mantissa]
```

float16 的精度更高，尾数为 10 位而非 7 位，但范围有限，最大值约为 65,504。bfloat16 精度较低，却拥有与 float32 相同的范围，最大值约为 3.4e38。

对于神经网络训练：

- 训练发生尖峰时，激活值和 logits 经常超过 65,504。float16 会溢出，而 bfloat16 可以处理
- float16 必须使用损失缩放；bfloat16 的范围覆盖了梯度幅值范围，通常不需要损失缩放
- bfloat16 可以通过简单截断 float32 得到：丢弃尾数的低 16 位即可。转换十分简单，且指数信息不会丢失

当数值有界、精度比范围更重要时，推理通常首选 float16；当范围比精度更重要时，训练通常首选 bfloat16。这就是 TPU 以及现代 NVIDIA GPU（A100、H100）原生支持 bfloat16 的原因。

### 梯度裁剪

梯度爆炸是指梯度穿过许多层时呈指数增长，在 RNN、深层网络和 Transformer 中尤为常见。只需一个过大的梯度，就可能在一步之内破坏所有权重。

裁剪有两种类型：

**按值裁剪：** 分别限制每个梯度元素。

```
grad = clamp(grad, -max_val, max_val)
```

这种方法很简单，但可能改变梯度向量的方向。

**按范数裁剪：** 缩放整个梯度向量，使其范数不超过阈值。

```
if ||grad|| > max_norm:
    grad = grad * (max_norm / ||grad||)
```

这种方法会保留梯度方向。`torch.nn.utils.clip_grad_norm_()` 采用的就是这种方式，也是标准选择。

典型取值包括：Transformer 使用 `max_norm=1.0`，强化学习使用 `max_norm=0.5`，较简单的网络使用 `max_norm=5.0`。

梯度裁剪不是权宜之计，而是一种安全机制。如果不使用它，一个异常批次产生的巨大梯度就足以毁掉数周的训练成果。

### 作为数值稳定器的归一化层

批归一化、层归一化和 RMS 归一化通常被描述为帮助训练收敛的正则化器，但它们同时也是数值稳定器。

如果没有归一化，激活值可能在层与层之间呈指数增长或缩小：

```
Layer 1: values in [0, 1]
Layer 5: values in [0, 100]
Layer 10: values in [0, 10,000]
Layer 50: values in [0, inf]
```

归一化会在每一层重新居中并缩放激活值：

```
LayerNorm(x) = (x - mean(x)) / (std(x) + epsilon) * gamma + beta
```

`epsilon` 通常取 1e-5，可在所有激活值都相同时防止除以零。可学习参数 `gamma` 和 `beta` 则允许网络恢复它所需要的任意尺度。

这会让数值在整个网络中保持于安全范围，既防止前向传播溢出，也防止反向传播时梯度爆炸。

### 常见的机器学习数值错误

**Bug：训练几个 epoch 后，损失变成 NaN。**
原因：logits 变得过大，softmax 发生溢出；也可能是学习率过高，导致权重发散。
修复：使用稳定 softmax（减去最大值）、降低学习率并加入梯度裁剪。

**Bug：损失停在 log(num_classes)。**
原因：模型输出接近均匀概率。这通常意味着梯度正在消失，或模型根本没有学习。
修复：检查数据标签是否正确，验证损失函数，并检查是否存在死亡 ReLU。

**Bug：验证准确率比预期低 1–3%。**
原因：混合精度训练没有正确进行损失缩放。梯度下溢会悄无声息地把小更新归零。
修复：启用动态损失缩放，或改用 bfloat16。

**Bug：部分层的梯度范数为 0.0。**
原因：ReLU 神经元死亡，即所有输入均为负数；也可能是 float16 下溢。
修复：使用 LeakyReLU 或 GELU，使用梯度缩放，并检查权重初始化。

**Bug：模型在一块 GPU 上正常，但换一块 GPU 后结果不同。**
原因：浮点数累加顺序不确定。不同硬件上的 GPU 并行归约会以不同顺序求和，而浮点加法不满足结合律。
修复：接受 1e-6 量级的小差异；或者设置 `torch.use_deterministic_algorithms(True)`，并接受相应的速度损失。

**Bug：损失计算中的 `exp()` 返回 `inf`。**
原因：原始 logits 未经减去最大值就直接传给 `exp()`。
修复：使用 `torch.nn.functional.log_softmax()`，它在内部实现了 log-sum-exp。

**Bug：从 float32 切换到 float16 后，训练发散。**
原因：float16 无法表示小于 6e-8 的梯度幅值，也无法表示大于 65,504 的激活值。
修复：使用带损失缩放的混合精度训练（AMP），或改用 bfloat16。

```figure
logsumexp-stability
```

## 构建

### 第 1 步：演示浮点精度限制

```python
print("=== Floating Point Precision ===")
print(f"0.1 + 0.2 = {0.1 + 0.2}")
print(f"0.1 + 0.2 == 0.3? {0.1 + 0.2 == 0.3}")
print(f"Difference: {(0.1 + 0.2) - 0.3:.2e}")
```

### 第 2 步：实现朴素与稳定的 softmax

```python
import math

def softmax_naive(logits):
    exps = [math.exp(z) for z in logits]
    total = sum(exps)
    return [e / total for e in exps]

def softmax_stable(logits):
    max_logit = max(logits)
    exps = [math.exp(z - max_logit) for z in logits]
    total = sum(exps)
    return [e / total for e in exps]

safe_logits = [2.0, 1.0, 0.1]
print(f"Naive:  {softmax_naive(safe_logits)}")
print(f"Stable: {softmax_stable(safe_logits)}")

dangerous_logits = [100.0, 101.0, 102.0]
print(f"Stable: {softmax_stable(dangerous_logits)}")
# softmax_naive(dangerous_logits) would return [nan, nan, nan]
```

### 第 3 步：实现稳定 log-sum-exp

```python
def logsumexp_naive(values):
    return math.log(sum(math.exp(v) for v in values))

def logsumexp_stable(values):
    c = max(values)
    return c + math.log(sum(math.exp(v - c) for v in values))

safe = [1.0, 2.0, 3.0]
print(f"Naive:  {logsumexp_naive(safe):.6f}")
print(f"Stable: {logsumexp_stable(safe):.6f}")

large = [500.0, 501.0, 502.0]
print(f"Stable: {logsumexp_stable(large):.6f}")
# logsumexp_naive(large) returns inf
```

### 第 4 步：实现稳定交叉熵

```python
def cross_entropy_naive(true_class, logits):
    probs = softmax_naive(logits)
    return -math.log(probs[true_class])

def cross_entropy_stable(true_class, logits):
    max_logit = max(logits)
    shifted = [z - max_logit for z in logits]
    log_sum_exp = math.log(sum(math.exp(s) for s in shifted))
    log_prob = shifted[true_class] - log_sum_exp
    return -log_prob

logits = [2.0, 5.0, 1.0]
true_class = 1
print(f"Naive:  {cross_entropy_naive(true_class, logits):.6f}")
print(f"Stable: {cross_entropy_stable(true_class, logits):.6f}")
```

### 第 5 步：梯度检查

```python
def numerical_gradient(f, x, h=1e-5):
    grad = []
    for i in range(len(x)):
        x_plus = x[:]
        x_minus = x[:]
        x_plus[i] += h
        x_minus[i] -= h
        grad.append((f(x_plus) - f(x_minus)) / (2 * h))
    return grad

def check_gradient(analytical, numerical, tolerance=1e-5):
    for i, (a, n) in enumerate(zip(analytical, numerical)):
        denom = max(abs(a), abs(n), 1e-8)
        rel_error = abs(a - n) / denom
        status = "OK" if rel_error < tolerance else "FAIL"
        print(f"  param {i}: analytical={a:.8f} numerical={n:.8f} "
              f"rel_error={rel_error:.2e} [{status}]")

def f(params):
    x, y = params
    return x**2 + 3*x*y + y**3

def f_grad(params):
    x, y = params
    return [2*x + 3*y, 3*x + 3*y**2]

point = [2.0, 1.0]
analytical = f_grad(point)
numerical = numerical_gradient(f, point)
check_gradient(analytical, numerical)
```

## 使用

### 混合精度模拟

```python
import struct

def float32_to_float16_round(x):
    packed = struct.pack('f', x)
    f32 = struct.unpack('f', packed)[0]
    packed16 = struct.pack('e', f32)
    return struct.unpack('e', packed16)[0]

def simulate_bfloat16(x):
    packed = struct.pack('f', x)
    as_int = int.from_bytes(packed, 'little')
    truncated = as_int & 0xFFFF0000
    repacked = truncated.to_bytes(4, 'little')
    return struct.unpack('f', repacked)[0]
```

### 梯度裁剪

```python
def clip_by_norm(gradients, max_norm):
    total_norm = math.sqrt(sum(g**2 for g in gradients))
    if total_norm > max_norm:
        scale = max_norm / total_norm
        return [g * scale for g in gradients]
    return gradients

grads = [10.0, 20.0, 30.0]
clipped = clip_by_norm(grads, max_norm=5.0)
print(f"Original norm: {math.sqrt(sum(g**2 for g in grads)):.2f}")
print(f"Clipped norm:  {math.sqrt(sum(g**2 for g in clipped)):.2f}")
print(f"Direction preserved: {[c/clipped[0] for c in clipped]} == {[g/grads[0] for g in grads]}")
```

### NaN/Inf 检测

```python
def check_tensor(name, values):
    has_nan = any(math.isnan(v) for v in values)
    has_inf = any(math.isinf(v) for v in values)
    if has_nan or has_inf:
        print(f"WARNING {name}: nan={has_nan} inf={has_inf}")
        return False
    return True

check_tensor("good", [1.0, 2.0, 3.0])
check_tensor("bad",  [1.0, float('nan'), 3.0])
check_tensor("ugly", [1.0, float('inf'), 3.0])
```

完整实现及所有边界情况演示，请参阅 `code/numerical.py`。

## 交付

本课将产出：

- `code/numerical.py`，其中包含稳定 softmax、log-sum-exp、交叉熵、梯度检查和混合精度模拟
- `outputs/prompt-numerical-debugger.md`，用于诊断训练中的 NaN/Inf 与数值问题

在 Phase 3 构建训练循环、Phase 4 实现注意力机制时，还会再次用到这些稳定实现。

## 练习

1. **灾难性抵消。** 使用 float32 中的朴素公式 `E[x^2] - E[x]^2` 计算 [1000000.0, 1000001.0, 1000002.0] 的方差，再使用 Welford 在线算法计算。将两者的误差与真实方差 0.6667 比较。

2. **寻找精度极限。** 在 Python 中，找出满足 `1.0 + x == 1.0` 的最小正 float32 值 `x`。这就是机器 epsilon。验证它与 `numpy.finfo(numpy.float32).eps` 一致。

3. **Log-sum-exp 边界情况。** 使用以下输入测试你的 `logsumexp_stable` 函数：(a) 所有值相等；(b) 一个值远大于其余值；(c) 所有值都是很大的负数（-1000）。验证朴素版本失败时，稳定版本仍能给出正确结果。

4. **对神经网络层进行梯度检查。** 实现一个线性层 `y = Wx + b` 及其解析反向传播。使用 `numerical_gradient` 验证 3×2 权重矩阵的实现是否正确。

5. **损失缩放实验。** 模拟 float16 训练：创建范围为 [1e-9, 1e-3] 的随机梯度，将其转换为 float16，并测量变成零的比例。然后进行损失缩放，即先乘以 1024，再转换为 float16，最后缩放回原值，并再次测量零值比例。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| IEEE 754 | “浮点数标准” | 定义二进制浮点格式、舍入规则和特殊值（inf、nan）的国际标准。所有现代 CPU 和 GPU 都实现了它。 |
| 机器 epsilon | “精度极限” | 对给定浮点格式而言，使 1.0 + e != 1.0 的最小值 e。float32 中约为 1.19e-7。 |
| 灾难性抵消 | “减法造成的精度损失” | 两个几乎相等的浮点数相减时，有效数字相互抵消，舍入噪声主导结果。 |
| 溢出 | “数字太大” | 结果超过最大可表示值并变成 inf。exp(89) 在 float32 中会溢出。 |
| 下溢 | “数字太小” | 结果比最小可表示正数更接近零并变成 0.0。exp(-104) 在 float32 中会下溢。 |
| Log-sum-exp 技巧 | “先减去最大值” | 提取 exp(max(x)) 来计算 log(sum(exp(x)))，从而防止溢出和下溢。用于 softmax、交叉熵和对数概率计算。 |
| 稳定 softmax | “不会爆炸的 softmax” | 在取指数前减去 max(logits)。结果在数值上相同，而且不可能溢出。 |
| 梯度检查 | “验证反向传播” | 将反向传播得到的解析梯度与有限差分得到的数值梯度进行比较，以捕获实现 bug。 |
| 混合精度 | “float16 前向，float32 反向” | 对速度敏感的运算使用低精度浮点数，对数值敏感的运算使用高精度浮点数。典型加速为 2–3 倍。 |
| 损失缩放 | “防止梯度下溢” | 反向传播前将损失乘以一个较大的常数，使梯度保持在 float16 可表示范围内；更新权重前再除以同一常数。 |
| bfloat16 | “Brain floating point” | Google 的 16 位格式，使用 8 位指数（范围与 float32 相同）和 7 位尾数（精度低于 float16），训练时优先使用。 |
| 梯度裁剪 | “限制梯度范数” | 缩放梯度向量，使其范数不超过阈值，防止梯度爆炸破坏权重。 |
| NaN | “Not a Number” | 由未定义运算（0/0、inf-inf、sqrt(-1)）产生的特殊浮点值，会传播到之后的所有算术运算。 |
| Inf | “Infinity” | 由溢出或除以零产生的特殊浮点值，组合运算可能产生 NaN，例如 inf - inf、inf * 0。 |
| 数值梯度 | “暴力求导” | 分别计算 f(x+h) 和 f(x-h)，再除以 2h 以近似导数。速度慢，但适合用于验证。 |

## 延伸阅读

- [What Every Computer Scientist Should Know About Floating-Point Arithmetic (Goldberg 1991)](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html) -- 关于浮点算术的权威资料，内容密集但十分完整
- [Mixed Precision Training (Micikevicius et al., 2018)](https://arxiv.org/abs/1710.03740) -- NVIDIA 首次提出在 float16 训练中使用损失缩放的论文
- [AMP: Automatic Mixed Precision (PyTorch docs)](https://pytorch.org/docs/stable/amp.html) -- PyTorch 混合精度训练实用指南
- [bfloat16 format (Google Cloud TPU docs)](https://cloud.google.com/tpu/docs/bfloat16) -- Google 为 TPU 选择这种格式的原因
- [Kahan Summation (Wikipedia)](https://en.wikipedia.org/wiki/Kahan_summation_algorithm) -- 减少浮点数求和舍入误差的算法
