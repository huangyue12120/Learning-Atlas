# Learning Atlas

> 将可追溯的 AI 工程实践主线与完整理论课程组织为一张中文、本地优先的学习地图：阅读、实践、测验、复习和学习助理都在自己的电脑上完成。

适合希望系统学习 AI 工程、需要保留原文来源并愿意在本地运行 Python 实作的中文学习者。需要 Node.js 22.18+；最快可在初始化子模块后启动本地阅读器：

```bash
git submodule update --init --recursive
cd apps/local-learning
npm ci
npm run dev
```

然后打开 <http://127.0.0.1:4173>。

当前发布版本为 **v0.27.2**（2026-10-24）：首页展示 Phase 0-19 的完整实践地图与 20 章、104 篇笔记的完整理论目录。实践上游现有 542 节课程，已全部完成审核中文改编；实践阅读器开放 Phase 0-18 的 457 节课程，Phase 19 的 85 节内容显示为“已审核，待接入”。本版处理 Issue #31，将实践快照从 `f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299` 更新到 `3f9715c62a3bedcffb68a260f1a65ee2dd9cc10a`：按上游对 Phase 0-19 原文错误的修正，复核 184 篇中文实践译文（182 篇随之修改）、1 份测验、102 条理论关联和 12 份练习指南，内容计数不变。v0.27.1 修复了既有中文内容审查发现的问题：重译 P18 第 21 课测验，为 P17、P18 的 347 道测验写出逐题解析，恢复被压成段落的列表，翻译剩余的英文练习提示、Mermaid 标签和理论 SVG 说明，统一 reward hacking、system prompt、token、chunk 等术语，并修复 187 节课显示“预计学习：未提供”的问题。v0.27.0 新增了 Phase 13 第 32–45 课的逆向工程轨道：14 篇中文译文、14 份中文测验和 14 套 Python 工作区练习指南；“在 VS Code 中继续”现在会把课程的整个 `code/` 目录（fixtures、tests、评分实验）复制进私人工作区。本版同时修复了监控缺口：每日上游检查会把已开放 Phase 中缺少中文适配的新课程视为需要审核，覆盖率检查也会在 submodule 指针变化后立即运行，并在缺口补齐后自动关闭对应 Issue。当前开放课程的 289 张上下文理论卡已提供可展开的直觉、关键点、应用和自检问题，89 / 104 篇审核中文理论全文已覆盖 311 / 311 张理论卡，所有理论原文入口均打开官方上游最新 `main`。内容仓库维护 542 节审核中文实践译文、307 份中文测验、449 套 VS Code/Python 工作区模板与练习指南，以及 311 条人工批准的理论关联。本版理论复核记录见[理论复核清单](docs/theory-translation-review.md)与[术语表](docs/translation-glossary.md)。P16 的 25 节课程及其两个 TypeScript 例外继续保持已发布状态。

## 为什么使用它

- **按课加载，而非固定演示**：每节课由 `lessonId` 动态加载各自的中文内容、测验、理论卡、Python 工作区与可用的 marimo 探索。
- **保留来源，也保留中文学习体验**：两个上游子模块跟踪 `main`，而每次发布仍记录可复现的源码快照；每份译文、测验和理论关联均记录文件路径和 SHA-256 指纹。理论原文链接跟随官方 `main`，本地中文译文在同步后通过指纹重新审核；来源发生变化时，旧内容会降级为“待同步”，不会被自动覆盖。
- **让学习状态真正留在学习者手中**：进度、阅读位置、笔记、待复习项、自测和助理对话保存在本机 SQLite；可导出 Markdown 或 JSON，并可从经过校验的 JSON 恢复。
- **实践优先，理论也可完整浏览**：首页提供 20 章理论目录；理论卡仍只在人工审核后显示，并从当前实践位置连接到对应完整理论。第 15 课的抽样与中心极限定理（CLT）笔记可在应用内阅读审核中文全文。
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

