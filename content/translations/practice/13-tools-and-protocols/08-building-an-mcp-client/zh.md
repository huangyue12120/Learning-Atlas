---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/08-building-an-mcp-client/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: dc2ca4a30c21094e72f5e225724c5a6680119d65aa974e34d411be4ce458fc6d
status: reviewed
---

# 构建 MCP 客户端：发现、路由与双时代回退

> 现代 MCP 客户端会在每个请求上重复自身契约。最难的兼容性决策是判断旧服务器确实是旧版，还是现代服务器正在报告一个可以修正的错误。

**类型：** 构建
**语言：** Python
**前置课程：** Phase 13，第 07 课
**预计时间：** 约 85 分钟

## 学习目标

- 为每个 MCP `2026-07-28` 请求构造当前元数据。
- 用 `server/discover` 探测 stdio 服务器并选择双方支持的版本。
- 只对明确列入 allowlist 的 peer 授权一次有界旧版探测。
- 只有验证过受支持 revision 的正向 `initialize` 结果后，才接受旧版时代。
- 合并确定性工具列表，同时不静默覆盖冲突。
- 把调用路由到拥有该工具的 peer，而不凭空创建协议会话。

## 问题

一个 agent host 通常要与多个 MCP 服务器通信。它必须发现每个服务器、合并工具目录、解析重复名称、路由调用，并从传输失败中恢复。

`2026-07-28` 让稳定状态更简单，因为每个请求都是自包含的；但兼容性让启动更微妙。客户端可能遇到：

- 支持首选版本的现代服务器；
- 返回已知版本或 header 错误的现代服务器；
- 从未听说 `server/discover` 的旧版服务器；
- 只有收到 `initialize` 才会响应的旧版服务器。

把每个探测错误都视为旧版很危险。格式错误的现代请求、过载服务器、已死亡进程和旧服务器都可能产生同样的超时或连接关闭信号。客户端必须结合明确的操作员意图和正向协议证据，再选择旧版时代。

## 概念

### Peer，而不是协议会话

为每个服务器进程或端点保存一条传输 peer 记录：

- 传输句柄或发送函数；
- 选中的协议时代与版本；
- 最近发现的服务器能力；
- 最近的确定性工具列表；
- 用于关联的待处理请求 ID；
- 传输健康状态。

这些是客户端 bookkeeping，不是协议会话状态。现代 MCP 服务器仍会在每个请求上收到当前版本和客户端能力。

### 每次从头构造现代请求

```python
def modern_request(request_id, method, params, version, capabilities):
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": method,
        "params": {
            **params,
            "_meta": {
                "io.modelcontextprotocol/protocolVersion": version,
                "io.modelcontextprotocol/clientCapabilities": capabilities,
                "io.modelcontextprotocol/clientInfo": CLIENT_INFO,
            },
        },
    }
```

不要只把元数据挂到连接对象上，以为它一定会到达线端。应在最终序列化的请求上写入并检查它。

### 现代发现

`server/discover` 返回受支持版本、服务器能力、说明、缓存提示和推荐的服务器身份。客户端选择双方支持的最高现代版本。

现代专用客户端可以不主动发现，但 stdio 上推荐发现。部分旧服务器在初始化前会接受操作，因此先发 `tools/list` 可能产生歧义；`server/discover` 可建立清晰的时代边界。

### stdio 兼容性探测

双时代 stdio 客户端先用首选现代元数据发送 `server/discover`。结果有三类：

1. **DiscoverResult：** 服务器是现代服务器；选择共同版本并继续逐请求元数据。
2. **已识别的现代错误：** 服务器仍是现代服务器；例如 `-32022` 时从 `data.supported` 选择并用新 ID 重试，不要发送 `initialize`。
3. **歧义信号：** 未识别的 JSON-RPC 错误、超时、连接关闭或空响应都不能标识时代。除非该 peer 明确配置为旧版，否则应 fail closed。

已识别的现代协议错误包括：`-32020` HeaderMismatch、`-32021` MissingRequiredClientCapability 和 `-32022` UnsupportedProtocolVersion。只要 peer 已证明理解现代错误词汇，即使它在旧版 allowlist 中，也不能再发送 `initialize`。`-32601` 不是正向旧版证据；它只让显式 allowlist peer 有资格进行一次旧版探测。同样规则适用于超时、连接关闭和空响应。

### Allowlist 是操作员意图，不是证据

旧版兼容必须是一个 peer 配置上的显式属性：

```python
client.add_server("archive", archive_transport, allow_legacy=True)
```

该选择必须绑定到已配置的 command 或 endpoint；不要使用允许任意服务器自行降级的通配符。没有 `allow_legacy=True` 的 peer 在歧义发现后失败，永远不接收 `initialize`。

allowlist 只授予探测许可，不直接选择时代。客户端发送一次受传输 deadline 限制的 `initialize`，随后必须同时验证：匹配的请求 ID、只有 `result` 没有 `error`、受支持的旧版 `protocolVersion`、对象类型的 `capabilities`，以及带非空字符串 `name`/`version` 的 `serverInfo`。超时、连接关闭、错误响应、格式错误结果、ID 不匹配或不支持的 revision 都 fail closed。只有结构有效的正向结果才选择旧版。真实 transport adapter 必须真正执行 `legacy_probe_timeout_ms`，而不能只记录它。

为该传输 peer 缓存选中的时代；不要在每次调用前重新探测。

