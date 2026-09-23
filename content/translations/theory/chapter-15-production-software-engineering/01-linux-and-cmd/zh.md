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

*本篇将Linux 与命令行放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

*指令行是ML工程的主要接口:培训工作,服务器管理,数据管道,集群管理都通过终端实现. 此文件涵盖 shell, 文件系统,权限, 流程管理, 包管理器, 环境变量, SSH, 以及每个 ML 工程师每天使用的基本命令. *

- 图形用户界面方便浏览网页. 早上2点, **命令行**(或终端,或外壳)是缩放的工具:它工作在任意一台机器上,可以被脚本,可被堆放,在你的笔记本电脑上也是一样,一个云VM,和一个HPC集群.

- 如果你是只使用Jupyter笔记本和VS代码按钮的 ML 工程师, 你就会在桌上留下巨大的生产力。每个出品的ML系统都部署,监控并调试通过命令行.

## 贝壳


- 一个**shell**是一个读取你的命令并执行命令的程序. 这是你和操作系统之间的中介(第13章)。最常见的贝壳有:**bash**(大多数Linux系统的默认)和**zsh**(macOS的默认).

- 命令有格式:`command [options] [arguments]`

```bash
ls -la /home/user    # command=ls, options=-la, argument=/home/user
```

- 选项修改行为(通常是前缀)`-`用于短或`--`长形的).`ls -l`长格式列表,`ls --all`显示隐藏文件。许多选项可以合并:`ls -la`表示`-l`财务报告和已审计财务报表`-a`一起来

### 基本导航


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
rm file             # delete file (no recycle bin ， gone forever)
rm -rf dir          # delete directory recursively (DANGEROUS ， no confirmation)
mkdir -p a/b/c      # create nested directories
touch file.txt      # create empty file (or update timestamp)
cat file.txt        # print file contents
head -n 20 file     # first 20 lines
tail -f logfile     # follow a log file in real-time (invaluable for monitoring training)
```

- ** 意外**:`rm -rf`是计算中最危险的指令。没有什么是逆向的。按下输入前三重检查路径。永远不要跑`rm -rf /`或 为`rm -rf ~`.

### 管道与重定向


- 外壳的杀手特征为**相交**:小指令连接在一起,以做复杂的事情.

- ** Pipe** (中文(简体)).`|`:将一个命令的输出作为输入发送给下一个命令.

```bash
cat training.log | grep "loss" | tail -5    # last 5 lines containing "loss"
ps aux | grep python                        # find running Python processes
history | grep "docker"                     # find previous docker commands
```

- ** 重定向**:将输出发送给一个文件而不是屏幕.

```bash
python train.py > output.log 2>&1    # stdout AND stderr to file
python train.py >> output.log        # append (don't overwrite)
echo "data" > file.txt               # overwrite file
echo "more" >> file.txt              # append to file
```

- `2>&1`将 stderr (文件描述符 2) 重定向为 stdout (文件描述符 1)。没有它,错误信息仍然出现在屏幕上,而只有正常的输出会到文件.

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

- 这些精美地编曲:

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

## 文件系统层级


- Linux 将所有东西组织在一个树上`/`:

|Directory|Purpose|
|-----------|---------|
| `/` |Root of the entire file system|
|`/home/user`|Your personal files, configs, projects|
|`/etc`|System-wide configuration files|
|`/usr`|User programs, libraries, documentation|
|`/usr/local`|Locally installed software (not from package manager)|
|`/var`|Variable data: logs (`/var/log`), databases, caches|
|`/tmp`|Temporary files (cleared on reboot)|
|`/opt`|Optional third-party software|
|`/proc`|Virtual file system exposing 卷积核 and process info|
|`/dev`|Device files (disks, GPUs show up here)|

- 对于 ML : 您的培训数据通常在`/data`或 为`/home/user/data`中,模型输入`/home/user/models`,而CUDA则生活在`/usr/local/cuda`。。。GPU 设备显示为`/dev/nvidia0`, `/dev/nvidia1`等 类.

## 文件权限


- 每个文件和目录有三个用户类别的许可类型:

|Permission|File|Directory|
|------------|------|-----------|
|**r** (read)|View contents|List contents|
|**w** (write)|Modify contents|Create/delete files inside|
|**x** (execute)|Run as program|Enter (cd into) the directory|

- 三种用户类别:**所有者**(u),**组**(g),**其他人**(o)。

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

- ** Pitfall**:一个带有 Python 脚本`#!/usr/bin/env python3`在最需要时执行权限(E)`chmod +x`以`./script.py`。。。没有它,你必须用`python3 script.py`.

