# 检查点保存与恢复：Python 练习指南

- 课程路径：`phases/19-capstone-projects/47-checkpoint-save-resume`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证模型、优化器、调度器与 RNG 的完整恢复。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py
python3 -m unittest discover -s code -p "test_main.py" -v
```

## 动手练习

1. 记录连续运行和中断恢复的损失差、单文件/分片结果与输出 JSON。
2. 改变 --interrupt-at 和 --num-shards，再检查恢复后下一步的学习率与随机批次是否连续。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

连续与恢复轨迹在测试容差内；atomic replace 避免半文件可见，但没有 fsync 就不能声称断电持久性。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
