---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/07-transformers-deep-dive/11-mixture-of-experts/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 9cad0d164da113440d4ed64d0ac4c32d79af89a2a6ffd5126fe28a24f538700c
status: reviewed
---

# 混合专家模型（MoE）

> 一个稠密的 70B Transformer 会为每个词元激活全部参数。一个 671B MoE 每个词元只激活 37B 参数，却在所有基准上胜过前者。稀疏性是过去十年最重要的扩展思想。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 7 第 05 课（完整 Transformer）、Phase 7 第 07 课（GPT）  
**预计时间：** 约 45 分钟

## 问题

稠密 Transformer 的推理 FLOPs 与参数量相等（前向传播时再乘以 2）。扩大稠密模型时，每个词元都要承担全部计算成本。到 2024 年，前沿模型已撞上算力墙：若想显著提高智能水平，每个词元所需的 FLOPs 就要指数级增长。

混合专家模型（Mixture of Experts，MoE）打破了这种绑定关系。把每个 FFN 替换为 `E` 个相互独立的专家，再加上一个为每个词元选择 `k` 个专家的路由器。总参数量 = `E × FFN_size`，每个词元的活跃参数量 = `k × FFN_size`。2026 年的典型配置为 `E=256`、`k=8`。存储量随 `E` 扩展，计算量则随 `k` 扩展。

2026 年的前沿模型几乎全是 MoE：DeepSeek-V3（总参数 671B / 活跃参数 37B）、Mixtral 8×22B、Qwen2.5-MoE、Llama 4、Kimi K2、gpt-oss。在 Artificial Analysis 的独立排行榜上，排名前十的开源模型全都是 MoE。

## 概念

![MoE 层：路由器为每个词元从 E 个专家中选择 k 个](../assets/moe.svg)

### 替换 FFN

稠密 Transformer 块：

```
h = x + attn(norm(x))
h = h + FFN(norm(h))
```

MoE 块：

```
h = x + attn(norm(x))
scores = router(norm(h))              # (N_tokens, E)
top_k = argmax_k(scores)              # pick k of E per token
h = h + sum_{e in top_k}(
        gate(scores[e]) * Expert_e(norm(h))
    )
```

每个专家都是一个独立的 FFN（通常为 SwiGLU）。路由器只是一个线性层。每个词元选择自己的 `k` 个专家，并接收这些专家输出的门控混合。

### 负载均衡问题

如果路由器让 90% 的词元都经过专家 3，其他专家就得不到训练。业界尝试过三种修复方案：

1. **辅助负载均衡损失**（Switch Transformer、Mixtral）。添加一个与专家使用率方差成比例的惩罚项。它有效，但会引入一个超参数和第二路梯度信号。
2. **专家容量与词元丢弃**（早期 Switch）。每个专家最多处理 `C × N/E` 个词元；溢出的词元跳过这一层。这会损害质量。
3. **无辅助损失的均衡**（DeepSeek-V3）。为每个专家添加一个可学习偏置，移动路由器的 top-k 选择。偏置在训练损失之外更新，不对主目标施加惩罚。这是 2024 年的一项重大突破。

DeepSeek-V3 的做法是：每个训练步结束后，逐个检查专家使用率高于还是低于目标值，并将其偏置调整 `±γ`。选择过程使用 `scores + bias`，门控所用的专家概率仍然来自未经修改的原始 `scores`。这样便把路由选择与表达能力解耦。

### 共享专家

DeepSeek-V2/V3 还把专家分为*共享专家*与*路由专家*。每个词元都经过全部共享专家，再通过 top-k 选择路由专家。共享专家负责捕获通用知识，路由专家则形成专门能力。V3 使用 1 个共享专家，外加从 256 个路由专家中选择的前 8 个。

### 细粒度专家

经典 MoE（GShard、Switch）中，每个专家都和完整 FFN 一样宽。`E` 较小（8～64），`k` 也较小（1～2）。

现代细粒度 MoE（DeepSeek-V3、Qwen-MoE）中，每个专家更窄（完整 FFN 大小的 1/8）。`E` 较大（256+），`k` 也更大（8+）。总参数量相同，但可用组合的数量增长得快得多。`C(256, 8) = 400 trillion`，即每个词元有 400 万亿种可能的“专家”组合。质量提高，而延迟保持不变。

### 成本构成

每个词元、每一层的成本如下：

| 配置 | 每个词元的活跃参数 | 总参数量 |
|------|--------------------|----------|
| Mixtral 8×22B | 约 39B | 141B |
| Llama 3 70B（稠密） | 70B | 70B |
| DeepSeek-V3 | 37B | 671B |
| Kimi K2（MoE） | 约 32B | 1T |

DeepSeek-V3 几乎在所有基准上都胜过 Llama 3 70B（稠密），同时**每个词元使用的活跃 FLOPs 更少**。参数越多，能容纳的知识越多；活跃 FLOPs 越多，每个词元的计算量越大。MoE 把二者解耦了。

### 代价：内存

无论哪些专家被激活，所有专家都必须驻留在 GPU 上。一个 671B 模型用 fp16 存储权重约需 1.3 TB 显存。部署前沿 MoE 需要专家并行：把专家分片到多个 GPU，并通过网络路由词元。此时延迟主要由全对全通信决定，而不是矩阵乘法。

```figure
expert-routing
```

## 动手构建

参见 `code/main.py`。我们将用纯标准库实现一个紧凑的 MoE 层，其中包含：

- `n_experts=8` 个类似 SwiGLU 的专家（为便于演示，每个专家只包含一个线性层）
- top-k=2 路由
- 经 softmax 归一化的门控权重
- 通过逐专家偏置实现的无辅助损失均衡

