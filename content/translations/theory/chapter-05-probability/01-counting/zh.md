---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 05 - probability/01. counting.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: cf716c051d4d044ecf25d774796bf8668ba15b36200ed50675493ec27e124397
status: reviewed
---
# 计数

*计算概率前，必须先数清可能结果的总数，才能判断各结果的概率。本文介绍乘法规则、加法规则、阶乘、排列、组合和二项式系数；这些组合计数工具也用于机器学习中的抽样、哈希和概率分析。*

- 计算概率前，先要数清可能出现的结果。例如，要计算在扑克中拿到一手获胜牌的概率，得先知道牌型总数，以及其中有多少种能获胜。计数为概率计算提供了明确依据。

- 最简单的计数原则是**乘法规则**。如果第一项选择有 $m$ 种可能，第二项选择无论第一项如何都有 $n$ 种可能，那么组合后的结果总数是 $m \times n$。

- 想象一下早上穿衣服。你有3件衬衫和4条裤子。每件衬衫都可以与每条裤子配对，给你 $3 \times 4 = 12$ 套可能的服装。

![树状图展示 3 件衬衫与 4 条裤子组合成 12 套服装](../images/counting_outfits.svg)


- 乘法规则扩展到任何数量的选择。如果你还有2双鞋子，服装总数为 $3 \times 4 \times 2 = 24$。每个新独立的选择都会乘以计数。

- **加法规则**处理“或”场景。如果事件A可以发生$m$种方式，事件B可以发生$n$种方式，并且它们不能同时发生（互斥），总的可能性是$m + n$。

- 假设你从城市X到城市Y可以通过汽车（3条路线）或通过火车（2条路线）。你不能同时进行两者，所以总选项是$3 + 2 = 5$。

- 当事件有重叠时，需要减去重复计数的部分。如果 $A$ 和 $B$ 可以同时发生，结果数为 $|A \cup B| = |A| + |B| - |A \cap B|$。这就是容斥原理，之后讨论概率的加法规则时还会用到。

- **阶乘**是一个非负整数$n$的乘积，从1到$n$的所有正整数：

$$n! = n \times (n-1) \times (n-2) \times \cdots \times 2 \times 1$$
- 阶乘回答的是：$n$ 个不同对象排成一列有多少种方式？三本书放在书架上可以有 $3! = 3 \times 2 \times 1 = 6$ 种排列。按照惯例，$0! = 1$。

- 阶乘增长非常迅速。$10! = 3{,}628{,}800$和$20!$已经超过了$2.4 \times 10^{18}$。这种爆炸性增长使得在组合问题中使用暴力搜索变得不可行。

- **排列**是对象的有序安排。当你从 $n$ 个不同对象中选择 $r$ 个，且顺序很重要时，排列数为：

$$P(n, r) = \frac{n!}{(n - r)!}$$
- 想象一下从一个由10个人组成的俱乐部中挑选总统、副总统和财务主管。第一个角色有10名候选人，第二个有9名剩余的，第三个有8名。这给出了$P(10, 3) = 10 \times 9 \times 8 = 720$。公式确认了这一点: $\frac{10!}{7!} = 720$。

- 组合是一个无序的选择。当你从 $n$ 个中挑选 $r$ 个，并且顺序无关时，我们通过除以冗余的排列来消除重复的排列：

$$C(n, r) = \binom{n}{r} = \frac{n!}{r!(n - r)!}$$
- 符号 $\binom{n}{r}$ 读作“从 $n$ 个中选 $r$ 个”。关键在于，每个组合对应 $r!$ 个排列（选出的 $r$ 个对象可以有 $r!$ 种重排方式），因此要将排列数除以 $r!$。

![排列计数所有顺序，而组合将相同成员集合视为一种](../images/permutation_vs_combination.svg)


- 例如，从 10 人中选出 3 人组成委员会，有多少种选法？由于成员顺序无关（委员会没有主席或副主席之分），这里使用组合：

$$\binom{10}{3} = \frac{10!}{3! \cdot 7!} = \frac{10 \times 9 \times 8}{3 \times 2 \times 1} = 120$$
- 同样的 10 个人可以产生 720 个排列，但只有 120 个组合，因为每个 3 人小组有 $3! = 6$ 种内部排列。

- 组合是概率论的基础。二项式系数 $\binom{n}{r}$ 统计 $n$ 次试验中恰好成功 $r$ 次的方式数，这正是二项分布的核心（见第 03 篇）。

- 下面用一个经典的委员会问题，把几种计数方法结合起来。

- **问题**：一个俱乐部有8名男性和6名女性。有多少种方式可以组成一个由3名男性和2名女性组成的委员会？

- **步骤1**：从8名男性中选择3名。

$$\binom{8}{3} = \frac{8!}{3! \cdot 5!} = \frac{8 \times 7 \times 6}{3 \times 2 \times 1} = 56$$
- **步骤2**：从6名女性中选择2名。

