---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/02-ml-fundamentals/20-model-monitoring-and-drift/docs/en.md
  revision: f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299
  sha256: 67ed1a1ed2ff0330085ca582c4068f307318a126ad1b6c591ce56a7022bfa082
status: reviewed
---

# 生产模型监控：数据漂移与概念漂移

> 已部署模型可能在没有错误消息的情况下失效：它继续返回分数，但现实已偏离训练数据，只有监控能显示差距。

**类型：** 构建
**语言：** Python
**前置课程：** Phase 2 第 09 课（模型评估）、第 16 课（异常检测）和第 19 课（ML 系统设计）
**预计时间：** 约 110 分钟

## 学习目标


- 在系统健康、输入、预测和结果四层选择监控信号。
- 根据联合分布改变的部分区分协变量漂移、先验漂移和概念漂移。
- 从零实现总体稳定性指数、双样本 Kolmogorov–Smirnov 统计量和卡方检验。
- 比较固定参考窗口与滑动当前窗口，并解释窗口大小如何改变噪声和延迟。
- 用效应量、多重检验修正和持续性规则设计限制误报的告警策略。
- 判断哪种漂移需要重训、哪种需要新标签、哪种无需动作。

## 问题


一个支付风险模型以 95% 的准确率上线。两个月后，营销活动带来了购物篮更大的应用用户；四个月后，欺诈者改变策略，原本安全的支付开始变成拒付。

在整个过程中，模型服务对每个请求都返回 HTTP 200，延迟正常，日志也没有错误。问题的第一个信号是财务部门数周后提交的拒付报告，此时损失已经发生。

软件监控检查服务是否响应；模型监控检查答案是否仍然正确，以及数据是否仍像训练模型的数据。本课为后一个任务构建统计量、窗口和告警策略，并在注入两处变化的合成流上运行，观察每个监控器对哪种变化作出反应。

## 概念


### 监控什么


监控四个层面。前三个提供早期预警，只有第四个测量正确性，而且到达较晚。

| 层面 | 信号 | 可用时间 | 回答的问题 |
|---|---|---|---|
| 系统健康 | p50 和 p99 延迟、错误率、吞吐量、内存 | 立即 | 服务是否响应？ |
| 输入 | 各特征分布、缺失率、模式、新类别 | 立即 | 实时数据是否像训练数据？ |
| 预测 | 分数分布、正类率、默认答案比例 | 立即 | 模型行为是否与以前相同？ |
| 结果 | 准确率、精确率、校准度、业务指标 | 标签延迟后 | 模型是否仍然正确？ |

本课重点是输入监控，因为它在标签到达前就能工作；但演示也会显示它的局限：有些变化不会改变输入。

### 三类漂移


输入 `x` 与标签 `y` 的联合分布可以用两种方式写出：

```math
P(x, y) = P(x) \cdot P(y \mid x) = P(y) \cdot P(x \mid y)
```

每种漂移改变的因素不同：

| 漂移 | 发生变化 | 保持不变 | 支付示例 | 哪种监控可发现 |
|---|---|---|---|---|
| 协变量漂移 | `P(x)` | `P(y \| x)` | 攻击期间购物篮更大的应用用户增多 | 输入监控 |
| 先验漂移 | `P(y)` | `P(x \| y)` | 攻击期间欺诈率翻倍，但欺诈样式不变 | 预测和结果监控 |
| 概念漂移 | `P(y \| x)` | 可保持不变 | 同样的购物篮现在有不同的欺诈风险 | 只有结果监控 |

Gama 等人把 `P(y | x)` 的变化称为真实概念漂移，把不改变 `P(y | x)` 的 `P(x)` 变化称为虚拟漂移。他们的综述还按时间模式把漂移分为突然、增量、渐进，以及会回归的概念。

协变量漂移不一定有害。如果模型很好地学到了 `P(y | x)`，它对每个输入仍然正确；但当流量进入训练数据很少的区域或靠近决策边界时，准确率仍可能下降。

### 延迟标签


结果在预测之后才到达，延迟取决于问题：

| 问题 | 标签到达时间 |
|---|---|
| 广告点击 | 几秒 |
| 未来 30 天内的流失 | 30 天 |
| 银行卡欺诈 | 拒付到达时，通常数周后 |
| 贷款违约 | 数月或数年 |

