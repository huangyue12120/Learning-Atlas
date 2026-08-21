---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/07-transformers-deep-dive/16-speculative-decoding/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: c69bf699512dd6d2b501316e7c32395ffac44b58d522a694f335964be3903eda
status: reviewed
---

# 推测解码——草拟、验证、重复

> 自回归解码是串行的，每个词元都要等待前一个词元。推测解码打破了这条链：廉价模型草拟 N 个词元，昂贵模型用一次前向传播验证全部 N 个。草稿正确时，只需一次大模型前向传播就能完成 N 次生成。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 7 第 07 课（GPT 因果语言模型）、Phase 7 第 12 课（KV 缓存与 Flash Attention）  
**预计时间：** 约 60 分钟

## 问题

一个 70B 大语言模型在 H100 上采样一个词元约需 30 ms，一个 3B 草稿模型约需 3 ms。如果让 3B 模型提前草拟 5 个词元，再让 70B 模型只运行*一次*来验证全部 5 个，总时间为 `5×3 + 30 = 45 ms`，最多可以接受 5 个词元；直接生成则需要 `5×30 = 150 ms`。推测解码以少量额外 GPU 内存（草稿模型）换取低 2～4 倍的解码延迟。

关键是必须保持原始分布。Leviathan 等（2023）与 Chen 等同时提出的推测采样，可以保证输出序列的分布与大模型独自生成时**完全相同**。不牺牲质量，只提高速度。

到 2026 年，以下四类草稿—验证器组合占据主流：

1. **基础推测解码（Leviathan，2023）。** 独立草稿模型（例如 Llama 3 1B）+ 验证器（例如 Llama 3 70B）。
2. **Medusa（Cai，2024）。** 验证器上的多个解码头并行预测位置 `t+1..t+k`，不需要独立草稿模型。
3. **EAGLE 系列（Li，2024、2025）。** 复用验证器隐藏状态的轻量草稿模型；接受率比基础方案更高；通常加速 3～4 倍。
4. **Lookahead 解码（Fu，2024）。** 使用雅可比迭代，完全不需要草稿模型。属于自推测方法，应用较窄，但没有外部依赖。

2026 年的每个生产推理栈都默认附带推测解码。vLLM、TensorRT-LLM、SGLang 和 llama.cpp 至少都支持基础方案与 EAGLE-2。

## 概念

### 核心算法

给定验证器 `M_q` 和更便宜的草稿模型 `M_p`：

1. 令 `x_1..x_k` 为已经解码的前缀。
2. **草拟：** 使用 `M_p` 自回归地提出 `d_{k+1}, d_{k+2}, ..., d_{k+N}`，其草稿概率为 `p_1..p_N`。
3. **并行验证：** 在 `x_1..x_k, d_{k+1}, ..., d_{k+N}` 上运行一次 `M_q`，得到位置 `k+1..k+N+1` 的验证器概率 `q_1..q_{N+1}`。
4. **从左到右接受或拒绝每个草稿词元：** 对每个 `i`，以概率 `min(1, q_i(d_i) / p_i(d_i))` 接受。
5. 在位置 `j` 第一次拒绝时：从归一化后的“残差”分布 `(q_j - p_j)_+` 中采样 `t_j`，丢弃 `j` 之后的全部草稿。
6. 若全部 `N` 个词元均被接受：从 `q_{N+1}` 再采样一个额外词元 `t_{N+1}`，即免费的奖励词元。

残差分布技巧是保证输出分布与 `M_q` 从头采样完全一致的数学关键。

### 哪些因素决定加速比

令 `α` 为每个草稿词元的期望接受率，`c` 为草稿模型与验证器的成本比。每个步骤中：

- 朴素生成每个词元都调用一次大模型。
- 推测解码在 `α` 较高时，每次大模型调用可生成 `(1 - α^{N+1}) / (1 - α) ≈ 1/(1-α)` 个词元。

一个常用经验值是：当 `α = 0.75`、`N = 5` 时，大模型调用次数减少 3 倍；草稿模型只付出 5 次低成本调用，总实际耗时降低约 2.5 倍。

**影响 α 的因素包括：**

- 草稿模型逼近验证器的程度。来自同一模型家族、使用相同训练数据会显著提高 α。
- 解码策略。贪心草稿与贪心验证器之间的 α 较高；温度采样更难匹配，接受率会下降。
- 任务类型。代码和结构化输出更容易接受（可预测性强），自由形式的创意写作则较低。

### Medusa——不使用草稿模型的草稿

Medusa 用验证器上的额外输出头替代草稿模型。在位置 `t`：

```
共享主干 → 隐藏状态 h_t
    ├── head_0：预测位置 t+1 的词元（标准 LM 头）
    ├── head_1：预测位置 t+2 的词元
    ├── head_2：预测位置 t+3 的词元
    ├── head_3：预测位置 t+4 的词元
```

