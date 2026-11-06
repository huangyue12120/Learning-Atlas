# 开发环境：练习指南

- 课程路径：`phases/00-setup-and-tooling/01-dev-environment`
- 可运行 Python 文件：`verify.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 运行验证脚本，只需修复当前 Python 学习路线的必需检查项
2. 为本课程创建一个 Python 虚拟环境并安装 PyTorch
3. 用 Python 编写并运行一个“hello world”，确认退出码为 0

> **编者注：** 上游练习 3 要求四种语言，本产品仅要求 Python 实作。TypeScript、Rust、Julia 的环境说明与其他语言版本供选读；Node.js 是运行本地阅读器的工具，不要求学习者同时维护四套实作。

## 运行与验证

在课程目录下执行：

```bash
python3 verify.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
