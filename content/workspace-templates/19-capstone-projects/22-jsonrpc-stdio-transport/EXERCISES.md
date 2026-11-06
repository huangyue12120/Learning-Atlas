# 基于换行分隔 Stdio 的 JSON-RPC 2.0：Python 练习指南

- 课程路径：`phases/19-capstone-projects/22-jsonrpc-stdio-transport`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证换行分帧的 JSON-RPC 请求、批处理与通知。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 核对 server_responses 的 id、result/error，并确认通知没有响应。
2. 分别发送坏 JSON、未知方法、非法参数与空 batch，在 BytesIO 测试中检查错误码及后续帧恢复。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

每个请求最多一个对应响应，通知与批处理行为保持协议约定。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
