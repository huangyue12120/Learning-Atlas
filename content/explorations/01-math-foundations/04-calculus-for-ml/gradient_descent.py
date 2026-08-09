import marimo


app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo

    return (mo,)


@app.cell
def _(mo):
    start = mo.ui.slider(-10, 10, value=5, step=1, label="初始 x")
    rate = mo.ui.slider(0.01, 1.0, value=0.1, step=0.01, label="学习率")
    steps = mo.ui.slider(1, 30, value=10, step=1, label="步数")
    mo.vstack([mo.md("# 梯度下降探索：f(x)=x²"), mo.hstack([start, rate, steps])])
    return rate, start, steps


@app.cell
def _(mo, rate, start, steps):
    x = float(start.value)
    history = []
    for _ in range(steps.value):
        gradient = 2 * x
        x -= rate.value * gradient
        history.append(round(x, 6))
    mo.md(f"更新 `x ← x - {rate.value} · 2x` 后：`x = {x:.6f}`，`f(x) = {x ** 2:.8f}`。  \n路径：`{history}`")


if __name__ == "__main__":
    app.run()
