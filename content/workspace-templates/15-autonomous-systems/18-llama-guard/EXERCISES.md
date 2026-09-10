# Llama Guard 与输入/输出分类：练习指南

- 课程路径：phases/15-autonomous-systems/18-llama-guard
- 可运行 Python 文件：main.py

## 练习目标

用输入与输出分类器模拟风险标签，测量规范化对 emoji、同形字和释义攻击的影响。

## 动手练习

1. 运行 main.py，确认原始恶意输入可捕获而 emoji 变体可能漏报。
2. 增加 NFKC 或同形字规范化，比较命中率变化和误报。
3. 对照 MLCommons hazards 与 Llama Guard S1–S14，找出 Code Interpreter Abuse 的作用。
4. 为客服场景设计一条禁止诊断回答的对话 rail，并测试三种问法。
5. 设计按类别报告 TP、FP、FN 的评估，而不是只报告 accuracy。

## 运行与验证

运行：python3 code/main.py

确认输出包含 raw hits、normalized hits 和 output rail，并记录分类器边界。
