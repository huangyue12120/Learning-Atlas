---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/17-personal-ai-tutor/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: ad7e1ebf8e1a6549852bde68b9e5a3eb752ef41c4fafd14d13c8b56c2655cb90
status: reviewed
---

# 毕业项目 17——个人 AI 导师（自适应、多模态、带记忆）

> Khanmigo（Khan Academy）、Duolingo Max、Google LearnLM / Gemini for Education、Quizlet Q-Chat 和 Synthesis Tutor 都在 2026 年大规模推出了自适应多模态辅导。它们共有的形态是苏格拉底式策略（绝不只是把答案倒给学习者）、每次交互后更新的学习者模型（类似 Bayesian knowledge tracing）、语音 + 文本 + 数学照片输入、课程图检索、间隔重复调度，以及针对年龄的严格安全过滤。本毕业项目要求交付一个面向特定学科的导师（K–12 代数或 Python 入门），对 10 名学习者开展为期两周的效果研究，并通过内容安全审计。

**类型：** 毕业项目
**语言：** Python（后端、学习者模型）、TypeScript（Web 应用）、SQL（通过 Postgres + Neo4j 实现课程图）
**前置课程：** 第 5 阶段（NLP）、第 6 阶段（语音）、第 11 阶段（LLM 工程）、第 12 阶段（多模态）、第 14 阶段（智能体）、第 17 阶段（基础设施）、第 18 阶段（安全）
**涉及阶段：** P5 · P6 · P11 · P12 · P14 · P17 · P18
**用时：** 30 小时

## 问题

自适应辅导过去还是教育科技研究中的小众方向；到 2026 年，它已经成为消费级产品。Khanmigo 已部署到美国大多数学区。Duolingo Max 的 MAU 达到数千万。Google 的 LearnLM / Gemini for Education 为 Google Classroom 提供辅导能力。Quizlet Q-Chat 与抽认卡并列。Synthesis Tutor 以面向好奇孩子的导师产品迅速传播。共同要素包括多模态输入（打字、说话、拍摄方程）、苏格拉底式教学（先提问、后解释）、每次交互后更新的学习者模型，以及严格的年龄适宜安全控制。

你要为一个特定学习群体构建其中一种产品。衡量标准是真实的效果研究：10 名学习者、两周内的前测和后测。语音循环必须自然（毕业项目 03 的子栈）。记忆必须尊重隐私。安全过滤器必须通过面向 K–12 的、考虑 COPPA 的红队测试。

## 概念

四个组件。**导师策略**是苏格拉底式循环：学习者要答案时，策略提出引导性问题；答对时，策略转向下一个概念；卡住时，策略提供分层提示。**学习者模型**是 Bayesian knowledge tracing（或其简单变体），在每次交互后更新课程节点的掌握概率。**课程图**是一个带先修边的 Neo4j 概念图；策略遍历该图来选择下一个概念。**记忆**是 episodic + semantic 存储（类似 agentmemory），保存过去的交互、错误和偏好。

UX 是多模态的。文本输入用于键入答案。语音输入通过 LiveKit + Whisper（复用毕业项目 03）。数学题照片输入使用 dots.ocr 或 PaliGemma 2。语音输出使用 Cartesia Sonic-2。安全性使用 Llama Guard 4 加年龄适宜过滤器（阻止成人内容、暴力、自伤），并采用考虑 COPPA 的记忆保留策略。

效果研究是交付物。10 名学习者，前测和后测，持续两周。报告学习增益差值和置信区间，并与非自适应基线比较（同一内容按线性顺序交付，不使用导师策略）。

## 架构

```text
学习者设备
  |
  +-- 文本         -> Web 应用
  +-- 语音         -> LiveKit Agents（ASR + TTS）
  +-- 数学照片     -> dots.ocr / PaliGemma 2
       |
       v
  导师策略（LangGraph）
       - 苏格拉底式决策头
       - 下一个概念选择器（遍历课程图）
       - 提示分层器
       - 掌握度更新
       |
       v
  学习者模型（BKT / item-response theory）
       - 每个概念的掌握概率
       - 间隔重复调度器（SM-2 或 FSRS）
       |
       v
  记忆（类似 agentmemory）
       - episodic：每次交互
       - semantic：学到的错误、偏好
       - 保留策略：考虑 COPPA / GDPR
       |
       v
  课程图（Neo4j）
       - 先修边
       - 挂接的 OER 内容
       |
       v
  安全：
    Llama Guard 4 + 年龄适宜过滤器
    按学习者 ID 范围保护记忆访问
```

## 技术栈

- 学科选择：K–12 代数或 Python 入门（选择一个做深）
- 导师策略：基于 Claude Sonnet 4.7、带提示缓存的 LangGraph
- 学习者模型：经典 Bayesian knowledge tracing（BKT）或 FSRS 间隔调度
- 课程图：由带先修边的概念组成的 Neo4j，并挂接 OER 内容
- 记忆：类似 agentmemory 的持久向量 + episodic + semantic 存储
- 语音：LiveKit Agents 1.0 + Cartesia Sonic-2（复用毕业项目 03 子栈）
- 数学照片：使用 dots.ocr 或 PaliGemma 2 识别方程
- 安全：Llama Guard 4 + 自定义年龄适宜过滤器
- 评测：Bloom 层级问题生成、前后测 harness、效果研究工具

