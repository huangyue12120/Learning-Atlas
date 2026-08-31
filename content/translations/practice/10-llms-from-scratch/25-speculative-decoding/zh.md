---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/10-llms-from-scratch/25-speculative-decoding/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: a5ba5282949594418b8cbd2a5755aaf9c31ba95b1af75f077303e54fadd208f4
status: reviewed
---

# 推测解码与 EAGLE

> 前沿 LLM 生成一个词元，需要对数十亿参数做一次完整前向传播。这次前向传播通常严重过度配置：大多数时候，一个小得多的模型可以正确猜出接下来的 3–5 个词元，大模型只需要验证猜测。猜对时，你付出一次前向的价格却得到 5 个词元。推测解码（Leviathan 等，2023）用精确的接受/拒绝规则实现了这一点；EAGLE-3（2025）将每次验证的平均接受量推到了约 4.5 个词元，在保持输出分布不变的情况下加速 4–5 倍。

**类型：** 构建  
**语言：** Python（使用 numpy）  
**前置课程：** 第 10 阶段第 12 课（推理优化）、第 10 阶段第 04 课（预训练迷你 GPT）  
**用时：** 约 75 分钟

## 问题

在 H100 上，70B 级模型的解码吞吐量通常为每秒 40–80 个词元。每个词元都需要一次完整前向传播，从 HBM 读取全部模型权重。不改变输出就无法缩小模型，也不能超过内存容量增加批次大小。除非让模型每次前向生成多于一个词元，否则你无计可施。

自回归生成看起来天然是串行的：`x_{t+1} = sample(p(· | x_{1:t}))`。但其中有一个并发机会：如果有一个廉价预测器说“接下来 4 个词元可能是 [a, b, c, d]”，就可以让大模型在**一次前向传播**中验证全部 5 个位置，并接受最长匹配前缀。

Leviathan、Kalai、Matias（2023，《Fast Inference from Transformers via Speculative Decoding》）通过巧妙的接受/拒绝规则使这一过程保持精确，保留目标模型的采样分布。输出分布不变，速度提高 2–4 倍。

## 概念

### 双模型设置

- **目标模型** `M_p`：真正希望从中采样的巨大、缓慢、高质量模型，分布为 `p(x)`。
- **草稿模型** `M_q`：小型、快速、质量较低的模型，分布为 `q(x)`，规模小 5–30 倍。

每一步：

1. 草稿模型自回归地提出 K 个词元：`x_1, x_2, ..., x_K ~ q`。
2. 目标模型对全部 `K+1` 个位置做**一次**前向传播，并行产生每个候选词元的 `p(x_k)`。
3. 按下面的修正拒绝采样规则从左到右接受或拒绝每个词元，接受最长匹配前缀。
4. 如果任意词元被拒绝，就从修正分布采样替换词元并停止；否则从 `p(· | x_1...x_K)` 采样一个额外词元。

如果草稿与目标完美匹配，每次目标前向得到 K+1 个词元；如果第一个位置就错，只得到 1 个词元。

### 精确性规则 <!-- learning-atlas: the-exactness-rule -->

推测解码在分布上**严格等价于从 p 采样**。拒绝规则为：

```
For each drafted token x_t:
    r ~ Uniform(0, 1)
    if r < p(x_t) / q(x_t):
        accept x_t
    else:
        sample replacement from residual: (p - q)+ / ||(p - q)+||_1
        stop
```

其中 `(p - q)+` 表示逐点差值的正部。当草稿和目标一致（`p ≈ q`）时，接受率几乎为 1；不一致时，残差分布经过构造，使最终样本仍然严格服从 `p`。

**贪心情况。** 温度为 0 时，只需检查 `argmax(p) == x_t`。若相等就接受，否则输出 `argmax(p)` 并停止。

### 期望加速

如果草稿模型的词元级接受率为 `α`，每次目标前向预计生成的词元数为：

```
E[tokens] = (1 - α^{K+1}) / (1 - α)        # K = draft length, α in [0, 1]
```

当 `α = 0.8, K = 4` 时：`(1 - 0.8^5)/(1 - 0.8) = 3.36` 个词元/次前向。一次目标前向的成本约为 `cost_q * K + cost_p`（K 次草稿步骤加一次目标验证）。如果 `cost_p >> cost_q * K`，吞吐量加速比就是 `3.36× / 1 = 3.36×`。

真正的参数只有 `α`，它完全取决于草稿与目标的对齐程度。好的草稿器就是一切。

### 训练草稿器：蒸馏

随机的小模型不是好的草稿器。标准做法是从目标模型蒸馏：

