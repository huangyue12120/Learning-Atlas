# 中文译文术语基线

本表适用于实践课程和理论课程的中文译文。英文术语在代码、类名、API、产品名和文件名中保持原样；正文首次出现时可保留英文括注，后续使用下表中的中文。存在领域差异时按下表的语境说明选择译法。

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| feature | 特征 | `feature engineering` 译为“特征工程”；表示一般属性时使用“属性”或“特性”，不要把两者混作 feature。 |
| algorithm / data structure / time complexity / space complexity / asymptotic upper bound / amortised complexity | 算法 / 数据结构 / 时间复杂度 / 空间复杂度 / 渐近上界 / 均摊复杂度 | 渐近复杂度描述输入规模增大时的增长率；均摊复杂度不等于最坏情况复杂度。 |
| recursion / recursive call / call stack / base case / recursive case / iteration / tail recursion | 递归 / 递归调用 / 调用栈 / 基础情形 / 递归情形 / 迭代 / 尾递归 | 用“基础情形”指明递归终止条件；iteration 在算法实现语境中译为“迭代”。 |
| backtracking / pruning / choose / explore / unchoose | 回溯 / 剪枝 / 选择 / 探索 / 撤销选择 | 回溯模板中的 choose、explore、unchoose 统一译为“选择、探索、撤销选择”。 |
| dynamic programming / state / state transition / optimal substructure / overlapping subproblems / memoisation / tabulation | 动态规划 / 状态 / 状态转移 / 最优子结构 / 重叠子问题 / 记忆化 / 递推填表 | memoisation 指缓存子问题结果的记忆化；tabulation 指自底向上填表。 |
| two pointers / sliding window / hash map / binary search / divide and conquer | 双指针 / 滑动窗口 / 哈希表 / 二分查找 / 分治 | 本组译法适用于数据结构与算法课程。 |
| array / dynamic array / cache locality / hash table / hash map / hash set | 数组 / 动态数组 / 缓存局部性 / 哈希表 / 哈希表 / 哈希集合 | hash table 与 hash map 在本课程中统一译为“哈希表”；hash set 译为“哈希集合”。 |
| hash function / collision / chaining / open addressing / linear probing / load factor / rehash / Bloom filter | 哈希函数 / 碰撞 / 链式法 / 开放寻址法 / 线性探测 / 负载因子 / 重新哈希 / 布隆过滤器 | 与数据结构课程中的哈希表实现术语保持一致。 |
| anagram / canonical form / complement / prefix sum / prefix product / suffix product / subarray / substring | 字母异位词 / 规范表示 / 补数 / 前缀和 / 前缀积 / 后缀积 / 子数组 / 子串 | 字母异位词指字母及其出现次数相同、顺序不同的字符串；subarray 和 substring 都指连续片段，按数组或字符串语境使用。 |
| linked list / singly linked list / doubly linked list / node / pointer / sentinel node / dummy head | 链表 / 单向链表 / 双向链表 / 节点 / 指针 / 哨兵节点 / 虚拟头节点 | 单链表已知前驱节点时可在 $O(1)$ 时间改链；仅知道目标节点时，通常仍需寻找前驱。 |
| stack / queue / deque / LIFO / FIFO | 栈 / 队列 / 双端队列 / 后进先出 / 先进先出 | 栈顶操作对应 LIFO；队列从尾部加入、从头部移除，对应 FIFO。 |
| fast and slow pointers / Floyd's cycle-finding algorithm / monotonic stack / priority queue / binary heap / min-heap / max-heap / heapify | 快慢指针 / Floyd 判圈算法 / 单调栈 / 优先队列 / 二叉堆 / 最小堆 / 最大堆 / 建堆 | Floyd 判圈用于检测链表环；堆的数组下标公式需注明从 0 开始。 |
| binary tree / binary search tree (BST) / balanced BST / inorder / preorder / postorder / level-order traversal / lowest common ancestor (LCA) | 二叉树 / 二叉搜索树 / 平衡二叉搜索树 / 中序遍历 / 前序遍历 / 后序遍历 / 层序遍历 / 最近公共祖先 | 二叉搜索树的复杂度依赖树高；中序遍历在满足 BST 次序约定时产生有序序列。 |
| trie / prefix tree / union-find / disjoint-set union / find / union / path compression / union by rank / connected component | 字典树 / 前缀树 / 并查集 / 并查集 / 查找 / 合并 / 路径压缩 / 按秩合并 / 连通分量 | Trie 首次可写作“字典树（前缀树）”；Union-Find 与 DSU 统一译为“并查集”。 |
| segment tree / Fenwick tree / Binary Indexed Tree / prefix sum / lowest set bit | 线段树 / Fenwick 树 / 树状数组 / 前缀和 / 最低位的 1 | Fenwick tree 也称树状数组；其本文示例的区间和查询采用闭区间端点。 |
| parameter / hyperparameter | 参数 / 超参数 | 模型训练得到的是参数，训练前设定的是超参数。 |
| model bias / statistical bias | 偏置 / 偏差 | 神经网络的 bias term 译为“偏置”；统计估计的 systematic bias 和 bias–variance 中的 bias 译为“偏差”。 |
| embedding | 嵌入 | 向量本身可称“嵌入向量”，不要在同一概念上交替使用“表示”与“嵌入”。 |
| model token | 词元 | 指分词器或语言模型处理的单位。 |
| token bucket / access token / canary token | 令牌桶 / 访问令牌 / 金丝雀令牌 | 安全认证和限流语境不使用“词元”。 |
| prompt | 提示词 | `prompt template` 译为“提示词模板”。 |
| prompt engineering | 提示词工程 | 不使用“提示工程”。 |
| prompt injection | 提示注入 | `system prompt` 译为“系统提示词”。 |
| agent | 智能体 | 正文中的通用概念统一使用“智能体”；代码标识符、框架名称、产品名称和文件名保留英文。 |
| retrieval / chunk / reranking | 检索 / 分块 / 重排 | `retrieval-augmented generation` 译为“检索增强生成”，不要把 reranking 写成“重新排序”。 |
| evaluation / benchmark | 评估 / 基准测试 | `evaluation suite` 可译为“评测套件”；分类指标中的 `precision` 译为“精确率”，不要与一般测量精度混用。 |
| model inference / statistical inference / NLI | 推理 / 统计推断 / 自然语言推断 | “推理”指模型计算或逻辑过程；“推断”用于统计 inference；NLI 使用固定译法。 |
| statistical sampling / generation sampling | 抽样 / 采样 | 统计学从总体取样使用“抽样”；生成模型选择下一个输出使用“采样”。 |
| sampling frame / coverage error / sampling error | 抽样框 / 覆盖误差 / 抽样误差 | 使用固定译法；抽样框未覆盖总体会产生覆盖误差。 |
| simple random / stratified / cluster / systematic / quota / convenience / snowball sampling | 简单随机抽样 / 分层抽样 / 整群抽样 / 系统抽样 / 配额抽样 / 便利抽样 / 滚雪球抽样 | 统一使用这组统计学译法。 |
| sampling distribution / standard error / central limit theorem / law of large numbers / bootstrap | 抽样分布 / 标准误 / 中心极限定理 / 大数定律 / 自助法 | bootstrap 指从现有样本中有放回地重复抽样。 |
| permutation / combination / binomial coefficient / stars and bars | 排列 / 组合 / 二项式系数 / 隔板法 | 排列考虑顺序，组合不考虑顺序；stars and bars 也称隔板法。 |
| sample space / event / joint probability / marginal probability / conditional probability | 样本空间 / 事件 / 联合概率 / 边际概率 / 条件概率 | 使用固定译法；marginal probability 指不对其他事件或变量作条件化的概率。 |
| prior / likelihood / evidence / posterior / law of total probability | 先验 / 似然 / 证据 / 后验 / 全概率定律 | 概率论语境中 likelihood 译为“似然”；按原文公式区分证据与先验。 |
| sensitivity / specificity | 敏感度 / 特异度 | 医学检测语境使用这组译法；二分类语境的 sensitivity 与召回率密切相关。 |
| support / probability mass function / probability density function / cumulative distribution function | 支持集 / 概率质量函数 / 概率密度函数 / 累积分布函数 | 正式定义首现时可附 PMF、PDF、CDF 缩写。 |
| surprisal / self-information / entropy / differential entropy / cross-entropy / mutual information / relative entropy | 自信息 / 自信息 / 熵 / 差分熵 / 交叉熵 / 互信息 / 相对熵 | KL divergence 译为“KL 散度”，也称相对熵；surprisal 用“自信息”，可用“意外程度”作解释。 |
| Gini impurity / information gain / bagging / boosting / K-means / support vector machine / Gaussian mixture model | 基尼不纯度 / 信息增益 / 装袋法 / 提升法 / K-Means 聚类 / 支持向量机 / 高斯混合模型 | bagging 也称自助聚合；提升法涵盖 AdaBoost 与梯度提升等方法。 |
| closed-form solution / normal equation / gradient descent / mini-batch gradient descent / backpropagation | 闭式解 / 正规方程 / 梯度下降 / 小批量梯度下降 / 反向传播 | batch gradient descent 译为“批量梯度下降”；与随机梯度下降（SGD）区分。 |
| true positive / false positive / true negative / false negative / true positive rate / false positive rate | 真阳性 / 假阳性 / 真阴性 / 假阴性 / 真阳性率 / 假阳性率 | TPR 也称召回率；FPR 的分母为实际负例总数。 |
| maximum likelihood estimation / maximum a posteriori estimation / hidden Markov model / transition probability / emission probability / stationary distribution | 最大似然估计 / 最大后验概率估计 / 隐马尔可夫模型 / 转移概率 / 发射概率 / 平稳分布 | MAP 是 maximum a posteriori 的缩写；HMM 的转移矩阵采用行随机约定时，每行之和为 1。 |
| margin of error / statistical power / power analysis | 误差幅度 / 检验功效 / 功效分析 | power 在检验语境中指检验功效；Monte Carlo 等统计方法中的 sampling 用“抽样”。 |
| factor analysis / factor loading / experimental factor | 因子分析 / 因子载荷 / 实验因子 | 区分因子分析中的潜在因子与日常所说的影响因素。 |
| normalization / standardization / Unicode normalization | 归一化 / 标准化 / 规范化 | 数值或向量 normalization 用“归一化”；z-score 等 statistical standardization 用“标准化”；Unicode normalization 和 canonicalization 用“规范化”。 |
| accuracy / precision / recall | 准确率 / 精确率 / 召回率 | 三者作为分类指标时固定使用这组译法；“精度”只用于一般数值或测量语境。 |

