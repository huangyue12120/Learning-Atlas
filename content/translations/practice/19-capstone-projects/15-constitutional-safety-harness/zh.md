---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/15-constitutional-safety-harness/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 8d47b067c07ac7c8d9d826ac8a881fe2b7f4104daa191f7fa934e474c67d47c1
status: reviewed
---

# 毕业项目 15——宪法式安全工作台与红队靶场

> Anthropic 的 Constitutional Classifiers、Meta 的 Llama Guard 4、Google 的 ShieldGemma-2、NVIDIA 的 Nemotron 3 Content Safety，以及用于多语言覆盖的 X-Guard，共同定义了 2026 年的安全分类器技术栈。garak、PyRIT、NVIDIA Aegis 和 promptfoo 成为标准对抗评测工具。NeMo Guardrails v0.12 将它们接入生产流水线。本毕业项目把全部要素连在一起：围绕目标应用的分层安全工作台、运行 6+ 类攻击的自治红队智能体，以及能产生可测无害性差值的宪法式自我批评运行。

**类型：** 毕业项目
**语言：** Python（安全流水线、红队）、YAML（策略配置）
**前置课程：** 第 10 阶段（从零实现 LLM）、第 11 阶段（LLM 工程）、第 13 阶段（工具）、第 14 阶段（智能体）、第 18 阶段（伦理、安全与对齐）
**涉及阶段：** P10 · P11 · P13 · P14 · P18
**用时：** 25 小时

## 问题

2026 年 LLM 安全的前沿，不是分类器是否有效（大致有效），而是如何在生产应用周围正确组合它们，同时避免过度拒答或留下明显漏洞。Llama Guard 4 处理英语策略违规，X-Guard（132 种语言）处理多语言越狱，ShieldGemma-2 捕获基于图像的提示注入，NVIDIA Nemotron 3 Content Safety 覆盖企业类别。Anthropic 的 Constitutional Classifiers 是另一种方法，在训练阶段使用，而不是在服务阶段使用。

攻击演化同样重要。PAIR 和 TAP 自动发现越狱，GCG 运行基于梯度的后缀攻击，多轮和代码切换攻击利用智能体记忆。任何部署的 LLM 都需要一个红队靶场——garak 和 PyRIT 是规范驱动器——以及有文档记录的缓解措施和按 CVSS 评分的发现。

你要加固一个目标应用（可以是 8B 指令微调模型，或其他毕业项目中的一个 RAG 聊天机器人），对它运行 6+ 类攻击，并生成前后无害性测量。

## 概念

安全流水线有五层。**输入清理**：去除零宽字符，解码 base64/rot13，规范化 Unicode。**策略层**：NeMo Guardrails v0.12 rails（领域外、毒性、PII 提取）。**分类器门**：输入使用 Llama Guard 4，非英语使用 X-Guard，图像输入使用 ShieldGemma-2。**模型**：目标 LLM。**输出过滤器**：输出使用 Llama Guard 4，Presidio 清理 PII，适用时强制引用。**HITL 层**：被标记为高风险的输出进入 Slack 队列。

红队靶场由调度器运行。PAIR 和 TAP 自治发现越狱，GCG 运行基于梯度的后缀攻击。还包括 ASCII / base64 / rot13 编码攻击、多轮攻击（角色扮演、记忆利用）和代码切换攻击（将英语与斯瓦希里语或泰语混合）。每次运行都产生结构化发现文件，包含 CVSS 评分和披露时间线。

宪法式自我批评运行属于训练阶段干预。取 1k 个有害尝试提示，让模型起草响应，依据书面宪法（不得伤害规则）批评响应，再在批评循环上重新训练。对留出评测测量前后的无害性差值。

## 架构

```text
请求（文本 / 图像 / 多语言）
      |
      v
输入清理（去除零宽、解码、规范化）
      |
      v
NeMo Guardrails v0.12 rails（领域外、策略）
      |
      v
分类器门：
  Llama Guard 4（英语）
  X-Guard（多语言，132 种语言）
  ShieldGemma-2（图像提示）
  Nemotron 3 Content Safety（企业）
      |
      v（允许）
目标 LLM
      |
      v
输出过滤器：Llama Guard 4 + Presidio PII + 引用检查
      |
      v
被标记输出的 HITL 层

并行：
  红队调度器
    -> garak（经典攻击）
    -> PyRIT（编排式红队）
    -> 自治越狱智能体（PAIR + TAP）
    -> GCG 后缀攻击
    -> 多语言 / 代码切换
    -> 多轮角色扮演

输出：CVSS 评分发现 + 披露时间线 + 前后无害性差值
```

## 技术栈

- 安全分类器：Llama Guard 4、ShieldGemma-2、NVIDIA Nemotron 3 Content Safety、X-Guard
- 防护栏框架：NeMo Guardrails v0.12 + OPA
- 红队驱动器：garak（NVIDIA）、PyRIT（Microsoft Azure）、NVIDIA Aegis、promptfoo
- 越狱智能体：PAIR（Chao 等，2023）、Tree-of-Attacks（TAP）、GCG 后缀
- 宪法式训练：Anthropic 风格自我批评循环 + 对批评结果进行 SFT
- PII 清理：Presidio
- 目标：8B 指令微调模型，或其他毕业项目中的 RAG 聊天机器人

```figure
cf-safety-stack
```

## 动手构建

