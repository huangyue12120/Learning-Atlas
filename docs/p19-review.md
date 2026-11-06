# P19 综合项目接入复核记录

日期：2026-11-06。目标版本：v0.32.0。当前制作状态：首三批资源完成，P19 保持 staged。

本轮由用户明确授权 Codex 对新增测验和理论卡扩展逐项进行语义复核，并据此继续发布；此记录是 Codex 复核记录，不是外部独立审核或人工签核。22 条理论关联沿用已有 `approved`，不新建关联、不改变来源或锚点含义。既有 85 篇译文仍沿用先前审核状态；本次只补中文锚点和显式编者注。

## 冻结范围

- 实践快照：`d7b5633f91591ee3bf55c8d80831b515498cc0e6`。
- 理论快照：`9850ee574a370bc1cde59de98b394e953775b67d`。
- 五批依次为 01–17（17 课 / 118 题）、20–29（10 / 64）、30–49（20 / 120）、50–69（20 / 120）、70–87（18 / 108）。上游没有第 18、19 课，不补造课程。
- 开放必须满足 85 课 / 530 题 / 85 份指南 / 22 张扩展理论卡，且私人工作区、来源门禁、监控与桌面/窄屏验收通过；前两个制作提交均不开放部分课程。
- 测验保留上游题目顺序、stage、选项顺序和正确索引。题目与原文/代码有冲突时，以显式编者注说明，不伪造来源。新增测验语义复核不计作正式逐段证据映射；候选证据仍为草稿。

## 测验与练习指南逐课记录

每行涵盖该课全部题目；逐题检查定义、数量关系、公式、正误选项的互斥性、代码行为和解析。指南核对实际 Python 入口、目录与测试位置，区分离线模拟和生产扩展。运行验收另行记录，不把文件存在当作已执行。

| 课程 | 题数 | 测验复核 | 指南复核 |
| --- | ---: | --- | --- |
| `01-terminal-native-coding-agent` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `02-rag-over-codebase` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `03-realtime-voice-assistant` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `04-multimodal-document-qa` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `05-autonomous-research-agent` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `06-devops-troubleshooting-agent` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `07-end-to-end-fine-tuning-pipeline` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `08-production-rag-chatbot` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `09-code-migration-agent` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `10-multi-agent-software-team` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `11-llm-observability-dashboard` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `12-video-understanding-pipeline` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `13-mcp-server-with-registry` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `14-speculative-decoding-server` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `15-constitutional-safety-harness` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `16-github-issue-to-pr-agent` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `17-personal-ai-tutor` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `20-agent-harness-loop-contract` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `21-tool-registry-schema-validation` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `22-jsonrpc-stdio-transport` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `23-function-call-dispatcher` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `24-plan-execute-control-flow` | 7 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `25-verification-gates-observation-budget` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `26-sandbox-runner-denylist` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `27-eval-harness-fixture-tasks` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `28-observability-otel-traces` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `29-end-to-end-coding-task-demo` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `30-bpe-tokenizer-from-scratch` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `31-tokenized-dataset-sliding-window` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `32-token-positional-embeddings` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `33-multihead-self-attention` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `34-transformer-block` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `35-gpt-model-assembly` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `36-training-loop-eval` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `37-loading-pretrained-weights` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `38-classifier-finetuning` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `39-instruction-tuning-sft` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `40-dpo-from-scratch` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `41-eval-pipeline` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `42-large-corpus-downloader` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `43-hdf5-tokenized-corpus` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `44-cosine-lr-warmup` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `45-gradient-clipping-amp` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `46-gradient-accumulation` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `47-checkpoint-save-resume` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `48-distributed-fsdp-ddp` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |
| `49-lm-eval-harness` | 6 | 题干、选项、答案、解析逐项核对 | 指令、对照实验与完成判据已核对 |

## 语义问题与处置

