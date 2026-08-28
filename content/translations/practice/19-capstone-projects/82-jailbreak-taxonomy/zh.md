---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/82-jailbreak-taxonomy/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: f99867815ae2040c21a5c28a41aec2615e67da79de46d86749fd8c0bd97c1c9f
status: reviewed
---

# Capstone 82——越狱攻击分类

> 没有攻击分类法的安全框架就像抛硬币。先给攻击命名，再谈防御。

**类型：** 构建
**语言：** Python
**前置课程：** Phase 18 安全课程、Phase 19 Track A 课程 25–29
**用时：** 约 90 分钟

## 问题

没有攻击模型就部署模型，等于没有针对任何具体对象进行防御。运维人员在 Twitter 上看到一条越狱讨论，认出其中的套路，写一条正则上线，然后继续往前走。下一个提示只是把原话换个说法，正则就失效了。一周后，又有人把同一套路包进 base64，运维人员再补第二条正则。到了第三个月，系统里堆着 40 条打补丁式规则，团队没有共享词汇，既说不清一种攻击究竟是什么，也无法阻止待处理问题以快于补丁的速度增长。

在本 Track 中，检测器、分类器或规则引擎要先发挥作用，团队必须先有一套共同的攻击标注方式。这不是因为标签本身能阻止攻击，而是因为标签能把攻击流转成直方图；直方图可以变成覆盖率图表，覆盖率图表又能决定下一个迭代周期的工作重点。课程 83–87 的防护框架需要判断：某个提示究竟是针对拒答策略的 role-play 攻击，还是针对工具的 context-smuggling 攻击。没有分类法，这个判断无从谈起。

本 Capstone 定义六类攻击：范围足够广，可以覆盖现实中常见的大多数攻击；边界又足够清晰，通常能让两位评审对类别达成一致；同时还足够具体，使每类至少有七个手工构造的 fixture。这个分类法是后续所有工作的共同载体。

## 概念

六类攻击沿着同一条轴划分：攻击滥用了哪一道信任边界？每个名称都对应一条边界。

| 类别 | 被滥用的信任边界 |
|---|---|
| role-play | 助手的人设 |
| instruction-override | 系统提示的权威性 |
| context-smuggling | 用户内容与指令内容之间的间隙 |
| multi-turn-ramp | 作为契约的对话历史 |
| encoding-trick | 被禁止 token 的表面形式 |
| prefix-injection | 助手的下一个 token 决策 |

角色扮演攻击把助手重新描述成另一个代理（例如“你是名为 QX 的不受限制的研究模型”），让绑定原本人设的拒答规则不再触发。指令覆盖攻击说“忽略之前的指令”，试图直接改写系统提示的权威。上下文走私把指令藏在看似只是数据的粘贴文档、工具结果或代码块中。多轮递进先用无害对话让模型进入状态，再一步一步降低要求，利用模型保持对话一致性的倾向。编码技巧通过 base64、rot13、leet-speak 或插入零宽字符隐藏被禁止的 token，使朴素关键词过滤器看不到它们。前缀注入则以“好的，下面是具体方法”之类的前缀结束提示，让模型沿着预设答案继续生成，而不是拒答。

```mermaid
flowchart TB
  P[提示词] --> C{属于哪种边界}
  C -->|人物设定（persona）| RP[角色扮演（role-play）]
  C -->|系统提示词（system prompt）| IO[指令覆盖（instruction-override）]
  C -->|数据与指令（data vs instruction）| CS[上下文走私（context-smuggling）]
  C -->|历史记录（history）| MT[多轮递进（multi-turn-ramp）]
  C -->|表面形式（surface form）| ET[编码技巧（encoding-trick）]
  C -->|续写（continuation）| PI[前缀注入（prefix-injection）]
  RP --> H[(频数直方图)]
  IO --> H
  CS --> H
  MT --> H
  ET --> H
  PI --> H
  H --> D[覆盖率图]
```

每个 fixture 是一条包含 `id`、`category`、`subtype`、`prompt`、`target_behavior` 和 `severity` 的记录。分类对象加载这些 fixture，按类别分组，并提供 `match` API：给定一个候选提示，返回最相近的 fixture 及其类别。匹配使用字符 trigram 余弦相似度，粗粒度、速度快且不依赖第三方库。它不是检测器；检测器位于第 83 课。本课的对象负责产出标签。

严重度为 1–5 级：1 级是针对无害目标的笨拙攻击（例如“请假装自己是海盗”），5 级是成功后会产生部署系统绝不能输出的内容（例如危险活动的操作细节）。大多数 fixture 处于 2–3 级，因为生产规模的真实攻击往往简单而偷懒。严重度由 fixture 作者设定；两位评审相差超过一级，说明评分标准需要进一步明确。

```figure
cd-attack-taxonomy
```

## 动手构建

语料位于 `code/fixtures.py`，是一份单独的 Python 列表。`code/main.py` 加载并验证语料，确保每类至少七个 fixture，提供 `by_category`、`match` 和 `stats` 方法，并运行一个打印类别直方图的 demo。字符 trigram 余弦相似度用 numpy 从头实现。

验证器检查四条不变量：每个 fixture 的 prompt 非空；规格中的每个类别都出现；severity 位于 `1..5`；每个 fixture id 唯一。验证失败会硬退出而不是发出警告，因为后续整个 Track 都依赖语料内部一致。

## 使用它

从课程 `code/` 目录运行 `python3 main.py`。演示打印各类数量，运行三个样例匹配，并将 `taxonomy.json` 写入输出目录。下游课程读取 `taxonomy.json`，而不是直接导入 Python 模块，因此这份语料以稳定制品形式交付。

## 交付

`outputs/skill-jailbreak-taxonomy.md` 记录六类及评分标准。课程 87 的每个发现都会引用 taxonomy id。

## 练习

1. 增加 indirect-prompt-injection 类，编写十个 fixture 并重新验证。
2. 用 token 编辑距离替换 trigram 余弦，测量匹配变化。
3. 从脱敏产品日志增加 30 个 fixture，确认类别分布符合直觉。

## 关键术语

| 术语 | 常见用法 | 精确含义 |
|---|---|---|
| jailbreak | 任意不安全的模型输出 | 产生违反既定策略输出的提示 |
| taxonomy | 类别列表 | 按攻击滥用的信任边界划分攻击 |
| fixture | 测试样例 | 带类别、严重度和目标行为标签的提示 |
| severity | 输出有多糟 | 攻击成功时影响的 1–5 级排名 |
| match | 检测决策 | 按 trigram 余弦相似度为新提示分配类别 |

## 延伸阅读

本课是入口。课程 83–87 会直接基于这份语料构建。