## 进程管理


- **进程**是一个运行中的程序(第13章)。外壳给你管理它们的工具:

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

- **`nohup`** 对ML培训至关重要:没有它,关闭你的SSH连接会杀死培训工作.`nohup`将过程从终端解开。

- **`screen`** 和 **。`tmux`** 是生成持续会话的终端多路分流器。您可以在 tmux 会话中开始培训工作, 断开与SSH的连接, 稍后重新连接, 而会话(和训练) 仍在运行。

```bash
tmux new -s training          # create named session
# ... start training ...
# Ctrl+B, then D              # detach from session
tmux attach -t training       # reattach later (even after SSH reconnect)
tmux ls                       # list sessions
```

## 包管理器


- ** 系统包**(OS级软件):

```bash
# Debian/Ubuntu
sudo apt update               # refresh package list
sudo apt install htop         # install a package
sudo apt upgrade              # upgrade all packages

# macOS
brew install wget             # install via Homebrew
```

- ** Python 包件**:

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

- ** 意外**:从未`pip install`进入系统Python。总是使用虚拟环境(E)`python -m venv env`, `conda create`,或`uv venv`) (中文(简体)). System Python由OS工具共享;破解它可以打破你的系统.

## 环境变量


- ** 环境变量** 是所有程序都可以使用的钥匙值对。它们不改变代码就配置行为.

```bash
export CUDA_VISIBLE_DEVICES=0,1    # use only GPUs 0 and 1
export PYTHONPATH=/home/user/src   # add to Python's import path
export WANDB_API_KEY=abc123        # API key for Weights & Biases

echo $PATH                         # see current PATH
export PATH=$PATH:/usr/local/cuda/bin  # add CUDA to PATH
```

- **`.bashrc`** (或`.zshrc`:每次打开外壳时,命令运行. 把你的东西放下`export`他们在这里发言,所以他们坚持下去。

- **`.env`文件 **: 由工具加载的特定项目变量`python-dotenv`。。。保存机密(API 密钥、数据库密码)。`.env`添加`.env`改为`.gitignore`。。。永远不要做出秘密

## SSH（安全 Shell）


- **SSH**通过加密信道将您连接到远程机器. 这就是您访问云VM,GPU服务器和HPC集群的方式.

```bash
ssh user@hostname              # connect to remote machine
ssh -i ~/.ssh/key.pem user@ip  # connect with specific key
ssh -L 8888:localhost:8888 user@server  # port forwarding (Jupyter on remote)
```

- ** SSH 密钥**(公用/私用密钥对)替换密码:

```bash
ssh-keygen -t ed25519          # generate key pair
ssh-copy-id user@server        # copy public key to server
# now you can SSH without typing a password
```

- ** SSH 配置** (`~/.ssh/config`)保存连接细节:

```
Host gpu-server
    HostName 10.0.1.42
    User henry
    IdentityFile ~/.ssh/gpu_key
    LocalForward 8888 localhost:8888
```

- 现在`ssh gpu-server`自动与所有这些设置连接。

- **`scp`** 和 **。`rsync`** 机器之间的文件传输 :

```bash
scp model.pt user@server:/data/models/     # copy file to remote
scp -r user@server:/data/results/ ./       # copy directory from remote
rsync -avz --progress data/ user@server:/data/  # sync with progress (smarter than scp)
```

## ML 常用命令速查


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
