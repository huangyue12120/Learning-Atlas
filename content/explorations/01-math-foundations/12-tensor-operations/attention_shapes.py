import marimo

app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    batch = mo.ui.slider(1, 8, value=2, label="batch B")
    sequence = mo.ui.slider(1, 32, value=8, label="序列 T")
    embed = mo.ui.slider(8, 128, value=64, step=8, label="嵌入 E")
    heads = mo.ui.slider(1, 8, value=4, label="头数 H")
    mo.vstack([mo.md("# Multi-head attention 的 shape 追踪"), mo.hstack([batch, sequence, embed, heads])])
    return batch, embed, heads, sequence


@app.cell
def _(batch, embed, heads, mo, sequence):
    if embed.value % heads.value:
        mo.md("E 必须能被 H 整除，才能定义 head_dim。")
    else:
        d = embed.value // heads.value
        mo.md(f"输入/投影 QKV：(B,T,E)=({batch.value},{sequence.value},{embed.value})  \\n拆头后：(B,H,T,D)=({batch.value},{heads.value},{sequence.value},{d})  \\nScores：(B,H,T,T)=({batch.value},{heads.value},{sequence.value},{sequence.value})  \\n合并后输出：(B,T,E)=({batch.value},{sequence.value},{embed.value})")


if __name__ == "__main__":
    app.run()
