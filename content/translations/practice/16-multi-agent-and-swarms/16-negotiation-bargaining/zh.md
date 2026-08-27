---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/16-multi-agent-and-swarms/16-negotiation-bargaining/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 82443b4ceb00092856951f3fd422664295b574470a9f87704df1076b8724c41c
status: reviewed
---

# 协商与议价

> 智能体协商资源、价格、任务分配和条款。2026 年的基准集给出清晰结论：NegotiationArena（arXiv:2402.05863）显示 LLM 可通过人格操纵（“绝望”）将收益提高约 20%；“Measuring Bargaining Abilities”（arXiv:2402.15813）显示买方比卖方难，规模无助——其 **OG-Narrator**（确定性出价生成器 + LLM 叙述者）将成交率从 26.67% 推至 88.88%；Large-Scale Autonomous Negotiation Competition（arXiv:2503.06416）运行约 18 万次协商，发现**隐藏思维链**的智能体通过对对手隐藏推理而获胜；Bhattacharya 等人 2025 年采用 Harvard Negotiation Project 指标排名：Llama-3 最有效、Claude-3 最激进、GPT-4 最公平。本课实现合同网协议（FIPA 先驱，第 02 课），接入 LLM 风格买方/卖方，运行 OG-Narrator 式分解，并测量每种结构选择如何改变成交率。

**类型：** 学习 + 构建
**语言：** Python（标准库）
**前置要求：** 第 16 阶段 · 02（FIPA-ACL 传承），第 16 阶段 · 09（并行群体网络）
**用时：** 约 75 分钟

## 问题

两个智能体要就价格达成一致。若只用纯语言提示词让它们自行协商，2024–2026 年的 LLM 成交率低得惊人（在 arXiv:2402.15813 的严密参数化交易中约为 27%）。规模解决不了它：GPT-4 在议价结构上并不比 GPT-3.5 更好；它只是更擅长*议价语言*。

根本问题是 LLM 混淆了两项工作——决定出价与叙述出价。OG-Narrator 将其分开：确定性出价生成器计算数字动作；LLM 只负责叙述。成交率跃升到约 89%。

这映射了一个经典多智能体发现：将机制与通信层解耦会胜出。合同网协议（FIPA，1996；Smith，1980）是参考任务市场机制。将 LLM 插入叙述槽，就得到现代 LLM 驱动的任务市场。

## 概念

### 一段话理解合同网

Smith 1980 年的合同网协议：**管理者**广播**征集提案（cfp）**；**竞标者**以带有自己报价的 **propose** 消息响应；管理者选出胜者，向胜者发送 **accept-proposal**，向落选者发送 **reject-proposal**。胜者完成工作。可选消息是 **refuse**（竞标者拒绝提案）。FIPA 将其编码为 `fipa-contract-net` 交互协议。

### 为什么 OG-Narrator 胜出

“Measuring Bargaining Abilities of Language Models”（arXiv:2402.15813）观察到：

- LLM 经常违反议价规则（给出荒谬价格，忽略对方的 ZOPA）。
- 它们锚定差（接受糟糕首轮报价，以象征而非策略性金额还价）。
- 仅靠扩展不能修复这些。更大的模型用类似策略错误写出更可信的语言。

OG-Narrator 分解：

```
           ┌──────────────────┐        ┌──────────────────┐
  状态  →  │  出价生成器        │ 价格 → │  LLM 叙述者       │ → 消息
           │   （确定性）       │        │  （撰写人类风格    │
           │                  │        │    的附带叙述）    │
           └──────────────────┘        └──────────────────┘
```

出价生成器是经典协商策略：Rubinstein 议价模型、Zeuthen 策略，或对价格使用简单以牙还牙。LLM 负责叙述。消息包含确定性的价格和自然语言框架。

成交率跃升，因为：

- 价格留在议价区间内。
- 锚点具有策略性，而非情绪化。
- LLM 做它擅长的事：写作。

