# AI SRE：练习指南

- 课程路径：`phases/17-infrastructure-and-production/23-sre-for-ai`
- 可运行 Python 文件：`main.py`

## 练习目标

把 supervisor、专用日志/指标/运行手册智能体和人类批准闸门组合成可审计的事故响应流程。

## 动手练习

1. 运行 `code/main.py`，观察日志与指标智能体不一致时 supervisor 如何排序证据并升级。
2. 为自己的服务定义三项安全自动修复动作，并解释为何不允许改 IAM、数据库或拓扑。
3. 编写结构化运行手册模板，包含症状、假设、核验命令、证据和行动。
4. 预测性检测提前 12 分钟触发时，决定呼叫、预排空或两者，并写出触发条件。
5. 评估三人团队是否应在 2026 年采用 AI SRE，明确成熟度、规模和风险边界。

## 运行与验证

```bash
python3 code/main.py
```

确认 worker 结果和 supervisor synthesis 都能输出，并记录一次分歧升级或狭窄修复。
