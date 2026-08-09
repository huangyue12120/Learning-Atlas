"""本课练习：为标量 Value 构建最小反向模式自动微分。"""


class Value:
    def __init__(self, data, children=(), op=""):
        self.data = float(data)
        self.grad = 0.0
        self._prev = set(children)
        self._op = op
        self._backward = lambda: None

    def __add__(self, other):
        raise NotImplementedError("实现加法及其反向规则")

    def __mul__(self, other):
        raise NotImplementedError("实现乘法及其反向规则")

    def relu(self):
        raise NotImplementedError("实现 ReLU 及其反向规则")

    def backward(self):
        raise NotImplementedError("实现拓扑排序和反向传播")
