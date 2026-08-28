# MCP 授权：CIMD、发行方绑定、PKCE 与升级授权：练习指南

- 课程路径：`phases/13-tools-and-protocols/16-mcp-security-oauth-2-1`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 增加 refresh token 轮换，并拒绝重用之前的 refresh token。
2. 增加发行方 allowlist。发行方改变时，只复用可迁移的 CIMD URL；拒绝所有旧发行方签发的凭据和令牌。
3. 给授权 code 增加过期时间，确认过晚兑换失败。
4. 构建远程 HTTPS 重定向的 web 客户端变体，将它的 DCR 元数据与 native 客户端比较。
5. 在同一个发行方下增加第二个资源，确认它的访问令牌不能在第一个资源使用。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
