---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: b93352bcfa28b0ae8b1a60fe52a6078d37066e2df8b291c428fa3422a4ab79dc
status: reviewed
---

# KV 缓存、Flash Attention 与推理优化

> 训练可以并行，瓶颈在 FLOPs；推理必须串行，瓶颈在内存。瓶颈不同，技巧也不同。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 7 第 02 课（自注意力）、Phase 7 第 05 课（完整 Transformer）、Phase 7 第 07 课（GPT）  
**预计时间：** 约 75 分钟

## 问题

一个朴素的自回归解码器生成 `N` 个词元需要完成 `O(N²)` 次计算：每一步都会在整个前缀上重新计算注意力。若响应长度为 4K 个词元，就需要 16M 次注意力操作，其中大多数都在重复劳动。前缀词元的隐藏状态一经计算便是确定的——你只需要让新词元的查询与之前所有词元已经缓存的键和值交互。

此外，注意力本身会搬运大量数据。标准注意力会物化 N×N 分数矩阵、N×d 的 softmax 输出和 N×d 的最终输出，需要对 HBM 进行过多次读写。当 N≥2K 时，注意力会先受到内存带宽限制，而不是 FLOPs 限制。经典注意力内核对现代 GPU 的利用率只有应有水平的四分之一到十分之一。

两项都源自 Dao 等人的优化，把前沿推理从“慢”推向了“快”：

1. **KV 缓存。** 存储每个前缀词元的 K、V 向量。每生成一个新词元，只需用一个查询与缓存的键交互。每个生成步骤的推理复杂度从 `O(N²)` 降为 `O(N)`。
2. **Flash Attention。** 对注意力计算进行分块，使完整的 N×N 矩阵永远不会写入 HBM。softmax 与矩阵乘法全部在 SRAM 中完成。在 A100 上可获得 2～4 倍实际速度提升；在使用 FP8 的 H100 上可达 5～10 倍。

到 2026 年，二者已无处不在。每个生产推理栈（vLLM、TensorRT-LLM、SGLang、llama.cpp）都默认它们存在，每个前沿模型也都启用了 Flash Attention。

## 概念

![KV 缓存增长与 Flash Attention 分块](../assets/kv-cache-flash-attn.svg)

### KV 缓存的数学计算

对解码器的每一层、每个词元和每个头：

```
bytes_per_token_per_layer = 2 * d_head * dtype_size
                          ^
                          K and V
```

对一个具有 32 层、32 个头、d_head=128、采用 fp16 的 7B 模型：

```
per token per layer = 2 * 128 * 2 = 512 bytes
per token (32 layers) = 16 KB
per 32K context = 512 MB
```

对 Llama 3 70B（80 层、d_head=128、使用 8 个 KV 头的 GQA）：

```
per token per layer = 2 * 8 * 128 * 2 = 4096 bytes (4 KB)
per 32K context = 10.4 GB
```

这 10 GB 正是 Llama 3 70B 在 128K 上下文、批大小为 1 时，仅 KV 缓存就会占掉一块 40 GB A100 大部分显存的原因。

**GQA 的主要收益就在 KV 缓存。** 使用 64 个头的 MHA 会占用 32 GB，MLA 还能把缓存进一步压缩。

拖动各个维度，观察缓存大小如何变化。提高序列长度或批大小，看看它多快就会超过单块 GPU 的容量：

```figure
kv-cache-sizer
```

### Flash Attention——分块技巧

标准注意力：

```
S = Q @ K^T          (HBM read, N×N, HBM write)
P = softmax(S)       (HBM read, HBM write)
O = P @ V            (HBM read, HBM write)
```

数据要往返 HBM 三次。H100 的 HBM 带宽为 3 TB/s，而 SRAM 为 30 TB/s。与把所有数据都留在芯片上相比，每次访问 HBM 都会带来约 10 倍的减速。

Flash Attention：

```
for each block of Q (tile size ~128 × 128):
    load Q_tile into SRAM
    for each block of K, V:
        load K_tile, V_tile into SRAM
        compute S_tile = Q_tile @ K_tile^T     (SRAM)
        running softmax aggregation             (SRAM)
        accumulate into O_tile                  (SRAM)
    write O_tile to HBM
```

每个分块只需往返 HBM 一次。总内存占用从 `O(N²)` 降到 `O(N)`。反向传播会重新计算前向传播中的一部分值，而不是把它们保存下来，因此还能进一步节省内存。

