# 机器学习系统设计：练习指南

- 课程路径：`phases/02-ml-fundamentals/19-ml-system-design`
- 可运行 Python 文件：`main.py`

## 练习目标

把业务问题、指标、基线、预算和发布策略写成可检查的设计，并用成本模型验证批量与在线服务选择。

## 建议步骤

1. **混合服务：** 在 `choose_serving` 中加入批量覆盖已知用户、在线覆盖新用户的方案，比较每日成本。
2. **最强基线：** 修改合成流失数据，找到使规则超过模型的最小系数变化，并记录提升量如何变化。
3. **预算检查：** 为设计文档增加每千次预测成本上限，编写一个缺少该字段就失败的检查。
4. **欺诈设计：** 写一份支付欺诈 JSON 设计文档，包含标签延迟、50 ms p99、shadow/canary 和回滚默认值。
5. **反馈回路：** 删除被优惠触达用户的标签后重训，比较 F1 与保留随机留出组时的差异。

## 运行与验证

```bash
python3 main.py
```

工作区只复制根目录的 `main.py` 和本指南；请另开一个以 Learning Atlas 仓库根目录为当前目录的终端，在上游课程目录运行完整测试：

```bash
cd ai-engineering-from-scratch/phases/02-ml-fundamentals/19-ml-system-design
python3 -m unittest discover -s code/tests -p 'test_*.py'
```

先阅读输出中的阻塞项，再修改文档直到检查器给出可评审结果。