延迟期间只有输入和预测，没有结果。应监控输入和预测，标签到达后再连接它们，并且只在已有标签的部分计算结果指标。演示把标签延迟设为 500 个事件，因此结果监控器总是查看过去 500 个事件。

### 参考窗口与当前窗口


每个漂移检验都比较两个样本：

- **参考窗口。** 训练数据，或人工检查过的一段生产数据；重新训练前保持固定。
- **当前窗口。** 最近的事件，可以是最后 `N` 个事件或最近 `T` 小时。

滑动窗口每次前进小于自身大小的步长，因此相邻窗口重叠；滚动窗口每次前进完整大小。窗口大小需要权衡：小窗口反应快，却可能把噪声当作漂移；大窗口稳定，却会较晚报告变化。

季节性会破坏朴素窗口。在许多产品中，周一流量与周六不同。参考窗口应覆盖完整周期，或把每个窗口与更早周期的相同时间段比较。

### 总体稳定性指数（PSI）


PSI 源自信用评分。把参考值分箱，通常按参考分位数分成十箱，使每箱包含 10% 的参考数据；统计当前值落入各箱的比例，然后对每个箱累加一项：

```math
\text{PSI} = \sum_{\text{bins}} (\text{current\_share} - \text{reference\_share}) \cdot \ln\left(\frac{\text{current\_share}}{\text{reference\_share}}\right)
```

某个箱的比例为零会让对数变为无穷，因此要把每个比例裁剪到很小的值，例如 0.0001。PSI 是对称的，等于当前到参考的 KL 散度加上参考到当前的 KL 散度。

实践中常用固定区间解读 PSI：低于 0.1 表示稳定，0.1 至 0.25 表示中等变化，高于 0.25 表示显著变化。应把这些区间视为约定而非检验。PSI 随箱数增加而增大，随样本量增加而减小。演示中没有漂移的 500 事件窗口得分在 0.01 到 0.04 之间。

### Kolmogorov–Smirnov 统计量


双样本 KS 统计量 `D` 是两个经验累积分布函数之间最大的垂直间距：

```math
D = \max_x \left\lvert F_{\text{reference}}(x) - F_{\text{current}}(x) \right\rvert
```

样本相同时时 `D` 为 0，完全不重叠时为 1；它不需要分箱。p 值来自 Kolmogorov 分布，有效样本量为 `n * m / (n + m)`。

样本很大时，即使没人关心的微小间距也会得到趋近于零的 p 值。每个窗口有一百万个事件时，0.02 个标准差的变化也会“显著”。应把 `D` 本身作为效应量，只有 `D` 超过效应量阈值且 p 值低于显著性阈值时才告警。

### 类别特征的卡方检验


对于支付渠道这样的类别特征，构造两行（参考、当前）且每个类别一列的表格。每个单元格的期望计数由行总计和列总计得到：

```math
\begin{aligned}
\text{expected}[r][c] &= \text{row\_total}[r] \cdot \text{column\_total}[c] / \text{grand\_total} \\
\text{chi2} &= \sum_{\text{cells}} (\text{observed} - \text{expected})^2 / \text{expected}
\end{aligned}
```

有 `k` 个类别时，检验有 `k - 1` 个自由度。只在当前窗口出现的类别会贡献很大的一项，因此检验能响应新值。Cramér's V 是效应量；对于两行表格，它等于 `chi2 / grand_total` 的平方根。

### 告警阈值与误报


没有变化时，每个检验都有误报率 `alpha`。监控会运行很多检验；若每小时以 `alpha = 0.05` 检查 50 个特征，即使没有变化，每天也预计约有 60 次误报。人们会在达到这个数字之前就停止阅读告警。

四条规则可以让告警率保持可用：

1. **修正多重检验。** Bonferroni 修正把 `alpha` 除以检验数量。演示在两个检验上使用整体 `alpha` 0.01，因此每个检验使用 0.005。
2. **要求效应量。** 只有 PSI、`D` 或 Cramér's V 也超过阈值时才告警。
3. **要求持续性。** 连续 `k` 个漂移窗口后才告警；演示使用 `k = 2`。
4. **区分警告与告警。** 警告发送到看板，告警发送给人员。

演示展示了规则 2 的作用。一个干净窗口的卡方 p 值为 0.0009，低于单个检验的 `alpha`，但 Cramér's V 低于 0.1，因此策略记录警告而不是告警。