$$\binom{6}{2} = \frac{6!}{2! \cdot 4!} = \frac{6 \times 5}{2 \times 1} = 15$$
- **步骤3**：应用乘法法则。每个男性选择可以与每个女性选择配对：

$$56 \times 15 = 840 \text{ 个委员会}$$
- 这种模式，将复杂计数问题分解为独立的子选择并相乘，是组合学中的标准方法。

- 还有**重复排列**。当项目可以重复时，从 $n$ 种类型中选择 $r$ 个项目，结果为 $n^r$ 种可能性。使用数字 0-9 组成的 4 位 PIN 有 $10^4 = 10{,}000$ 种可能。每个位置有 10 种选项，乘法规则处理剩余部分。

- **可重复组合**（也称“隔板法”或 stars and bars）用于计算从 $n$ 种类型中选取 $r$ 个对象、允许重复且不考虑顺序时的选法数：

$$\binom{n + r - 1}{r} = \frac{(n + r - 1)!}{r!(n - 1)!}$$
- 例如，从 4 种冰淇淋口味中选 3 球（允许重复），共有 $\binom{4 + 3 - 1}{3} = \binom{6}{3} = 20$ 种选法。

- 总结计数工具包：

| 情景 | 公式 |
|---|---|
| 有序、无重复（排列） | $P(n,r) = \frac{n!}{(n-r)!}$ |
| 无序、无重复（组合） | $\binom{n}{r} = \frac{n!}{r!(n-r)!}$ |
| 有序、有重复 | $n^r$ |
| 无序、有重复 | $\binom{n+r-1}{r}$ |


- 当所有基本结果等可能时，事件概率为 $P(\text{事件}) = \frac{\text{有利结果数}}{\text{结果总数}}$。计数帮助我们确定分子和分母。下一篇将形式化地定义概率。

## 编程任务（使用 Colab 或笔记本）

1. 使用阶乘公式和直接连乘，分别计算 $P(10, 3)$ 和 $\binom{10}{3}$。验证排列数始终是组合数的 $r!$ 倍。**编者注：**原文代码只展示了阶乘公式，没有展示直接连乘的实现。
```python
import jax.numpy as jnp
from math import factorial

n, r = 10, 3

perm = factorial(n) // factorial(n - r)
comb = factorial(n) // (factorial(r) * factorial(n - r))

print(f"P({n},{r}) = {perm}")
print(f"C({n},{r}) = {comb}")
print(f"P / C = {perm // comb} (should equal {r}! = {factorial(r)})")
```

2. 通过编程解决委员会问题（3名男性从8人，2名女性从6人），并通过枚举所有有效的委员会来验证。
```python
from itertools import combinations
from math import factorial

def comb_count(n, r):
    return factorial(n) // (factorial(r) * factorial(n - r))

# Formula approach
men_ways = comb_count(8, 3)
women_ways = comb_count(6, 2)
print(f"Formula: {men_ways} × {women_ways} = {men_ways * women_ways}")

# Enumeration approach
men = [f"M{i}" for i in range(1, 9)]
women = [f"W{i}" for i in range(1, 7)]
count = sum(1 for _ in combinations(men, 3) for _ in combinations(women, 2))
print(f"Enumeration: {count}")
```

3. 计算长度为 4、由 26 个小写字母组成的密码字符串总数（允许重复），再计算不含重复字母的字符串数量。
```python
from math import factorial

n = 26
r = 4

with_rep = n ** r
without_rep = factorial(n) // factorial(n - r)

print(f"With repetition:    {with_rep:>10,}")
print(f"Without repetition: {without_rep:>10,}")
print(f"Fraction with repeats: {1 - without_rep/with_rep:.2%}")
```

4. 模拟生日问题：在 $k$ 个人中，至少有两人共享生日的概率是多少？绘制概率从 $k = 1$ 到 $60$ 的图表，并找到它跨越 50% 的位置。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def birthday_prob_exact(k):
    """Probability of at least one shared birthday in group of k."""
    p_no_match = 1.0
    for i in range(k):
        p_no_match *= (365 - i) / 365
    return 1 - p_no_match

ks = list(range(1, 61))
probs = [birthday_prob_exact(k) for k in ks]

plt.figure(figsize=(8, 4))
plt.plot(ks, probs, color="#3498db", linewidth=2)
plt.axhline(y=0.5, color="#e74c3c", linestyle="--", alpha=0.7, label="50%")
cross = next(k for k, p in zip(ks, probs) if p >= 0.5)
plt.axvline(x=cross, color="#e74c3c", linestyle="--", alpha=0.7)
plt.xlabel("Group size (k)")
plt.ylabel("P(at least one shared birthday)")
plt.title(f"Birthday Problem (crosses 50% at k={cross})")
plt.legend()
plt.grid(alpha=0.3)
plt.show()
```