```figure
cf-tutor-loop
```

## 动手构建

1. **课程图。** 构建包含 50–150 个概念节点的 Neo4j（例如 K–12 代数从“数轴”到“求根公式”），并加入先修边。为每个节点挂接 OER 内容（Open Textbook、OpenStax）。

2. **学习者模型。** 使用先验参数初始化 Bayesian knowledge tracing：guess、slip、learn-rate。每次交互后更新每个概念的掌握度，并按学习者持久化。

3. **导师策略。** 使用 LangGraph，包含以下节点：`read_signal`（判断学习者答案是正确、部分正确还是卡住）、`select_concept`（遍历课程图，选择优先级最高的概念）、`scaffold`（苏格拉底式提示）、`update_mastery`。

4. **记忆。** 每次交互都写入 episodic 存储。错误与偏好会提升到 semantic memory。采用考虑 COPPA 的保留策略：一年后自动删除，并允许家长访问。

5. **语音路径。** 将 LiveKit Agents worker 接到导师策略。ASR 使用 Whisper-v3-turbo，TTS 使用 Cartesia Sonic-2，并支持打断（复用毕业项目 03 的机制）。

6. **数学照片路径。** 上传或拍摄图片；用 dots.ocr 或 PaliGemma 2 识别方程，再将其作为结构化输入交给导师。

7. **安全。** 每次模型输出都经过 Llama Guard 4 和年龄适宜过滤器（阻止自伤、成人内容、暴力）。记忆访问按学习者 ID 限定，并提供供家长删除数据的界面。

8. **效果研究。** 10 名学习者，进行标准化 30 题基线前测；两周内每周与导师交互 3 次；随后进行后测。将结果与同一内容的非自适应基线组（10 名学习者）比较。

9. **每周进度报告。** 为每名学习者自动生成 PDF 摘要，包含探索过的主题、掌握轨迹和推荐的下一步。

## 实际使用

```text
学习者：“我不明白为什么 3x + 6 = 12 意味着 x = 2。”
[信号]     卡住
[概念]     “隔离变量”（先修：加法—减法—等式）
[分层提示] “要开始的话，你会从两边减去哪个数？”
学习者：“6”
[信号]     正确
[掌握度]   加法—减法—等式：0.62 -> 0.77
[概念]     继续“隔离变量”
[分层提示] “很好。现在 3x / 3 等于什么？”
```

## 交付

交付物 `outputs/skill-ai-tutor.md` 是一个面向特定学科的自适应导师，具备多模态输入、学习者模型、记忆、安全机制和经过测量的效果。

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | 学习增益差值 | 为期两周、10 名学习者的前后测差值 |
| 20 | 苏格拉底式一致性 | 对转录样本评分的 rubric |
| 20 | 多模态 UX | 端到端验证语音 + 照片 + 文本的一致性 |
| 20 | 安全与隐私姿态 | Llama Guard 4 通过率 + 考虑 COPPA 的保留策略 |
| 15 | 课程广度与图质量 | 概念覆盖率 + 先修图一致性 |
| **100** | | |

## 练习

1. 在有无自适应学习者模型的情况下运行效果研究（随机概念顺序）。报告差值。预计自适应版本会胜出，但胜出的幅度才是有趣的数字。

2. 增加多模态探针：将同一个概念问题分别以文本、语音和照片交付。测量学习者使用偏好模态时是否更快收敛。

3. 构建家长仪表盘：展示练习过的主题、掌握轨迹、即将学习的概念和安全事件（任何防护栏命中）。遵循 COPPA。

4. 增加语言切换模式：导师接受西班牙语输入并用西班牙语教学。测量 X-Guard 覆盖情况。

5. 压测记忆隐私：验证学习者 A 即使通过重新摄入语音片段攻击，也无法看到学习者 B 的数据。记录访问尝试并告警。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Socratic policy | “提问，不倾倒答案” | 导师提出引导性问题，而非直接给出答案 |
| Bayesian knowledge tracing | “BKT” | 按概念计算掌握概率的经典学习者模型方程 |
| FSRS | “自由间隔重复调度器” | 2024 年的间隔重复调度器，优于 SM-2 |
| Curriculum graph | “概念 DAG” | 带先修边的 Neo4j 概念图 |
| Episodic memory | “每次交互日志” | 保存每次交互，供后续检索 |
| Semantic memory | “已学模式存储” | 从 episodic memory 中压缩并提升的错误与偏好 |
| COPPA | “儿童隐私法” | 限制收集 13 岁以下儿童数据的美国法律 |

## 延伸阅读

- [Khanmigo（Khan Academy）](https://www.khanmigo.ai)——消费级 K–12 导师参考
- [Duolingo Max](https://blog.duolingo.com/duolingo-max/)——语言学习导师参考
- [Google LearnLM / Gemini for Education](https://blog.google/technology/google-deepmind/learnlm)——托管模型参考
- [Quizlet Q-Chat](https://quizlet.com)——另一种参考产品
- [Synthesis Tutor](https://www.synthesis.com)——创业公司参考
- [FSRS algorithm](https://github.com/open-spaced-repetition/fsrs4anki)——间隔重复调度器
- [Bayesian Knowledge Tracing](https://en.wikipedia.org/wiki/Bayesian_knowledge_tracing)——学习者模型经典方法
- [LiveKit Agents](https://github.com/livekit/agents)——语音技术栈
