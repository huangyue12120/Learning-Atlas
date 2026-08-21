---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/01-math-foundations/15-statistics-for-ml/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 9770d8e715f37b25538f2c9b0e78de30b38d7c1ddccc81765b124880071e0561
status: reviewed
---

# 机器学习统计学

> 统计学告诉你：模型是真的更好，还是只是碰巧得到了一个好分数。

**类型：** 实作  
**学习实现：** Python  
**前置课程：** Phase 1 · 第 06、07 课  
**预计学习：** 约 120 分钟

## 学习目标

- 从零计算描述统计量、Pearson/Spearman 相关与协方差矩阵。
- 执行 t 检验、卡方检验，正确解释 p-value 与置信区间。
- 用 bootstrap 重采样为任意指标构造无需分布假设的置信区间。
- 通过 effect size 区分统计显著性和实践显著性。

## 问题

测试集上 A 为 0.87、B 为 0.89，并不自动说明 B 更好：0.02 可能只是测试集过小或方差过高造成的噪声。排行榜波动、无法复现的论文、样本只有数百个就宣布获胜的 A/B 测试，都常源于跳过统计推断。统计学让我们量化不确定性、判断差异是否真实并估计所需数据量；没有它，模型比较只是猜测。

## 概念

### 描述统计：汇总数据

均值（mean）是平衡点：`mu = (1/n) * sum(x_i)`；中位数（median）是排序后居中的值，抗异常值，例如 `[1, 2, 3, 4, 1000]` 的均值为 202、median 为 3；众数（mode）是出现最多的值，主要用于类别数据。均值和中位数相差很大意味着分布偏斜：收入常右偏，训练损失可能因大量容易样本而左偏。

方差为 `sigma^2 = (1/n) * sum((x_i - mu)^2)`，标准差 `sigma = sqrt(sigma^2)` 与原数据同单位；range 是 `max - min`，受异常值影响，不能单独依赖；IQR 为 `Q3 - Q1`，即中间 50% 的范围，适合箱线图和异常检测。百分位数将排序数据分成 100 段：P50 是 median、P95 描述较差体验、P99 描述尾部延迟；低平均误差而很差的 P99 在安全关键场景可能不可接受。

区分总体与样本：总体方差分母为 `N`，样本方差为 `s^2 = (1/(n-1)) * sum((x_i - x_bar)^2)`。`n-1` 的 Bessel 校正补偿了以样本均值代替总体均值导致的低估；样本很大时差异很小，小样本时很重要。

### 相关：变量如何共同变化

Pearson correlation 度量线性关系：`r = sum((x_i-x_bar)(y_i-y_bar)) / (n * s_x * s_y)`，范围 [-1, 1]。它假设关系近似线性，且对异常值敏感；变量近似正态主要是对 Pearson 的显著性检验和区间推断的前提，而不是计算描述性相关系数本身的前提。Spearman 先把数值换成秩再计算 Pearson，能发现任何单调关系：`y=x^3` 时 Pearson 并不完美，Spearman rho 为 1。连续近似正态、关心线性且无极端异常值时用 Pearson；序数数据、非正态、单调非线性或异常值存在时用 Spearman。相关不代表因果：冰淇淋销量和溺水都随夏季上升。

### 协方差矩阵

协方差矩阵 `C` 是 d×d 矩阵，`C[i][j] = Cov(feature_i, feature_j)`；它对称、半正定，对角线为方差，非对角线为协方差。PCA 对该矩阵做特征分解，特征向量是最大方差方向，特征值是解释方差。

**与相关性的连接。** 相关矩阵就是标准化变量的协方差矩阵：每个变量先除以自身标准差。相关性将协方差归一化，因此所有值都落在 `[-1, 1]`。

### 假设检验

零假设 H0 是“无效应/无差异”的默认立场，备择假设 H1 是要寻找的效果，例如 H0：两个模型准确率相同；H1：B 更高。p-value 是在 H0 为真时观察到同样或更极端数据的概率：`P(data this extreme | H0 is true)`，不是 H0 为真的概率。`p < alpha`（常取 0.05）时拒绝 H0；否则只是“未能拒绝”，绝不等于 H0 为真。

均值的 95% 置信区间为 `x_bar +/- z * (s / sqrt(n))`，大样本正态近似时 95% 的 `z=1.96`；小样本且总体方差未知时，应使用 t 分布的临界值。重复许多次实验时，95% 的这样构造的区间会覆盖真值；它不是“当前这个区间含真值的概率为 95%”。区间越宽，估计越不精确；窄区间仍可能因数据偏倚而不准确。

### t 检验

单样本 t 检验用 `t=(x_bar-mu_0)/(s/sqrt(n))`、自由度 `n-1` 检验均值是否为假设值。独立两样本比较用 Welch t-test：`t=(x_bar_1-x_bar_2)/sqrt(s1^2/n1+s2^2/n2)`；它不假定方差相等，除非确有理由，否则应优先使用。配对 t 检验先计算每对 `d_i=x_i-y_i`，再对差值做单样本检验；同一批交叉验证 folds 评估两个模型时最常用。

