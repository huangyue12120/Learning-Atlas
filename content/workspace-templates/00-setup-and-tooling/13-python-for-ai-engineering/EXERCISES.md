# 面向 AI 工程的 Python：练习指南

- 课程路径：`phases/00-setup-and-tooling/13-python-for-ai-engineering`
- 可运行 Python 文件：`main.py`

## 练习目标

在标准库约束下练习可复现的数据处理、生成器、标准化和性能测量，形成后续课程通用的 Python 基础。

## 建议步骤

1. **可变默认值：** 找出课程代码中会共享列表或字典的函数，改为 `None` 哨兵并补充回归测试。
2. **流式加载：** 为 `Record` 写一个逐行读取 CSV 的生成器，比较它和一次性 `load_records` 的峰值内存。
3. **可复现划分：** 用三个不同种子运行 `split_records`，验证同一种子结果一致、不同种子结果不同，且输入列表不被修改。
4. **标准化边界：** 加入常量列、空数据和长度不一致的向量，说明标准化器为何要使用尺度 1 或抛出错误。
5. **纯 Python 与 NumPy：** 对 4、64、1024 维向量分别测量点积，记录 NumPy 开始更快的规模。

## 运行与验证

在本地学习工作区根目录执行参考实现：

```bash
python3 main.py
```

工作区会把上游 `code/main.py` 复制为根目录的 `main.py`，并复制本指南；上游 `code/tests/` 不会复制到工作区。需要运行完整测试时，另开一个以 Learning Atlas 仓库根目录为当前目录的终端，在上游课程目录执行：

```bash
cd ai-engineering-from-scratch/phases/00-setup-and-tooling/13-python-for-ai-engineering
python3 -m unittest discover -s code/tests -p 'test_*.py'
```
