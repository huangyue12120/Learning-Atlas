import marimo


app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo

    return (mo,)


@app.cell
def _(mo):
    a_x = mo.ui.slider(-5, 5, value=3, step=1, label="向量 a 的 x 分量")
    a_y = mo.ui.slider(-5, 5, value=4, step=1, label="向量 a 的 y 分量")
    b_x = mo.ui.slider(-5, 5, value=1, step=1, label="向量 b 的 x 分量")
    b_y = mo.ui.slider(-5, 5, value=0, step=1, label="向量 b 的 y 分量")
    mo.vstack([mo.md("# 向量投影探索"), mo.hstack([a_x, a_y, b_x, b_y])])
    return a_x, a_y, b_x, b_y


@app.cell
def _(a_x, a_y, b_x, b_y):
    a = (a_x.value, a_y.value)
    b = (b_x.value, b_y.value)
    dot_product = a[0] * b[0] + a[1] * b[1]
    b_squared = b[0] ** 2 + b[1] ** 2
    projection = None if b_squared == 0 else (
        dot_product / b_squared * b[0],
        dot_product / b_squared * b[1],
    )
    return a, b, dot_product, projection


@app.cell
def _(a, b, dot_product, mo, projection):
    if projection is None:
        mo.md(f"`b = {b}` 是零向量，不能把 `a = {a}` 投影到它上面。")
    else:
        mo.md(
            f"`a = {a}`，`b = {b}`  \\n+            点积：`a · b = {dot_product}`  \
            投影：`proj_b(a) = ({projection[0]:.2f}, {projection[1]:.2f})`"
        )


if __name__ == "__main__":
    app.run()
