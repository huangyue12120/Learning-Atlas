# MCP 工具契约与内容：练习指南

- 课程路径：`phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content`
- 可运行 Python 文件：`main.py`

## 练习目标

把 `main.py` 作为契约边界两侧的参考实现：服务器做每请求元数据校验、确定性 `tools/list` 分页、数组结构化输出、内容块类型，以及在 header 与 body 不匹配时返回 HTTP `400` 和 JSON-RPC `-32020` 的 parity gate；客户端做描述符准入、完整 schema 树中的 `x-mcp-header` 位置与敏感字段校验、精确的 base64 UTF-8 值编码、跟随空字符串游标的分页，以及只含名称不含值的 header 审计。随后按上游练习新增 `search_evidence` 工具，覆盖输入/输出 schema、授权可见性、header 值编码和 HTTP parity。

## 建议步骤

1. **跑通演示：** 运行 `python3 main.py`，确认输出包含准入工具、被拒绝的描述符、两次分页请求、数组结构化内容、各内容块类型、镜像 header 名、是否需要编码、HTTP parity 状态，以及按调用方过滤后的 completion 值。
2. **先做交互实验定位每道门：** 把 `tag_catalog.outputSchema.type` 从 `array` 改成 `object`，运行 demo 看客户端拒绝数组，再恢复；让最后一页返回 `nextCursor: None` 而不是省略字段，比较游标 trace；给字符串属性加 `x-mcp-header: "Authorization"`，确认描述符在调用前被拒绝；用含 Unicode、换行、首尾空白和 `=?base64?SGVsbG8=?=` 的 `region` 值，解码输出 header 证明原值精确保留；删除已识别 header 或改变解码值，确认返回 `400` 与 `-32020`。
3. **新增 `search_evidence` 的输入与输出 schema（实践实验 1、2）：** 输入接受 `query`、`limit` 和安全的 `region` 路由字段；输出是由 `uri`、`title`、`score` 组成的对象数组。
4. **结果内容与授权可见性（实践实验 3、6）：** 为每项结果附带兼容文本和 resource link；证明没有某个 URI 访问权限的调用方，不能通过 completion 或工具输出看到它。
5. **参数与范围校验（实践实验 4、5）：** 参数拒绝未知属性；`limit` 由应用校验限制范围。
6. **补齐边界测试（实践实验 7、8、9）：** 测试不符合 schema 的 score、无效 header 注解和两页列表；header 值测试覆盖可见 ASCII、Unicode、控制字符、空白、看起来像 sentinel 的文本，以及 JavaScript 安全整数的两个边界；确认 HTTP fixture 大小写不敏感地匹配 header 名，但对缺失或不匹配的已识别值返回 `400` 和 `-32020`。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

`python3 main.py` 打印契约边界的 JSON 演示；`python3 -m unittest discover -s tests` 报告 34 项测试通过。上文命令已在本仓库对应 `code/` 目录实际运行确认：主程序正常退出，测试全部通过、无失败或跳过。

为 `search_evidence` 新增的每条要求都应配一条测试；改动后重新运行两条命令，保持所有测试通过。
