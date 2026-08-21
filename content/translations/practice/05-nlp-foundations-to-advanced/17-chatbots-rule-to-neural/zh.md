---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/17-chatbots-rule-to-neural/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 2ef49d5cdfcc8229bfe5ee7b1954de73ab30ad64711e53997efc9cca59ba25f0
status: reviewed
---

# 聊天机器人：从规则、神经网络到 LLM 智能体

> ELIZA 用模式匹配回复，DialogFlow 映射意图，GPT 从权重中回答，Claude 调用工具并验证。每个时代都解决了前一代最严重的失败。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 5 第 13 课（问答）、Phase 5 第 14 课（信息检索）  
**预计时间：** 约 75 分钟

## 问题

用户说“I want to change my flight.”系统必须判断其意图、还缺什么信息、怎样获取信息，以及如何完成操作。随后用户又说“wait, what if I cancel instead?”系统还要记住上下文、切换任务并保留状态。

对机器学习系统而言，对话很难。输入开放，输出要在多轮中保持连贯，系统可能还要作用于现实世界，例如改签航班或信用卡扣款。每一步错误都会被用户直接看到。

聊天机器人经历了四种范式，每一种都是因为前一种失败得太显眼才出现。本课按顺序讲解它们。2026 年的生产格局混合了最后两种。

## 概念

![聊天机器人演进：规则式 → 检索式 → 神经式 → 智能体](../assets/chatbot.svg)

### 依赖脚本的半个世纪：1950 至 2001 年

第一种范式持续了五十年，而不是五年。理解其轨迹很重要，因为其中每个系统都是同一台机器：匹配输入、发出预制回复、更新少量状态。向这台机器增加五十年规则，仍未得到通用能力。这一上限催生了之后三种范式。

**1950。** 图灵绕开“机器能思考吗？”这一问题，提出可操作的替代标准：若审问者无法通过电传打字机区分机器和人，哲学问题就不再重要。这个领域尚未得名，对话已经成为它的基准。

**1956。** 达特茅斯夏季研讨会创造“人工智能”一词，提出猜想：智能的每项特征“原则上都能得到如此精确的描述，以至于机器可以模拟它”。计划为重大进展预留了两个月。

**1966。** ELIZA 交付了步骤 1 将实现的反射技巧：分解规则从输入中提取片段，重组规则把片段作为问题回显。总共约 200 个模式，没有状态，也没有理解，用户却仍向它倾诉。Weizenbaum 在余生中都为如此少的机制就能产生这种效果而不安。

**1972。** Stanford 开发 PARRY 来模拟偏执症，为 ELIZA 加入了缺失的部分：内部状态。恐惧、愤怒和不信任等数值变量每轮都会更新，并决定下一个脚本，因此同样的输入会因对话历史不同而得到不同响应。在盲测对话记录中，精神科医生区分 PARRY 与患者的表现与随机猜测相当。它是角色设定的直接祖先，相当于用三个浮点数实现系统提示。同年，研究者让两个机器人通过 ARPANET 对话：心理治疗脚本采访偏执状态机，这是网络上的首次机器人对机器人对话。

**1995。** ALICE 使用 AIML 扩展 ELIZA 配方。AIML 是用于模式与模板对的 XML 方言。系统约含四万个手写类别，三次赢得 Loebner Prize。它证明了规则系统的扩展规律：更多规则能扩大覆盖，却无法带来通用性；每条规则都成为需要维护的负担。

**2001。** SmarterChild 面向三千万即时通信用户部署这套配方，并加入后端查询，把天气、股票和电影时间嵌入模板。稍加抽象，它就是披着 2001 年外衣的工具调用：解析意图、调用服务、把结果渲染进回复。

五十年只有一种机制，规则数量不断增加。范式结束的原因是手写状态机的维护成本随覆盖范围线性增长，而用户期望会根据上周见到的最新系统继续上升。

```figure
chatbot-lineage
```

**基于规则（ELIZA、AIML、DialogFlow）。** 手写模式匹配用户输入并产生响应。意图分类器把请求路由到预定义流程，槽位填充状态机收集必需信息。它在设计好的窄域内表现出色，离开范围立即失败。银行身份验证、航空预订等不能容忍幻觉的安全关键领域至今仍在使用。

