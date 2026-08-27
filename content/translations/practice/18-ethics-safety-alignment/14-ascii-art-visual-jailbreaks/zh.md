---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/18-ethics-safety-alignment/14-ascii-art-visual-jailbreaks/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 49b3da88ca8fbe445a353426bbec66f0488f177c0a34b9ddb2f76269f964b2e8
status: reviewed
---

# ASCII 艺术与视觉越狱

> Jiang、Xu、Niu、Xiang、Ramasubramanian、Li、Poovendran，《ArtPrompt：基于 ASCII 艺术的对齐 LLM 越狱攻击》（ACL 2024，arXiv:2402.11753）。将有害请求中的安全相关 token 遮蔽，用同一字母的 ASCII 艺术渲染替换，再发送伪装提示词。GPT-3.5、GPT-4、Gemini、Claude、Llama-2 都无法稳健识别 ASCII 艺术 token。该攻击可以绕过 PPL（困惑度过滤器）、释义防御和重新分词。相关的 ViTC 基准测量非语义视觉提示词的识别能力；StructuralSleight 则将方法推广到不常见的文本编码结构（树、图、嵌套 JSON），形成一整个编码攻击家族。

**类型：** 构建
**语言：** Python（标准库，ArtPrompt token 遮蔽工具）
**前置要求：** 第 18 阶段 · 12（PAIR）、第 18 阶段 · 13（MSJ）
**用时：** 约 60 分钟

## 学习目标

- 描述 ArtPrompt 攻击：识别词语、替换为 ASCII 艺术、生成最终伪装提示词。
- 解释标准防御（PPL、释义、重新分词）为何会在 ArtPrompt 上失效。
- 定义 ViTC 并描述它测量的能力。
- 描述 StructuralSleight 如何推广到任意不常见的文本编码结构。

## 问题

释义和角色扮演攻击（第 12 课）以及长上下文攻击（第 13 课）都作用于文本层面的模式。ArtPrompt 作用于识别层：模型不解析被禁止的 token，而是解析由字符绘制的图像。安全过滤器看到的是无害标点，模型看到的是一个词。

## 概念

### ArtPrompt 的两步

第 1 步，词语识别。给定有害请求，攻击者使用 LLM 识别安全相关词语，例如“bomb”在“how to make a bomb”中的出现。

第 2 步，生成伪装提示词。将每个识别出的词替换为 ASCII 艺术渲染，使用 7×5 或 7×7 的字符块组成字母形状。模型收到的是由标点和空格组成的网格，能力足够时可以识别其中的词；安全过滤器只看到网格。

结果是 GPT-4、Gemini、Claude、Llama-2、GPT-3.5 都会失效。在论文的基准子集上，攻击成功率超过 75%。

### 标准防御为何失效

- **PPL（困惑度过滤器）。** ASCII 艺术的困惑度很高，但所有新颖输入也可能很高。阻断 ArtPrompt 的阈值也会阻断合法结构化输入。
- **释义。** 释义提示词会破坏 ASCII 艺术；释义 LLM 常会保留或重新构造艺术图形。
- **重新分词。** 用不同方式切分 token 并不能改变模型以视觉方式识别字母形状这一事实。

根本问题在于安全过滤器位于 token 或语义层，而 ArtPrompt 在视觉识别层运行。

### ViTC 基准

ViTC 测量模型识别非语义视觉提示词的能力，包括 ASCII 艺术、Wingdings 和其他不以文本语义表达的视觉内容。ArtPrompt 的效果与 ViTC 准确率相关：模型越善于读取视觉文字，ArtPrompt 对它的效果越好。这是能力与安全性的权衡。

### StructuralSleight

StructuralSleight 将 ArtPrompt 推广为不常见的文本编码结构（Uncommon Text-Encoded Structures，UTES），包括树、图、嵌套 JSON、JSON 中的 CSV、diff 风格代码块。只要某种结构在安全训练数据中很少见、却能被模型解析，就可以隐藏有害内容。

这对防御的含义是：安全机制必须对模型能解析的各种结构化表示都泛化。结构集合很大，而且还在增长。

### 图像模态类比

视觉 LLM，包括 GPT-5.2、Gemini 3 Pro、Claude Opus 4.5、Grok 4.1，进一步扩大了攻击面。带真实图像的 ArtPrompt 攻击比 ASCII 艺术类比更强，因为图像编码器会产生更丰富的信号。

### 它在第 18 阶段主线中的位置

第 12–14 课描述三个正交攻击向量：迭代细化（PAIR）、上下文长度（MSJ）和编码（ArtPrompt/StructuralSleight）。第 15 课从以模型为中心的攻击转向系统边界攻击，即间接提示词注入；第 16 课描述防御工具的回应。

```figure
al-ascii-cloak
```

## 使用

`code/main.py` 构建一个玩具 ArtPrompt。你可以用 ASCII 艺术字形遮蔽有害查询中的指定词语，验证伪装字符串能通过关键词过滤器，并可选地用简单识别器将伪装字符串解码回来。

## 交付

本课产出 `outputs/skill-encoding-audit.md`。给定一份越狱防御报告，它会枚举覆盖的编码攻击家族（ASCII 艺术、base64、leet-speak、UTF-8 同形异义字、UTES），以及捕获每种攻击的防御层。

## 练习

1. 运行 `code/main.py`。验证伪装字符串能通过简单关键词过滤器，并报告所需的字符级变化。

2. 实现第二种编码，即对同一目标词使用 base64。比较它与 ArtPrompt 的过滤器绕过率和恢复难度。

3. 阅读 Jiang 等人 2024 年第 4.3 节（五模型结果）。提出一个原因，解释 Claude 在同一基准上的 ArtPrompt 抵抗能力为何高于 Gemini。

4. 设计一个生成前防御，检测提示词中呈 ASCII 艺术形状的区域。测量它在合法代码、表格和数学符号上的误报率。

5. StructuralSleight 列出 10 种编码结构。勾勒一个能处理全部 10 种结构的通用防御，并估计每个被防御提示词的计算成本。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|------------|----------|
| ArtPrompt | “ASCII 艺术攻击” | 用 ASCII 艺术渲染遮蔽安全词的两步越狱 |
| 伪装 | “藏起单词” | 用模型能读取、过滤器却看不懂的视觉表示替换禁止 token |
| UTES | “不常见结构” | Uncommon Text-Encoded Structure，例如用树、图、嵌套 JSON 偷运内容 |
| ViTC | “视觉文字能力” | 测量模型读取非语义视觉编码能力的基准 |
| 困惑度过滤器 | “PPL 防御” | 拒绝困惑度高的提示词；合法结构化输入也可能得高分，因此会失效 |
| 重新分词 | “tokenizer 偏移防御” | 用不同分词器预处理提示词；识别发生在视觉层，因此无效 |
| 同形异义字 | “相似字符” | 看起来与拉丁字母相同的 Unicode 字符，可绕过子串检查 |

## 延伸阅读

- [Jiang et al. — ArtPrompt (ACL 2024, arXiv:2402.11753)](https://arxiv.org/abs/2402.11753) — ASCII 艺术越狱论文
- [Li et al. — StructuralSleight (arXiv:2406.08754)](https://arxiv.org/abs/2406.08754) — UTES 推广
- [Chao et al. — PAIR (Lesson 12, arXiv:2310.08419)](https://arxiv.org/abs/2310.08419) — 互补的迭代攻击
- [Anil et al. — Many-shot Jailbreaking (Lesson 13)](https://www.anthropic.com/research/many-shot-jailbreaking) — 互补的长度攻击