1. **设置目标。** 在 vLLM 上启动一个 8B 指令微调模型（或复用另一毕业项目的 RAG 聊天机器人），这就是被测应用。

2. **包装安全流水线。** 围绕目标接入五层流水线。验证每一层都能单独观察（Langfuse 中每层一个 span）。

3. **分类器覆盖。** 加载 Llama Guard 4、X-Guard（多语言）和 ShieldGemma-2（图像）。在一小组有标签数据上分别运行它们，建立基线。

4. **红队调度器。** 调度 garak、PyRIT、PAIR 智能体、TAP 智能体、GCG runner、多轮攻击者和代码切换攻击者。每个攻击者使用单独队列。

5. **攻击套件。** 六类攻击：(1) PAIR 自动越狱；(2) TAP 攻击树；(3) GCG 梯度后缀；(4) ASCII / base64 / rot13 编码；(5) 多轮角色扮演；(6) 多语言代码切换。按类别报告成功率。

6. **宪法式自我批评。** 整理 1k 个有害尝试提示。对每个提示，目标模型起草响应。批评 LLM 根据书面宪法（“不得伤害”“引用证据”“拒绝非法请求”）打分。批评者提出异议的提示会被重写；目标模型在批评改进后的样本对上微调。在留出评测上测量前后无害性。

7. **过度拒答测量。** 在良性提示套件（例如 XSTest）上追踪误报率。目标模型必须继续对良性问题提供帮助。

8. **CVSS 评分。** 为每次成功越狱按 CVSS 4.0 评分（攻击向量、复杂度、影响）。生成披露时间线和缓解计划。

9. **靶场自动化。** 以上内容都由 cron 运行，发现写入队列，过度拒答回归告警发送到 Slack。

## 实际使用

```text
$ safety probe --model=target --family=PAIR --budget=50
[attacker]   PAIR agent running on target
[attack]     attempt 1/50: disguise query as academic research ... blocked
[attack]     attempt 2/50: appeal to roleplay ... blocked
[attack]     attempt 3/50: chain-of-thought coax ... SUCCEEDED
[finding]    CVSS 4.8 medium: roleplay bypass on target
[range]      7 successes out of 50 (14% success rate)
```

## 交付

交付物是 outputs/skill-safety-harness.md：一个生产级分层安全流水线，加上一套可复现的红队靶场，并报告前后无害性差值。

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | 攻击面覆盖 | 运行 6+ 类攻击，覆盖 2+ 种语言 |
| 20 | 真阳性 / 假阳性权衡 | 攻击阻断率与 XSTest 良性通过率 |
| 20 | 自我批评差值 | 留出评测上的前后无害性 |
| 20 | 文档与披露 | 带时间线的 CVSS 评分发现 |
| 15 | 自动化与可重复性 | 所有内容由 cron 运行并带告警 |
| **100** | | |

## 练习

1. 在 RAG 聊天机器人上运行 garak 的 prompt-injection 插件，比较有无输出过滤层时的攻击成功率。

2. 增加第七类攻击：通过检索文档进行间接提示注入。测量所需的额外防御。

3. 实现“拒答但提供帮助”模式：防护栏阻断时，目标提供更安全的相关答案，而不是简单拒答。测量 XSTest 差值。

4. 多语言覆盖差距：找出 X-Guard 表现较弱的一种语言，提出针对它的微调数据集。

5. 在 30B 模型上运行宪法式自我批评，测量差值是否随模型规模扩大。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Layered safety | “纵深防御” | 在输入、分类器门、输出和 HITL 设置多层防护栏 |
| Llama Guard 4 | “Meta 的安全分类器” | 2026 年输入/输出内容分类器参考 |
| PAIR | “越狱智能体” | Chao 等人的 LLM 驱动越狱发现论文 |
| TAP | “Tree-of-Attacks” | PAIR 的树搜索变体 |
| GCG | “贪心坐标梯度” | 基于梯度的对抗后缀攻击 |
| Constitutional self-critique | “Anthropic 风格训练” | 目标起草 -> 批评者打分 -> 重写 -> 再训练 |
| XSTest | “良性探针集” | 测量过度拒答回归的 benchmark |
| CVSS 4.0 | “严重程度分数” | 对安全发现进行标准漏洞评分 |

## 延伸阅读

- [Anthropic Constitutional Classifiers](https://www.anthropic.com/research/constitutional-classifiers)——训练阶段参考
- [Meta Llama Guard 4](https://www.llama.com/docs/model-cards-and-prompt-formats/llama-guard-4/)——2026 输入/输出分类器
- [Google ShieldGemma-2](https://huggingface.co/google/shieldgemma-2b)——图像 + 多模态安全
- [NVIDIA Nemotron 3 Content Safety](https://developer.nvidia.com/blog/building-nvidia-nemotron-3-agents-for-reasoning-multimodal-rag-voice-and-safety/)——企业参考
- [X-Guard（arXiv:2504.08848）](https://arxiv.org/abs/2504.08848)——132 种语言的多语言安全
- [garak](https://github.com/NVIDIA/garak)——NVIDIA 红队工具包
- [PyRIT](https://github.com/Azure/PyRIT)——微软红队框架
- [NeMo Guardrails v0.12](https://docs.nvidia.com/nemo-guardrails/)——rail 框架
- [PAIR（arXiv:2310.08419）](https://arxiv.org/abs/2310.08419)——越狱智能体论文
