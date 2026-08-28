# 文档与图表理解：练习指南

- 课程路径：`phases/12-multimodal-ai/22-document-diagram-understanding`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 你的项目每天处理 1000 万张发票。哪种技术栈能在不牺牲准确率的情况下最小化每页成本？

2. 为什么 LayoutLMv3 在表单问答上超过纯 CLIP-VLM，却在场景文字上表现不佳？bbox 流牺牲了什么？

3. Nougat 生成 LaTeX。提出一个 VLM 原生输出在 LaTeX 保真度上胜过 Nougat 的测试案例，以及一个 Nougat 胜出的案例。

4. 阅读 PaliGemma 2 论文（Google，2024）。相对于 PaliGemma 1，哪项训练数据增加提升了文档准确率？

5. 设计一个监管安全的混合方案：OCR 流水线为主，VLM 作为二次交叉核对。如何处理两者的分歧？

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
