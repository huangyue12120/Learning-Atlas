import marimo

app = marimo.App(width="medium")


@app.cell
def _():
    import math
    import marimo as mo
    return math, mo


@app.cell
def _(mo):
    x = mo.ui.slider(-5, 5, value=3, label="候选点 x")
    y = mo.ui.slider(-5, 5, value=4, label="候选点 y")
    mo.vstack([mo.md("# 同一点在不同 metric 下的距离\nquery 固定为原点。"), mo.hstack([x, y])])
    return x, y


@app.cell
def _(math, mo, x, y):
    values = [x.value, y.value]
    l1 = sum(abs(v) for v in values)
    l2 = math.sqrt(sum(v*v for v in values))
    linf = max(abs(v) for v in values)
    mo.md(f"候选点={tuple(values)}  \\nL1={l1:.3f}，L2={l2:.3f}，L∞={linf:.3f}。  \\n改变 metric 就是在改变“最近”的几何区域。")


if __name__ == "__main__":
    app.run()
