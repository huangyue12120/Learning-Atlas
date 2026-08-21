# 中文译文术语基线

本表适用于 `content/translations/practice/` 的中文学习改编，随 v0.2 建立。英文术语在代码、类名、API、产品名和文件名中保持原样；正文首次出现时可保留英文括注，后续使用下表中的中文。

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| feature | 特征 | `feature engineering` 译为“特征工程”；表示一般属性时使用“属性”或“特性”，不要把两者混作 feature。 |
| parameter / hyperparameter | 参数 / 超参数 | 模型训练得到的是参数，训练前设定的是超参数。 |
| model bias / statistical bias | 偏置 / 偏差 | 神经网络的 bias term 译为“偏置”；统计估计的 systematic bias 和 bias–variance 中的 bias 译为“偏差”。 |
| embedding | 嵌入 | 向量本身可称“嵌入向量”，不要在同一概念上交替使用“表示”与“嵌入”。 |
| model token | 词元 | 指分词器或语言模型处理的单位。 |
| token bucket / access token / canary token | 令牌桶 / 访问令牌 / 金丝雀令牌 | 安全认证和限流语境不使用“词元”。 |
| prompt | 提示词 | `prompt template` 译为“提示词模板”。 |
| prompt engineering | 提示词工程 | 不使用“提示工程”。 |
| prompt injection | 提示注入 | `system prompt` 译为“系统提示词”。 |
| agent | 智能体 | 正文中的通用概念统一使用“智能体”；代码标识符、框架名称、产品名称和文件名保留英文。 |
| retrieval / chunk / reranking | 检索 / 分块 / 重排 | `retrieval-augmented generation` 译为“检索增强生成”，不要把 reranking 写成“重新排序”。 |
| evaluation / benchmark | 评估 / 基准测试 | `evaluation suite` 可译为“评测套件”；分类指标中的 `precision` 译为“精确率”，不要与一般测量精度混用。 |
| model inference / statistical inference / NLI | 推理 / 统计推断 / 自然语言推断 | “推理”指模型计算或逻辑过程；“推断”用于统计 inference；NLI 使用固定译法。 |
| statistical sampling / generation sampling | 抽样 / 采样 | 统计学从总体取样使用“抽样”；生成模型选择下一个输出使用“采样”。 |
| normalization / standardization / Unicode normalization | 归一化 / 标准化 / 规范化 | 数值或向量 normalization 用“归一化”；z-score 等 statistical standardization 用“标准化”；Unicode normalization 和 canonicalization 用“规范化”。 |
| accuracy / precision / recall | 准确率 / 精确率 / 召回率 | 三者作为分类指标时固定使用这组译法；“精度”只用于一般数值或测量语境。 |

## 复核规则

- 术语统一不能改变公式、代码、API 名称、文件路径、Mermaid 拓扑或原文技术含义。
- 对同一个英文术语存在领域差异时，以语境优先；例如 token 在模型语境中是“词元”，在访问控制语境中是“令牌”。
- 新增译文或修改旧译文后，运行 `python3 scripts/check_translation_correspondence.py` 和 `python3 scripts/check_source_fingerprints.py`，并在本表中补充跨课程复用的术语。
