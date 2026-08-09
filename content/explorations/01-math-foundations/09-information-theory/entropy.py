import marimo

app = marimo.App(width="medium")


@app.cell
def _():
    import math
    import marimo as mo
    return math, mo


@app.cell
def _(mo):
    probability = mo.ui.slider(0.01, 0.99, value=0.5, step=0.01, label="硬币正面概率")
    mo.vstack([mo.md("# 二元熵探索\n移动概率，观察不确定性为何在均匀分布时最大。"), probability])
    return (probability,)


@app.cell
def _(math, mo, probability):
    p = probability.value
    entropy = -(p * math.log2(p) + (1-p) * math.log2(1-p))
    surprise_head = -math.log2(p)
    surprise_tail = -math.log2(1-p)
    mo.md(f"H(X)={entropy:.4f} bits。  \\n正面信息量={surprise_head:.3f} bits；反面信息量={surprise_tail:.3f} bits。")


if __name__ == "__main__":
    app.run()
