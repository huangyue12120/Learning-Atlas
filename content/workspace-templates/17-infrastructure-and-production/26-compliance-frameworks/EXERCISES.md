# 合规框架：练习指南

- 课程路径：`phases/17-infrastructure-and-production/26-compliance-frameworks`
- 可运行 Python 文件：`main.py`

## 练习目标

把 SOC 2、HIPAA、GDPR、PCI-DSS、EU AI Act 和 ISO 42001 的要求映射到可执行控制。

## 动手练习

1. 运行 `code/main.py`，为要求 SOC 2 Type II、HIPAA BAA 和 EU AI Act 声明的企业客户写出最小可行合规立场。
2. 将三个假设 LLM 产品按 EU AI Act 风险层级分类，说明高风险时新增的治理和证据。
3. 意外把 PHI 发给未签 BAA 的供应商时，写出隔离、通知、审计、补救和复盘步骤。
4. 论证 ISO 42001 对中端 AI 供应商在 2026 年是否必要，区分客户要求与法律强制。
5. 将审计日志字段映射到至少三个框架控制，寻找可复用的跨框架政策。

## 运行与验证

```bash
python3 code/main.py
```

确认控制映射和客户画像输出完整，并保存一项风险分类与证据要求。
