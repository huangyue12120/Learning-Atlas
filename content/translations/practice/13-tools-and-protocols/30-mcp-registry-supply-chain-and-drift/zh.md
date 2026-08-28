---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 734698d661d450db141c54509144cf914443f3b335e4b18a14d175bad520d60b
status: reviewed
---

# MCP Registry 供应链：准入、漂移与回滚

> Registry 条目告诉你发布者声明了什么；生产准入则证明你获取了什么、观察到什么、批准了什么，以及能够安全恢复什么。

**类型：** 构建
**语言：** Python
**前置课程：** Phase 13 · 第 17 课（网关与 Registry）、第 18 课（生产认证）
**预计时间：** 约 90 分钟

## 学习目标

- 区分 Registry 发布、包来源、运行时发现和本地批准。
- 不信任记录自身携带的名称，验证 MCP 服务器命名空间。
- 固定不可变的发布、执行源、来源证明和实时 descriptor 证据。
- 检测准入后的 Registry 状态变化和运行时漂移。
- 在不改写历史的情况下，把路由回滚到此前准入的版本。
- 维护能够解释每次决策、防篡改的准入账本。

## 问题所在

你在 Registry 中找到 `com.example/inventory`。描述看起来没问题，包也存在，服务器能响应 `server/discover`。

这不是一个事实，而是来自不同权威来源的一串事实：

1. 已对某个命名空间完成认证的发布者提交了一条记录。
2. 包 Registry 提供了一个具有特定身份和摘要的构件。
3. 运行中的 endpoint 报告了协议版本、能力、工具以及诊断用服务器信息。
4. 你的组织决定允许这一组精确组合。

把这些事实压缩成“它在 Registry 中，所以可信”，会造成供应链盲区。有效发布仍可能被弃用；如果不固定摘要，包 tag 可能指向意外构件；服务器可能在审查后增加破坏性工具；回滚也可能悄悄选择一个从未准入的版本。

解决办法是在每个边界都保留证据的准入控制器。

## Registry 是索引，不是你的批准系统

官方 MCP Registry 存储服务器元数据。其 `server.json` 记录会命名服务器版本，并声明一个或多个包或远程 endpoint。发布规则还包括命名空间认证、包所有权检查、受限 Registry 规则和受限的发布者元数据位置。

这些控制回答的是发布问题。生产策略仍需回答部署问题：

| 边界 | 问题 | 证据所有者 |
|---|---|---|
| 命名空间 | 发布者是否有权使用这个名称？ | Registry 认证和你验证过的命名空间输入 |
| 记录 | 发布者为该版本声明了什么？ | 不可变的 `server.json` 摘要 |
| 执行源 | 哪个包或远程 endpoint 会执行？ | 声明的源字段、所有权验证结果、传输方式和可信摘要 |
| 运行时 | endpoint 当前暴露了什么？ | `server/discover` 和工具 descriptor |
| 准入 | 你的策略是否批准了这组精确内容？ | 本地 pin 和账本条目 |
| 运维 | 它是否仍然安全，以及什么可以替代它？ | 漂移检查、状态同步、健康检查和回滚路由 |

Registry schema 版本与 MCP 协议版本相互独立。一条记录可以使用已发布的 `2025-12-11` server schema，而实时服务器支持 MCP `2026-07-28`。不要从一个版本推断另一个版本。

```figure
mcp-registry-admission
```

## 一次准入决策中的七项控制

### 1. 命名空间验证

官方 Registry 名称使用经过认证的命名空间。已验证的域名可以映射为反向域名前缀。例如，控制 `example.com` 可以建立 `com.example/*`。

不要接受简单的字符串前缀检查：

```python
server_name.startswith("com.example")
```

这也会接受 `com.exampleevil/tool`。应在 `/` 处分割名称，要求 slug 非空，并精确比较命名空间片段。更重要的是，应把认证结果中的已验证命名空间传入准入流程，不要从不受信任的记录中推导信任。

GitHub 支持的命名空间与域名支持的命名空间使用不同的认证路径。把两条路径都归一化为同一个准入输入：精确的已验证命名空间字符串。

### 2. 来源证明拼接

对于包记录，声明与获取到的构件必须通过显式字段拼接：

