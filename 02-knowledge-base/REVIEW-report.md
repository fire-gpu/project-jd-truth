# JD 真话 -- 经验知识库种子数据全面 Review 报告

> Review 日期：2026-04-18
> Reviewer：AI 工程师 & 产品架构师视角
> 审查范围：7 个核心文件，12 条经验数据，6 个岗位类别

---

## 0. 自动化校验结果（先说结论）

| 检查项 | 结果 | 说明 |
|--------|------|------|
| JSON 语法合法性 | PASS | 3 个 JSON 文件均可正常解析 |
| Schema 字段完整性 | PASS | 所有 12 条经验的 work_content / core_skills / entry_advice / meta 四大模块字段齐全 |
| 必填字段覆盖 | PASS | daily_tasks、jd_vs_reality、must_have、nice_to_have、entry_advice、meta 全部存在 |
| 枚举值合法性 | WARN | gap_level 仅出现 high/medium/low，合法；skill level 出现"精通"2次但 schema 定义为"了解/基本/熟练/精通"，合法 |
| ID 唯一性 | **FAIL** | exp_001 ~ exp_004 在 3 个文件中重复使用，跨文件 ID 冲突 |
| 数据量 | PASS | 6 个岗位类别，12 条经验（每岗位 2 条） |
| 来源分布 | PASS | interview 6 条 + community 6 条，1:1 均衡 |

**关键发现：跨文件 ID 重复是最严重的结构性问题。** frontend-backend.json 中的 exp_001~exp_004 与 product-operations.json、design-data.json 中的 ID 完全重叠，在程序化读取和后续数据库迁移时会产生主键冲突。

---

## 1. 工程角度

### 1.1 数据结构合理性评估

**优点：**

- **分层设计清晰**：顶层 `categories -> jobs -> experiences` 三层嵌套结构，与业务逻辑（岗位分类 -> 具体岗位 -> 从业者经验）高度吻合
- **Experience 对象设计全面**：`work_content`（真实工作内容）、`core_skills`（核心能力）、`entry_advice`（入行建议）、`meta`（元数据）四大模块覆盖了产品的核心输出维度
- **jd_vs_reality 是亮点字段**：直接对齐产品核心价值主张（"JD 真话"），每条经验平均 3-3.5 条 JD vs Reality 对比，信息密度高
- **meta 字段预留了 UGC 扩展**：`contributor`、`review_status`、`quality_score` 为后续用户贡献机制做好了准备

**问题与冗余：**

1. **ID 设计缺陷（严重）**：当前 `exp_001` ~ `exp_004` 在 3 个文件中重复。应改为带命名空间的 ID，如 `frontend-exp_001`、`pm-exp_001`，或使用 UUID
2. **time_ratio 是字符串而非数字**：`"50%"` 作为字符串存储不利于程序化计算（如验证所有 task 的 time_ratio 之和是否为 100%）。建议改为 `{"value": 50, "display": "50%"}` 或直接存数字
3. **skill level 枚举不统一**：schema 定义为"了解/基本/熟练/精通"，但实际数据中 `nice_to_have` 里出现了 `level: "进阶"`（tech-architecture.md 中的示例数据），与 schema 不一致
4. **缺少 `tags` 或 `keywords` 字段**：当前没有显式的关键词标注，完全依赖后续的 `extractKeywords()` 函数从 JD 文本中提取。经验数据本身携带的关键词（如"React"、"CRUD"、"PRD"、"SQL"）没有被结构化存储，不利于检索优化
5. **缺少 `company_size` / `company_type` 维度**：大厂、中型公司、创业公司的经验差异很大，当前数据虽然 source_detail 中隐含了公司规模信息（如"某互联网大厂"、"某中型互联网公司"），但没有结构化字段

### 1.2 JSON 文件作为知识库存储方案

**可行性**：Demo 阶段完全可行，且是正确的选择。

