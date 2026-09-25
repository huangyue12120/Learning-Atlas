---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 15 - production software engineering/01. linux and CMD.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 9aca3225191627bb64a5a357054f25f3c662fc4070d981b5fa7573d487fc5476
status: reviewed
---
# Linux 与命令行

*在机器学习工程中，命令行常用于启动训练任务、管理服务器、运行数据流水线和维护集群。本篇介绍 shell、文件系统、权限、进程、包管理器、环境变量、SSH，以及常用的命令行工具。*

- 图形界面适合浏览网页；但在远程 GPU 集群上启动训练任务、检查日志和管理进程时，命令行更方便。**命令行**（也称终端界面；命令由 shell 读取和执行）可脚本化、可组合，也能用于笔记本电脑、云虚拟机和高性能计算集群。

- 若机器学习工程师只使用 Jupyter Notebook 和 VS Code 按钮，许多重复操作就很难自动化。生产环境中的机器学习系统通常也会通过命令行部署、监控和调试。

## Shell

- **Shell** 是读取并执行命令的程序，是用户与操作系统之间的接口（见第 13 章）。Linux 上常见的 shell 包括 bash；macOS 默认使用 zsh。

- 命令的一般形式为：`command [options] [arguments]`

```bash
ls -la /home/user    # command=ls, options=-la, argument=/home/user
```

- 选项用于调整命令行为，短选项通常以 `-` 开头，长选项通常以 `--` 开头。`ls -l` 以长格式列出文件，`ls --all` 显示隐藏文件。多个短选项可以组合，例如 `ls -la` 相当于同时使用 `-l` 和 `-a`。

### 常用路径导航

```bash
pwd                 # print working directory (where am I?)
ls                  # list files in current directory
ls -la              # list all files (including hidden) with details
cd /path/to/dir     # change directory
cd ..               # go up one level
cd ~                # go to home directory
cd -                # go back to previous directory
```

### 文件操作

```bash
cp source dest      # copy file
cp -r dir1 dir2     # copy directory recursively
mv old new          # move/rename file
rm file             # delete file (no recycle bin — gone forever)
rm -rf dir          # delete directory recursively (DANGEROUS — no confirmation)
mkdir -p a/b/c      # create nested directories
touch file.txt      # create empty file (or update timestamp)
cat file.txt        # print file contents
head -n 20 file     # first 20 lines
tail -f logfile     # follow a log file in real-time (invaluable for monitoring training)
```

- **注意**：`rm -rf` 会递归删除目录及其内容，通常没有回收站，也不会逐项确认。执行前务必核对路径，切勿误用 `rm -rf /` 或 `rm -rf ~`。

### 管道与重定向

- Shell 的重要特点是**命令可组合**：把简单命令连接起来，完成更复杂的操作。

- **管道**（`|`）把前一个命令的标准输出传给下一个命令的标准输入。

```bash
cat training.log | grep "loss" | tail -5    # last 5 lines containing "loss"
ps aux | grep python                        # find running Python processes
history | grep "docker"                     # find previous docker commands
```

- **重定向**可以把命令输出写入文件，而不是显示在屏幕上。

```bash
python train.py > output.log 2>&1    # stdout AND stderr to file
python train.py >> output.log        # append (don't overwrite)
echo "data" > file.txt               # overwrite file
echo "more" >> file.txt              # append to file
```

- `2>&1` 把标准错误（文件描述符 2）重定向到标准输出（文件描述符 1）。命令 `python train.py > output.log 2>&1` 会先把标准输出写入文件，再把标准错误也指向同一处。若不合并标准错误，错误信息仍会显示在终端。

### 文本处理

```bash
grep "error" logfile.txt             # find lines containing "error"
grep -r "import torch" src/          # search recursively in directory
grep -i "warning" log.txt            # case-insensitive search
grep -c "epoch" train.log            # count matching lines

wc -l file.txt                       # count lines
wc -w file.txt                       # count words

sort data.txt                        # sort lines alphabetically
sort -n numbers.txt                  # sort numerically
sort -u data.txt                     # sort and remove duplicates
uniq -c sorted.txt                   # count consecutive duplicates

cut -d',' -f2,3 data.csv            # extract columns 2 and 3 from CSV
awk '{print $1, $3}' data.txt       # print 1st and 3rd whitespace-separated fields
sed 's/old/new/g' file.txt          # replace all occurrences of "old" with "new"
```

- 多个文本处理命令可以通过管道组合：

```bash
# Find the 10 most common error types in a log file
grep "ERROR" app.log | awk -F': ' '{print $2}' | sort | uniq -c | sort -rn | head -10
```

### 查找文件

