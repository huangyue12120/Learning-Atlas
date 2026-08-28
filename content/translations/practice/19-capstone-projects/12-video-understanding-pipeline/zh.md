---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/12-video-understanding-pipeline/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 0f0605d221d1c86e81430f60a6d97bd12ae67f4f4c8369aaf4da409eaf6563ff
status: reviewed
---

# 毕业项目 12——视频理解流水线（场景、问答与搜索）

> Twelve Labs 将 Marengo + Pegasus 产品化，VideoDB 发布了视频 CRUD API，AI2 开源了 Molmo 2 VLM checkpoint，Gemini 的长上下文可以原生处理数小时视频，TimeLens-100K 定义了大规模时间 grounding。2026 年的流水线已经清晰：场景分割、逐场景字幕与嵌入、转写对齐、多向量索引，以及能够用（开始、结束）时间戳和帧预览回答问题的查询。本毕业项目要求你摄取 100 小时视频，达到公开 benchmark，并测量计数和动作问题上的幻觉。

**类型：** 毕业项目
**语言：** Python（流水线）、TypeScript（UI）
**前置课程：** 第 4 阶段（计算机视觉）、第 6 阶段（语音）、第 7 阶段（Transformer）、第 11 阶段（LLM 工程）、第 12 阶段（多模态）、第 17 阶段（基础设施）
**涉及阶段：** P4 · P6 · P7 · P11 · P12 · P17
**用时：** 30 小时

## 问题

在 2026 年的规模下，长视频问答是最消耗带宽的多模态问题。Gemini 2.5 Pro 可以原生读取 2 小时视频，但要将 100 小时视频摄取为可查询语料，仍然需要场景级索引。生产形态结合了场景分割（TransNetV2 或 PySceneDetect）、使用 VLM 的逐场景字幕生成（Gemini 2.5、Qwen3-VL-Max 或 Molmo 2）、转写对齐（带词级时间戳的 Whisper-v3-turbo），以及一个并排存储字幕、帧嵌入和转写的多向量索引。查询流水线返回（开始、结束）时间戳和帧预览。

Benchmark 是公开的（ActivityNet-QA、NeXT-GQA），还要加上自建的 100 个查询集合。计数和动作类型问题上的幻觉是已知的困难失败类别；本毕业项目会明确测量它。

## 概念

摄取时有三条流水线并行运行。**场景分割**把视频切成场景。**VLM 字幕生成**为每个场景生成字幕，并从关键帧生成帧嵌入。**ASR 对齐**产出词级时间戳。三条流通过（scene_id、时间范围）连接。每个场景在多向量索引（Qdrant）中获得三种向量：字幕嵌入、关键帧嵌入和转写嵌入。

查询时，自然语言问题同时对三种向量发起检索；结果用 RRF 合并；时间 grounding 适配器（TimeLens 风格）在最相关场景内细化（开始、结束）窗口。VLM 合成器（Gemini 2.5 Pro 或 Qwen3-VL-Max）接收查询、排名靠前的场景和裁剪帧，并带时间戳引用和帧预览回答。

幻觉测量很重要。计数问题（“有多少人进入房间？”）和动作类型问题（“厨师是在搅拌前倒入的吗？”）一向不可靠。请将它们的准确率与描述型问题分开报告。

## 架构

```text
视频文件 / URL
      |
      v
PySceneDetect / TransNetV2（场景分割）
      |
      +--- 每场景关键帧 --- VLM 字幕 + 帧嵌入
      |                    （Gemini 2.5 Pro / Qwen3-VL-Max / Molmo 2）
      |
      +--- 音频通道 --- Whisper-v3-turbo ASR + 词级时间戳
      |
      v
Qdrant 多向量：{caption_emb, keyframe_emb, transcript_emb}
      |
查询：
  对三种向量进行稠密检索 -> RRF 合并 -> top-k 场景
      |
      v
TimeLens / VideoITG 时间 grounding（在场景内细化开始/结束）
      |
      v
VLM 合成：查询 + 相关场景 + 帧预览
      |
      v
答案 +（开始、结束）时间戳 + 帧缩略图 + 引用
```

## 技术栈

- 场景分割：TransNetV2（2024–2026 年最先进）或 PySceneDetect
- ASR：通过 faster-whisper 使用带词级时间戳的 Whisper-v3-turbo
- VLM 字幕器 + 回答器：Gemini 2.5 Pro 或 Qwen3-VL-Max 或 Molmo 2
- 时间 grounding：在 TimeLens-100K 上训练的适配器或 VideoITG
- 索引：支持多向量的 Qdrant（字幕 / 帧 / 转写）
- UI：Next.js 15，带 HTML5 视频播放器和场景缩略图
- 评测：ActivityNet-QA、NeXT-GQA、自建的 100 个手工标注问题集
- 幻觉 benchmark：带人工标签的计数和动作类型子集

```figure
cf-scene-index
```

## 动手构建

