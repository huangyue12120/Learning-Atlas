# 边缘推理：练习指南

- 课程路径：`phases/17-infrastructure-and-production/12-edge-inference`
- 可运行 Python 文件：`main.py`

## 练习目标

从设备带宽、模型格式、浏览器能力和隐私约束出发设计边缘推理回退路径。

## 动手练习

1. 运行 `code/main.py`，按 Snapdragon 8 Gen 3 约 77 GB/s 带宽估算 Q4 7B decode 上限，并与 6–8 tok/s 观测值比较。
2. 为不满足 Chrome v121+ 的 Android 浏览器设计通过同一 OpenAI 兼容 API 的服务器端回退。
3. 为 iPhone 16 的 4K 上下文流式输出选择能把活动内存控制在 4 GB 以下的模型和格式。
4. 为同时支持 Jetson AGX Orin 与 Jetson Nano 的产品统一推理栈和模型分层。
5. 论证 WebLLM 在 2026 年能否生产化，引用覆盖率、性能和 Firefox Android 缺口。

## 运行与验证

```bash
python3 code/main.py
```

确认设备预算、浏览器能力和回退路线均被明确记录，并保存一次边缘选型表。
