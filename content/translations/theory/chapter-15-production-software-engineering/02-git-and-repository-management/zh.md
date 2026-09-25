---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 15 - production software engineering/02. git and repository management.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 5126485a2947315627d503de7600aeff04b08d744ae3185227f716c43d39289d
status: reviewed
---
# Git 与版本控制

*Git 让软件团队能够协作，而不必担心彼此覆盖工作。本篇介绍 Git 的基本模型、分支策略、合并与变基、冲突处理、合并请求，以及机器学习项目中的大文件和实验跟踪。*

- Git 是目前广泛使用的版本控制系统，开源项目和公司都常用它。没有版本控制时，团队只能互相发送压缩包，还要担心谁覆盖了谁的修改；使用 Git 后，项目变更可以被追踪、回退并关联到提交者。

- 对机器学习工程师来说，Git 可以记录代码、配置文件和实验脚本。再结合实验跟踪工具，就能追溯“生成这个模型的代码和配置具体是什么”。

## 基本模型

- Git 以**快照**的方式记录项目。每次提交在概念上都对应当时所有已跟踪文件的完整快照，而不是单纯的差异补丁；Git 内部会用更节省空间的方式存储数据。

- 文件和提交通常涉及四个位置：

    1. **工作目录**：磁盘上的实际文件，编辑操作发生在这里。
    2. **暂存区**（索引）：已选定、准备放入下一次提交的变更；`git add` 会把变更放入暂存区。
    3. **本地仓库**：保存在 `.git/` 中的提交历史；`git commit` 会把暂存内容保存为一个提交。
    4. **远程仓库**（例如 GitHub）：供团队共享的仓库副本；`git push` 上传本地提交，`git pull` 获取远端提交并整合到当前分支。默认通常是合并，具体行为也可由配置决定。

```
Working Dir  →  git add  →  Staging  →  git commit  →  Local Repo  →  git push  →  Remote
                                                        ←  git pull  ←
```

- 暂存区让你可以把不同变更拆成不同提交。例如，编辑了 10 个文件后，只把其中 3 个加入暂存区并提交，其余改动可以留到后续提交。这样能让每个提交聚焦于一个主题。

### 常用命令

```bash
git init                          # create a new repository
git clone url                     # download a remote repository
git status                        # what has changed? (most-used command)
git add file.py                   # stage a specific file
git add .                         # stage all changes (use with caution)
git commit -m "descriptive msg"   # commit staged changes
git push                          # upload commits to remote
git pull                          # download + merge remote changes
git log --oneline                 # compact commit history
git diff                          # show unstaged changes
git diff --staged                 # show staged changes
```

## 分支

- **分支**是指向某个提交的引用。默认分支通常叫 `main`，有些项目仍使用 `master`。新建分支后，提交会沿该分支继续前进，因此可以在不直接改变 `main` 的情况下开展工作。

```bash
git branch feature-x              # create a branch
git checkout feature-x            # switch to it
git checkout -b feature-x         # create and switch in one step
git branch -d feature-x           # delete branch (after merging)
git branch -a                     # list all branches (local + remote)
```

- 对许多团队来说，功能、修复或实验各自使用短期分支是一种稳妥做法。是否必须避免直接提交到 `main`，取决于团队工作流；主干开发团队也可能频繁直接向主分支提交。

### 分支策略

- **功能分支**：最常见的方式之一。每项功能或修复从 `main` 开出分支，完成后通过合并请求集成。规则简单，适合多数团队。

- **主干开发**：开发者频繁向主分支提交，使用功能开关隐藏尚未完成的功能。适合持续部署团队，但需要可靠的自动化测试和 CI/CD 流程。

- **Gitflow**：为功能、发布和紧急修复分别使用不同分支。它更适合有正式版本发布的软件；对多数机器学习项目而言可能过于复杂。

- 机器学习团队常采用功能分支，并尽量缩短分支存续时间，例如在 1–3 天内合并。长期分支容易与 `main` 逐渐分歧，增加处理冲突的成本；具体时长可依团队情况调整。

## 合并与变基

- **合并（merge）**会把两个分支的工作整合到一起。如果分支历史已经分叉，通常会创建一个有两个父提交的合并提交；若可以快进，Git 可能只移动分支指针，不额外创建合并提交。

```bash
git checkout main
git merge feature-x
```

- 保留合并提交时，可以从历史中看到分支何时合入。快进合并则不会留下单独的合并提交。

- **变基（rebase）**会把当前分支上的提交重新应用到目标分支之上，并生成新的提交哈希；效果如同从目标分支最新提交处开始开发。这样通常会形成更线性的历史，但会改写当前分支历史。

```bash
git checkout feature-x
git rebase main
```

- **如何选择**：
    - 用**变基**把尚未共享的功能分支更新到最新 `main` 之上，可保持线性历史。
    - 用**合并**把功能分支集成到 `main`，是否保留合并提交由快进条件和团队策略决定。
    - 不要变基已经推送并与他人共享、且他人可能基于其继续工作的提交。改写这类历史会让其他人的分支难以衔接。

## 处理冲突

- **冲突**表示 Git 无法自动合并两个分支的变更，需要人工判断如何处理。常见情况是双方修改了同一处内容；二进制文件、重命名和其他不兼容改动也可能造成冲突。

```
<<<<<<< HEAD
learning_rate = 0.001
=======
learning_rate = 0.0005
>>>>>>> feature-x
```

