---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/10-llms-from-scratch/20-deepseek-v3-walkthrough/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 04d8e96b26fd1cbfe18298e60320deff1339f9b052572b7144379ee59717d2e3
status: reviewed
---

# DeepSeek-V3 架构导读

> 第 10 阶段 · 第 14 课介绍了开放模型都会调节的六个架构旋钮。DeepSeek-V3（2024 年 12 月，总参数 671B，激活参数 37B）调节了全部六个，又增加了四个：多头潜在注意力、无辅助损失负载均衡、多词元预测和 DualPipe 训练。本课从上到下阅读 DeepSeek-V3 的架构，并根据公开配置推导每一项参数量。学完后，你将能解释为什么 671B/37B 的比例是合理选择，以及为什么 MLA 与 MoE 结合后在前沿规模上优于单独使用任一者。

**类型：** 学习  
**语言：** Python（标准库，参数计算器）  
**前置课程：** 第 10 阶段 · 14（开放模型架构导读）、第 10 阶段 · 17（NSA）、第 10 阶段 · 18（MTP）、第 10 阶段 · 19（DualPipe）  
**用时：** 约 75 分钟

## 学习目标

- 从头到尾阅读 DeepSeek-V3 配置，将每个字段解释为六个 GPT-2 旋钮或四个 DeepSeek 特有扩展之一。
- 推导总参数量（671B）、激活参数量（37B）及其组成部分。
- 计算 128k 上下文下 MLA 的 KV 缓存占用，并与具有相同激活参数量、使用 GQA 的稠密模型比较。
- 说出 DeepSeek 特有的四项创新（MLA、MTP、无辅助损失路由、DualPipe），并指出每项作用于架构或训练栈的哪个部分。

## 问题

DeepSeek-V3 是第一个架构真正不同于 Llama 家族的前沿开放模型。Llama 3 405B 可以看作“调节了六个旋钮的 GPT-2”，而 DeepSeek-V3 是调节了全部六个旋钮并再增加四个的 GPT-2。阅读 Llama 3 配置可以作为阅读 DeepSeek 配置的热身，但注意力块形状、路由逻辑和训练目标的深层结构差异足够大，值得单独导读。

学习它的回报在于：DeepSeek-V3 开放权重的发布改变了开放模型中“前沿能力”的含义。它的架构正成为许多 2026 年训练运行复制的蓝图。任何接触前沿 LLM 训练或推理的岗位，都必须能够读懂它。

## 概念

### 不变的核心，再看一遍

DeepSeek-V3 仍是自回归模型，仍然堆叠解码器块。每个块仍包含注意力、MLP 和两个 RMSNorm，MLP 仍使用 SwiGLU，仍使用 RoPE 和 pre-norm，也仍然绑定输入嵌入与输出权重。这与每个 Llama 或 Mistral 的基线相同。

### 转折：用 MLA 替代 GQA <!-- learning-atlas: the-twist-mla-instead-of-gqa -->

从第 10 阶段 · 14 你已经知道，GQA 通过在若干 Q 头之间共享 K、V 来缩小 KV 缓存。多头潜在注意力（MLA）更进一步：把 K 和 V 压缩到共享的低秩潜在表示（`kv_lora_rank`）中，然后在运行时按头解压。KV 缓存只保存这个潜在表示——通常每层每词元 512 个浮点数，而不是 `8 x 128 = 1024` 个浮点数。

在 128k 上下文下，DeepSeek-V3 的 MLA 为每层每词元保存一个共享潜在 `c^{KV}`；K 和 V 都由它经过上投影得到，而上投影可以吸收到后续矩阵乘法中：

```
kv_cache = num_layers * kv_lora_rank * max_seq_len * bytes_per_element
         = 61 * 512 * 131072 * 2
         = 7.6 GB
```

假设一个 GQA 基线具有 Llama 3 70B 的形状（8 个 KV 头、头维度 128），则需要：

```
kv_cache = 2 * 61 * 8 * 128 * 131072 * 2
         = 30.5 GB
```

在 128k 上下文下，MLA 比 Llama-3-70B 风格的 GQA 缓存小 4 倍。

代价是每次注意力计算、每个头都要增加一次解压。与节省的带宽相比，额外计算很小，因此对长上下文推理总体有利。

### 路由：无辅助损失的负载均衡

MoE 路由器决定每个词元由哪些 top-k 专家处理。朴素路由器会把太多工作集中到少数专家，让其他专家闲置。标准修复方法是增加辅助损失来惩罚负载不均衡，但这会轻微损害主任务性能。

DeepSeek-V3 引入无辅助损失方案。它在路由 logits 中加入每个专家的偏置，并在训练时用简单规则调整：专家 `e` 过载就降低 `bias_e`，负载不足就提高它。不增加额外损失，训练目标保持干净，同时专家负载保持平衡。

对主损失的影响：无法测出。对 MoE 架构的影响：更干净，也不再需要调节辅助损失超参数。