**优点**：
- 零部署成本，`JSON.parse()` 即可读取
- 版本控制友好（Git diff 可读）
- 适合 SOLO 辅助开发场景（AI 可以直接读取和编辑 JSON）

**扩展瓶颈**：
- 单文件已达 600 行（design-data.json），当数据量增长到 50+ 条经验时，单文件维护将变得困难
- 无法支持并发写入（UGC 场景）
- 缺少查询能力（无法按条件筛选、排序、分页）

**建议的数据组织方式改进**：

当前按"技术类 / 非技术类"分文件（frontend-backend.json / product-operations.json / design-data.json），分类逻辑不清晰——设计（uiux_design）和数据（data_analysis）被归入 design-data.json，与文件名不完全匹配。建议：

```
seed-data/
  categories/
    frontend.json
    backend.json
    product-manager.json
    operations.json
    uiux-design.json
    data-analysis.json
  index.json  （全局索引，包含 version、统计信息）
```

### 1.3 程序化读取和检索便利性

**当前状态**：基本可用，但有几个摩擦点：

1. 读取一个岗位的全部经验需要遍历所有文件（因为不知道哪个文件包含哪个 category）
2. tech-architecture.md 中的数据结构与 data-schema.md 中的数据结构**不一致**——前者是扁平化的简版结构（`work_content` 是字符串数组），后者是结构化的完整版（`work_content` 包含 `daily_tasks` 和 `jd_vs_reality`）。这会导致开发阶段混淆
3. 没有提供数据访问层（DAL）的接口定义，后端开发时需要自行设计

---

## 2. RAG 角度

### 2.1 当前方案算不算 RAG？

**严格意义上不算。** RAG（Retrieval-Augmented Generation）的核心是"检索"（Retrieval），即从大量知识中**语义相关地**检索出最匹配的片段。当前的方案是：

```
JD 文本 -> 提取关键词 -> 匹配岗位类别 -> 返回该类别下所有经验
```

这本质上是**规则匹配 + 全量注入**，不是检索：
- 没有"相关性排序"——匹配到 frontend 类别后，该类别下的所有经验会被全部注入 Prompt
- 没有"语义匹配"——依赖关键词命中，无法处理"Web 开发"、"前端工程师"、"H5 开发"等同义表述
- 没有"Top-K 截断"——当前每岗位 2 条经验全量注入，数据量增长后会超出上下文窗口

**更准确的命名应该是**：Knowledge-Injected Prompt Engineering（知识注入式 Prompt 工程），而非 RAG。

### 2.2 与真正向量检索 RAG 的差距

| 维度 | 当前方案 | 向量检索 RAG |
|------|---------|-------------|
| 检索粒度 | 岗位类别级别（粗粒度） | 经验片段级别（细粒度） |
| 语义理解 | 无（关键词匹配） | 有（Embedding 相似度） |
| 相关性排序 | 无（全量返回） | Top-K + 相似度阈值 |
| 跨类别检索 | 不支持 | 支持（JD 可能同时涉及前端+产品） |
| 可扩展性 | 线性增长（数据越多注入越多） | 恒定（始终只注入 Top-K） |
| 实现复杂度 | 低 | 中（需要 Embedding 模型 + 向量数据库） |

### 2.3 种子数据质量评估（语义丰富度、信息密度）

**这是当前方案的亮点。** 种子数据的质量在 AI 生成数据中属于上乘：

**语义丰富度：高**
- 每条 jd_vs_reality 平均 200-300 字，包含具体的场景描述和对比分析
- daily_tasks 的 detail 字段平均 80-150 字，描述具体到工具名称（Figma、Jira、Axure）、具体流程、具体痛点
- entry_advice 包含具体的资源推荐（书名、网站、工具名），而非泛泛而谈

**信息密度：高**
- 12 条经验共 48,189 字符，平均每条 ~4,016 字符
- 每条经验包含 5 个 daily_tasks + 3-4 个 jd_vs_reality + 8 个 skills + 4 条 advice
- gap_level 分布：high 22 条（58%）、medium 14 条（37%）、low 2 条（5%）——"高差距"占多数，符合产品"揭示 JD 真相"的定位

