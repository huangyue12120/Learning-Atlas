# 毕业项目 13：带 Registry 与治理的无状态 MCP 服务器：Python 练习指南

- 课程路径：`phases/19-capstone-projects/13-mcp-server-with-registry`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

区分 Registry 元数据、运行时发现和逐调用授权。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

Python 入口是离线架构模拟；课程正文中的云服务、模型训练和生产部署属于后续扩展。其他语言实现只从上游链接访问。

## 动手练习

1. 记录注册文档、运行时发现、tools 与 policy-gated calls，核对协议版本和能力是否一致。
2. 在测试中加入缺 scope、错误 audience 和不匹配参数摘要的审批记录，确认工具执行前拒绝并生成脱敏审计。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

本地测试覆盖两层契约与策略拒绝；示例不验证真实 OAuth、不调用 OPA，也不发布 Registry。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