### 第 1 步：路由器

```python
def route(hidden, W_router, top_k, bias):
    scores = [sum(h * w for h, w in zip(hidden, W_router[e])) for e in range(len(W_router))]
    biased = [s + b for s, b in zip(scores, bias)]
    top_idx = sorted(range(len(biased)), key=lambda i: -biased[i])[:top_k]
    # softmax over ORIGINAL scores of the chosen experts
    chosen = [scores[i] for i in top_idx]
    m = max(chosen)
    exps = [math.exp(c - m) for c in chosen]
    s = sum(exps)
    gates = [e / s for e in exps]
    return top_idx, gates
```

偏置影响专家选择，不影响门控权重。这正是 DeepSeek-V3 的技巧——偏置可以纠正负载不均，却不会改变模型的预测方向。

### 第 2 步：让 100 个词元通过路由器

记录每个专家被激活的次数。没有偏置时，使用率会发生倾斜；加入偏置更新循环（过度使用的专家减去 `γ`，使用不足的专家加上 `γ`）后，经过几轮迭代，使用率会收敛到均匀分布。

### 第 3 步：比较参数量

打印一个 MoE 配置对应的“稠密等价”参数量。采用近似 DeepSeek-V3 的配置：256 个路由专家 + 1 个共享专家、8 个活跃专家、d_model=7168。总参数量大得惊人，而活跃参数量只有稠密 Llama 3 70B 的七分之一。

## 使用方法

通过 HuggingFace 加载：

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
model = AutoModelForCausalLM.from_pretrained("mistralai/Mixtral-8x22B-v0.1")
```

在 2026 年的生产推理中，vLLM 原生支持 MoE 路由，SGLang 则拥有最快的专家并行路径。二者都会自动处理 top-k 选择和专家并行。

**适合选择 MoE 的情况：**
- 希望用更低的每词元推理成本获得前沿质量。
- 拥有足够显存或专家并行基础设施。
- 工作负载以词元量为主（聊天、代码），而不是以上下文长度为主（长文档）。

**不适合选择 MoE 的情况：**
- 边缘部署——无论活跃 FLOPs 多少，都要承担完整存储成本。
- 对单用户延迟要求极高的服务——专家路由会增加开销。
- 小模型（<7B）——MoE 的质量优势只会在超过某个计算阈值（约 6B 活跃参数）后出现。

## 交付成果

参见 `outputs/skill-moe-configurator.md`。这个技能会根据参数预算、训练词元量和部署目标，为新的 MoE 选择 E、k 和共享专家布局。

## 练习

1. **简单。** 运行 `code/main.py`。观察无辅助损失的偏置更新如何在 50 次迭代中逐渐均衡专家使用率。
2. **中等。** 用基于哈希的路由器（确定性、不学习）替换可学习路由器。比较二者的质量和负载均衡效果。为什么可学习路由器更好？
3. **困难。** 实现 GRPO 风格的“与 rollout 匹配的路由”（DeepSeek-V3.2 技巧）：记录推理期间激活了哪些专家，并在梯度计算期间强制使用相同路由。测量它对一个简单策略梯度实验的影响。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 专家 | “许多 FFN 中的一个” | 一个独立的前馈网络；其参数专用于 FFN 计算中的一个稀疏子集。 |
| 路由器 | “门控” | 一个很小的线性层，它为每个词元与每个专家的匹配打分，再执行 top-k 选择。 |
| Top-k 路由 | “每个词元激活 k 个专家” | 每个词元的 FFN 计算恰好经过 k 个专家，并由门控加权。 |
| 辅助损失 | “负载均衡惩罚” | 惩罚专家使用率倾斜的额外损失项。 |
| 无辅助损失 | “DeepSeek-V3 的技巧” | 仅在路由器选择时通过逐专家偏置实现均衡；没有额外梯度。 |
| 共享专家 | “始终开启” | 每个词元都会经过的额外专家；负责捕获通用知识。 |
| 专家并行 | “按专家分片” | 把不同专家分布到不同 GPU，并通过网络路由词元。 |
| 稀疏性 | “活跃参数 < 总参数” | 比率 `k × expert_size / (E × expert_size)`；DeepSeek-V3 为 37/671 ≈ 5.5%。 |

## 延伸阅读

- [Shazeer 等（2017），《Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer》](https://arxiv.org/abs/1701.06538)——思想起点。
- [Fedus、Zoph、Shazeer（2022），《Switch Transformer: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity》](https://arxiv.org/abs/2101.03961)——经典 MoE：Switch。
- [Jiang 等（2024），《Mixtral of Experts》](https://arxiv.org/abs/2401.04088)——Mixtral 8×7B。
- [DeepSeek-AI（2024），《DeepSeek-V3 Technical Report》](https://arxiv.org/abs/2412.19437)——MLA + 无辅助损失 MoE + MTP。
- [Wang 等（2024），《Auxiliary-Loss-Free Load Balancing Strategy for Mixture-of-Experts》](https://arxiv.org/abs/2408.15664)——基于偏置的负载均衡论文。
- [Dai 等（2024），《DeepSeekMoE: Towards Ultimate Expert Specialization in Mixture-of-Experts Language Models》](https://arxiv.org/abs/2401.06066)——本课路由器采用的细粒度专家与共享专家拆分方案。
- [Kim 等（2022），《DeepSpeed-MoE: Advancing Mixture-of-Experts Inference and Training》](https://arxiv.org/abs/2201.05596)——最早提出共享专家的论文。