**基于检索。** 类似 FAQ 的系统。编码每一对话语与响应。运行时编码用户消息，检索最近的存储响应，可类比 Zendesk 的经典“相似文章”功能。它比规则更能处理释义，又不生成内容，因此不会产生幻觉。

**神经式（seq2seq）。** 在对话日志上训练编码器与解码器，从零生成回复。内容流畅，却容易输出“I don't know”等泛化回复并发生事实漂移，也无法稳定围绕主题。这解释了 Google、Facebook 和 Microsoft 为何在 2016 至 2019 年都推出过令人失望的聊天机器人。

**LLM 智能体。** 用一个循环包裹语言模型，使其规划、调用工具并验证结果。它通过智能体循环工作：规划 → 调用工具 → 观察结果 → 决定下一步。检索优先的事实锚定（RAG）抑制幻觉，工具调用使它真正完成操作。这是 2026 年的架构。

四种范式并非依次完全替换。2026 年的生产聊天机器人会把请求路由到全部四种：身份验证和破坏性操作走规则，FAQ 走检索，自然措辞走神经生成，模糊开放问题走 LLM 智能体。

## 动手实现

### 步骤 1：基于规则的模式匹配

```python
import re


class RulePattern:
    def __init__(self, pattern, response_template):
        self.regex = re.compile(pattern, re.IGNORECASE)
        self.template = response_template


PATTERNS = [
    RulePattern(r"my name is (\w+)", "Nice to meet you, {0}."),
    RulePattern(r"i (need|want) (.+)", "Why do you {0} {1}?"),
    RulePattern(r"i feel (.+)", "Why do you feel {0}?"),
    RulePattern(r"(.*)", "Tell me more about that."),
]


def rule_based_respond(user_input):
    for pattern in PATTERNS:
        m = pattern.regex.match(user_input.strip())
        if m:
            return pattern.template.format(*m.groups())
    return "I don't understand."
```

二十行代码就实现了 ELIZA。“I feel sad”变成“Why do you feel sad”的反射技巧，是 Weizenbaum 在 1966 年展示的经典心理治疗师案例，至今仍有教学价值。

### 步骤 2：基于检索（FAQ）

这个说明性代码片段需要执行 `pip install sentence-transformers`，它会同时安装 torch。本课可运行的 `code/main.py` 改用标准库 Jaccard 相似度，因此无外部依赖也能运行。

```python
from sentence_transformers import SentenceTransformer
import numpy as np


FAQ = [
    ("how do i reset my password", "Go to Settings > Security > Reset Password."),
    ("how do i cancel my order", "Go to Orders, find the order, click Cancel."),
    ("what is your return policy", "30-day returns on unused items, original packaging."),
]


encoder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
faq_questions = [q for q, _ in FAQ]
faq_embeddings = encoder.encode(faq_questions, normalize_embeddings=True)


def faq_respond(user_input, threshold=0.5):
    q_emb = encoder.encode([user_input], normalize_embeddings=True)[0]
    sims = faq_embeddings @ q_emb
    best = int(np.argmax(sims))
    if sims[best] < threshold:
        return None
    return FAQ[best][1]
```

按阈值拒答是关键设计。最佳匹配不够接近时，返回 `None`，让系统升级处理。

### 步骤 3：神经生成（基线）

可以使用小型指令微调编码器与解码器 FLAN-T5，或微调对话模型。单独用于 2026 年生产会遇到矛盾、跑题和事实胡编，但它仍会在混合系统中用于自然措辞。DialoGPT 风格的仅解码器模型需要明确的轮次分隔符和 EOS 处理才能生成连贯回复；作为教学示例，FLAN-T5 的 text2text 流水线开箱即用。

```python
from transformers import pipeline

chatbot = pipeline("text2text-generation", model="google/flan-t5-small")

response = chatbot("Respond politely to: Hi there!", max_new_tokens=40)
print(response[0]["generated_text"])
```

### 步骤 4：LLM 智能体循环

2026 年的生产形态：