**不足**：
- 所有经验都是"初级（0-2年）"视角，缺少中级/高级岗位的经验。用户输入中级岗位 JD 时将无法匹配
- 所有经验都是互联网行业视角，缺少金融、制造、教育等行业的差异化经验
- 经验之间缺乏交叉引用（如前端经验中提到的"和产品经理沟通"可以链接到产品经理经验中的"和前端沟通"）

### 2.4 升级到向量检索需要的调整

1. **扁平化数据结构**：将嵌套的 JSON 拆分为独立的"知识片段"（chunk），每个 chunk 包含一个完整的语义单元（如一条 jd_vs_reality、一条 daily_task + detail）
2. **添加 embedding 字段**：每个 chunk 需要存储对应的 embedding 向量
3. **添加 metadata 索引字段**：category_id、job_id、experience_id、chunk_type（daily_task / jd_vs_reality / skill / advice）用于过滤
4. **添加 chunk 级别的 source 追溯**：便于检索结果展示来源

### 2.5 Embedding 策略建议

**推荐方案：分字段 Embedding + 元数据过滤**

```
chunk 级别：
  - 每个 jd_vs_reality 对 -> 独立 embedding（最核心的检索目标）
  - 每个 daily_task（task + detail）-> 独立 embedding
  - 每组 core_skills -> 作为整体 embedding（保持 must_have / nice_to_have 的上下文关系）
  - 每条 entry_advice -> 独立 embedding

检索时：
  1. JD 文本 embedding
  2. 在 jd_vs_reality chunks 中检索 Top-3（最相关）
  3. 在 daily_tasks chunks 中检索 Top-3
  4. 在 core_skills chunks 中检索 Top-2
  5. 在 entry_advice chunks 中检索 Top-2
  6. 合并去重后注入 Prompt
```

不建议整条 experience 做 embedding，因为单条经验 ~4000 字符，语义过于混杂，会导致检索精度下降。

---

## 3. 数据库接入角度

### 3.1 JSON 到关系型数据库（PostgreSQL）迁移

**可行性：中等，需要结构调整。**

当前嵌套结构迁移到关系型数据库需要拆表：

```
categories (id, name)
jobs (id, category_id, title, experience_level)
experiences (id, job_id, source_type, source_detail, quality_score, review_status, ...)
daily_tasks (id, experience_id, task, time_ratio, detail, sort_order)
jd_vs_reality (id, experience_id, jd_says, reality, gap_level, sort_order)
skills (id, experience_id, skill_type [must_have/nice_to_have], skill, level, why, how_to_verify)
entry_advice (id, experience_id, action, priority, estimated_time, why, sort_order)
advice_resources (id, advice_id, resource_text)
```

**主要障碍**：
- `entry_advice.resources` 是数组类型，需要拆为子表或使用 PostgreSQL 的 JSONB 类型
- `core_skills` 的 `must_have` / `nice_to_have` 是两个平行数组，需要用 `skill_type` 字段区分
- 当前数据没有外键关系定义，迁移时需要手动建立关联

**评估**：当前 JSON 结构**没有为数据库迁移预留足够的灵活性**。主要问题是过度嵌套和数组字段。如果一开始就考虑数据库迁移，应该将 resources 等数组字段设计为独立的关联表结构。

### 3.2 JSON 到文档数据库（MongoDB）迁移

**可行性：高。** MongoDB 天然适合嵌套 JSON 结构，迁移成本最低。当前结构可以直接存入 MongoDB，几乎不需要调整。

### 3.3 向量数据库接入改造

如果要接入 Milvus / Pinecone / Weaviate：