- 01–17：把目标吞吐、成本节省、模型性能和模拟实验结果表述为有条件的目标或演示，不写成普遍保证；第 13 课区分发布 Registry 与运行时发现；第 17 课不把模拟掌握度增益说成教学效果实证。
- 26 / 第 5 题：原选项 `os.setrlimit` 不存在；保持正确索引，改为 POSIX 的 `resource.setrlimit(RLIMIT_AS)`，解析注明平台与 `preexec_fn` 边界。正文未使用错误接口，无需改写。
- 27 / 第 2 题：独立尝试近似 `1-(1-p)^k` 与第 72 课的组合估计分开；当 p=3/5、k=5 时前者约 0.99，不能当作后者。
- 28 / 第 1 题：OTel 后端仍需兼容接收或转换配置，避免“一次导出任意后端直接可读”的保证。
- 37 / 第 6 题：前后生成文本相同只是诊断信号，不能单独断定权重没有加载。
- 38 / 第 2 题：padding 污染池化表示，不必然让向量趋于零。
- 40：明确 beta>0 的梯度符号条件；长度归一化改变标准 DPO 目标；IPO 按当前代码的 `(margin-1/(2*beta))²` 解释。
- 41 / 第 2 题：先累加有效词元 NLL 再取指数；平均各 batch perplexity 不等价，即便 batch 等长也不成立。
- 42：检查点可能领先于实际字节，恢复正确性依赖实际长度与前缀哈希校验；正文补编者注。哈希可检错，但防主动篡改需要可信预期值或签名。
- 43：当前 writer 最终 resize 到有效长度，`token_count` 不是掩盖尾部补零的必要条件；代码在创建结构后启用 writer SWMR 并 flush，修正原第 5 题与当前实现不符的说法。chunk 读取放大不承诺固定 2 倍。
- 44–47：非零最低学习率是策略选择；裁剪梯度不等于限制 AdamW 参数步长；BF16 仍可能出现非有限值；等价累积需相同批次权重；atomic replace 不等于 fsync 断电持久性。
- 48 / 第 6 题：`param_sum` 一致只说明校验和值一致，不能证明所有参数逐元素相等。
- 49 / 第 3 题：移除 builtins 不能安全执行任意恶意 Python；指南限定可信课程样例。

## 理论卡逐卡记录

22 张卡均逐项核对 context、intuition、2–4 条 key_points、application、自检问题以及实践/理论锚点。来源只支持基础概念时，卡片明确把课程特有方法归到本课，不将生产保证或专门推导归给基础理论。移除旧摘要中的“候选待审核”和“扩展待迁移”残留，关联批准状态不变。

| 卡片 | 中文实践锚点 | 复核结果 |
| --- | --- | --- |
| `01-terminal-native-coding-agent/agent-loop-tool-feedback` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `01-terminal-native-coding-agent/sandbox-and-resource-budgets` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `02-rag-over-codebase/hybrid-retrieval-and-grounding` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `03-realtime-voice-assistant/streaming-asr-and-turn-detection` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `03-realtime-voice-assistant/streaming-latency-and-audio-buffering` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `04-multimodal-document-qa/late-interaction-vector-retrieval` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `05-autonomous-research-agent/experiment-tree-search` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `06-devops-troubleshooting-agent/evidence-graph-and-reliability` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `07-end-to-end-fine-tuning-pipeline/sft-dpo-objectives` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `08-production-rag-chatbot/rag-caching-and-grounding` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `09-code-migration-agent/migration-gates-and-test-coverage` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `10-multi-agent-software-team/typed-handoffs-and-coordination` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `11-llm-observability-dashboard/trace-spans-and-drift-signals` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `12-video-understanding-pipeline/temporal-video-retrieval` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `13-mcp-server-with-registry/registry-and-runtime-discovery` | `the-two-discovery-layers` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `13-mcp-server-with-registry/stateless-authorization-boundary` | `authorization-and-policy` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `14-speculative-decoding-server/speculative-decoding-throughput` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `15-constitutional-safety-harness/safety-harness-evaluation` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `16-github-issue-to-pr-agent/ci-verification-gates` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `16-github-issue-to-pr-agent/github-pr-review-and-branch-safety` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `17-personal-ai-tutor/adaptive-tutor-efficacy-study` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |
| `17-personal-ai-tutor/curriculum-graph-prerequisites` | `concept` | 来源边界、扩展字段与自检问题通过 Codex 复核 |

## 运行与发布验收

首个制作提交只完成前三批资源与 22 张卡，运行集成仍待完成。最终提交补充命令、实际结果、跳过项及原因；不会以结构检查替代技术语义或执行结果。

首批静态验收：1607 条来源指纹、354 份测验对应、全部实践/理论译文结构、289 张已发布卡的契约以及 22 张待发布卡的扩展字段、仓库卫生和 `git diff --check` 均通过。`assessment_review.py --write/--check` 同步到 2134 题，正式证据仍为 177 条。测验对应新增 3 条词面提示（39/1、41/3、47/6）经核对为自然翻译或表述修正，不是题目缺失。正确答案长度偏差仍由质量报告跟踪，不宣称已消除。
