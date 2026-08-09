"""本课练习：贝叶斯后验、平滑与顺序更新。"""

def bayes(prior, likelihood, false_positive_rate):
    raise NotImplementedError("实现贝叶斯后验")

def laplace_probability(count, total, vocabulary_size, smoothing=1.0):
    raise NotImplementedError("实现 Laplace 平滑")

def beta_update(alpha, beta, successes, failures):
    raise NotImplementedError("实现 Beta-Binomial 更新")

def probability_b_better(samples_a, samples_b):
    raise NotImplementedError("估计 P(B > A)")
