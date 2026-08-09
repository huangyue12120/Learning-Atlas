"""本课练习：用 Python 从零实现最小的向量与矩阵操作。"""


class Vector:
    def __init__(self, components):
        self.components = list(components)

    def dot(self, other):
        """返回两个同维向量的点积；维度不同时抛出 ValueError。"""
        raise NotImplementedError("实现 Vector.dot")

    def magnitude(self):
        """返回向量长度。"""
        raise NotImplementedError("实现 Vector.magnitude")

    def normalize(self):
        """返回单位向量；零向量不能归一化，应抛出 ValueError。"""
        raise NotImplementedError("实现 Vector.normalize")

    def project_onto(self, other):
        """返回 self 在 other 方向上的投影；other 为零向量时抛出 ValueError。"""
        raise NotImplementedError("实现 Vector.project_onto")


class Matrix:
    def __init__(self, rows):
        self.rows = [list(row) for row in rows]

    def multiply_vector(self, vector):
        """返回矩阵与向量的乘积；形状不匹配时抛出 ValueError。"""
        raise NotImplementedError("实现 Matrix.multiply_vector")
