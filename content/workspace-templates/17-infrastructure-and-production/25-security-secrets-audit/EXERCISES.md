# 安全：密钥、轮换与审计：练习指南

- 课程路径：`phases/17-infrastructure-and-production/25-security-secrets-audit`
- 可运行 Python 文件：`main.py`

## 练习目标

用 vault、IAM、最小出站 allowlist、一致 PII tokenization 和可检索审计日志保护 LLM 服务。

## 动手练习

1. 运行 `code/main.py`，发送两条引用同一 SSN 的提示词，确认它们得到相同占位符。
2. 为 EKS 上调用 OpenAI、Anthropic 与 Weaviate 的 vLLM 部署设计网络出站策略。
3. 在 git 历史发现两年前的 key 时，说明立即轮换、清理历史和检查使用痕迹的顺序。
4. 审计日志每天增长 10 GB，设计热 30 天、温 12 个月、冷 6 年的保留层。
5. 评估是否值得将 LLM 响应中的占位符反向替换为真实值，并写出隐私与复杂度权衡。

## 运行与验证

```bash
python3 code/main.py
```

确认 tokenization、网络和审计输出都能重放，并记录一条不包含原始 PII 的证据。
