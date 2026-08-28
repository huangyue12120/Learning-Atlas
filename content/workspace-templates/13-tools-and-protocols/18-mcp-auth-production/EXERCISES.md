# 生产环境中的 MCP Auth：按发行方绑定的注册与令牌：练习指南

- 课程路径：`phases/13-tools-and-protocols/18-mcp-auth-production`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 运行 `main.py` 并追踪流程。注意第 6 步 IdP 轮换 key，计划 `refresh_jwks` 重新拉取已发布集合，旧令牌（重叠窗口）和新令牌都无需重启即可校验。
2. 把新的 IdP 加入受保护资源元数据的 `authorization_servers`，用新 IdP 签发令牌并确认校验器接受；再用未列出的 IdP 签发令牌，确认校验器以 `WWW-Authenticate: Bearer error="invalid_token", error_description="iss not allowed"` 拒绝。
3. 给 `register_client` 增加限流检查，在注册器接受请求前运行。用按 IP 存在小字典里的 token bucket。
4. 阅读 RFC 7591，找出本课 `/register` 处理器没有校验的两个字段并补上校验。（提示：`software_statement` 和 `redirect_uris` URI scheme。）
5. 增加第二个授权服务器，确认客户端分别存储发行方注册信息，拒绝复用第一发行方的令牌或 `client_id`。
6. 证明 DoS 修复：给校验器发送随机 `kid` 的令牌，确认 `refresh_jwks` 最多运行一次，授权服务器密钥数量不增长；再故意把兜底改回 rotate-and-mint，观察每个伪造令牌都会增加 key 数量，之后恢复重新获取。
7. 用 `native` 和 `web` 客户端都练习已弃用的 DCR，确认带 HTTP 重定向 URI 的 web 客户端，以及没有精确环回重定向的 native 客户端都会被拒绝。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