1. **数据预处理层**：需要新增一个 ETL 脚本，将 JSON 拆分为 chunks 并生成 embedding
2. **双存储架构**：结构化数据存 PostgreSQL/MongoDB，向量数据存向量数据库，通过 experience_id 关联
3. **新增字段**：
   - `chunk_id`：每个知识片段的唯一标识
   - `chunk_text`：用于 embedding 的纯文本
   - `chunk_type`：片段类型（jd_vs_reality / daily_task / skill / advice）
   - `embedding`：向量数据（由 Embedding 模型生成，不存储在 JSON 中）
   - `metadata`：用于过滤的元数据（category_id, job_id, source_type 等）

---

## 4. 后续 Phase 对接角度

### 4.1 Phase 3（Prompt 工程）：种子数据能否直接注入 Prompt？

**Token 消耗估算**：

根据自动化校验结果，12 条经验的 JSON 总计约 48,189 字符，估算约 72,283 tokens。

但实际使用时不会注入全部 12 条，而是按岗位类别匹配后注入 2 条。单条经验约 4,000 字符（~6,000 tokens），2 条约 12,000 tokens。

**结论：不会导致 token 超限。** 豆包/DeepSeek 的上下文窗口通常为 32K-128K tokens，12,000 tokens 的知识注入完全在可接受范围内。

**但需要注意**：
- 如果用户输入的 JD 很长（有些 JD 全文可达 3000-5000 字符），加上系统 Prompt + 知识注入 + 用户背景，总 token 可能达到 20,000-25,000
- 当前数据格式是 JSON，直接注入 Prompt 会包含大量结构化标记（大括号、引号、键名），浪费 token。建议在注入前将 JSON 转换为更紧凑的 Markdown 或纯文本格式

**建议的 Prompt 注入格式**：

```markdown
## 来自真实从业者的经验

### 来源：某中型互联网公司前端工程师，3年经验

#### 真实日常工作：
1. [50%时间] 根据设计稿还原页面和编写业务组件
   使用 React/Vue 按照 Figma 稿还原页面布局...
2. [20%时间] 对接后端 API 并完成数据渲染
   ...

#### JD 写的 vs 实际情况：
- JD说"负责产品前端架构设计" → 实际：初级工程师基本不参与架构决策...
- JD说"具备良好的UI/UX设计能力" → 实际：绝大多数公司有专职设计师...

#### 核心技能要求：
必备：JavaScript(ES6+)、React/Vue框架、HTML5/CSS3...
加分：TypeScript、前端工程化工具...

#### 入行建议：
1. 精通一个主流框架（2-3个月）
2. 夯实JavaScript基础（1-2个月）
...
```

这种格式比 JSON 节省约 30-40% 的 token。

### 4.2 Phase 4（开发实现）：接口设计清晰度

**当前状态：有架构图，但接口定义不够具体。**

tech-architecture.md 中定义了 3 个 API 端点：
- `POST /api/parse` — 解读 JD
- `GET /api/history` — 历史记录
- `POST /api/feedback` — 用户反馈

**缺失**：
- 知识库读取没有独立 API（是内嵌在 parse 流程中还是独立服务？）
- 没有定义知识库的加载方式（启动时全量加载到内存？每次请求时读取文件？）
- 没有定义岗位类别列表 API（前端需要获取可选的岗位类别）

**建议补充**：
```
GET /api/categories          -> 返回岗位类别列表
GET /api/knowledge/:category -> 返回某类别的经验数据（内部接口）
```

### 4.3 Phase 5（验证测试）：数据质量评估标准

metrics-framework.md 中定义了 5 维度评估量表（真实性、完整性、具体性、可执行性、差异化），每项 1-5 分，通过标准 >= 20/25。

**问题**：这个量表评估的是"AI 生成的解读报告"的质量，而非"种子数据本身"的质量。种子数据缺少独立的评估标准。

**建议增加种子数据质量评估维度**：
- 经验具体性：daily_task 的 detail 是否包含具体工具名、具体流程、具体数字
- JD 对比有效性：jd_vs_reality 是否准确揭示了常见的 JD 夸大表述
- 建议可操作性：entry_advice 是否给出了具体的时间估算和资源链接
- 来源可信度：source_type 和 source_detail 是否足够具体

