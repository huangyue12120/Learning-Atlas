"""改变步数和重复次数，观察 random walk 的标准差接近 sqrt(n)。"""

import numpy as np


def final_positions(n_steps, n_walks, seed=42):
    rng = np.random.RandomState(seed)
    steps = rng.choice([-1, 1], size=(n_walks, n_steps))
    return steps.sum(axis=1)


for n_steps in (100, 1_000, 10_000):
    finals = final_positions(n_steps, n_walks=5_000)
    print(
        f"n={n_steps:>5}: mean={finals.mean():>7.3f}, "
        f"std={finals.std():>7.3f}, sqrt(n)={np.sqrt(n_steps):>7.3f}"
    )
