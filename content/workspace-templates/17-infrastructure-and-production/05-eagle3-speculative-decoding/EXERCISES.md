# 生产中的 EAGLE-3 推测解码：练习指南

- 课程路径：`phases/17-infrastructure-and-production/05-eagle3-speculative-decoding`
- 可运行 Python 文件：`main.py`

## 练习目标

用接受率 alpha、草稿长度和验证开销判断推测解码是否带来真实收益，并守住 P99 ITL。

## 动手练习

1. 运行 `code/main.py`，在 K=5 时求出达到 2 倍和 3 倍加速所需的 alpha，并测试对 verify overhead 的敏感度。
2. 按 70% 通用聊天（alpha=0.7）与 30% 代码（alpha=0.4）计算混合 alpha，判断是否净正收益。
3. 对比草稿模型、EAGLE 和 N-gram 三种模式，确认哪一种与分块 prefill 兼容。
4. 设计平均 ITL 降低 25% 但 P99 上升 15% 时的诊断与缓解方案。
5. 估算 70B 的 EAGLE-3 草稿头与 Llama 3.2 1B 经典草稿模型的显存成本。

## 运行与验证

```bash
python3 code/main.py
```

确认输出包含 alpha、吞吐或加速计算，并记录一次“平均值改善但尾部变差”的闸门判断。
