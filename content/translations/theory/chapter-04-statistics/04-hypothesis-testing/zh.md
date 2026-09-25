---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 04 - statistics/04. hypothesis testing.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 942dcb7250f6076ab531d4238d4ab79fca45b42621d5d59baa136cfdb506d3d4
status: reviewed
---
# 假设检验

*假设检验提供了一套严谨的方法，帮助判断观察到的效应是否反映真实差异，还是随机波动。本文件介绍零假设、备择假设、p 值、显著性水平、t 检验、卡方检验、ANOVA 以及 I 型和 II 型错误；A/B 测试、模型比较和研究也会用到这些方法。*

- 统计学不只用于描述数据。你还可以用它判断新药是否有效、某种算法是否更快、平均值是否发生变化。假设检验为这类判断提供结构化的方法。

- 主要思想很简单：假设没有效果或差异（零假设），然后检查数据是否如此极端，以至于这个假设变得难以相信。

- **零假设**（$H_0$）是默认的声明，通常是“没有效果”或“没有差异”。例如：“平均配送时间仍然是30分钟”或“新模型不如旧模型好。”

- **备择假设**（$H_1$ 或 $H_a$）描述你希望检验的效应，例如“平均配送时间已经改变”或“新模型更好”。

- 假设检验不能直接证明 $H_1$。它问的是：“若 $H_0$ 为真，观察到当前结果或更极端结果的概率有多大？”若该概率足够小，就拒绝 $H_0$，转而支持 $H_1$。

- **检验统计量**是一个单个数字，总结了你的样本结果与 $H_0$ 预测之间的距离。不同的测试使用不同的公式，但逻辑始终相同：测量观察到和预期之间的差异。

- **p 值**是在 $H_0$ 为真时，观察到当前检验统计量或更极端结果的概率。p 值较小，表示这些数据在 $H_0$ 下较难出现。

- **显著性水平**（$\alpha$）是你在看数据之前设置的阈值。如果 $p \le \alpha$，你就拒绝 $H_0$。常见的选择是 $\alpha = 0.05$（5%）和 $\alpha = 0.01$（1%）。

![正态分布曲线，拒绝区域用阴影表示，检验统计量标记，p值区域突出。](../images/hypothesis_test.svg)


- 阴影部分是拒绝区域。如果您的统计量落在那里，数据在 $H_0$ 下足够令人惊讶，您会拒绝它。绿色区域显示特定统计量的 p 值。

- 具体步骤如下：
    - **第一步**：声明 $H_0$ 和 $H_1$。
    - **第二步**：选择一个显著性水平 $\alpha$。
    - **第三步**：收集数据并计算检验统计量。
    - **第四步**：找到 p 值（或比较检验统计量与临界值）。
    - **第五步**：如果 $p \le \alpha$，拒绝 $H_0$；否则，未能拒绝 $H_0$。

- **工作示例**：一家工厂声称他们的螺栓平均长度为10厘米。你测量了36个螺栓，并发现样本平均长度为10.3厘米。已知总体标准差为0.9厘米。是否有证据表明平均值发生了变化？

- $H_0$: $\mu = 10$, $H_1$: $\mu \neq 10$, $\alpha = 0.05$

- 测试统计量（z检验，因为$\sigma$已知且$n$较大）：

$$z = \frac{\bar{x} - \mu_0}{\sigma / \sqrt{n}} = \frac{10.3 - 10}{0.9 / \sqrt{36}} = \frac{0.3}{0.15} = 2.0$$
- 双尾检验在 $\alpha=0.05$ 时的临界值约为 $\pm1.96$。这里 $z=2.0>1.96$，因此拒绝 $H_0$。p 值约为 0.046，小于 0.05。

- 结论：有统计显著证据表明，螺栓长度的平均值与10厘米不同。

- **单尾检验**检验预先指定方向上的效应（例如 $H_1:\mu>10$ 或 $H_1:\mu<10$）。整个 $\alpha$ 都分配在一个尾部，因此更容易检出该方向的效应，但无法检出相反方向的效应。

