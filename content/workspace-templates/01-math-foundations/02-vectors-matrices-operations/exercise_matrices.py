"""本课练习：从零实现矩阵乘法、偏置广播、逆矩阵和 ReLU。"""


class Matrix:
    def __init__(self, data):
        if not data or not data[0] or any(len(row) != len(data[0]) for row in data):
            raise ValueError("Matrix data must be a non-empty rectangle")
        self.data = [list(row) for row in data]
        self.rows = len(self.data)
        self.cols = len(self.data[0])
        self.shape = (self.rows, self.cols)

    def matmul(self, other):
        """返回矩阵积；内侧维度不相等时抛出 ValueError。"""
        raise NotImplementedError("实现 Matrix.matmul")

    def add_bias(self, bias):
        """把形状为 (1, n) 的偏置广播并加到每一行。"""
        raise NotImplementedError("实现 Matrix.add_bias")

    def inverse_2x2(self):
        """返回 2×2 矩阵的逆；非 2×2 或奇异矩阵应抛出 ValueError。"""
        raise NotImplementedError("实现 Matrix.inverse_2x2")


def relu(matrix):
    """返回逐元素 ReLU 结果。"""
    raise NotImplementedError("实现 relu")
