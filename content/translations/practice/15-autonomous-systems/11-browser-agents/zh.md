---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/15-autonomous-systems/11-browser-agents/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: fc1ad4d5c053b9effc8840efa4d993faabe6639a80b00a6485529331ddc0d493
status: reviewed
---

# 浏览器智能体与长时程 Web 任务

> ChatGPT agent（2025 年 7 月）将 Operator 与深度研究合并为单一浏览器/终端智能体，并以 68.9% 达到 BrowseComp 最先进水平。OpenAI 于 2025 年 8 月 31 日关闭 Operator——这是产品层的整合。Anthropic 收购 Vercept 后，将 Claude Sonnet 在 OSWorld 上的分数从不足 15% 提升至 72.5%。WebArena-Verified（ServiceNow，ICLR 2026）修正了原 WebArena 中 11.3 个百分点的假阴性率，并发布了包含 258 任务的 Hard 子集。数字都是真的，攻击面也是真的：OpenAI preparedness 负责人公开表示，对浏览器智能体的间接提示词注入“不是一个能够被完全修补的漏洞”。已有记录的 2025–2026 攻击包括 Tainted Memories（Atlas CSRF）、HashJack（Cato Networks）和 Perplexity Comet 的一键劫持。

**类型：** 学习
**语言：** Python（标准库，间接提示词注入攻击面模型）
**前置要求：** 第 15 阶段 · 10（权限模式）、第 15 阶段 · 01（长时程智能体）
**用时：** 约 45 分钟

## 问题所在

浏览器智能体是读取不可信内容、并采取有后果行动的长时程智能体。智能体访问的每个页面都是用户没有写的输入；每个页面上的表单都是潜在命令通道。2025–2026 年攻击语料表明，这不是假设：Tainted Memories 让攻击者通过精心构造的页面将恶意指令绑定到智能体记忆；HashJack 将命令藏在智能体访问的 URL 片段中；Perplexity Comet 劫持只需一次点击。

防御图景令人不安。OpenAI preparedness 负责人直言不讳：间接提示词注入“不是一个能够被完全修补的漏洞”。原因在于攻击存在于智能体的阅读—行动边界，而这个边界在架构上是模糊的——模型读取的每个 token 原则上都可能被读作指令。

本课命名攻击面、命名基准全景（BrowseComp、OSWorld、WebArena-Verified），并建模一个最小间接提示词注入情形，使你可以在第 14 和 18 课中推理真实防御措施。

## 核心概念

### 2026 全景：每个系统一段

**ChatGPT agent（OpenAI）。** 2025 年 7 月推出，将 Operator（浏览）和 Deep Research（多小时研究）统一。独立 Operator 于 2025 年 8 月 31 日关闭。在 BrowseComp 上达到 68.9% 的最先进水平；在 OSWorld 与 WebArena-Verified 上也有强劲数字。

**Claude Sonnet + Vercept（Anthropic）。** Anthropic 收购 Vercept 聚焦计算机使用能力，使 Claude Sonnet 在 OSWorld 上从 <15% 提升到 72.5%。Claude Computer Use 作为工具 API 交付。

**Gemini 3 Pro with Browser Use（DeepMind）。** Browser Use 集成提供计算机使用控制；FSF v3（2026 年 4 月，第 20 课）专门跟踪 ML 研发领域的自治。

**WebArena-Verified（ServiceNow，ICLR 2026）。** 它修正一个已充分记录的问题：原始 WebArena 有约 11.3% 的假阴性率（实际完成的任务被标为失败）。Verified 发布以人工筛选的成功标准重新评分，并增加 258 任务的 Hard 子集（ICLR 2026 论文，openreview.net/forum?id=94tlGxmqkN）。

### BrowseComp、OSWorld 与 WebArena 的比较

| 基准 | 衡量内容 | 时程 |
|---|---|---|
| BrowseComp | 在时间压力下从开放 Web 找到具体事实 | 数分钟 |
| OSWorld | 智能体操作完整桌面（鼠标、键盘、shell） | 数十分钟 |
| WebArena-Verified | 在模拟网站中完成事务性 Web 任务 | 数分钟 |
| Hard 子集 | 具有多页面状态转移的 WebArena-Verified 任务 | 数十分钟 |

它们衡量的轴不同。高 BrowseComp 分数说明智能体能找到事实，不说明它会预订航班。OSWorld 分数更接近“它是否能在我的桌面上工作”。WebArena-Verified 更接近“它能否完成一条流程”。任何生产决策都需要匹配任务分布的基准。

### 已命名的攻击面