1. 选择小型架构（70B 目标可用约 1B，7B 目标可用约 500M）。
2. 让目标模型处理大规模文本语料，保存其下一词元分布。
3. 使用目标分布的 KL 散度训练草稿模型，而不是使用真实词元监督。

结果是：代码上的 `α` 通常为 0.6–0.8，自然语言聊天为 0.7–0.85，生产环境加速约 2–3 倍。

### EAGLE：树形草稿 + 特征复用

Li、Wei、Zhang、Zhang（2024，《EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty》）发现标准推测解码有两个低效点：

1. 草稿器进行 K 次串行、全栈步骤。但它可以复用最近一次验证中目标模型的特征（隐藏状态）；目标模型已经计算了丰富表示，草稿器却从头重复计算。
2. 草稿器输出线性链。如果草稿器能输出**候选树**（每个节点提出多个猜测），目标模型就可以通过树注意力掩码在一次前向中并行验证多条候选路径，选择接受最长的分支。

EAGLE-1 的变化：

- 草稿输入 = 目标模型在位置 t 的最终隐藏状态，而不是原始词元。
- 草稿架构 = 1 个 Transformer 解码器层，而不是独立的小模型。
- 输出 = 每个深度 K = 4–8 个候选，深度为 4–6。

EAGLE-2（2024）增加动态树拓扑：草稿不确定时树变宽，有把握时保持窄。无需增加验证成本就能提高 `α_effective`。

EAGLE-3（Li 等，2025，《EAGLE-3: Scaling up Inference Acceleration of Large Language Models via Training-Time Test》）移除了固定顶层特征依赖，并用新的“测试时模拟”损失训练草稿器：训练目标是匹配目标模型测试时分布的输出，而不是教师强制训练分布。接受率从 EAGLE-2 的 0.75 提升到 EAGLE-3 的 0.82，每次验证的平均词元数从 3.0 提升到 4.5。

### 树注意力验证

当草稿器输出一棵树时，目标模型用**树注意力掩码**在一次前向中验证它——这是编码树拓扑而非纯线性的因果掩码。每个词元只关注自己在树上的祖先。验证仍然是一次前向、一次矩阵乘法；拓扑掩码只增加少量 KV 条目。

```
        root
       /    \
      a      b
     / \    / \
    c  d   e   f
```

如果 `a, b` 是两个竞争的首词元候选，`c, d, e, f` 是第二词元候选，则六个位置都能在一次前向中验证。输出是任一被接受路径上的最长前缀。

### 何时有效，何时无效

**有效：**

- 具有可预测文本的聊天/补全（代码、常见英文、结构化输出），`α` 较高。
- 解码阶段有未使用 GPU 计算资源的场景（受内存限制），树形草稿可以利用空闲 FLOP。

**无效或收益很小：**

- 高温度创作等高度随机输出，`α` 会降到 `1/|vocab|` 附近。
- 极高并发的批处理服务，批次已经填满 FLOP，树验证空间很少。
- 目标模型很小，草稿器并没有小很多。

生产团队通常报告聊天 2–3 倍、代码生成 3–5 倍、创作写作接近零的墙钟加速。

```figure
speculative-decoding
```

## 动手实现

`code/main.py` 包含：

- 参考实现 `speculative_decode(target, draft, prompt, K, temperature)`，实现精确拒绝规则，并验证其保留目标分布（相对普通目标采样的经验 KL < 0.01）。
- EAGLE 风格树草稿器，用 top-p 分支构建深度为 K 的树。
- 树注意力掩码构建器，为验证器生成正确的因果模式。
- 接受率测试工具，在小型 LM 上同时运行二者（从 GPT-2-medium 目标蒸馏一个 GPT-2-small）。

```python
def speculative_step(p_target, q_draft, K, temperature=1.0):
    """One round of speculative decoding. Returns list of accepted tokens."""
    # 1. Draft K tokens
    draft_tokens = []
    q_probs = []
    state = draft_state_init()
    for _ in range(K):
        probs = softmax(q_draft(state) / temperature)
        t = np.random.choice(len(probs), p=probs)
        draft_tokens.append(t)
        q_probs.append(probs[t])
        state = draft_step(state, t)

    # 2. Target computes p at every drafted position + 1 extra
    p_probs_all = target_forward_batched(p_target, draft_tokens, temperature)

    # 3. Accept/reject left-to-right
    accepted = []
    for k, tok in enumerate(draft_tokens):
        r = np.random.uniform()
        if r < p_probs_all[k][tok] / q_probs[k]:
            accepted.append(tok)
        else:
            residual = np.maximum(p_probs_all[k] - q_probs[k], 0)
            residual /= residual.sum()
            accepted.append(np.random.choice(len(residual), p=residual))
            return accepted
    # 4. All K accepted → sample bonus token from target
    accepted.append(np.random.choice(len(p_probs_all[-1]), p=p_probs_all[-1]))
    return accepted
```