1. 从首页开始或继续实践主线，也可展开 20 章理论目录独立阅读。新学习者从 Phase 0 第一课开始；阅读器当前开放 Phase 0-18，共 457 节课，Phase 19 仅展示为已审核、待接入。
2. 阅读中文课程内容，需要时展开已批准的理论卡，或查看上游 `main` 的原文。
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
scripts/                   内容结构、来源指纹、覆盖率和仓库卫生校验器
ai-engineering-from-scratch/  上游实践课程库（Git submodule）
maths-cs-ai-compendium/      上游理论知识库（Git submodule）
```

课程内容契约与审核规则见[内容模式说明](docs/content-schema.md)，本次发布范围与上游版本见[内容清单](docs/content-manifest.md)。

## 开发与验证

内容或应用发生改动后，在仓库根目录执行：

```bash
python3 scripts/check_translation_correspondence.py
python3 scripts/check_source_fingerprints.py
python3 scripts/check_assessment_correspondence.py
python3 scripts/check_theory_cards.py
python3 scripts/check_repository_hygiene.py

cd apps/local-learning
npm run check
npm test
```

前五项分别核对译文与原文的结构对应关系（含列表项数量）、全部版本化内容的来源 SHA-256、中文测验与上游逐题对应（题数、阶段、正确答案、未译英文和重复套话解析）、已发布理论卡的内容契约，以及是否误提交学习数据、私钥、凭据、令牌和本地状态文件；后两项检查浏览器模块与服务端语法，并运行应用 API 测试。翻译覆盖率可用 `python3 scripts/check_translation_coverage.py` 查看（报告默认输出到终端），CI 也会在缺口出现时给出警告。

## 跟踪上游更新

两个 Git submodule 均跟踪各自的 `main`。这不会在 clone 或每日检查时自动发布新内容：父仓库的每个提交仍记录确定的子模块 commit，以便复现已审核版本。

```bash
# 只检查上游 main 是否有待审核的新提交
python3 scripts/manage_upstreams.py --check

