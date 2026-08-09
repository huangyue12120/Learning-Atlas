"""运行：python pivoting_stability.py，比较小主元与行交换后的 multiplier。"""
a = [[0.001, 1.0], [1.0, 1.0]]
b = [1.001, 2.0]
print(f"不换行 multiplier: {a[1][0] / a[0][0]:.0f}")
a[0], a[1] = a[1], a[0]
b[0], b[1] = b[1], b[0]
print(f"partial pivoting 后 multiplier: {a[1][0] / a[0][0]:.3f}")
