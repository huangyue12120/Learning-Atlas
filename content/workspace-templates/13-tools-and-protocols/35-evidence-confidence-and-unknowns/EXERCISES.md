# 二进制分析中的证据、置信度与未知项：练习指南

- 课程路径：`phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns`
- 可运行 Python 文件：`main.py`；评分实验 `lab.py`，答案写入 `lab_answers.json`

## 练习目标

构建一个证据账本：把对 `ledger-x86_64-O1.o` 的每个事实记成带内容哈希、置信度（观测／推导／推断）、权威等级和限制的记录；对 `percent_change` 与 `grade` 作出预测，对照你自己编译运行的 harness 核查，并按晋升规则判定每项声明是 `pass`、`fail`、`unknown` 还是 `unsupported`，同时把残留未知项维护为带哈希链的修订。

## 建议步骤

1. **先看整体：** 运行 `python3 main.py`，核对摘要里 `records` 为 81、`by_confidence` 为 observed 25 / derived 38 / inferred 18、`grade_table` 为 `[1, 2, 3, 4, 4]`、`complete` 为 `false`、`unknowns` 为 resolved 17 / investigating 1。
2. **重算一个 rea id（实验 A）：** 在 `code` 目录打开 `python3 -q`，用 `load_evidence_file(FIXTURES / "rea-evidence-grade.json")` 读入记录，确认 `record["evidence_id"] == compute_evidence_id(record)` 为真；改写 `local_path` 后仍为真，而 `record["limitations"].pop()` 之后为假——验证路径不在哈希里、限制在哈希里。
3. **拒绝一次晋升（实验 B）：** 用 `build_ledger(live_runs=False)` 建账本，取出 `grade(55)` 声明，先用推导型 `derive_switch_model` 的 id 调用 `promote_claim`，确认抛出 `ClaimError`；再用 `run_records_for(ledger, "grade", [55])` 的运行 id 调用，确认 `status` 为 `pass` 且 `limitations` 带主机构建那句话。
4. **拒绝一个过期快照（实验 C）：** 用 `rea_snapshot_binding(snapshot)` 取出 target 与 binding，确认正常导入返回 2；再把 `jump_table_evidence` 改成 `typed-case-default-blocks-v2` 构造新 profile 导入，确认抛出带 `profile_mismatch` 的 `CacheError`。
5. **破坏哈希链（实验 D）：** 取出 `investigating` 的未知项，确认 `verify_unknown_chain` 返回 2；把修订 1 的 `severity` 改成 `critical` 后再次调用，确认抛出 `EvidenceIntegrityError`。
6. **做实践实验：** 扩展 `run_grid()` 让范围声明九个缺失输入都运行、确认未知项在修订 3 变为 `resolved`；把 `llvm-objdump -d` 作为第二个提供方记录 `grade` 列表为 `observed`；写一条链接两份列表的 `derived` 记录；为 `grade_label(105)` 开启 severity 为 `high` 的未知项并用运行解决；最后用 `export_bundle()` 导出再导入新账本并验证每条链。
7. **完成评分实验：** 用你构建的代码求出 `t1`–`t5`（grade 记录的证据 id、限制数量、relationship_coverage 状态、置信度与权威等级、subject 的 SHA-256），写入 `lab_answers.json` 后运行 `python3 lab.py`，直到五项全部 `PASS`。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

填写 `lab_answers.json` 后运行评分实验；全部 PASS 时退出码为 0：

```bash
python3 lab.py
```

`fixtures/` 里的 `ledger-x86_64-O1.o`、两条 rea 证据记录、`rea-snapshot.json`、`run-evidence.json` 以及 `harness.c` 都由上游预先提交，不需要安装 clang 即可运行演示：没有 C 编译器时 `observe_runs()` 会改为导入已记录的 17 条运行记录，`runs` 字段会说明这一点。本工作区实测演示程序与按上述命令发现的全部 32 个测试（`test_main.py` 的 28 个账本测试，加上 `test_lab.py` 的 4 个评分实验测试）均通过（无 skip、无失败）；若你的机器装有编译器，`runs` 会显示实时编译器版本行，实时运行也会一并核对。
