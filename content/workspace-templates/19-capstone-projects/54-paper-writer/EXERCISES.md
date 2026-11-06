# 论文写作者：Python 练习指南

- 课程路径：`phases/19-capstone-projects/54-paper-writer`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证结构先行的论文输出契约。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录章节、图与 bibliography 的标识，检查输出 paper.tex、references.bib、manifest.json。
2. 删除一个被引用的 bibliography key，确认在写文件前报 PaperValidationError；用 mock generator 重复生成比较结构。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

标识和引用可解析，缺失引用明确失败；写入 LaTeX 不等于已编译或内容真实。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
