"""运行：python temperature_sampling.py；改变 temperature 看概率质量如何重排。"""
import math
logits = [3.0, 2.0, 1.0, 0.0]
for temperature in (0.5, 1.0, 2.0):
    scaled = [x / temperature for x in logits]
    exps = [math.exp(x - max(scaled)) for x in scaled]
    probabilities = [x / sum(exps) for x in exps]
    print(f"T={temperature}: {[round(p, 3) for p in probabilities]}")