### 重新训练触发条件


重训常见有三种触发方式：

- **日程。** 每周或每月重训；简单，但没有变化时也会重训，有变化时却可能等待。
- **漂移。** 重要特征的输入漂移持续超过阈值时重训。
- **性能。** 结果指标低于参考值减去容差时重训。

漂移类型决定重训能做什么：

| 漂移 | 有用的动作 |
|---|---|
| 协变量漂移，准确率稳定 | 通常无需动作，继续观察结果指标 |
| 协变量漂移进入数据稀少区域 | 用包含这些区域的近期数据重训 |
| 先验漂移 | 重新校准分数或移动决策阈值 |
| 概念漂移 | 先收集新标签；用旧标签重训只会再次学习旧概念 |

重训后，在最近的带标签数据上测试新模型，使用系统设计课程中的 shadow 和 canary 阶段发布，然后把参考窗口重置为新的训练数据。

```figure
mlprod-drift-psi
```

## 动手构建


`code/main.py` 只使用标准库。

### 步骤 1：分位数分箱与 PSI


分箱边界是参考数据的十分位数，`bisect_right` 用于查找每个值所属的箱。

```python
def quantile_edges(reference: list[float], bins: int = 10) -> list[float]:
    ordered = sorted(reference)
    n = len(ordered)
    edges = [ordered[min(n - 1, (n * i) // bins)] for i in range(1, bins)]
    return sorted(set(edges))


def psi_from_fractions(expected: list[float], actual: list[float], eps: float = 1e-4) -> float:
    total = 0.0
    for e, a in zip(expected, actual):
        e, a = max(e, eps), max(a, eps)
        total += (a - e) * math.log(a / e)
    return total
```

### 步骤 2：KS 统计量与 p 值


同时遍历两个已排序样本。在每个不同的值处跳过两个样本中的所有重复项，再比较累计比例，这样可以正确处理并列值。

```python
def ks_statistic(sample_a: list[float], sample_b: list[float]) -> float:
    a, b = sorted(sample_a), sorted(sample_b)
    n, m = len(a), len(b)
    i = j = 0
    d = 0.0
    while i < n and j < m:
        x = min(a[i], b[j])
        while i < n and a[i] <= x:
            i += 1
        while j < m and b[j] <= x:
            j += 1
        d = max(d, abs(i / n - j / m))
    return d
```

p 值使用 Kolmogorov 分布的级数 `2 * sum((-1)^(k-1) * exp(-2 k^2 lambda^2))`，其中 `lambda = sqrt(n * m / (n + m)) * D`。

### 步骤 3：卡方检验


`chi2_sf` 通过正则化上不完全伽马函数计算卡方生存函数；小参数使用级数，大参数使用连分数。`chi_square_test` 构造两行表格、计算统计量，并返回 p 值和 Cramér's V。

```python
def chi_square_test(reference_counts: dict[str, int], current_counts: dict[str, int]) -> ChiSquareResult:
    categories = [c for c in sorted(set(reference_counts) | set(current_counts))
                  if reference_counts.get(c, 0) + current_counts.get(c, 0) > 0]
    rows = [[reference_counts.get(c, 0) for c in categories], [current_counts.get(c, 0) for c in categories]]
    row_totals = [sum(r) for r in rows]
    grand = sum(row_totals)
    if len(categories) < 2 or 0 in row_totals:
        return ChiSquareResult(0.0, 0, 1.0, 0.0)
    statistic = 0.0
    for col, _ in enumerate(categories):
        col_total = rows[0][col] + rows[1][col]
        for r in range(2):
            expected = row_totals[r] * col_total / grand
            statistic += (rows[r][col] - expected) ** 2 / expected
    dof = len(categories) - 1
    return ChiSquareResult(statistic, dof, chi2_sf(statistic, dof), math.sqrt(statistic / grand))
```

### 步骤 4：窗口与漂移监控器


`SlidingWindow` 用 `deque` 保存最近的 `size` 个事件。`DriftMonitor` 只计算一次参考分箱和计数；其 `check` 方法为每个数值特征返回 PSI、`D` 和 KS p 值，为每个类别特征返回卡方结果。

### 步骤 5：告警策略


