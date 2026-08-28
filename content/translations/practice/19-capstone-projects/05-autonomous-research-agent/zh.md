---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/05-autonomous-research-agent/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 5c1f54080074a5d0ccc5dc2e7297777cc782cc27a029d336101f6ac19f5e0740
status: reviewed
---

# 毕业项目 05——自治研究智能体（AI-Scientist 类）

> Sakana 的 AI-Scientist-v2 发表了完整论文，Agent Laboratory 运行了实验，Allen AI 分享了运行轨迹。2026 年的形态已经清晰：围绕实验进行规划—执行—验证的树搜索、按预算控制成本、在沙箱中运行代码、带视觉反馈的 LaTeX 写作者，以及自动化的 NeurIPS 风格审稿人集成。本毕业项目要求你构建一个，在每篇论文 $30 的预算内端到端运行，并经受 Sakana 记录过的沙箱逃逸红队测试。

**类型：** 毕业项目
**语言：** Python（智能体 + 沙箱）、LaTeX（输出）
**前置课程：** 第 2 阶段（ML）、第 3 阶段（深度学习）、第 7 阶段（Transformer）、第 10 阶段（从零实现 LLM）、第 14 阶段（智能体）、第 15 阶段（自治系统）、第 16 阶段（多智能体）、第 18 阶段（安全）
**涉及阶段：** P0 · P2 · P3 · P7 · P10 · P14 · P15 · P16 · P18
**用时：** 40 小时

## 问题

自治研究智能体在 2026 年跨过了一个门槛。Sakana AI 的 AI-Scientist-v2 在 Nature 上发表，其生成的论文通过了 workshop 同行评审。ShinkaEvolve（ICLR 2026）把这条路线扩展到演化式假设。AMD 的 Agent Laboratory 发布了可复现的运行轨迹。这些智能体并不神奇——它们是在候选实验树上运行的规划—执行—验证循环，带有成本上限、种子绑定的沙箱和自动审查。真正的工程在循环、预算和安全叙事中。

你会通过针对一个狭窄领域的种子想法实现这种循环来学习它（例如，在一个 100M（1 亿）参数的 Transformer 上做注意力稀疏性消融）。价值不在第一次运行就发现新东西，而在基础设施：树搜索、实验沙箱、写作者—审稿人循环和红队报告。Sakana 团队记录过沙箱逃逸失败；你的智能体必须通过同样的红队测试。

## 概念

智能体是一个 best-first 树搜索。节点是实验规格：（假设、配置、代码、预期结果）。expand 步骤用小改动提出子节点（替换优化器、调整 batch size、消融一个组件）。每个子节点都在带硬资源上限的新沙箱中运行。结果反馈到评分函数，按（新颖性 × 质量 × 剩余预算）为节点排序。预算耗尽后树停止生长，并将最优分支写成论文。

写作者是多模态的。它生成 LaTeX 草稿、编译草稿、渲染图表，再把渲染后的 PDF 送回 Claude Opus 4.7 的视觉模式，针对版式、图表可读性和主张—证据对齐进行批评。五名 LLM 评审组成的审稿人集成会输出 NeurIPS 风格分数（新颖性、严谨性、清晰度、可复现性、影响力）；如果平均分低于阈值，论文就带着批评意见回到写作者。

安全是承重结构。每个实验都在没有网络出口、墙上时间有界且资源限制固定的 E2B 或 Daytona 沙箱中运行。代码生成步骤经过策略层，阻断会逃出沙箱的系统调用。红队报告复现 Sakana 记录的攻击面（fork bomb、文件系统逃逸、LLM 编写的网络调用）。

## 架构

```text
种子想法 + 领域
      |
      v
  文献搜索（Semantic Scholar + OpenAlex + FAISS 缓存）
      |
      v
  LangGraph 规划—执行—验证树
      |
      v
  +--- 扩展节点 ----+      每节点一个沙箱
  |                 |      （E2B / Daytona）
  v                 v      资源上限
子节点_1          子节点_k   无网络出口
  |                 |      确定性种子
  v                 v
运行实验          运行实验
  |                 |
  v                 v
按（新颖性、质量、预算）为节点评分
      |
      v
最佳分支 -> LaTeX 写作者
      |
      v
编译 + 视觉批评（Opus 4.7 vision）
      |
      v
审稿人集成（5 个 LLM 评审，NeurIPS rubric）
      |
      v
paper.pdf + review.md + trace.json
```

## 技术栈

- 编排：带 checkpoint 和人工审批门的 LangGraph
- 树搜索：自定义 best-first 实验节点搜索（来自 Sakana v2 的 AB-MCTS 风格）
- 沙箱：每次实验一个 E2B，Docker-in-Docker 作为回退；通过 cgroups 设置资源上限
- 文献：Semantic Scholar Graph API + OpenAlex + 本地 FAISS 摘要缓存
- 写作者：LaTeX 模板 + Claude Opus 4.7（视觉模式），用于图表批评和版式检查
- 审稿人：5 名评审的集成（Opus 4.7、GPT-5.4、Gemini 3 Pro、DeepSeek R1、Qwen3-Max），加权聚合
- 实验框架：物理实验使用 PyTorch 2.5，W&B 记录日志
- 可观测性：Langfuse 记录智能体轨迹；每篇论文硬预算 $30

```figure
ce-experiment-tree
```

## 动手构建

1. **种子与领域范围。** 取得一个种子想法（例如“研究少于 1B（10 亿）参数的 Transformer 的注意力图稀疏模式”），定义搜索空间：模型、数据集和计算预算。

2. **文献阶段。** 向 Semantic Scholar + OpenAlex 查询引用最多的 50 篇相关论文；在本地缓存摘要；生成一页领域摘要。