## 使用它

- **vLLM** 和 **SGLang** 原生支持推测解码，参数为 `--speculative_model`、`--num_speculative_tokens`；EAGLE-2/3 可通过 `--spec_decoding_algorithm eagle` 启用。
- **NVIDIA TensorRT-LLM** 原生支持 Medusa 和 EAGLE 树。
- **参考草稿模型：** `Qwen/Qwen3-0.6B-spec`（为 Qwen3-32B 起草）、`meta-llama/Llama-3.2-1B-Instruct-spec`（为 70B 起草）。
- **Medusa 头**（Cai 等，2024，《Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads》）：不使用草稿模型，而是在目标模型本身增加 K 个并行预测头。部署更简单，但接受率略低于 EAGLE。

## 交付

本课产出 `outputs/skill-speculative-tuning.md`——一个根据目标模型工作负载选择草稿模型、K（草稿长度）、树宽、温度，以及何时回退到普通解码的 skill。

## 练习

1. 实现精确拒绝规则并经验验证。通过 `speculative_decode` 与普通目标采样各生成 10K 个样本，计算两个输出分布的全变差距离，应小于 0.01。

2. 计算加速公式。给定固定 `α` 和 `K`，绘制每次目标前向的期望词元数。对 α ∈ {0.5, 0.7, 0.9} 找到最佳 K。

3. 训练一个小草稿器。取 124M GPT-2 目标，在 100M 词元上用 KL 损失蒸馏 30M GPT-2 草稿，测量留出文本上的 `α`，预期为 0.6–0.7。

4. 实现 EAGLE 风格树草稿。不要输出链，而是在每个深度输出 top-3 分支，构建树注意力掩码，验证目标模型接受最长正确分支。

5. 测量失败模式。在 temperature=1.5（高随机性）下运行推测解码，展示 α 崩溃，以及由于草稿开销算法比普通解码更慢。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| 目标模型 | “大模型” | 希望从中采样的慢速高质量模型（p 分布） |
| 草稿模型 | “推测器” | 快速小型预测器（q 分布），小 5–30 倍 |
| K / 草稿长度 | “向前看” | 每次验证所推测的词元数 |
| α / 接受率 | “命中率” | 草稿提议被接受的词元级概率 |
| 精确拒绝规则 | “接受测试” | 保持目标分布的 `r < p/q` 比较 |
| 残差分布 | “修正后的 p-q” | 被拒绝时采样的 `(p - q)+ / ||(p - q)+||_1` 分布 |
| 树形草稿 | “分支推测” | 草稿输出候选树，在一次前向中用树结构注意力验证 |
| 树注意力掩码 | “拓扑掩码” | 编码树拓扑的因果掩码，使每个节点只能关注祖先 |
| Medusa 头 | “并行头” | 目标模型自身的 K 个额外预测头，不需要独立草稿模型 |
| EAGLE 特征复用 | “隐藏状态草稿” | 草稿输入是目标模型最后的隐藏状态，而非原始词元，从而缩小草稿器 |
| 测试时模拟损失 | “EAGLE-3 训练” | 让草稿器训练在匹配目标模型测试时分布的输出上，而非教师强制分布 |

## 延伸阅读

- [Leviathan, Kalai, Matias, 2023 — “Fast Inference from Transformers via Speculative Decoding”](https://arxiv.org/abs/2211.17192) — 精确拒绝规则与理论加速分析
- [Chen, Borgeaud, Irving et al., 2023 — “Accelerating Large Language Model Decoding with Speculative Sampling”](https://arxiv.org/abs/2302.01318) — DeepMind 的并行推测采样论文
- [Cai, Li, Geng, Wang, Wang, Zhu, Dao, 2024 — “Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads”](https://arxiv.org/abs/2401.10774) — 相对于草稿模型的并行头方案
- [Li, Wei, Zhang, Zhang, 2024 — “EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty”](https://arxiv.org/abs/2401.15077) — 特征复用与树形草稿
- [Li et al., 2024 — “EAGLE-2: Faster Inference of Language Models with Dynamic Draft Trees”](https://arxiv.org/abs/2406.16858) — 动态树拓扑
- [Li et al., 2025 — “EAGLE-3: Scaling up Inference Acceleration of Large Language Models via Training-Time Test”](https://arxiv.org/abs/2503.01840) — 训练时与测试时匹配
- [Fu, Haotian, Peng et al., 2024 — “Break the Sequential Dependency of LLM Inference Using Lookahead Decoding”](https://arxiv.org/abs/2402.02057) — 无推测器的 Jacobi/前瞻解码替代方案
