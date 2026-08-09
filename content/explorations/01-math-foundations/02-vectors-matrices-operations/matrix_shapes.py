import marimo


app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo

    return (mo,)


@app.cell
def _(mo):
    rows = mo.ui.slider(1, 5, value=2, step=1, label="左矩阵行数 m")
    inner = mo.ui.slider(1, 5, value=3, step=1, label="共享内侧维度 n")
    columns = mo.ui.slider(1, 5, value=2, step=1, label="右矩阵列数 p")
    mo.vstack([mo.md("# 矩阵形状与偏置广播探索"), mo.hstack([rows, inner, columns])])
    return columns, inner, rows


@app.cell
def _(columns, inner, mo, rows):
    mo.md(
        f"`({rows.value} × {inner.value}) @ ({inner.value} × {columns.value})` "
        f"的结果形状是 `({rows.value} × {columns.value})`。"
    )


@app.cell
def _(columns, mo, rows):
    output = [[10 * i + j for j in range(columns.value)] for i in range(rows.value)]
    bias = list(range(columns.value))
    result = [[value + bias[j] for j, value in enumerate(row)] for row in output]
    mo.md(
        "偏置向量沿行复制：\n\n"
        f"`output = {output}`  \n`bias = {bias}`  \n`output + bias = {result}`"
    )


if __name__ == "__main__":
    app.run()
