# 运行：marimo edit bootstrap_intervals.py，或 python bootstrap_intervals.py
"""改变样本量与重采样次数，观察 bootstrap 均值区间如何收窄。"""

import random

random.seed(42)


def percentile(data, p):
    values = sorted(data)
    position = p / 100 * (len(values) - 1)
    lower, upper = int(position), min(int(position) + 1, len(values) - 1)
    return values[lower] * (upper - position) + values[upper] * (position - lower)


def bootstrap_mean_interval(data, repeats=2_000):
    n = len(data)
    means = sorted(sum(random.choice(data) for _ in range(n)) / n for _ in range(repeats))
    return percentile(means, 2.5), percentile(means, 97.5)


if __name__ == "__main__":
    for n in (20, 100, 500):
        sample = [random.expovariate(1) for _ in range(n)]
        low, high = bootstrap_mean_interval(sample)
        print(f"n={n:3}: mean={sum(sample)/n:.3f}; 95% bootstrap CI=[{low:.3f}, {high:.3f}]")
