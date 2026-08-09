"""运行：python newton_vs_gradient.py。"""
x_newton, x_gd = 3.0, 3.0
for step in range(5):
    gradient = lambda x: 10*x + 3
    x_newton -= gradient(x_newton) / 10
    x_gd -= 0.1 * gradient(x_gd)
    print(step + 1, round(x_newton, 6), round(x_gd, 6))
