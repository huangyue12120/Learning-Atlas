---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/20-benchmarks-webarena-osworld/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 5f2b258833ea48979405b3f939f5765a667a5a28ae0786b4c208710ac6d8c717
status: reviewed
---

# 基准：WebArena 与 OSWorld

> WebArena 在四个自托管应用中测试网页智能体能力。OSWorld 在 Ubuntu、Windows、macOS 上测试桌面智能体能力。在发布时（2023–2024），二者都展示了顶尖智能体与人类之间的巨大差距。差距正在缩小，但失败模式没有改变。

**类型：** 学习
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 19 节（SWE-bench、GAIA）
**用时：** 约 60 分钟

## 学习目标

- 描述 WebArena 的四个自托管应用，以及为什么基于执行的评估很重要。
- 解释为什么 OSWorld 使用真实操作系统截图，而不是无障碍 API。
- 说出 OSWorld 的两个主要失败模式：GUI grounding 和操作知识。
- 总结 OSWorld-G 和 OSWorld-Human 在基础基准之上增加的内容。

## 问题所在

通用智能体可以调用工具，但它们能否通过 20 次点击驱动浏览器，完成一次购物结账？能否只用键盘和鼠标配置 Linux 机器？WebArena 与 OSWorld 回答的就是这些问题。

## 核心概念

### WebArena（Zhou 等，ICLR 2024）

- 四个自托管网页应用中的 812 个长时程任务：购物网站、论坛、类似 GitLab 的开发工具、业务 CMS。
- 另有工具：地图、计算器、草稿板。
- 通过 gym API 做基于执行的评估——订单是否提交、issue 是否关闭、CMS 页面是否更新？
- 发布时：最佳 GPT-4 智能体成功率为 14.41%，人类为 78.24%。

自托管框架很重要——因为目标应用被固定且可复现，基准不会因为外部服务波动而变得不稳定。

### 扩展

- **VisualWebArena**——视觉 grounding 任务，成功取决于对图像的理解（截图是一等观察结果）。
- **TheAgentCompany**（2024 年 12 月）——增加终端 + 编码，更接近真实远程办公环境。

### OSWorld（Xie 等，NeurIPS 2024）

- 跨 Ubuntu、Windows、macOS 的 369 个真实计算机任务。
- 对真实应用进行自由形式的键盘和鼠标控制。
- 以 1920×1080 截图作为观察结果。
- 发布时：最佳模型 12.24%，人类为 72.36%。

### 主要失败模式

1. **GUI grounding。** 像素到元素的映射。模型难以在 1920×1080 画面中可靠定位 UI 元素。
2. **操作知识。** 哪个菜单有某个设置、哪个键盘快捷键、哪个偏好设置面板。这是人类多年积累的知识尾部。

### 后续工作

- **OSWorld-G**——564 个样本的 grounding 套件 + Jedi 训练集。将 grounding 与规划分开，从而可以分别测量。
- **OSWorld-Human**——人工整理的黄金行动轨迹。它显示顶尖智能体使用的步数是必要步数的 1.4–2.7 倍（轨迹效率差距）。

### 为什么重要

Claude computer use、OpenAI CUA、Gemini 2.5 Computer Use（第 21 节）都在受 WebArena 和 OSWorld 形塑的工作负载上训练。基准是目标；生产模型是交付的答案。

### 基准测试会在哪里出错

- **只用截图评估。** OSWorld 由截图驱动；如果在 OSWorld 上评估使用 DOM 或无障碍 API 的智能体，就会漏掉 grounding 挑战。
- **忽略轨迹长度。** 只看成功率会漏掉 OSWorld-Human 暴露的 1.4–2.7 倍步数低效。
- **自托管应用过时。** WebArena 的应用固定了特定版本；不重新整理就升级版本，会破坏可比性。

```figure
ae-agent-human-gap
```

## 动手构建

code/main.py 实现一个玩具网页智能体 harness：

- 最小“购物应用”状态机：list_items、add_to_cart、checkout。
- 3 个任务的黄金轨迹。
- 一个尝试完成每个任务的脚本化智能体。
- 基于执行的评估器（状态检查）和轨迹效率指标（步数相对黄金轨迹）。

运行：

```
python3 code/main.py
```

输出每个任务的成功率和轨迹效率，复现 OSWorld-Human 的方法。

## 实际使用

- **WebArena Verified**——在内部集群中自托管，用于持续评估。
- **OSWorld**——在虚拟机集群中用于桌面智能体。
- **计算机使用智能体**（第 21 节）——Claude、OpenAI CUA、Gemini 都在此类工作负载上训练。
- **自己的产品流程**——为排名前 20 的任务捕获黄金轨迹，每周运行智能体。

## 交付

outputs/skill-web-desktop-harness.md 会构建一个网页/桌面智能体 harness，带基于执行的评估和轨迹效率指标。

## 练习

1. 为玩具 harness 增加第二个应用（论坛）。编写 3 个任务和对应黄金轨迹。
2. 增加按任务报告的轨迹效率。在玩具实现中，智能体是黄金轨迹的 1 倍、2 倍还是 3 倍？
3. 实现一个“干扰”工具——黄金轨迹从未使用它。脚本化智能体会被诱惑吗？
4. 阅读 OSWorld-G。在自己的评估中，如何将 grounding 失败与规划失败分开？
5. 阅读 WebArena 的应用 README。升级某个固定版本应用时会破坏什么？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| WebArena | “网页智能体基准” | 4 个自托管应用中的 812 个任务；gym 风格评估 |
| VisualWebArena | “视觉 WebArena” | 视觉 grounding 的 WebArena；截图是观察结果 |
| OSWorld | “桌面智能体基准” | 真实 Ubuntu/Windows/macOS 上的 369 个任务 |
| GUI grounding | “像素到元素映射” | 模型在 1920x1080 中定位 UI 元素 |
| Operational knowledge | “操作系统经验” | 哪个菜单、哪个快捷键、哪个偏好设置面板 |
| OSWorld-G | “Grounding 套件” | 564 个仅 grounding 样本 + 训练集 |
| OSWorld-Human | “黄金轨迹” | 用来测量效率的人工专家行动序列 |
| Trajectory efficiency | “相对黄金轨迹的步数” | 智能体步数除以人类最少步数 |

## 延伸阅读

- [Zhou 等，WebArena（arXiv:2307.13854）](https://arxiv.org/abs/2307.13854)——四应用网页基准
- [Xie 等，OSWorld（arXiv:2404.07972）](https://arxiv.org/abs/2404.07972)——跨操作系统桌面基准
- [Anthropic，Introducing computer use](https://www.anthropic.com/news/3-5-models-and-computer-use)——Claude 的、由基准塑形的能力
- [OpenAI，Computer-Using Agent](https://openai.com/index/computer-using-agent/)——OSWorld 与 WebArena 数字
