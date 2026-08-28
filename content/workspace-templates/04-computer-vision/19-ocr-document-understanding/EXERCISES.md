# OCR 与文档理解：练习指南

- 课程路径：`phases/04-computer-vision/19-ocr-document-understanding`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **（简单）** 在 5 位随机数字字符串上训练 TinyCRNN 500 步，报告保留集 CER。
2. **（中等）** 将贪心解码替换为 beam search（`beam_width=5`），报告 CER 差异。在哪些输入上 beam search 胜出？
3. **（困难）** 在 20 张收据上运行 PaddleOCR，提取行项目，并针对手工标注真值的 `{item_name, price}` 对计算 F1。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