```bash
find . -name "*.py"                  # find all Python files
find . -name "*.pyc" -delete         # find and delete compiled Python files
find /data -size +100M               # files larger than 100 MB
find . -mtime -1                     # files modified in the last 24 hours

which python                        # where is the python executable?
locate filename                      # fast file search (uses pre-built index)
```

- `locate` 使用预先建立的索引，速度通常较快；索引未更新时可能找不到最近新增或修改的文件。

## 文件系统目录结构

- Linux 通常把文件组织在以 `/` 为根目录的单一目录树中。以下是常见的目录用途；不同发行版和系统的具体内容可能不同。

| 目录 | 用途 |
| --- | --- |
| `/` | 文件系统根目录 |
| `/home/user` | 用户文件、配置和项目 |
| `/etc` | 系统级配置文件 |
| `/usr` | 用户空间程序、库和文档 |
| `/usr/local` | 本地安装的软件，通常不由系统包管理器管理 |
| `/var` | 可变数据，例如日志（`/var/log`）、数据库和缓存 |
| `/tmp` | 临时文件；系统可能定期或在重启时清理 |
| `/opt` | 可选的第三方软件 |
| `/proc` | 提供内核与进程信息的虚拟文件系统 |
| `/dev` | 设备文件，例如磁盘和 GPU 设备节点 |

- 机器学习任务的数据常放在 `/data` 或 `/home/user/data`，模型常放在 `/home/user/models`，CUDA 常见安装路径是 `/usr/local/cuda`。GPU 设备节点可能显示为 `/dev/nvidia0`、`/dev/nvidia1` 等。

## 文件权限

- 文件和目录都由三类权限控制：

| 权限 | 对文件的含义 | 对目录的含义 |
| --- | --- | --- |
| **r**（读取） | 查看文件内容 | 列出目录内容 |
| **w**（写入） | 修改文件内容 | 在目录中创建或删除条目 |
| **x**（执行/搜索） | 运行可执行文件 | 进入目录或访问其中的条目 |

- 三类用户是：**所有者**（u）、**所属组**（g）和**其他用户**（o）。

```bash
ls -l script.py
# -rwxr-xr-- 1 henry ml_team 2048 Mar 28 script.py
#  ^^^         owner permissions: rwx (read, write, execute)
#     ^^^      group permissions: r-x (read, execute, no write)
#        ^^^   others permissions: r-- (read only)
```

```bash
chmod 755 script.py       # owner=rwx, group=rx, others=rx
chmod +x script.py        # add execute permission for everyone
chmod u+w,g-w file.txt    # add write for owner, remove write for group
chown henry:ml_team file  # change owner and group
```

- **注意**：文件开头带有 `#!/usr/bin/env python3` 的脚本若要通过 `./script.py` 直接运行，需要有执行权限，可用 `chmod +x` 添加。没有执行权限时，仍可通过 `python3 script.py` 运行。

## 进程管理

- **进程**是正在运行的程序（见第 13 章）。Shell 提供了管理进程的常用命令：

```bash
ps aux                    # list all running processes
ps aux | grep python      # find Python processes
top                       # real-time process monitor (CPU, memory)
htop                      # better version of top (install separately)
nvidia-smi                # GPU usage (essential for ML)
watch -n 1 nvidia-smi     # refresh nvidia-smi every second

kill PID                  # gracefully terminate process
kill -9 PID               # force kill (use when graceful fails)
killall python            # kill all Python processes

# Run in background
python train.py &                    # run in background
nohup python train.py > log.txt &    # run in background, survive logout
```

- 默认情况下，`kill PID` 发送可正常处理的终止信号（SIGTERM），让进程有机会清理资源；`kill -9 PID` 发送 SIGKILL，强制结束进程，无法由进程捕获或处理。只有在正常终止无效时才使用强制结束。

- `killall python` 会尝试结束所有名称匹配 `python` 的进程，使用前先确认影响范围。

- **nohup** 可让进程忽略终端关闭时发出的挂断信号。若希望 SSH 断开后训练继续运行，可以使用 `nohup` 配合后台运行；也可以使用终端复用器来保持会话。

- **screen** 和 **tmux** 可以创建可断开后继续存在的终端会话。在 tmux 会话中启动训练后，即使断开 SSH，之后仍可重新连接并恢复会话。

```bash
tmux new -s training          # create named session
# ... start training ...
# Ctrl+B, then D              # detach from session
tmux attach -t training       # reattach later (even after SSH reconnect)
tmux ls                       # list sessions
```

## 包管理器

- **系统软件包**（操作系统级软件）可通过发行版或系统对应的包管理器安装：