3. **树脚手架。** 使用种子假设初始化根节点。实现 expand(node) -> children，使用小改动提案（每个子节点只改一个配置）。将 score(node) 实现为加权的 novelty × quality × budget 项。

4. **包装沙箱。** 每个实验都运行 docker run --network=none --memory=8g --cpus=2 --pids-limit=256 --read-only（或等价的 E2B 策略）。种子写入沙箱，输出以只读方式挂载出来。

5. **规划—执行—验证循环。** plan 提出子节点。execute 运行沙箱并捕获日志和指标。verify 对指标运行单元检查（损失是否下降？消融是否隔离出效果？）。失败节点在树上保存失败原因。

6. **写作者。** 预算用尽后选择最佳分支。使用 matplotlib 渲染图表。将分支轨迹放入上下文，借助 Claude Opus 4.7 生成 LaTeX 草稿。编译草稿，再把编译好的 PDF 送回 Opus 4.7 vision 批评。迭代修改。

7. **审稿人集成。** 五名评审按照 NeurIPS 风格标准为草稿的新颖性、严谨性、清晰度、可复现性和影响力打分。如果均值 < 4.0/5，就带着批评意见返回写作者。最多重写 3 次后硬停止。

8. **红队。** 构建或接入一组针对沙箱的对抗任务：fork bomb、网络外泄尝试、文件系统逃逸、LLM 编写的 shell 元字符。确认它们全部被阻止，并写出发现。

9. **可复现性。** 每篇论文都附带树搜索轨迹 JSON、种子、W&B 运行链接、沙箱配置和能够端到端复现的 README。

## 实际使用

```text
$ ai-scientist run --seed "attention sparsity in sub-1B transformers" --budget 30
[lit]    50 papers, digest in 12s
[tree]   expanded 8 nodes, budget 12/30
[exec]   node #3 sparsity=top-8, loss=2.83 (best so far)
[exec]   node #6 sparsity=top-4, loss=3.12 (worse)
[exec]   ...
[tree]   chose branch rooted at node #3 (novelty 0.62, quality 0.81)
[write]  LaTeX draft v1 complete
[vision] critique: figure 2 legend too small, claim-evidence ok
[write]  draft v2 after 3 edits
[review] mean 4.2/5 (novelty 3.9, rigor 4.3, clarity 4.1, repro 4.5, impact 4.2)
[done]   paper.pdf + review.md + trace.json     $28.40 spent
```

## 交付

交付物是 outputs/skill-ai-scientist.md。给定一个种子想法、一个领域和 $30 预算，它运行完整流水线，输出一篇可审阅的论文及可复现性包。

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | 论文质量 | 依据已发表 workshop 论文进行盲评 |
| 20 | 实验严谨性 | 基线、种子和消融；每条主张都有结果表中的单元格支撑 |
| 20 | 成本与计算纪律 | 强制 $30/论文上限，并由 Langfuse 追踪 |
| 20 | 安全性 | 沙箱红队通过；网络策略和 kill switch 得到验证 |
| 15 | 可复现性 | 使用相同种子的单命令重跑可以复现论文 |
| **100** | | |

## 练习

1. 在同一领域针对三个不同种子想法运行流水线。比较树搜索中哪些部分重叠，并找出重复浪费的计算。

2. 在预计成本超过 $5 的实验执行前增加人工介入门。测量总成本下降了多少。

3. 将审稿人集成换成单一评审。测量其在已知问题论文留出集上的误接受率。

4. 引入网络外泄红队测试：让智能体编写尝试 curl 外部地址的代码。确认 --network=none 策略能阻止它，并记录尝试。

5. 将你的树搜索与平坦的随机基线比较（预算相同，不采用扩展策略）。报告新颖性 × 质量的提升。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Tree search | “AB-MCTS 风格扩展” | 按新颖性×质量×预算评分，在实验节点上进行 best-first 探索 |
| Sandbox | “实验隔离” | 无网络、CPU/内存有界、种子固定、输入只读的容器 |
| Vision critique | “先渲染再阅读” | 将论文编译成 PDF，再交给 VLM 批评版式和主张—证据关系 |
| Reviewer ensemble | “自动同行评审” | 多个 LLM 评审按 NeurIPS rubric 给论文打分，加权结果控制流水线 |
| Novelty score | “这项工作新吗？” | 对靠近文献缓存中 50 篇论文的方案施加惩罚的启发式分数 |
| Cost ceiling | “美元预算” | 每篇论文总开支的硬上限；由 Langfuse 计数并在运行前估计 |
| Red team | “沙箱逃逸审计” | 如果策略错误就可能逃出沙箱的对抗任务 |

## 延伸阅读

- [Sakana AI-Scientist-v2 仓库](https://github.com/SakanaAI/AI-Scientist-v2)——生产研究智能体参考
- [Sakana AI-Scientist-v1 论文（arXiv:2408.06292）](https://arxiv.org/abs/2408.06292)——原始方法
- [ShinkaEvolve（Sakana ICLR 2026）](https://sakana.ai)——演化式扩展
- [Agent Laboratory（AMD）](https://github.com/SamuelSchmidgall/AgentLaboratory)——多角色研究实验室框架
- [LangGraph 文档](https://langchain-ai.github.io/langgraph/)——参考编排层
- [Semantic Scholar Graph API](https://api.semanticscholar.org/)——文献搜索
- [E2B sandboxes](https://e2b.dev)——实验隔离参考
- [NeurIPS 审稿人指南](https://neurips.cc/Conferences/2026/Reviewer-Guidelines)——审稿人集成编码的 rubric
