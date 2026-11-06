# 梯度累积：Python 练习指南

- 课程路径：`phases/19-capstone-projects/46-gradient-accumulation`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证梯度累积等价性与吞吐曲线。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。

```bash
python3 code/main.py --num-steps 3
python3 -m unittest discover -s code -p "test_main.py" -v
```

## 动手练习

1. 记录 equivalence check、effective batch 与各累积步数的吞吐；先用 --num-steps 3 做快速检查。
2. 固定等大的 micro batch，对比完整 batch 与累积后的梯度；检查 loss/accum_steps 和清零/step 的位置。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

梯度差在数值容差内，优化器只在累积边界更新；分布式有效 batch 还需乘 world_size。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
