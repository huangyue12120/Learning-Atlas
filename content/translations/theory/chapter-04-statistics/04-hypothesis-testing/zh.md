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

*本篇将假设检验放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

* 体外试验为决定所观察到的效果是真实的还是偶然的提供了一个严格的框架。此文件涵盖无效和可替代的假设,p值,意义水平,t测试,chi-squared测试,ANOVA,以及类型一/II错误,与A/B测试,模型比较和研究中所使用的逻辑相同. *

- 统计不仅仅是描述数据。你常常需要做决定:新药有用吗? 一个算法比另一个算法快吗? 平均变化了吗? 假想测试为您提供了使用数据回答这些问题的结构化框架.

- 这个想法很简单:假设什么也没有改变("null system"),然后检查数据是否如此极端,以致于这个假设变得难以相信.

- **null假设** ($H_0$)是默认债权,通常为"无效果"或"无差别"的表述. 例如:"平均交付时间还剩30分钟"或"新模式不比旧模式好".

- ** 备选假设** ($H_1$或 为$H_a$)是您所怀疑的可能是真实的:"平均交货时间已经改变"或"新模式更好".

- 你从不证明$H_1$直接来. 相反,你问:$H_0$我是多么有可能看到如此极端的数据? 如果不太可能,你就会拒绝$H_0$赞成:$H_1$.

- 测试统计**是一个单一的数字,它总结了您的样本结果从什么得到多少。$H_0$预言 不同的测试使用不同的公式,但逻辑总是相同的:测量所观测到和预期的距离.

- **p值**是观测测试统计的概率,至少与你的一样极端,假设$H_0$是真的,你说得对。一个小的p值表示数据令人惊讶$H_0$.

- ** 职等**$\alpha$)是您在查看数据之前设定的阈值。若为$p \le \alpha$你拒绝$H_0$。。。常见的选择是:$\alpha = 0.05$(5%)和$\alpha = 0.01$ (1%).

![图示](../images/hypothesis_test.svg)

- 被遮蔽的尾巴是拒绝区域. 如果你的测试统计数据落地了, 这些数据足够令人惊讶$H_0$你将拒绝它。绿地显示特定测试统计的p值。

- 以下是逐步程序:
    - ** 步骤1**:国家$H_0$财务报告和已审计财务报表$H_1$
    - ** 第2步 **:选择一个意义级别$\alpha$
    - ** 第3步**:收集数据并计算测试统计数据
    - ** 第4步 **: 查找 p 值(或将测试统计与临界值进行比较)
    - ** 步骤5**:如果$p \le \alpha$拒绝$H_0$。。。否则,拒绝$H_0$

- ** 工作实例**:一家工厂声称其螺栓的平均长度为10厘米。测量出36个螺栓 并找到10.3厘米的样本 已知的人口标准差为0.9厘米. 是否有证据表明,这种恶行已经改变?

- $H_0$: $\mu = 10$, $H_1$: $\mu \neq 10$, $\alpha = 0.05$

