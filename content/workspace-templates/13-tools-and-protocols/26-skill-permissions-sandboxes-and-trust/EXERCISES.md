# 技能权限、沙箱与信任：练习指南

- 课程路径：`phases/13-tools-and-protocols/26-skill-permissions-sandboxes-and-trust`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. 增加独立的读取、新建、覆盖和删除路径权限。在每种操作下测试同一路径。
2. 增加一个 origin 策略：允许 `https://registry.example.test` 的 443 端口，另行允许 8443 端口，并拒绝重定向到所有未声明 origin。
3. 建模一个生命周期 hook 会执行仓库代码的包管理器命令。决定对它 `ask`、`deny` 还是隔离。
4. 为 `ActionRequest` 增加幂等键，并要求外部写入必须提供它。
5. 为 staging 发布、production 发布分别写审批消息。明确目标、构件和回滚后果。
6. 为读取网页并写 pull request 评论的技能建立威胁模型。标记每个信任和权威边界。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