## 理论课程常用术语

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| quantisation / quantisation error / scale factor / zero point / quantisation granularity / per-tensor / per-channel / per-group / per-token | 量化 / 量化误差 / 缩放因子 / 零点 / 量化粒度 / 逐张量 / 逐通道 / 逐组 / 逐词元 | 量化方法中的 scale 译为“缩放因子”；模型推理的 KV cache 保留英文名称；区分模型词元与一般令牌。 |
| post-training quantisation (PTQ) / quantisation-aware training (QAT) / calibration set / weight-only quantisation / activation quantisation | 训练后量化 / 量化感知训练 / 校准集 / 仅权重量化 / 激活量化 | 首次出现保留 PTQ、QAT 缩写；calibration set 统一译为“校准集”。 |
| straight-through estimator (STE) / outlier / mixed precision / key-value cache (KV cache) | 直通估计器 / 离群值 / 混合精度 / 键值缓存 | 仅指注意力中的 key-value cache 时可简称 KV cache；不将“离群值”误译为异常样本。 |
| vector space | 向量空间 | 本课程统一使用“向量空间”；不要与“线性空间”交替使用。 |
| basis / basis vector / dual basis | 基 / 基向量 / 对偶基 | basis 作为数学概念统一译为“基”；不要在同一语境中混用“基”和“基底”。 |
| orthogonal / orthonormal | 正交 / 正交归一 | “正交归一”同时要求两两正交且向量范数为 1；不能简写为“正交”。 |
| dot product / inner product | 点积 / 内积 | 点积是欧几里得空间中常用的一种内积；按原文具体术语翻译，不互换。 |
| norm / distance / metric | 范数 / 距离 / 度量 | 范数描述向量大小，距离描述两点间隔，度量定义距离的规则。 |
| Euclidean norm / distance; Manhattan norm / distance; max norm; Hamming distance | 欧几里得范数 / 欧几里得距离；曼哈顿范数 / 曼哈顿距离；最大范数；汉明距离 | 固定使用这些译法；二进制向量上的汉明距离等于差向量的 $L_1$ 范数。 |
| rank / full rank | 秩 / 满秩 | 矩阵的 rank 统一译为“秩”。 |
| eigenvalue / eigenvector | 特征值 / 特征向量 | 保持固定译法。 |
| derivative / differentiation / differential / gradient | 导数 / 求导 / 微分 / 梯度 | 四者含义不同；偏导数是 partial derivative，梯度由各偏导数组成。 |
| definite / indefinite integral / antiderivative | 定积分 / 不定积分 / 原函数 | 不定积分表示一族相差常数的原函数；单个函数 $F$ 是其中一个原函数。 |
| Riemann sum | 黎曼和 | 用分割区间上的函数值近似定积分。 |
| function approximation / universal approximation theorem | 函数逼近 / 通用逼近定理 | 统一使用“通用逼近定理”，并保留其网络结构、激活函数和定义域条件。 |
| Taylor approximation / polynomial approximation / Fourier series | 泰勒近似 / 多项式逼近 / 傅里叶级数 | 使用固定译法；泰勒级数是否收敛到原函数需满足相应条件。 |
| Taylor series / Maclaurin series / power series | 泰勒级数 / 麦克劳林级数 / 幂级数 | 使用固定译法。 |
| radius of convergence / ratio test / Lagrange remainder | 收敛半径 / 比值判别法 / 拉格朗日余项 | 使用固定译法；比值判别法的极限不存在时结论可能不确定。 |
| Newton's method | 牛顿法 | 优化语境使用固定译法。 |
| zero / root / multiplicity | 零点 / 根 / 重数 | 函数 $f$ 的零点也称为 $f$ 的根；重数表示对应因子出现的次数。 |
| convex / concave / inflection point | 凸 / 凹 / 拐点 | “拐点”指函数凹凸性发生改变的位置；$f''(x)=0$ 本身不足以判定拐点。 |
| Lagrange multiplier / KKT conditions / second derivative test | 拉格朗日乘子 / KKT 条件 / 二阶导数判别法 | 拉格朗日乘子法所得驻点需再判断是否为最优解。 |
| Gauss–Newton / Levenberg–Marquardt | 高斯–牛顿法 / 勒文伯格–马夸特法 | 用于最小二乘问题的术语固定译法。 |
| secant line / tangent line | 割线 / 切线 | secant line 经过曲线上两点；tangent line 是割线在两点趋近时的极限位置。 |
| Jacobian matrix / Hessian matrix / automatic differentiation | 雅可比矩阵 / Hessian 矩阵 / 自动微分 | Hessian 在本课程统一保留英文名称；自动微分按链式法则计算导数，不等同于符号微分。 |
| multivariate calculus / multivariate function / multivariate chain rule | 多元微积分 / 多元函数 / 多元链式法则 | 使用“多元”这一组固定译法。 |
| expectation / expected value | 期望 / 期望值 | 期望算子或概念用“期望”；随机变量的 expected value 用“期望值”。 |
| frequency distribution / probability distribution / empirical distribution | 频数分布 / 概率分布 / 经验分布 | frequency distribution 统计频数；empirical distribution 来自观测数据。 |
| probability mass function (PMF) / probability density function (PDF) / cumulative distribution function (CDF) | 概率质量函数 / 概率密度函数 / 累积分布函数 | PDF 的区间积分给出连续随机变量的区间概率；CDF 定义为 $P(X\leq x)$。 |
| raw moment / central moment / skewness / kurtosis / excess kurtosis | 原始矩 / 中心矩 / 偏度 / 峰度 / 超额峰度 | 偏度为零不必然表示对称分布；超额峰度等于峰度减 3。 |
| statistic / statistical measure / evaluation metric / mathematical metric | 统计量 / 统计量 / 指标 / 度量 | 统计学中的 summary measure 用“统计量”；模型评估用“指标”；距离公理语境中的 metric 用“度量”。 |
| mean absolute deviation / median absolute deviation | 平均绝对偏差 / 中位数绝对偏差 | 两者都可能缩写为 MAD，首次出现时写明全称。 |
| interquartile range / percentile / z-score | 四分位距 / 百分位数 / z 分数 | 使用固定译法。 |
| Pearson correlation / Spearman correlation / correlation coefficient / covariance | 皮尔逊相关系数 / 斯皮尔曼相关系数 / 相关系数 / 协方差 | Pearson 衡量线性关联；零相关不排除非线性关系。 |
| null / alternative hypothesis / p-value / significance level | 零假设 / 备择假设 / p 值 / 显著性水平 | p 值是在零假设为真时观察到当前或更极端结果的概率，不是零假设为真的概率。 |
| Type I / Type II error / statistical power | I 型错误 / II 型错误 / 检验功效 | 检验功效定义为 $1-\beta$。 |
| one-tailed / two-tailed test / degrees of freedom | 单尾检验 / 双尾检验 / 自由度 | 单尾检验的方向应在看数据前确定。 |
| parametric / non-parametric test / goodness-of-fit test | 参数检验 / 非参数检验 / 拟合优度检验 | 使用固定译法。 |
| z-test / t-test / ANOVA / chi-square test | z 检验 / t 检验 / 方差分析 / 卡方检验 | ANOVA 首次出现时可保留英文缩写。 |
| geometric mean / exponential moving average (EMA) | 几何平均数 / 指数移动平均 | 使用固定译法。 |
| variance / standard deviation / covariance | 方差 / 标准差 / 协方差 | 不用“变异数”替代方差；协方差与相关系数不是同一指标。 |
| likelihood / likelihood function | 似然 / 似然函数 | 与 probability（概率）区分；“可能性”只用于日常语义，不替代统计学术语。 |
| proposition / propositional logic / predicate / predicate logic / logical connective / conjunction / disjunction / negation / implication / biconditional | 命题 / 命题逻辑 / 谓词 / 谓词逻辑 / 逻辑连接词 / 合取 / 析取 / 否定 / 蕴含 / 双条件 | 经典命题逻辑采用二值真值；逻辑连接词使用固定译法。 |
| truth table / vacuous truth / tautology / contradiction / contingent formula / universal quantifier / existential quantifier | 真值表 / 空真 / 永真式 / 矛盾式 / 偶然式 / 全称量词 / 存在量词 | contingent formula 译为“偶然式”；区分其与永真式、矛盾式。 |
| direct proof / proof by contradiction / mathematical induction / base case / inductive hypothesis / inductive step / strong induction / pigeonhole principle | 直接证明 / 反证法 / 数学归纳法 / 基础情形 / 归纳假设 / 归纳步骤 / 强归纳法 / 鸽巢原理 | 归纳证明需同时验证基础情形与归纳步骤；递归本身不自动保证算法正确。 |
| power set / cardinality / countably infinite / uncountably infinite / Cartesian product / relation / equivalence relation / equivalence class / partial order / total order | 幂集 / 基数 / 可数无限 / 不可数无限 / 笛卡尔积 / 关系 / 等价关系 / 等价类 / 偏序 / 全序 | 关系性质使用“自反、对称、反对称、传递”；目录包含关系可作为偏序的例子。 |
| domain / codomain / image / injective / surjective / bijective / recurrence relation / Master Theorem | 定义域 / 陪域 / 像集 / 单射 / 满射 / 双射 / 递推关系 / 主定理 | 满射当且仅当像集等于陪域；计算理论术语使用固定译法。 |
| Turing machine / Church–Turing thesis / Turing complete / halting problem / decidable / undecidable / reduction / P / NP / NP-complete / NP-hard | 图灵机 / 丘奇–图灵论题 / 图灵完备 / 停机问题 / 可判定 / 不可判定 / 归约 / P / NP / NP 完全 / NP 难 | Church–Turing thesis 译为“论题”，不可写成已证明定理；区分 NP 完全与 NP 难。 |
| spanning tree / minimum spanning tree / planar graph / graph colouring / chromatic number / Eulerian trail / Hamiltonian path | 生成树 / 最小生成树 / 平面图 / 图着色 / 色数 / 欧拉通路 / 哈密顿路径 | 欧拉通路的存在条件需限定连通无向图（忽略孤立节点）；NP 完全性指相应的判定问题。 |
| binary / hexadecimal / bit / byte / two's complement / IEEE 754 / floating-point number / sign bit / exponent / mantissa / subnormal number / NaN | 二进制 / 十六进制 / 位 / 字节 / 二进制补码 / IEEE 754 / 浮点数 / 符号位 / 指数 / 尾数 / 非规格化数 / NaN（非数） | IEEE 754 规格化有限数使用隐含的首位 1；零、非规格化数、无穷大和 NaN 使用特殊编码。 |
| logic gate / Boolean operation / NAND / XOR / half adder / full adder / multiplexer / transistor / arithmetic logic unit (ALU) / register / program counter (PC) / control unit | 逻辑门 / 布尔运算 / 与非门 / 异或门 / 半加器 / 全加器 / 多路复用器 / 晶体管 / 算术逻辑单元 / 寄存器 / 程序计数器 / 控制单元 | 保留 ALU、PC 等缩写；NAND 门具有功能完备性。 |
| instruction set architecture (ISA) / complex instruction set computer (CISC) / reduced instruction set computer (RISC) / micro-operation / pipeline / data hazard / control hazard / structural hazard / forwarding / branch prediction / stall | 指令集架构 / 复杂指令集计算机 / 精简指令集计算机 / 微操作 / 流水线 / 数据冒险 / 控制冒险 / 结构冒险 / 转发 / 分支预测 / 停顿 | CISC/RISC 描述架构设计倾向；具体 ISA 可以包含变长、压缩或扩展指令。 |
| memory hierarchy / temporal locality / spatial locality / cache line / cache hit / cache miss / direct-mapped cache / fully associative cache / set-associative cache / cache coherence | 存储层次 / 时间局部性 / 空间局部性 / 缓存行 / 缓存命中 / 缓存未命中 / 直接映射缓存 / 全相联缓存 / 组相联缓存 / 缓存一致性 | 相联度描述一个内存块可映射到的缓存行范围；硬件延迟和容量依设备而变。 |
| virtual memory / page / page table / page frame / Translation Lookaside Buffer (TLB) / page fault / thrashing / Least Recently Used (LRU) / First In First Out (FIFO) | 虚拟内存 / 页 / 页表 / 页框 / 转换后备缓冲器 / 缺页异常 / 抖动 / 最近最少使用 / 先进先出 | 缺页异常可能表示页面未驻留，也可能由无效地址或权限错误引起；LRU 不能保证对所有工作负载最优。 |
| programmed I/O / interrupt / interrupt handler / interrupt vector table / Direct Memory Access (DMA) / Remote Direct Memory Access (RDMA) / Peripheral Component Interconnect Express (PCIe) / Memory-Mapped I/O (MMIO) | 程序控制 I/O / 中断 / 中断处理程序 / 中断向量表 / 直接内存访问 / 远程直接内存访问 / 高速外设组件互连 / 内存映射 I/O | 保留 I/O、DMA、RDMA、PCIe 和 MMIO 缩写；设备数据传输是否采用 DMA 取决于硬件与软件路径。 |
| process / Process Control Block (PCB) / process identifier (PID) / context switch / thread / race condition / synchronization / kernel thread / user thread / thread pool | 进程 / 进程控制块 / 进程 ID / 上下文切换 / 线程 / 竞态条件 / 同步 / 内核线程 / 用户线程 / 线程池 | 同一进程的线程共享地址空间中的代码、数据和堆，各自拥有栈和寄存器状态。 |
| First Come First Served (FCFS) / Shortest Job First (SJF) / Shortest Remaining Time First (SRTF) / round-robin scheduling (RR) / time quantum / starvation / aging / Multilevel Feedback Queue (MLFQ) / Completely Fair Scheduler (CFS) / virtual runtime / EEVDF | 先到先服务 / 最短作业优先 / 最短剩余时间优先 / 轮转调度 / 时间片 / 饥饿 / 老化 / 多级反馈队列 / 完全公平调度器 / 虚拟运行时间 / 最早适格虚拟截止期优先 | SJF 最优性依赖作业同时到达且运行时长已知；Linux 较新内核已采用 EEVDF 等调度机制。 |
| paging / demand paging / page frame / internal fragmentation / external fragmentation / segmentation / page replacement / memory allocator / inode / hard link / journaling / extent / copy-on-write | 分页 / 按需分页 / 页框 / 内部碎片 / 外部碎片 / 分段 / 页面置换 / 内存分配器 / 索引节点 / 硬链接 / 日志记录 / extent（连续数据块范围） / 写时复制 | 分页可避免外部碎片但仍可能产生内部碎片；文件系统日志的保护范围取决于日志模式。 |
| system call / user mode / kernel mode / trap / interrupt / network stack / TCP/IP / socket / port / congestion control / DNS / HTTP / latency / bandwidth | 系统调用 / 用户模式 / 内核模式 / 陷阱 / 中断 / 网络栈 / TCP/IP / 套接字 / 端口 / 拥塞控制 / DNS / HTTP / 延迟 / 带宽 | TCP 提供有序字节流；UDP 不保证交付和顺序；延迟与带宽是不同指标。 |
| virtualisation / virtual machine (VM) / hypervisor / guest OS / container / namespace / control group (cgroup) / Dockerfile / Kubernetes / Pod | 虚拟化 / 虚拟机 / 虚拟机监控器 / 客户机操作系统 / 容器 / 命名空间 / 控制组 / Dockerfile / Kubernetes / Pod | 虚拟机运行独立客户机内核；容器通常共享主机内核，依赖命名空间和 cgroups 等机制隔离。 |
| file permission / privilege separation / least privilege / sandbox / mandatory access control / Address Space Layout Randomisation (ASLR) / seccomp | 文件权限 / 权限分离 / 最小权限 / 沙箱 / 强制访问控制 / 地址空间布局随机化 / seccomp | root 通常拥有广泛权限，但能力机制和强制访问控制可进一步限制其操作。 |
| concurrency / parallelism / synchronisation / race condition / critical section / contention / mutex / semaphore / condition variable / monitor / read-write lock | 并发 / 并行 / 同步 / 竞态条件 / 临界区 / 锁竞争 / 互斥锁 / 信号量 / 条件变量 / 监视器 / 读写锁 | concurrency 指管理多个在进展中的任务，parallelism 指多个任务同时执行；条件变量等待后应重新检查条件。 |
| producer-consumer problem / bounded buffer / readers-writers problem / dining philosophers / deadlock / hold and wait / circular wait / deadlock prevention / deadlock avoidance / Banker's algorithm | 生产者—消费者问题 / 有界缓冲区 / 读者—写者问题 / 哲学家就餐问题 / 死锁 / 占有并等待 / 循环等待 / 死锁预防 / 死锁避免 / 银行家算法 | 死锁避免是在授予请求前判断安全性；死锁检测则在死锁发生后寻找并恢复。 |
| lock-free / wait-free / atomic operation / Compare-And-Swap (CAS) / priority inversion | 无锁 / 无等待 / 原子操作 / 比较并交换 / 优先级反转 | lock-free 保证系统整体持续进展；wait-free 进一步保证每个线程在有界步数内完成。 |
| shared-memory parallelism / message passing / OpenMP / Message Passing Interface (MPI) / Single Instruction, Multiple Threads (SIMT) / collective communication / AllReduce | 共享内存并行 / 消息传递 / OpenMP / 消息传递接口 / 单指令、多线程 / 集合通信 / AllReduce | MPI_AllReduce 是集合通信操作；环形 AllReduce 是一种可能的实现算法。 |
| asynchronous programming / event loop / callback / coroutine / async/await / I/O-bound / CPU-bound / Global Interpreter Lock (GIL) | 异步编程 / 事件循环 / 回调 / 协程 / async/await / I/O 密集型 / CPU 密集型 / 全局解释器锁 | 异步并发本身不等于多核并行；Python 3.13 支持可选无 GIL 构建，默认构建仍有 GIL。 |
| Amdahl's law / Gustafson's law / strong scaling / weak scaling / speedup | 阿姆达尔定律 / 古斯塔夫森定律 / 强扩展 / 弱扩展 / 加速比 | 阿姆达尔定律固定总工作量；古斯塔夫森定律考察固定时间内扩大工作量时的扩展。 |
| programming paradigm / imperative programming / object-oriented programming (OOP) / functional programming (FP) / logic programming / multi-paradigm language / encapsulation / inheritance / polymorphism / immutability / pure function / first-class function | 编程范式 / 命令式编程 / 面向对象编程 / 函数式编程 / 逻辑编程 / 多范式语言 / 封装 / 继承 / 多态 / 不可变性 / 纯函数 / 一等函数 | 语言可支持多种范式；纯函数输出依赖输入且没有副作用。 |
| type system / static typing / dynamic typing / strong typing / weak typing / type inference / generic / parametric polymorphism / type annotation / static analysis | 类型系统 / 静态类型 / 动态类型 / 强类型 / 弱类型 / 类型推断 / 泛型 / 参数化多态 / 类型标注 / 静态分析 | 强类型与弱类型没有统一的形式化划分标准；动态类型不等于弱类型。 |
| stack / heap / manual memory management / use-after-free / double free / memory leak / garbage collection (GC) / tracing GC / reference counting / cycle collector / ownership / borrowing / borrow checker / dangling reference | 栈 / 堆 / 手动内存管理 / 释放后使用 / 重复释放 / 内存泄漏 / 垃圾回收 / 跟踪式垃圾回收 / 引用计数 / 循环垃圾回收器 / 所有权 / 借用 / 借用检查器 / 悬空引用 | Rust 的所有权和借用规则由编译器检查；安全 Rust 的保证不涵盖不安全代码和外部接口中的错误。 |
| compiler / lexing / token / parser / Abstract Syntax Tree (AST) / semantic analysis / constant folding / dead code elimination / loop unrolling / inlining / code generation / intermediate representation (IR) / LLVM | 编译器 / 词法分析 / 词法单元 / 语法分析器 / 抽象语法树 / 语义分析 / 常量折叠 / 死代码消除 / 循环展开 / 内联 / 代码生成 / 中间表示 / LLVM | 编译阶段与优化取决于语言和编译器；语义分析并不总包含静态类型检查。 |
| bytecode / interpreter / virtual machine (VM) / just-in-time compilation (JIT) / ahead-of-time compilation (AOT) / hot path / speculative optimisation / XLA | 字节码 / 解释器 / 虚拟机 / 即时编译 / 提前编译 / 热路径 / 推测性优化 / XLA | CPython 缓存字节码不代表所有源码都预先编译；JAX JIT 对输入形状和静态参数有要求。 |
| closure / pattern matching / algebraic data type (ADT) / Result type / trait / interface / duck typing / domain-specific language (DSL) / regular expression / shader language | 闭包 / 模式匹配 / 代数数据类型 / Result 类型 / trait（特征） / 接口 / 鸭子类型 / 领域特定语言 / 正则表达式 / 着色器语言 | 闭包捕获外围作用域变量绑定；鸭子类型按对象支持的操作决定可用性。 |