每个头都输出自己的 logits。推理时，从每个头采样得到候选序列，再通过一次前向传播验证；树注意力方案会一次考虑所有候选续写。

优点是不需要第二个模型。缺点是会增加可训练参数，并需要一个监督微调阶段（约 1B 词元）；与优质草稿模型搭配的基础推测解码相比，接受率略低。

### EAGLE——复用隐藏状态，得到更好的草稿

EAGLE-1/2/3（Li 等，2024～2025）让草稿模型成为一个微型 Transformer，通常只有 1 层，并把验证器最后一层的隐藏状态作为输入。因为草稿模型能看到验证器的特征表示，其预测与验证器输出分布高度相关。接受率会从约 0.6（基础方案）上升到 0.85 以上。

EAGLE-3（2025）加入了候选续写的树搜索。vLLM 与 SGLang 已把 EAGLE-2/3 作为 Llama 3/4 和 Qwen 3 的默认推测路径。

### KV 缓存的腾挪

验证时会用一次前向传播把 `N` 个草稿词元送入验证器，这会让验证器的 KV 缓存增加 `N` 个条目。如果有草稿被拒绝，就必须把缓存回滚到已接受的前缀长度。

生产实现（vLLM 的 `--speculative-model`、TensorRT-LLM 的 LookaheadDecoder）会使用临时 KV 缓冲区处理：先写入，接受后再提交。概念不难，但实现细节很繁琐。

```figure
draft-verify-tokens
```

## 动手构建

参见 `code/main.py`。我们将实现推测采样的核心算法（拒绝步骤 + 残差分布），其中包含：

- 一个“大模型”：对手工编写的分布执行确定性 softmax，以便我们解析验证接受率的数学关系。
- 一个“草稿模型”：大模型分布的扰动版本。
- 一个接受 / 拒绝循环，产生与直接采样相同的边缘分布。

### 第 1 步：拒绝步骤

```python
def accept_or_reject(q_prob, p_prob, draft_token, u):
    ratio = q_prob / p_prob if p_prob > 0 else float("inf")
    return u < min(1.0, ratio)
```

`u` 是均匀随机数，`q_prob` 是验证器赋给草稿词元的概率，`p_prob` 是草稿模型的概率。Leviathan 定理指出：这个伯努利决策后接在拒绝时从残差分布采样，可以精确保持验证器的分布。

### 第 2 步：残差分布

```python
def residual_dist(q, p):
    raw = [max(0.0, qi - pi) for qi, pi in zip(q, p)]
    s = sum(raw)
    return [r / s for r in raw]
```

逐元素用 `q` 减去 `p`，把负值截断为零，再重新归一化。任何拒绝发生时，都从这个分布采样。

### 第 3 步：一个推测解码步骤

```python
def spec_step(prefix, q_model, p_model, N, rng):
    drafts = []
    p_probs = []
    ctx = list(prefix)
    for _ in range(N):
        p_dist = p_model(ctx)
        d = sample(p_dist, rng)
        drafts.append(d)
        p_probs.append(p_dist[d])
        ctx.append(d)

    q_dists = [q_model(prefix + drafts[:i]) for i in range(N + 1)]

    for i, d in enumerate(drafts):
        u = rng.random()
        q_prob = q_dists[i][d]
        p_prob = p_probs[i]
        if u < min(1.0, q_prob / p_prob if p_prob > 0 else float("inf")):
            prefix = prefix + [d]
        else:
            res = residual_dist(q_dists[i], p_model(prefix))
            prefix = prefix + [sample(res, rng)]
            return prefix
    prefix = prefix + [sample(q_dists[N], rng)]
    return prefix
```

接受 5 个词元，再得到 1 个奖励词元：一次验证器前向传播共生成 6 个词元。

### 第 4 步：测量接受率

在不同草稿质量水平下运行 10,000 次推测解码步骤，绘制接受率与草稿 / 验证器分布之间 KL 散度的关系。应当能看到清晰的单调关系。

### 第 5 步：验证分布等价性

进行经验验证：推测循环生成的词元直方图应与直接从验证器采样得到的直方图一致。这与 Leviathan 定理一致。卡方检验会确认二者的差异处于采样误差范围内。

## 使用方法

生产部署：

```bash
# vLLM with EAGLE
vllm serve meta-llama/Llama-3.1-70B-Instruct \
    --speculative-model /models/llama-3.1-eagle-70b \
    --speculative-draft-tensor-parallel-size 1 \
    --num-speculative-tokens 5

# vLLM with vanilla draft model
vllm serve meta-llama/Llama-3.1-70B-Instruct \
    --speculative-model meta-llama/Llama-3.2-1B-Instruct \
    --num-speculative-tokens 5
```

截至 2026 年中，TensorRT-LLM 拥有最快的 Medusa 路径。`faster-whisper` 则用一个小型草稿模型为 Whisper-large 封装了推测解码。