### MTP：更密集的训练 + 免费草稿器

从第 10 阶段 · 18 你知道，DeepSeek-V3 增加了 D=1 的 MTP 模块，预测提前两个位置的词元。推理时，训练好的模块被改作推测解码草稿器，接受率超过 80%；训练时，每个隐藏状态有 D+1 = 2 个监督目标，信号更密集。

它在 671B 主模型之上增加 14B 参数，开销为 2.1%。

### 训练：DualPipe

从第 10 阶段 · 19 你知道，DualPipe 是一种双向流水线，将前向、反向 chunk 与跨节点 all-to-all 通信重叠。在 DeepSeek-V3 的 2,048 张 H800 规模上，它挽回了约 24.5 万个原本会被 1F1B 流水线气泡浪费的 GPU 小时。

### 配置逐字段阅读

下面是简化的 DeepSeek-V3 配置：

```
hidden_size: 7168
intermediate_size: 18432   (dense MLP hidden size, used on first few layers)
moe_intermediate_size: 2048 (expert MLP hidden size)
num_hidden_layers: 61
first_k_dense_layers: 3    (first 3 layers use dense MLP)
num_attention_heads: 128
num_key_value_heads: 128   (formally equal to num_heads under MLA, but
                           the real compression is in kv_lora_rank)
kv_lora_rank: 512          (MLA latent dimension)
num_experts: 256            (MoE expert count per block)
num_experts_per_tok: 8      (top-8 routing)
shared_experts: 1           (always-on shared expert per block)
max_position_embeddings: 163840
rope_theta: 10000.0
vocab_size: 129280
mtp_module: 1               (1 MTP module at depth 1)
```

逐项解析：

- `hidden_size=7168`：嵌入维度。
- `num_hidden_layers=61`：块的总深度。
- `first_k_dense_layers=3`：前 3 个块使用大小为 18432 的稠密 MLP，剩余 58 个使用 MoE。
- `num_attention_heads=128`：128 个查询头。
- `kv_lora_rank=512`：K 和 V 被压缩到该潜在维度，再按头解压。
- `num_experts=256, num_experts_per_tok=8`：每个 MoE 块有 256 个专家，采用 top-8 路由。
- `shared_experts=1`：在 256 个路由专家之外，每个块还有 1 个始终开启的专家，对每个词元都贡献结果。可以把它理解成保证每个词元获得可靠处理的“稠密地板”。
- `moe_intermediate_size=2048`：每个专家的 MLP 隐藏维度。由于专家有 256 个，它比稠密 MLP 更小。

### 参数核算

完整计算在 `code/main.py` 中。重点数字如下：

- 嵌入：`vocab * hidden = 129280 * 7168 = ~0.93B`。
- 前 3 个稠密块：MLA 注意力（每块约 144M）+ 稠密 MLP（每块约 260M）+ 归一化，合计约 1.2B。
- 58 个 MoE 块：MLA 注意力（约 144M）+ 每块 256 个专家（每个约 30M）+ 1 个共享专家（约 30M）+ 归一化。每块约 7.95B，58 块合计约 461B。

MTP 模块：14B。

总计约为 476B 核心架构 + 14B MTP。论文发布的 671B 数字还明确计入了其他结构参数（偏置张量、专家特有组件、共享专家缩放等）。计算器的结果在发布值的 3%–5% 以内；差异来自 DeepSeek 报告附录第 2 节中的细粒度核算。

一次前向中的激活参数：

- 注意力：每层 144M × 61 = 8.8B（所有层都会运行）。
- 激活 MLP：前 3 层稠密（`3 * 260M = 780M`），58 个 MoE 层每层激活 8 个路由专家 + 1 个共享专家及路由开销。每层激活 MLP 约 260M。合计 `3 * 260M + 58 * 260M = ~15.9B`。
- 嵌入 + 归一化：1.2B。
- 激活总量：核心部分约 26B，加上 14B MTP（推理时不一定总运行）≈ 37B。

### 671B / 37B 的比例

稀疏比为 18 倍（激活参数是总参数的 5.5%）。DeepSeek-V3 是已经发布开放权重的前沿 MoE 中最稀疏的模型。Mixtral 8x7B 的比例为 13/47（28%），密集得多；Llama 4 Maverick 为 17B/400B（4.25%），比例相近。DeepSeek 的判断是：在前沿规模上，让更多专家以更低激活比例运行，能带来更好的每激活 FLOP 质量。

### DeepSeek-V3 的位置

| 模型 | 总参数 | 激活参数 | 比例 | 注意力 | 新想法 |
|-------|------|-------|-------|-----------|-------------|
| Llama 3 70B | 70B | 70B | 100% | GQA 64/8 | — |
| Llama 4 Maverick | 400B | 17B | 4.25% | GQA | — |
| Mixtral 8x22B | 141B | 39B | 27% | GQA | — |
| DeepSeek V3 | 671B | 37B | 5.5% | MLA 512 | MLA + MTP + 无辅助损失 + DualPipe |
| Qwen 2.5 72B | 72B | 72B | 100% | GQA 64/8 | YaRN 扩展 |