**数值技巧。** 滚动 softmax 会在各个分块之间维护 `(max, sum)`，因此最终归一化结果是精确的。它不是近似方法——Flash Attention 的输出与标准注意力逐位一致（fp16 的非结合性误差除外）。

**版本演进：**

| 版本 | 年份 | 关键变化 | 参考硬件上的加速比 |
|------|------|----------|--------------------|
| Flash 1 | 2022 | SRAM 分块内核 | A100 上 2 倍 |
| Flash 2 | 2023 | 更好的并行性、因果优先顺序 | A100 上 3 倍 |
| Flash 3 | 2024 | Hopper 异步执行、FP8 | H100 上 1.5～2 倍（约 740 TFLOPs FP16） |
| Flash 4 | 2026 | Blackwell 五级流水线、软件 exp2 | 推理优先（最初只支持前向传播） |

Flash 4 发布时只支持前向传播，训练仍使用 Flash 3。Flash 4 对 GQA 和变长序列的支持仍在推进中（预计 2026 年中）。

### 推测解码——另一项延迟优化

便宜的模型先提出 N 个词元，大模型再并行验证全部 N 个。若验证接受了 k 个词元，你只付出 1 次大模型前向传播，就完成了 k 个生成步骤。在代码和普通文本中，典型的 k=3～5。

2026 年的默认方案包括：
- **EAGLE 2 / Medusa。** 集成式草稿头与验证器共享隐藏状态。无质量损失地加速 2～3 倍。
- **使用草稿模型的推测解码。** 在消费级硬件上加速 2～4 倍。
- **Lookahead 解码。** 使用雅可比迭代，不需要草稿模型。适用场景较窄，但无需额外模型。

### 连续批处理

经典批量推理会等最慢的序列结束后才启动新批次。短响应提前结束时，GPU 资源会被浪费。

连续批处理（最早见于 Orca，现在已用于 vLLM、TensorRT-LLM 和 SGLang）会在旧请求一结束时，立即把新请求换入批次。对于典型聊天工作负载，吞吐量可以提高 5～10 倍。

### PagedAttention——把 KV 缓存当作虚拟内存

这是 vLLM 的标志性特性。KV 缓存以 16 词元为一个块进行分配，页表把逻辑位置映射到物理块。这样可以让并行样本（束搜索、并行采样）共享 KV，为提示缓存快速切换前缀，并对内存进行去碎片化。与朴素的连续分配相比，吞吐量可提高 4 倍。

```figure
flash-attention-memory
```

## 动手构建

参见 `code/main.py`。我们将实现：

1. 一个朴素的 `O(N²)` 增量解码器。
2. 一个使用 KV 缓存的 `O(N)` 解码器。
3. 一个模拟 Flash Attention 滚动最大值算法的分块 softmax。

### 第 1 步：KV 缓存

```python
class KVCache:
    def __init__(self, n_layers, n_heads, d_head):
        self.K = [[[] for _ in range(n_heads)] for _ in range(n_layers)]
        self.V = [[[] for _ in range(n_heads)] for _ in range(n_layers)]

    def append(self, layer, head, k, v):
        self.K[layer][head].append(k)
        self.V[layer][head].append(v)

    def read(self, layer, head):
        return self.K[layer][head], self.V[layer][head]
```

思路很简单：在按层、按头组织的列表中，持续追加逐词元的 K、V 向量。

### 第 2 步：分块 softmax

```python
def tiled_softmax_dot(q, K, V, tile=4):
    """Flash-attention-style softmax(qK^T)V with running max/sum."""
    m = float("-inf")
    s = 0.0
    out = [0.0] * len(V[0])
    for start in range(0, len(K), tile):
        k_block = K[start:start + tile]
        v_block = V[start:start + tile]
        scores = [sum(qi * ki for qi, ki in zip(q, k)) for k in k_block]
        new_m = max(m, *scores)
        exp_old = math.exp(m - new_m) if m != float("-inf") else 0.0
        exp_new = [math.exp(sc - new_m) for sc in scores]
        s = s * exp_old + sum(exp_new)
        for j in range(len(out)):
            out[j] = out[j] * exp_old + sum(e * v[j] for e, v in zip(exp_new, v_block))
        m = new_m
    return [o / s for o in out]
```

输出与一次完成的 `softmax(qK) V` 逐位一致，但任意时刻的工作集都只是一个 `tile × d_head` 分块，而不是完整的 `N × d_head`。

