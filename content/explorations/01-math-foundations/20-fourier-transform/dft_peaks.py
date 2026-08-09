import cmath
import math
signal = [1, 0, -1, 0]
for k in range(len(signal)):
    coefficient = sum(x * cmath.exp(-2j * math.pi * k * n / len(signal)) for n, x in enumerate(signal))
    print(k, round(abs(coefficient), 6))