### 后续：R1、V4

DeepSeek-R1（2025）是在 V3 骨干上进行推理训练的运行。R1 使用相同的架构，变化的是后训练配方（在可验证任务上进行大规模 RL），而不是预训练架构。

如果 DeepSeek-V4 发布，预计它会保留 MLA + MoE + MTP，并加入 DSA（DeepSeek Sparse Attention），作为第 10 阶段 · 17 的 NSA 后继者。谱系很稳定：架构级创新逐步积累，每个版本继续调节额外旋钮。

```figure
moe-routing
```

## 使用它

`code/main.py` 是专门针对 DeepSeek-V3 形状的参数计算器。运行它，将输出与论文数字比较，也可以在假设变体上使用它（256 对 512 个专家、top-8 对 top-16、MLA rank 512 对 1024）。

重点观察：

- 总参数估计与发布的 671B 之间的差异。
- 激活参数估计与发布的 37B 之间的差异。
- 128k 上下文下的 KV 缓存——MLA 与 GQA 的比较。
- 每层拆分，查看参数预算实际流向何处。

## 交付

本课产出 `outputs/skill-deepseek-v3-reader.md`。给定一个 DeepSeek 家族模型（V3、R1 或未来变体），它会逐组件生成架构阅读结果，为配置中的每个字段命名、推导各组件参数量，并识别模型采用了四项 DeepSeek 特有创新中的哪些。

## 练习

1. 运行 `code/main.py`。将计算器的总参数估计与发布的 671B 比较，找出差异来源；论文第 2 节给出了完整的逐项核算。

2. 将配置改为 MLA rank 256 而非 512，计算 128k 上下文下的 KV 缓存。它能减少百分之多少？对每个头的表达能力代价是什么？

3. 比较 DeepSeek-V3（256 个专家、top-8）与假设的（512 个专家、top-8）路由。总参数增长而激活参数不变。理论上额外专家容量带来什么，推理时付出什么？

4. 阅读 DeepSeek-V3 技术报告（arXiv:2412.19437）第 2.1 节关于 MLA 的内容，用三句话解释为什么 K、V 解压矩阵可以在推理时“吸收”到后续矩阵乘法中以提高效率。

5. DeepSeek-V3 对大多数操作采用 FP8 训练。计算用 FP8 而不是 BF16 存储 671B 权重节省的内存。它与 14.8T 词元训练预算有什么关系？

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| MLA | “多头潜在注意力” | 将 K、V 压缩到共享低秩潜在表示（通常 `kv_lora_rank=512`），再按头实时解压；KV 缓存只保存潜在表示 |
| `kv_lora_rank` | “MLA 压缩维度” | K、V 共享潜在表示的大小；DeepSeek-V3 使用 512 |
| 前 k 个稠密层 | “早期层保持稠密” | MoE 模型最前面的若干层跳过 MoE 路由器，运行稠密 MLP 以保持稳定 |
| `num_experts_per_tok` | “Top-k 路由” | 每个词元激活的路由专家数；DeepSeek-V3 使用 8 |
| 共享专家 | “始终开启的专家” | 无论路由结果如何都处理每个词元的专家；DeepSeek-V3 使用 1 个 |
| 无辅助损失路由 | “偏置调节的负载均衡” | 训练时调整每个专家的偏置，在不增加损失项的情况下保持专家负载均衡 |
| MTP 模块 | “额外预测头” | 从 `h^(1)` 和 `E(t+1)` 预测 `t+2` 的 Transformer 块；提供更密集训练与免费推测草稿器 |
| DualPipe | “双向流水线” | 将前向/反向计算与跨节点 all-to-all 重叠的训练调度 |
| 激活参数比例 | “稀疏度” | `active_params / total_params`；DeepSeek-V3 达到 5.5% |
| FP8 训练 | “8 位训练” | 训练存储和许多计算操作使用 FP8；相较 BF16 大致减半内存，质量代价较小 |

## 延伸阅读

- [DeepSeek-AI — DeepSeek-V3 Technical Report (arXiv:2412.19437)](https://arxiv.org/abs/2412.19437) — 完整的架构、训练和结果文档
- [DeepSeek-V3 model card on Hugging Face](https://huggingface.co/deepseek-ai/DeepSeek-V3) — 配置文件与部署说明
- [DeepSeek-V2 paper (arXiv:2405.04434)](https://arxiv.org/abs/2405.04434) — 引入 MLA 的前身论文
- [DeepSeek-R1 paper (arXiv:2501.12948)](https://arxiv.org/abs/2501.12948) — 基于 V3 架构的推理训练后继者
- [Native Sparse Attention (arXiv:2502.11089)](https://arxiv.org/abs/2502.11089) — DeepSeek 家族注意力的未来方向
- [DualPipe repository](https://github.com/deepseek-ai/DualPipe) — 训练调度参考资料
