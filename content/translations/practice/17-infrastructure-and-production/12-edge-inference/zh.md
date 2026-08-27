---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/12-edge-inference/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 50eb91fb78f252442cf290a541fd0748b6ee72904cf3aea623d567bd1549bff4
status: reviewed
---

# 边缘推理：Apple Neural Engine、Qualcomm Hexagon、WebGPU/WebLLM、Jetson

> 边缘端的核心约束是内存带宽，而非算力。移动 DRAM 带宽为 50–90 GB/s；数据中心 HBM3 超过 2–3 TB/s——相差 30–50 倍。Decode 受内存约束，因此这个差距决定性。2026 年生态分为四路：Apple M4/A18 Neural Engine 在统一内存下峰值为 38 TOPS（无需 CPU↔NPU 拷贝）；Qualcomm Snapdragon X Elite / 8 Gen 4 Hexagon 可达 45 TOPS；WebGPU + WebLLM 在 M3 Max 上以约 41 tok/s 运行 Llama 3.1 8B（Q4，约为原生的 70–80%）；拥有 17.6k GitHub stars、OpenAI 兼容 API 和约 70–75% 移动端覆盖。NVIDIA Jetson Orin Nano Super（8GB）可容纳 Llama 3.2 3B / Phi-3；AGX Orin 通过 vLLM 以约 40 tok/s 运行 gpt-oss-20b；Jetson T4000（JetPack 7.1）性能为 AGX Orin 的 2 倍。TensorRT Edge-LLM 支持 EAGLE-3、NVFP4、分块 prefill——Bosch、ThunderSoft、MediaTek 于 CES 2026 展示。

**类型：** 学习
**语言：** Python（标准库，用于模拟受带宽约束 decode 的玩具程序）
**前置要求：** 第 17 阶段 · 04（服务引擎内部机制），第 17 阶段 · 09（生产量化）
**用时：** 约 60 分钟

## 学习目标

- 解释为什么移动 LLM 推理受内存带宽约束，算力居于次要地位。
- 枚举四个边缘目标（Apple ANE、Qualcomm Hexagon、WebGPU/WebLLM、NVIDIA Jetson），并将每个匹配到一种用例。
- 说出 2026 年 WebGPU 覆盖缺口（Firefox Android 正在追赶）以及 Safari iOS 26 的正式上线。
- 为每个目标选择量化格式（ANE 用 Core ML INT4 + FP16、Hexagon 用 QNN INT8/INT4、浏览器用 WebGPU Q4、Jetson Thor 用 NVFP4）。

## 问题

客户需要一个设备端聊天机器人：语音优先、默认私密、可离线使用。在 MacBook Pro M3 Max 上，Llama 3.1 8B Q4 约为 55 tok/s——没问题。在 iPhone 16 Pro 上，同一模型为 3 tok/s——不行。在配有 Snapdragon 8 Gen 3 的中端 Android 上为 7 tok/s。通过 Chrome Android v121+ 的 WebGPU 在浏览器中运行时，取决于设备为 4–8 tok/s。

吞吐量取决于带宽差距、量化格式和 NPU 用户空间可达性。2026 年的边缘推理包含四个不同的问题，对应四种方案。

## 概念

### 带宽才是真正的上限

Decode 为每个 token 读取完整权重集合。一个 Q4 7B 模型为 3.5 GB。以 50 GB/s 读取 3.5 GB 需要 70 ms——理论上限约 14 tok/s。在 90 GB/s（高端移动 DRAM）时，上限升至约 25 tok/s。在此数值之下，再多算力也无济于事。

数据中心 HBM3 为 3 TB/s 时，同样的 3.5 GB 仅需 1.2 ms——上限为 830 tok/s。同一个模型、同一组权重，只有内存子系统不同。

### Apple Neural Engine（M4 / A18）

- 最高 38 TOPS。统一内存（CPU 和 ANE 共享同一内存池）——没有拷贝开销。
- 通过 Core ML + 已编译的 `.mlmodel` 模型访问，或通过 PyTorch 的 Metal Performance Shaders（MPS）访问。
- Llama.cpp 的 Metal 后端使用 MPS，而非直接使用 ANE；原生 ANE 需要转换为 Core ML。
- 2026 年 iOS 应用的最佳实用途径：采用 INT4 权重 + FP16 激活值的 Core ML。

### Qualcomm Hexagon（Snapdragon X Elite / 8 Gen 4）

- 最高 45 TOPS。与 CPU 和 GPU 集成在同一 SoC 中，但属于独立内存域。
- QNN（Qualcomm Neural Network）SDK 和 AI Hub 提供从 PyTorch/ONNX 的转换。
- Chat 模板、Llama 3.2 和 Phi-3 都以 AI Hub 上的一等工件提供。

### Intel / AMD NPU（Lunar Lake、Ryzen AI 300）

- 40–50 TOPS。软件落后于 Apple/Qualcomm；OpenVINO 正在改进，但仍属小众。
- 最适合 Windows ARM copilot 应用；在 AMD/Intel 台式机上原生支持本地优先。

### WebGPU + WebLLM

- 通过 WebGPU 计算着色器在浏览器中运行模型；无需安装。
- M3 Max 上 Llama 3.1 8B Q4 约为 41 tok/s——通过相同后端约为原生性能的 70–80%。
- WebLLM 在 GitHub 上有 17.6k stars；提供 OpenAI 兼容 JS API；Apache 2.0。
- 2026 年覆盖：Chrome Android v121+、Safari iOS 26 GA，Firefox Android 仍在追赶。总体移动端覆盖约为 70–75%。

### NVIDIA Jetson 系列