# 拉取新提交到工作区，并运行译文结构与来源指纹校验
python3 scripts/manage_upstreams.py --sync
```

同步后，先更新并人工审核受影响内容；待全部校验通过后，再提交新的 submodule 指针。GitHub Actions 也会每天检查一次；当上游改动命中已登记的中文译文、测验或理论关联来源，或者给已开放 Phase 带来尚无中文改编的新课程时，才会提示维护者。对需要在 GitHub 中处理的更新，可手动运行 **Automation / Open upstream synchronization PR**：它仅创建更新 submodule 指针的 PR；合并前必须让验证工作流恢复为绿色。

每次推送和面向 `main` 的 PR 都会运行 **CI / Validate content and application**，覆盖译文结构、来源指纹、仓库卫生、浏览器脚本语法、服务端语法和 API 测试；若已开放 Phase 存在缺少中文改编的课程，它会在提交或 PR 上给出警告，并把覆盖报告写入 job summary。

GitHub Actions 的命名采用统一的 `<类别> / <动作与对象>` 形式：workflow 的显示名面向维护者，job ID 使用稳定的 kebab-case，job 的显示名使用自然语言。当前四条仓库自定义 workflow 为：

- **CI / Validate content and application**：在 push、面向 `main` 的 PR 和手动触发时运行内容及应用校验，并对翻译覆盖缺口给出警告。
- **Automation / Open upstream synchronization PR**：手动更新 submodule 指针并创建待审核 PR，不自动合并。PR 正文为中文，附带 submodule 变化和同步后的翻译覆盖率报告；推送时才临时使用令牌，checkout 不保留凭据。
- **Monitoring / Report upstream source changes**：每天检查上游分支；确认存在新提交（退出码 2）后，先按来源路径匹配已登记的中文译文、测验或理论关联，并列出已开放 Phase 中新增但尚无中文改编的课程原文、测验和 Python 实作。命中其中任一项时，才将报告用于创建或更新去重 Issue `[Upstream] Source updates require review`；仅涉及上游站点、构建工具或未开放 Phase 的更新不会创建 Issue。上游新增的理论笔记只在报告中列出供参考，因为阅读器会先以英文 `main` 显示它们。之后某次检查不再需要审核时，会自动关闭该 Issue。
- **Monitoring / Check translation coverage**：每周一次，并在 `main` 更新实践 submodule 指针、中文实践内容或发布范围时立即检查已经进入中文学习范围的 Phase 是否有上游课程缺少中文实践译文、中文测验或练习指南（`code/` 中有 Python 文件的课程需要练习指南）；发现缺口时创建或更新 `[Coverage] Chinese practice translations missing` Issue，缺口补齐后自动关闭。尚未接入中文学习范围的 Phase 不纳入检查。监控范围与阅读器的发布 Phase 由 `scripts/published_scope.py` 统一维护，并有测试保证两者一致。

`manage_upstreams.py --check` 只回答“上游跟踪分支是否有新 commit”；**Monitoring / Report upstream source changes** 是它之后的影响分析层，负责按已登记来源路径筛选内容影响，并在需要时列出具体改动文件、关联本地内容、SHA-256 影响和 diff。因此两者是底层 freshness 信号与上层 review 报告的关系，不是两个重复的检查。

由于当前仓库未启用 GitHub Advanced Security，官方 dependency-review action 不支持本仓库并会把 Pull Request 标为失败；对应 workflow 暂停，依赖图和 Dependabot 告警仍由 GitHub 的 Security 页面提供。

两条监控 workflow 只在脚本执行、网络、权限或 fetch 出错时以失败结束；需要审核或存在覆盖缺口属于正常结果，通过 Issue、job summary 和 notice 注释提醒，运行本身保持成功。因此红色运行总是表示监控本身出了故障。这类故障不会被误判为英文原文变更，也不会自动创建内容 Issue。所有 action 都按 commit SHA 固定，并由 `.github/dependabot.yml` 每周提交更新 PR；CI 的 Python 版本读取仓库根目录的 `.python-version`。Issue 遵循 GitHub 的关注/订阅通知；SMTP 或第三方邮件通知需要额外的收件地址和仓库 secret，当前不在仓库中配置。

## 数据与边界

- 本项目不提供账户、多设备同步、托管模型服务或联网搜索。
- 个人学习数据、模型 key 和学习者工作区不属于版本化课程内容，默认只保存在本机。
- 目前实践阅读器发布 Phase 0-18 的 457 节经审核实践主线和已批准理论卡；其中 449 节提供 VS Code/Python 工作区模板与练习指南，P16 的 01、03 课保留 TypeScript 上游实现链接。Phase 19 的 85 节译文已审核但尚未接入阅读器。完整理论目录已经开放；只有审核且来源指纹与本地 `main` 快照匹配的中文正文会在应用内发布，理论原文链接始终指向可能变化的官方 `main`。当前已有 89 / 104 篇中文理论全文进入应用内发布，覆盖 311 / 311 条理论卡关联；剩余 15 篇为尚未被理论卡引用的独立笔记。
- JSON 恢复不可撤销；导入前请先导出当前备份。

## 贡献

欢迎通过 Issue 或 Pull Request 改进课程体验、译文、测验和文档。提交内容改编时，请保留上游来源、revision 与 SHA-256，并遵守[内容模式说明](docs/content-schema.md)中的结构对应与人工审核要求。

## 来源与许可证

本项目通过 Git submodule 引入两个只读、可追溯的上游来源：

- [`ai-engineering-from-scratch`](https://github.com/rohitg00/ai-engineering-from-scratch)（MIT）
- [`maths-cs-ai-compendium`](https://github.com/HenryNdubuaku/maths-cs-ai-compendium)（Apache-2.0）

根项目原创软件代码（包括本地应用、脚本、测试和配置）采用 [Apache-2.0](LICENSE)。原创文档、设计材料和独立中文学习内容采用 [CC BY 4.0](LICENSE-CONTENT.md)。上游衍生译文和代码片段仍分别受上游 MIT 或 Apache-2.0 约束，并保留归属、来源指纹与变更说明；字体、npm 依赖和其他第三方资产继续使用各自许可证。已知边界和再分发提示见 [第三方归属清单](THIRD_PARTY_NOTICES.md)；这些文件不替代各上游或第三方的完整法律文本。

---

发布信息、已知限制和备份建议请参阅 [v0.27.2 发布说明](docs/release-notes.md)。
