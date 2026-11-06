# 端到端研究演示：Python 练习指南

- 课程路径：`phases/19-capstone-projects/57-end-to-end-research-demo`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

组合调度、最佳分支选择、writer 与 critic。

## 运行与验证

Python 标准库即可。 应用会自动补齐相邻先修目录：`54-paper-writer`、`55-critic-loop`、`56-iteration-scheduler`；传递依赖一并复制。请保留工作区父目录中的这些同级目录，不要把本课 code/ 单独搬走。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 检查 scheduler_report、best_branch、best_reward、paper_manifest、critic_result 和 stop_reason。
2. 同种子运行两次比较分支、奖励与章节 id；提高触发阈值使无分支触发，确认 NoTriggerError 在 writer 前发生。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

相邻 54/55/56 课按原布局加载，结构产物连贯，mock 结果不构成真实研究或论文质量证据。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
