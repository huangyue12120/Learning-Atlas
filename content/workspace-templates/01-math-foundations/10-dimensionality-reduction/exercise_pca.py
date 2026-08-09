"""本课练习：PCA 的中心化、投影与重建。"""

import numpy as np


def center(X):
    raise NotImplementedError("返回中心化数据和每列均值")


def project(X_centered, components):
    raise NotImplementedError("投影到主成分")


def inverse_transform(X_reduced, components, mean):
    raise NotImplementedError("由主成分重建数据")


def reconstruction_mse(X, reconstructed):
    raise NotImplementedError("计算重建均方误差")
