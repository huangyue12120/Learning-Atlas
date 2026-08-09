"""本课练习：优化器更新规则。"""


def gradient_descent_step(params, gradients, learning_rate):
    raise NotImplementedError("实现普通梯度下降")


def momentum_step(params, gradients, velocity, learning_rate, momentum):
    raise NotImplementedError("实现带动量的 SGD")


def exponential_learning_rate(initial_rate, step, decay=0.999):
    raise NotImplementedError("实现指数学习率衰减")
