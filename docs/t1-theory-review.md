# T1 高关联中文理论审核表

审核日期：2026-08-31。上游理论源固定为 `maths-cs-ai-compendium` 的 `main` 快照 `9850ee574a370bc1cde59de98b394e953775b67d`。

本表覆盖 T1 新增的 11 篇高关联理论笔记；《抽样》已有独立的审核记录，本轮不重复计入。理论卡数按当前 311 条已批准关联中引用该 `source.path` 的数量统计。

审核口径：标题层级、公式块、代码块、表格、图片、Mermaid 和正文链接均按英文源与中文正文的顺序做结构对照；公式逐块比对；代码逐块比对（代码块不含 `math`、`figure` 和 `mermaid`）；图片路径逐一解析到上游目录。语义审核覆盖定义、机制、复杂度/数值、工程权衡、图注和练习说明。`通过` 代表该项已由维护者复核；`—` 代表源文件没有该类内容。

| # | 中文译文 | `source.path` | 理论卡 | revision | 源 SHA-256 | 标题层级（源→译） | 公式（源→译） | 代码（源→译） | 表格（源→译） | 图片（源→译） | Mermaid（源→译） | 链接（源→译） | 语义 / 公式 / 代码 / 视觉 | 状态 |
| ---: | --- | --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | `content/translations/theory/chapter-07-computational-linguistics/05-advanced-text-generation/zh.md` | `chapter 07 - computational linguistics/05. advanced text generation.md` | 26 | `9850ee574a370bc1cde59de98b394e953775b67d` | `88d96b617b14ea399f3e1806f8ca281a8215a43486dc366d24ad62da99c53303` | H1×1 H2×1 → H1×1 H2×1 | 16 → 16 | 3 → 3 | — | 8 → 8 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |
| 2 | `content/translations/theory/chapter-07-computational-linguistics/04-transformers-and-language-models/zh.md` | `chapter 07 - computational linguistics/04. transformers and language models.md` | 25 | `9850ee574a370bc1cde59de98b394e953775b67d` | `0dba3191925b7d5492b3890becde9e8d23166499af7efedbea04a31e6a173ca6` | H1×1 H2×1 → H1×1 H2×1 | 17 → 17 | 3 → 3 | — | 6 → 6 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |
| 3 | `content/translations/theory/chapter-18-ml-systems-design/03-large-scale-infrastructure/zh.md` | `chapter 18 - ML systems design/03. large scale infrastructure.md` | 16 | `9850ee574a370bc1cde59de98b394e953775b67d` | `841b9c77948b5562ca325220c837cf0ded6c3c88e452745191849ad678ecfd61` | H1×1 H2×10 H3×14 → H1×1 H2×10 H3×14 | — | 1 → 1 | 1 → 1 | 2 → 2 | — | — | 通过 / — / 通过 / 通过 | `reviewed` |
| 4 | `content/translations/theory/chapter-17-ai-inference/05-scaling-and-deployment/zh.md` | `chapter 17 - AI inference/05. scaling and deployment.md` | 14 | `9850ee574a370bc1cde59de98b394e953775b67d` | `a18d9bcb15892ca2aa52e72346cc599df3709e3096673b8cd1f8145e93f3a31b` | H1×1 H2×8 H3×3 → H1×1 H2×8 H3×3 | 2 → 2 | 2 → 2 | 2 → 2 | 1 → 1 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |
| 5 | `content/translations/theory/chapter-06-machine-learning/04-reinforcement-learning/zh.md` | `chapter 06 - machine learning/04. reinforcement learning.md` | 12 | `9850ee574a370bc1cde59de98b394e953775b67d` | `96c91eeee0c1d1c9b8deeb77ab5612c1286029a6a06a06a428d84f70d633ef39cc7` | H1×1 H2×1 → H1×1 H2×1 | 17 → 17 | 3 → 3 | 1 → 1 | 3 → 3 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |
| 6 | `content/translations/theory/chapter-07-computational-linguistics/02-text-processing-and-classic-nlp/zh.md` | `chapter 07 - computational linguistics/02. text processing and classic NLP.md` | 12 | `9850ee574a370bc1cde59de98b394e953775b67d` | `54ead3ac20bf4838be83a4f31afbdbefe87f35144bae2deb42993f8f1d0042b3` | H1×1 H2×1 → H1×1 H2×1 | 11 → 11 | 4 → 4 | — | 3 → 3 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |
| 7 | `content/translations/theory/chapter-17-ai-inference/03-serving-and-batching/zh.md` | `chapter 17 - AI inference/03. serving and batching.md` | 10 | `9850ee574a370bc1cde59de98b394e953775b67d` | `93d4761610df2814a51a8c12e25c43aa337feac3f476c5041e3b019f3c7c2bd7` | H1×1 H2×11 → H1×1 H2×11 | — | 2 → 2 | 1 → 1 | 2 → 2 | — | 1 → 1 | 通过 / — / 通过 / 通过 | `reviewed` |
| 8 | `content/translations/theory/chapter-18-ml-systems-design/01-systems-design-fundamentals/zh.md` | `chapter 18 - ML systems design/01. systems design fundamentals.md` | 10 | `9850ee574a370bc1cde59de98b394e953775b67d` | `57b3e7928b7703f36f63ffb24177f8d20637b02c12c929b7f54d3fa575b1fd3c` | H1×1 H2×10 H3×6 → H1×1 H2×10 H3×6 | — | 2 → 2 | — | 3 → 3 | — | — | 通过 / — / 通过 / 通过 | `reviewed` |
| 9 | `content/translations/theory/chapter-13-computing-and-os/03-operating-systems/zh.md` | `chapter 13 - computing and OS/03. operating systems.md` | 9 | `9850ee574a370bc1cde59de98b394e953775b67d` | `87293bf78b1f48a83f4de5c840a7596c16fb96c863b31be4dcb6666480a552a0` | H1×1 H2×11 → H1×1 H2×11 | — | 3 → 3 | — | 3 → 3 | — | — | 通过 / — / 通过 / 通过 | `reviewed` |
| 10 | `content/translations/theory/chapter-06-machine-learning/03-deep-learning/zh.md` | `chapter 06 - machine learning/03. deep learning.md` | 8 | `9850ee574a370bc1cde59de98b394e953775b67d` | `d2e677b6ca1dafa667a4f4ff12dfddee367392dd6940f25f5b6934ed21cd071d` | H1×1 H2×1 → H1×1 H2×1 | 9 → 9 | 4 → 4 | — | 5 → 5 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |
| 11 | `content/translations/theory/chapter-10-multimodal-learning/04-cross-modal-generation/zh.md` | `chapter 10 - multimodal learning/04. cross-modal generation.md` | 8 | `9850ee574a370bc1cde59de98b394e953775b67d` | `297749fe76d1d97e2bfd53936c08cf23e6a422c5487c6acb13264290484bf88e` | H1×1 H2×9 H3×28 → H1×1 H2×9 H3×28 | 11 → 11 | 3 → 3 | — | 8 → 8 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |

## 复核结论

- 11 篇共对应 150 张已批准理论卡；连同既有《抽样》的 4 张卡，当前有 12 / 104 篇中文理论全文、154 / 311 张理论卡可进入应用内中文阅读器。
- 11 篇的标题层级、段落/列表单元、公式块、代码块角色、图片占位符、表格和链接顺序均与源一致；公式内容逐块一致，代码内容逐块一致（服务示例仅有一处打印字符串中的对齐空格差异）。
- 11 篇图片引用均解析到源目录中的现有 SVG；T1 没有 Mermaid，因此没有 Mermaid 渲染项需要签核。
- 译文正文只在 `status: reviewed`、来源路径匹配、`branch: main` 且 SHA-256 与当前理论 submodule 文件一致时发布；其他状态继续回退到官方 `main` 原文。
