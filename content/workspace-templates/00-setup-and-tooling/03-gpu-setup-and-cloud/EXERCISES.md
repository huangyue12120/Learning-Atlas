# GPU 配置与云端计算：练习指南

- 课程路径：`phases/00-setup-and-tooling/03-gpu-setup-and-cloud`
- 可运行 Python 文件：`gpu_check.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 运行上面的基准测试，比较 CPU 与 GPU 时间
2. 若没有 GPU，在 Google Colab 上运行并比较
3. 检查 GPU 显存，并估算可容纳的最大模型（经验法则：fp16 下每个参数 2 字节）

## 运行与验证

在课程目录下执行：

```bash
python3 gpu_check.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