## 计算语言学常用术语

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| tokenization / tokenizer / subword tokenization | 词元化 / 词元切分器 / 子词切分 | 语言模型语境中指按模型词元划分文本；不要与中文分词简单等同。 |
| morphology / morpheme / root / stem / affix | 形态学 / 词素 / 词根 / 词干 / 词缀 | 词根承载核心词义；严格分析时，词干和词根不一定相同。 |
| prefix / suffix / infix / circumfix | 前缀 / 后缀 / 中缀 / 环缀 | 保持这组形态学译法。 |
| inflection / derivation | 屈折变化 / 派生 | 屈折变化通常不改变词性；派生通常构成新词，也可能改变词性。 |
| analytic / agglutinative / templatic morphology | 分析型 / 黏着型 / 模板形态 | 描述语言形态类型时使用这组译法。 |
| syntax / semantics / pragmatics / phonology | 句法 / 语义学 / 语用学 / 音系学 | pragmatics 不译作“实用主义”；phonology 与 phonetics（语音学）区分。 |
| phrase structure grammar / constituency grammar / constituency tree / dependency grammar / dependency tree | 短语结构语法 / 成分语法 / 成分树 / 依存语法 / 依存树 | 分别描述短语层级结构和词语间依存关系。 |
| context-free grammar (CFG) / terminal / non-terminal | 上下文无关文法 / 终结符 / 非终结符 | 按形式语言与句法分析语境使用。 |
| valency / argument | 配价 / 论元 | valency 指动词要求的论元数量。 |
| synonymy / antonymy / hypernym / hyponym / meronymy / polysemy | 同义关系 / 反义关系 / 上位词 / 下位词 / 部分—整体关系 / 多义关系 | dog 是 animal 的下位词，animal 是 dog 的上位词。 |
| word sense disambiguation (WSD) | 词义消歧 | 指判断多义词在具体语境中的词义。 |
| compositionality / compositional semantics / distributional semantics / distributional hypothesis | 组合性 / 组合语义学 / 分布语义学 / 分布假说 | 使用固定译法。 |
| speech act / locutionary act / illocutionary act / perlocutionary act | 言语行为 / 言内行为 / 言外行为 / 言后行为 | 按言语行为理论区分字面内容、交际意图和听者效果。 |
| implicature / coreference / discourse structure / rhetorical structure theory | 会话含义 / 共指 / 篇章结构 / 修辞结构理论 | coreference resolution 译为“共指消解”。 |
| phoneme / allophone / International Phonetic Alphabet / prosody | 音位 / 音位变体 / 国际音标 / 韵律 | allophone 不译作“同音异形体”。 |

## 文本处理与经典 NLP 术语

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| text normalization / case folding | 文本规范化 / 大小写折叠 | Unicode normalization 译为“Unicode 规范化”；数值 normalization 仍按通用术语表译为“归一化”。 |
| edit distance / Levenshtein distance | 编辑距离 / Levenshtein 距离 | Levenshtein 可保留英文人名形式。 |
| stemming / stemmer / lemmatization / lemma | 词干提取 / 词干提取器 / 词形还原 / 词典原形 | lemma 指词典中的基本形式；stem 不一定是真实词。 |
| part of speech (POS) / POS tagging / named entity recognition (NER) | 词性 / 词性标注 / 命名实体识别 | BIO tagging 译为“BIO 标注”；sequence labeling 译为“序列标注”。 |
| conditional random field (CRF) / emission feature / transition feature / partition function | 条件随机场 / 发射特征 / 转移特征 / 配分函数 | CRF 是判别式序列标注模型。 |
| CYK algorithm / Chomsky normal form / shift-reduce parsing / maximum spanning tree | CYK 算法 / 乔姆斯基范式 / 移位—归约分析 / 最大生成树 | 依存句法分析的图方法可通过最大生成树解码。 |
| bag-of-words (BoW) / term frequency / inverse document frequency / TF-IDF | 词袋模型 / 词频 / 逆文档频率 / TF-IDF | 使用固定译法。 |
| n-gram / bigram / trigram / perplexity | n-gram / 二元语法 / 三元语法 / 困惑度 | n-gram 指连续词元序列；困惑度依赖语料和词元切分，跨数据集比较需谨慎。 |
| Laplace smoothing / absolute discounting / continuation probability / Kneser–Ney smoothing | 拉普拉斯平滑 / 绝对折扣 / 延续概率 / Kneser–Ney 平滑 | 延续概率统计不同前置上下文的数量，而不是词的总频数。 |
| exact match (EM) / span-level F1 / brevity penalty / bits per byte (BPB) | 精确匹配 / 跨度级 F1 / 简短惩罚 / 每字节比特数 | EM 要求输出与标准答案完全一致；跨度级 F1 按答案跨度中的词元重叠计分。 |
| BLEU / ROUGE / METEOR / ChrF / BERTScore / BLEURT / COMET | BLEU / ROUGE / METEOR / ChrF / BERTScore / BLEURT / COMET | 保留指标名称；根据语境区分 n-gram 匹配、字符匹配和基于嵌入或学习模型的指标。 |
| pairwise comparison / position bias / verbosity bias / inter-annotator agreement / data contamination / canary string | 成对比较 / 位置偏差 / 冗长偏差 / 评审者间一致性 / 数据污染 / 金丝雀字符串 | canary string 是嵌入评估数据、用于检测数据泄漏的唯一字符串；与认证语境的 canary token（“金丝雀令牌”）区分。 |

## 词嵌入与序列模型术语

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| word embedding / static embedding / contextual embedding | 词嵌入 / 静态嵌入 / 上下文嵌入 | embedding 通用译法为“嵌入”；区分词类型固定表示与结合语境生成的表示。 |
| Continuous Bag of Words (CBOW) / Skip-gram / negative sampling | 连续词袋模型 / Skip-gram / 负采样 | Word2Vec 的两个训练架构和采样方法使用固定名称。 |
| co-occurrence matrix / pointwise mutual information (PMI) / shifted PMI | 共现矩阵 / 点互信息 / 平移点互信息 | 使用固定译法。 |
| analogy task / similarity benchmark / embedding evaluation | 类比任务 / 相似度基准 / 嵌入评估 | 区分向量类比测试与下游任务评估。 |
| recurrent neural network (RNN) / bidirectional RNN / stacked RNN / sequence-to-sequence (seq2seq) | 循环神经网络 / 双向 RNN / 深层堆叠 RNN / 序列到序列 | hidden state 统一译为“隐藏状态”。 |
| encoder / decoder / context vector / alignment score | 编码器 / 解码器 / 上下文向量 / 对齐分数 | 注意力机制和序列转换语境使用固定译法。 |
| Bahdanau attention / additive attention / Luong attention / multiplicative attention | Bahdanau 注意力 / 加性注意力 / Luong 注意力 / 乘性注意力 | 两种注意力形式保留作者名并注明类型。 |
| greedy decoding / beam search / beam width / length normalization | 贪心解码 / 束搜索 / 束宽 / 长度归一化 | 使用固定译法。 |
| max-over-time pooling / dilated causal convolution | 最大时序池化 / 空洞因果卷积 | TextCNN 与序列卷积语境使用固定译法。 |
| pre-train then fine-tune | 先预训练、再微调 | 描述预训练模型用于下游任务的范式。 |
| Transformer / encoder-only / decoder-only / encoder-decoder / masked language modeling (MLM) / causal language modeling (CLM) | Transformer / 仅编码器 / 仅解码器 / 编码器—解码器 / 掩码语言建模 / 因果语言建模 | 使用固定译法描述架构范式和预训练目标。 |
| sinusoidal positional encoding / learned positional embedding / rotary position embedding (RoPE) / ALiBi | 正弦位置编码 / 可学习的位置嵌入 / 旋转位置嵌入 / ALiBi | 区分位置编码与位置嵌入；模型名和缩写保留原文。 |
| pre-norm / post-norm / parameter-efficient fine-tuning (PEFT) / adapter / prefix tuning / LoRA | 前归一化 / 后归一化 / 参数高效微调 / 适配器 / 前缀微调 / LoRA | LoRA 首次出现可展开为低秩适配；Adapter 在正文可译作“适配器”。 |
| prompt engineering / zero-shot prompting / few-shot prompting / chain-of-thought prompting / in-context learning (ICL) | 提示词工程 / 零样本提示词 / 少样本提示词 / 思维链提示词 / 上下文学习 | prompt 统一译为“提示词”；ICL 指根据上下文示例执行任务，不更新模型参数。 |
| mixture of experts (MoE) / router / load balancing / expert parallelism | 混合专家 / 路由器 / 负载均衡 / 专家并行 | MoE 指由路由器为每个词元选择部分专家计算的架构。 |
| text diffusion / discrete denoising diffusion / masked diffusion language model | 文本扩散 / 离散去噪扩散 / 掩码扩散语言模型 | diffusion 中的 corruption 统一译为“扰动”；与训练数据污染（contamination）区分。 |
| optical character recognition (OCR) / scene text detection / connectionist temporal classification (CTC) / blank symbol | 光学字符识别 / 场景文本检测 / 连接主义时间分类 / 空白符号 | CTC 通过对齐路径计算目标文字序列的概率；blank symbol 不是认证语境的令牌。 |
| classifier-free guidance (CFG) / supervised fine-tuning (SFT) / reinforcement learning from human feedback (RLHF) / direct preference optimization (DPO) / reinforcement learning from AI feedback (RLAIF) | 无分类器引导 / 监督微调 / 基于人类反馈的强化学习 / 直接偏好优化 / 基于 AI 反馈的强化学习 | 使用固定术语描述生成控制与偏好对齐方法。 |
| reward model / reward hacking / rule-based reward / group relative policy optimization (GRPO) | 奖励模型 / 奖励投机 / 基于规则的奖励 / 组相对策略优化 | reward hacking 指模型利用奖励模型的缺陷获得高分，不译为“奖励黑客”。 |
| sliding window attention / ring attention / memory-augmented model / lost in the middle / needle-in-a-haystack evaluation | 滑动窗口注意力 / 环形注意力 / 记忆增强模型 / 中间丢失 / 大海捞针评估 | needle-in-a-haystack 指从长干扰文本中检索指定事实。 |
| StreamingLLM / attention sink / sink token / rolling KV-cache / local-global attention / dilated attention / FlashAttention | StreamingLLM / 注意力汇点 / 汇点词元 / 滚动 KV cache / 局部—全局注意力 / 空洞注意力 / FlashAttention | 模型和算法名保留原文；rolling KV-cache 保留固定汇点词元并滚动更新近期上下文。 |
| state space model (SSM) / selective state space / zero-order hold / parallel scan | 状态空间模型 / 选择性状态空间 / 零阶保持 / 并行扫描 | SSM 使用状态递推；Mamba 将部分状态参数设为输入的函数。 |
| speculative decoding / draft model / target model / non-autoregressive generation / Jacobi decoding | 推测解码 / 草稿模型 / 目标模型 / 非自回归生成 / Jacobi 解码 | 推测解码用草稿模型提出词元，再由目标模型验证；输出分布保持不变。 |
| grouped-query attention (GQA) / multi-query attention (MQA) / multi-head latent attention (MLA) / decoupled RoPE | 分组查询注意力 / 多查询注意力 / 多头潜在注意力 / 解耦 RoPE | 统一 KV 缓存优化方法的名称；MLA 中 latent vector 译为“潜在向量”。 |
| adjusted base frequency (ABF) / YaRN / interleaved RoPE (iRoPE) / no positional encoding (NoPE) / multi-token prediction (MTP) | 调整基频 / YaRN / 交错 RoPE / 无位置编码 / 多词元预测 | 模型名及缩写保留原文；YaRN 用于按频率调整 RoPE。 |
| knowledge distillation / teacher model / student model / logit soft-capping / mixed-precision training | 知识蒸馏 / 教师模型 / 学生模型 / logit 软上限 / 混合精度训练 | 教师模型的输出分布可作为学生模型的软目标。 |
| neural architecture search (NAS) / once-for-all network / structured pruning / unstructured pruning / 2:4 sparsity / Lottery Ticket Hypothesis | 神经架构搜索 / 一次训练网络 / 结构化剪枝 / 非结构化剪枝 / 2:4 稀疏性 / 彩票假设 | 保留 NAS 缩写；一次训练网络可导出适配不同部署目标的子网；2:4 稀疏性要求每 4 个权重中有 2 个为零。 |
| prefill / decode / static batching / continuous batching / PagedAttention / disaggregated serving / copy-on-write | 提示词预填充 / 逐词元解码 / 静态批处理 / 连续批处理 / PagedAttention / 解耦式推理服务 / 写时复制 | serving 语境译为“推理服务”；区分批处理策略和 KV cache 的内存分配方式。 |
| time to first token (TTFT) / time per output token (TPOT) / throughput / tail latency / p99 latency / service-level objective (SLO) | 首词元延迟 / 每输出词元时间 / 吞吐量 / 尾延迟 / p99 延迟 / 服务等级目标 | TTFT 衡量首个输出词元到达时间；TPOT 衡量生成阶段每个输出词元所需时间；p99 指第 99 百分位。 |
| constrained generation / grammar-constrained decoding / request routing / cascading / on-device-cloud routing | 受约束生成 / 文法约束解码 / 请求路由 / 级联路由 / 端云路由 | 约束解码限制可选输出词元；级联路由按请求难度在模型间升级。 |
| tensor parallelism / pipeline parallelism / sequence parallelism / prefix caching / radix-tree caching / KV-cache eviction / heavy-hitter token | 张量并行 / 流水线并行 / 序列并行 / 前缀缓存 / 基数树缓存 / KV cache 驱逐 / 高注意力词元 | 按并行切分维度区分三种并行方式；高注意力词元指累计注意力较高、可能保留在缓存中的词元。 |
| edge inference / on-device inference / device runtime / hardware delegate / operator delegation / cloud fallback | 端侧推理 / 设备端推理 / 设备端运行时 / 硬件委派 / 算子委派 / 云端回退 | 端侧推理指在用户设备本地运行；本地处理本身不保证数据隐私或零成本。 |
| federated learning / federated averaging (FedAvg) / gradient quantisation / gradient sparsification / differential privacy | 联邦学习 / 联邦平均 / 梯度量化 / 梯度稀疏化 / 差分隐私 | 联邦学习不集中收集原始数据，但模型更新仍可能泄漏信息；隐私保护取决于所用机制。 |
| early exit / model partitioning / speculative prefetching / model multiplexing | 提前退出 / 模型分区 / 推测式预取 / 多模型复用 | 提前退出需验证准确率与退出阈值；预取可能因预测错误而浪费计算。 |
| client-server architecture / stateless server / stateful server / reverse proxy / API gateway / load balancer | 客户端—服务器架构 / 无状态服务器 / 有状态服务器 / 反向代理 / API 网关 / 负载均衡器 | 将会话状态外置可减少对粘性会话的依赖；反向代理位于客户端与后端服务之间。 |
| round robin / least connections / weighted round robin / consistent hashing / cache-aside / write-through / write-back | 轮询 / 最少连接 / 加权轮询 / 一致性哈希 / 旁路缓存 / 写穿 / 写回 | 写穿同步更新缓存和数据库；写回先写缓存、再异步持久化；一致性哈希可降低扩缩容时的数据迁移量。 |
| ACID / CAP theorem / strong consistency / eventual consistency / causal consistency / read-your-writes / sharding | ACID / CAP 定理 / 强一致性 / 最终一致性 / 因果一致性 / 读己之写 / 分片 | CAP 的一致性与可用性取舍针对发生网络分区时的保证；分布式数据库的功能依实现和配置而异。 |
| message queue / publish-subscribe (pub/sub) / topic / partition / offset / backpressure / circuit breaker / idempotency / exponential backoff | 消息队列 / 发布—订阅 / 主题 / 分区 / 偏移量 / 背压 / 熔断器 / 幂等性 / 指数退避 | 消息队列可缓冲负载，但持久化、确认、重试和去重配置共同决定消息交付语义。 |
| Infrastructure as Code (IaC) / declarative configuration / Terraform / state file / plan / apply | 基础设施即代码 / 声明式配置 / Terraform / 状态文件 / 计划 / 应用 | IaC 用版本控制的配置描述目标基础设施；plan 预览变更，apply 执行变更。 |
| IaaS / PaaS / SaaS / FaaS / serverless / cold start / spot instance / reserved instance | 基础设施即服务 / 平台即服务 / 软件即服务 / 函数即服务 / 无服务器 / 冷启动 / 抢占式实例 / 预留实例 | 云产品的管理边界、计费和中断特性因服务商而异；无服务器函数不应依赖进程在调用间持续存在。 |
| Pod / Deployment / Service / StatefulSet / DaemonSet / Horizontal Pod Autoscaler (HPA) / Cluster Autoscaler / KEDA | Pod / Deployment / Service / StatefulSet / DaemonSet / 水平 Pod 自动扩缩器 / 集群自动扩缩器 / KEDA | Kubernetes 资源名保留原文；区分扩缩容 Pod 数量与扩缩容集群节点。 |
| active-passive deployment / active-active deployment / data residency / service mesh / mutual TLS (mTLS) | 主动—被动部署 / 主动—主动部署 / 数据驻留 / 服务网格 / 双向 TLS | 多区域部署的可用性受数据复制、故障检测和流量切换时间影响；数据驻留要求依法律和合同而异。 |
| microservices / service discovery / saga pattern / compensating transaction / data pipeline | 微服务 / 服务发现 / Saga 模式 / 补偿事务 / 数据管道 | Saga 用一系列本地事务协调跨服务工作流；失败时运行补偿操作，不等同于分布式 ACID 事务。 |
| batch processing / stream processing / event time / windowing / Lambda architecture / Kappa architecture / exactly-once processing | 批处理 / 流处理 / 事件时间 / 窗口计算 / Lambda 架构 / Kappa 架构 / 精确一次处理 | Lambda 架构与 AWS Lambda 无关；精确一次端到端语义还依赖源、处理器和接收端的配置。 |
| Model FLOPs Utilisation (MFU) / RED method / USE method / distributed tracing / error budget / chaos engineering | 模型浮点运算利用率 / RED 方法 / USE 方法 / 分布式追踪 / 错误预算 / 混沌工程 | MFU 应按训练数据类型和硬件峰值定义；99.9% 时间可用性与 99.9% 请求延迟目标的错误预算单位不同。 |
| blue-green deployment / canary deployment / shadow deployment / feature flag | 蓝绿部署 / 金丝雀部署 / 影子部署 / 功能开关 | 蓝绿部署切换环境；金丝雀部署逐步扩大流量；影子部署只比较新模型输出而不直接服务用户。 |

