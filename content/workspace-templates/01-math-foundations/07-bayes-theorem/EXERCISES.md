# 贝叶斯定理：Python 练习

只编辑 exercise_bayes.py。练习覆盖后验计算、Laplace 平滑、Beta 共轭更新与 Monte Carlo A/B 比较：

    python -m unittest -v test_exercise_bayes.py

reference_bayes.py 是本课完整可运行的参考实现，逐字保留上游 code/bayes.py。

1. 用全概率公式实现 bayes。
2. 为单词计数写出 add-one 平滑概率。
3. 以 Beta(a,b) 更新 success / failure 批次。
4. 从两组 Beta 样本估计 P(B>A)。
