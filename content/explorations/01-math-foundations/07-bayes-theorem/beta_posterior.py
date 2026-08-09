import marimo

app = marimo.App(width="medium")


@app.cell
def _():
    import math
    import marimo as mo
    return math, mo


@app.cell
def _(mo):
    heads = mo.ui.slider(0, 30, value=7, label="正面次数")
    tails = mo.ui.slider(0, 30, value=3, label="反面次数")
    strength = mo.ui.slider(1, 10, value=1, label="先验参数 α=β")
    mo.vstack([mo.md("# Beta 后验探索\n调整抛硬币结果，观察先验如何被数据更新。"), mo.hstack([heads, tails, strength])])
    return heads, strength, tails


@app.cell
def _(heads, mo, strength, tails):
    alpha = strength.value + heads.value
    beta = strength.value + tails.value
    mean = alpha / (alpha + beta)
    mode = (alpha - 1) / (alpha + beta - 2) if alpha > 1 and beta > 1 else None
    mode_text = "无内部众数" if mode is None else f"{mode:.3f}"
    mo.md(f"后验为 Beta({alpha}, {beta})。  \\n均值：{mean:.3f}；众数：{mode_text}。  \\n增大先验参数会让相同观测对均值的影响变小。")


if __name__ == "__main__":
    app.run()
