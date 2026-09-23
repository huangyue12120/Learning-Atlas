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

*本篇将Git 与版本控制放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

*Git是软件团队在互不重叠工作的情况下如何合作的. 此文件涵盖Git智能模型,分支策略,并网和再定位,解决冲突,拉出请求,以及管理大文件和实验跟踪等ML特定挑战. *

- 每个严肃的软件项目都使用版本控制. ** Git**是几乎所有开源项目和公司都采用的主导系统。没有git,合作就是电子邮件 zip文件,祈祷没有人覆盖您的更改。有了Git,每个变化都会被跟踪,可逆,并可以归属.

- 对于 ML 工程师: git 跟踪您的代码, 配置和实验脚本. 结合实验跟踪工具,它让你可以复制: “什么确切的代码和配置产生了这个模型?”

## 心智模型


- 吉特追踪你的计划 每一份承诺都是当时所有被跟踪文件的完整快照,而不是diff(内部,为提高效率而存储了diffs,但概念上每个承诺是一个完整的状态).

- 您的文件有四个"位置":

    1. **工作目录**:磁盘上的实际文件. 你编辑这些。
    2. ** 显示区域** (索引):您为下次承诺所标出的文件。`git add`移动此处更改。
    3. ** 本地仓库**:您的承诺历史,存储于`.git/`. `git commit`保存中转区域为新快照。
    4. ** 远程寄存器**(如:GitHub):一个共享副本。`git push`上传您的承诺,`git pull`下载别人的。

```
Working Dir  →  git add  →  Staging  →  git commit  →  Local Repo  →  git push  →  Remote
                                                        ←  git pull  ←
```

- 中转区域是使GIT强大的。您可以编辑 10 文件, 但只执行 3 个文件, 保留其他更改以单独执行。这使得人们能够做出干净、专注的承诺。

### 基本命令


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


- 支部**是指向一个犯罪。默认分支是`main`(或 减:`master`) (中文(简体)). 创建分支会给您一个独立的开发线: 您可以在不受影响的情况下进行修改`main`.

```bash
git branch feature-x              # create a branch
git checkout feature-x            # switch to it
git checkout -b feature-x         # create and switch in one step
git branch -d feature-x           # delete branch (after merging)
git branch -a                     # list all branches (local + remote)
```

- ** 何时到分支**:永远。永远不要直接承诺`main`。。。每一个特性,bug修补,或实验都有自己的分支. 一直这样`main`稳定且可部署。

### 分支策略


- ** Feature 分支**(最常见):每个功能/固定都得到一个分支关闭`main`。。。完成后,打开拉取请求(PR)后再合并. 很简单,对大多数球队都有效

- ** 基于Trunk的开发**:开发者承诺`main`经常(每天多倍),使用地标来隐藏不完整的工作. 由连续部署的团队首选(Google,Facebook). 需要优秀的CI/CD.

- **Gitflow**:用于特性,放出和取热的分枝. 更复杂,更适合有版本发行的软件(移动应用程序,被打包的软件). 多数ML项目都过度杀戮.

- 对于ML球队:**地缘分枝** 有短寿命分枝(在1-3天之内出现)是甜点. 长生树枝与`main`并造成痛苦的合并冲突。

## 合并与变基


- * Morge** 创造了一个新的“共同承诺”,将两个分支结合起来:

```bash
git checkout main
git merge feature-x
```

- 这保留了完整的历史:你可以看到,一个分支的工作以及它合并时发生的. 合并承诺有两个父母.

- ** Rebase** 重放您的分行的承诺 在目标分行上方:

```bash
git checkout feature-x
git rebase main
```

- 这改写了历史: 您的分行承诺得到新的散列, 好像您是从当前尖端开始工作的`main`。。。结果是一个线性历史(没有合并承诺),它更清洁地读取.

