import marimo

app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    rate = mo.ui.slider(0.0001, 0.02, value=0.005, step=0.0001, label="学习率")
    steps = mo.ui.slider(1, 100, value=25, label="迭代步数")
    mo.vstack([mo.md("# 学习率与梯度下降\n在一维二次函数上观察步长的稳定性。"), mo.hstack([rate, steps])])
    return rate, steps


@app.cell
def _(rate, steps, mo):
    x = 4.0
    history = [x]
    for _ in range(steps.value):
        x -= rate.value * 2 * x
        history.append(x)
    loss = x * x
    mo.md(f"最终 x={x:.6f}，损失={loss:.8f}。  \\n当学习率过大时，更新会跨越最低点并可能发散。")


if __name__ == "__main__":
    app.run()