策略把每组指标转换为等级，并按信号统计连续漂移窗口：

```python
def level(self, metrics: dict[str, float]) -> str:
    if "psi" in metrics:
        if metrics["psi"] >= self.psi_drift or (metrics["ks"] >= self.ks_drift and metrics["ks_p"] < self.alpha):
            return "drift"
        return "warn" if metrics["psi"] >= self.psi_warn else "ok"
    if metrics["p"] < self.alpha and metrics["v"] >= self.min_cramers_v:
        return "drift"
    return "warn" if metrics["p"] < self.alpha else "ok"
```

`update` 在完成连续次数的窗口返回 `ALERT`，并在告警后的第一个干净窗口返回 `resolved`。

### 步骤 6：注入漂移的事件流


数据流包含 9000 个支付事件，每个事件有 `amount`、`channel` 和欺诈 `label`。它由四个片段组成：

| 事件 | 金额 | 渠道比例（应用、门店、Web） | 标签边界 | 变化 |
|---|---|---|---|---|
| 0 至 2999 | 均值 100，标准差 20 | 35%、15%、50% | 120 | 参考期 |
| 3000 至 4999 | 均值 118，标准差 24 | 60%、10%、30% | 120 | 协变量漂移 |
| 5000 至 6499 | 均值 100，标准差 20 | 35%、15%、50% | 120 | 恢复正常 |
| 6500 至 8999 | 均值 100，标准差 20 | 35%、15%、50% | 105 | 概念漂移 |

模型是 `amount` 的阈值，在前 2000 个事件上拟合。窗口包含 500 个事件，每次移动 250 个；标签延迟 500 个事件到达。

```bash
python3 code/main.py
```

```console
  end    PSI   KS D   chi2 p    acc  levels (amount/channel/accuracy)  events
 3000  0.010  0.041  3.0e-01  0.932  ok/ok/ok
 3250  0.152  0.163  7.6e-06  0.924  drift/warn/ok
 3500  0.463  0.298  2.8e-26  0.936  drift/drift/ok                     ALERT amount
 3750  0.609  0.343  3.5e-35  0.942  drift/drift/ok                     ALERT channel
 ...
 5500  0.026  0.044  2.6e-01  0.898  ok/ok/ok                           resolved amount, resolved channel
 ...
 7250  0.040  0.048  7.1e-01  0.848  ok/ok/drift
 7500  0.022  0.039  6.1e-01  0.778  ok/ok/drift                        ALERT accuracy
```

结果分三部分阅读：

- **协变量漂移。** 漂移从事件 3000 开始，`amount` 告警在 3500 出现。由于标签规则没有变化，准确率保持在 0.89–0.95。
- **恢复。** 输入在 5000 回归正常，两个告警在 5500 恢复。
- **概念漂移。** 漂移从 6500 开始，输入没有变化所以输入监控保持安静。准确率从 0.946 降至 0.76–0.79；准确率告警在 7500 出现，即变化后 1000 个事件，其中 500 个由标签延迟造成。

## 使用


**scipy。** `scipy.stats` 实现了两种检验，统计量与从零实现的代码一致。运行本课不需要安装 scipy。

```python
from scipy import stats

result = stats.ks_2samp(reference_amounts, current_amounts)
print(result.statistic, result.pvalue)

table = [[1000, 700, 300], [140, 290, 70]]
chi2 = stats.chi2_contingency(table)
print(chi2.statistic, chi2.pvalue, chi2.dof)
```

我们在随机样本上把 `ks_statistic` 和 `chi_square_test` 与 scipy 1.18.1 对照。KS 统计量、卡方统计量和卡方 p 值在浮点精度内一致。在 200 对随机样本上，KS p 值与 scipy 的差异最大达到 scipy 值的 18%，差异最大出现在很小的 p 值处。

差异来自方法不同。我们的代码使用极限 Kolmogorov 分布；默认情况下，当两个样本都不超过 10,000 个值时，`ks_2samp` 使用精确方法，其渐近模式使用带四舍五入有效样本量的有限样本分布。两个类别时，`chi2_contingency` 默认应用 Yates 连续性校正，因此统计量会不同。

**监控库。** 一些开源库把这些检验与报告、看板打包在一起：