```bash
# Debian/Ubuntu
sudo apt update               # refresh package list
sudo apt install htop         # install a package
sudo apt upgrade              # upgrade all packages

# macOS
brew install wget             # install via Homebrew
```

- **Python 软件包**可从 PyPI 或项目依赖文件安装：

```bash
pip install torch             # install from PyPI
pip install -e .              # install current project in editable mode
pip install -r requirements.txt  # install from requirements file
pip freeze > requirements.txt    # export installed packages

# Conda (for complex dependencies like CUDA)
conda create -n myenv python=3.11
conda activate myenv
conda install pytorch torchvision cudatoolkit=12.1 -c pytorch
```

- **注意**：不要随意向系统 Python 安装项目依赖。系统工具可能依赖它；破坏系统 Python 会影响操作系统。建议使用虚拟环境，例如 `python -m venv env`、`conda create` 或 `uv venv`。

## 环境变量

- **环境变量**是可供程序读取的键值对，可在不修改代码的情况下配置程序行为。

```bash
export CUDA_VISIBLE_DEVICES=0,1    # use only GPUs 0 and 1
export PYTHONPATH=/home/user/src   # add to Python's import path
export WANDB_API_KEY=abc123        # API key for Weights & Biases

echo $PATH                         # see current PATH
export PATH=$PATH:/usr/local/cuda/bin  # add CUDA to PATH
```

- **`.bashrc` 和 `.zshrc`** 是常见的 shell 启动配置文件。把 `export` 命令写入相应文件后，新启动的 shell 可读取这些设置；实际加载时机取决于 shell 和会话类型。

- **`.env` 文件**可由 `python-dotenv` 等工具加载，shell 通常不会自动读取它。可将密钥等机密信息放入本地 `.env` 文件，并把该文件加入 `.gitignore`；切勿将真实密钥提交到 Git。上方的 `abc123` 只是示例占位值，不是可用密钥。

## SSH（安全外壳协议）

- **SSH** 通过加密连接访问远程机器，常用于连接云虚拟机、GPU 服务器和高性能计算集群。

```bash
ssh user@hostname              # connect to remote machine
ssh -i ~/.ssh/key.pem user@ip  # connect with specific key
ssh -L 8888:localhost:8888 user@server  # port forwarding (Jupyter on remote)
```

- **SSH 密钥**（公钥和私钥）可用于公钥认证，减少或避免每次连接时输入密码；前提是服务器已配置相应公钥认证。

```bash
ssh-keygen -t ed25519          # generate key pair
ssh-copy-id user@server        # copy public key to server
# now you can SSH without typing a password
```

- **SSH 配置文件**（`~/.ssh/config`）可以保存连接参数：

```
Host gpu-server
    HostName 10.0.1.42
    User henry
    IdentityFile ~/.ssh/gpu_key
    LocalForward 8888 localhost:8888
```

- 配置完成后，运行 `ssh gpu-server` 即可使用该主机配置连接。

- **`scp` 和 `rsync`** 可在机器之间传输文件。`rsync` 支持同步，只传输需要更新的内容，通常比重复复制整个目录更省流量。

```bash
scp model.pt user@server:/data/models/     # copy file to remote
scp -r user@server:/data/results/ ./       # copy directory from remote
rsync -avz --progress data/ user@server:/data/  # sync with progress (smarter than scp)
```

## 机器学习常用命令速查

```bash
# GPU monitoring
nvidia-smi                                   # GPU usage snapshot
watch -n 1 nvidia-smi                        # live monitoring
gpustat                                      # cleaner GPU overview (pip install gpustat)

# Training management
nohup python train.py > train.log 2>&1 &     # background training that survives logout
tail -f train.log                            # monitor training output
kill %1                                      # kill last background job

# Disk usage (datasets are huge)
df -h                                        # disk space on all mounts
du -sh /data/*                               # size of each item in /data
du -sh --max-depth=1 .                       # size of subdirectories

# Memory
free -h                                      # RAM usage
cat /proc/meminfo                            # detailed memory info

# Network
curl -O https://example.com/dataset.tar.gz   # download file
wget https://example.com/model.bin           # alternative downloader
curl -X POST http://localhost:8080/predict \
    -H "Content-Type: application/json" \
    -d '{"text": "hello"}'                   # test a model serving endpoint

# Archives
tar -czf archive.tar.gz directory/           # compress
tar -xzf archive.tar.gz                      # extract
zip -r archive.zip directory/                # zip
unzip archive.zip                            # unzip

# Quick data inspection
head -5 data.csv                             # first 5 lines of CSV
wc -l data.csv                               # count rows
cut -d',' -f1 data.csv | sort -u | wc -l    # count unique values in column 1
```
