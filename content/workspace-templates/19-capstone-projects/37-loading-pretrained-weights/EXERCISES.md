# 加载预训练权重：Python 练习指南

- 课程路径：`phases/19-capstone-projects/37-loading-pretrained-weights`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证外部权重名称、形状映射与绑定恢复。

## 运行与验证

需要项目的 deep-learning 依赖组；本地小模型可使用 CPU，首次运行前确认可用内存。 本课还需要 safetensors，使用本地 stub，不下载真实权重。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 检查 stub fixture 的加载报告、前后 fingerprint、shape mismatch 和 lm_head 绑定状态。
2. 删除一个源键并加入错误形状，确认 missing 与 mismatch 分别报告，不静默用随机权重冒充成功加载。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

逐张量映射有证据；生成样本相同不能单独证明加载失败，stub 权重不是真实预训练模型。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