## 计算机视觉常用术语

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| digital image / pixel / grayscale image / bit depth / channel | 数字图像 / 像素 / 灰度图像 / 位深度 / 通道 | 图像像素强度用“强度值”；灰度图像每个像素只有一个强度通道。 |
| colour space / colour channel / hue / saturation / value / luminance / chrominance / chroma subsampling | 颜色空间 / 颜色通道 / 色相 / 饱和度 / 明度 / 亮度 / 色度 / 色度抽样 | RGB、HSV、YCbCr 和 CIELAB 保留标准名称；CIELAB 的 lightness 译为“明度”。 |
| pinhole camera / intrinsic matrix / extrinsic parameters / principal point / distortion / camera calibration / undistortion | 针孔相机 / 内参矩阵 / 外参 / 主点 / 畸变 / 相机标定 / 去畸变 | intrinsic 描述相机内部参数；extrinsic 描述相机相对世界坐标系的位置和朝向。 |
| spatial filtering / filter / kernel / convolution / cross-correlation / box filter / Gaussian filter / median filter | 空间滤波 / 滤波器 / 卷积核 / 卷积 / 互相关 / 均值滤波器（方框滤波器） / 高斯滤波器 / 中值滤波 | 若核未翻转，按定义该运算是互相关；深度学习框架常将其称为卷积。 |
| edge detection / gradient magnitude / gradient direction / non-maximum suppression / hysteresis thresholding | 边缘检测 / 梯度幅值 / 梯度方向 / 非极大值抑制 / 滞后阈值处理 | Canny 包含高斯平滑、梯度计算、非极大值抑制和滞后阈值处理。 |
| frequency domain / Fourier transform / magnitude spectrum / phase spectrum / low-pass filter / high-pass filter / band-pass filter / convolution theorem | 频域 / 傅里叶变换 / 幅度谱 / 相位谱 / 低通滤波 / 高通滤波 / 带通滤波 / 卷积定理 | 频率成分描述图像在不同空间尺度上的变化。 |
| histogram equalisation / Otsu's method / foreground / background / within-class variance / between-class variance | 直方图均衡化 / Otsu 方法 / 前景 / 背景 / 类内方差 / 类间方差 | 直方图均衡化用于调整对比度；Otsu 方法按方差准则自动选择分割阈值。 |
| corner detection / structure tensor / second-moment matrix / blob detection / scale space | 角点检测 / 结构张量 / 二阶矩矩阵 / 斑点检测 / 尺度空间 | 结构张量的特征值可区分平坦区域、边缘和角点。 |
| scale-invariant feature transform (SIFT) / speeded-up robust features (SURF) / oriented FAST and rotated BRIEF (ORB) / histogram of oriented gradients (HOG) | 尺度不变特征变换 / 加速稳健特征 / 定向 FAST 与旋转 BRIEF / 方向梯度直方图 | 保留 SIFT、SURF、ORB、HOG 缩写；feature descriptor 统一译为“特征描述子”。 |
| Gaussian pyramid / Laplacian pyramid / feature pyramid network | 高斯金字塔 / 拉普拉斯金字塔 / 特征金字塔网络 | 高斯金字塔逐层模糊并下采样；拉普拉斯金字塔记录相邻尺度间的细节差异。 |
| convolutional neural network (CNN) / feature map / receptive field / max pooling / classifier head / depthwise separable convolution / gradient-weighted class activation mapping (Grad-CAM) / feature inversion / neural style transfer | 卷积神经网络 / 特征图 / 感受野 / 最大池化 / 分类头 / 深度可分离卷积 / 梯度加权类激活映射 / 特征反演 / 神经风格迁移 | 保留 CNN、Grad-CAM 缩写；在卷积网络语境中使用固定译法。 |
| object detection / bounding box / intersection over union (IoU) / average precision (AP) / mean average precision (mAP) / non-maximum suppression (NMS) | 目标检测 / 边界框 / 交并比 / 平均精度 / 平均精度均值 / 非极大值抑制 | 检测评估语境中固定使用这些译法；真阳性、假阳性、假阴性沿用统计术语表。 |
| region proposal / Region Proposal Network (RPN) / Region of Interest (RoI) pooling / RoIAlign / anchor box / objectness score / anchor-free detection / centerness | 候选区域提议 / 区域提议网络 / 感兴趣区域池化 / RoIAlign / 锚框 / 目标性分数 / 无锚框检测 / 中心度 | 模型名和缩写保留原文；RoI pooling 与 RoIAlign 是不同操作。 |
| semantic segmentation / instance segmentation / panoptic segmentation / segmentation mask / fully convolutional network (FCN) / transposed convolution / skip connection / encoder-decoder | 语义分割 / 实例分割 / 全景分割 / 分割掩码 / 全卷积网络 / 转置卷积 / 跳跃连接 / 编码器—解码器 | 用“thing 类”指可逐个计数的对象类别，用“stuff 类”指连续区域类别。 |
| focal loss / atrous (dilated) convolution / Atrous Spatial Pyramid Pooling (ASPP) / Conditional Random Field (CRF) / panoptic quality (PQ) / segmentation quality (SQ) / recognition quality (RQ) | 焦点损失 / 空洞卷积 / 空洞空间金字塔池化 / 条件随机场 / 全景质量 / 分割质量 / 识别质量 | 空洞卷积也称膨胀卷积；保留 ASPP、CRF、PQ、SQ、RQ 缩写。 |
| spatial path / context path / real-time segmentation / dual-resolution network | 空间路径 / 上下文路径 / 实时分割 / 双分辨率网络 | BiSeNet 与 DDRNet 语境下使用固定译法。 |
| Vision Transformer (ViT) / image patch / patch embedding / position embedding / inductive bias / translation equivariance / shifted window / spatial-reduction attention | 视觉 Transformer / 图像块 / 图像块嵌入 / 位置嵌入 / 归纳偏置 / 平移等变性 / 移位窗口 / 空间缩减注意力 | ViT 与 Swin 等视觉 Transformer 语境使用固定译法。 |
| self-supervised visual learning / contrastive learning / positive pair / negative pair / momentum encoder / exponential moving average (EMA) / masked image modelling / masked autoencoder (MAE) | 自监督视觉学习 / 对比学习 / 正样本对 / 负样本对 / 动量编码器 / 指数移动平均 / 掩码图像建模 / 掩码自编码器 | 保留 SimCLR、MoCo、BYOL、DINO、MAE、BEiT 等模型名和缩写。 |
| generative adversarial network (GAN) / generator / discriminator / mode collapse / spectral normalisation / progressive growing / feature matching / style-based generator / mapping network / adaptive instance normalisation (AdaIN) | 生成对抗网络 / 生成器 / 判别器 / 模式坍塌 / 谱归一化 / 渐进式增长 / 特征匹配 / 风格生成器 / 映射网络 / 自适应实例归一化 | GAN 及相关技术使用固定译法；StyleGAN 保留原名。 |
| variational autoencoder (VAE) / evidence lower bound (ELBO) / diffusion model / forward process / reverse process / noise schedule / score function / score-based model / Denoising Diffusion Probabilistic Models (DDPM) / Denoising Diffusion Implicit Models (DDIM) / stochastic differential equation (SDE) | 变分自编码器 / 证据下界 / 扩散模型 / 前向过程 / 反向过程 / 噪声调度 / 得分函数 / 基于得分的模型 / 去噪扩散概率模型 / 去噪扩散隐式模型 / 随机微分方程 | 保留 VAE、ELBO、DDPM、DDIM、SDE 缩写；CFG 使用本表已有“无分类器引导”。 |
| flow matching / continuous normalising flow (CNF) / velocity field / ordinary differential equation (ODE) / optimal transport (OT) / rectified flow / reparameterisation trick / Langevin dynamics | 流匹配 / 连续归一化流 / 速度场 / 常微分方程 / 最优传输 / 整流流 / 重参数化技巧 / Langevin 动力学 | 保留 CNF、ODE、OT 缩写及 Langevin 人名；用“整流流”指 Rectified Flow。 |
| video / frame / temporal dimension / optical flow / brightness constancy assumption / optical flow constraint equation | 视频 / 帧 / 时间维度 / 光流 / 亮度恒定假设 / 光流约束方程 | 光流描述连续帧之间像素的表观位移。 |
| Lucas–Kanade method / Farnebäck method / dense optical flow / two-stream network / 3D convolution / spatiotemporal feature / divided attention | Lucas–Kanade 方法 / Farnebäck 方法 / 稠密光流 / 双流网络 / 3D 卷积 / 时空特征 / 分解注意力 | 专有方法名保留原文拼写；TimeSformer 的 divided attention 固定译为“分解注意力”。 |
| action recognition / temporal action detection / video object tracking / Kalman filter / Hungarian algorithm / bipartite assignment / appearance embedding | 动作识别 / 时间动作检测 / 视频目标跟踪 / 卡尔曼滤波器 / 匈牙利算法 / 二分图指派 / 外观嵌入 | 跟踪语境中的 track 译为“轨迹”；检测任务中的 tracking 译为“跟踪”。 |
| stereo depth / monocular depth estimation / baseline / disparity / point cloud / neural radiance field (NeRF) / volume rendering / transmittance | 双目深度 / 单目深度估计 / 基线 / 视差 / 点云 / 神经辐射场 / 体渲染 / 透射率 | 深度估计和体渲染语境使用固定译法；颜色与视角相关时依语境说明。 |
| 3D Gaussian Splatting / splat / simultaneous localisation and mapping (SLAM) / visual odometry / essential matrix / bundle adjustment / loop closure / LiDAR SLAM | 三维高斯泼溅 / 泼溅基元 / 同步定位与建图 / 视觉里程计 / 本质矩阵 / 束调整 / 回环检测 / LiDAR SLAM | 保留 SLAM、LiDAR 等缩写；回环检测指识别相机重访已建图位置并校正漂移。 |
| visual-inertial SLAM / pose estimation / body pose / keypoint / part affinity field / top-down / bottom-up / scene reconstruction / foveated rendering / reprojection | 视觉惯性 SLAM / 姿态估计 / 人体姿态 / 关键点 / 部件亲和场 / 自顶向下 / 自底向上 / 场景重建 / 注视点渲染 / 重投影 | 姿态估计和 VR/AR 渲染语境使用固定译法。 |

