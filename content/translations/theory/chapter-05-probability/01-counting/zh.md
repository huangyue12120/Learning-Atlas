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
# 计数原理

*计数原理为概率提供离散组合的基础。本篇介绍乘法与加法原理、排列、组合、重复计数和二项式系数，为后续概率模型建立可验证的样本空间。*


* 计算是计算概率的前提条件,你必须知道有多少结果存在才能指定概率. 该文件涵盖了乘法和加法规则、因子、相通、组合以及二元系数、支持取样的组合工具、散列和概率分析。*

- 在计算概率之前,我们需要计算结果。如果你想知道在扑克中画一只胜利之手的机会,你首先需要知道有多少可能的手存在,其中多少是胜利者. 计数是使概率精确的机械.

- 最简单的计数原则是**乘法规则**. 如果有一个决定$m$选项和第二个独立决定$n$选项,合并结果的总数是:$m \times n$.

- 早上换好衣服 你有3件衬衫和4条裤子 每件衬衫都可以和裤子搭配,给你$3 \times 4 = 12$可能的服装。

![树图显示3件衬衫乘以4条裤子等于12件衣服](../images/counting_outfits.svg)

- 乘法通则延伸至任意选择数. 如果你还有两双鞋, 整个衣服就变成了$3 \times 4 \times 2 = 24$。。。每个新的独立选择将数相乘.

- **附加规则**处理"或"情景. 如果事件A可能发生在$m$B级事件的方式$n$两种方式不能同时发生(相互排斥),$m + n$.

- 假设您可以通过汽车(3条路线)或火车(2条路线)从城市X前往城市Y. 两者不能同时进行 所以总的选项是$3 + 2 = 5$.

- 当事件重叠时,需要减去被重复计算的结果. 若为$A$财务报告和已审计财务报表$B$可以共取,计数是$|A \cup B| = |A| + |B| - |A \cap B|$。。。这就是包容-排斥原则,在我们讨论概率附加规则时,它会再现.

- 非负整数的**因素**$n$是所有正整数的产物,直到$n$:

$$n! = n \times (n-1) \times (n-2) \times \cdots \times 2 \times 1$$

- 将因子视为答案:你能以多少方式安排$n$单行中不同的物体? 三本书可以放在书架上$3! = 3 \times 2 \times 1 = 6$办法 根据公约,$0! = 1$.

- 因素生长极快.$10! = 3{,}628{,}800$财务报告和已审计财务报表$20!$已经结束了$2.4 \times 10^{18}$。。。这种爆炸性的增长是野蛮武力搜索在组合问题中变得不切实际的原因。

- ** 体积** 是指对物体的指令性安排。当你选的时候$r$从$n$不同对象和顺序事项,排列次数为:

$$P(n, r) = \frac{n!}{(n - r)!}$$

- 想象一下,从10人的俱乐部中挑选一个总统、副总统和司库。第一角色有10名候选人,第二角色有9名剩余,第三角色有8名. 这样就$P(10, 3) = 10 \times 9 \times 8 = 720$。。。该公式证实了这一点:$\frac{10!}{7!} = 720$.

- ** 合并** 是一种无序选择。当你选的时候$r$从$n$命令不重要 我们把多余的命令分开

$$C(n, r) = \binom{n}{r} = \frac{n!}{r!(n - r)!}$$

- 标记$\binom{n}{r}$改为“n choice r”。关键的观点是,每个组合都对应$r!$定型(常规$r$所选项目可以重排到$r!$因此,我们把表层计数除以$r!$.

![相邻比较: 排列数计出所有订单,组合崩溃的同组](../images/permutation_vs_combination.svg)

- 例:从一十人组,能分出多少个方法来组成由三人组成的委员会? 秩序并不重要(没有总统或副总统,只有成员),所以我们使用组合:

$$\binom{10}{3} = \frac{10!}{3! \cdot 7!} = \frac{10 \times 9 \times 8}{3 \times 2 \times 1} = 120$$

- 同样的10人生产720个排出,但只有120个组合,因为每个组的3个组都有$3! = 6$内部订单。

- 组合是概率的核心。二元系数$\binom{n}{r}$计数精确获取方式的数量$r$成绩$n$试验,这是二分位分布的核心(档案03所覆盖).

- 让我们处理一个典型的委员会问题,把多种计数想法结合起来。

- ** 问题**:俱乐部有8名男子和6名女子。有多少种方式可以组成一个5人委员会,它包括3个男人和2个女人?

- ** 第1步**:从8名选出3名男子。

$$\binom{8}{3} = \frac{8!}{3! \cdot 5!} = \frac{8 \times 7 \times 6}{3 \times 2 \times 1} = 56$$

- ** 第2阶段**:从6个选择2个妇女。

$$\binom{6}{2} = \frac{6!}{2! \cdot 4!} = \frac{6 \times 5}{2 \times 1} = 15$$

- ** 第3行**:适用乘法规则。每个选择的男子可以与每个选择的妇女配对:

$$56 \times 15 = 840 \text{ committees}$$

- 这种图案将复杂的计数问题打破为独立的子选择并进行相乘,是梳理学中的标准方法.

- 也有重复的**活性**. 当项目可以重复时,选择$r$从$n$类型$n^r$结果。使用 0-9 位数的四位数 PIN 有$10^4 = 10{,}000$可能性。。。每个位置都有10个选项,而乘法规则处理其余的.

- ** 重复的组合**(也叫"明星和条子") 计算选择的方法有多少$r$从$n$允许重复且命令无关紧要时的类型 :

$$\binom{n + r - 1}{r} = \frac{(n + r - 1)!}{r!(n - 1)!}$$

- 示例:从4个冰淇淋花香中选择3个勺子(允许重复)$\binom{4 + 3 - 1}{3} = \binom{6}{3} = 20$选项。

- 为总结计算工具包:

|Scenario|Formula|
|---|---|
|Ordered, no repetition (permutation)|$P(n,r) = \frac{n!}{(n-r)!}$|
|Unordered, no repetition (combination)|$\binom{n}{r} = \frac{n!}{r!(n-r)!}$|
|Ordered, with repetition|$n^r$|
|Unordered, with repetition|$\binom{n+r-1}{r}$|

- 涉及同样可能的结果的每一种概率计算都使用公式$P(\text{event}) = \frac{\text{favourable outcomes}}{\text{total outcomes}}$。。。数数给我们两个数字。有了这个基础,我们准备在下一个文档中正式确定概率。

## 编程任务（使用 Colab 或 notebook)



1. 计算$P(10, 3)$财务报告和已审计财务报表$\binom{10}{3}$使用系数公式和直接计算。验证常态计数总是$r!$乘以组合数。
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

2. 以方案方式解决委员会问题(8个男性,8个女性,6个女性,3个男性,2个女性),并通过列举所有有效的委员会进行核实。
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

3. 计出26个小写字母(允许重复)可以制取多少个4个字符的密码. 然后数下有多少个没有重复的字母.
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

4. 模拟生日问题:在一组$k$各位,至少两个生日的概率是多少? 绘制概率$k = 1$改为$60$并找到它穿过50%的地方。
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