- Orin Nano Super（8GB）：可容纳 Llama 3.2 3B、Phi-3，并达到良好 tok/s。
- AGX Orin：通过 vLLM 以约 40 tok/s 运行 gpt-oss-20b。
- Thor / T4000（JetPack 7.1）：性能为 AGX Orin 的 2 倍，支持 EAGLE-3 和 NVFP4。
- TensorRT Edge-LLM（2026）支持 EAGLE-3 推测解码、NVFP4 权重、分块 prefill——将数据中心优化移植至边缘端。

### 按目标选择量化方案

| 目标 | 格式 | 说明 |
|------|------|------|
| Apple ANE | INT4 权重 + FP16 激活值 | Core ML 转换路径 |
| Qualcomm Hexagon | QNN INT8 / INT4 | AI Hub 转换器 |
| WebGPU / WebLLM | Q4 MLC（q4f16_1） | 使用 `mlc_llm convert_weight` + 已编译的 `.wasm`；不支持 GGUF |
| Jetson Orin Nano | Q4 GGUF 或 TRT-LLM INT4 | 受内存约束 |
| Jetson AGX / Thor | NVFP4 + FP8 KV | Edge-LLM 路径 |

### 边缘端的长上下文陷阱

Llama 3.1 的 128K 上下文是数据中心特性。在一台具有 8 GB RAM 的手机上，4 GB 模型 + 32K token 的 2 GB KV 缓存 + 操作系统开销 = OOM。除非接受激进的 KV 量化（Q4 KV），边缘部署会将上下文保持在 4K–8K。

### 语音是杀手级应用

语音智能体对延迟敏感（首 token < 500 ms）。本地推理彻底消除网络延迟。配合语音转文本（Whisper Turbo 变体可在边缘端运行），边缘推理就成为达到生产质量的语音闭环。

### 应当记住的数字

- Apple M4 / A18 ANE：38 TOPS。
- Qualcomm Hexagon SD X Elite：45 TOPS。
- WebLLM M3 Max：Llama 3.1 8B Q4 约 41 tok/s。
- AGX Orin：通过 vLLM 运行 gpt-oss-20b 约 40 tok/s。
- 数据中心与边缘带宽差距：30–50 倍。
- WebGPU 移动端覆盖：约 70–75%（Firefox Android 落后）。

```figure
edge-bandwidth-pipe
```

## 使用

`code/main.py` 使用受带宽约束的计算，得出各边缘目标理论上的 decode 吞吐量上限。它与观测基准比较，突出显示带宽而非算力是瓶颈的位置。

## 交付

本课产出 `outputs/skill-edge-target-picker.md`。给定平台（iOS/Android/浏览器/Jetson）、模型以及延迟/内存预算，它会选择量化格式和转换流水线。

## 练习

1. 运行 `code/main.py`。对 Snapdragon 8 Gen 3（带宽约 77 GB/s）上的 Q4 7B 模型，计算 decode 上限。与观测到的 6–8 tok/s 相比，运行时高效吗？
2. Android 上的 WebGPU 要求 Chrome v121+。为旧浏览器设计回退方案——通过同一个 OpenAI 兼容 API 在服务器端运行。
3. 你的 iOS 应用需要 4K 上下文流式输出。哪种模型/格式组合可以让 iPhone 16 的活动内存保持在 4 GB 以下？
4. Jetson AGX Orin 以 40 tok/s 运行 gpt-oss-20b，Jetson Nano 仅能容纳 3B。若产品面向两者，如何统一推理栈？
5. 请论证“WebLLM 在 2026 年已可用于生产”。引用覆盖率、性能和 Firefox Android 缺口。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| ANE | “Apple 神经引擎” | M 系列与 A 系列中的设备端 NPU；统一内存 |
| Hexagon | “Qualcomm NPU” | Snapdragon NPU；通过 QNN SDK 访问 |
| WebGPU | “浏览器 GPU” | W3C 标准化的浏览器 GPU API；2026 年支持 Chrome/Safari |
| WebLLM | “浏览器 LLM 运行时” | MLC-LLM 项目；Apache 2.0；OpenAI 兼容 JS |
| Jetson | “NVIDIA 边缘端” | Orin Nano / AGX / Thor / T4000 系列 |
| TRT Edge-LLM | “边缘 TensorRT” | 2026 年 TensorRT-LLM 的边缘移植；EAGLE-3 + NVFP4 |
| 统一内存 | “共享内存池” | CPU 和 NPU 看到同一 RAM；无需拷贝 |
| 受带宽约束 | “受内存限制” | Decode 由读取权重的 bytes/sec 限制 |
| Core ML | “Apple 转换” | 用于 ANE 原生模型的 Apple 框架 |
| QNN | “Qualcomm 栈” | Qualcomm Neural Network SDK |

## 延伸阅读

- [On-Device LLMs State of the Union 2026](https://v-chandra.github.io/on-device-llms/) — 生态与基准。
- [NVIDIA Jetson Edge AI](https://developer.nvidia.com/blog/getting-started-with-edge-ai-on-nvidia-jetson-llms-vlms-and-foundation-models-for-robotics/) — Orin / AGX / Thor。
- [NVIDIA TensorRT Edge-LLM](https://developer.nvidia.com/blog/accelerating-llm-and-vlm-inference-for-automotive-and-robotics-with-nvidia-tensorrt-edge-llm/) — 2026 年边缘端发布公告。
- [WebLLM (arXiv:2412.15803)](https://arxiv.org/html/2412.15803v2) — 设计与基准。
- [Apple Core ML](https://developer.apple.com/documentation/coreml) — ANE 原生转换。
- [Qualcomm AI Hub](https://aihub.qualcomm.com/) — 为 Hexagon 预转换的模型。
