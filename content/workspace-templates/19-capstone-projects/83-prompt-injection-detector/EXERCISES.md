# 毕业项目 83——提示注入检测器：Python 练习指南

- 课程路径：`phases/19-capstone-projects/83-prompt-injection-detector`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证规范化、规则检测与误报/漏报统计。

## 运行与验证

Python 标准库即可。 应用会自动补齐相邻先修目录：`82-jailbreak-taxonomy`；传递依赖一并复制。请保留工作区父目录中的这些同级目录，不要把本课 code/ 单独搬走。 第 82 课的 `outputs/taxonomy.json` 作为固定 fixture 一并准备，不需先执行上游目录。

```bash
python3 code/main.py
python3 code/tests.py
```

## 动手练习

1. 记录各类别 precision/recall/F1、benign pass through 与 detector_report.json。
2. 增加零宽字符、编码和良性引用反例，核对规范化证据与无规则命中的 benign/0.0 默认结果。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

第 82 课 fixture 可从私人同级目录读取，置信度只作启发式信号，不把未命中视为安全证明。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
