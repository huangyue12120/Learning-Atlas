"""本课练习：稳定 softmax、log-sum-exp、CE 与梯度裁剪。"""

def stable_softmax(logits):
    raise NotImplementedError("实现 max-subtraction softmax")


def logsumexp(values):
    raise NotImplementedError("实现稳定 log-sum-exp")


def cross_entropy(true_class, logits):
    raise NotImplementedError("实现稳定交叉熵")


def clip_by_norm(gradients, max_norm):
    raise NotImplementedError("实现按范数裁剪")