### 旧版是兼容分支

一次有界探测返回有效正向旧版证据后，客户端严格按该 revision 使用旧版：验证 envelope 和关联 ID，验证协商 revision 在配置集合内，记录已验证的能力和服务器身份，全部检查通过后才发送 `notifications/initialized`，并在这段传输生命周期中使用旧版请求形状。

这条分支只服务于已知 peer 的互操作性，不是新服务器或新请求的默认设计。传输重启或端点改变时，丢弃 peer-era 缓存并重新协商。

### 发现并缓存工具

对每个活跃 peer 调用 `tools/list`。现代结果包含 `resultType`、`ttlMs` 和 `cacheScope`。在正确授权上下文内遵守新鲜度提示；过期或收到订阅的列表变更事件后重新获取。

客户端必须将旧版服务器缺少的 `resultType` 视作 `"complete"`，但不能要求旧版响应具备现代缓存字段。服务器应返回确定性顺序；客户端在合并前也应排序，以免本地启动时序改变注册表顺序。

### 无碰撞的命名空间合并

两个服务器可能都暴露 `search`。选择声明过的策略：

1. **冲突时加前缀：** 保留首个规范名，后续冲突暴露为 `<server>/<tool>`。
2. **冲突时拒绝：** 不加载重复项，给出清楚的配置错误。
3. **静默覆盖：** 永远不要用。它会隐藏模型选择的动作最终发送给哪个服务器。

同时保存规范名和本地名。模型看到规范名，发出的 `tools/call` 使用拥有者服务器声明的本地名。

### 路由调用

路由是纯查表：

```text
canonical tool name
  -> peer name + local tool name
  -> new JSON-RPC request id
  -> modern request metadata or explicit legacy shape
  -> matching response id
```

拥有者传输不可用时不要发送调用。应重连或重启传输，再重新发现和执行 `tools/list`。现代传输断裂而丢失的在途请求，只有在操作安全策略允许时，才能用新的 JSON-RPC ID 重试。

### 通知与订阅

现代列表和资源变更只会通过客户端打开的 `subscriptions/listen` 流到达。客户端发送通知过滤器，等待 `notifications/subscriptions/acknowledged`，并用通知元数据中的 listen 请求 ID 关联事件。

断开后，客户端要用新 ID 打开新的 listen 请求并重新获取相关列表或资源。现代流不会用 `Last-Event-ID` 恢复。

### 不发起服务器主动请求

现代服务器不会通过独立 JSON-RPC 请求调用客户端的 sampling、elicitation 或 Roots。它们返回 `input_required`，客户端完成嵌入式输入后重试原请求。

处理输入时不要阻塞 peer 的响应读取器；保留关联关系，并为重试创建新的 JSON-RPC ID。

```figure
tp-client-merge
```

## 使用

`code/main.py` 使用进程内 peer 函数，让协议决策保持可见。它连接两个现代 peer 和一个有意列入 allowlist 的旧版 peer，然后合并和路由工具。传输可调用对象会收到 timeout 预算，因此兼容分支不能藏起无界探测。

```bash
cd code
python3 main.py
python3 -m unittest discover tests -v
```

测试覆盖 demo 容易漏掉的边界：现代请求重复元数据；`-32022` 只重试现代发现；已识别现代错误绝不降级；无 allowlist 时超时、连接关闭、空响应和未识别错误不触发 `initialize`；只有有效且受支持的 `initialize` 结果才选择旧版；格式错误或不支持的旧版结果保持 peer 不可用；成功选择的时代会在传输生命周期内缓存。

## 交付

本课交付 `outputs/skill-mcp-client-harness.md`，用于搭建现代请求写入、stdio 时代协商、确定性命名空间合并、路由，以及 fail-closed 旧版兼容分支。

## 练习

1. 让伪服务器返回没有共同版本的 `-32022`，确认客户端失败且不发送 `initialize`。
2. 将伪旧版服务器列入 allowlist，让有界 `initialize` 超时，证明 peer 保持 `unknown` 且不可用。
3. 为两个授权上下文增加 `cacheScope: "private"` 的工具列表，确认客户端不会跨上下文共享缓存。
4. 把冲突策略改为拒绝，让启动错误同时包含两个 peer 名称。
5. 增加有限的 `subscriptions/listen` 模拟器。流丢失时用新 ID 重新监听并重新获取工具。

## 关键术语

| 术语 | 含义 |
|------|------|
| Peer | 一个服务器传输及其发现数据的客户端记录 |
| 协议时代 | 现代逐请求元数据或旧版初始化语义 |
| 发现探测 | 用来识别 stdio 时代的初始 `server/discover` |
| 已识别现代错误 | 证明现代行为、禁止旧版回退的错误 |
| 旧版 allowlist | 允许对一个固定 peer 做一次有界兼容探测的操作员配置 |
| 正向旧版证据 | 针对显式支持 revision 的有效、关联的 `initialize` 结果 |
| 合并命名空间 | 所有活跃 peer 中的规范工具名 |
| 冲突策略 | 重命名或拒绝重复工具的规则 |
| 时代缓存 | 针对一个传输 peer 保存的现代或旧版行为 |
| 传输恢复 | 重启/重连、重新发现、重新列举，并以新 ID 安全重试 |

## 延伸阅读

- [MCP Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/)
- [MCP Server Discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [MCP stdio Transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
- [MCP Versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
- [MCP Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