### 第 3 步：在生成 100 个词元时比较朴素解码与缓存解码

统计注意力操作次数。朴素方法为 `O(N²)` = 5050，缓存方法为 `O(N)` = 100。代码会打印二者。

## 使用方法

```python
# HuggingFace transformers auto-enables KV cache on decoder-only generate().
from transformers import AutoModelForCausalLM
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.2-3B",
    attn_implementation="flash_attention_2",  # use FA3 if Hopper
    torch_dtype="bfloat16",
)
# generate() uses KV cache automatically
```

用于生产的 vLLM：

```bash
pip install vllm
vllm serve meta-llama/Llama-3.1-70B-Instruct \
    --tensor-parallel-size 4 \
    --max-model-len 32768 \
    --enable-prefix-caching \
    --kv-cache-dtype fp8
```

跨请求前缀缓存是 2026 年的一项重要优化——相同的系统提示、少样本示例或长上下文文档可以在多次调用间复用 KV。对于重复使用工具提示的智能体工作负载，前缀缓存通常能带来 5 倍吞吐量提升。

## 交付成果

参见 `outputs/skill-inference-optimizer.md`。这个技能会为新的推理部署选择注意力实现、KV 缓存策略、量化和推测解码方案。

## 练习

1. **简单。** 运行 `code/main.py`。确认朴素解码器与缓存解码器输出相同，并观察操作计数的差异。
2. **中等。** 实现前缀缓存：给定提示 P 和多个补全结果，只对 P 执行一次前向传播来填充 KV 缓存，再为每个补全结果建立分支。测量相对于每次都重新编码 P 的加速比。
3. **困难。** 实现一个简单的 PagedAttention：把 KV 缓存放入固定的 16 词元块，并使用空闲列表。序列结束时，把它占用的块归还池中。模拟 1,000 个长度各异的聊天补全，并与连续分配比较内存碎片。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| KV 缓存 | “让解码变快的技巧” | 存储每个前缀词元的 K 和 V；新查询直接关注这些缓存，而不重新计算。 |
| HBM | “GPU 主内存” | 高带宽内存；H100 为 80 GB，B200 为 192 GB，带宽约 3 TB/s。 |
| SRAM | “片上内存” | 每个 SM 的高速内存；H100 上每个 SM 约 256 KB，带宽约 30 TB/s。 |
| Flash Attention | “分块注意力内核” | 计算注意力时不在 HBM 中物化 N×N 矩阵。 |
| 连续批处理 | “无需等待的批处理” | 无需清空批次即可换出已完成的序列、换入新序列。 |
| PagedAttention | “vLLM 的标志性特性” | 用页表把 KV 缓存分配到固定块中，消除内存碎片。 |
| 前缀缓存 | “复用长提示” | 跨请求缓存共享前缀的 KV；可显著降低智能体成本。 |
| 推测解码 | “草稿 + 验证” | 廉价草稿模型提出词元，大模型一次验证 k 个词元。 |

## 延伸阅读

- [Dao 等（2022），《FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness》](https://arxiv.org/abs/2205.14135)——Flash 1。
- [Dao（2023），《FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning》](https://arxiv.org/abs/2307.08691)——Flash 2。
- [Shah 等（2024），《FlashAttention-3: Fast and Accurate Attention with Asynchrony and Low-precision》](https://arxiv.org/abs/2407.08608)——Flash 3。
- [FlashAttention-4 发布说明（Dao-AILab，2026）](https://github.com/Dao-AILab/flash-attention)——Blackwell 五级流水线和软件 exp2 技巧；请阅读仓库 README，了解本课提到的首发时仅支持前向传播等限制。
- [Kwon 等（2023），《Efficient Memory Management for Large Language Model Serving with PagedAttention》](https://arxiv.org/abs/2309.06180)——vLLM 论文。
- [Leviathan 等（2023），《Fast Inference from Transformers via Speculative Decoding》](https://arxiv.org/abs/2211.17192)——推测解码。
- [Li 等（2024），《EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty》](https://arxiv.org/abs/2401.15077)——EAGLE-1/2 论文，对应本课提到的集成草稿方案。
- [Cai 等（2024），《Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads》](https://arxiv.org/abs/2401.10774)——本课与 EAGLE 并列介绍的 Medusa 方法。
- [vLLM 文档——PagedAttention](https://docs.vllm.ai/en/latest/design/kernel/paged_attention.html)——关于 16 词元块与页表设计的权威深入介绍。