- 在这个合并示例中，`<<<<<<< HEAD` 到 `=======` 之间是当前分支的版本，`=======` 到 `>>>>>>> feature-x` 之间是传入分支的版本。选择保留其中一方或组合两边修改后，删除冲突标记并保存，再用 `git add` 标记文件已解决，最后完成合并。

- **常见错误**：提交时残留冲突标记。这些标记会成为文件中的普通文本，可能破坏代码。解决冲突后，搜索 `<<<<<<<` 等标记，确认它们已移除。

- **减少冲突**：缩短分支生命周期，经常整合 `main` 的更新，并避免多人同时修改同一文件。

## 编写清晰的提交消息

- 提交消息是留给未来的自己和团队成员看的。“修复错误”信息太少；“修正批量大小计算的差一错误，避免 8 卡训练时显存溢出”则说明了具体问题。

- **格式示例**：

```
Short summary (50 chars or less, imperative mood)

Longer description if needed. Explain WHY, not WHAT
(the diff shows what changed). Wrap at 72 characters.

Fixes #123
```

- **祈使语气**：写 `Add feature`，而不是 `Added feature` 或 `Adds feature`。可以把它读成“应用这个提交后，它将会……”。

- **原子提交**：每次提交尽量只做一件事。添加数据加载器是一件事；同时添加数据加载器、修复无关错误并修改 README，最好拆成三次提交。这样更容易用 `git bisect` 二分定位引入问题的提交。

## 合并请求与代码审查

- **合并请求（PR）**用于提议把一个分支合并到 `main`，也是团队审查变更、提出建议并决定是否批准的环节。

- **较好的 PR 做法**：
    - 让 PR 保持较小。少于 400 行可作为粗略参考，不是适用于所有项目的硬性上限；过大的改动往往难以认真审查。
    - 清楚说明改了什么、为什么改，以及如何验证。
    - 关联促成这次改动的问题或任务。
    - 及时回应审查意见。
    - 若团队工作流适用，可在合并前压缩琐碎提交，让主分支历史更清晰。

- **代码审查不只是在找错误**：审查也可能发现缺陷，但测试同样不能取代人工审查。审查还用于共享代码库知识、讨论设计方案，以及维护命名、风格和架构标准。

## .gitignore

- `.gitignore` 文件告诉 Git 哪些文件不应纳入跟踪。机器学习项目中常会排除以下文件：

```gitignore
# Python
__pycache__/
*.pyc
*.egg-info/
.venv/
env/

# Data and models (too large for git)
data/
*.csv
*.parquet
models/
*.pt
*.onnx
*.bin
checkpoints/

# Secrets
.env
*.pem
credentials.json

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Jupyter
.ipynb_checkpoints/

# Experiment outputs
wandb/
mlruns/
outputs/
logs/
```

- **常见错误**：某个文件已经提交后，后来再把它加入 `.gitignore` 并不会让 Git 停止跟踪它。可使用 `git rm --cached file` 取消后续跟踪，同时保留工作目录中的文件；该文件仍存在于既有提交历史中。

- 若误提交了密钥，应立即撤销或轮换密钥。即使重写 Git 历史，也无法保证其他克隆或缓存副本中的内容都已清除。

## 机器学习项目中的 Git

- 机器学习项目还有一些传统软件项目较少遇到的问题：

- **大文件**：数据集和模型权重可能达到数 GB。Git 更适合管理源代码等文本文件，不适合直接保存大型二进制文件。常用做法包括：
    - **Git LFS（大文件存储）**：在 Git 中保存指针，把实际文件放到单独的服务器。设置较简单，但 GitHub 等服务可能有存储量或带宽限制。
    - **DVC（数据版本控制）**：把数据和模型文件放在 Git 之外的远程存储（如 S3、GCS），并用类似 Git 的命令管理版本，例如 `dvc add data.csv`、`dvc push` 和 `dvc pull`。

- **实验跟踪**：一次实验使用了哪个提交、哪些超参数和哪一版数据，最终产生了哪些指标？Git 会记录代码版本，但不会自动记录完整的实验上下文。
    - **Weights & Biases（W&B）**：记录指标、超参数、系统信息，并关联 Git 提交；还提供仪表板比较多次运行。
    - **MLflow**：开源的实验跟踪和模型注册工具，可记录参数、指标与产物。
    - **简单做法**：在训练脚本中记录 Git 提交哈希，并与结果一起保存，例如使用 `git rev-parse HEAD` 获取当前提交。

- **实验可复现性检查清单**（为每次实验记录）：
    - Git 提交哈希（精确代码版本）
    - 配置文件和超参数
    - 随机种子
    - Python 和库版本（例如 `pip freeze`）
    - 数据版本（DVC 哈希或数据集版本标签）
    - 硬件信息（GPU 型号和数量）

- 这些信息有助于复现实验，但未必能保证逐位一致的结果；底层硬件、驱动、库版本和非确定性算子也可能影响运行结果。

```bash
# Quick reproducibility snapshot
echo "Commit: $(git rev-parse HEAD)" > experiment_info.txt
echo "Branch: $(git branch --show-current)" >> experiment_info.txt
echo "Dirty: $(git status --porcelain | wc -l) files" >> experiment_info.txt
pip freeze >> experiment_info.txt
nvidia-smi >> experiment_info.txt
```
