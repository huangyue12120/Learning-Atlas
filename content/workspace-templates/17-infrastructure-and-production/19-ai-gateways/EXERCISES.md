# AI 网关：练习指南

- 课程路径：`phases/17-infrastructure-and-production/19-ai-gateways`
- 可运行 Python 文件：`main.py`

## 练习目标

用供应商路由、回退、重试、限流和 vault 密钥引用组成可审计的 LLM 控制平面。

## 动手练习

1. 运行 `code/main.py`，配置 OpenAI → Anthropic → 自托管回退，估算 5% 供应商错误率下的命中率。
2. 面对 TTFT P99 < 200 ms、基线 300 ms 的 SLA，筛选仍在延迟预算内的网关。
3. 为医疗客户要求的自托管、PII 脱敏和审计选择 Portkey OSS 或 Kong，并写出理由。
4. 比较 LiteLLM 与 Kong，给出需要迁移的 RPS、团队和治理信号。
5. 为免费、试用和付费租户设计 token bucket 或 sliding-window 限流策略。

## 运行与验证

```bash
python3 code/main.py
```

确认失败、重试和限流结果可重放，并保存一份带预算和权限边界的网关配置。
