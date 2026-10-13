# 模型演示界面：练习指南

- 课程路径：`phases/17-infrastructure-and-production/29-model-demo-interfaces`
- 可运行 Python 文件：`main.py`

## 练习目标

在不依赖框架的情况下实现输入校验、错误契约、SSE 流、令牌桶、每日配额和隐私安全日志。

## 建议步骤

1. **令牌桶：** 将 `BUCKET_CAPACITY` 设为 2、`REFILL_PER_SECOND` 设为 1，预测七次请求的状态后再运行验证。
2. **字段校验：** 添加只接受 `"en"` 的 `language` 字段，其他值返回 422，并补充两个测试。
3. **模型边界：** 找到玩具关键词模型的误判（如 `The screen is not good.`），加入第四个示例并解释限制。
4. **反向代理：** 增加只信任代理地址设置的 `X-Forwarded-For`，证明客户端不能自行选择限流桶。
5. **真实流式模型：** 用返回 token 流的模型 API 替换 `generate`，保持校验、限制和事件格式不变。

## 运行与验证

```bash
python3 main.py
```

工作区只复制根目录的 `main.py` 和本指南；请另开一个以 Learning Atlas 仓库根目录为当前目录的终端，在上游课程目录运行完整测试：

```bash
cd ai-engineering-from-scratch/phases/17-infrastructure-and-production/29-model-demo-interfaces
python3 -m unittest discover -s code/tests -p 'test_*.py'
```

浏览器测试之外，再用 `curl` 发送超大 body、空文本、连续请求和带令牌请求，确认服务器端校验不会被页面绕过。
