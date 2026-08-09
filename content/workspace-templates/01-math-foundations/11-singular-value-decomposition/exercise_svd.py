"""本课练习：截断 SVD、重建、压缩率和伪逆。"""

import numpy as np


def reconstruct(U, singular_values, Vt):
    raise NotImplementedError("实现 U @ diag(S) @ Vt")


def compression_ratio(rows, cols, rank):
    raise NotImplementedError("计算 rank-k SVD 存储比例")


def truncated_reconstruction(matrix, rank):
    raise NotImplementedError("用 numpy SVD 的前 rank 项重建")


def pseudoinverse(A, tolerance=1e-10):
    raise NotImplementedError("实现 Moore-Penrose 伪逆")
