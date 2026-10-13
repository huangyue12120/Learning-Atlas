# 特征库与训练-服务偏差：练习指南

- 课程路径：`phases/02-ml-fundamentals/21-feature-stores-and-training-serving-skew`
- 可运行 Python 文件：`main.py`

## 练习目标

练习时间点正确连接、离线回填、在线物化和三路偏差定位，避免把未来数据或不同默认值带入服务。

## 建议步骤

1. **快照频率：** 将快照间隔从 7 天改为 1 天，重新运行新鲜度比较并解释差异。
2. **TTL：** 把 TTL 设为 3 天，统计训练中被替换为默认值的行数。
3. **创建时间：** 给 `FeatureRow` 增加 created day，让连接忽略写入时间晚于标签时间的行。
4. **版本：** 注册 `spend_7d` 为 `spend_30d` 的版本 2，回填后同时打印两个版本。
5. **修复遗留路径：** 调整 `legacy_serving_features`，直到第三组偏差检查通过，并列出每一处修改。

## 运行与验证

```bash
python3 main.py
```

工作区只复制根目录的 `main.py` 和本指南；请另开一个以 Learning Atlas 仓库根目录为当前目录的终端，在上游课程目录运行完整测试：

```bash
cd ai-engineering-from-scratch/phases/02-ml-fundamentals/21-feature-stores-and-training-serving-skew
python3 -m unittest discover -s code/tests -p 'test_*.py'
```

重点检查：同一快照应为 0% 偏差；即时计算会暴露新鲜度差异；第二套代码路径应暴露窗口和默认值差异。
