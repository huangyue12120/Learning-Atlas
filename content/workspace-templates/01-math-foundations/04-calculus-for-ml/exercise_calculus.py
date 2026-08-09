"""本课练习：从零实现导数、梯度、梯度下降和 Hessian。"""


def numerical_derivative(f, x, h=1e-7):
    """以中心差分返回 f 在 x 处的一阶导数近似。"""
    raise NotImplementedError("实现 numerical_derivative")


def numerical_gradient(f, point, h=1e-7):
    """返回标量函数 f 在 point 处的数值梯度。"""
    raise NotImplementedError("实现 numerical_gradient")


def gradient_descent_1d(f, df, x0, lr=0.1, steps=20):
    """返回梯度下降后的 x 和 (step, x, loss) 历史。"""
    raise NotImplementedError("实现 gradient_descent_1d")


def hessian_2d(f, x, y, h=1e-5):
    """用有限差分返回二维 Hessian。"""
    raise NotImplementedError("实现 hessian_2d")