- 一个 **双尾检验** 检查任何差异（$H_1$: $\mu \neq 10$）。 $\alpha$ 被分配到两个尾部（$\alpha/2$ 每个）。这更为保守，但可以捕捉到任何方向的效果。

- 即使有好的程序，也会出现错误。错误分为两种类型：

![两行两列的表格，显示类型I和类型II错误：现实与决策。](../images/type_errors.svg)


- **I 型错误（假阳性）**：实际 $H_0$ 为真时却拒绝 $H_0$。其概率是你设定的显著性水平 $\alpha$，就像火警响起但没有火灾。

- **II 型错误（假阴性）**：实际 $H_0$ 为假时却未能拒绝 $H_0$。其概率是 $\beta$，就像真实发生火灾时警报器保持沉默。

- **检验功效**为 $1 - \beta$，表示检出真实效果的能力。功效会随以下因素提高：
    - 真实效应大小的增加（更大的差异更容易检测）
    - 样本大小的增加（更多的数据 = 更高的精确度）
    - 显著性水平 $\alpha$ 较高（但这会增加 I 型错误的风险）
    - 变异较小（噪声更少）

- I 型错误和 II 型错误之间存在权衡。降低 $\alpha$（更谨慎地控制假阳性）会增加 $\beta$（更多假阴性）。在固定样本量下，无法同时最小化二者。

- **参数检验**假设数据服从特定分布（通常是正态分布）。这些假设成立时，参数检验通常有更高的检验功效。

- **z 检验**：在 $\sigma$ 已知且样本量较大（常以 $n \ge 30$ 作为经验标准）时，用样本均值与假设值比较。检验统计量为：

$$z = \frac{\bar{x} - \mu_0}{\sigma / \sqrt{n}}$$
- **t 检验**与 z 检验类似，但总体标准差 $\sigma$ 未知时需用样本估计，检验统计量服从尾部更重的 t 分布，以反映估计 $\sigma$ 带来的不确定性。小样本下还需满足相应的分布假设。

$$t = \frac{\bar{x} - \mu_0}{s / \sqrt{n}}$$
- 单样本 t 检验的自由度为 $df=n-1$。自由度增加时，t 分布逐渐接近正态分布。

- t 检验有几种类型：
    - **单样本t检验**：样本均值是否与特定值不同？
    - **独立两样本t检验**：两个独立组的均值是否不同？
    - **配对t检验**：两个相关测量的均值是否不同（例如，同一受试者在治疗前后的结果）？

- **ANOVA（方差分析）**用于检验三个或更多组的均值是否相等。与多次两两 t 检验相比，先进行一次 ANOVA 可减少 I 型错误率的膨胀；它比较组间方差和组内方差。

$$F = \frac{\text{组间方差}}{\text{组内方差}}$$
- 较大的 $F$ 比值意味着组间差异大于仅由随机变异所能解释的程度。

- 许多**非参数检验**对数据分布的假设较少，并基于秩而不是原始值；这类检验通常较能抵抗离群点和非正态数据的影响。

- **卡方检验**（$\chi^2$）：用于比较观察频数与预期频数是否匹配。适用于分类数据。例如：红、蓝、绿汽车的比例是否符合制造商声称的比例？

$$\chi^2 = \sum \frac{(O_i - E_i)^2}{E_i}$$
- Mann-Whitney U检验：独立两样本t检验的非参数替代方法。它通过比较秩次来测试一个组是否倾向于具有较大的值，与另一个组相比。

- Wilcoxon符号秩检验：配对t检验的非参数替代品。通过比较配对观察值的大小和方向来实现。

- Kruskal-Wallis检验：非参数替代方法之一，用于比较多个组是否来自同一分布。通过比较所有组的秩来测试。

