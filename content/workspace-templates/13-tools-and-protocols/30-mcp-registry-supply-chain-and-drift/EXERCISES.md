# MCP Registry 供应链：准入、漂移与回滚：练习指南

- 课程路径：`phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift`
- 可运行 Python 文件：`main.py`

## 练习目标

把 `main.py` 的准入控制器读懂并能验证：它用精确命名空间边界拒绝相似前缀，只让官方带命名空间的 Registry 状态使版本可准入，拒绝未验证或不匹配的包与远端证据，规范化工具顺序而不隐藏描述符变化，在描述符漂移时隔离、停用并阻止回滚到该 pin，并在状态变化时隔离 active pin、让回滚只能选择有证据的已准入版本。随后按上游练习为控制器增加双人批准门禁。

## 建议步骤

1. **跑通演示：** 运行 `python3 main.py`，确认它依次用匹配的命名空间、包来源、协议、能力和工具准入 `1.0.0`，准入 `1.1.0` 并置为 active，运行时观察到意外的 delete 工具，观察 `1.1.0` 状态变为 `deprecated`，并把路由恢复到仍已准入的 `1.0.0` pin。
2. **实验 A（命名空间冲突）：** 在 Python shell 中 `from main import namespace_matches`，确认 `namespace_matches("com.example/inventory", "com.example")` 为 `True`、`namespace_matches("com.exampleevil/inventory", "com.example")` 为 `False`；临时把精确比较改成 `startswith`，观察第二个名称如何越过边界，再恢复精确比较。
3. **实验 B（描述符漂移）：** 用 `RegistryAdmissionController` 准入 `1.0.0` 后，调用 `check_live(...)` 传入新增工具的 live 视图，检查原因和路由状态——包与 Registry 记录未变，但运行时工具表面变化，控制器应隔离并停用该 pin。
4. **实验 C（状态与回滚）：** 准入 `1.1.0` 后 `observe_registry_status(..., "deprecated")`，分别回滚到被隔离的 `1.1.0`（应拒绝）和较早 active 的 `1.0.0`（应接受），并用 `c.ledger.verify()` 确认账本仍有效。
5. **双人批准门禁（实践实验）：** 把批准保存为带签名的证据引用而非 pin 中可变名称；对含 `destructiveHint: true` 工具的工具集要求两个不同审查者身份；拒绝重复身份；批准不完整时在账本中保留原始准入尝试；不记录签名、凭据或完整私有工具参数。
6. **补测试：** 为零个、一个、重复和两个不同批准分别增加测试，证明破坏性工具在两个身份都批准精确的记录、包和工具集摘要前不能变为 active。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

`python3 main.py` 打印准入、漂移隔离与回滚的 JSON 演示；`python3 -m unittest discover -s tests` 报告 25 项测试通过。上文命令已在本仓库对应 `code/` 目录实际运行确认：主程序正常退出，测试全部通过、无失败或跳过。

每新增一条批准门禁要求都应配一条测试；改动后重新运行两条命令，保持所有测试通过。
