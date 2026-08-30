# Learning Atlas 首次使用与恢复

Learning Atlas 是本地优先应用：课程内容来自仓库，个人学习数据、模型 key 和私人工作区仅保存在你的设备上。

## 1. 启动阅读器

需要 Node.js 22.18 或更高版本。首次使用时，在应用目录安装依赖并启动：

```bash
cd apps/local-learning
npm install
npm run dev
```

在浏览器打开终端输出的 `http://127.0.0.1:4173`。升级代码或依赖后，停止旧进程，再重复 `npm install` 和 `npm run dev`；应用会保留原有 SQLite 数据库并执行兼容迁移。

默认个人数据目录是 `apps/local-learning/data/`。如需将它存到其他位置，在启动前设置 `LEARNING_ATLAS_DATA_DIR`；不要把该目录或其中的数据库提交到版本库。

## 2. Python 与本地实践

建议在仓库根目录创建一个不提交的共享基础环境，而不是为每节课重复创建环境：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install marimo numpy matplotlib jax
```

课程工作区由阅读器复制到个人数据目录；VS Code 和 marimo 均应使用这个解释器。例如：

```bash
./.venv/bin/python -m marimo edit <你的探索文件>.py
```

基础环境适合入门课程。若某课需要特定 CUDA、PyTorch 或系统级依赖，建立该课的专用环境，不要为迁就一个 GPU 栈而破坏共享基础环境。

## 3. VS Code、marimo 与模型连接

- 安装并在命令行可用 `code` 后，点击“在 VS Code 中继续”即可打开本课私人工作区。
- 在共享环境中安装 `marimo` 后，点击“用 marimo 探索”打开可编辑的本地探索。
- 学习助理需要一个 OpenAI 兼容的 `base URL`、模型名和可选 API key。填写地址与 key 后点击“获取模型名称”；接口支持 `/models` 时，模型名会成为下拉选项。

模型连接仅存于本机 SQLite 数据库，不会被 JSON/Markdown 导出，也不会上传到课程仓库。

## 4. 备份、导出与恢复

在笔记面板的“备份与恢复”中：

- **导出 JSON**：可恢复课程状态、阅读位置、笔记、助理对话、复习项和自测记录。
- **导出 Markdown**：供阅读或留档，不能导回应用。
- **导入 JSON**：会先校验备份版本和课程 ID，再以一次事务替换上述学习数据；模型连接和私人工作区不会改变。

导入前请先导出当前 JSON。若需要完整迁移（包括模型连接和私人工作区），先停止应用，再复制整个个人数据目录；恢复时以备份目录替换目标目录后重新启动应用。

## 5. 验收与已知边界

首次启动后，至少完成一次阅读、保存笔记、提交自测、标记复习、打开工作区或探索、导出 JSON，并在空数据目录中导入该 JSON 验证恢复。

应用不提供多设备同步，也不托管模型服务。课程译文或测验的来源指纹与本地同步到上游 `main` 的版本不一致时，应用会将其降级为“待同步”，而不会自动覆盖已审核内容；理论原文链接始终指向官方 `main`。
