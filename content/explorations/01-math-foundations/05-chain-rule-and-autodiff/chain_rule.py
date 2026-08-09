import marimo

app = marimo.App(width="medium")

@app.cell
def _():
    import marimo as mo
    return (mo,)

@app.cell
def _(mo):
    x = mo.ui.slider(-3, 3, value=2, step=0.25, label="x")
    mo.vstack([mo.md("# 链式法则探索：y = ReLU(x²)"), x])
    return (x,)

@app.cell
def _(mo, x):
    value = max(0, x.value ** 2)
    local_relu = 1.0 if x.value ** 2 > 0 else 0.0
    gradient = local_relu * 2 * x.value
    note = "在 x=0 处采用 ReLU 的 0 次梯度约定。" if x.value == 0 else ""
    mo.md(f"`y={value:.3f}`；局部导数 `dReLU/d(x²)={local_relu}`，`d(x²)/dx={2*x.value:.3f}`，故 `dy/dx={gradient:.3f}`。{note}")

if __name__ == "__main__":
    app.run()
