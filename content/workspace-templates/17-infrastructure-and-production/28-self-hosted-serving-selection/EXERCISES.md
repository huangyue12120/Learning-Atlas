# 自托管推理引擎选型：练习指南

- 课程路径：`phases/17-infrastructure-and-production/28-self-hosted-serving-selection`
- 可运行 Python 文件：`main.py`

## 练习目标

根据硬件、规模、工作负载和生态状态选择 llama.cpp、Ollama、vLLM、SGLang 或 TRT-LLM。

## 动手练习

1. 用自己的硬件、规模和负载运行 `code/main.py`，检查决策树输出是否符合直觉。
2. 面对 12 张 H100 与 8 张 AMD MI300X，选择引擎并解释 TRT-LLM 为何不适用 AMD。
3. 团队想在 2026 年继续使用 TGI 时，基于 2025 年 12 月 11 日进入维护模式的事实写出迁移论证。
4. 对比 Ollama 开发环境与 vLLM 生产环境在量化、配置、并发和可观测性上的变化。
5. 为 P99 前缀长度 8K 且跨租户复用高的 RAG 产品选择引擎，并与 Phase 17 · 11、18 组合。

## 运行与验证

```bash
python3 code/main.py
```

确认每个场景都有引擎和理由输出，并保存一份包含规模与负载假设的选型记录。
