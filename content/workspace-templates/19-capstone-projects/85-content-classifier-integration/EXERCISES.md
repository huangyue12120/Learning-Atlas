# Capstone 85——内容分类器集成：Python 练习指南

- 课程路径：`phases/19-capstone-projects/85-content-classifier-integration`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

组合毒性、PII 与指令泄漏分类动作。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 code/tests.py
```

## 动手练习

1. 记录每个 case 的 verb、severity、fired 分类器与输出报告。
2. 对高/中严重度冲突检查 block 优先；加入 Luhn 通过但不是真实卡号、否定语句与改写泄漏反例。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

router 按政策合并信号，redact 范围正确；表面启发式不能证明全部个人数据或指令泄漏已消除。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
