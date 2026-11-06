# Capstone 86——宪法式规则引擎：Python 练习指南

- 课程路径：`phases/19-capstone-projects/86-constitutional-rules-engine`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证声明式规则、谓词组合与修订反馈。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 code/tests.py
```

## 动手练习

1. 记录 rules loaded、draft violations、fixer changes 与 revised violations。
2. 加入 applies_when 为假的规则，确认 not_applicable；构造一个修订引入另一规则违规的案例，检查二次评估。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

必需字段和谓词契约通过校验，修订不绕过复检；yaml_subset 只支持课程声明的语法。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
