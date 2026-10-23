# MCP 一致性工程：版本、证据与运维：练习指南

- 课程路径：`phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations`
- 可运行 Python 文件：`main.py`

## 练习目标

把 `main.py` 的一致性 harness 读懂并能验证：它让现代请求必须带精确的带命名空间元数据键，大小写不敏感地匹配 HTTP header 名并精确解码 `Mcp-Name`，在 header 与 body 不匹配时返回现代不匹配码，校验响应版本/ID/结果或错误互斥/错误形状/HTTP 映射，强制方法专属的 tool-list、task 与 completion 要求，要求每个观察到的 `HeaderMismatch` 对应真实的 HTTP 400 与 JSON-RPC `-32020`，区分 SDK 记账字段移除与语义字段丢失，检测代理吞错并递归脱敏凭据，并让提升和回滚都要求经过认证、已 pin、active、健康的回滚目标。随后按上游练习为 harness 增加逐请求 SSE transcript。

## 建议步骤

1. **跑通演示：** 运行 `python3 main.py`，确认它运行若干正向与负向 transcript、比较原始结果与 SDK 视图、检查吞掉 origin 错误的代理、评估健康情况、验证回滚证据并选出目标。
2. **实验 A（时代边界）：** 在 Python shell 中 `from main import *`，确认 `validate_result({"tools": []}, "legacy")` 推断 `complete`、同样输入在 `"modern"` 下抛出 `ProtocolViolation`；再用 `select_era(...)` 验证超时在 `fallback` 下 fail closed，只有配置允许且观察到有效旧版初始化结果时才选旧版，已识别现代错误（如 `-32021`）证明现代分支。
3. **实验 B（新增字段与 discriminator）：** 确认带未知 `futureHint` 的现代结果保留该字段，而 `resultType: "future_mode"` 因 discriminator 未知被拒绝。
4. **实验 C（SDK 转换）：** 用 `compare_sdk_view(...)` 决定组件是忽略还是转发 `futureHint`，把选择写入发布策略，不要静默删除差分。
5. **实验 D（修复代理）：** 修改 demo exchange 让 egress 保留 origin 状态和 body，再次运行 `python3 main.py`，确认代理问题消失但 SDK 差分仍阻止提升；把 `futureHint` 加入 SDK 视图后，当每个证据来源都通过时观察 action 变为 `promote`。
6. **逐请求 SSE transcript（实践实验）：** 捕获响应状态、content type、有序 SSE 事件和流终止；证明每个 JSON-RPC 事件都有符合时代的结果或错误；为在转发前缓存完整流的代理、以及 JSON-RPC id 与请求不同的 SSE 事件分别增加负向 case；写入证据前脱敏事件数据；在健康窗口加入流时长、首事件延迟和事件数量；流失败时让发布门禁只选择有证据的回滚目标。成功标准是：同一 case 能直接运行也能经代理运行，报告能指出行为发生变化的精确边界。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

`python3 main.py` 打印一致性矩阵与发布决策的演示；`python3 -m unittest discover -s tests` 报告 35 项测试通过。上文命令已在本仓库对应 `code/` 目录实际运行确认：主程序正常退出，测试全部通过、无失败或跳过。

每新增一条 SSE transcript 要求都应配一条测试；改动后重新运行两条命令，保持所有测试通过。