## 音频与语音处理常用术语

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| sound / pressure wave / waveform / pure tone / amplitude / frequency / phase / period / pitch / fundamental frequency / harmonic / timbre / decibel / sound pressure level | 声音 / 压力波 / 波形 / 纯音 / 振幅 / 频率 / 相位 / 周期 / 音高 / 基频 / 谐波 / 音色 / 分贝 / 声压级 | 振幅是信号量；响度是主观感知，不要互换。 |
| continuous signal / sampling / sample rate / Nyquist–Shannon sampling theorem / Nyquist frequency / aliasing / anti-aliasing filter / quantisation / quantiser / quantisation noise / companding | 连续信号 / 采样 / 采样率 / 奈奎斯特–香农采样定理 / 奈奎斯特频率 / 混叠 / 抗混叠滤波器 / 量化 / 量化器 / 量化噪声 / 压扩 | 统计学 sampling 仍译为“抽样”；信号处理语境译为“采样”。 |
| time-domain analysis / frequency-domain analysis / energy / zero-crossing rate (ZCR) / autocorrelation / pitch detection / Discrete Fourier Transform (DFT) / Fast Fourier Transform (FFT) / power spectrum / magnitude spectrum / spectrogram | 时域分析 / 频域分析 / 能量 / 过零率 / 自相关 / 音高检测 / 离散傅里叶变换 / 快速傅里叶变换 / 功率谱 / 幅度谱 / 频谱图 | 保留 ZCR、DFT、FFT 缩写。 |
| mel scale / mel filterbank / Mel-Frequency Cepstral Coefficients (MFCCs) / pre-emphasis / framing / windowing / Discrete Cosine Transform (DCT) / cepstrum / formant / delta / delta-delta | 梅尔刻度 / 梅尔滤波器组 / 梅尔频率倒谱系数 / 预加重 / 分帧 / 加窗 / 离散余弦变换 / 倒谱 / 共振峰 / 一阶差分 / 二阶差分 | 保留 MFCC、DCT 缩写；framing 译为“分帧”，hop size 译为“帧移”。 |
| spectral leakage / frequency resolution / rectangular window / Hamming window / Hann window / Blackman window / main lobe / sidelobe / overlap-add (OLA) / Short-Time Fourier Transform (STFT) / inverse STFT (iSTFT) / hop size / Gabor limit | 谱泄漏 / 频率分辨率 / 矩形窗 / 汉明窗 / 汉宁窗 / 布莱克曼窗 / 主瓣 / 旁瓣 / 重叠相加 / 短时傅里叶变换 / 逆短时傅里叶变换 / 帧移 / Gabor 极限 | 保留 OLA、STFT、iSTFT 缩写；Hann window 不译作 Hanning 窗。 |
| filter / frequency response / low-pass filter / high-pass filter / band-pass filter / band-stop (notch) filter / Finite Impulse Response (FIR) / Infinite Impulse Response (IIR) / tap / transfer function / pole / zero / z-transform / convolution theorem | 滤波器 / 频率响应 / 低通滤波器 / 高通滤波器 / 带通滤波器 / 带阻（陷波）滤波器 / 有限冲激响应 / 无限冲激响应 / 抽头 / 传递函数 / 极点 / 零点 / z 变换 / 卷积定理 | 保留 FIR、IIR 缩写；“零点”不要误作数字 0。 |
| automatic speech recognition (ASR) / acoustic model / pronunciation lexicon / language model / decoder / feature frame | 自动语音识别 / 声学模型 / 发音词典 / 语言模型 / 解码器 / 特征帧 | ASR 流水线中使用固定译法；pronunciation model 指发音词典或发音模型，依原文结构选择。 |
| phoneme / context-dependent phoneme / triphone / senone / coarticulation | 音位 / 上下文相关音位 / 三音素 / 三音素状态类 / 协同发音 | 计算语音学沿用“音位”；triphone 译为“三音素”；senone 指经聚类得到的上下文相关 HMM 状态类，首次出现可保留英文。 |
| Gaussian mixture model (GMM) / hidden Markov model (HMM) / emission probability / Baum–Welch algorithm / Viterbi algorithm | 高斯混合模型 / 隐马尔可夫模型 / 发射概率 / 鲍姆–韦尔奇算法 / 维特比算法 | 与第 05 章概率和 HMM 术语保持一致；GMM-HMM、DNN-HMM 保留缩写。 |
| weighted finite-state transducer (WFST) / end-to-end ASR / connectionist temporal classification (CTC) / blank symbol / forward-backward algorithm | 加权有限状态转换器 / 端到端 ASR / 连接主义时间分类 / 空白符号 / 前向—后向算法 | 保留 WFST、ASR、CTC 缩写；CTC blank 统一译为“空白符号”，不译为“令牌”。 |
| RNN-Transducer (RNN-T) / prediction network / joint network / Listen, Attend and Spell (LAS) / Conformer | RNN Transducer / 预测网络 / 联合网络 / Listen, Attend and Spell / Conformer | 模型与架构名称保留英文；LAS 的 Listener、Speller 可在组件首次出现时保留英文括注。 |
| shallow fusion / deep fusion / cold fusion / N-best rescoring / internal language model estimation (ILME) | 浅层融合 / 深层融合 / 冷融合 / N-best 重打分 / 内部语言模型估计 | 语言模型集成语境使用固定译法；rescoring 译为“重打分”，不可误写为供首轮解码使用。 |
| streaming ASR / offline ASR / chunked attention / lookahead / algorithmic latency / computational latency / endpointer latency / first-token latency / finalization latency | 流式 ASR / 离线 ASR / 分块注意力 / 前瞻 / 算法延迟 / 计算延迟 / 端点检测延迟 / 首个词元延迟 / 最终确认延迟 | 语音识别部署与延迟分析语境使用固定译法。 |
| word error rate (WER) / character error rate (CER) / word information lost (WIL) / word information preserved (WIP) / real-time factor (RTF) | 词错误率 / 字符错误率 / 词信息损失率 / 词信息保留率 / 实时因子 | 保留 WER、CER、WIL、WIP、RTF 缩写；WER、CER 按各自的词或字符单位计算。 |
| speed perturbation / SpecAugment / room impulse response / word piece / byte-level BPE / tokenisation | 速度扰动 / SpecAugment / 房间脉冲响应 / 子词单元 / 字节级 BPE / 词元化 | ASR 输出单位按“字符、子词单元、词语或音位”说明；模型处理的 token 仍译为“词元”。 |

### TTS、语音克隆与语音活动检测

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| text-to-speech (TTS) / text normalisation / grapheme-to-phoneme conversion (G2P) / mel spectrogram / vocoder | 文本转语音 / 文本规范化 / 字素到音位转换 / 梅尔频谱图 / 声码器 | 保留 TTS、G2P 缩写；mel spectrogram 使用“梅尔频谱图”，与 mel filterbank（梅尔滤波器组）区分。 |
| dilated causal convolution / mu-law companding / multi-receptive field fusion (MRF) / multi-period discriminator (MPD) / multi-scale discriminator (MSD) / neural source-filter (NSF) | 空洞因果卷积 / mu-law 压扩 / 多感受野融合 / 多周期判别器 / 多尺度判别器 / 神经源—滤波器模型 | 保留 MRF、MPD、MSD、NSF 缩写；μ-law 的英文拼写按原文保留。 |
| autoregressive / non-autoregressive / duration predictor / length regulator / variance adaptor / forced alignment / location-sensitive attention | 自回归 / 非自回归 / 时长预测器 / 长度调节器 / 方差适配器 / 强制对齐 / 位置敏感注意力 | TTS 模型和对齐流程中使用固定译法。 |
| codec language model / audio codec token / enrollment audio / voice conversion / voice cloning / speaker embedding / speaker verification / multi-speaker TTS | 音频编解码器语言模型 / 音频编解码词元 / 注册语音 / 语音转换 / 语音克隆 / 说话人嵌入 / 说话人验证 / 多说话人 TTS | 语音身份相关概念统一使用“说话人”；注册语音是用于提取目标说话人特征的参考录音。 |
| few-shot voice cloning / zero-shot voice cloning / prosody modelling / Global Style Token (GST) / speaker diarisation | 少样本语音克隆 / 零样本语音克隆 / 韵律建模 / 全局风格词元 / 说话人分段 | 保留 GST 缩写；speaker diarisation 指给语音片段标注说话人及其时间边界。 |
| voice activity detection (VAD) / acoustic activity detection (AAD) / WebRTC VAD / neural VAD | 语音活动检测 / 声学活动检测 / WebRTC VAD / 神经网络 VAD | 保留 VAD、AAD 缩写；VAD 判断语音或非语音，AAD 还检测音乐、警报等其他声学事件。 |
| mean opinion score (MOS) / mel cepstral distortion (MCD) / perceptual evaluation of speech quality (PESQ) / perceptual objective listening quality analysis (POLQA) / intelligibility | 平均意见分 / 梅尔倒谱失真 / 语音质量感知评估 / 感知客观听音质量分析 / 可懂度 | 保留 MOS、MCD、PESQ、POLQA 缩写；WER 可用于评估 TTS 输出的可懂度。 |

### 说话人识别、音频分类与音乐分析

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| speaker recognition / speaker verification (SV) / speaker identification (SI) / speaker diarisation / voiceprint / speaker gallery | 说话人识别 / 说话人验证 / 说话人辨认 / 说话人分段 / 声纹 / 说话人库 | “说话人识别”是总称；verification 判断身份声明真假，identification 从候选说话人中辨认身份。 |
| enrollment embedding / test embedding / cosine similarity / false acceptance rate (FAR) / false rejection rate (FRR) / equal error rate (EER) / Detection Error Trade-off (DET) curve | 注册嵌入 / 测试嵌入 / 余弦相似度 / 误接受率 / 误拒绝率 / 等错误率 / 检测误差权衡曲线 | 验证任务中按固定译法使用；降低接受阈值会影响 FAR 与 FRR 的权衡。 |
| i-vector / d-vector / x-vector / universal background model (UBM) / supervector / total variability space / total variability matrix / Probabilistic Linear Discriminant Analysis (PLDA) | i-vector / d-vector / x-vector / 通用背景模型 / 超向量 / 总变异空间 / 总变异矩阵 / 概率线性判别分析 | 保留向量名称与 UBM、PLDA 缩写；speaker/channel variability 分别译为“说话人差异/信道差异”。 |
| Time Delay Neural Network (TDNN) / statistics pooling / attentive statistics pooling / Squeeze-Excitation (SE) / Additive Angular Margin Softmax (AAM-Softmax) | 时间延迟神经网络 / 统计池化 / 注意力统计池化 / 压缩—激励 / 加性角度间隔 Softmax | 保留 TDNN、SE、AAM-Softmax 缩写；Res2Net、ECAPA-TDNN 等架构名不翻译。 |
| agglomerative hierarchical clustering (AHC) / end-to-end neural diarisation (EEND) / permutation invariant training (PIT) | 凝聚层次聚类 / 端到端神经说话人分段 / 排列不变训练 | 说话人分段包括轮次边界及重叠语音；PIT 通过尝试不同标签排列处理说话人顺序不定的问题。 |
| audio classification / environmental sound classification (ESC) / sound event detection (SED) / acoustic scene classification (ASC) / audio embedding / audio tagging | 音频分类 / 环境声分类 / 声音事件检测 / 声学场景分类 / 音频嵌入 / 音频标注 | ESC 识别环境声音类别；SED 同时标记事件的起止时间；ASC 识别整体声学环境。 |
| Audio Spectrogram Transformer (AST) / spectrogram patch / audio tokeniser / audio fingerprinting | 音频频谱图 Transformer / 频谱图块 / 音频词元化器 / 音频指纹识别 | 保留 AST 缩写；patch 在音频频谱图语境中译为“图块”，token 仍译为“词元”。 |
| music information retrieval (MIR) / onset strength envelope / beat tracking / tempogram / chromagram / pitch class / chord recognition / music tagging | 音乐信息检索 / 起音强度包络 / 节拍跟踪 / 节拍速度图 / 音级色度图 / 音级 / 和弦识别 / 音乐标注 | chromagram 表示 12 个音级跨八度汇总后的能量；pitch class 统一译为“音级”。 |

### 声源分离、噪声控制与回声消除

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| cocktail party problem / source separation / noise cancellation / time-frequency mask / ideal binary mask (IBM) / ideal ratio mask (IRM) | 鸡尾酒会问题 / 声源分离 / 噪声消除 / 时频掩码 / 理想二值掩码 / 理想比率掩码 | IBM、IRM 按二值掩码和软掩码区分；声源分离指从混合信号中恢复各声源。 |
| beamforming / delay-and-sum beamforming / Minimum Variance Distortionless Response (MVDR) / steering vector / spatial covariance matrix / array geometry | 波束形成 / 延迟求和波束形成 / 最小方差无失真响应 / 导向矢量 / 空间协方差矩阵 / 阵列几何结构 | 保留 MVDR 缩写；MVDR 使用噪声空间协方差矩阵与导向矢量计算权重。 |
| deep clustering / temporal convolutional network (TCN) / Conv-TasNet / Dual-Path RNN (DPRNN) / intra-chunk / inter-chunk / SepFormer / permutation invariant training (PIT) | 深度聚类 / 时序卷积网络 / Conv-TasNet / 双路径 RNN / 块内 / 块间 / SepFormer / 排列不变训练 | 保留模型名和 TCN、DPRNN、PIT 缩写；块内与块间路径分别沿块内位置和块索引建模。 |
| scale-invariant signal-to-distortion ratio (SI-SDR) / signal-to-distortion ratio (SDR) / BSS Eval | 尺度不变信号失真比 / 信号失真比 / BSS Eval | SI-SDR 用于声源分离评估；保留 SI-SDR、SDR 缩写与 BSS Eval 名称。 |
| active noise cancellation (ANC) / anti-noise / feedforward ANC / feedback ANC / adaptive filter / least mean squares (LMS) / normalised LMS (NLMS) / recursive least squares (RLS) / forgetting factor | 主动降噪 / 反噪声 / 前馈 ANC / 反馈 ANC / 自适应滤波器 / 最小均方 / 归一化最小均方 / 递归最小二乘 / 遗忘因子 | 保留 ANC、LMS、NLMS、RLS 缩写；ANC 通过反噪声与目标噪声相消。 |
| speech enhancement / spectral subtraction / over-subtraction factor / spectral floor / musical noise / Wiener filter / Wiener gain / a priori SNR / decision-directed method | 语音增强 / 谱减法 / 过减因子 / 频谱下限 / 音乐噪声 / 维纳滤波 / 维纳增益 / 先验信噪比 / 判决导向法 | 语音增强从含噪语音中恢复语音；音乐噪声指谱减后残留的孤立音调伪影。 |
| acoustic echo cancellation (AEC) / room impulse response / double-talk detection / far-end / near-end / normalised cross-correlation | 声学回声消除 / 房间脉冲响应 / 双讲检测 / 远端 / 近端 / 归一化互相关 | AEC 估计并消除扬声器至麦克风的回声；双讲指远端和近端同时有人说话。 |
| Deep Complex Convolutional Recurrent Network (DCCRN) / FullSubNet / Deep Noise Suppression (DNS) Challenge / Perceptual Evaluation of Speech Quality (PESQ) / Short-Time Objective Intelligibility (STOI) / DNSMOS | 深度复数卷积循环网络 / FullSubNet / 深度噪声抑制挑战赛 / 语音质量感知评估 / 短时客观可懂度 / DNSMOS | 保留 DCCRN、PESQ、STOI、DNSMOS 缩写及 FullSubNet 名称。 |