---

## 5. 业务角度

### 5.1 数据覆盖度评估

**6 个岗位 x 2 条经验 = 12 条数据，对于 Demo 演示基本够用，但存在明显短板：**

| 维度 | 覆盖情况 | 风险 |
|------|---------|------|
| 岗位类别 | 6 类（前端/后端/产品/运营/设计/数据） | 缺少：算法工程师、测试工程师、市场营销、HR 等常见岗位 |
| 经验层级 | 仅"初级（0-2年）" | 用户输入中级/高级岗位 JD 时无法匹配，会显著降低解读质量 |
| 行业分布 | 隐含为互联网行业 | 缺少金融、制造、国企、外企等行业差异 |
| 公司规模 | 隐含覆盖大厂+中型公司 | source_detail 中提到"大厂"、"中型公司"，但未结构化 |
| 地域分布 | 无 | 一线城市 vs 二线城市的经验差异未体现 |

**Demo 演示风险评估**：如果演示时用户输入的 JD 不在 6 个岗位类别中（如"算法工程师"、"测试开发"），系统将无法提供有价值的经验注入，解读质量会大幅下降。建议在 Demo 中明确提示用户选择支持的岗位类别，或增加 2-3 个高频岗位（如算法工程师、测试工程师）。

### 5.2 数据真实性评估

**当前数据是 AI 生成的模拟数据，不是真实访谈记录。** 这一点在 meta.source_type 中标注为"interview"和"community"，但实际来源是 AI 基于公开信息生成的合成数据。

**具体表现**：
- source_detail 描述非常具体（如"2025年12月对某中型互联网公司2年经验产品经理的深度访谈"），但这些"访谈"并未实际发生
- 数据内容高度合理且与真实从业者经验高度一致（说明 AI 生成质量很高），但本质仍是合成数据
- community 类型的 source_detail 描述为"综合整理自 XX 社区约 XX 篇帖子"，这是一种"伪来源"——看起来像真实汇总，实际是 AI 生成的

**风险**：
1. 如果产品上线后声称"基于真实从业者访谈"，可能面临信任危机
2. 合成数据可能存在"系统性偏差"——AI 倾向于生成"合理但平庸"的经验，缺少真正独特或反直觉的一手洞察
3. 部分数据可能过时（如"React 或 Vue"的表述，2026 年 React 生态可能已经发生重大变化）

**建议**：
- 在产品中诚实标注"经验数据由 AI 基于公开信息整理，仅供参考"
- 尽快启动真实用户访谈，用真实数据逐步替换合成数据
- 增加 `data_source_verification` 字段，标注数据是否经过真实从业者验证

### 5.3 数据时效性

**风险中等。** 经验内容中涉及的技术栈和工具（React、Vue、Figma、Spring Boot、SQL）在 2-3 年内不会过时。但以下内容可能快速过时：

- 具体的招聘市场行情（如"初级前端岗位通常不硬性要求 TypeScript"——2026 年可能已经变了）
- 具体的工具和平台（如"Apifox"可能被其他工具替代）
- 行业趋势判断（如"短视频是当前流量最大的内容形式"）

meta 中的 `created_at: "2026-04-17"` 和 schema 中"经验不超过 2 年"的规则是好的设计，但缺少自动过期机制。

### 5.4 UGC 扩展路径

**当前设计评估**：

tech-architecture.md 中设计了用户贡献机制（"经验飞轮"），meta 字段中预留了 `contributor` 和 `review_status`。但 UGC 路径存在以下问题：

1. **缺少用户贡献的数据结构定义**：用户提交的经验应该使用什么格式？是否需要和种子数据一样的完整结构？还是简化版（如只提交 jd_vs_reality）？
2. **缺少审核流程定义**：`review_status` 有 pending/approved/rejected 三个状态，但谁来做审核？审核标准是什么？
3. **缺少质量控制机制**：如何防止低质量、恶意、或虚假的用户贡献？
4. **缺少激励机制**：用户为什么要贡献自己的经验？