- 包 Registry 类型；
- 包标识符；
- 包版本；
- 已验证的所有权结果；
- 下载构件的摘要。

还要验证声明的包传输方式。只有远程 endpoint 的记录是合法的，不应因为没有包而拒绝。对于远程源，应将声明的 URL 和传输类型与独立验证的 endpoint 所有权以及可信连接或部署证据的摘要拼接起来。

本课代码同时支持两种源类型，并将所选源与 Registry 源、服务器名称、Registry 版本、记录摘要和证据摘要一起哈希。得到的来源证明摘要是指向完整证据集的紧凑指针，但不能替代保留证据本身。

绝不要只接受待验证构件自己提供的摘要。应在可信获取边界计算摘要，或从包服务接收摘要并验证其结果。

### 3. 固定决策，而不只是固定版本

Registry 版本是唯一的发布标识符。已发布元数据不可变；记录变化必须产生新版本。推荐使用语义化版本，但 Registry 不强制要求，也不接受版本范围。

因此，`^1.4` 不是准入 pin，“latest”也不是。一个有用的 pin 包含：

```json
{
  "server": "com.example/inventory",
  "version": "1.0.0",
  "recordDigest": "...",
  "source": {"kind": "package", "registryType": "pypi"},
  "sourceDigest": "...",
  "toolsetDigest": "...",
  "provenanceDigest": "...",
  "registryStatus": "active"
}
```

固定多个层次，才能识别是哪一个边界发生变化。同一个 Registry 版本的记录摘要变化，是 Registry 完整性失败；同一个包坐标或远程部署下的源摘要变化，是执行源完整性失败；工具集摘要变化，则是运行时漂移。

### 4. 实时漂移检测

准入应观察真正接收流量的服务器。调用 `server/discover`，通过可信路径列出或获取暴露的工具 descriptor，并验证：

- `supportedVersions` 包含 `2026-07-28`；
- 存在本地要求的全部能力；
- 每个工具 descriptor 都有必需的身份和 schema 表面；
- 后续检查时，归一化 descriptor 摘要与准入 pin 相同。

可选结果 `_meta["io.modelcontextprotocol/serverInfo"]` 是服务器自行报告的展示、日志和调试上下文。应将它记录为诊断证据，但绝不能用它建立命名空间、包所有权、endpoint 所有权、准入或其他安全决策。`_meta` 外部的直接 `serverInfo` 别名不是契约字段，不应提升为诊断证据。

只归一化顺序没有语义的字段。示例按稳定名称排序工具列表，因此无害的列表顺序变化不会导致漂移；但它不会丢弃 descriptor 字段。新增工具、改变 schema、改变描述或增加注解，都会改变 pin。

示例把格式错误的 descriptor 和任何 descriptor 摘要变化都视为漂移：隔离该 pin、移除活动路由，并禁止该版本作为回滚目标。生产策略可以通过新的审查允许编辑性变化，因为描述会影响模型选择工具。“纯展示”的元数据也可能改变 agent 行为。

### 5. Registry 状态是实时状态

Registry API 在每条服务器记录旁的 response-level `_meta` 对象中附带状态。Registry 管理的字段位于 `_meta["io.modelcontextprotocol.registry/official"]` 下。应把 response `_meta` 对象传给准入函数，并读取 `_meta["io.modelcontextprotocol.registry/official"].status`。直接读取 `_meta.status` 不符合官方线上形状，也不要把 response metadata 与发布记录自身的 `_meta` 混淆。状态可以是：

- `active`：默认返回，并有资格进入本地准入；
- `deprecated`：仍可带警告发现，但不再是安全的自动选择；
- `deleted`：默认隐藏，但历史记录仍可通过 deleted 或增量视图取得。

准入后仍要同步状态。如果 active 版本变为 deprecated 或 deleted，就隔离它的 pin，停止把新工作路由给它，并保留证据。从默认列表中删除，不等于可以删除审计轨迹。

发布者提供的自定义元数据只能位于发布记录的 `_meta.io.modelcontextprotocol.registry/publisher-provided` 下。Registry 管理的 response metadata 是另一回事。不要让发布者自行设置官方状态。