## 多模态学习与跨模态对齐术语

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| modality / multimodal learning / multimodal representation / early fusion / middle fusion / late fusion / feature-level fusion / intermediate fusion / decision-level fusion / cross-attention | 模态 / 多模态学习 / 多模态表示 / 早期融合 / 中间融合 / 晚期融合 / 特征级融合 / 中层融合 / 决策级融合 / 交叉注意力 | middle fusion 也称 intermediate fusion；feature-level fusion 对应 early fusion，decision-level fusion 对应 late fusion。 |
| joint embedding space / image encoder / text encoder / embedding / cosine similarity / $L_2$ normalisation / zero-shot transfer / zero-shot classification | 联合嵌入空间 / 图像编码器 / 文本编码器 / 嵌入 / 余弦相似度 / $L_2$ 归一化 / 零样本迁移 / 零样本分类 | 同一共享空间内的不同模态嵌入可直接计算相似度；模型名 CLIP、ALIGN、SigLIP、ImageBind 保留原文。 |
| contrastive learning / positive pair / negative pair / augmented view / anchor / query / key / hard negative / semi-hard negative / hard negative mining / prompt engineering / prompt ensembling | 对比学习 / 正样本对 / 负样本对 / 增强视图 / 锚点 / 查询 / 键 / 困难负样本 / 半困难负样本 / 困难负样本挖掘 / 提示词设计 / 提示词集成 | 在对比学习中，anchor 译为“锚点”，query/key 译为“查询/键”；提示词集成指平均多个模板得到的文本嵌入。 |
| InfoNCE / NT-Xent / triplet loss / margin / temperature / symmetric cross-entropy / sigmoid loss | InfoNCE / NT-Xent / 三元组损失 / 间隔 / 温度 / 对称交叉熵 / sigmoid 损失 | 保留 InfoNCE、NT-Xent 名称；temperature 指对比损失中的温度参数。 |
| image-text retrieval / text-to-image retrieval / image-to-text retrieval / Recall@K / median rank (MedR) / linear probe / zero-shot benchmark | 图文检索 / 文本到图像检索 / 图像到文本检索 / 召回率@K / 中位排名 / 线性探测 / 零样本基准测试 | Recall@K 衡量正确匹配是否出现在前 K 个结果中；MedR 越低越好。 |
| audio-visual correspondence learning / Audio-Visual Embedding (AVE) / sound source localisation / log-mel spectrogram | 音视频对应学习 / 音视频嵌入 / 声源定位 / 对数梅尔频谱图 | AVE 使用音视频正负样本对进行对比学习；保留 AVE 缩写。 |
| vision-language model (VLM) / visual question answering (VQA) / image captioning / few-shot learning / visual instruction tuning | 视觉语言模型 / 视觉问答 / 图像描述 / 少样本学习 / 视觉指令微调 | 保留 VLM、VQA 缩写；few-shot learning 统一译为“少样本学习”。 |
| visual grounding / referring expression / referring expression comprehension / referring expression segmentation / phrase grounding / pointing | 视觉定位 / 指代表达 / 指代表达理解 / 指代表达分割 / 短语定位 / 点式定位 | 视觉语言任务使用“视觉定位”和“指代表达”；pointing 指输出单点的位置预测。 |
| visual token / visual token pipeline / Perceiver Resampler / gated cross-attention layer / Q-Former | 视觉词元 / 视觉词元处理流程 / Perceiver Resampler / 门控交叉注意力层 / Q-Former | token 依上下文译为“词元”；架构名称保留原文。 |
| image-text contrastive loss (ITC) / image-text matching (ITM) / OCR-free document understanding / screenshot parsing / variable-resolution input processing | 图文对比损失 / 图文匹配 / 无 OCR 文档理解 / 截图解析 / 可变分辨率输入处理 | 保留 ITC、ITM 缩写；OCR-free 统一写作“无 OCR”。 |
| image and video tokenisation / tokeniser / codebook / codebook entry / codebook utilisation / codebook collapse | 图像与视频词元化 / 词元化器 / 码本 / 码本条目 / 码本利用率 / 码本坍塌 | codebook 指用于离散化潜向量的嵌入向量集合；码本坍塌指模型只使用其中少数条目。 |
| vector quantisation / residual quantisation / product quantisation / finite scalar quantisation (FSQ) / soft quantisation | 向量量化 / 残差量化 / 乘积量化 / 有限标量量化 / 软量化 | 保留 FSQ 缩写；依量化方法区分码本查找、逐级残差编码、子向量编码和标量舍入。 |
| straight-through estimator / stop-gradient operator / reconstruction loss / codebook loss / commitment loss / EMA codebook update | 直通估计器 / 停止梯度算子 / 重建损失 / 码本损失 / 承诺损失 / 码本 EMA 更新 | VQ-VAE 语境使用固定译法；承诺损失促使编码器输出靠近码本向量。 |
| image token grid / temporal compression / causal video tokeniser / spatiotemporal feature / causal convolution / raster scan order | 图像词元网格 / 时间压缩 / 因果视频词元化器 / 时空特征 / 因果卷积 / 光栅扫描顺序 | 图像和视频生成、编码语境使用固定译法。 |
| lookup-free quantisation / Gumbel-Softmax / masked image modelling / temporal interpolation token / vocabulary balance | 查表自由量化 / Gumbel-Softmax / 掩码图像建模 / 时间插值词元 / 词表容量平衡 | 模型名和算法名保留原文；查表自由量化指不通过显式码本查找生成离散编码。 |

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| cross-modal generation / conditional generation / text-to-image generation / text-to-video generation / text-to-audio generation / image-to-text generation / video-audio co-generation | 跨模态生成 / 条件生成 / 文本到图像生成 / 文本到视频生成 / 文本到音频生成 / 图像到文本生成 / 视频—音频协同生成 | 根据输入模态与输出模态命名生成任务。 |
| guidance scale / cascaded diffusion / dynamic thresholding / zero convolution / spacetime patch / temporal consistency / temporal alignment loss | 引导尺度 / 级联扩散 / 动态阈值化 / 零卷积 / 时空图块 / 时间一致性 / 时间对齐损失 | 生成控制与视频建模语境使用固定译法。 |
| Frechet Inception Distance (FID) / Inception Score (IS) / CLIPScore / RefCLIPScore / Likert scale / Elo rating | Frechet Inception Distance / Inception Score / CLIPScore / RefCLIPScore / Likert 量表 / Elo 评分 | 保留指标名称和缩写；FID 越低越好，IS 越高越好。 |
| deepfake / invisible watermark / safety checker / input filtering / output filtering / safety classifier | 深度伪造 / 不可见水印 / 安全检查器 / 输入过滤 / 输出过滤 / 安全分类器 | 生成模型安全语境使用固定译法；watermark 首次出现可写作“水印”。 |

| unified multimodal architecture / any-to-any model / modality-specific encoder / shared transformer backbone / modality-specific decoder / projection layer / modality signal token / modality embedding | 统一多模态架构 / 任意到任意模型 / 模态专用编码器 / 共享 Transformer 主干 / 模态专用解码器 / 投影层 / 模态信号词元 / 模态嵌入 | any-to-any 指输入和输出都可包含任意模态组合。 |
| multimodal tokenisation / interleaved sequence / modality delimiter token / token budget / token merging / adaptive tokenisation / modality collapse | 多模态词元化 / 交错序列 / 模态分隔词元 / 词元预算 / 词元合并 / 自适应词元化 / 模态坍塌 | 描述多模态序列表示和控制词元开销的方法。 |
| staged training / unimodal pretraining / cross-modal alignment / joint multimodal pretraining / instruction tuning / modality-specific warm-up / gradient balancing / data ratio scheduling / loss weighting | 分阶段训练 / 单模态预训练 / 跨模态对齐 / 联合多模态预训练 / 指令微调 / 模态专用预热 / 梯度平衡 / 数据比例调度 / 损失加权 | 统一架构训练流程使用固定译法。 |
| multimodal chain-of-thought (CoT) / observe-reason-act cycle / embodied agent / world model / model-based reinforcement learning / interactive world model / perceptual aliasing / Joint Embedding Predictive Architecture (JEPA) | 多模态思维链 / 观察—推理—行动循环 / 具身智能体 / 世界模型 / 基于模型的强化学习 / 交互式世界模型 / 感知混叠 / 联合嵌入预测架构 | JEPA 在嵌入空间预测未来状态；perceptual aliasing 指不同观测对应相同语义状态。 |

## 自主系统感知术语

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| LiDAR / spinning LiDAR / solid-state LiDAR / radar / ultrasonic sensor / inertial measurement unit (IMU) / global navigation satellite system (GNSS) / real-time kinematic GPS (RTK-GPS) | 激光雷达 / 旋转式激光雷达 / 固态激光雷达 / 雷达 / 超声波传感器 / 惯性测量单元 / 全球导航卫星系统 / 实时动态 GPS | 首次出现时给出 LiDAR、IMU、GNSS 和 RTK-GPS 缩写。 |
| intrinsic calibration / extrinsic calibration / temporal calibration / time-of-flight ranging / radial velocity / angular resolution / dead reckoning / drift | 内参标定 / 外参标定 / 时间标定 / 飞行时间测距 / 径向速度 / 角分辨率 / 航位推算 / 漂移 | 传感器标定、测距和惯性定位语境使用固定译法。 |
| sensor fusion / early fusion / mid-level fusion / late fusion / bird's-eye view (BEV) / RGB-D representation | 传感器融合 / 早期融合 / 中层融合 / 晚期融合 / 鸟瞰图 / RGB-D 表示 | 按融合发生在原始数据、中间特征或最终决策层区分早期、中层和晚期融合。 |
| occupancy network / occupancy grid / voxel / log-odds / stereo matching / monocular depth estimation | 占用网络 / 占用栅格 / 体素 / 对数几率 / 双目匹配 / 单目深度估计 | 对数几率用于累积占用栅格的贝叶斯证据。 |
| lane geometry / road topology / semantic map / point cloud registration / neural implicit representation / novel view synthesis | 车道几何 / 道路拓扑 / 语义地图 / 点云配准 / 神经隐式表示 / 新视角合成 | 车道规划、地图构建和场景表示语境使用固定译法。 |

## 自主系统机器人学习术语

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| robot learning / kinematics / dynamics / end-effector / forward kinematics (FK) / inverse kinematics (IK) / joint space / configuration space / task space / revolute joint / prismatic joint / Denavit–Hartenberg (DH) convention | 机器人学习 / 运动学 / 动力学 / 末端执行器 / 正运动学 (FK) / 逆运动学 (IK) / 关节空间 / 构型空间 / 任务空间 / 转动关节 / 移动关节 / Denavit–Hartenberg (DH) 参数法 | joint space 与 configuration space 在本课程此处按原文视为同义词；DH 参数依次描述连杆长度、扭角、偏距和关节角。 |
| Jacobian pseudo-inverse / singularity / damped least squares / manipulator equation / joint torque / PID control / integral wind-up / model predictive control (MPC) / impedance control / compliance | 雅可比伪逆 / 奇异位形 / 阻尼最小二乘法 / 机械臂动力学方程 / 关节力矩 / PID 控制 / 积分饱和 / 模型预测控制 (MPC) / 阻抗控制 / 柔顺性 | 奇异位形附近可用阻尼最小二乘法限制伪逆带来的过大关节变化；柔顺控制描述机器人对接触力的响应。 |
| imitation learning / learning from demonstration / behavioural cloning (BC) / distribution shift / compounding error / Dataset Aggregation (DAgger) / Action Chunking with Transformers (ACT) / Diffusion Policy | 模仿学习 / 示教学习 / 行为克隆 / 分布偏移 / 误差累积 / 数据集聚合 (DAgger) / Transformer 动作分块 / Diffusion Policy | DAgger 与 ACT 保留缩写；Diffusion Policy 保留方法名。 |
| sim-to-real gap / domain randomisation / system identification / fine-tuning / sample efficiency / latent state / mental rehearsal | 仿真到现实差距 / 域随机化 / 系统辨识 / 微调 / 样本效率 / 潜在状态 / 动作预演 | 仿真迁移、世界模型和机器人策略训练语境使用固定译法。 |
| manipulation / grasping / force closure / grasp wrench matrix / dexterous manipulation / contact-rich task / locomotion / legged locomotion / centre of mass / support polygon / Zero Moment Point (ZMP) / Central Pattern Generator (CPG) / gait / quadruped robot / humanoid robot | 操作 / 抓取 / 力封闭 / 抓取力旋量矩阵 / 灵巧操作 / 接触丰富任务 / 移动 / 足式运动 / 质心 / 支撑多边形 / 零力矩点 / 中央模式发生器 / 步态 / 四足机器人 / 人形机器人 | ZMP 与 CPG 首次出现时给出缩写；支撑多边形由地面接触点构成。 |
| constrained reinforcement learning / safety envelope / risk-aware planning | 受约束强化学习 / 安全包络 / 风险感知规划 | 安全控制语境使用固定译法。 |