### 卡方检验

卡方检验比较类别频率：`chi^2=sum((observed-expected)^2/expected)`。例如观测 `(120, 80)`、期望 `(100, 100)` 时 chi² 为 8、1 个自由度下 `p < 0.005`；它可检查语言模型输出分布是否匹配训练分布。

| 类别 | 观测 | 期望 |
|---|---:|---:|
| Positive | 120 | 100 |
| Negative | 80 | 100 |

`chi² = (120−100)²/100 + (80−100)²/100 = 8`。

### ML 模型的 A/B 测试

模型比较必须在同一测试集上进行，并同时报告 precision、recall、F1、latency 和 fairness，不能只看 accuracy；以 cross-validation 或 bootstrap 估计方差，并防止模型选择泄漏测试集。流程是预先定义指标和 alpha、在同一 k-fold 划分上运行两个模型、收集配对分数、检验差值、为平均差值给出 CI，再计算 Cohen's d。

### 统计显著性与实践显著性

统计显著不等于实践重要。样本极大时微小差异也会显著；Cohen's d 衡量独立于样本量的效果（0.2 小、0.5 中、0.8 大），应同时报告 p-value 与 d。

### 多重比较问题

同时以 `alpha=0.05` 测 20 个假设，至少一个假阳性的概率为 `1-(1-alpha)^m = 1-0.95^20 = 0.64`。Bonferroni 将阈值改为 `alpha/m=0.0025`，简单但保守；模型多超参数、多指标或多数据集比较时必须考虑它。

### Bootstrap 方法

Bootstrap 对 n 个数据有放回抽样 n 个，计算统计量并重复 B 次（通常 1,000–10,000）；排序后取 2.5 与 97.5 百分位得到 95% CI。它无需分布假设，适用于 AUC、F1、precision@k、median 以及模型指标差。

用于模型比较时，它比配对 t 检验更稳健，因为不对数据分布作假设。

### 参数检验与非参数检验

参数检验假设分布（t-test、ANOVA、Pearson）；非参数检验不作分布假设（Mann–Whitney U、Wilcoxon signed-rank、Spearman、Kruskal–Wallis）。小样本、序数、重异常值或偏斜数据偏向非参数；大样本、近似对称且无极端异常值时参数方法更有 power。ML 的 5 或 10 个 CV folds 很小，Wilcoxon 常比 t-test 合适。

### 中心极限定理：实践含义

中心极限定理（CLT）说 iid 变量的样本均值随 n 增大趋于 `Normal(mu, sigma^2/n)`；多数情形 `n >= 30` 即可适用，强偏斜分布常需 `n >= 100`。它支撑聚合指标 CI、CV 平均、mini-batch gradient 与 ensemble 平均，但不会把原始数据变正态，也不适用于无限方差重尾分布或相关时间序列。

### ML 论文中的常见统计错误

不要在训练集测试、只报单点 accuracy、忽略多重比较、混淆统计与实践显著性、在极不平衡数据上只报 accuracy、挑选对自己有利的指标、在切分前标准化或使用未来数据、在 100 样本上宣称 2% 提升、把患者/文档内相关观察当独立样本，或不断更换测试和样本子集直到 `p<0.05`（p-hacking）。

## 构建实现

`reference_statistics.py` 逐字保留上游、仅依赖 `math` 和 `random` 的实现：描述统计、Pearson/Spearman、协方差矩阵、单/双/配对 t-test、卡方检验、bootstrap CI、Cohen's d、Bonferroni、A/B 模拟和“大样本让微小差异显著”的演示。

**练习。**

1. 实现 mean、sample variance、Pearson correlation 和 percentile，并用测试先验证边界情况。
2. 用相同 CV folds 的两模型分数实现 paired t-test，报告 p-value、CI 与 Cohen's d。
3. 为 F1 或 median 写 bootstrap CI；解释为什么不能只依赖正态近似。
4. 模拟 20 个无真实差异的实验，比较未校正与 Bonferroni 后的假阳性。
5. 审计一份模型报告：检查独立性、泄漏、样本量、所有相关指标及实际部署成本。

## 关键术语