1. **摄取遍历器。** 接受 YouTube URL 或本地 MP4。必要时缩小到 720p。持久化 `{video_id, file_path}`。

2. **场景分割。** 运行 TransNetV2 或 PySceneDetect，生成 `[{scene_id, start_ms, end_ms, keyframe_path}]`。目标是 100 小时：约 6k–8k 个场景。

3. **ASR 阶段。** 对音频运行 Whisper-v3-turbo，导出词级时间戳，并切出每个场景的转写片段。

4. **VLM 字幕生成。** 对每个场景，将关键帧和简短字幕模板传给 Gemini 2.5 Pro（或 Qwen3-VL-Max）。生成字幕和帧嵌入。

5. **多向量索引。** 建立包含三个命名向量的 Qdrant collection。载荷为 `{video_id, scene_id, start_ms, end_ms, keyframe_url}`。

6. **查询。** 自然语言问题触发三个稠密查询；使用 reciprocal rank fusion 合并；取 top-k=5 个场景。

7. **时间 grounding。** 在 top scene 上运行 TimeLens 风格适配器，细化场景内的（开始、结束）窗口。

8. **VLM 合成。** 使用查询、前 3 个场景片段（图像或短片）和转写调用 Gemini 2.5 Pro。要求用 `(video_id, start_ms, end_ms)` 引用。

9. **评测。** 运行 ActivityNet-QA 和 NeXT-GQA，建立 100 个查询的自定义集，报告总体准确率和按类别拆分的结果（计数、动作、描述）。

## 实际使用

```text
$ video-qa ask --url=https://youtube.com/watch?v=X "how many cars pass the intersection in the first minute?"
[scene]    23 scenes detected
[asr]      transcript complete, 4m12s
[index]    69 vectors written (23 scenes x 3)
[query]    top scene: scene 3 [01:32-01:54], confidence 0.84
[ground]   refined window: [00:12-00:58]
[synth]    gemini 2.5 pro, 1.4s
answer:    5 cars pass the intersection between 00:12 and 00:58.
citations: [scene 3: 00:12-00:58]
          [frame preview at 00:14, 00:27, 00:44, 00:51, 00:57]
```

## 交付

交付物是 `outputs/skill-video-qa.md`。给定一个 YouTube URL 或上传的视频，流水线为场景建立索引，并用带时间戳的引用回答问题。

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | 时间 grounding IoU | 在留出 grounding 集上测量交并比 |
| 20 | QA 准确率 | NeXT-GQA 和自建 100 个查询 |
| 20 | 摄取吞吐 | 每美元能处理的视频小时数 |
| 20 | UI 与引用 UX | 时间戳链接、缩略图条、跳转到帧 |
| 15 | 幻觉率 | 分开测量计数和动作类型准确率 |
| **100** | | |

## 练习

1. 将 Gemini 2.5 Pro 换成 Qwen3-VL-Max 做字幕阶段。在人工评分的 50 个场景样本上报告字幕质量差异。

2. 将每个场景的帧嵌入减少为一个池化向量，而不是多向量。测量检索退化。

3. 构建“严格计数”模式：合成器用时间戳提取每个被计数实例，让用户点击验证。测量用户验证是否降低幻觉。

4. 对摄取成本做 benchmark：比较三个 VLM 选择的每美元视频小时数，找出最佳平衡点。

5. 增加说话人分离转写：在音频上运行 pyannote 说话人分离，并按说话人嵌入转写。演示“Alice 对 X 说了什么？”这类查询。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Scene segmentation | “镜头检测” | 在镜头边界处把视频切成场景 |
| Multi-vector index | “字幕 + 帧 + 转写” | 每种表示使用命名向量的 Qdrant collection |
| Temporal grounding | “它究竟什么时候发生” | 细化查询答案对应的（开始、结束）窗口 |
| Frame embedding | “视觉表示” | 关键帧的向量嵌入，用于场景视觉相似度 |
| RRF fusion | “倒数排名融合” | 合并多个排序列表的策略，是经典混合检索技巧 |
| Counting hallucination | “数错了” | VLM 在“有多少个 X”问题上的已知失败模式 |
| ActivityNet-QA | “视频问答 benchmark” | 长视频问答准确率 benchmark |

## 延伸阅读

- [AI2 Molmo 2](https://allenai.org/blog/molmo2)——开放 VLM checkpoint
- [TimeLens（CVPR 2026）](https://github.com/TencentARC/TimeLens)——大规模时间 grounding
- [Gemini 视频长上下文](https://deepmind.google/technologies/gemini)——托管参考
- [VideoDB](https://videodb.io)——视频 CRUD API 参考
- [Twelve Labs Marengo + Pegasus](https://www.twelvelabs.io)——商业参考
- [TransNetV2](https://github.com/soCzech/TransNetV2)——场景分割模型
- [PySceneDetect](https://github.com/Breakthrough/PySceneDetect)——经典开源替代方案
- [ActivityNet-QA](https://arxiv.org/abs/1906.02467)——参考评测 benchmark
