import marimo

app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    rank = mo.ui.slider(1, 8, value=3, label="保留秩 k")
    mo.vstack([mo.md("# 截断 SVD 的误差\n在给定奇异值谱上调整 rank，观察保留能量和 Frobenius 误差。"), rank])
    return (rank,)


@app.cell
def _(mo, rank):
    singular_values = [12, 7, 4, 2, 1, .5, .2, .1]
    total = sum(s * s for s in singular_values)
    kept = sum(s * s for s in singular_values[:rank.value])
    error = sum(s * s for s in singular_values[rank.value:]) ** .5
    mo.md(f"rank-{rank.value}：能量保留={kept / total:.2%}；Frobenius 误差={error:.4f}。  \\n根据 Eckart–Young–Mirsky，这正是该 rank 的最优误差。")


if __name__ == "__main__":
    app.run()
