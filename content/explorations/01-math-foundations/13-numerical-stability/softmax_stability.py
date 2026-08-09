import marimo

app = marimo.App(width="medium")


@app.cell
def _():
    import math
    import marimo as mo
    return math, mo


@app.cell
def _(mo):
    offset = mo.ui.slider(-1000, 1000, value=100, step=10, label="共同 logit 偏移")
    mo.vstack([mo.md("# Stable softmax\n给所有 logits 加同一大偏移，观察稳定算法的概率不变。"), offset])
    return (offset,)


@app.cell
def _(math, mo, offset):
    logits = [offset.value, offset.value + 1, offset.value + 2]
    maximum = max(logits)
    exps = [math.exp(x - maximum) for x in logits]
    probs = [x / sum(exps) for x in exps]
    mo.md(f"logits={logits}  \\n减最大值后={[x-maximum for x in logits]}  \\nsoftmax={[round(p, 6) for p in probs]}；概率和={sum(probs):.6f}")


if __name__ == "__main__":
    app.run()
