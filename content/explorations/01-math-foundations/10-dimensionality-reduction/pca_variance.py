import marimo

app = marimo.App(width="medium")


@app.cell
def _():
    import numpy as np
    import marimo as mo
    return mo, np


@app.cell
def _(mo):
    components = mo.ui.slider(1, 10, value=2, label="保留的主成分数 k")
    mo.vstack([mo.md("# PCA 方差保留探索\n在固定谱上调整 k，观察累计解释方差和被丢弃的方差。"), components])
    return (components,)


@app.cell
def _(components, mo, np):
    eigenvalues = np.array([4.73, 2.51, 1.12, .89, .32, .18, .12, .07, .04, .02])
    captured = eigenvalues[:components.value].sum() / eigenvalues.sum()
    lost = 1 - captured
    mo.md(f"k={components.value}：累计解释方差={captured:.2%}；丢失方差={lost:.2%}。  \\n选择阈值、elbow 和下游性能平台三者共同决定 k。")


if __name__ == "__main__":
    app.run()
