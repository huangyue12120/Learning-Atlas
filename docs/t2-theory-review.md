# T2 中关联理论 A 审核表

审核日期：2026-09-02。上游理论源固定为 `maths-cs-ai-compendium` 的 `main` 快照 `9850ee574a370bc1cde59de98b394e953775b67d`。

本表覆盖 T2 新增的 13 篇中关联理论笔记；理论卡数按当前 311 条已批准关联中引用该 `source.path` 的数量统计，共 76 条。此前已审核的《抽样》和 T1 的 11 篇高关联笔记不在本表重复计入。

审核口径：标题层级、公式块、代码块、表格、图片、Mermaid 和正文链接均按英文源与中文正文的顺序做结构对照；公式逐块比对；代码逐块比对（代码块不含 `math`、`figure` 和 `mermaid`）；图片路径逐一解析到上游目录。语义审核覆盖定义、机制、复杂度/数值、工程权衡、图注和练习说明。`通过` 代表该项已由维护者复核；`—` 代表源文件没有该类内容。

| # | 中文译文 | `source.path` | 理论卡 | revision | 源 SHA-256 | 标题层级（源→译） | 公式（源→译） | 代码（源→译） | 表格（源→译） | 图片（源→译） | Mermaid（源→译） | 链接（源→译） | 语义 / 公式 / 代码 / 视觉 | 状态 |
| ---: | --- | --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | `content/translations/theory/chapter-03-calculus/05-optimisation/zh.md` | `chapter 03 - calculus/05. optimisation.md` | 7 | `9850ee574a370bc1cde59de98b394e953775b67d` | `ab7d84558c2298a32a74f7f61d009624eb2886606e0940661dc250338caee756` | H1×1 H2×1 → H1×1 H2×1 | 5 → 5 | 3 → 3 | — | 4 → 4 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |
| 2 | `content/translations/theory/chapter-05-probability/05-information-theory/zh.md` | `chapter 05 - probability/05. information theory.md` | 7 | `9850ee574a370bc1cde59de98b394e953775b67d` | `8d2c18d291775e88e92e471f6b485aee0ce8d0d88b24df1cb2ca448b9a671fc4` | H1×1 H2×1 → H1×1 H2×1 | 8 → 8 | 4 → 4 | — | 2 → 2 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |
| 3 | `content/translations/theory/chapter-06-machine-learning/01-classical-machine-learning/zh.md` | `chapter 06 - machine learning/01. classical machine learning.md` | 6 | `9850ee574a370bc1cde59de98b394e953775b67d` | `c6006efac1536fd074e17c3c5dea9781c0e5c44c3780f7448bbc2e11918e7f54` | H1×1 H2×1 → H1×1 H2×1 | 14 → 14 | 4 → 4 | 1 → 1 | 5 → 5 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |
| 4 | `content/translations/theory/chapter-07-computational-linguistics/03-embeddings-and-sequence-models/zh.md` | `chapter 07 - computational linguistics/03. embeddings and sequence models.md` | 6 | `9850ee574a370bc1cde59de98b394e953775b67d` | `cf467c1180cc5100ff9736bfe3244917358a2915bd3075d89870dfc55c2dc437` | H1×1 H2×1 → H1×1 H2×1 | 10 → 10 | 3 → 3 | — | 5 → 5 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |
| 5 | `content/translations/theory/chapter-08-computer-vision/04-vision-transformers-and-generation/zh.md` | `chapter 08 - computer vision/04. vision transformers and generation.md` | 6 | `9850ee574a370bc1cde59de98b394e953775b67d` | `6ce5bcea1aee83c498853caeb202345690e4c26e561d5e4fbe18a66fe7583dea` | H1×1 H2×1 → H1×1 H2×1 | 9 → 9 | 3 → 3 | — | 3 → 3 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |
| 6 | `content/translations/theory/chapter-14-data-structures-and-algorithms/04-graphs/zh.md` | `chapter 14 - data structures and algorithms/04. graphs.md` | 6 | `9850ee574a370bc1cde59de98b394e953775b67d` | `e2bd3fed00e6a650f86b6d07a2d8d3263976543dba09ed7c9ddca6b3dfd93697` | H1×1 H2×7 H3×10 → H1×1 H2×7 H3×10 | — | 9 → 9 | 1 → 1 | — | — | 14 → 14 | 通过 / — / 通过 / 通过 | `reviewed` |
| 7 | `content/translations/theory/chapter-15-production-software-engineering/04-testing-and-quality-assurance/zh.md` | `chapter 15 - production software engineering/04. testing and quality assurance.md` | 6 | `9850ee574a370bc1cde59de98b394e953775b67d` | `75cfe1f8703e3112959a0c6f1c941c3b0a28020f42344d8b83d66e0079a5fa8c` | H1×1 H2×7 H3×5 → H1×1 H2×7 H3×5 | — | 18 → 18 | — | — | — | — | 通过 / — / 通过 / 通过 | `reviewed` |
| 8 | `content/translations/theory/chapter-17-ai-inference/02-efficient-architectures/zh.md` | `chapter 17 - AI inference/02. efficient architectures.md` | 6 | `9850ee574a370bc1cde59de98b394e953775b67d` | `a0011aa9b67a35918d63e4d6c18febf8699183fdf1fdcbd566142a47f4206370` | H1×1 H2×9 H3×3 → H1×1 H2×9 H3×3 | 7 → 7 | 3 → 3 | — | 2 → 2 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |
| 9 | `content/translations/theory/chapter-18-ml-systems-design/04-ml-systems-design/zh.md` | `chapter 18 - ML systems design/04. ML systems design.md` | 6 | `9850ee574a370bc1cde59de98b394e953775b67d` | `76746c0492a2391388c3dc8f24b5e9b44d22c475ff7a58ed200bc3a2f2952a30` | H1×1 H2×8 H3×16 → H1×1 H2×8 H3×16 | — | 2 → 2 | — | 3 → 3 | — | — | 通过 / — / 通过 / 通过 | `reviewed` |
| 10 | `content/translations/theory/chapter-02-matrices/03-operations/zh.md` | `chapter 02 - matrices/03. operations.md` | 5 | `9850ee574a370bc1cde59de98b394e953775b67d` | `3627030fc60d19cc16f1010a0f73f8d744168e2e4e80c6b66f30e118e2aaabdc` | H1×1 H2×1 → H1×1 H2×1 | 12 → 12 | 2 → 2 | — | — | — | — | 通过 / 通过 / 通过 / — | `reviewed` |
| 11 | `content/translations/theory/chapter-02-matrices/05-decompositions/zh.md` | `chapter 02 - matrices/05. decompositions.md` | 5 | `9850ee574a370bc1cde59de98b394e953775b67d` | `6a27913c7cbf413e47e530aa26e0208eeef8da682a434931882104e14c34368e` | H1×1 H2×1 → H1×1 H2×1 | 4 → 4 | 3 → 3 | — | 5 → 5 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |
| 12 | `content/translations/theory/chapter-05-probability/03-distributions/zh.md` | `chapter 05 - probability/03. distributions.md` | 5 | `9850ee574a370bc1cde59de98b394e953775b67d` | `1e051833fd2dde6957d8c2bc859d0dd7075bd09518aae0632904c0a039c75efa` | H1×1 H2×1 → H1×1 H2×1 | 12 → 12 | 4 → 4 | 1 → 1 | 3 → 3 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |
| 13 | `content/translations/theory/chapter-05-probability/04-bayesian/zh.md` | `chapter 05 - probability/04. bayesian.md` | 5 | `9850ee574a370bc1cde59de98b394e953775b67d` | `f6225ca0de169e09fcc8a03f9eed9beae3484d9020409f9f7580c463dbd524a3` | H1×1 H2×1 → H1×1 H2×1 | 9 → 9 | 4 → 4 | — | 3 → 3 | — | — | 通过 / 通过 / 通过 / 通过 | `reviewed` |

## 复核结论

- 13 篇共对应 76 张已批准理论卡；连同既有《抽样》和 T1 的 11 篇高关联笔记，当前有 25 / 104 篇中文理论全文、230 / 311 张理论卡可进入应用内中文阅读器。
- 13 篇的标题层级、段落/列表单元、公式块、代码块角色、图片占位符、表格和链接顺序均与源一致；公式内容逐块一致，代码内容逐块一致；《图》的 14 个正文链接在译文中保持原目标和顺序。
- T2 译文没有 Mermaid 图；所有图片引用均解析到源目录中的现有 SVG。概率、贝叶斯和信息论三篇的公式、练习与代码顺序已逐段复核，未压缩为摘要。
- 译文正文只在 `status: reviewed`、来源路径匹配、`branch: main` 且 SHA-256 与当前理论 submodule 文件一致时发布；其他状态继续回退到官方 `main` 原文。
