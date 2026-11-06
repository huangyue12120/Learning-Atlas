# 毕业项目 05——自治研究智能体（AI-Scientist 类）：Python 练习指南

- 课程路径：`phases/19-capstone-projects/05-autonomous-research-agent`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

在固定成本下比较实验树搜索与候选选择。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
```

Python 入口是离线架构模拟；课程正文中的云服务、模型训练和生产部署属于后续扩展。其他语言实现只从上游链接访问。

## 动手练习

1. 固定种子记录 nodes explored、budget spent、failed nodes 与 best branch。
2. 降低 Tree 的预算，再改变候选评分或扩展数，比较最优分支与已消耗成本。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

预算停止与失败节点均有记录；合成 quality/loss 不代表真实科研结果。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
