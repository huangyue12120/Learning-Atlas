import marimo

app = marimo.App(width="medium")


@app.cell
def _():
    import math
    import marimo as mo
    return math, mo


@app.cell
def _(mo):
    first = mo.ui.slider(-10, 10, value=2, step=0.5, label="logit 0")
    second = mo.ui.slider(-10, 10, value=1, step=0.5, label="logit 1")
    third = mo.ui.slider(-10, 10, value=0, step=0.5, label="logit 2")
    mo.vstack([mo.md("# 稳定 softmax 探索"), mo.hstack([first, second, third])])
    return first, second, third


@app.cell
def _(first, math, mo, second, third):
    logits = [first.value, second.value, third.value]
    maximum = max(logits)
    exponentials = [math.exp(value - maximum) for value in logits]
    total = sum(exponentials)
    probabilities = [value / total for value in exponentials]
    mo.md("logits: " + str(logits) + "  \n减最大值后: " + str([value - maximum for value in logits]) + "  \nsoftmax: " + str(probabilities) + "  \n概率和: " + str(round(sum(probabilities), 8)))


if __name__ == "__main__":
    app.run()