| 术语 | 含义 |
|---|---|
| Mean | 所有值之和除以数量；对异常值敏感。 |
| Median | 排序后的中间值；对异常值稳健。 |
| Standard deviation | 方差平方根，以原始单位衡量离散程度。 |
| Percentile | 给定百分比数据低于它的值。 |
| IQR | 四分位距，Q3−Q1，中间 50% 的范围。 |
| Pearson correlation | 两变量线性关联，范围 [-1, 1]。 |
| Spearman correlation | 基于秩衡量单调关联。 |
| p-value | H0 为真条件下得到同样或更极端数据的概率。 |
| confidence interval | 给定置信程序产生的参数合理范围。 |
| Null hypothesis | 无效应或无差异的默认假设。 |
| effect size | 不依赖样本量的差异大小，如 Cohen's d。 |
| t-test | 使用 t 分布检验均值是否显著不同。 |
| Chi-squared test | 检验观测频率是否不同于期望频率。 |
| Bonferroni correction | 将显著性阈值除以检验次数以控制假阳性。 |
| bootstrap | 有放回重采样以估计统计量抽样分布。 |
| Type I / II error | 错拒真 H0 的假阳性 / 未拒假 H0 的假阴性。 |
| statistical power | 正确拒绝假 H0 的概率，等于 1 减 Type II error rate。 |
| covariance matrix | 所有特征对协方差组成的对称半正定矩阵。 |
| CLT | 样本均值随样本量增大趋于正态的定理。 |
| Parametric test | 假设特定数据分布（通常为正态）。 |
| Non-parametric test | 不作分布假设，基于秩或符号。 |

**延伸阅读。**

- [scipy.stats](https://docs.scipy.org/doc/scipy/reference/stats.html) — Python 的统计检验实现。
- [The American Statistician: p-values](https://www.tandfonline.com/doi/full/10.1080/00031305.2016.1154108) — p-value 的正确使用。

<!-- 与上游逐单元保留的公式/步骤围栏 -->
```text
均值：所有值之和 / 数量；中位数：排序后的中间值；众数：出现频率最高的值。
```
```text
方差 = (1/n) * Σ(x_i−μ)^2；标准差 = sqrt(方差)。
```
```text
范围 = max−min；IQR = Q3−Q1，覆盖中间 50%。
```
```text
P50=中位数；P95=95 分位；P99=尾部延迟。
```
```text
总体方差分母为 N；样本方差分母为 n−1（Bessel 校正）。
```
```text
Pearson r = Σ((x_i−x̄)(y_i−ȳ))/(n*s_x*s_y)，范围 [-1,1]。
```
```text
Spearman：先将值替换为秩，再计算秩的 Pearson 相关。
```
```text
Pearson 适合线性近似正态数据；Spearman 适合秩、偏斜或单调关系。
```
```text
Cov(X,Y)=(1/n)*Σ((x_i−x̄)(y_i−ȳ))。
```
```text
C[i][j]=Cov(feature_i,feature_j)；矩阵对称、半正定，对角线为方差。
```
```text
H0 是默认无效应假设；H1 是待证明的效果。
```
```text
p-value=P(观测到如此极端数据 | H0 为真)，不是 P(H0 为真)。
```
```text
p<α 时拒绝 H0；否则未能拒绝，不代表 H0 为真。
```
```text
95% CI：x̄ ± z*(s/sqrt(n))；95% 时 z=1.96（大样本近似）。
```
```text
重复实验时，95% 的构造区间覆盖真均值；不是当前区间含真值的概率。
```
```text
单样本 t=(x̄−μ0)/(s/sqrt(n))，自由度 n−1。
```
```text
Welch t=(x̄1−x̄2)/sqrt(s1²/n1+s2²/n2)，不要求方差相等。
```
```text
配对检验：计算 d_i=x_i−y_i，再对 d_i 做均值为 0 的单样本 t 检验。
```
```text
卡方 χ²=Σ((观测−期望)²/期望)；示例表中 χ²=8，p<0.005。
```
```text
A/B 必须使用相同测试集，同时报告 accuracy、precision、recall、F1、延迟和公平性。
```
```text
流程：预设指标和 α；同一 k-fold；收集配对分数；检验差值；计算 CI 和 Cohen's d。
```
```text
Cohen's d=(均值1−均值2)/pooled_std；0.2 小、0.5 中、0.8 大。
```
```text
20 次检验、α=.05：至少一个假阳性概率 1−.95^20=.64。
```
```text
Bonferroni：调整 α=α/m=.05/20=.0025。
```
```text
Bootstrap：有放回抽 n 个样本，计算统计量，重复 B=1000–10000 次。
```
```text
百分位 CI=[bootstrap 统计量的 2.5 百分位，97.5 百分位]。
```
```text
模型比较时每轮重采样测试索引，保存 metric_B−metric_A；CI 不含 0 即有差异。
```
```text
参数检验：t-test、ANOVA、Pearson；非参数：Mann–Whitney、Wilcoxon、Spearman、Kruskal–Wallis。
```
```text
小样本、序数、偏斜或重异常值用非参数；大样本且近似对称时参数方法 power 更高。
```
```text
CLT：iid 样本均值随 n 增大趋于 Normal(μ,σ²/n)。
```
```text
CLT 支撑聚合指标 CI、交叉验证平均、mini-batch 梯度和 ensemble 平均。
```
```text
CLT 不会令原始数据正态；无限方差重尾分布或相关时间序列不满足条件。
```
```text
常见错误：训练集测试、无 CI、多重比较、只报 accuracy、数据泄漏、p-hacking。
```

```figure
f3-bootstrap-resample
```