- **拟合优度检验** 用于检查数据是否符合特定理论分布。卡方拟合优度检验将观察到的频数与假设分布下的预期频数进行比较。

- **正态性检验**用于检查数据是否服从正态分布。常见方法包括 Shapiro–Wilk 检验（适用于小样本）和 Kolmogorov–Smirnov 检验（比较样本 CDF 与理论 CDF）。**编者注：**若正态分布参数由样本估计，直接使用标准 Kolmogorov–Smirnov 检验并不合适，需作相应修正。

- 机器学习中也会用假设检验比较模型性能。例如，模型 A 的准确率为 92%，模型 B 为 91%，差异可能是真实效应，也可能来自随机波动。可以对交叉验证得分做配对 t 检验；**编者注：**还需考虑各折得分之间的相关性。

## 编程任务（使用 Colab 或笔记本）

1. 对文本中提到的螺栓工厂例子执行z检验。计算测试统计量、p值，并做出决策。
```python
import jax.numpy as jnp

x_bar = 10.3    # sample mean
mu_0 = 10.0     # null hypothesis value
sigma = 0.9     # known population std
n = 36           # sample size
alpha = 0.05

# Test statistic
z = (x_bar - mu_0) / (sigma / jnp.sqrt(n))
print(f"z = {z:.4f}")

# p-value (two-tailed) using the normal CDF approximation
# For |z| = 2.0, p ≈ 0.0456
from jax.scipy.stats import norm
p_value = 2 * (1 - norm.cdf(jnp.abs(z)))
print(f"p-value = {p_value:.4f}")
print(f"Reject H₀? {p_value <= alpha}")
```

2. 模拟 I 型错误：当 $H_0$ 为真时，统计检验会以多大比例错误地拒绝它？运行 10,000 次实验，并检查拒绝率是否接近 $\alpha$。
```python
import jax
import jax.numpy as jnp

key = jax.random.PRNGKey(0)
mu_0 = 50.0
sigma = 10.0
n = 30
alpha = 0.05
n_experiments = 10_000

rejections = 0
for i in range(n_experiments):
    key, subkey = jax.random.split(key)
    sample = mu_0 + sigma * jax.random.normal(subkey, shape=(n,))
    z = (sample.mean() - mu_0) / (sigma / jnp.sqrt(n))
    p_value = 2 * (1 - __import__("jax").scipy.stats.norm.cdf(jnp.abs(z)))
    if p_value <= alpha:
        rejections += 1

print(f"Rejection rate: {rejections/n_experiments:.4f}")
print(f"Expected (α):   {alpha}")
```

3. 比较两个组的 t 检验和 Mann–Whitney U 检验。生成均值略有差异的数据，观察各检验的结果。
```python
import jax
import jax.numpy as jnp

key = jax.random.PRNGKey(99)
k1, k2 = jax.random.split(key)

group_a = jax.random.normal(k1, shape=(25,)) * 5 + 100
group_b = jax.random.normal(k2, shape=(25,)) * 5 + 103  # slightly higher mean

# Two-sample t-test (equal variance assumed)
n_a, n_b = len(group_a), len(group_b)
mean_a, mean_b = group_a.mean(), group_b.mean()
pooled_var = ((n_a - 1) * group_a.var() + (n_b - 1) * group_b.var()) / (n_a + n_b - 2)
se = jnp.sqrt(pooled_var * (1/n_a + 1/n_b))
t_stat = (mean_a - mean_b) / se
print(f"T-test statistic: {t_stat:.4f}")

# Mann-Whitney: count how often group_a values beat group_b values
u_stat = jnp.sum(group_a[:, None] < group_b[None, :])
print(f"Mann-Whitney U:   {u_stat}")
print(f"\nGroup A mean: {mean_a:.2f}, Group B mean: {mean_b:.2f}")
```

**编者注：**这段代码只计算并打印 t 统计量和 U 统计量，没有计算 p 值或作出显著性判定，不能据此判断哪种检验检出了差异。