- **Evidently** 为每列选择漂移检验。参考数据不超过 1000 行时，数值列使用 KS 检验，类别列使用卡方检验；数据更大时，使用 Wasserstein 距离和阈值为 0.1 的 Jensen-Shannon 散度。PSI 也是可选方法之一。
- **NannyML** 在标签到达前估计模型性能。其基于置信度的性能估计（CBPE）使用模型预测概率，因此概率必须校准良好。NannyML 文档说明 CBPE 能处理协变量偏移，但不能处理概念漂移；演示数据流说明了原因：只有标签揭示了概念漂移。
- **TensorFlow Data Validation** 比较相邻数据片段。类别特征使用 L-infinity 距离，数值特征使用近似 Jensen-Shannon 散度；它还比较训练数据与服务数据，这正是特征库课程讨论的内容。

从零实现的代码展示了这些工具各自计算的内容；成熟工具还会增加存储、调度、看板和更多检验。

对于 LLM 应用，基础设施阶段的 [LLM 可观测性课程](../../../17-infrastructure-and-production/13-llm-observability/docs/en.md)介绍追踪和评估工具。本课思想同样适用于那些系统的输入与输出。

## 交付


本课生成 `outputs/skill-drift-monitoring.md`。该技能为新模型规划监控并分诊漂移告警，询问哪个层面触发、证据符合哪种漂移，以及正确动作是等待、重新校准、收集标签还是重训。

## 练习


1. 使用包含 200 和 2000 个事件的窗口运行数据流，记录事件 3000 前的误报和告警延迟。
2. 设置 `n_tests=1`、`patience=1` 和 `min_cramers_v=0`，统计 5000 至 6500 的干净期间告警数。
3. 加入均值每 100 个事件增长 0.01 的特征，找出 PSI 与 KS 哪个信号先响应。
4. 在相同的十分位数分箱上实现 Jensen-Shannon 距离，并在每个窗口与 PSI 比较。
5. 为模型正类预测率增加监控，解释概念漂移期间它为何保持安静。

## 关键术语


| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| Data drift | “数据变了” | 相对于参考窗口，输入、预测或标签分布发生变化 |
| Covariate drift | “出现新类型用户” | `P(x)` 变化，而 `P(y \| x)` 保持不变 |
| Prior drift | “正例比以前多” | `P(y)` 变化，而 `P(x \| y)` 保持不变，也称标签偏移 |
| Concept drift | “游戏规则变了” | `P(y \| x)` 变化，同样输入现在有不同正确答案 |
| Reference window | “基线数据” | 用于与每个当前窗口比较的固定样本，通常是训练数据 |
| PSI | “稳定性分数” | 对每个箱计算（当前比例减参考比例）乘以比例之比的对数，再求对称和 |
| KS statistic | “KS 检验” | 两个经验累积分布函数之间的最大间距 |
| Cramér's V | “类别效应量” | 缩放到 0 至 1 范围的卡方统计量 |
| Label delay | “真实结果晚到” | 从预测到真实结果到达之间的时间 |
| Alert fatigue | “页面太多” | 大多数告警是误报，人们因此忽略告警 |

## 延伸阅读


- [Gama 等，《概念漂移适应综述》（ACM Computing Surveys，2014）](https://research.tue.nl/en/publications/a-survey-on-concept-drift-adaptation)：真实与虚拟漂移、漂移模式和适应方法。
- [Rabanser、Günnemann 与 Lipton，《失败要大声说出来：数据集偏移检测方法的实证研究》（NeurIPS 2019）](https://arxiv.org/abs/1810.11953)：用于偏移检测的双样本检验。
- [Lu 等，《概念漂移下的学习：综述》（2020）](https://arxiv.org/abs/2004.05785)：漂移检测、理解和适应方法。
- [Yurdakul，《总体稳定性指数的统计性质》（西密歇根大学，2018）](https://scholarworks.wmich.edu/dissertations/3208/)：PSI 随样本量和分箱数量的变化规律。
- [scipy.stats.ks_2samp 文档](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html)：双样本 KS 检验的精确与渐近 p 值方法。
- [Evidently，《数据漂移检测如何工作》](https://docs.evidentlyai.com/metrics/explainer_drift)：按列类型和数据规模选择默认检验。
- [NannyML，《性能估计》](https://nannyml.readthedocs.io/en/stable/how_it_works/performance_estimation.html)：CBPE 及其假设。