### NegotiationArena 发现

arXiv:2402.05863 提供规范基准。标题发现：

- LLM 通过采用人格（“我绝望地想在周五前卖掉它”）可将收益提高约 20%——人格操纵是真实策略。
- 公平/合作智能体会被对抗者利用；防御需要明确反姿态。
- 对称配对在约 40% 基准情形上收敛到不公平结果。

这不是“LLM 是糟糕协商者”，而是“LLM 协商得太像人，包含可被利用的部分”。

### 思维链隐藏

Large-Scale Autonomous Negotiation Competition（arXiv:2503.06416）对众多 LLM 策略运行约 18 万次协商。胜者向对手隐藏了推理：

- 若智能体将“我最多只会出价 $75；我的保留价是 $70”打印进公开可见的草稿板，对手就会读到。
- 胜者在私下计算策略；输出通道只包含报价和最低限度所需叙述。

这体现了 2026 年对经典博弈论（Aumann 1976 年关于理性与信息）的回响：揭示私人估值会损失收益。LLM 不会直觉到这点，并会在对手可见的推理轨迹中写下保留价。

工程结论：将私有草稿板上下文与公开消息上下文分离，这不是可选项。

### Bhattacharya 等人 2025 年——模型排名

在 Harvard Negotiation Project 指标上（原则性协商、BATNA 尊重、利益互惠）：

- **Llama-3** 最能有效成交（成交率 + 收益）。
- **Claude-3** 最激进（高锚点、晚让步）。
- **GPT-4** 最公平（跨配对的收益方差最小）。

这是 2025 年快照。重点在于不同基础模型具有持久的协商风格，而非哪款模型在 2026 年 4 月胜出。异构集成（第 15 课）将其作为多样性来源。

### 通过合同网 + LLM 分配任务

合同网在 LLM 多智能体中的现代复用：

1. 管理智能体将任务分解成单元。
2. 向工作者智能体广播带任务描述的 `cfp`。
3. 每个工作者返回报价：`(price, eta, confidence)`，其中价格可以是 token、算力单位或美元。
4. 管理者选择胜者（单个或多个，取决于任务）并授予任务。
5. 被拒绝的工作者可自由竞标其他任务。

它可扩展到 100 多个工作者，因为协调是广播—响应，而不是同步聊天。生产中使用：Microsoft Agent Framework 的编排模式、一些 LangGraph 实现。

### LLM-Stakeholders 交互式协商

NeurIPS 2024（https://proceedings.neurips.cc/paper_files/paper/2024/file/984dd3db213db2d1454a163b65b84d08-Paper-Datasets_and_Benchmarks_Track.pdf）引入带**秘密评分**和**最小接受阈值**的多方可计分博弈。每个利益相关方有私有效用；LLM 必须从消息中推断。这将双边议价推广到 N 方联盟形成，适用于拥有异构工作者能力的生产任务市场。

### 叙述与机制的规则

所有 2024–2026 年协商基准的一致工程规则是：

> 让 LLM 叙述，不要让 LLM 计算报价。

若出价是数值（价格、ETA、数量），就从协商状态确定性生成，再让 LLM 产生框架。若出价是提案结构（任务分解、角色分配），可让 LLM 起草，但要在发送前对其做模式验证与约束检查。

```figure
a5-og-narrator
```

## 动手构建

`code/main.py` 实现：

- `ContractNetManager`、`ContractNetTask`、`Bid`——管理者 + 竞标者、广播 cfp、收集提案、授予任务。
- `og_narrator_bargain(state, rng)`——OG-Narrator 买方：向中点做确定性的 Zeuthen 式让步。
- `seller_response(state, rng)`——确定性卖方还价策略（两种风格的结构真值）。
- `naive_llm_bargain(state, rng)`——模拟全 LLM 议价者：高方差选择价格，常在 ZOPA 之外。
- 测量：1000 次试验的成交率，每次使用新采样的保留价。

