# 推理平台经济学：练习指南

- 课程路径：`phases/17-infrastructure-and-production/02-inference-platform-economics`
- 可运行 Python 文件：`main.py`

## 练习目标

把每 token、每分钟和专用 GPU 的计费模型换算成可比较的单位经济学。

## 动手练习

1. 运行 `code/main.py`，为 H100 上的 70B 模型推导 Baseten（按分钟）胜过 Fireworks（按 token）的利用率交叉点。
2. 为图像生成、聊天和语音转文字分别选择平台，并画出统一网关的路由边界。
3. 假设 Fireworks 主模型价格上调 1 美元/小时，且 40% 流量转到五折 batch 层，建模混合成本。
4. 对 SOC 2 Type II、HIPAA 和专用 GPU 客户比较可用平台与 FinOps 归因质量。
5. 计算 Llama 3.1 70B 在无服务器、按需、专用和 API 市场方案下每天 10 次与 10,000 次预测的成本。

## 运行与验证

```bash
python3 code/main.py
```

确认不同负载区间的推荐没有混淆计费单位，并保存一次交叉点计算。
