# Capstone 87——端到端安全网关：Python 练习指南

- 课程路径：`phases/19-capstone-projects/87-end-to-end-safety-gate`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

组合生成前、流式生成中与生成后安全门。

## 运行与验证

Python 标准库即可。 应用会自动补齐相邻先修目录：`82-jailbreak-taxonomy`、`83-prompt-injection-detector`、`85-content-classifier-integration`、`86-constitutional-rules-engine`；传递依赖一并复制。请保留工作区父目录中的这些同级目录，不要把本课 code/ 单独搬走。 第 82 课的 `outputs/taxonomy.json` 作为固定 fixture 一并准备，不需先执行上游目录。

```bash
python3 code/main.py
python3 code/tests.py
```

## 动手练习

1. 记录 final action counts、during-gen terminations、benign blocks、分类别结果和 gate_trace.json。
2. 构造 pre-gen 直接阻断与跨块续写两个案例，检查模型调用是否跳过及缓冲释放时机，并追溯各层信号。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

82/83/85/86 的代码与固定 taxonomy 在私人同级目录可用；trace 能解释动作，纵深过滤不等于覆盖所有攻击。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
