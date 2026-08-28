# 傅里叶变换：练习指南

从 `exercise_fourier.py` 开始，实现离散傅里叶变换并计算功率谱。

## 练习

1. 实现 `dft(signal)`，使用复数单位根计算每个频率系数。
2. 实现 `power_spectrum(coefficients)`，返回每个系数的模平方 `|X[k]|²`。
3. 构造一个常量信号、单频正弦信号和两种频率的混合信号，观察功率峰的位置。

## 运行与验证

在本工作区根目录运行：

```bash
python3 -m unittest -v test_exercise_fourier.py
```

再对照 `reference_fourier.py`，比较朴素 DFT 与 FFT 的复杂度，并说明采样长度如何影响频率分辨率。
