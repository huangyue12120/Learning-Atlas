# 模型上下文协议（MCP）：练习指南

- 课程路径：`phases/11-llm-engineering/14-model-context-protocol`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 增加 `subtract` 工具，确认 `tools/list` 仍按字母顺序排列。
2. 删除协议版本键，验证 Invalid Params（`-32602`）。然后发送格式正确但不支持的版本 `2025-11-25`，验证 `-32022`，确认 `requested` 回显该版本，并从 `supported` 中选择版本。
3. 在创建操作中加入服务器生成的 `draftId`，再要求更新操作把它作为参数。解释为什么这是应用状态而不是协议会话。
4. 让某工具在需要用户确认时返回 `input_required`。使用新 ID、一个 `inputResponses` 项和原样的 `requestState` 重试原调用，不要凭空发起服务器到客户端的 JSON-RPC 请求。
5. 草拟一个双时代 stdio 客户端：把结果或可识别的现代错误视为现代协议；只有无法识别的错误或超时才允许回退到 `initialize`。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