**建议**：在 V0.5 阶段设计一个最小化的 UGC 方案——用户只能在已有经验下"补充"或"纠错"，而非从零创建新经验。这大大降低了审核成本和质量风险。

---

## 6. 指标完成度对照

对照 `metrics-framework.md` 中 Phase 2 的 3 项指标：

### 6.1 种子数据量 >= 5 个岗位

| 指标要求 | 实际情况 | 结果 |
|---------|---------|------|
| >= 5 个岗位类别 | 6 个岗位类别（前端/后端/产品/运营/设计/数据） | **PASS** |

### 6.2 数据结构一致性 100% 符合 schema

| 检查项 | 结果 |
|--------|------|
| 所有 experience 包含 work_content / core_skills / entry_advice / meta | PASS |
| daily_tasks 包含 task / time_ratio / detail | PASS |
| jd_vs_reality 包含 jd_says / reality / gap_level | PASS |
| skills 包含 skill / level / why / how_to_verify | PASS |
| entry_advice 包含 action / priority / estimated_time / resources / why | PASS |
| meta 包含 source_type / source_detail / contributor / quality_score / review_status / created_at / updated_at | PASS |
| ID 全局唯一 | **FAIL** -- exp_001~exp_004 跨文件重复 |
| tech-architecture.md 中的数据结构与 data-schema.md 一致 | **FAIL** -- 两处定义的结构不同 |

**结论：结构一致性约 95%，存在 2 个明确的不一致问题。**

### 6.3 经验真实性：每条经验有明确来源

| 检查项 | 结果 |
|--------|------|
| 每条经验有 source_type | PASS（interview 或 community） |
| 每条经验有 source_detail | PASS |
| source_detail 是否指向真实来源 | **WARN** -- 均为 AI 合成数据，非真实访谈或社区整理 |

**结论：形式上满足"有明确来源"的要求，但实质上所有来源都是合成的。** 如果严格定义"真实性"为"来自真实从业者的第一手经验"，则此项不达标。

---

## 7. 改进建议

### 7.1 短期（Demo 阶段可做，1-2 天）

1. **修复 ID 重复问题（P0）**
   - 将所有 ID 改为带命名空间的格式：`fe-001`、`be-001`、`pm-001`、`ops-001`、`ui-001`、`da-001`
   - 或使用 UUID

2. **统一 tech-architecture.md 和 data-schema.md 的数据结构（P0）**
   - tech-architecture.md 中的简化版数据结构应该标注为"示意"，并明确指向 data-schema.md 作为权威定义
   - 或直接删除 tech-architecture.md 中的数据结构示例，避免混淆

3. **增加 JSON 转 Prompt 文本的格式化函数（P1）**
   - 编写一个 `formatExperienceForPrompt(experience)` 函数，将 JSON 转为紧凑的 Markdown 格式
   - 预估可节省 30-40% 的 token 消耗

4. **增加岗位类别索引文件（P1）**
   - 创建 `seed-data/index.json`，包含所有 category_id 和 category_name 的映射
   - 方便前端获取可选列表，也方便后端快速查找

5. **补充 2-3 个高频岗位（P2）**
   - 建议增加：算法工程师、测试工程师、市场营销
   - 每个岗位 1 条经验即可，提升 Demo 的覆盖度

### 7.2 中期（V0.5 阶段，1-2 周）

1. **升级为 Chunk 级别的数据组织（P0）**
   - 将每条 experience 拆分为独立的 knowledge chunks
   - 每个 chunk 包含：id、type、text、metadata、source
   - 为后续向量检索做好准备

2. **接入轻量级向量检索（P1）**
   - 推荐方案：使用 OpenAI text-embedding-3-small 或豆包 Embedding API
   - 向量存储：先用内存中的 FAISS 索引（无需外部数据库），后续迁移到 Milvus
   - 检索策略：按 chunk_type 分别检索，合并去重

