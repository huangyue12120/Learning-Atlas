# 毕业课程 28：用 OTel GenAI Span 和 Prometheus 指标做观测：Python 练习指南

- 课程路径：`phases/19-capstone-projects/28-observability-otel-traces`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证生成式 AI span 与 Prometheus 指标导出。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 检查 trace_id、父子 span、JSONL roundtrip 数量与直方图 bucket/count/sum。
2. 增加一个失败工具调用，确认错误事件、耗时和计数一致，检查标签中没有请求内容或秘密。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

导出文本与内存数据一致；真实 OTel 后端还需配置接收、转换和鉴权。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
