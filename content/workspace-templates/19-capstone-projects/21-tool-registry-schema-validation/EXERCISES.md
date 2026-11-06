# 带 Schema 校验的工具注册表：Python 练习指南

- 课程路径：`phases/19-capstone-projects/21-tool-registry-schema-validation`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证工具注册与 JSON Schema 子集校验。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录演示 cases 的通过与拒绝结果，以及错误中的 JSON Pointer 路径。
2. 构造嵌套对象、数组和包含 / 或 ~ 的键，检查指针转义；确认 bool 不会被误当整数接受。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

非法参数在执行前失败，返回可定位错误；不要把这个子集称为完整 JSON Schema 实现。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
