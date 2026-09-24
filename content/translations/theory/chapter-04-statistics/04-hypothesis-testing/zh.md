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

*假设检验提供了一个严谨的框架，用于决定观察到的效果是否真实或由于偶然。本文件涵盖了零假设和备择假设、p值、显著性水平、t检验、卡方检验、ANOVA以及I型和II型错误，这些逻辑与A/B测试、模型比较和研究相同。*

- 统计学不仅用于描述数据。有时你需要做出决策：新药是否有效？一种算法比另一种快吗？平均值是否改变？假设检验给你提供了一个结构化的框架，使用数据来回答这些问题。

- 主要思想很简单：假设 nothing发生了（零假设），然后检查数据是否如此极端，以至于这个假设变得难以相信。

- **零假设**（$H_0$）是默认的声明，通常是“没有效果”或“没有差异”。例如：“平均配送时间仍然是30分钟”或“新模型不如旧模型好。”

- **备择假设**（$H_1$或$H_a$）是你认为可能是真的：“平均配送时间已经改变”或“新模型更好。”

- 你永远不能直接证明 $H_1$。相反，你问：“如果 $H_0$ 是正确的，那么我看到这种极端数据的概率是多少？如果这个概率非常小，你就拒绝 $H_0$ 而支持 $H_1$。”

- **检验统计量**是一个单个数字，总结了你的样本结果与 $H_0$ 预测之间的距离。不同的测试使用不同的公式，但逻辑始终相同：测量观察到和预期之间的差异。

- **p值**是假设 $H_0$ 为真时观察到检验统计量至少如此极端的概率。一个小的 p 值意味着数据在 $H_0$ 下非常意外。

- **显著性水平**（$\alpha$）是你在看数据之前设置的阈值。如果 $p \le \alpha$，你就拒绝 $H_0$。常见的选择是 $\alpha = 0.05$（5%）和 $\alpha = 0.01$（1%）。

![正态分布曲线，拒绝区域用阴影表示，检验统计量标记，p值区域突出。](../images/hypothesis_test.svg)


- 阴影部分是拒绝区域。如果您的统计量落在那里，数据在 $H_0$ 下足够令人惊讶，您会拒绝它。绿色区域显示特定统计量的 p 值。

- 这是步骤的详细说明：
    - **第一步**：声明 $H_0$ 和 $H_1$。
    - **第二步**：选择一个显著性水平 $\alpha$。
    - **第三步**：收集数据并计算检验统计量。
    - **第四步**：找到 p 值（或比较检验统计量与临界值）。
    - **第五步**：如果 $p \le \alpha$，拒绝 $H_0$。否则，失败接受 $H_0$。

- **工作示例**：一家工厂声称他们的螺栓平均长度为10厘米。你测量了36个螺栓，并发现样本平均长度为10.3厘米。已知总体标准差为0.9厘米。是否有证据表明平均值发生了变化？

- $H_0$: $\mu = 10$, $H_1$: $\mu \neq 10$, $\alpha = 0.05$

- 测试统计量（z检验，因为$\sigma$已知且$n$较大）：

$$z = \frac{\bar{x} - \mu_0}{\sigma / \sqrt{n}} = \frac{10.3 - 10}{0.9 / \sqrt{36}} = \frac{0.3}{0.15} = 2.0$$
- 对于双尾检验在 $\alpha = 0.05$ 的临界值是 $\pm 1.96$。我们的 $z = 2.0 > 1.96$，因此我们拒绝 $H_0$。p 值大约为 0.046，小于 0.05。

- 结论：有统计显著证据表明，螺栓长度的平均值与10厘米不同。

- **单尾检验**检查一种特定方向的效果（$H_1$: $\mu > 10$或$\mu < 10$）。整个$\alpha$都进入一个尾部，使得在该方向上拒绝$H_0$变得更加容易，但在相反方向上无法检测到效果。

- 一个 **双尾检验** 检查任何差异（$H_1$: $\mu \neq 10$）。 $\alpha$ 被分配到两个尾部（$\alpha/2$ 每个）。这更为保守，但可以捕捉到任何方向的效果。

- 即使有好的程序，也会出现错误。错误分为两种类型：

![两行两列的表格，显示类型I和类型II错误：现实与决策。](../images/type_errors.svg)


