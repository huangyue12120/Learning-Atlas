# 从零实现 3D Gaussian Splatting：练习指南

- 课程路径：`phases/04-computer-vision/22-3d-gaussian-splatting`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **（简单）** 在另一张合成图像上运行上方 2D splat 训练器。令 `num_splats` 取 `[16, 64, 256]`，为每种绘制 MSE 与步数的关系，找出收益递减点。
2. **（中等）** 扩展 2D 光栅器，使每高斯 RGB 颜色通过二阶谐波依赖标量“视角”。在一对目标图上训练并验证模型重建二者。
3. **（困难）** 克隆 `nerfstudio`，在任一 20 张照片拍摄的场景（桌面、植物、人脸、房间）上训练 `splatfacto`。导出 glTF `KHR_gaussian_splatting`，并在查看器（Three.js `GaussianSplats3D`、SuperSplat、Babylon.js V9）中打开。报告训练时间、高斯数量和渲染 fps。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
