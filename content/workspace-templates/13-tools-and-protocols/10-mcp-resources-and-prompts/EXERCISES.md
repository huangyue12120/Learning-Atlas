# MCP 资源与提示词：无状态服务器中的可寻址上下文：练习指南

- 课程路径：`phases/13-tools-and-protocols/10-mcp-resources-and-prompts`
- 可运行 Python 文件：`main.py`

## 练习目标

把 `main.py` 作为无状态 MCP 服务器模型来读：它用 `server/discover` 公布版本与能力，返回确定性排序的资源与提示词列表，为列表和读取结果附带缓存提示，对无效 URI 返回 `-32602`，并在订阅流上让确认先于事件、让事件与关闭都携带正确的 subscription ID。随后按上游练习扩展资源模板、分页、缓存范围、订阅过滤与授权主体，证明列表不依赖连接历史、订阅事件本身不会授予底层资源访问权。

## 建议步骤

1. **跑通演示并按顺序读 transcript：** 运行 `python3 main.py`，依次确认 `server/discover` 公布当前版本和两项能力；两个列表结果都已排序并使用 `resultType: "complete"`；列表与读取结果带有有意设置的缓存提示；把读取 URI 改成 `notes://missing` 时返回 `-32602`；订阅确认先于资源事件；事件与平稳关闭都携带 subscription ID `5`。
2. **资源模板（练习 1）：** 增加 `notes://projects/{project}/notes/{id}` 资源模板，对 `project` 和 `id` 两个变量都做校验，并补一个缺变量的负例确认被拒绝。
3. **分页（练习 2）：** 为 `resources/list` 增加分页，用不透明游标表示下一页，同时保持确定性排序；验证重复调用返回同一逻辑顺序。
4. **缓存范围（练习 3）：** 把一个资源改为 `cacheScope: "private"` 且 `ttlMs: 0`，再加入宿主级 no-store 策略，并在注释里写明为何“私有缓存范围”和“宿主不缓存”两层控制都必要（防止跨用户或跨连接复用敏感读取结果）。
5. **订阅过滤与多订阅（练习 4、5）：** 增加提示词列表变更订阅，证明过滤器不含 `promptsListChanged` 时不发送该事件；再创建两个同时存在的订阅，证明每个事件携带正确的请求 ID。
6. **授权主体（练习 6）：** 在读取处理器中加入授权主体，构造两个主体，证明一个主体的缓存条目不能被另一个主体复用。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

`python3 main.py` 打印 JSON transcript；`python3 -m unittest discover -s tests` 报告 14 项测试通过（上游要求“至少十二个”）。上文命令已在本仓库对应 `code/` 目录实际运行确认：主程序正常退出，测试全部通过、无失败或跳过。

每完成一个扩展，重新运行上述两条命令；新增行为应有对应的新测试与之匹配，并保持原有测试通过。
