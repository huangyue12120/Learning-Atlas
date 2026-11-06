# 任务规格格式：Python 练习指南

- 课程路径：`phases/19-capstone-projects/70-task-spec-format`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证任务记录、类别指标约束与后处理。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录 good/bad fixture 的 validated/errors，检查错误定位与 render 后提示词。
2. 增加未知字段、非法 category-metric、空 targets 和 extract_letter 的边界文本，核对拒绝与字母提取。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

固定六种 metric_name，字段严格校验，后处理不会把 Answer 单词里的 A 当独立答案 C。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