- **假阳性错误**（误判）：你拒绝 $H_0$ 当实际情况确实如此时，这种可能性是 $\alpha$当你选择显著性水平时，就像火警响起但没有火灾一样。

- **错误类型II（假阴性）**：当实际为假时，拒绝了$H_0$。这个概率是$\beta$。就像火灾报警器在真实火灾中保持沉默一样。

- 功率 $1 - \beta$错误率 $H_0$更高权力意味着你更擅长检测真实效果。权力随着：
    - 真实效应大小的增加（更大的差异更容易检测）
    - 样本大小的增加（更多的数据 = 更高的精确度）
    - 显著性水平 $\alpha$ 是更大的（但这会增加类型I错误的风险）
    - 变异较小（噪声更少）

- 有类型I和类型II错误之间的紧张关系。降低$\alpha$（过度担心假阳性）会增加$\beta$（更多假阴性）。在固定样本大小下，无法同时最小化两者。

- 参数测试假设数据遵循特定分布（通常为正态分布）。当这些假设成立时，它们更强大。

- **Z检验**：比较样本均值与已知值，当$\sigma$已知且$n$较大（$n \ge 30$）时。统计量：

$$z = \frac{\bar{x} - \mu_0}{\sigma / \sqrt{n}}$$
- **t检验**：类似于z检验，但当$\sigma$未知（从样本估计）或$n$较小时使用。它使用t分布，该分布的尾部比正态分布更重。这些额外的不确定性由估计$\sigma$来解释。

$$t = \frac{\bar{x} - \mu_0}{s / \sqrt{n}}$$
- 自由度（Degrees of Freedom）是t分布的一个参数。$df = n - 1$) $df$ 随着自由度增加，t分布逐渐接近正态分布。

- 有几种类型的t检验：
    - **单样本t检验**：样本均值是否与特定值不同？
    - **独立两样本t检验**：两个独立组的均值是否不同？
    - **配对t检验**：两个相关测量的均值是否不同（例如，同一受试者在治疗前后的结果）？

- **ANOVA（方差分析）**：用于比较三个或更多组均值是否相等。与运行多个t检验相比，ANOVA通过比较不同组间的方差和同一组内方差来执行单个测试，从而降低类型I错误率。

$$F = \frac{\text{variance between groups}}{\text{variance within groups}}$$
- 一个较大的 $F$ 比例意味着它们之间的差异比随机变异更多。

- 非参数检验较少假设数据分布。它们基于秩而不是原始值，因此对异常值和非正态性具有鲁棒性。

- **卡方检验**（$\chi^2$）：用于比较观察频数与预期频数是否匹配。适用于分类数据。例如：红、蓝、绿汽车的比例是否符合制造商声称的比例？

$$\chi^2 = \sum \frac{(O_i - E_i)^2}{E_i}$$
- Mann-Whitney U检验：独立两样本t检验的非参数替代方法。它通过比较秩次来测试一个组是否倾向于具有较大的值，与另一个组相比。

- Wilcoxon符号秩检验：配对t检验的非参数替代品。通过比较配对观察值的大小和方向来实现。

- Kruskal-Wallis检验：非参数替代方法之一，用于比较多个组是否来自同一分布。通过比较所有组的秩来测试。

- **拟合优度检验** 用于检查数据是否符合特定理论分布。卡方拟合优度检验将观察到的频数与假设分布下的预期频数进行比较。

- **正态性检验**主要用于检查数据是否服从正态分布。常见的有 Shapiro-Wilk检验（适用于小样本），以及 Kolmogorov-Smirnov检验（比较样本的CDF与理论CDF）。

- 在机器学习中，假设检验出现时，你比较模型性能。如果模型A的准确率为92%，而模型B的准确率为91%，差异是真实还是噪声？使用交叉验证得分进行配对t检验可以回答这个问题。

## 编程任务（使用CoLab或笔记本）

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

2. 模拟类型I错误：当$H_0$为真时，我们有多少次误判？运行10,000次实验，并检查拒绝率是否与$\alpha$匹配。
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

3. 比较t检验和Mann-Whitney U检验在两个组上的表现。生成数据，其中一组的均值稍高，看看哪种测试能够检测到差异。
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
