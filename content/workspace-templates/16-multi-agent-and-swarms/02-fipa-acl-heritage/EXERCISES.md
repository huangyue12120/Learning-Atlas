# FIPA-ACL 与言语行为的传承：练习指南

- 课程路径：`phases/16-multi-agent-and-swarms/02-fipa-acl-heritage`
- 可运行 Python 文件：`main.py`

## 练习目标

把现代 MCP/A2A 请求映射到 FIPA performative，理解结构化消息如何保留意图、内容和对话标识。

## 动手练习

1. 运行 `main.py`，记录 MCP、A2A 和 Contract Net 示例中的 performative 与会话字段。
2. 为一个拒绝请求新增 `refuse` 映射，并保持消息内容可追溯。
3. 修改 Contract Net 的报价，观察接受者和拒绝者如何变化。
4. 为过期 `conversation_id` 增加诊断输出，区分协议错误与业务拒绝。
5. 写下一个现代 JSON 协议仍然需要的本体或类型约束。

## 运行与验证

```bash
python3 code/main.py
```

确认程序退出码为 0，并把每轮消息的 performative、sender、receiver 和 conversation-id 写入学习记录。