**选择草稿方案：**

| 策略 | 适用时机 | 加速比 |
|------|----------|--------|
| 基础草稿（1B/3B Llama 家族） | 快速原型，无需训练 | 1.8～2.3 倍 |
| Medusa 头 | 可以微调验证器 | 2～3 倍 |
| EAGLE-2 / 3 | 生产环境，追求最高速度 | 3～4 倍 |
| Lookahead | 无草稿、无训练、无额外参数 | 1.3～1.6 倍 |

**不适合使用推测解码的情况：**

- 单序列只生成 1～5 个词元，额外开销占主导。
- 高度自由的创作或高温度采样（α 会下降）。
- 内存受限的部署（草稿模型会增加显存占用）。

## 交付成果

参见 `outputs/skill-spec-decode-picker.md`。这个技能会为新的推理工作负载选择推测解码策略（基础 / Medusa / EAGLE / lookahead）及调优参数（N、草稿温度）。

## 练习

1. **简单。** 运行 `code/main.py`。确认在 50,000 个词元上，推测解码的词元分布与验证器直接采样分布一致，卡方检验 p > 0.05。
2. **中等。** 对 `α = 0.5, 0.7, 0.85`，绘制加速比（每次大模型前向传播生成的词元数）关于 `N` 的函数，找出每个 α 的最优 `N`。（提示：每次验证调用的期望词元数 = `(1 - α^{N+1}) / (1 - α)`。）
3. **困难。** 实现一个微型 Medusa：取第 14 课的综合项目 GPT，添加 3 个额外 LM 头，分别预测位置 t+2、t+3 和 t+4。使用联合多头损失在 tinyshakespeare 上训练。将接受率与通过截断同一个模型得到的基础草稿模型比较。
4. **困难。** 实现回滚：从一个包含 10 词元前缀的 KV 缓存开始，送入 5 个草稿词元，并模拟在位置 3 拒绝。验证下一次迭代中读取的缓存恰好对应“前缀 + 最先接受的 2 个草稿”。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 草稿模型 | “便宜的那个” | 提出候选词元的较小模型；通常比验证器便宜 10～50 倍。 |
| 验证器 | “大的那个” | 需要保持其分布的目标模型；每个推测步骤只运行一次。 |
| 接受率（α） | “草稿正确的频率” | 验证器接受草稿的逐词元概率；典型值为 0.7～0.9。 |
| 残差分布 | “拒绝后的后备方案” | 归一化后的 `(q - p)_+`；拒绝时从中采样可保持验证器分布。 |
| 奖励词元 | “免费的那个” | 全部 N 个草稿被接受后，从验证器的下一步分布再采样一个词元。 |
| Medusa | “无需草稿模型的推测解码” | 验证器上的多个 LM 头并行预测位置 t+1..t+k。 |
| EAGLE | “隐藏状态草稿” | 以验证器最后一层隐藏状态为条件的微型 Transformer 草稿模型。 |
| Lookahead 解码 | “雅可比迭代” | 使用不动点迭代的自推测方案；无需草稿模型。 |
| 树注意力 | “一次验证多个候选” | 同时考虑多条草稿续写的分支式验证。 |
| KV 回滚 | “撤销被拒绝的草稿” | 使用临时 KV 缓冲区；接受时提交，拒绝时丢弃。 |

## 延伸阅读

- [Leviathan、Kalman、Matias（2023），《Fast Inference from Transformers via Speculative Decoding》](https://arxiv.org/abs/2211.17192)——核心算法与等价性定理。
- [Chen 等（2023），《Accelerating Large Language Model Decoding with Speculative Sampling》](https://arxiv.org/abs/2302.01318)——同期提出的方法；给出了清晰的伯努利拒绝证明。
- [Cai 等（2024），《Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads》](https://arxiv.org/abs/2401.10774)——Medusa 论文；树注意力验证。
- [Li 等（2024），《EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty》](https://arxiv.org/abs/2401.15077)——EAGLE-1；以隐藏状态为条件的草稿。
- [Li 等（2024），《EAGLE-2: Faster Inference of Language Models with Dynamic Draft Trees》](https://arxiv.org/abs/2406.16858)——EAGLE-2；动态树深度。
- [Li 等（2025），《EAGLE-3: Scaling up Inference Acceleration of Large Language Models via Training-Time Test》](https://arxiv.org/abs/2503.01840)——EAGLE-3。
- [Fu 等（2024），《Break the Sequential Dependency of LLM Inference Using Lookahead Decoding》](https://arxiv.org/abs/2402.02057)——不使用草稿模型的 lookahead 方法。
- [vLLM 文档——推测解码](https://docs.vllm.ai/en/latest/features/spec_decode.html)——完整接入四种策略的经典生产参考。
- [SafeAILab / EAGLE 参考实现](https://github.com/SafeAILab/EAGLE)——EAGLE-1/2/3 的参考代码。