### 6. 回滚意味着恢复路由

回滚不会编辑不可变发布，而是选择一个此前准入、当前仍符合条件的 pin，改变活动路由。

安全目标必须：

1. 具有已完成的准入记录；
2. 根据你的策略仍处于 active Registry 状态；
3. 未被运行时或安全证据隔离；
4. 仍解析到固定的包和实时 descriptor 集合；
5. 通过当前健康检查。

示例关注前面三个条件。真正的 reconciler 还应在激活前重新获取包并再次检查实时 endpoint。

### 7. 追加准入账本

准入数据库告诉你当前什么处于活动状态；账本解释为什么。

每条示例记录包含序号、时间、事件、服务器、版本、结果、原因、证据、上一条记录的摘要以及自身摘要。修改较早的结果会破坏该条记录和其后所有链接的验证。

这能防篡改，但不是魔法般的防攻击。应把账本头定期锚定到独立信任域，例如签名发布元数据或只写存储；限制谁可以追加；不要把授权 token、包凭据、工具参数和私有 endpoint 数据写入证据。

## 构建它

可运行的控制器位于 `code/main.py`，只使用 Python 标准库。

从有限演示开始：

```bash
cd phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift
python3 code/main.py
```

演示执行五项操作：

1. 使用匹配的命名空间、包来源、协议、能力和工具准入 `1.0.0`。
2. 准入 `1.1.0` 并使其处于 active。
3. 在运行时观察到意外的 delete 工具。
4. 观察 `1.1.0` 的 Registry 状态变为 `deprecated`。
5. 将路由恢复到仍已准入的 `1.0.0` pin。

预期形状：

```json
{
  "admitted": [true, true],
  "driftAllowed": false,
  "rollbackAllowed": true,
  "activeVersion": "1.0.0",
  "ledgerValid": true
}
```

按以下顺序阅读实现：

1. `namespace_for_domain()` 与 `namespace_matches()` 建立精确的命名权威。
2. `digest()` 与 `normalized_tools()` 产生确定性证据。
3. `RegistryAdmissionController.admit()` 拼接发布、来源证明、运行时和策略。
4. `check_live()` 将新的观察与 pin 比较。
5. `observe_registry_status()` 隔离 Registry 状态变化的版本。
6. `rollback()` 只激活此前已准入且符合条件的目标。
7. `AdmissionLedger.verify()` 检测记录历史的变化。

## 使用它

把控制器放在发现与路由之间：

```text
Registry sync -> artifact verifier -> live discovery -> admission controller -> route table
                                               |                 |
                                               v                 v
                                          evidence store    admission ledger
```

为这些工作使用不同身份。Registry sync worker 需要元数据读取权限；构件验证器需要包获取权限；路由 reconciler 需要激活已批准 pin 的权限。它们都不需要所有凭据。

显式表示发布状态。“Approved”表示证据通过策略；“Active”表示当前路由选择它；“Quarantined”表示不能接收新工作；“Superseded”表示另一个已准入版本已激活。不要用一个 Boolean 编码这四种含义。

在通过 `tools/list` 暴露服务器前先执行准入，否则客户端可能在发布和策略评估之间的间隙发现工具。

## 交互实验

你会逐个观察一个边界失败。

### 实验 A：命名空间冲突

在 code 目录打开 Python shell：

```bash
cd phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift/code
python3 -q
```

然后运行：

```python
from main import namespace_matches
namespace_matches("com.example/inventory", "com.example")
namespace_matches("com.exampleevil/inventory", "com.example")
```

第一个结果为 `True`，第二个为 `False`。在本地把精确比较改为 `startswith`，观察第二个名称为何会越过边界。继续前恢复精确比较。

### 实验 B：descriptor 漂移

```python
from main import *
times = iter(f"2026-08-21T12:00:{n:02d}+00:00" for n in range(10))
c = RegistryAdmissionController(clock=lambda: next(times))
meta = {OFFICIAL_META_KEY: {"status": "active"}}
c.admit(sample_record("1.0.0"), meta, "com.example", evidence_for("1.0.0"), sample_live("1.0.0"))
c.check_live("com.example/inventory", "1.0.0", sample_live("1.0.0", True))
```