运行：

```
python3 code/main.py
```

预期输出：朴素 LLM 成交率约 65–75%；OG-Narrator 约 85–95%；15–25 个百分点的差距是将出价生成与叙述分解的结构优势。此外还有一个三名竞标者、一项任务的合同网任务市场分配示例。

## 实际使用

`outputs/skill-bargainer-designer.md` 设计议价协议：谁生成报价（确定性还是 LLM）、谁叙述、私有草稿板如何与公开消息分离，以及如何监控成交率。

## 交付物

生产议价检查表：

- **分离草稿板。** 私有状态绝不能进入对手上下文，这不可谈判。
- **确定性出价生成。** 价格、数量、ETA：计算，不要提示词生成。
- **对所有传入报价做验证**，使用模式并在协议边界拒绝 ZOPA 外报价。
- **限制轮次。** 最多 3–5 轮；死锁时升级给调解人。
- **持续测量成交率与收益方差。** 成交率下降是一种症状，通常意味着提示词漂移或对手侧攻击。
- **记录所有被拒绝提案**及确定性理由。合同网管理者的落选竞标者需要理解原因。

## 练习

1. 运行 `code/main.py`。确认 OG-Narrator 在成交率上胜过朴素 LLM，幅度多少？
2. 实现**基于人格的收益改进**（arXiv:2402.05863）——买方仅在叙述中采用“本周绝望地想买”的人格，出价生成器不变。成交率或收益会改变吗？
3. 实现思维链**隐藏**：维护一条不传给对手的私有草稿板字符串。若意外泄露（通过交换通道模拟），会发生什么？
4. 将合同网扩展为带保留价的 N 竞标者拍卖。所有报价都超过保留价时，管理者如何在最低价格与最高质量间决定？选择哪种授予规则、为什么？
5. 阅读 Bhattacharya 等人 2025 年的 Harvard Negotiation Project 指标。实现两种不同风格的议价者（激进 vs 公平），测量对称和非对称配对下的收益方差。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 合同网 | “任务市场” | Smith 1980、FIPA 1996；cfp + propose + accept/reject；规范任务市场。 |
| ZOPA | “可能达成协议的区间” | 买方最高价与卖方最低价的重叠；区间外报价无法成交。 |
| BATNA | “谈判协议的最佳替代方案” | 本次交易失败时的回退方案；决定你的保留价。 |
| OG-Narrator | “出价生成器 + 叙述者” | 分解：确定性出价，LLM 叙述。 |
| Zeuthen 策略 | “风险最小化让步” | 依据风险限制做让步的经典出价生成器。 |
| Rubinstein 议价 | “交替出价均衡” | 带折扣的无限期议价的博弈论模型。 |
| CoT 隐藏 | “隐藏推理” | arXiv:2503.06416 的胜者保留私有草稿板；公开通道只展示报价。 |
| 人格操纵 | “情绪姿态” | arXiv:2402.05863：绝望/紧急人格带来约 20% 收益提升。 |

## 延伸阅读

- [NegotiationArena](https://arxiv.org/abs/2402.05863) — 基准；人格操纵与利用发现
- [Measuring Bargaining Abilities of Language Models](https://arxiv.org/abs/2402.15813) — OG-Narrator 及买方比卖方难的结果
- [Large-Scale Autonomous Negotiation Competition](https://arxiv.org/abs/2503.06416) — 约 18 万次协商；隐藏思维链获胜
- [LLM-Stakeholders Interactive Negotiation (NeurIPS 2024)](https://proceedings.neurips.cc/paper_files/paper/2024/file/984dd3db213db2d1454a163b65b84d08-Paper-Datasets_and_Benchmarks_Track.pdf) — 带秘密效用的多方可计分博弈
- [Smith 1980 — The Contract Net Protocol](https://ieeexplore.ieee.org/document/1675516) — 经典机制，IEEE Transactions on Computers