- 测试统计(z-测试,自$\sigma$已知,且$n$宽度 :

$$z = \frac{\bar{x} - \mu_0}{\sigma / \sqrt{n}} = \frac{10.3 - 10}{0.9 / \sqrt{36}} = \frac{0.3}{0.15} = 2.0$$

- 做个双尾测试$\alpha = 0.05$,关键值是$\pm 1.96$。。。我们$z = 2.0 > 1.96$我们拒绝$H_0$。。。p值约为0.046,低于0.05.

- 结论:有统计上重要的证据表明,平均螺栓长度与10厘米不同.

- 检查某一具体方向的效果($H_1$: $\mu > 10$或 为$\mu < 10$) (中文(简体)). 整个$\alpha$掉入一尾 就更容易拒绝$H_0$但无法发现相反方向的效应。

- 任何差异的检查(b)$H_1$: $\mu \neq 10$) (中文(简体)). 该$\alpha$将两尾相分($\alpha/2$(每个) 这样做比较保守,但渔获效果在两个方向都不同。

- 即使程序良好 错误也会发生 错误有两种:

![图示](../images/type_errors.svg)

- ** 类型 I 错误** (假阳性): 您拒绝$H_0$当它是真实的。这概率是$\alpha$,通过选择意义级别来控制它。就像火警响起时没有起火

- ** Type II 出错** (假负): 您无法拒绝$H_0$当它实际上是虚假的。这概率是$\beta$。。。就像火警在火灾中保持沉默一样

- ** 国 家 **$1 - \beta$,正确拒绝虚假的概率$H_0$。。。强力意味着你更能检测到真正的效果 电量增加时:
    - 真实效果大小较大(跳鼠差异比较容易检测)
    - 样本大小较大(更多数据 = 更精确)
    - 意义级别$\alpha$较大(但这会增加I型出错风险)
    - 变异性较低(低噪音)

- 第一类错误和第二类错误之间有张力. 降级$\alpha$(对虚假阳性持更谨慎态度)$\beta$(更假阴. 您不能同时将两者与固定样本大小最小化。

- ** 参数测试** 假设数据遵循一个特定的分布(通常是正常的). 当假设成立时,它们的力量更大。

- **Z-测试**:将样本平均值与已知值进行比较,当$\sigma$已知,且$n$大型(4个)$n \ge 30$) (中文(简体)). 测试统计 :

$$z = \frac{\bar{x} - \mu_0}{\sigma / \sqrt{n}}$$

- **T测试**:像z测试,但何时$\sigma$未知(从样本中估算)或$n$是个小的。使用t-分布,其尾部比平时更重. 更重的尾巴是估计值时额外不确定性的原因$\sigma$.

$$t = \frac{\bar{x} - \mu_0}{s / \sqrt{n}}$$

- t-分布有一个参数,叫做**度自由**($df = n - 1$) (中文(简体)). 作为$df$增加时,t分配接近正态分配.

- 有几种t-t-test的味道:
    - **一样本t测试**:样本意指与特定值是否不同?
    - ** 独立的双样本 t-测试**:两个单独组别的手段是否不同?
    - **Paired t-test**:是两种相关测量方法不同(例如: 在同一科目上治疗前后)?

- ** ANOVA(差异分析)**:测试是否三个或三个以上组别是相等的。ANOVA没有运行多个t-测试(它夸大了I型出错率),而是通过将组之间的差异与组内的差异进行比较来进行单一测试.

$$F = \frac{\text{variance between groups}}{\text{variance within groups}}$$

- 一个大$F$比率意味着各组的差异大于你对随机变化的预期。

- ** 非参数测试** 对数据分布的假设较少。他们靠的不是原始价值,而是排名,使他们强壮到超越和不正常。

- ** Chi-square 测试** ($\chi^2$:测试观测到的频率是否与预期频率相匹配. 用于绝对数据。例如:红色,蓝色和绿色汽车的比例是否与制造商声称的比例相匹配?

$$\chi^2 = \sum \frac{(O_i - E_i)^2}{E_i}$$

- **Mann-Whitney U测试**:独立二样t测试的非参数化替代. 它通过比较排名来检验一个群体是否倾向于拥有比另一个更大的值.

- **Wilcoxon签名排名测试**:配对t测试的非参数替代. 比较对等观测,看差异的程度和方向。

- ** Kruskal-Wallis试验**:单向ANOVA的非参数化替代品。通过比较所有团体的排名来检验多个团体是否来自同一分布.

- ** 适中测试** 检查您的数据是否遵循特定的理论分布. Chi-square film-fit测试将所观测到的bin计数与假设分布下的预期计数进行比较.

- ** 标准测试** 具体检查数据是否正常分布。常见的有:沙皮罗-维尔克测试(能为小样本提供能力)和科尔莫戈罗夫-斯米尔诺夫测试(将样本CDF与理论CDF相比较).

- 在ML中,假想测试在比较模型性能时会出现. 如果模型A实现92%的精度,而模型B实现91%,那么差异是真实的还是仅仅是噪音? 交叉验证分数上的一对t测试可以回答这个问题.

## 编程任务（使用 Colab 或 notebook）


1. 从文本中为螺栓厂实例进行z测试。计算测试统计,p值,并作出决定。
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

2. 模拟类型 I 出错: 当$H_0$是真的,我们多久才错误地拒绝? 进行一万次实验,检查拒绝率是否相符$\alpha$.
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

3. 比较T测试和曼-惠特尼U测试两组. 生成数据,其中一个组的平均值略高,并看到哪个测试检测到差异.
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