## 自主系统 VLA 术语

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| vision-language-action model (VLA) / vision-language model (VLM) / language model backbone / action head / motor command | 视觉语言动作模型 (VLA) / 视觉语言模型 (VLM) / 语言模型主干 / 动作头 / 运动控制指令 | 首次出现时给出 VLA、VLM 缩写；action head 指把模型输出映射为机器人动作的模块。 |
| action tokenisation / action token / action vocabulary / uniform discretisation / bin / bin index / action dimension / action chunking / learned tokenisation / codebook index | 动作词元化 / 动作词元 / 动作词表 / 均匀离散化 / 分箱 / 分箱索引 / 动作维度 / 动作分块 / 学习式词元化 / 码本索引 | token 统一译为“词元”；bin 指动作有效范围内的离散区间。 |
| robot embodiment / embodiment-agnostic model / action space mismatch / padded action vector / per-embodiment action head / normalised action representation / robot data co-training / held-out task | 机器人形态 / 跨机器人形态模型 / 动作空间不匹配 / 填充动作向量 / 按机器人形态设置动作头 / 标准化动作表示 / 机器人数据协同训练 / 留出任务 | 用“机器人形态”指机器人本体、传感器和动作能力的组合；按上下文说明跨形态迁移。 |
| Open X-Embodiment / SIMPLER | Open X-Embodiment / SIMPLER | 数据集和基准名称保留原文。 |

## 自动驾驶术语

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| self-driving car / autonomous driving stack / ego vehicle / road agent / high-definition map (HD map) / mapless driving / online mapping / lane connectivity / drivable area | 自动驾驶汽车 / 自动驾驶栈 / 自车 / 交通参与者 / 高精地图 / 无图驾驶 / 在线建图 / 车道连接关系 / 可行驶区域 | 车辆预测与规划语境使用固定译法；online mapping 译为“在线建图”。 |
| scene context / predicted trajectory / trajectory forecasting / minimum Average Displacement Error (minADE) / social force model / goal-conditioned prediction | 场景上下文 / 预测轨迹 / 轨迹预测 / 最小平均位移误差 / 社会力模型 / 目标条件预测 | 保留 minADE 缩写；该指标在多条候选轨迹中取误差最小者。 |
| rule-based planner / optimisation-based planner / progress cost / comfort cost / safety cost / jerk / end-to-end driving / occupancy prediction / bird's-eye view (BEV) / world model / counterfactual evaluation | 基于规则的规划器 / 基于优化的规划器 / 进度代价 / 舒适度代价 / 安全代价 / 加速度变化率 / 端到端驾驶 / 占用预测 / 鸟瞰图 / 世界模型 / 反事实评估 | jerk 指加速度对时间的导数；BEV 首次出现时给出缩写。 |
| open-loop evaluation / closed-loop evaluation / neural closed-loop simulation / scenario generation | 开环评估 / 闭环评估 / 神经闭环仿真 / 场景生成 | 闭环评估中，模型动作会改变后续仿真状态。 |
| ISO 26262 / Automotive Safety Integrity Level (ASIL) / Safety of the Intended Functionality (SOTIF) / Operational Design Domain (ODD) / fail-safe / fail-operational / redundancy / SAE J3016 / driving automation level | ISO 26262 / 汽车安全完整性等级 (ASIL) / 预期功能安全 (SOTIF) / 运行设计域 (ODD) / 故障安全 / 故障运行 / 冗余 / SAE J3016 / 驾驶自动化等级 | 标准、等级和缩写保留原文；ODD 指系统被设计为可运行的条件范围。 |

## 极端环境机器人术语

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| space robotics / planetary rover / sol / ground-in-the-loop planning / AutoNav / traversability / orbital servicing / proximity operations / pose estimation / Terrain Relative Navigation (TRN) | 空间机器人 / 行星探测车 / 火星日 / 地面人员参与的规划 / AutoNav / 可通行性 / 轨道服务 / 近距离操作 / 位姿估计 / 地形相对导航 | sol 指火星日；保留 AutoNav 名称和 TRN 缩写。 |
| communication delay / communication window / onboard autonomy / radiation-hardened processor / single-event upset (SEU) / total ionising dose (TID) / latch-up / triple modular redundancy (TMR) / commercial off-the-shelf (COTS) / graceful degradation | 通信延迟 / 通信窗口 / 星载自主 / 抗辐射处理器 / 单粒子翻转 / 总电离剂量 / 闩锁效应 / 三模冗余 / 商用现成 (COTS) / 渐进退化 | 太空任务计算和通信语境使用固定译法。 |
| terrain classification / visual-inertial odometry (VIO) / Extended Kalman Filter (EKF) / factor graph / IMU bias / autonomous underwater vehicle (AUV) / remotely operated vehicle (ROV) / acoustic communication / Doppler Velocity Log (DVL) / dead reckoning / underwater SLAM | 地形分类 / 视觉惯性里程计 / 扩展卡尔曼滤波器 / 因子图 / IMU 偏置 / 自主水下航行器 / 遥控水下机器人 / 声学通信 / 多普勒测速仪 / 航位推算 / 水下 SLAM | 首次出现时保留 VIO、EKF、AUV、ROV 和 DVL 缩写。 |
| search-and-rescue robotics / multi-robot coordination / frontier-based exploration / swarm robotics / decentralised control / consensus algorithm / algebraic connectivity / flocking / separation / alignment / cohesion | 搜索与救援机器人 / 多机器人协同 / 前沿探索 / 群体机器人 / 去中心化控制 / 一致性算法 / 代数连通度 / 群集运动 / 分离 / 对齐 / 内聚 | frontier 指已探索区域与未探索区域的边界；一致性收敛到全局平均需要满足图和权重条件。 |
| human-robot interaction (HRI) / shared autonomy / teleoperation / virtual fixture / trust calibration / legible motion / motion legibility | 人机交互 / 共享自主 / 遥操作 / 虚拟夹具 / 信任校准 / 运动可读性 | legibility 指观察者能否从机器人运动中推断其目标。 |

## 几何深度学习术语

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| geometric deep learning / symmetry / symmetry group / group action / group element | 几何深度学习 / 对称性 / 对称群 / 群作用 / 群元素 | 变换使对象保持不变时称为该对象的对称变换。 |
| translation group / symmetric group / permutation group / rotation group / Euclidean group / special Euclidean group | 平移群 / 对称群（置换群） / 置换群 / 旋转群 / 欧几里得群 / 特殊欧几里得群 | $S_n$ 译为“对称群”或“置换群”；描述节点重排时使用“节点置换”。translation 是“平移”，不要译作“翻译”。 |
| invariant / invariance / equivariant / equivariance | 不变 / 不变性 / 等变 / 等变性 | equivariance 统一译为“等变性”，不用“同变性”“等价性”或“同态性”；平移等变性、排列不变性按固定译法使用。 |
| manifold / mesh / diffeomorphism / intrinsic operator / Laplace–Beltrami operator | 流形 / 网格 / 微分同胚 / 内蕴算子 / 拉普拉斯–贝尔特拉米算子 | 区分流形与网格；微分同胚指光滑且可逆的映射，其逆映射也光滑。 |
| scale separation / coarsening / pooling / supernode / receptive field | 尺度分离 / 粗化 / 池化 / 超节点 / 感受野 | coarsening 是逐层形成较粗表示；图池化通过聚合节点构造较小的图。 |
| DeepSets / permutation invariance / permutation equivariance | DeepSets / 排列不变性 / 排列等变性 | DeepSets 保留方法名称；集合级输出通常不变，节点级或元素级输出可随排列等变。 |
| graph / node / vertex / edge / adjacency matrix / graph type / feature vector / edge feature | 图 / 节点 / 顶点 / 边 / 邻接矩阵 / 图的类型 / 特征向量 / 边特征 | node 与 vertex 在图论语境中指同一概念，正文统一称“节点”；邻接矩阵 $A_{ij}$ 表示节点 $i$ 到节点 $j$ 的边。 |
| adjacency list / breadth-first search (BFS) / depth-first search (DFS) / multi-source BFS / indegree / topological sort / Dijkstra's algorithm / Bellman–Ford algorithm / strongly connected component (SCC) / Kosaraju's algorithm / transposed graph | 邻接表 / 广度优先搜索 / 深度优先搜索 / 多源 BFS / 入度 / 拓扑排序 / Dijkstra 算法 / Bellman–Ford 算法 / 强连通分量 / Kosaraju 算法 / 转置图 | BFS、DFS、SCC 可保留缩写；Dijkstra 的边权必须非负；拓扑排序适用于有向无环图。 |
| comparison sort / stable sort / bubble sort / insertion sort / merge sort / quicksort / heap sort / pivot / partition / counting sort / radix sort / lower bound / binary search / search on answer | 比较排序 / 稳定排序 / 冒泡排序 / 插入排序 / 归并排序 / 快速排序 / 堆排序 / 基准值 / 分区 / 计数排序 / 基数排序 / 下界 / 二分查找 / 答案二分 | 比较排序的 $Ω(n \log n)$ 下界不适用于计数排序、基数排序等非比较排序；lower bound 在查找语境中表示首个不小于目标值的位置。 |
| greedy algorithm / greedy choice property / merge intervals / dynamic programming / longest common subsequence / 0/1 knapsack / unbounded knapsack / backtracking | 贪心算法 / 贪心选择性质 / 合并区间 / 动态规划 / 最长公共子序列 / 0/1 背包 / 完全背包 / 回溯 | 贪心算法需要证明局部选择能导出全局最优；0/1 背包的一维状态需逆序更新，完全背包通常正序更新。 |
| command line / terminal / shell / pipe / redirection / standard output (stdout) / standard error (stderr) / file descriptor | 命令行 / 终端 / shell / 管道 / 重定向 / 标准输出 / 标准错误 / 文件描述符 | shell 是读取并执行命令的程序；管道传递标准输出，标准错误是否合并需显式重定向。 |
| environment variable / package manager / virtual environment / process identifier (PID) / signal / SSH / public key / private key / port forwarding / secure copy (SCP) / rsync | 环境变量 / 包管理器 / 虚拟环境 / 进程 ID / 信号 / SSH / 公钥 / 私钥 / 端口转发 / 安全复制 / rsync | SSH 使用加密连接；密钥认证需预先配置，环境变量和配置文件不应泄露密钥。 |
| working directory / staging area / index / repository / commit / branch / merge / fast-forward / rebase / merge conflict / pull request / code review / .gitignore | 工作目录 / 暂存区 / 索引 / 仓库 / 提交 / 分支 / 合并 / 快进 / 变基 / 合并冲突 / 合并请求 / 代码审查 / .gitignore | commit 指向项目快照；rebase 会重写提交哈希，不应改写他人已基于其开展工作的共享提交。 |
| Git LFS / Data Version Control (DVC) / experiment tracking / reproducibility / commit hash / artifact | Git 大文件存储 / 数据版本控制 / 实验跟踪 / 可复现性 / 提交哈希 / 产物 | Git LFS 和 DVC 将大文件或数据版本与普通源代码提交分开管理；仅保存随机种子不足以保证完整可复现。 |
| codebase / monorepo / multi-repo / single responsibility principle / Don't Repeat Yourself (DRY) / premature abstraction / dependency injection | 代码库 / 单仓库 / 多仓库 / 单一职责原则 / 不要重复自己 / 过早抽象 / 依赖注入 | DRY 不意味着应为只出现一次的代码创建抽象；抽象应降低实际维护成本。 |
| factory pattern / strategy pattern / observer pattern / callback / configuration management / structured logging / REST API / gRPC / editable install / dependency pinning | 工厂模式 / 策略模式 / 观察者模式 / 回调 / 配置管理 / 结构化日志 / REST API / gRPC / 可编辑安装 / 依赖锁定 | 结构化日志需配置格式化器或处理器输出 JSON；异步接口不保证 CPU/GPU 密集推理自动提速。 |
| AI coding agent / prompt / quality gate / type checking / linting / continuous integration (CI) | AI 编码智能体 / 提示词 / 质量门禁 / 类型检查 / 代码检查 / 持续集成 | 智能体生成内容需核对需求、API 和运行结果；测试和类型工具不能替代人工审查。 |
| test pyramid / unit test / integration test / end-to-end test / fixture / parameterised test / mocking / patching / deterministic seed / numerical tolerance / pre-commit hook / formatter | 测试金字塔 / 单元测试 / 集成测试 / 端到端测试 / 测试夹具 / 参数化测试 / 模拟 / 打补丁 / 确定性随机种子 / 数值容差 / 提交前钩子 / 格式化器 | 设定随机种子不保证跨硬件、库版本或非确定性算子复现；测试通过只覆盖已编写的断言。 |
| container image / layer caching / multi-stage build / GPU passthrough / model serving / dynamic batching / model registry / experiment artifact | 容器镜像 / 分层缓存 / 多阶段构建 / GPU 透传 / 模型服务 / 动态批处理 / 模型注册表 / 实验产物 | GPU 容器依赖主机驱动和容器运行时；动态批处理受批大小、等待时间和负载影响。 |
| concept drift / data drift / training-serving skew / feature store / online feature / offline feature / latency percentile / throughput / error rate / pipeline orchestration / directed acyclic graph (DAG) | 概念漂移 / 数据漂移 / 训练—服务偏差 / 特征库 / 在线特征 / 离线特征 / 延迟百分位数 / 吞吐量 / 错误率 / 流水线编排 / 有向无环图 | 概念漂移指输入与目标关系变化；数据漂移指输入分布变化；漂移告警需结合标签和模型指标解释。 |
| explicit label / implicit label / programmatic labelling / active learning / training-serving skew / feature freshness | 显式标签 / 隐式标签 / 程序化标注 / 主动学习 / 训练—服务偏差 / 特征新鲜度 | 隐式反馈可能带有选择偏差；主动学习的标签效率取决于采样策略和标注质量。 |
| offline evaluation / online evaluation / A/B testing / control group / treatment group / guardrail metric / interleaving | 离线评估 / 在线评估 / A/B 测试 / 对照组 / 实验组 / 护栏指标 / 交错实验 | 在线实验需随机化并按统计功效确定样本量；影子部署不直接改变用户实际看到的结果。 |
| demographic parity / equal opportunity / group calibration / fairness metric / slice-based evaluation | 人口统计均等 / 机会均等 / 分组校准 / 公平性指标 / 分组评估 | 不同公平性指标表达不同目标，可能相互冲突；需结合任务、群体定义和业务约束解释。 |
| degree / degree matrix / path / walk / shortest path / connected graph / connected component / diameter / cycle / tree | 度 / 度矩阵 / 路径 / 游走 / 最短路径 / 连通图 / 连通分量 / 直径 / 环 / 树 | adjacency matrix 的幂统计允许重复经过节点或边的游走数；树指连通且无环的无向图。 |
| centrality / degree centrality / betweenness centrality / eigenvector centrality / graph Laplacian / normalised Laplacian / algebraic connectivity | 中心性 / 度中心性 / 介数中心性 / 特征向量中心性 / 图拉普拉斯矩阵 / 归一化图拉普拉斯矩阵 / 代数连通度 | 图拉普拉斯矩阵 $L=D-A$ 用于无向图；第二小特征值称代数连通度，也称 Fiedler 值。 |
| spectral graph theory / graph spectrum / Graph Fourier Transform (GFT) / spectral clustering / Fiedler vector / modularity / community detection | 谱图理论 / 图的谱 / 图傅里叶变换 / 谱聚类 / Fiedler 向量 / 模块度 / 社区检测 | 图拉普拉斯特征值对应图频率；GFT 首次出现时保留缩写；Fiedler 向量的正负号可整体翻转。 |
| undirected graph / directed graph / weighted graph / bipartite graph / multigraph / hypergraph / hyperedge / complete graph | 无向图 / 有向图 / 加权图 / 二分图 / 多重图 / 超图 / 超边 / 完全图 | 二分图的邻接矩阵按两个节点集合排序后呈分块结构；超边可连接两个以上节点。 |
| graph neural network (GNN) / message passing / neighbourhood aggregation / message function / aggregation / update function / $k$-hop neighbourhood / receptive field | 图神经网络 / 消息传递 / 邻域聚合 / 消息函数 / 聚合 / 更新函数 / $k$ 跳邻域 / 感受野 | 邻居聚合必须对邻居排列不变，节点级输出才会随节点重标记而等变。 |
| graph convolutional network (GCN) / GraphSAGE / Graph Isomorphism Network (GIN) / transductive / inductive / neighbourhood sampling | 图卷积网络 / GraphSAGE / 图同构网络 / 传导式 / 归纳式 / 邻域采样 | GCN、GraphSAGE、GIN 保留缩写或方法名；传导式与归纳式描述训练后处理已见或未见节点的设定。 |
| expressive power / Weisfeiler–Lehman (WL) test / injective function / multiset / over-smoothing / residual connection / Jumping Knowledge / DropEdge | 表达能力 / Weisfeiler–Lehman 检验 / 单射函数 / 多重集 / 过度平滑 / 残差连接 / Jumping Knowledge / DropEdge | 1-WL 检验不能区分所有非同构图；GIN 的表达能力在条件成立时可达到 1-WL 的上限。 |
| graph pooling / readout / hierarchical pooling / DiffPool / TopKPool / heterogeneous graph / homogeneous graph / schema / metapath / relational GCN (R-GCN) / Heterogeneous Graph Transformer (HGT) | 图池化 / 读出 / 层次化池化 / DiffPool / TopKPool / 异构图 / 同质图 / 模式 / 元路径 / 关系图卷积网络 / 异构图 Transformer | 保留架构名称；readout 指把节点表示聚合为图级表示的读出操作。 |
| link prediction / knowledge graph completion / TransE / RotatE / ComplEx / node-level task / edge-level task / graph-level task | 链接预测 / 知识图谱补全 / TransE / RotatE / ComplEx / 节点级任务 / 边级任务 / 图级任务 | 保留嵌入方法名称；节点级输出通常对节点置换等变，图级输出通常对节点置换不变。 |
| graph attention network (GAT) / attention coefficient / attention score / attention weight / multi-head attention / static attention / dynamic attention / GATv2 | 图注意力网络 / 注意力系数 / 注意力分数 / 注意力权重 / 多头注意力 / 静态注意力 / 动态注意力 / GATv2 | GAT、GATv2 保留缩写；attention scores 归一化后得到 attention weights。 |
| Graph Transformer / Graphormer / GPS / global self-attention / spatial bias / edge bias / centrality encoding | 图 Transformer / Graphormer / GPS / 全局自注意力 / 空间偏置 / 边偏置 / 中心性编码 | Graphormer、GPS 保留模型名；GPS 全称为 General, Powerful, Scalable Graph Transformer。 |
| Laplacian eigenvector encoding / sign ambiguity / random walk encoding / degree encoding / neighbourhood explosion / Cluster-GCN / sparse attention / linear attention | 拉普拉斯特征向量编码 / 符号不确定性 / 随机游走编码 / 度编码 / 邻域爆炸 / Cluster-GCN / 稀疏注意力 / 线性注意力 | 拉普拉斯特征向量可有符号及重复特征值对应基的不确定性；度数本身不能唯一识别桥接节点。 |
| temporal graph / discrete-time dynamic graph (DTDG) / continuous-time dynamic graph (CTDG) / Temporal Graph Network (TGN) / memory state / time encoding / Fourier feature / Temporal Graph Attention (TGAT) | 时序图 / 离散时间动态图 / 连续时间动态图 / 时序图网络 / 记忆状态 / 时间编码 / Fourier 特征 / 时序图注意力 | 保留 DTDG、CTDG、TGN、TGAT 缩写；时间编码表示交互间隔等时间信息。 |
| 3D graph / geometric graph / point cloud / k-nearest-neighbour graph (kNN graph) / radius graph / cutoff radius / interatomic distance / bond angle / dihedral angle / torsion angle / relative position vector / chirality / molecular conformation | 三维图 / 几何图 / 点云 / $k$ 近邻图 / 半径图 / 截断半径 / 原子间距离 / 键角 / 二面角 / 扭转角 / 相对位置向量 / 手性 / 分子构型 | 相对位置向量对平移不变、对旋转等变；距离特征无法区分镜像反射后的手性构型。 |
| Euclidean group $E(3)$ / special Euclidean group $SE(3)$ / rotation group $SO(3)$ / invariant architecture / equivariant architecture / scalar output / vector output / tensor output | 欧几里得群 $E(3)$ / 特殊欧几里得群 $SE(3)$ / 旋转群 $SO(3)$ / 不变架构 / 等变架构 / 标量输出 / 向量输出 / 张量输出 | $E(3)$ 含反射，$SE(3)$ 不含反射；标量输出通常不变，向量和张量输出按对应表示等变。 |
| SchNet / continuous-filter convolution / radial basis function (RBF) / DimeNet / SphereNet / spherical Bessel function / spherical harmonic | SchNet / 连续滤波卷积 / 径向基函数 / DimeNet / SphereNet / 球贝塞尔函数 / 球谐函数 | 保留模型名称及 RBF 缩写；球贝塞尔函数和球谐函数用于展开球面上的方向信息。 |
| E(n)-Equivariant GNN (EGNN) / Tensor Field Network / irreducible representation / spherical tensor / Wigner-D matrix / Clebsch–Gordan coefficient / body-ordered interaction / MACE / Equiformer | E(n) 等变 GNN / 张量场网络 / 不可约表示 / 球张量 / Wigner-D 矩阵 / Clebsch–Gordan 系数 / 体阶相互作用 / MACE / Equiformer | 保留架构名称；张量阶数用“阶”，矩阵秩用“秩”；Clebsch–Gordan 组合不同阶的表示以保持等变性。 |
| molecular property prediction / molecular dynamics / density functional theory (DFT) / protein residue / backbone / adsorption energy / binding affinity / binding pose / valence rule / chemical validity | 分子性质预测 / 分子动力学 / 密度泛函理论 / 蛋白质残基 / 主链 / 吸附能 / 结合亲和力 / 结合姿态 / 原子价态规则 / 化学有效性 | 保留 DFT 缩写；分子生成需满足原子价态约束，三维结合姿态包含药物相对蛋白的位置与方向。 |
| autoregressive graph generation / GraphRNN / VAE-based generation / GraphVAE / discrete diffusion / DiGress / Junction Tree VAE (JT-VAE) / DiffDock | 自回归图生成 / GraphRNN / 基于 VAE 的生成 / GraphVAE / 离散扩散 / DiGress / 连接树 VAE / DiffDock | 保留模型名和缩写；DiffDock 使用 SE(3) 等变扩散预测结合姿态。 |