1. **间接提示词注入。** 不可信页面内容包含指令；智能体读取它们；智能体执行它们。公开例子：2024 年 Kai Greshake 等、2025 年 Tainted Memories 论文、2026 年 HashJack（Cato Networks）。
2. **URL 片段 / 查询注入。** 被爬取 URL 的 `#fragment` 或查询字符串包含命令。它永远不被可视渲染，却仍在智能体上下文中。
3. **记忆绑定攻击。** 页面指示智能体写入持久记忆（第 12 课介绍持久状态）。下一会话中，记忆在无可见触发器下执行负载。
4. **对认证会话的 CSRF 形攻击。** Tainted Memories 类：智能体在某处已登录；攻击者页面发出状态变更请求，智能体用用户 cookie 执行。
5. **一键劫持。** 一个视觉上无害的按钮搭载智能体会跟随的负载。Comet 类。
6. **智能体宿主表面中的内容安全策略（CSP）漏洞。** 渲染和工具层本身可以成为攻击向量；浏览器内智能体的技术栈很宽。

### 为什么“无法完全修补”

攻击与智能体能力同构。智能体要完成工作，就必须读取不可信内容；它读取的任何内容都可能含有指令；它遵循的任何指令都可能与用户真实请求失配。防御措施（信任边界、分类器、工具允许列表、对有后果行动的 HITL）会提高攻击成本并缩小爆炸半径，但不能闭合这一类别。

这与第 8 课的 Löb 定理是同一种推理模式：智能体无法证明下一个 token 安全；它只能建立一个让不安全 token 更容易被检测的系统。

### 真正上线的防御姿态

- **读 / 写边界。** 阅读绝不产生后果。写入（提交表单、发布内容、调用有副作用的工具）若由信任边界外内容发起，则需新鲜的人类批准。
- **按任务的工具允许列表。** 智能体可以浏览；除非为任务显式启用，否则不能发起电汇。第 13 课介绍预算。
- **会话隔离。** 浏览器智能体会话仅使用范围受限的凭据。没有生产认证、没有个人邮箱。保留每个 HTTP 请求的日志供审计。
- **内容清理器。** 在拼接进模型上下文前，移除抓取 HTML 中已知的恶意模式。（降低容易攻击；不能阻止复杂负载。）
- **对有后果行动的人在回路。** 先提议后提交模式（第 15 课）。
- **记忆中的金丝雀 token。** 若记忆条目被触发，用户就能看到它（第 14 课）。

```figure
injection-boundary
```

## 实际运行

`code/main.py` 建模一次针对三个合成页面的微型浏览器智能体运行。一个页面良性，一个页面在可见文本中有直接提示词注入 blob，一个页面有 URL 片段注入（不可见，但在智能体上下文中）。脚本展示：(a) 朴素智能体会做什么，(b) 读/写边界能捕获什么，(c) 清理器能捕获什么，(d) 两者都捕获不到什么。

## 交付物

`outputs/skill-browser-agent-trust-boundary.md` 规定拟议浏览器智能体部署的范围：它接触哪些信任区、被授权写什么，以及首次运行前必须具备哪些防御。

## 练习

1. 运行 `code/main.py`。指出清理器能捕获、而读/写边界捕获不到的攻击，以及只有读/写边界能捕获的攻击。

2. 扩展清理器，以检测一类 HashJack 式 URL 片段注入。测量它在具有合法片段的良性 URL 上的假阳性率。

3. 选择你熟悉的一种真实浏览器智能体工作流（例如“预订航班”）。列出每次读取与写入，标出哪些写入需要 HITL 并说明原因。

4. 阅读 WebArena-Verified ICLR 2026 论文。找出原 WebArena 评分不可靠的一类任务，并解释 Verified 子集如何解决它。

5. 为浏览器智能体环境设计一个记忆金丝雀。你会存储什么、存在哪里、什么会触发告警？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|---|---|---|
| 间接提示词注入 | “恶意页面文本” | 智能体阅读的页面中含有它会执行的指令的不可信内容 |
| Tainted Memories | “记忆攻击” | 智能体将攻击者提供的指令写入持久记忆；在下个会话触发 |
| HashJack | “URL 片段攻击” | 隐藏在 URL 片段 / 查询中的负载位于智能体上下文，却未被可见渲染 |
| 一键劫持 | “恶意按钮” | 可见交互元素搭载智能体执行的后续负载 |
| BrowseComp | “Web 搜索基准” | 在开放 Web 寻找具体事实；分钟级时程 |
| OSWorld | “桌面基准” | 完整 OS 控制；多步 GUI 任务 |
| WebArena-Verified | “修复后的 Web 任务基准” | ServiceNow 重新评分的 WebArena，带 Hard 子集 |
| 读/写边界 | “副作用闸门” | 阅读绝无后果；若内容不可信，写入需要新鲜批准 |

## 延伸阅读

- [OpenAI——介绍 ChatGPT agent](https://openai.com/index/introducing-chatgpt-agent/)——Operator 和深度研究的合并；BrowseComp 最先进水平。
- [OpenAI——计算机使用智能体](https://openai.com/index/computer-using-agent/)——Operator 系谱与演变为 ChatGPT agent 的架构。
- [Zhou 等——WebArena](https://webarena.dev/)——原始基准。
- [WebArena-Verified（OpenReview）](https://openreview.net/forum?id=94tlGxmqkN)——ICLR 2026 修复子集论文。
- [Anthropic——在实践中衡量智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)——包含计算机使用智能体的攻击面讨论。
