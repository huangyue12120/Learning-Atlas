"""本课练习：熵、交叉熵、KL 与困惑度。"""

import math


def entropy(probabilities, base=2):
    raise NotImplementedError("实现 entropy")


def cross_entropy(true_distribution, predicted_distribution, base=2):
    raise NotImplementedError("实现 cross_entropy")


def kl_divergence(p, q, base=2):
    raise NotImplementedError("实现 KL 散度")


def perplexity(average_cross_entropy, base="e"):
    raise NotImplementedError("实现 perplexity")