- ** 何时使用**:
    - ** 用于更新您的特性分支`main`更改(保持分支的清洁和更新)。
    - ** 用于将您的特性分支整合到`main`(保有分行通史.
    - ** 从未与他人一起推举和分享过的罪行。重新编造历史;如果有人把工作建立在原作的基础上,重新编造会造成混乱。

## 解决冲突


- ** 冲突** 当两个分支修改同一文件的同行时发生. Git 无法自动决定要保存的更改, 请您手动解决。

```
<<<<<<< HEAD
learning_rate = 0.001
=======
learning_rate = 0.0005
>>>>>>> feature-x
```

- 介于`<<<<<<< HEAD`财务报告和已审计财务报表`=======`是当前分支的版本。介于`=======`财务报告和已审计财务报表`>>>>>>> feature-x`是即将到来的分支的版本。您决定保存(或合并它们) , 删除标记, 保存,以及`git add`解析文件。

- ** 意外**:在已承诺的文件中不要留下冲突标记。它们是文字文本 将打破你的代码。总是寻找`<<<<<<<`解决后。

- ** 减少冲突**:保持分支短命,合并`main`并避免多人同时编辑同一文件。

## 编写高质量提交消息


- 一个承诺的信息是 对于你的未来自我和你的队友。"修复错误"告诉你什么。"Fix在分批量大小计算中逐一导致OOM在8-GPU的训练"告诉你一切.

- ** 格式**:

```
Short summary (50 chars or less, imperative mood)

Longer description if needed. Explain WHY, not WHAT
(the diff shows what changed). Wrap at 72 characters.

Fixes #123
```

- **Imperative mood**:"添加特写"不是"添加特写"或"添加特写". 读作完成句子:"如果应用,这个承诺将**添加特性**".

- ** 原子犯罪**:每项犯罪都应做一件事。"添加数据加载器"是一个承诺. "添加数据加载器并修复无关的bug并更新README"应为3个承诺. 这样就`git bisect`可能发生错误。

## 拉取请求与代码评审


- ** 将一个分支并入`main`。。。这是代码审查的网关:队友读取您的修改,建议改进,在合并前批准.

- ** 良好公关做法**:
    - 保持微小的PR(在400行变化下). 大型公关因为没人想审查2000行而被打上橡皮印.
    - 写出明确的描述:什么改变了,为什么,以及如何测试.
    - 链接到促使变化的发行或罚单.
    - 答复,及时审查评论意见。
    - 合并前轻而易举地犯法(如此)`main`拥有干净的历史。

- ** Code review不是关于寻找bugs**(测试就是这样做的). 内容是:知识共享(审查者学习代码库),设计反馈(这是正确的方法吗?),以及维持标准(命名,风格,架构).

## .吉提格诺尔


- 该`.gitignore`file 告诉 git 哪些文件可以排除跟踪。管理、管理和项目:

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

- ** 属性**: 将文件添加到`.gitignore`在它被执行之后,它不会从存储器中移除它。也一定要这样`git rm --cached file`来解开它 文件将永远留在历史中,除非你改写历史(这很乱).

## 用于 ML 的 Git


- ML带来了传统软件没有面临的挑战:

- ** Large 文件**:数据集和模型重为千兆字节或更多. Git是针对文本文件(源代码)设计的,而不是二进制斑点. 解决方案:
    - **Git LFS**(大文件存储):在git中指向音轨,将实际文件存储在一个单独的服务器上. GitHub 上简单但有存储/带宽限制.
    - ** DVC**(数据版本控制):使用远程存储(S3,GCS),与git分开管理数据和模型文件. 工作如 Git 数据 :`dvc add data.csv`, `dvc push`, `dvc pull`.

- ** 经验跟踪**:哪些承诺+哪些超参数+哪些数据产生哪些计量标准? Git 音轨代码,但不是完整的实验上下文.
    - ** 重量和比ases(W&B)**:日志度量衡、超参数、系统信息,以及与git承诺的链接。为比较运行提供仪表板.
    - **MLflow**:与模型登记册的开源实验跟踪。日志参数、度量衡和文物。
    - ** 简单方法**:在培训脚本中记录粗体字:`git_hash = subprocess.check_output(['git', 'rev-parse', 'HEAD']).strip()`。。。把它和结果放在一起

- ** 可复制性核对表**(每个试验的追踪方法):
    - Git 承诺散列(精确代码版本)
    - 配置文件/ 超参数
    - 随机种子
    - Python 和库版本(`pip freeze`)
    - 数据版本(DVD hash或数据集版本标签)
    - 硬件(GPU 类型, GPU 数量)

```bash
# Quick reproducibility snapshot
echo "Commit: $(git rev-parse HEAD)" > experiment_info.txt
echo "Branch: $(git branch --show-current)" >> experiment_info.txt
echo "Dirty: $(git status --porcelain | wc -l) files" >> experiment_info.txt
pip freeze >> experiment_info.txt
nvidia-smi >> experiment_info.txt
```