3. **增加经验层级维度（P1）**
   - 为中级（3-5年）岗位补充经验数据
   - 修改 job 结构，支持多个 experience_level

4. **实现最小化 UGC（P2）**
   - 用户可以在已有经验下"补充"或"纠错"
   - 提交后进入 pending 状态，人工审核后入库

### 7.3 长期（V1.0 阶段，1-3 个月）

1. **数据战略：从合成数据到真实数据**
   - 启动"真实从业者访谈计划"，目标收集 50+ 条真实经验
   - 建立"经验验证机制"——每条合成数据标注为"待验证"，经真实从业者确认后升级为"已验证"
   - 与招聘平台、技术社区合作获取匿名化的从业者反馈数据

2. **多维度数据扩展**
   - 行业维度：金融、制造、教育、医疗等
   - 公司规模维度：大厂（BAT）、中型公司、创业公司、外企
   - 城市维度：一线城市、新一线城市、二线城市
   - 每个维度至少 3-5 条经验才能形成有价值的对比

3. **数据飞轮设计**
   - 用户每次使用解读后，收集"这条经验是否准确"的反馈
   - 利用反馈信号自动调整经验数据的 quality_score
   - 低分经验自动降权或标记为需要更新

4. **数据版本管理**
   - 建立数据的版本控制机制（当前只有 version: "1.0"）
   - 支持数据回滚和 A/B 测试不同版本的知识库

---

## 8. 总体评分

| 维度 | 评分（1-10） | 说明 |
|------|-------------|------|
| 数据结构设计 | 7.5 | 分层清晰，字段全面，但 ID 设计和文件组织有瑕疵 |
| 数据内容质量 | 8.0 | 语义丰富度高，信息密度大，jd_vs_reality 是亮点；但缺少层级和行业多样性 |
| RAG 就绪度 | 5.0 | 当前不是真正的 RAG，但数据质量为后续升级奠定了基础 |
| 数据库迁移友好度 | 6.0 | 迁移到 MongoDB 容易，迁移到 PostgreSQL 需要结构调整，迁移到向量数据库需要 chunk 化 |
| 工程规范度 | 6.5 | 有 schema 定义和版本号，但缺少校验脚本、索引文件，且两份文档结构不一致 |
| 业务覆盖度 | 6.0 | 6 个岗位类别达标，但仅覆盖初级和互联网行业 |
| 指标完成度 | 8.0 | Phase 2 三项指标基本达标（数据量 PASS、结构一致性 95%、来源形式满足） |
| 可扩展性 | 7.0 | 预留了 UGC 字段和向量检索接口，但缺少具体的扩展路径设计 |

**综合评分：6.8 / 10**

---

## 9. 核心 Top 3 改进建议

### 1. 修复 ID 重复 + 统一数据结构定义（紧急，2 小时）

跨文件 ID 重复是会在开发阶段直接导致 Bug 的硬伤。同时 tech-architecture.md 中的简化版数据结构必须与 data-schema.md 保持一致，否则后端开发时会困惑该以哪个为准。

### 2. 实现 JSON -> Prompt 格式化层（重要，半天）

当前直接将 JSON 注入 Prompt 会浪费 30-40% 的 token 在结构化标记上。编写一个格式化函数，将 JSON 转为紧凑的 Markdown，可以在不损失信息的前提下显著降低 token 消耗，为后续增加更多经验数据留出上下文空间。

### 3. 启动真实数据收集计划（战略，持续进行）

12 条 AI 合成数据作为 Demo 种子是合格的，但产品的核心竞争力在于"真实从业者经验"。建议立即启动轻量级的真实数据收集——通过微信社群、技术论坛、脉脉等渠道，以"匿名分享你的真实工作体验"为主题收集 10-20 条真实经验，逐步替换合成数据。这是从"Demo"到"产品"的关键跨越。
