---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/00-setup-and-tooling/03-gpu-setup-and-cloud/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: d7420f66a80b101850985748bc768744956b0ba042fe92a406fe6b8becb33ba2
status: reviewed
---

# GPU 配置与云端计算

> 用 CPU 学习没有问题；要真正训练，就需要 GPU。

**类型：** 构建
**语言：** Python
**前置课程：** Phase 0，第 01 课
**预计学习：** 约 45 分钟

## 学习目标

- 使用 `nvidia-smi` 和 PyTorch CUDA API 验证本地 GPU 是否可用
- 配置带 T4 GPU 的 Google Colab，进行免费的云端实验
- 基准测试 CPU 与 GPU 上的矩阵乘法并测量加速比
- 用 fp16 经验法则估算 VRAM 可容纳的最大模型

## 问题

Phase 1–3 的多数课程可在 CPU 上顺利运行。但当你开始训练 CNN、Transformer 或 LLM（Phase 4+）时，就需要 GPU 加速。一次在 CPU 上耗时 8 小时的训练，在 GPU 上可能只要 10 分钟。

你有三种选择：本地 GPU、云端 GPU 或免费版 Google Colab。

## 概念

```text
可选方案：

1. 本地 NVIDIA GPU
   成本：$0（你已经拥有）
   配置：安装 CUDA + cuDNN
   适合：经常使用、大型数据集

2. Google Colab（免费层）
   成本：$0
   配置：无需配置
   适合：快速实验、家中没有 GPU

3. 云端 GPU（Lambda、RunPod、Vast.ai）
   成本：$0.20–2.00/小时
   配置：SSH + 安装
   适合：严肃训练、大模型
```

```figure
s0-gpu-dispatch
```

## 动手构建

### 方案 1：本地 NVIDIA GPU

检查自己是否有 NVIDIA GPU：

```bash
nvidia-smi
```

安装带 CUDA 的 PyTorch：

```python
import torch

print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA version: {torch.version.cuda}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
```

### 方案 2：Google Colab

1. 打开 [colab.research.google.com](https://colab.research.google.com)
2. Runtime > Change runtime type > T4 GPU
3. 运行 `!nvidia-smi` 进行验证

可将本课程的 notebook 直接上传到 Colab。

### 方案 3：云端 GPU

适用于 Lambda Labs、RunPod 或 Vast.ai：

```bash
ssh user@your-gpu-instance

pip install torch torchvision torchaudio
python -c "import torch; print(torch.cuda.get_device_name(0))"
```

### 没有 GPU？没问题。

多数课程可在 CPU 上运行。需要 GPU 的课程会明确说明，并提供 Colab 链接。

```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using: {device}")
```

## 动手构建：GPU 与 CPU 基准测试 <!-- learning-atlas: build-it-gpu-vs-cpu-benchmark -->

```python
import torch
import time

size = 5000

a_cpu = torch.randn(size, size)
b_cpu = torch.randn(size, size)

start = time.time()
c_cpu = a_cpu @ b_cpu
cpu_time = time.time() - start
print(f"CPU: {cpu_time:.3f}s")

if torch.cuda.is_available():
    a_gpu = a_cpu.to("cuda")
    b_gpu = b_cpu.to("cuda")

    torch.cuda.synchronize()
    start = time.time()
    c_gpu = a_gpu @ b_gpu
    torch.cuda.synchronize()
    gpu_time = time.time() - start
    print(f"GPU: {gpu_time:.3f}s")
    print(f"Speedup: {cpu_time / gpu_time:.0f}x")
```

## 练习

1. 运行上面的基准测试，比较 CPU 与 GPU 时间
2. 若没有 GPU，在 Google Colab 上运行并比较
3. 检查 GPU 显存，并估算可容纳的最大模型（经验法则：fp16 下每个参数 2 字节）

## 核心术语

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| CUDA | “GPU 编程” | NVIDIA 的并行计算平台，可让代码在 GPU 上执行 |
| VRAM | “GPU 内存” | GPU 上独立于系统 RAM 的显存；它限制模型大小 |
| fp16 | “半精度” | 16 位浮点数；在精度损失很小的情况下，内存用量是 fp32 的一半 |
| Tensor Core | “快速矩阵硬件” | 专用于矩阵乘法的 GPU 核，速度比普通核心快 4–8 倍 |
