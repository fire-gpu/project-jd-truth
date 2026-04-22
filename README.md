# JD 真话 — 项目总览

> 用 AI + 真实从业者经验，把招聘 JD 翻译成"你到底要做什么、需要什么能力、怎么补"

## 项目信息

- **赛道**：Hello AI 科技致善 — 命题三：帮助大学生跨越求职迷茫
- **产品形态**：微信小程序（Demo）+ 完整产品设计文档
- **核心功能**：JD 智能解读
- **目标用户**：毕业 0-2 年的求职困难群体（社招逻辑）
- **开发工具**：TRAE SOLO
- **时间周期**：1-2 周

## 核心洞察

> 校招看项目/学历/实习，社招看经验和能力匹配。毕业求职困难群体面对的是社招逻辑，JD 解读对他们才是刚需。

## 一句话定位

面向毕业求职困难群体，在社招场景下提供 JD 智能解读能力（真实工作内容 + 能力要求 + 差距分析 + 行动建议），通过 AI + 真实从业者经验降低信息不对称。

## 文件系统导航

```
project-jd-truth/
├── README.md                      ← 你在这里
├── 00-product-spec/               # 产品设计文档
│   ├── product-vision.md          # 产品愿景与定位
│   ├── user-persona.md            # 用户画像
│   ├── feature-spec.md            # 功能规格
│   └── metrics-framework.md       # 指标体系（核心）
│
├── 01-research/                   # 调研阶段
│   ├── interview-guide.md         # 访谈提纲
│   ├── interview-notes/           # 访谈记录
│   ├── jd-samples/                # JD 样本库
│   ├── competitor-analysis.md     # 竞品分析
│   └── research-report.md         # 调研报告（最终产出）
│
├── 02-knowledge-base/             # 经验知识库
│   ├── seed-data/                 # 种子数据（JSON）
│   ├── data-schema.md             # 数据结构定义
│   └── contribution-guidelines.md # 用户贡献规范（设计）
│
├── 03-prompt-engineering/         # Prompt 工程
│   ├── v1-jd-parser.md            # V1 Prompt
│   ├── v2-jd-parser-with-rag.md   # V2 Prompt（含 RAG）
│   ├── prompt-test-results.md     # 测试结果对比
│   └── prompt-iteration-log.md    # 迭代日志
│
├── 04-development/                # 开发阶段
│   ├── tech-architecture.md       # 技术架构
│   ├── solo-development-log.md    # SOLO 开发记录
│   ├── roadmap-b.md               # 路线 B 功能优化规划
│   ├── mini-program/              # 小程序代码（3 页面）
│   ├── cloudfunctions/            # 微信云开发云函数
│   │   └── parseJD/               # AI 解读云函数
│   └── backend/                   # 后端代码（已弃用，保留参考）
│
├── 05-validation/                 # 验证阶段
│   ├── test-cases.md              # 测试用例
│   ├── quality-evaluation.md      # 质量评估
│   ├── user-feedback/             # 用户反馈
│   └── validation-report.md       # 验证报告
│
└── 06-submission/                 # 参赛提交
    ├── practice-post.md           # 实践帖正文
    └── demo-assets/               # 演示素材
```

## 执行计划

| 天数 | 阶段 | 产出 | 关键指标 |
|------|------|------|---------|
| Day 1-2 | 调研 | 访谈 3-5 人 + 收集 20 条 JD + 竞品分析 | 需求验证度 > 60% |
| Day 3 | 知识库 | 构建 5-10 个岗位的种子经验数据 | 数据结构可扩展 |
| Day 4 | Prompt | 设计并迭代 JD 解读 Prompt（V1→V2） | 质量评估 > 20/25 |
| Day 5-7 | 开发 | SOLO 辅助开发小程序 + 后端 | SOLO 人效可追踪 |
| Day 8-9 | 验证 | 质量评估 + 5-10 人试用 | 有用度 > 4/5 |
| Day 10-12 | 撰写 | 实践帖 + 演示素材 | 结构完整度 100% |
| Day 13-14 | Buffer | 迭代优化 + 提交 | — |

## 当前状态

- [x] 需求理解与方案设计
- [x] 指标体系设计
- [x] 技术架构设计
- [x] 文件系统搭建
- [x] 调研阶段（Phase 1）
- [x] 知识库构建（Phase 2 + 2.5 Review）
- [x] Prompt 工程（Phase 3，V1→V2→V3→V3.1）
- [x] 开发实现（Phase 4，后端 + 小程序）
- [x] 测试验证（Phase 5，边界测试 + AI 端到端）
- [x] 上线部署（Phase 6，微信云开发改造 + 代码审核通过）
- [x] 审核与发布尝试（Phase 7，个人主体不支持 AI 类目，审核失败）
- [ ] 正式发布（需企业主体小程序）
- [ ] 实践帖撰写
