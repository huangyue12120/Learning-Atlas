# Learning Atlas 首次使用与恢复

适用版本：v0.30.0（2026-11-06）。

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
python -m pip install marimo numpy matplotlib
# 需要时再安装 JAX：python -m pip install jax
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

- **导出 JSON**：版本 4 可恢复课程状态、阅读位置、笔记、助理对话、复习项、自测记录和按课草稿；仍接受版本 3，草稿默认为空。
- **导出 Markdown**：供阅读或留档，不能导回应用。
- **导入 JSON**：先行内确认并校验备份格式，再以一次事务替换上述学习数据；目录中已不存在的课程记录也会保留，并报告数量。失败导入不会改变现有数据；模型连接和私人工作区不会改变。

删除笔记或对话、清空对话和导入成功后，可在 60 秒内点击“撤销”。导入后如果已有新的学习数据写入，服务端会拒绝撤销覆盖，请改用 JSON 备份恢复。导入前请先导出当前 JSON。若需要完整迁移（包括模型连接和私人工作区），先停止应用，再复制整个个人数据目录；恢复时以备份目录替换目标目录后重新启动应用。

## 5. 验收与已知边界

首次启动后，至少完成一次阅读、保存笔记、提交自测、标记复习、打开工作区或探索、导出 JSON，并在空数据目录中导入该 JSON 验证恢复。

应用不提供多设备同步，也不托管模型服务。课程译文或测验的来源指纹与本地同步到上游 `main` 的版本不一致时，应用会将其降级为“待同步”，而不会自动覆盖已审核内容；理论原文链接始终指向官方 `main`。

## 本机数据库与接口安全

模型 API key 以明文保存在本机 `learning-atlas.sqlite` 的连接配置中，不进入 JSON/Markdown 备份。请保护数据目录的文件访问权限，不要提交或同步到网盘。Node.js 的 `node:sqlite` 可能输出实验性提示；该提示不代表数据库损坏。应用只接受本机实际端口的请求，命令行无 Origin 的合法 JSON 请求仍可使用。更换模型地址时需重新填写 key（无认证的本地模型可留空）。

## 阅读与草稿

首次从 Phase 0 第一课开始；之后从首页或无参数的阅读器入口继续学习。使用目录筛选或上一课/下一课切换，也可在输入框外按 `[` / `]`。面板开关、主题、切课和浏览器历史会保留草稿与选项，短暂停顿后自动保存到 SQLite；保存失败会在正文末尾显示提示。模型 key 的未保存输入不持久化。

读前预测只记录直觉，不计分、不标记掌握；课末自测提交后显示正确选项与解析。需要复习时主动点击“将本题加入待复习”。手机上的主题入口保持可见，目录与辅助面板可用 Esc 关闭。

## 按课安装 Python 依赖与助理响应

根项目的 uv 环境使用 Python 3.14，默认 `uv sync --locked` 仅拉取基础阅读实验所需的 marimo、NumPy、Matplotlib。选择课程后再安装相应 extra：`math`（JAX）、`ml`（scikit-learn/Pandas）、`deep-learning`（PyTorch/Transformers/分词）、`audio`、`vision`、`data`、`notebooks` 或 `models`。例如：`uv sync --locked --extra math --extra ml`。不要用 `--all-extras` 作为入门安装步骤。原有 `.venv` 仅在你主动运行同步命令时才会变更。

助理优先读取当前小节、后一个小节和前一个小节；课程节选最多 6000 字符，关联理论最多 2000 字符，历史最多 4000 字符并保留完整轮次。界面逐段显示生成结果，可点击“停止生成”；中断或失败时保留问题草稿，不保存半条回复。回复完成后才成对保存本轮问题与回答。较长解释可能触及回复长度限制，可缩小问题后重试。

`npm run dev` 与 `npm start` 读取仓库内 `runtime.env`，使用 64 个文件 I/O 工作线程并发检查课程来源；没有跳过依赖检查或关闭 SHA-256 门禁。`npm run benchmark` 预热后连续测三组、每组 20 次，以每组中位数判断是否低于 100 ms。可运行 `node --env-file=runtime.env --experimental-strip-types scripts/benchmark-local-storage.ts`，用临时本地副本诊断存储差异；该对照不代替当前工作区的性能验收。
