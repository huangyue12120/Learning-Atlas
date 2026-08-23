# Learning Atlas

> 将可追溯的 AI 工程实践课与必要理论知识组织为一条中文、本地优先的学习路径：阅读、实践、测验、复习和学习助理都在自己的电脑上完成。

适合希望系统学习 AI 工程、需要保留原文来源并愿意在本地运行 Python 实作的中文学习者。需要 Node.js 22.18+；最快可在初始化子模块后启动本地阅读器：

```bash
git submodule update --init --recursive
cd apps/local-learning
npm ci
npm run dev
```

然后打开 <http://127.0.0.1:4173>。

当前发布版本为 **v0.2**（2026-08-21）：已完成 Phase 0–11 共 223 节经审核的中文实践译文。阅读器当前开放 Phase 0–6 的 139 节课，配套中文测验 34 份；理论关联共 201 条，其中 118 条已批准。

## 为什么使用它

- **按课加载，而非固定演示**：每节课由 `lessonId` 动态加载各自的中文内容、测验、理论卡、Python 工作区与可用的 marimo 探索。
- **保留来源，也保留中文学习体验**：两个上游子模块跟踪 `main`，而每次发布仍记录可复现的源码快照；每份译文、测验和理论关联均记录文件路径和 SHA-256 指纹。来源发生变化时，旧内容会降级为“待同步”，不会被自动覆盖。
- **让学习状态真正留在学习者手中**：进度、阅读位置、笔记、待复习项、自测和助理对话保存在本机 SQLite；可导出 Markdown 或 JSON，并可从经过校验的 JSON 恢复。
- **实践与理论在需要处连接**：理论卡仅在人工审核后才会显示，并指向对应的原始理论笔记。第 15 课额外提供了抽样与中心极限定理（CLT）的中文专题笔记。
- **学习助理由你选择模型**：支持 OpenAI 兼容的本地或自选模型服务，优先基于当前课程、关联理论和本地学习状态提问或解释；模型 key 不会导出或上传到课程仓库。

## 快速开始

### 1. 获取完整仓库

首次克隆时请携带上游子模块：

```bash
git clone --recurse-submodules https://github.com/huangyue12120/Learning-Atlas.git
cd Learning-Atlas
```

如果已经克隆但尚未获得课程内容，执行：

```bash
git submodule update --init --recursive
```

### 2. 启动本地学习应用

```bash
cd apps/local-learning
npm ci
npm run dev
```

应用只监听 `127.0.0.1:4173`。它会在 `apps/local-learning/data/` 创建个人 SQLite 数据库；该目录已被 Git 忽略。

如需把个人数据存到其他位置，启动前设置 `LEARNING_ATLAS_DATA_DIR`。完整迁移方式、备份恢复、VS Code、marimo 和模型配置请参阅[首次使用与恢复](docs/first-use.md)。

### 3. 可选：准备 Python 实作环境

建议在仓库根目录使用一个共享基础环境：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install marimo numpy matplotlib jax
```

`.venv/` 不会进入版本控制。遇到特定 CUDA、PyTorch 或系统级依赖时，请为该课程创建专用环境，不要破坏共享基础环境。

## 学习流程

1. 在左侧课程栏选择课程；“未开始、学习中、已理解、需复习”会与当前课程区分显示。阅读器当前开放 Phase 0–6；Phase 7–11 的译文已完成审核，待接入阅读器。
2. 阅读中文课程内容，需要时展开已批准的理论卡，或查看锁定版本的上游原文。
3. 提交本课测验；在笔记面板记录自己的表述或添加待复习项。
4. 对提供实践资源的课程，点击“在 VS Code 中继续”创建学习者私有的 Python 工作区；可选地用 marimo 改参数做探索。
5. 在笔记面板导出 JSON 备份。JSON 导入会以事务替换学习数据，但不会改动模型连接和私人工作区。

## 仓库结构

```text
apps/local-learning/       本地 Node.js 阅读器、浏览器界面与 API 测试
content/
  translations/            版本化中文实践译文与专题理论译文
  assessments/             中文测验改编
  theory-links/            人工批准的实践—理论关联
  workspace-templates/     供学习者复制的 Python 工作区模板
  explorations/            可选 marimo 探索模板
docs/                      内容清单、首次使用说明、发布说明与 ADR
scripts/                   译文结构和来源指纹校验器
ai-engineering-from-scratch/  上游实践课程库（Git submodule）
maths-cs-ai-compendium/      上游理论知识库（Git submodule）
```

课程内容契约与审核规则见[内容模式说明](docs/content-schema.md)，本次发布范围与上游版本见[内容清单](docs/content-manifest.md)。

## 开发与验证

内容或应用发生改动后，在仓库根目录执行：

```bash
python3 scripts/check_translation_correspondence.py
python3 scripts/check_source_fingerprints.py

cd apps/local-learning
npm run check
npm test
```

前两项分别核对译文与原文的结构对应关系、以及全部版本化内容的来源 SHA-256；后两项检查服务端语法并运行应用 API 测试。

## 跟踪上游更新

两个 Git submodule 均跟踪各自的 `main`。这不会在 clone 或每日检查时自动发布新内容：父仓库的每个提交仍记录确定的子模块 commit，以便复现已审核版本。

```bash
# 只检查上游 main 是否有待审核的新提交
python3 scripts/manage_upstreams.py --check

# 拉取新提交到工作区，并运行译文结构与来源指纹校验
python3 scripts/manage_upstreams.py --sync
```

同步后，先更新并人工审核受影响内容；待全部校验通过后，再提交新的 submodule 指针。GitHub Actions 也会每天检查一次并在发现待审核上游更新时提示维护者。对需要在 GitHub 中处理的更新，可手动运行 **Create upstream synchronization PR**：它仅创建更新 submodule 指针的 PR；合并前必须让验证工作流恢复为绿色。

每次推送和面向 `main` 的 PR 都会运行 **Content and application validation**，覆盖译文结构、来源指纹、浏览器脚本语法、服务端语法和 API 测试。

## 数据与边界

- 本项目不提供账户、多设备同步、托管模型服务或联网搜索。
- 个人学习数据、模型 key 和学习者工作区不属于版本化课程内容，默认只保存在本机。
- 目前阅读器发布 Phase 0–6 的经审核实践主线和已批准理论卡；Phase 7–11 的 84 节译文已完成审核但尚未接入，完整理论知识库中文化也作为独立内容流推进。
- JSON 恢复不可撤销；导入前请先导出当前备份。

## 贡献

欢迎通过 Issue 或 Pull Request 改进课程体验、译文、测验和文档。提交内容改编时，请保留上游来源、revision 与 SHA-256，并遵守[内容模式说明](docs/content-schema.md)中的结构对应与人工审核要求。

## 来源与许可证

本项目通过 Git submodule 引入两个只读、可追溯的上游来源：

- [`ai-engineering-from-scratch`](https://github.com/rohitg00/ai-engineering-from-scratch)（MIT）
- [`maths-cs-ai-compendium`](https://github.com/HenryNdubuaku/maths-cs-ai-compendium)（Apache-2.0）

上游内容仍分别受其许可证约束；版本化中文改编会保留原始归属与来源指纹。根项目自己的开源许可证尚待添加；在其加入前，请勿假定根项目中的新增内容可按某一许可证再分发。

---

发布信息、已知限制和备份建议请参阅 [v0.2 发布说明](docs/release-notes.md)。
