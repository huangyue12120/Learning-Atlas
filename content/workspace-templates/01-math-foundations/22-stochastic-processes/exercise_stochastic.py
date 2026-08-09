"""第 22 课练习：补全随机过程实现，并在 test_exercise_stochastic.py 中验证。"""


def stationary_distribution(transition_matrix, iterations=1000):
    """以 power method 求 row-stochastic matrix 的 stationary distribution。"""
    raise NotImplementedError("实现 repeated distribution @ P")


def metropolis_hastings(target_log_prob, proposal_std, x0, n_samples, seed=None):
    """实现 log-space Metropolis-Hastings，并返回 samples 和 acceptance rate。"""
    raise NotImplementedError("实现 proposal 和 accept/reject")


def diffusion_forward(signal, n_steps, beta_start=0.0001, beta_end=0.02, seed=None):
    """以线性 beta schedule 为一维 signal 逐步加 Gaussian noise。"""
    raise NotImplementedError("实现 forward diffusion")