检查原因和路由状态。包与 Registry 记录没有变化，但运行时工具表面变化了，所以控制器隔离并停用了该 pin。这正是供应链控制必须在安装后持续运行的原因。

### 实验 C：状态与回滚

准入 `1.1.0`，将它标记为 deprecated，然后尝试两个回滚目标：

```python
c.admit(sample_record("1.1.0"), meta, "com.example", evidence_for("1.1.0"), sample_live("1.1.0"))
c.observe_registry_status("com.example/inventory", "1.1.0", "deprecated")
c.rollback("com.example/inventory", "1.1.0", "unsafe retry")
c.rollback("com.example/inventory", "1.0.0", "restore known release")
c.ledger.verify()
```

被隔离的目标会被拒绝；较早的 active pin 会被接受；账本仍然有效。

## 实践实验

为控制器增加双人批准门禁。

要求：

- 将批准保存为带签名的证据引用，而不是 pin 中可变的名称；
- 包含 `destructiveHint: true` 工具的工具集必须有两个不同的审查者身份；
- 拒绝重复的审查者身份；
- 批准不完整时，仍在账本中保留原始准入尝试；
- 为零个、一个、重复和两个不同批准分别增加测试；
- 不记录签名、凭据或完整的私有工具参数。

成功标准是：在两个身份都批准精确的记录、包和工具集摘要前，破坏性工具不能变为 active。

## 随课交付物

本课提供 `outputs/skill-mcp-registry-admission.md`。在审查新的 Registry 版本或调查漂移时，可把它作为扁平、可复用的运行手册。它定义输入、拒绝规则、证据包、状态协调和回滚证明，不依赖示例类名。

## 验证它

运行演示和确定性测试：

```bash
cd phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应证明：

- 精确命名空间边界会拒绝相似前缀；
- 只有官方命名空间下的 Registry 状态才能使版本符合条件；
- 未验证或不匹配的包和远程证据会被拒绝；
- 发布者元数据不能冒充 Registry 管理的元数据；
- 工具顺序会被归一化，但 descriptor 变化不会被隐藏；
- 格式错误的包和工具结构会安全拒绝；
- `serverInfo` 保持诊断用途，绝不提供准入权威；
- descriptor 漂移会隔离、停用路由，并阻止回滚到该 pin；
- 状态变化会隔离活动 pin；
- 回滚不能选择被隔离或未知版本；
- 能检测账本篡改。

## 生产失败模式

| 失败 | 发生原因 | 必须响应 |
|---|---|---|
| 名称看起来有效，但命名空间从未认证 | 策略信任了记录文本 | 等待可信命名空间验证器提供精确前缀后再拒绝或批准 |
| 同一个包坐标返回新字节 | 上游可变或分发被攻破 | 停止激活，保留两个摘要，调查获取边界 |
| “Latest”未经过审查就变化 | 浮动选择逃离 pin | 只解析精确的已准入版本和摘要 |
| 批准后出现新工具 | 运行时漂移或部署对象不同 | 隔离路由并捕获新的 descriptor 观察 |
| Deprecated 版本仍处于 active | 缺少或延迟状态同步 | 按计划同步状态，并在激活前再次同步 |
| Deleted 记录从默认同步中消失 | 客户端只请求 active 记录 | 使用支持 deleted 的增量协调，并保留本地历史 |
| 回滚目标从未准入 | 路由控制与批准状态脱节 | 拒绝回滚，并为目标重新执行准入 |
| 攻击者重写所有记录后本地账本仍能验证 | 哈希链没有外部锚点 | 把签名账本头发布到独立信任域 |
| 证据包含 bearer token 或工具参数 | 日志复制了完整请求 | 采集时脱敏，只保存最低限度证明 |

## 运维规则

发布回答“这个身份能否发布这个名称？”；准入回答“我们是否会执行这个精确构件并暴露这个精确行为？”保持两个决策分离，固定每次拼接，并让回滚选择证据而不是记忆。

## 延伸阅读

- [Official Registry server.json requirements](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md)
- [Official Registry OpenAPI contract](https://registry.modelcontextprotocol.io/openapi.yaml)
- [MCP 2026-07-28 server discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