## C++、SIMD 与 GPU 编程术语

| English | 统一译法 | 使用说明 |
| --- | --- | --- |
| frontend / backend / dispatch / eager execution / computation graph / tracing / just-in-time compilation (JIT) | 前端 / 后端 / 分派 / 即时执行 / 计算图 / 追踪 / 即时编译 | 框架的即时执行会逐个分派运算；JIT 会追踪并编译受支持的函数，但不保证把整段函数合为单个内核。 |
| kernel / kernel fusion / device backend / hardware intrinsic / SIMD (single instruction, multiple data) / vectorisation | 内核 / 内核融合 / 设备后端 / 硬件内在函数 / 单指令多数据流 / 向量化 | SIMD 首次出现可写作“单指令多数据流（SIMD）”；区分运算内核与操作系统内核。 |
| pointer / memory address / pointer arithmetic / dangling pointer / buffer overflow | 指针 / 内存地址 / 指针运算 / 悬空指针 / 缓冲区越界 | 指针保存地址；指针运算直接访问内存，需保证指针有效且不越过对象边界。 |
| stride / contiguous array / row-major / column-major / memory layout | 步长 / 连续数组 / 行优先 / 列优先 / 内存布局 | “按列遍历”描述访问顺序，不等于矩阵采用列优先存储；步长描述相邻元素在内存中的间隔。 |
| binding / pybind11 / C++ extension / XLA custom call | 绑定 / pybind11 / C++ 扩展 / XLA 自定义调用 | pybind11 的数组示例需说明维度、数据类型和连续性假设；框架自定义调用还需遵守其设备与数据约定。 |
| stack / heap / smart pointer / template / reference / const reference / RAII | 栈 / 堆 / 智能指针 / 模板 / 引用 / const 引用 / 资源获取即初始化（RAII） | 栈大小受运行环境影响；智能指针和标准容器可管理对象生命周期，不能与 Python 引用机制简单等同。 |
| row-major traversal / column-wise traversal | 按行遍历 / 按列遍历 | 若矩阵按行优先存储，按行遍历通常连续访问，按列遍历会跨步访问；基准结果依赖缓存和硬件。 |
| superscalar execution / out-of-order execution (OoO) / branch prediction / speculative execution / instruction-level parallelism (ILP) / data-level parallelism | 超标量执行 / 乱序执行 / 分支预测 / 推测执行 / 指令级并行 / 数据级并行 | 乱序执行不改变程序可见的顺序语义；预测准确率和误预测代价取决于处理器与分支模式。 |
| roofline model / peak compute throughput / peak memory bandwidth / arithmetic intensity / memory-bound / compute-bound | 屋顶线模型 / 峰值计算吞吐量 / 峰值内存带宽 / 算术强度 / 内存带宽受限 / 计算能力受限 | 屋顶线估算受计算和带宽上限约束的 FLOPS；算术强度按运算量与数据传输字节数之比计算。 |
| latency / throughput / pipeline / fused multiply-add (FMA) | 延迟 / 吞吐量 / 流水线 / 融合乘加 | 延迟衡量单次操作用时，吞吐量衡量单位时间完成量；计算 FLOPS 时通常把一次 FMA 计为 2 次浮点运算。 |
| thermal design power (TDP) / dark silicon / dynamic power / dynamic frequency scaling | 热设计功耗 / 暗硅 / 动态功耗 / 动态调频 | TDP 是散热设计相关指标，不等于芯片最大持续功耗；功耗和频率受芯片、负载及散热条件影响。 |
| ARM / AArch64 / NEON / I8MM / SVE / SVE2 / SME / SME2 | ARM / AArch64 / NEON / I8MM / SVE / SVE2 / SME / SME2 | 保留架构和扩展名称；是否支持某项扩展取决于具体处理器与编译目标，不能只按产品系列推断。 |
| load-store architecture / general-purpose register / zero register / stack pointer / vector register / lane / intrinsic | 加载/存储架构 / 通用寄存器 / 零寄存器 / 栈指针 / 向量寄存器 / 通道 / 内在函数 | AArch64 的 $x0$–$x30$ 是 31 个通用寄存器；$x31$ 按指令语境表示 SP 或 XZR。内在函数不保证一一对应单条机器指令。 |
| vector-length agnostic (VLA) / predicate register / streaming vector length (SVL) / ZA tile / outer product accumulation | 向量长度无关 / 谓词寄存器 / 流式向量长度 / ZA 矩阵寄存器 / 外积累加 | SVE 通过谓词屏蔽尾部通道；SME 的 ZA tile 维度依 SVL 和元素类型而定。 |
| neural processing unit (NPU) / Apple Neural Engine / unified memory / MLX / Metal Performance Shaders (MPS) | 神经处理器 / Apple Neural Engine / 统一内存 / MLX / Metal Performance Shaders | Neural Engine 的核心数和 TOPS 因芯片代际而异；统一内存可减少显式复制，但不消除带宽、同步和布局成本。 |
| compiler auto-vectorisation / pointer aliasing / restrict qualifier | 编译器自动向量化 / 指针别名 / restrict 限定符 | `const` 不代表无别名；`__restrict__` 是编译器扩展而非标准 C++，并要求调用方保证指针不重叠。 |
| CUDA / CUDA core / host / device / grid / thread block / thread / warp / warp divergence | CUDA / CUDA 核心 / 主机 / 设备 / 网格 / 线程块 / 线程 / warp / warp 发散 | NVIDIA CUDA 的 warp 含 32 个线程；分支发散的代价取决于路径和工作量，不固定减半。 |
| global memory / register file / shared memory / L1 cache / L2 cache / memory coalescing / occupancy / bank conflict | 全局显存 / 寄存器文件 / 共享内存 / L1 缓存 / L2 缓存 / 内存合并访问 / 占用率 / bank 冲突 | 合并访问可减少内存事务；占用率只表示活动 warp 与资源上限的关系，不能单独代表性能。 |
| CUDA stream / asynchronous memory copy / pinned host memory / CUDA event / Nsight Compute / Nsight Systems | CUDA 流 / 异步内存复制 / 固定主机内存 / CUDA 事件 / Nsight Compute / Nsight Systems | 同一流内操作有序；跨流重叠受硬件、固定内存和依赖关系影响，需要正确同步。 |
| Array of Structures (AoS) / Structure of Arrays (SoA) / software prefetch / kernel fusion / mixed-precision kernel | 结构体数组 / 数组结构 / 软件预取 / 内核融合 / 混合精度内核 | SoA 常适合按字段批量访问；AoS 适合逐元素使用多个字段。内核融合可减少中间数据传输，也可能增加寄存器压力。 |
| Tensor Core / Transformer Engine / TF32 / HBM / NVLink | Tensor Core / Transformer Engine / TF32 / HBM / NVLink | Tensor Core 的形状、精度和峰值随 GPU 代际变化；稀疏峰值不能与稠密吞吐量直接比较。 |
| memory pool / caching allocator / allocated memory / reserved memory | 内存池 / 缓存分配器 / 已分配显存 / 已预留显存 | `memory_allocated` 表示张量当前占用量；`memory_reserved` 表示分配器预留量，两者含义不同。 |

## 复核规则

- 术语统一不能改变公式、代码、API 名称、文件路径、Mermaid 拓扑或原文技术含义。
- 对同一个英文术语存在领域差异时，以语境优先；例如 token 在模型语境中是“词元”，在访问控制语境中是“令牌”。
- 新增译文或修改旧译文后，运行 `python3 scripts/check_translation_correspondence.py` 和 `python3 scripts/check_source_fingerprints.py`，并在本表中补充跨课程复用的术语。
