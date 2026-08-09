import marimo


app = marimo.App(width="medium")


@app.cell
def _():
    import math
    import marimo as mo

    return math, mo


@app.cell
def _(mo):
    angle = mo.ui.slider(0, 180, value=45, step=5, label="旋转角度（度）")
    sx = mo.ui.slider(-3, 3, value=2, step=0.5, label="x 缩放")
    sy = mo.ui.slider(-3, 3, value=0.5, step=0.5, label="y 缩放")
    mo.vstack([mo.md("# 二维矩阵变换探索"), mo.hstack([angle, sx, sy])])
    return angle, sx, sy


@app.cell
def _(angle, math, mo, sx, sy):
    theta = math.radians(angle.value)
    rotation = [[math.cos(theta), -math.sin(theta)], [math.sin(theta), math.cos(theta)]]
    scale = [[sx.value, 0], [0, sy.value]]
    rotated = (rotation[0][0], rotation[1][0])
    scaled_after_rotation = (sx.value * rotated[0], sy.value * rotated[1])
    mo.md(
        f"`R = {rotation}`  \n`S = {scale}`  \n"
        f"`R @ (1, 0) = ({rotated[0]:.3f}, {rotated[1]:.3f})`  \n"
        f"`S @ R @ (1, 0) = ({scaled_after_rotation[0]:.3f}, {scaled_after_rotation[1]:.3f})`  \n"
        f"`det(S) = {sx.value * sy.value:.3f}`"
    )


if __name__ == "__main__":
    app.run()