```python
def agent_loop(user_message, tools, llm, max_steps=5):
    history = [{"role": "user", "content": user_message}]
    for _ in range(max_steps):
        response = llm(history, tools=tools)
        tool_call = response.get("tool_call")
        if tool_call:
            tool_name = tool_call.get("name")
            args = tool_call.get("arguments")
            if not isinstance(tool_name, str) or tool_name not in tools:
                history.append({"role": "assistant", "tool_call": tool_call})
                history.append({"role": "tool", "name": str(tool_name), "content": f"error: unknown tool {tool_name!r}"})
                continue
            if not isinstance(args, dict):
                history.append({"role": "assistant", "tool_call": tool_call})
                history.append({"role": "tool", "name": tool_name, "content": f"error: arguments must be a dict, got {type(args).__name__}"})
                continue
            fn = tools[tool_name]
            result = fn(**args)
            history.append({"role": "assistant", "tool_call": tool_call})
            history.append({"role": "tool", "name": tool_name, "content": result})
        else:
            return response["content"]
    return "I could not complete the task in the step budget."
```

需要明确三件事。工具是 LLM 可以调用的函数；LLM 返回最终答案而不是工具调用时，循环结束；步骤预算防止系统在模糊任务上无限循环。

真实生产还会加入：检索优先的事实锚定，在每次 LLM 调用前注入相关文档；护栏，未经确认拒绝破坏性操作；可观测性，记录每一步；评估，自动检查智能体行为是否保持规范。

### 步骤 5：混合路由

```python
def hybrid_chat(user_input):
    if is_destructive_action(user_input):
        return structured_flow(user_input)

    faq_answer = faq_respond(user_input, threshold=0.6)
    if faq_answer:
        return faq_answer

    return agent_loop(user_input, tools, llm)


def is_destructive_action(text):
    danger_words = ["delete", "cancel", "charge", "refund", "transfer"]
    return any(w in text.lower() for w in danger_words)
```

模式很清楚：破坏性操作使用确定性规则，预制 FAQ 使用检索，其他请求交给 LLM 智能体。2026 年客服系统就采用这种架构。

## 使用现成工具

2026 年技术栈：

| 用例 | 架构 |
|------|------|
| 预订、支付、身份验证 | 基于规则的状态机与槽位填充 |
| 客服 FAQ | 在精选答案上执行检索 |
| 开放式帮助对话 | 带 RAG 与工具调用的 LLM 智能体 |
| 内部工具或 IDE 助理 | 带搜索、读、写等工具调用的 LLM 智能体 |
| 陪伴或角色聊天机器人 | 使用角色系统提示微调的 LLM，加知识检索 |

生产中始终使用混合路由。单一架构无法妥善处理每种请求，路由层本身通常是一个小型意图分类器。

## 仍会进入生产的失效方式

- **自信地编造。** LLM 智能体声称完成了实际没有完成的操作。缓解方法是验证结果、记录工具调用，只有收到成功工具返回后才允许 LLM 声称完成。
- **提示注入。** 用户插入覆盖系统提示的文本，在 OWASP 2025 年 LLM 应用十大风险中排名 LLM01。它有两种形式：直接注入粘贴到对话中；间接注入隐藏在智能体读取的文档、邮件或工具输出中。

  攻击成功率因场景而异。通用工具使用和编码基准上，前沿模型的测量成功率约为 0.5% 至 8.5%。特定高风险设置，例如针对 AI 编码智能体的自适应攻击和存在漏洞的编排，曾达到约 84%。真实生产漏洞包括 EchoLeak（CVE-2025-32711，CVSS 9.3），这是 Microsoft 365 Copilot 的零点击数据外泄漏洞，由攻击者控制的邮件触发。

  缓解方法包括：整个循环都把用户输入视为不可信；工具调用前清洗；让工具输出与主提示隔离；使用“规划、验证、执行”（PVE）模式，智能体先制定计划，再对照计划验证每个动作后执行，从而阻止工具结果注入新的计划外动作；破坏性操作要求用户确认；对工具权限采用最小授权。

  仅靠提示词工程无法彻底消除此风险，必须增加外部运行时防御层，例如 LLM Guard、允许列表验证和语义异常检测。
- **范围蔓延。** 工具调用返回旁支信息后，智能体偏离任务。缓解方法是收窄工具契约、保持系统提示聚焦，并评估跑题率。
- **无限循环。** 智能体反复调用同一工具。使用步骤预算、工具调用去重，以及判断“是否仍有进展”的 LLM 评判。
- **上下文窗口耗尽。** 长对话把最早轮次挤出上下文。可总结旧轮次、按相似度检索相关历史，或使用长上下文模型。

## 交付成果

保存为 `outputs/skill-chatbot-architect.md`：

```markdown
---
name: chatbot-architect
description: Design a chatbot stack for a given use case.
version: 1.0.0
phase: 5
lesson: 17
tags: [nlp, agents, chatbot]
---

Given a product context (user need, compliance constraints, available tools, data volume), output:

1. Architecture. Rule-based, retrieval, neural, LLM agent, or hybrid (specify which paths go where).
2. LLM choice if applicable. Name the model family (Claude, GPT-4, Llama-3.1, Mixtral). Match to tool-use quality and cost.
3. Grounding strategy. RAG sources, retrieval method (see lesson 14), tool contracts.
4. Evaluation plan. Task success rate, tool-call correctness, off-task rate, hallucination rate on held-out dialogs.

Refuse to recommend a pure-LLM agent for any destructive action (payments, account deletion, data modification) without a structured confirmation flow. Refuse to skip the prompt-injection audit if the agent has write access to anything.
```

## 练习

1. **简单。** 实现上面的规则回复，为咖啡店点单机器人编写 10 个模式。测试重复下单、修改、取消和意图不清等边界情况。
2. **中等。** 构建 FAQ 与 LLM 回退混合系统。为 SaaS 产品准备 50 条 FAQ，LLM 回退使用文档网站检索。在 100 个真实客服问题上测量拒答率与准确率。
3. **困难。** 用搜索、读取用户数据和发送邮件三个工具实现上面的智能体循环。运行 50 个测试场景，其中包括提示注入攻击。报告跑题率、任务失败率和任何成功注入。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 意图（intent） | 用户想做什么 | 类别标签，如 `book_flight`、`reset_password`，用于路由到处理器。 |
| 槽位（slot） | 一项信息 | 机器人需要的参数，如日期、目的地；槽位填充就是依次询问这些参数。 |
| RAG | 检索加生成 | 检索相关文档，再用它们约束 LLM 回复。 |
| 工具调用（tool call） | 函数调用 | LLM 发出带名称和参数的结构化调用，运行时执行并返回结果。 |
| 智能体循环 | 规划、行动、验证 | 控制器交错运行 LLM 与工具调用，直到任务完成。 |
| 提示注入（prompt injection） | 用户攻击提示 | 恶意输入试图覆盖系统提示。 |

## 延伸阅读

- [Turing (1950). Computing Machinery and Intelligence](https://academic.oup.com/mind/article/LIX/236/433/986238)：把对话变成领域基准的论文。
- [Weizenbaum (1966). ELIZA — A Computer Program For the Study of Natural Language Communication](https://web.stanford.edu/class/cs124/p36-weizenabaum.pdf)：基于规则聊天机器人的原始论文。
- [Colby, Weber, Hilf (1971). Artificial Paranoia](https://doi.org/10.1016/0004-3702(71)90002-6)：PARRY 的情感变量架构，首个有状态聊天机器人。
- [Thoppilan et al. (2022). LaMDA: Language Models for Dialog Applications](https://arxiv.org/abs/2201.08239)：Google 在 LLM 智能体接管前夕的神经聊天机器人论文。
- [Yao et al. (2022). ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)：命名智能体循环模式的论文。
- [Anthropic 构建有效智能体指南](https://www.anthropic.com/research/building-effective-agents)：2024 年生产建议，到 2026 年仍适用。
- [Greshake et al. (2023). Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection](https://arxiv.org/abs/2302.12173)：提示注入论文。
- [OWASP 2025 年 LLM 应用十大风险：LLM01 提示注入](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)：把提示注入列为首要安全风险的榜单。
- [AWS：防御 Amazon Bedrock Agent 间接提示注入](https://aws.amazon.com/blogs/machine-learning/securing-amazon-bedrock-agents-a-guide-to-safeguarding-against-indirect-prompt-injections/)：包含规划、验证、执行和用户确认流程的实用智能体编排层防御。
- [EchoLeak（CVE-2025-32711）](https://www.vectra.ai/topics/prompt-injection)：间接提示注入导致零点击数据外泄的经典 CVE，说明具备写权限的智能体为何需要运行时防御。
