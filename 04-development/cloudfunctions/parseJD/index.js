/**
 * JD 说真话 - 微信云开发云函数
 *
 * 功能：
 * 1. 接收 JD 文本，调用大模型生成解读报告
 * 2. 内嵌知识库数据，基于关键词匹配 + 语义相似度检索相关经验
 * 3. 内嵌 Prompt 模板，构建 system/user 两部分 Prompt
 * 4. 报告完整性检测与自动补全
 * 5. AI 请求队列，防止并发限流
 *
 * 云函数入口：exports.main_handler
 */

// ============================================================
// 环境变量配置
// ============================================================
const LLM_API_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';
const LLM_API_KEY = 'YOUR_API_KEY_HERE'; // 替换为你的智谱 API Key（https://open.bigmodel.cn）
const LLM_MODEL_NAME = 'glm-4-flash';

// ============================================================
// 内嵌知识库数据
// 从 02-knowledge-base/seed-data/ 下的 JSON 文件直接内嵌
// ============================================================
const KNOWLEDGE_DATA = {
  "frontend-backend": {
  "version": "1.0",
  "updated_at": "2026-04-17",
  "categories": [
    {
      "category_id": "frontend",
      "category_name": "前端开发",
      "jobs": [
        {
          "job_id": "frontend-junior",
          "job_title": "初级前端开发工程师",
          "experience_level": "0-2年",
          "experiences": [
            {
              "id": "fe_exp_001",
              "keywords": {
                "job_titles": [
                  "前端开发",
                  "前端工程师",
                  "Web前端",
                  "H5开发",
                  "前端开发工程师",
                  "Web开发",
                  "初级前端",
                  "前端实习生"
                ],
                "tech_stack": [
                  "JavaScript",
                  "React",
                  "Vue",
                  "HTML5",
                  "CSS3",
                  "TypeScript",
                  "ES6+",
                  "Git"
                ],
                "skills": [
                  "页面开发",
                  "组件开发",
                  "接口对接",
                  "Code Review",
                  "Bug修复",
                  "单元测试",
                  "样式还原",
                  "响应式适配"
                ],
                "tools": [
                  "Figma",
                  "Chrome DevTools",
                  "Webpack",
                  "Vite",
                  "Ant Design",
                  "Element Plus",
                  "Jest",
                  "Vitest"
                ],
                "concepts": [
                  "响应式布局",
                  "浏览器兼容",
                  "性能优化",
                  "前端架构",
                  "工程化",
                  "组件化",
                  "状态管理",
                  "RESTful API"
                ]
              },
              "work_content": {
                "daily_tasks": [
                  {
                    "task": "根据设计稿还原页面和编写业务组件",
                    "time_ratio": "50%",
                    "detail": "使用 React/Vue 按照设计师提供的 Figma/Sketch 稿还原页面布局，包括表单、列表、详情页、弹窗等常见业务组件。需要处理响应式适配和浏览器兼容性问题。"
                  },
                  {
                    "task": "对接后端 API 并完成数据渲染",
                    "time_ratio": "20%",
                    "detail": "根据后端提供的 Swagger/Apifox 接口文档，使用 axios 或 fetch 调用接口，处理请求参数、响应数据格式化、错误码处理和 loading 状态管理。"
                  },
                  {
                    "task": "修复 Bug 和处理线上问题",
                    "time_ratio": "15%",
                    "detail": "处理测试同学提的 Bug 单和线上用户反馈的问题，包括样式错位、交互异常、接口报错等。需要使用 Chrome DevTools 定位问题，有时需要和后端联调排查。"
                  },
                  {
                    "task": "参与 Code Review 和团队协作",
                    "time_ratio": "10%",
                    "detail": "每周参与 1-2 次团队 Code Review，学习高级工程师的代码写法；参加迭代计划会和每日站会，汇报进度和阻塞项。"
                  },
                  {
                    "task": "编写和维护单元测试",
                    "time_ratio": "5%",
                    "detail": "为核心业务组件编写 Jest/Vitest 单元测试，覆盖率要求通常在 60% 以上。新人阶段主要写简单的渲染测试和工具函数测试。"
                  }
                ],
                "jd_vs_reality": [
                  {
                    "jd_says": "负责产品前端架构设计和技术选型",
                    "reality": "初级工程师基本不会参与架构决策，框架（React/Vue）、状态管理（Redux/Pinia）、构建工具（Vite/Webpack）都是团队已经定好的。你的任务是按照现有架构规范写代码。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "具备良好的 UI/UX 设计能力",
                    "reality": "绝大多数公司有专职设计师，前端不需要做设计决策。但你需要有基本的审美判断力，能发现设计稿中不合理的地方并主动和设计师沟通。",
                    "gap_level": "medium"
                  },
                  {
                    "jd_says": "负责前端性能优化",
                    "reality": "初级阶段很少独立做性能优化，主要是遵循团队已有的性能规范（如图片懒加载、组件按需引入）。真正的性能优化（首屏时间、Lighthouse 评分提升）通常由中级以上工程师负责。",
                    "gap_level": "medium"
                  }
                ]
              },
              "core_skills": {
                "must_have": [
                  {
                    "skill": "JavaScript (ES6+)",
                    "level": "熟练",
                    "why": "日常开发的核心语言，面试必考闭包、原型链、异步编程、事件循环等基础知识",
                    "how_to_verify": "能独立完成中等复杂度的交互逻辑，理解 Promise/async-await，能手写防抖节流等常见工具函数"
                  },
                  {
                    "skill": "React 或 Vue 框架",
                    "level": "熟练",
                    "why": "几乎所有前端岗位都要求掌握至少一个主流框架，实际工作每天都在用",
                    "how_to_verify": "能独立完成一个包含表单、列表、路由的完整页面开发，理解组件生命周期和状态管理"
                  },
                  {
                    "skill": "HTML5 / CSS3",
                    "level": "熟练",
                    "why": "页面还原的基础，Flexbox 和 Grid 布局是日常高频使用的技能",
                    "how_to_verify": "能像素级还原设计稿，处理常见布局问题（居中、等高、响应式），了解 BEM 命名规范"
                  },
                  {
                    "skill": "Git 版本控制",
                    "level": "熟练",
                    "why": "团队协作必备工具，每天都要用 git pull/commit/push/rebase",
                    "how_to_verify": "能熟练使用分支管理（feature/fix 分支），理解 merge 和 rebase 的区别，能处理基本冲突"
                  },
                  {
                    "skill": "调试能力（Chrome DevTools）",
                    "level": "熟练",
                    "why": "修 Bug 是日常工作的重要部分，快速定位问题直接影响工作效率",
                    "how_to_verify": "能使用 Elements 面板排查样式问题，使用 Network 面板分析接口请求，使用 Console 面板调试 JS 逻辑"
                  }
                ],
                "nice_to_have": [
                  {
                    "skill": "TypeScript",
                    "level": "了解",
                    "why": "越来越多团队在迁移到 TS，掌握 TS 是加分项，但初级岗位通常不硬性要求",
                    "how_to_verify": "能看懂 TS 代码，会基本的类型定义（interface/type），理解泛型的基本用法"
                  },
                  {
                    "skill": "前端工程化工具（Webpack/Vite）",
                    "level": "了解",
                    "why": "理解构建流程有助于排查打包问题，但初级阶段很少需要修改构建配置",
                    "how_to_verify": "知道 entry/output/loader/plugin 的概念，能看懂 vite.config.ts 或 webpack.config.js"
                  },
                  {
                    "skill": "CSS 预处理器（Sass/Less）",
                    "level": "了解",
                    "why": "很多项目使用预处理器，入职后学习成本不高",
                    "how_to_verify": "会使用变量、嵌套、mixin 等基本特性"
                  }
                ]
              },
              "entry_advice": [
                {
                  "action": "精通一个主流框架（React 或 Vue）",
                  "priority": 1,
                  "estimated_time": "2-3 个月",
                  "resources": [
                    "React 官方文档（react.dev）",
                    "Vue 官方文档（cn.vuejs.org）",
                    "完成一个包含增删改查的全栈项目"
                  ],
                  "why": "面试必考，实际工作每天都在用。建议选一个深入学，不要两个都浅尝辄止"
                },
                {
                  "action": "夯实 JavaScript 基础",
                  "priority": 2,
                  "estimated_time": "1-2 个月",
                  "resources": [
                    "《JavaScript 高级程序设计》（红宝书）",
                    "MDN Web Docs",
                    "LeetCode 简单-中等难度 JS 题"
                  ],
                  "why": "面试中 JS 基础题占比最高，闭包、原型链、事件循环、异步编程是高频考点"
                },
                {
                  "action": "准备 2-3 个高质量项目作品",
                  "priority": 3,
                  "estimated_time": "1-2 个月",
                  "resources": [
                    "GitHub 开源项目参考",
                    "掘金社区项目实战文章",
                    "部署到 Vercel/Netlify 获得在线链接"
                  ],
                  "why": "校招/实习面试中项目经验是重要加分项，有在线预览链接的项目比纯代码仓库更有说服力"
                },
                {
                  "action": "学习基本的网络和浏览器知识",
                  "priority": 4,
                  "estimated_time": "2 周",
                  "resources": [
                    "《图解 HTTP》",
                    "浏览器渲染原理相关博客",
                    "Chrome DevTools 实操练习"
                  ],
                  "why": "面试常考 HTTP 缓存、跨域、HTTPS、浏览器渲染流程等知识，工作中排查问题也用得上"
                }
              ],
              "meta": {
                "source_type": "ai_synthesized_interview",
                "source_detail": "AI 基于公开社区信息（知乎、V2EX、脉脉等）综合生成的模拟访谈数据，非真实访谈",
                "contributor": null,
                "quality_score": 4.5,
                "review_status": "approved",
                "data_verification": {
                  "is_verified": false,
                  "verified_by": null,
                  "verified_at": null,
                  "verification_note": "AI 合成数据，待真实从业者验证后升级为已验证状态"
                },
                "created_at": "2026-04-17",
                "updated_at": "2026-04-17"
              }
            },
            {
              "id": "fe_exp_002",
              "keywords": {
                "job_titles": [
                  "前端开发",
                  "前端工程师",
                  "Web前端",
                  "H5开发",
                  "前端开发工程师",
                  "Web开发",
                  "前端实习生",
                  "前端助理"
                ],
                "tech_stack": [
                  "JavaScript",
                  "React",
                  "Vue",
                  "HTML5",
                  "CSS3",
                  "TypeScript",
                  "Sass",
                  "Less"
                ],
                "skills": [
                  "后台系统开发",
                  "CRUD开发",
                  "接口联调",
                  "需求沟通",
                  "跨端兼容",
                  "技术文档编写",
                  "Mock数据开发",
                  "组件库使用"
                ],
                "tools": [
                  "Ant Design Pro",
                  "Element Plus",
                  "Apifox",
                  "Mock.js",
                  "Chrome DevTools",
                  "Vite",
                  "Webpack",
                  "Notion"
                ],
                "concepts": [
                  "前后端分离",
                  "组件化开发",
                  "响应式设计",
                  "浏览器兼容",
                  "前端工程化",
                  "设计系统",
                  "敏捷开发",
                  "CI/CD"
                ]
              },
              "work_content": {
                "daily_tasks": [
                  {
                    "task": "开发和管理后台系统页面",
                    "time_ratio": "45%",
                    "detail": "大部分初级前端的工作集中在内部管理系统（Admin Dashboard），使用 Ant Design Pro / Element Plus 等组件库开发 CRUD 页面。工作内容重复性较高，但对熟悉框架和组件化思维很有帮助。"
                  },
                  {
                    "task": "与产品经理和设计师沟通需求",
                    "time_ratio": "15%",
                    "detail": "参与需求评审会，理解产品需求文档（PRD），对不明确的需求点提出疑问。实际工作中需求变更频繁，需要学会管理预期和沟通边界。"
                  },
                  {
                    "task": "联调和接口对接",
                    "time_ratio": "20%",
                    "detail": "后端接口经常延期或字段变更，联调占据大量时间。需要学会用 Mock 数据先行开发，减少对后端进度的依赖。Apifox/Mock.js 是常用工具。"
                  },
                  {
                    "task": "处理跨端兼容和样式问题",
                    "time_ratio": "12%",
                    "detail": "不同浏览器（尤其是 Safari 和低版本 Chrome）的样式差异、移动端适配问题、以及第三方组件库样式覆盖是常见的头疼问题。"
                  },
                  {
                    "task": "技术文档编写和知识沉淀",
                    "time_ratio": "8%",
                    "detail": "新人通常需要编写组件使用文档、开发环境搭建指南等。使用 Notion/飞书文档/Confluence 记录踩坑经验和解决方案。"
                  }
                ],
                "jd_vs_reality": [
                  {
                    "jd_says": "与产品和设计团队紧密合作，打造极致用户体验",
                    "reality": "实际情况是需求经常变更，设计稿有时不完整或不符合前端实现逻辑。初级前端更多是被动接受需求，很少有机会从用户体验角度提出改进建议。沟通成本比想象中高很多。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "参与技术分享和开源贡献",
                    "reality": "大部分初级工程师没有时间也没有能力做开源贡献。技术分享通常是中级以上工程师的事。初级阶段更重要的是把分配的任务做好，而不是追求技术影响力。",
                    "gap_level": "medium"
                  },
                  {
                    "jd_says": "熟悉 Node.js，能独立搭建开发工具链",
                    "reality": "除非是全栈岗位，否则初级前端很少写 Node.js。开发工具链（脚手架、CI/CD）通常是团队统一配置好的，新人只需要会用就行。",
                    "gap_level": "low"
                  }
                ]
              },
              "core_skills": {
                "must_have": [
                  {
                    "skill": "React 或 Vue 及其生态",
                    "level": "熟练",
                    "why": "框架是找工作的硬门槛，不会框架基本过不了简历筛选",
                    "how_to_verify": "能用 React+Redux 或 Vue+Pinia 独立完成一个包含登录、列表、表单、权限控制的完整项目"
                  },
                  {
                    "skill": "JavaScript 基础（ES6+）",
                    "level": "熟练",
                    "why": "面试中 JS 基础是区分候选人水平的关键，也是日常开发中排查问题的根基",
                    "how_to_verify": "能解释清楚 var/let/const 区别、this 指向、Promise 原理、事件委托等常见面试题"
                  },
                  {
                    "skill": "CSS 布局和样式处理",
                    "level": "熟练",
                    "why": "页面还原是初级前端最核心的工作内容，样式能力直接影响产出质量",
                    "how_to_verify": "能用 Flexbox/Grid 实现常见布局，处理响应式断点，覆盖第三方组件库样式"
                  },
                  {
                    "skill": "HTTP 和接口对接",
                    "level": "熟练",
                    "why": "前后端分离架构下，接口对接是每天必做的工作",
                    "how_to_verify": "理解 RESTful 规范，能处理 Token 鉴权、跨域（CORS）、接口错误处理、请求拦截等"
                  },
                  {
                    "skill": "组件库使用（Ant Design / Element Plus）",
                    "level": "熟练",
                    "why": "企业级项目几乎都基于组件库开发，熟练使用能大幅提升开发效率",
                    "how_to_verify": "能快速查阅组件库文档，组合使用 Table/Form/Modal 等组件完成复杂业务页面"
                  }
                ],
                "nice_to_have": [
                  {
                    "skill": "TypeScript",
                    "level": "了解",
                    "why": "大厂和中大型公司越来越倾向使用 TS，掌握 TS 能拓宽求职范围",
                    "how_to_verify": "能在 React/Vue 项目中使用 TS 编写组件 props 类型和接口类型定义"
                  },
                  {
                    "skill": "前端测试（Jest / Cypress）",
                    "level": "了解",
                    "why": "外企和部分大厂对测试覆盖率有要求，但国内大多数公司不强制",
                    "how_to_verify": "能编写组件渲染测试和简单交互测试"
                  },
                  {
                    "skill": "移动端开发经验（React Native / 小程序）",
                    "level": "了解",
                    "why": "很多公司有小程序或 App 内嵌 H5 的需求，有相关经验是加分项",
                    "how_to_verify": "有至少一个小程序或 H5 移动端项目的开发经验"
                  }
                ]
              },
              "entry_advice": [
                {
                  "action": "不要只看视频教程，一定要动手写项目",
                  "priority": 1,
                  "estimated_time": "持续进行",
                  "resources": [
                    "GitHub 上找 2-3 个 star 较高的实战项目跟着做",
                    "自己从零搭建一个项目而不是用脚手架模板"
                  ],
                  "why": "看视频会有'都会了'的错觉，实际写代码时会发现大量问题。面试中能讲清项目细节比堆砌技术栈更有说服力"
                },
                {
                  "action": "刷前端面试题，建立知识体系",
                  "priority": 2,
                  "estimated_time": "2-4 周",
                  "resources": [
                    "《前端面试之道》",
                    "GitHub 前端面试题汇总仓库",
                    "掘金前端面试专栏"
                  ],
                  "why": "前端面试题覆盖面广且有一定套路，系统准备能显著提高通过率。重点准备 JS 基础、CSS 布局、框架原理、网络知识"
                },
                {
                  "action": "学会使用 Git 并维护一个活跃的 GitHub",
                  "priority": 3,
                  "estimated_time": "1 周",
                  "resources": [
                    "Pro Git 电子书",
                    "GitHub 官方教程",
                    "学习 Git Flow 工作流"
                  ],
                  "why": "GitHub 主页是前端工程师的名片，有持续提交记录的账号比空白账号有说服力得多"
                },
                {
                  "action": "了解前端工程化和部署流程",
                  "priority": 4,
                  "estimated_time": "1-2 周",
                  "resources": [
                    "Vite 官方文档",
                    "学习 Docker 基本概念",
                    "尝试将项目部署到 Vercel"
                  ],
                  "why": "了解代码从开发到上线的完整流程，面试中能体现你的工程化思维，而不是只会写页面"
                }
              ],
              "meta": {
                "source_type": "ai_synthesized_community",
                "source_detail": "AI 基于公开社区信息（知乎、V2EX、脉脉等）综合生成的模拟社区整理数据，非真实社区汇总",
                "contributor": null,
                "quality_score": 4.2,
                "review_status": "approved",
                "data_verification": {
                  "is_verified": false,
                  "verified_by": null,
                  "verified_at": null,
                  "verification_note": "AI 合成数据，待真实从业者验证后升级为已验证状态"
                },
                "created_at": "2026-04-17",
                "updated_at": "2026-04-17"
              }
            }
          ]
        }
      ]
    },
    {
      "category_id": "backend",
      "category_name": "后端开发",
      "jobs": [
        {
          "job_id": "backend-junior-java",
          "job_title": "初级Java后端开发工程师",
          "experience_level": "0-2年",
          "experiences": [
            {
              "id": "be_exp_001",
              "keywords": {
                "job_titles": [
                  "Java开发",
                  "Java工程师",
                  "后端开发",
                  "后端工程师",
                  "服务端开发",
                  "Java后端",
                  "初级Java开发",
                  "Java实习生"
                ],
                "tech_stack": [
                  "Java",
                  "Spring Boot",
                  "Spring Cloud",
                  "MySQL",
                  "Redis",
                  "MyBatis",
                  "MyBatis-Plus",
                  "Git"
                ],
                "skills": [
                  "接口开发",
                  "CRUD开发",
                  "SQL编写",
                  "慢查询优化",
                  "线上问题排查",
                  "接口文档编写",
                  "代码评审",
                  "前后端联调"
                ],
                "tools": [
                  "Swagger",
                  "Apifox",
                  "ELK",
                  "Prometheus",
                  "Grafana",
                  "Git",
                  "Maven",
                  "IntelliJ IDEA"
                ],
                "concepts": [
                  "RESTful API",
                  "微服务",
                  "分布式系统",
                  "缓存穿透",
                  "缓存击穿",
                  "数据库索引",
                  "ORM",
                  "三层架构"
                ]
              },
              "work_content": {
                "daily_tasks": [
                  {
                    "task": "开发业务接口和 CRUD 功能",
                    "time_ratio": "45%",
                    "detail": "根据产品需求文档开发 RESTful API，主要工作是写 Controller/Service/Mapper 三层代码。常见场景包括用户管理、订单处理、数据导出等。大部分工作是基于已有的代码模板和脚手架进行开发。"
                  },
                  {
                    "task": "编写和维护 SQL 语句",
                    "time_ratio": "20%",
                    "detail": "日常工作中大量涉及数据库操作，包括编写复杂查询 SQL、优化慢查询、设计表结构（通常由高级工程师主导，初级工程师参与评审）。MyBatis/MyBatis-Plus 是最常用的 ORM 框架。"
                  },
                  {
                    "task": "排查和修复线上问题",
                    "time_ratio": "15%",
                    "detail": "通过日志系统（ELK/日志易）和监控平台（Prometheus/Grafana）排查线上报错。常见问题包括 NullPointerException、接口超时、数据库死锁、Redis 缓存击穿等。"
                  },
                  {
                    "task": "编写技术文档和参与评审",
                    "time_ratio": "10%",
                    "detail": "编写接口文档（Swagger/Apifox）、技术方案文档、数据库设计文档。参与代码评审（Code Review）和技术方案评审，学习团队的最佳实践。"
                  },
                  {
                    "task": "联调和协助测试",
                    "time_ratio": "10%",
                    "detail": "与前端工程师联调接口，确认数据格式和边界情况。协助测试同学复现和定位 Bug，有时需要写数据修复脚本处理线上脏数据。"
                  }
                ],
                "jd_vs_reality": [
                  {
                    "jd_says": "参与系统架构设计和高并发方案制定",
                    "reality": "初级工程师基本不参与架构设计。系统架构、技术选型、中间件选型都是由技术负责人或架构师决定的。初级工程师的工作更多是'在已有架构内填充业务逻辑'。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "负责微服务架构的设计和治理",
                    "reality": "大部分初级工程师所在的项目虽然用了微服务（Spring Cloud），但主要是按规范调用其他服务的接口，并不需要理解服务注册发现、配置中心、熔断降级的底层原理。能正确使用 Feign 调用和处理超时重试就够了。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "具备分布式系统开发经验",
                    "reality": "初级阶段对分布式系统的理解停留在'会用'层面，比如用 Redis 做缓存、用 RabbitMQ 发消息、用分布式锁防并发。真正的分布式系统设计（一致性、分区容错）是高级工程师的领域。",
                    "gap_level": "medium"
                  }
                ]
              },
              "core_skills": {
                "must_have": [
                  {
                    "skill": "Java 基础（JDK 8+）",
                    "level": "熟练",
                    "why": "后端开发的核心语言，面试重点考察集合框架、多线程、JVM 基础、IO 模型等",
                    "how_to_verify": "能解释 HashMap 原理、线程池参数含义、GC 垃圾回收基本流程，能写出正确的并发代码"
                  },
                  {
                    "skill": "Spring Boot / Spring Cloud",
                    "level": "熟练",
                    "why": "Java 后端的标配框架，几乎所有企业级项目都在用，面试和日常工作都绕不开",
                    "how_to_verify": "能独立用 Spring Boot 搭建一个包含数据库交互、缓存、消息队列的完整服务"
                  },
                  {
                    "skill": "MySQL 数据库",
                    "level": "熟练",
                    "why": "关系型数据库是后端开发的基础，SQL 编写和优化能力直接影响系统性能",
                    "how_to_verify": "能编写复杂联表查询，理解索引原理（B+树），能通过 EXPLAIN 分析慢查询并优化"
                  },
                  {
                    "skill": "Redis",
                    "level": "熟练",
                    "why": "缓存是后端高并发场景的核心组件，面试高频考点",
                    "how_to_verify": "理解 Redis 常见数据结构和使用场景，能处理缓存穿透/击穿/雪崩问题，了解分布式锁的实现"
                  },
                  {
                    "skill": "Git 和 Linux 基本操作",
                    "level": "熟练",
                    "why": "代码管理和服务器操作是日常必备技能",
                    "how_to_verify": "能熟练使用 Git 分支管理，能在 Linux 服务器上查看日志、排查进程、分析问题"
                  }
                ],
                "nice_to_have": [
                  {
                    "skill": "消息队列（RabbitMQ / RocketMQ / Kafka）",
                    "level": "了解",
                    "why": "异步解耦和削峰填谷是常见需求，了解消息队列有助于理解系统架构",
                    "how_to_verify": "能实现基本的生产者和消费者逻辑，理解消息确认机制和死信队列"
                  },
                  {
                    "skill": "Docker 和容器化部署",
                    "level": "了解",
                    "why": "了解容器化有助于理解部署流程，但初级阶段通常不需要自己写 Dockerfile",
                    "how_to_verify": "知道 Docker 基本命令（build/run/docker-compose），理解镜像和容器的概念"
                  },
                  {
                    "skill": "MyBatis-Plus",
                    "level": "熟练",
                    "why": "国内 Java 项目使用率极高的 ORM 增强工具，能显著减少重复代码",
                    "how_to_verify": "能使用代码生成器快速搭建 CRUD，理解分页插件、逻辑删除、自动填充等特性"
                  }
                ]
              },
              "entry_advice": [
                {
                  "action": "系统学习 Java 基础和 Spring Boot",
                  "priority": 1,
                  "estimated_time": "3-4 个月",
                  "resources": [
                    "《Java 核心技术卷 I》",
                    "Spring Boot 官方文档",
                    "黑马程序员/尚硅谷 Spring Boot 实战课程",
                    "完成一个电商后台项目"
                  ],
                  "why": "Java 基础决定你的上限，Spring Boot 是找工作的入场券。建议先扎实基础再学框架，不要本末倒置"
                },
                {
                  "action": "掌握 MySQL 和 Redis 的核心知识",
                  "priority": 2,
                  "estimated_time": "1-2 个月",
                  "resources": [
                    "《MySQL 是怎样运行的》",
                    "Redis 官方文档",
                    "LeetCode 数据库题",
                    "小林 coding 图解系列"
                  ],
                  "why": "数据库是后端面试中区分度最高的模块，索引优化和 Redis 应用场景是高频考点"
                },
                {
                  "action": "准备一个完整的 Spring Boot 项目",
                  "priority": 3,
                  "estimated_time": "1-2 个月",
                  "resources": [
                    "GitHub 上的开源电商/博客项目",
                    "跟着项目从 0 到 1 搭建，包含用户认证、权限管理、支付对接等模块"
                  ],
                  "why": "面试中能讲清楚项目架构、技术选型理由、遇到的难点和解决方案，比罗列技术栈有效得多"
                },
                {
                  "action": "刷 Java 后端面试八股文",
                  "priority": 4,
                  "estimated_time": "2-3 周",
                  "resources": [
                    "JavaGuide（GitHub）",
                    "小林 coding",
                    "美团技术团队博客"
                  ],
                  "why": "国内 Java 后端面试有明显的'八股文'特征，系统准备常见面试题能显著提高通过率。重点准备 JVM、并发编程、MySQL、Redis、Spring"
                }
              ],
              "meta": {
                "source_type": "ai_synthesized_interview",
                "source_detail": "AI 基于公开社区信息（知乎、V2EX、脉脉等）综合生成的模拟访谈数据，非真实访谈",
                "contributor": null,
                "quality_score": 4.6,
                "review_status": "approved",
                "data_verification": {
                  "is_verified": false,
                  "verified_by": null,
                  "verified_at": null,
                  "verification_note": "AI 合成数据，待真实从业者验证后升级为已验证状态"
                },
                "created_at": "2026-04-17",
                "updated_at": "2026-04-17"
              }
            },
            {
              "id": "be_exp_002",
              "keywords": {
                "job_titles": [
                  "Java开发",
                  "Java工程师",
                  "后端开发",
                  "后端工程师",
                  "服务端开发",
                  "Java后端",
                  "服务端工程师",
                  "后端研发"
                ],
                "tech_stack": [
                  "Java",
                  "Spring Boot",
                  "Spring Cloud",
                  "MySQL",
                  "Redis",
                  "MyBatis-Plus",
                  "XXL-JOB",
                  "JUnit"
                ],
                "skills": [
                  "系统维护",
                  "定时任务开发",
                  "需求评审",
                  "线上值班",
                  "故障响应",
                  "单元测试",
                  "业务建模",
                  "数据修复"
                ],
                "tools": [
                  "Jira",
                  "飞书",
                  "ELK",
                  "Prometheus",
                  "Grafana",
                  "Git",
                  "JUnit",
                  "Mockito"
                ],
                "concepts": [
                  "微服务架构",
                  "服务注册发现",
                  "熔断降级",
                  "OOM",
                  "数据库连接池",
                  "领域建模",
                  "设计模式",
                  "DevOps"
                ]
              },
              "work_content": {
                "daily_tasks": [
                  {
                    "task": "维护和迭代现有业务系统",
                    "time_ratio": "40%",
                    "detail": "初级 Java 后端大量时间花在维护已有系统上，包括修 Bug、加字段、改接口逻辑、适配新需求。这些系统通常代码质量参差不齐，需要耐心阅读和理解老代码。"
                  },
                  {
                    "task": "编写定时任务和数据同步脚本",
                    "time_ratio": "15%",
                    "detail": "使用 XXL-JOB 或 Spring @Scheduled 编写定时任务，常见场景包括数据同步、报表生成、过期数据清理、对账等。这部分工作逻辑不复杂但需要仔细处理边界情况。"
                  },
                  {
                    "task": "参与需求评审和技术方案设计",
                    "time_ratio": "10%",
                    "detail": "参加产品需求评审会，理解业务背景和需求细节。初级工程师通常负责编写技术方案中的'接口设计'和'数据库变更'部分，整体方案由高级工程师把控。"
                  },
                  {
                    "task": "线上值班和故障响应",
                    "time_ratio": "15%",
                    "detail": "轮流参与线上值班，处理告警和用户反馈的线上问题。需要熟悉日志查询工具和监控平台，能在压力下快速定位问题。常见问题包括 OOM、数据库连接池耗尽、接口超时等。"
                  },
                  {
                    "task": "编写单元测试和参与代码评审",
                    "time_ratio": "10%",
                    "detail": "使用 JUnit + Mockito 编写 Service 层单元测试。部分公司对测试覆盖率有硬性要求（如核心逻辑 80% 以上）。Code Review 中学习高级工程师的代码风格和设计模式。"
                  },
                  {
                    "task": "学习业务知识和领域建模",
                    "time_ratio": "10%",
                    "detail": "后端开发需要深入理解业务领域，比如电商的订单流转、支付对账、库存扣减等。初级工程师需要花大量时间学习业务知识，这往往比纯技术学习更耗时。"
                  }
                ],
                "jd_vs_reality": [
                  {
                    "jd_says": "参与核心系统的设计和开发，推动技术创新",
                    "reality": "初级工程师很少接触核心系统，通常被分配到边缘业务或内部工具。技术创新更是遥不可及，大部分时间在做重复性的 CRUD 开发。想要接触核心系统需要先证明自己的能力。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "良好的沟通能力和团队协作精神",
                    "reality": "JD 里一句话带过的'沟通能力'，实际上占据了大量工作时间。需要和产品经理扯需求边界、和前端对接口字段、和测试确认用例、和 DBA 申请数据库变更。沟通成本可能占到你 30% 的工作时间。",
                    "gap_level": "medium"
                  },
                  {
                    "jd_says": "熟悉 DevOps 流程，参与 CI/CD 建设",
                    "reality": "CI/CD 流程通常是运维或 SRE 团队负责的，后端开发只需要会触发构建和查看部署状态。初级工程师很少需要写 Jenkins Pipeline 或 Docker Compose 配置。",
                    "gap_level": "low"
                  }
                ]
              },
              "core_skills": {
                "must_have": [
                  {
                    "skill": "Java 编程基础",
                    "level": "熟练",
                    "why": "Java 后端的安身立命之本，面试考察深度远超日常使用",
                    "how_to_verify": "能流利回答集合框架源码、并发编程（synchronized/volatile/线程池）、JVM 内存模型和 GC 等问题"
                  },
                  {
                    "skill": "Spring 生态（Boot + Cloud）",
                    "level": "熟练",
                    "why": "国内 Java 后端事实标准，不会 Spring 基本找不到工作",
                    "how_to_verify": "理解 IoC/AOP 原理，能说清 Bean 生命周期，会使用 Spring Cloud 常用组件（Nacos/Feign/Sentinel/Gateway）"
                  },
                  {
                    "skill": "MySQL 数据库设计与优化",
                    "level": "熟练",
                    "why": "数据存储是后端系统的核心，SQL 能力直接影响系统性能和稳定性",
                    "how_to_verify": "能设计合理的表结构和索引，通过 EXPLAIN 分析执行计划，处理慢查询优化"
                  },
                  {
                    "skill": "Redis 缓存应用",
                    "level": "熟练",
                    "why": "高并发场景必备组件，面试必问缓存相关问题",
                    "how_to_verify": "能正确使用 Redis 五大数据结构，处理缓存一致性、穿透/击穿/雪崩，实现简单的分布式锁"
                  },
                  {
                    "skill": "RESTful API 设计",
                    "level": "熟练",
                    "why": "前后端分离架构下，接口设计是后端工程师的基本功",
                    "how_to_verify": "能设计规范的 API（URL 命名、HTTP 方法、状态码、统一响应格式），编写清晰的接口文档"
                  }
                ],
                "nice_to_have": [
                  {
                    "skill": "消息队列（RocketMQ/Kafka）",
                    "level": "了解",
                    "why": "异步解耦是复杂系统的标配，了解消息队列有助于理解系统设计",
                    "how_to_verify": "能实现基本的生产消费逻辑，理解消息丢失、重复消费等问题的解决方案"
                  },
                  {
                    "skill": "Elasticsearch",
                    "level": "了解",
                    "why": "搜索和日志分析场景常用，有使用经验是加分项",
                    "how_to_verify": "能编写基本的 DSL 查询，理解倒排索引原理"
                  },
                  {
                    "skill": "设计模式",
                    "level": "了解",
                    "why": "阅读老代码和参与 Code Review 时经常遇到，理解常见模式有助于写出更优雅的代码",
                    "how_to_verify": "能识别代码中的单例、工厂、策略、观察者等模式，知道它们的使用场景"
                  }
                ]
              },
              "entry_advice": [
                {
                  "action": "Java 基础和 JVM 是核心竞争力，不要只学框架",
                  "priority": 1,
                  "estimated_time": "2-3 个月",
                  "resources": [
                    "《深入理解 Java 虚拟机》（周志明）",
                    "JavaGuide 面试指南",
                    "美团技术博客 JVM 系列"
                  ],
                  "why": "只会用 Spring Boot 写 CRUD 的人太多了，JVM 和并发编程是拉开差距的关键。面试中这些知识点能体现你的技术深度"
                },
                {
                  "action": "一定要有能拿得出手的项目经历",
                  "priority": 2,
                  "estimated_time": "1-2 个月",
                  "resources": [
                    "GitHub 热门 Java 开源项目（如 mall、eladmin）",
                    "自己动手实现一个简化版电商系统"
                  ],
                  "why": "面试官更看重你做了什么而不是学了什么。有完整项目经历（包含技术难点和解决方案）的候选人通过率高很多"
                },
                {
                  "action": "重视 SQL 能力，这是最容易拉开差距的技能",
                  "priority": 3,
                  "estimated_time": "2-4 周",
                  "resources": [
                    "LeetCode 数据库题（简单+中等）",
                    "《SQL 必知必会》",
                    "实际项目中练习复杂查询"
                  ],
                  "why": "很多候选人 SQL 写得很差，如果你能熟练编写复杂查询并优化慢查询，在面试和实际工作中都是明显优势"
                },
                {
                  "action": "了解业务领域知识，不要只做'技术人'",
                  "priority": 4,
                  "estimated_time": "持续学习",
                  "resources": [
                    "阅读所在行业的业务相关书籍/文章",
                    "和产品经理多交流了解业务背景",
                    "画业务流程图帮助理解"
                  ],
                  "why": "后端开发本质上是'用技术解决业务问题'，理解业务才能写出合理的代码。面试中能结合业务场景讨论技术方案是加分项"
                }
              ],
              "meta": {
                "source_type": "ai_synthesized_community",
                "source_detail": "AI 基于公开社区信息（知乎、V2EX、脉脉等）综合生成的模拟社区整理数据，非真实社区汇总",
                "contributor": null,
                "quality_score": 4.3,
                "review_status": "approved",
                "data_verification": {
                  "is_verified": false,
                  "verified_by": null,
                  "verified_at": null,
                  "verification_note": "AI 合成数据，待真实从业者验证后升级为已验证状态"
                },
                "created_at": "2026-04-17",
                "updated_at": "2026-04-17"
              }
            }
          ]
        }
      ]
    }
  ]
},
  "product-operations": {
  "version": "1.0",
  "updated_at": "2026-04-17",
  "categories": [
    {
      "category_id": "product_manager",
      "category_name": "产品经理",
      "jobs": [
        {
          "job_id": "pm-junior",
          "job_title": "初级产品经理",
          "experience_level": "0-2年",
          "experiences": [
            {
              "id": "pm_exp_001",
              "keywords": {
                "job_titles": [
                  "产品经理",
                  "产品助理",
                  "PM",
                  "初级产品经理",
                  "产品专员",
                  "产品管培生",
                  "助理产品经理",
                  "互联网产品经理"
                ],
                "tech_stack": [
                  "Axure",
                  "Figma",
                  "Jira",
                  "SQL",
                  "Excel",
                  "飞书",
                  "Tapd",
                  "Confluence"
                ],
                "skills": [
                  "PRD编写",
                  "原型设计",
                  "需求评审",
                  "项目跟进",
                  "数据埋点",
                  "竞品分析",
                  "跨部门沟通",
                  "周报撰写"
                ],
                "tools": [
                  "Axure",
                  "Figma",
                  "Jira",
                  "飞书项目",
                  "Excel",
                  "SQL",
                  "XMind",
                  "Visio"
                ],
                "concepts": [
                  "PRD",
                  "DAU",
                  "MAU",
                  "留存率",
                  "渗透率",
                  "数据埋点",
                  "A/B测试",
                  "敏捷开发"
                ]
              },
              "work_content": {
                "daily_tasks": [
                  {
                    "task": "需求评审与文档编写",
                    "time_ratio": "35%",
                    "detail": "每周至少写2-3份PRD，使用Axure/Figma画原型，配合竞品截图做功能对比。需求评审会上要面对开发质疑功能价值，经常被要求补充数据论证。实际上大部分需求来自上级或业务方，自主发现需求的机会很少。"
                  },
                  {
                    "task": "项目跟进与进度管理",
                    "time_ratio": "25%",
                    "detail": "每天参加站会，用Jira/飞书项目跟进开发进度。遇到开发延期是常态，需要反复沟通协调。实际上初级PM没有真正的资源调度权，更多是'传话筒'角色，催进度靠的是人情而非流程。"
                  },
                  {
                    "task": "数据埋点与报表整理",
                    "time_ratio": "20%",
                    "detail": "每次上线新功能要提埋点需求，等数据团队排期（通常要等1-2周）。上线后每周导出数据做周报，核心指标包括DAU、功能渗透率、留存率等。实际工作中大量时间花在数据清洗和Excel处理上，真正做数据分析的时间很少。"
                  },
                  {
                    "task": "竞品调研与用户反馈收集",
                    "time_ratio": "10%",
                    "detail": "每月做一次竞品分析报告，主要方式是下载竞品App截图对比功能差异。用户反馈来源是客服转来的工单和App Store评论。真正做用户访谈的机会极少，多数'用户洞察'其实是拍脑袋。"
                  },
                  {
                    "task": "跨部门沟通与会议",
                    "time_ratio": "10%",
                    "detail": "每周参加周会、月度复盘会、业务对齐会等大量会议。很多会议没有明确议程和结论，但PM必须到场'代表产品侧'。实际产出很低，但缺席会被认为'不配合'。"
                  }
                ],
                "jd_vs_reality": [
                  {
                    "jd_says": "负责产品全生命周期管理，从需求调研、产品设计到上线迭代",
                    "reality": "初级PM基本只负责产品生命周期的'执行环节'。需求调研通常是上级或业务方直接给结论，你只负责把结论变成PRD；上线迭代也是跟着版本节奏走，自主决定做什么功能的机会极少。所谓'全生命周期'更多是中高级PM的权限，初级PM本质上是'需求翻译官'。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "通过数据分析驱动产品决策，持续优化用户体验",
                    "reality": "数据驱动的前提是你有取数权限和分析能力。实际上大部分初级PM的数据工作停留在'做报表'层面——每周导数据、做Excel图表、写周报。真正的A/B测试需要数据团队配合，排期往往要等很久。很多'数据驱动决策'最后变成了'用数据证明上级已经做的决策是对的'。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "与研发、设计、运营紧密协作，推动产品目标达成",
                    "reality": "协作是真实的，但'推动'是假的。初级PM没有任何实质性的考核权限，开发延期你只能催不能罚，设计师不配合你只能忍。实际工作中PM更像是'润滑剂'，靠的是沟通技巧和个人关系维护，而非流程和制度。考核指标（KPI）通常是功能按时上线率和上线后数据达标率，但这两个指标经常互相矛盾——赶上线就没时间打磨，打磨就来不及上线。",
                    "gap_level": "medium"
                  }
                ]
              },
              "core_skills": {
                "must_have": [
                  {
                    "skill": "PRD文档编写",
                    "level": "熟练",
                    "why": "这是初级PM最核心的产出物，直接决定开发能否理解需求。一份清晰的PRD能减少50%以上的沟通成本。",
                    "how_to_verify": "给一个具体功能需求，48小时内产出结构完整、逻辑清晰的PRD，包含用户故事、业务流程图、异常场景处理"
                  },
                  {
                    "skill": "原型设计（Axure/Figma）",
                    "level": "熟练",
                    "why": "评审会上原型是沟通的主要载体。画得越清晰，开发理解偏差越小，返工越少。",
                    "how_to_verify": "能独立完成一个中等复杂度页面（如商品详情页）的交互原型，包含正常流程和至少5种异常状态"
                  },
                  {
                    "skill": "Excel数据处理",
                    "level": "熟练",
                    "why": "日常周报、月报、数据复盘都依赖Excel。VLOOKUP、数据透视表是基本操作，不会的话会被数据拖垮。",
                    "how_to_verify": "给一份原始埋点数据CSV，30分钟内完成数据清洗并产出包含趋势图和关键指标汇总的报表"
                  },
                  {
                    "skill": "跨部门沟通与需求管理",
                    "level": "基本",
                    "why": "PM每天70%以上的时间在沟通。能不能把需求讲清楚、能不能处理冲突，直接决定工作推进效率。",
                    "how_to_verify": "模拟一个需求评审场景，面对开发的质疑能给出合理的业务逻辑解释和替代方案"
                  },
                  {
                    "skill": "SQL基础查询",
                    "level": "了解",
                    "why": "虽然大部分公司有数据团队，但能自己写SQL取数能大幅提升效率，不用等排期。",
                    "how_to_verify": "能独立写出多表JOIN、GROUP BY、HAVING等常用查询语句"
                  }
                ],
                "nice_to_have": [
                  {
                    "skill": "用户调研方法",
                    "level": "了解",
                    "why": "真正做过用户访谈的初级PM很少，掌握基本方法能在面试和实际工作中脱颖而出",
                    "how_to_verify": "能设计一份用户访谈提纲，包含开场、核心问题、追问技巧"
                  },
                  {
                    "skill": "竞品分析框架",
                    "level": "了解",
                    "why": "结构化的竞品分析比简单的功能对比更有说服力",
                    "how_to_verify": "能使用SWOT或用户体验五要素框架完成一份竞品分析报告"
                  },
                  {
                    "skill": "项目管理工具",
                    "level": "了解",
                    "why": "熟悉Jira/飞书项目/Tapd等工具能快速上手工作",
                    "how_to_verify": "能演示如何在Jira中创建Epic、Story、Task并设置依赖关系"
                  }
                ]
              },
              "entry_advice": [
                {
                  "action": "系统学习PRD写作规范，完成至少3份完整PRD练习",
                  "priority": 1,
                  "estimated_time": "2-3周",
                  "resources": [
                    "《产品经理实战手册》- 刘飞",
                    "人人都是产品经理社区PRD模板",
                    "各公司公开的PRD范例"
                  ],
                  "why": "PRD是初级PM的立身之本，面试时也会被要求展示作品。提前练好能直接缩短入职适应期。"
                },
                {
                  "action": "熟练掌握Axure或Figma原型工具",
                  "priority": 2,
                  "estimated_time": "1-2周",
                  "resources": [
                    "Axure官方教程",
                    "Figma社区免费模板",
                    "B站Axure入门系列视频"
                  ],
                  "why": "原型能力直接影响需求评审效率，也是面试加分项。建议选一个工具深入学，不要两个都浅尝辄止。"
                },
                {
                  "action": "学习SQL基础，能独立完成简单数据查询",
                  "priority": 3,
                  "estimated_time": "1周",
                  "resources": [
                    "SQLZOO在线练习",
                    "LeetCode SQL题库（简单难度）",
                    "《SQL必知必会》"
                  ],
                  "why": "很多初级PM因为不会SQL，每次取数都要等数据团队排期，严重影响工作效率。掌握基础SQL能让你在团队中快速建立专业形象。"
                },
                {
                  "action": "准备一份完整的'产品分析报告'作为面试作品",
                  "priority": 4,
                  "estimated_time": "1-2周",
                  "resources": [
                    "选择一个你常用的App进行深度分析",
                    "参考人人都是产品经理上的优秀分析文章结构"
                  ],
                  "why": "面试时展示一份有深度的产品分析报告，比单纯说'我热爱产品'有说服力得多。重点展示你的分析框架和逻辑思维，而不是堆砌功能对比。"
                }
              ],
              "meta": {
                "source_type": "ai_synthesized_interview",
                "source_detail": "AI 基于公开社区信息（知乎、V2EX、脉脉等）综合生成的模拟访谈数据，非真实访谈",
                "contributor": null,
                "quality_score": 4.5,
                "review_status": "approved",
                "data_verification": {
                  "is_verified": false,
                  "verified_by": null,
                  "verified_at": null,
                  "verification_note": "AI 合成数据，待真实从业者验证后升级为已验证状态"
                },
                "created_at": "2026-04-17",
                "updated_at": "2026-04-17"
              }
            },
            {
              "id": "pm_exp_002",
              "keywords": {
                "job_titles": [
                  "产品经理",
                  "产品助理",
                  "PM",
                  "初级产品经理",
                  "产品专员",
                  "助理产品经理",
                  "产品运营",
                  "需求分析师"
                ],
                "tech_stack": [
                  "Axure",
                  "Figma",
                  "Jira",
                  "SQL",
                  "Excel",
                  "飞书",
                  "XMind",
                  "ProcessOn"
                ],
                "skills": [
                  "需求收集",
                  "优先级排序",
                  "产品方案设计",
                  "UAT验收",
                  "Bug跟踪",
                  "数据监控",
                  "流程图绘制",
                  "文档写作"
                ],
                "tools": [
                  "Figma",
                  "Axure",
                  "Jira",
                  "飞书",
                  "XMind",
                  "ProcessOn",
                  "Excel",
                  "SQL"
                ],
                "concepts": [
                  "RICE模型",
                  "Kano模型",
                  "产品路线图",
                  "转化漏斗",
                  "需求池",
                  "迭代管理",
                  "用户画像",
                  "MVP"
                ]
              },
              "work_content": {
                "daily_tasks": [
                  {
                    "task": "需求收集与整理",
                    "time_ratio": "30%",
                    "detail": "通过工单系统、用户群、客服反馈、业务方提需求等渠道收集需求。每周要整理需求池，按优先级排序。实际上需求来源杂乱，很多需求是老板一句话，没有背景说明。初级PM需要自己补全需求背景和价值论证。"
                  },
                  {
                    "task": "产品方案设计与评审",
                    "time_ratio": "25%",
                    "detail": "根据确定的需求产出产品方案，包括流程图、原型、PRD。评审时需要面对技术可行性、设计一致性、业务价值等多方质疑。实际工作中方案经常被推翻重来，平均一个需求要改3-5版才能定稿。"
                  },
                  {
                    "task": "上线验收与Bug跟踪",
                    "time_ratio": "20%",
                    "detail": "功能开发完成后进行UAT验收，对照PRD逐条检查。验收不通过是常态，常见问题包括边界场景未处理、交互细节与原型不一致。上线后还要持续跟踪Bug修复进度，每周出Bug修复报告。"
                  },
                  {
                    "task": "数据监控与周报",
                    "time_ratio": "15%",
                    "detail": "每天查看核心数据看板，关注DAU、功能使用率、转化漏斗等指标。每周五提交产品周报，内容包括本周上线功能回顾、数据表现、下周计划。实际上周报的读者主要是直属上级，很多内容是'写给别人看'的。"
                  },
                  {
                    "task": "会议与沟通协调",
                    "time_ratio": "10%",
                    "detail": "包括每日站会、需求评审会、项目排期会、业务对齐会等。初级PM在会议中通常是'记录者'角色，发言机会有限。但会议是了解其他部门工作方式和建立关系的重要渠道。"
                  }
                ],
                "jd_vs_reality": [
                  {
                    "jd_says": "深入理解用户需求，挖掘用户痛点，定义产品功能",
                    "reality": "初级PM很少有机会直接接触用户。所谓的'理解用户需求'，实际上是通过二手信息（客服工单、用户评论、数据报表）来推测用户想法。真正做用户调研、深度访谈的工作，通常由用研团队或高级PM来完成。初级PM更多是'需求执行者'而非'需求发现者'。KPI考核的是需求交付质量和上线数据，而非你发现了多少用户痛点。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "制定产品路线图，规划产品迭代方向",
                    "reality": "产品路线图是产品总监或业务负责人制定的，初级PM最多参与讨论，没有决策权。实际工作中你的'规划'局限于下一个版本做什么功能，而且这些功能往往已经由上级或业务方确定了。KPI考核重点是版本按时交付率和功能上线后的核心指标达成情况，与'规划能力'关系不大。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "与设计、研发团队高效协作，确保产品高质量交付",
                    "reality": "'高效协作'在现实中意味着大量的沟通成本。设计稿经常因为业务方临时改需求而推翻，开发因为技术债务或排期紧张而砍功能。初级PM没有考核其他部门的权力，所谓的'确保质量'更多是靠反复验收和Bug跟踪。实际上线质量往往取决于开发团队的能力和态度，PM能影响的非常有限。",
                    "gap_level": "medium"
                  }
                ]
              },
              "core_skills": {
                "must_have": [
                  {
                    "skill": "需求分析与优先级判断",
                    "level": "熟练",
                    "why": "初级PM每天面对大量需求，能不能准确判断优先级直接影响工作效率和上级信任度",
                    "how_to_verify": "给一组真实需求列表，能在30分钟内用RICE或Kano模型完成优先级排序并说明理由"
                  },
                  {
                    "skill": "流程图绘制",
                    "level": "熟练",
                    "why": "流程图是PRD的核心组成部分，也是评审会上最容易被挑战的部分。逻辑清晰的流程图能大幅减少开发理解偏差",
                    "how_to_verify": "能独立画出包含分支、异常、回退的完整业务流程图，无逻辑漏洞"
                  },
                  {
                    "skill": "原型设计",
                    "level": "熟练",
                    "why": "原型是沟通产品方案的主要工具，也是面试时的核心作品展示",
                    "how_to_verify": "能独立完成一个完整功能模块（如注册登录流程）的高保真原型"
                  },
                  {
                    "skill": "数据分析基础",
                    "level": "基本",
                    "why": "产品上线后需要用数据验证效果，不会看数据就无法判断功能是否成功",
                    "how_to_verify": "能解读常见的漏斗分析、留存分析、同期群分析报表，并得出有意义的结论"
                  },
                  {
                    "skill": "文档写作能力",
                    "level": "熟练",
                    "why": "PRD、周报、项目总结、竞品分析——PM的工作产出几乎全是文档形式",
                    "how_to_verify": "产出的文档结构清晰、逻辑严密、无歧义，评审时不需要反复解释"
                  }
                ],
                "nice_to_have": [
                  {
                    "skill": "技术理解力",
                    "level": "了解",
                    "why": "了解基本的前后端技术原理能让PM更好地评估需求可行性，减少与开发的沟通摩擦",
                    "how_to_verify": "能理解API接口、数据库基本概念、前端组件化等常见技术术语"
                  },
                  {
                    "skill": "商业分析能力",
                    "level": "了解",
                    "why": "理解业务模式和盈利逻辑能让PM提出更有商业价值的产品方案",
                    "how_to_verify": "能分析一个产品的商业模式画布，识别核心收入来源和成本结构"
                  },
                  {
                    "skill": "设计审美基础",
                    "level": "了解",
                    "why": "有基本的设计感能让PM在评审设计稿时提出更有建设性的意见",
                    "how_to_verify": "能指出设计稿中的间距、对齐、配色等基础问题"
                  }
                ]
              },
              "entry_advice": [
                {
                  "action": "积累产品分析作品，建立个人作品集",
                  "priority": 1,
                  "estimated_time": "持续进行",
                  "resources": [
                    "人人都是产品经理社区",
                    "PMcaff产品经理社区",
                    "个人公众号/知乎专栏"
                  ],
                  "why": "面试时作品集比简历更有说服力。建议每分析一个产品就沉淀一篇分析文章，既能练习思维又能积累面试素材。"
                },
                {
                  "action": "学习需求分析方法论（Kano模型、RICE评分等）",
                  "priority": 2,
                  "estimated_time": "1周",
                  "resources": [
                    "《启示录：打造用户喜爱的产品》",
                    "产品经理网相关方法论文章",
                    "Intercom博客（英文，有中文翻译）"
                  ],
                  "why": "需求优先级判断是PM最核心的能力之一，掌握结构化方法能让你在面对大量需求时不慌乱。"
                },
                {
                  "action": "练习画原型和写PRD，至少完成2个完整案例",
                  "priority": 3,
                  "estimated_time": "2-3周",
                  "resources": [
                    "Figma免费版",
                    "语雀/飞书文档PRD模板",
                    "各大招聘网站JD中提到的产品作为练习对象"
                  ],
                  "why": "原型和PRD是初级PM的日常产出，提前练习能让你入职后快速上手。建议选择你熟悉的App作为练习对象，这样更容易发现真实的产品问题。"
                },
                {
                  "action": "了解目标行业的基本业务逻辑和术语",
                  "priority": 4,
                  "estimated_time": "1-2周",
                  "resources": [
                    "行业研究报告（艾瑞咨询、QuestMobile）",
                    "36氪行业频道",
                    "目标公司的招股书或年报"
                  ],
                  "why": "面试时如果对行业一无所知，很难通过。至少要了解目标行业的盈利模式、核心指标、主要玩家和近期趋势。"
                }
              ],
              "meta": {
                "source_type": "ai_synthesized_community",
                "source_detail": "AI 基于公开社区信息（知乎、V2EX、脉脉等）综合生成的模拟社区整理数据，非真实社区汇总",
                "contributor": null,
                "quality_score": 4.2,
                "review_status": "approved",
                "data_verification": {
                  "is_verified": false,
                  "verified_by": null,
                  "verified_at": null,
                  "verification_note": "AI 合成数据，待真实从业者验证后升级为已验证状态"
                },
                "created_at": "2026-04-17",
                "updated_at": "2026-04-17"
              }
            }
          ]
        }
      ]
    },
    {
      "category_id": "operations",
      "category_name": "运营",
      "jobs": [
        {
          "job_id": "ops-junior",
          "job_title": "新媒体运营/用户运营",
          "experience_level": "0-2年",
          "experiences": [
            {
              "id": "ops_exp_001",
              "keywords": {
                "job_titles": [
                  "新媒体运营",
                  "用户运营",
                  "内容运营",
                  "运营专员",
                  "社群运营",
                  "活动运营",
                  "新媒体编辑",
                  "运营助理"
                ],
                "tech_stack": [
                  "Excel",
                  "Canva",
                  "创客贴",
                  "剪映",
                  "秀米",
                  "135编辑器",
                  "巨量引擎",
                  "腾讯广告"
                ],
                "skills": [
                  "内容创作",
                  "文案写作",
                  "投流管理",
                  "社群运营",
                  "活动策划",
                  "数据报表",
                  "用户互动",
                  "热点追踪"
                ],
                "tools": [
                  "巨量引擎",
                  "腾讯广告",
                  "小红书聚光",
                  "Excel",
                  "Canva",
                  "创客贴",
                  "剪映",
                  "秀米"
                ],
                "concepts": [
                  "CPM",
                  "CPC",
                  "CPA",
                  "CTR",
                  "ROI",
                  "OCPM",
                  "私域流量",
                  "裂变增长"
                ]
              },
              "work_content": {
                "daily_tasks": [
                  {
                    "task": "内容创作与发布",
                    "time_ratio": "35%",
                    "detail": "每天需要产出1-3条内容，包括公众号文章、小红书图文、抖音短视频脚本等。实际工作中大部分内容是'洗稿'或改编——找爆款内容改头换面，原创高质量内容占比不到20%。每条内容需要配图、排版、设置标签，发布后还要回复评论。"
                  },
                  {
                    "task": "投流与数据监控",
                    "time_ratio": "25%",
                    "detail": "管理信息流广告投放（巨量引擎/腾讯广告/小红书聚光），每天查看消耗、CPM、CPC、CTR等数据，根据数据调整出价和定向。实际上初级运营的投放预算很少（日均几百到几千），优化空间有限。KPI通常是获客成本（CPA）控制在某个阈值以下，但这个阈值经常被老板临时调低。"
                  },
                  {
                    "task": "用户社群运营",
                    "time_ratio": "20%",
                    "detail": "管理5-10个微信群（每个200-500人），每天在群里发早安/行业资讯/促销信息，回复用户问题，处理投诉。实际上大部分群是'死群'，活跃用户不到10%。所谓的'社群活跃度'KPI，很多时候靠发红包和抽奖来刷数据。"
                  },
                  {
                    "task": "活动策划与执行",
                    "time_ratio": "10%",
                    "detail": "每月策划1-2个小活动（抽奖、打卡、裂变海报等），从方案设计到物料制作到上线跟进。实际上活动策划的创意空间很小，大部分是照搬竞品或历史活动模板。活动效果评估主要看参与人数和转化率，但很多'参与'是内部员工凑数。"
                  },
                  {
                    "task": "数据报表与周报",
                    "time_ratio": "10%",
                    "detail": "每周整理各渠道数据（粉丝增长、阅读量、互动率、转化率等），制作Excel报表。月度还要做复盘PPT。实际上大部分时间花在从不同平台后台手动导出数据并整合，数据口径经常不一致，核对数据就要半天。"
                  }
                ],
                "jd_vs_reality": [
                  {
                    "jd_says": "负责内容策划与创作，打造品牌影响力，提升用户粘性",
                    "reality": "'内容策划'听起来高大上，实际就是每天追热点写推文/做短视频。所谓的'品牌影响力'在初级运营层面几乎不存在——你写的文章阅读量可能只有几百，而且大部分是公司内部转发。KPI考核的是阅读量、互动率（点赞+评论+转发）、粉丝增长数，但老板更关心的是'这篇内容带来了多少转化/线索'。很多运营的真实处境是：写内容没人看，有人看没转化，有转化老板嫌少。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "精通投流逻辑，优化投放ROI，实现精准获客",
                    "reality": "'精通投流'对初级运营来说基本不可能。投流是一个需要大量预算试错的技术活，初级运营手里的预算通常很少，而且出价、定向、素材优化等核心决策往往由上级或专门的投放优化师来做。初级运营的投流工作更多是'盯盘'——看消耗、看数据、汇报异常。KPI是CPA（单用户获客成本），但这个指标受市场竞争、产品本身吸引力等外部因素影响很大，运营能控制的非常有限。所谓'精准获客'，大部分时候就是'花最少的钱买到最多的人'，至于这些人是不是精准的，没人能保证。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "搭建用户增长体系，实现用户生命周期管理",
                    "reality": "'用户增长体系'是高级运营/增长黑客的活，初级运营最多参与执行。实际工作中所谓的'生命周期管理'就是：拉新（投流/裂变）→ 活跃（社群/内容）→ 留存（推送/活动）→ 变现（促销/转化），每个环节初级运营只负责执行具体动作，不负责体系设计。KPI通常拆解为：月新增用户数、7日留存率、月活跃用户数（MAU）、付费转化率。但这些指标往往是整个团队共同承担，初级运营的贡献很难单独量化。",
                    "gap_level": "high"
                  }
                ]
              },
              "core_skills": {
                "must_have": [
                  {
                    "skill": "文案写作",
                    "level": "熟练",
                    "why": "内容是运营的基本盘。无论是公众号文章、小红书种草文还是短视频脚本，都需要扎实的文案功底。标题决定了打开率，开头决定了完读率。",
                    "how_to_verify": "给一个产品卖点，30分钟内写出3个不同风格的标题和一段200字的种草文案"
                  },
                  {
                    "skill": "数据报表制作",
                    "level": "熟练",
                    "why": "运营每天都要看数据、做报表。Excel不熟练的话，光是整理各平台数据就要花半天时间。",
                    "how_to_verify": "给多份不同格式的原始数据，1小时内整合成一份包含图表的周报模板"
                  },
                  {
                    "skill": "基础设计能力",
                    "level": "基本",
                    "why": "运营经常需要自己配图、做海报、做活动页面。虽然不需要专业设计水平，但至少要能用Canva/创客贴/PS做出看得过去的物料。",
                    "how_to_verify": "用Canva或PS在30分钟内完成一张活动海报，包含主标题、副标题、CTA按钮、二维码"
                  },
                  {
                    "skill": "社交媒体平台规则理解",
                    "level": "熟练",
                    "why": "每个平台（微信、小红书、抖音、B站）的算法、推荐机制、内容偏好完全不同。不了解规则就做不出有效果的内容。",
                    "how_to_verify": "能说出至少3个平台的核心推荐算法逻辑和内容审核红线"
                  },
                  {
                    "skill": "社群管理",
                    "level": "基本",
                    "why": "社群运营是用户运营的基本功，虽然枯燥但几乎是每个运营的必做工作。",
                    "how_to_verify": "能设计一套社群日常运营SOP，包含早安问候、内容分享、互动话题、促销引导等环节"
                  }
                ],
                "nice_to_have": [
                  {
                    "skill": "短视频剪辑",
                    "level": "了解",
                    "why": "短视频是当前流量最大的内容形式，会剪视频能大幅提升内容产出效率",
                    "how_to_verify": "能用剪映独立完成一条30秒的短视频，包含字幕、配乐、转场"
                  },
                  {
                    "skill": "投放平台操作",
                    "level": "了解",
                    "why": "了解巨量引擎/腾讯广告后台的基本操作，能让你在面试和实际工作中更有竞争力",
                    "how_to_verify": "能描述一个完整的投放计划创建流程，包括计划、组、创意三个层级"
                  },
                  {
                    "skill": "数据分析思维",
                    "level": "了解",
                    "why": "能从数据中发现问题并提出优化建议，是初级运营向中级运营进阶的关键能力",
                    "how_to_verify": "给一份运营数据报表，能指出3个异常数据点并提出可能的原因和优化方向"
                  }
                ]
              },
              "entry_advice": [
                {
                  "action": "运营一个个人自媒体账号（建议小红书或公众号），积累真实数据",
                  "priority": 1,
                  "estimated_time": "持续3个月以上",
                  "resources": [
                    "小红书运营官方指南",
                    "新榜公众号行业报告",
                    "选择一个你感兴趣的垂直领域作为内容方向"
                  ],
                  "why": "面试时一个有真实数据的个人账号比任何证书都有说服力。而且运营个人账号的过程中，你会自然掌握内容创作、数据分析和用户互动的核心技能。"
                },
                {
                  "action": "系统学习文案写作技巧，特别是标题和开头写法",
                  "priority": 2,
                  "estimated_time": "1-2周",
                  "resources": [
                    "《文案训练手册》- 休格曼",
                    "爆款标题拆解（关注新榜、西瓜数据等平台的热门文章）",
                    "小红书爆款笔记分析"
                  ],
                  "why": "文案是运营的基本功，好的标题能让阅读量翻5-10倍。建议每天拆解3-5个爆款标题，分析其结构和心理触发点。"
                },
                {
                  "action": "熟练掌握Excel和至少一个设计工具",
                  "priority": 3,
                  "estimated_time": "1周",
                  "resources": [
                    "Excel：VLOOKUP、数据透视表、条件格式教程",
                    "Canva/创客贴在线设计工具（免费版即可）",
                    "B站相关速成教程"
                  ],
                  "why": "Excel做报表、Canva做配图，这两个工具几乎每天都要用。提前掌握能让你入职后不用在工具上浪费时间。"
                },
                {
                  "action": "了解主流投放平台的基本概念和操作流程",
                  "priority": 4,
                  "estimated_time": "3-5天",
                  "resources": [
                    "巨量引擎官方学院（免费课程）",
                    "腾讯广告营销学院",
                    "小红书聚光平台帮助文档"
                  ],
                  "why": "虽然初级运营不一定会直接操作投放后台，但了解基本概念（CPM/CPC/CPA/ROI/OCPM等）能让你在面试时显得更专业，也能更快理解工作中的数据指标。"
                }
              ],
              "meta": {
                "source_type": "ai_synthesized_interview",
                "source_detail": "AI 基于公开社区信息（知乎、V2EX、脉脉等）综合生成的模拟访谈数据，非真实访谈",
                "contributor": null,
                "quality_score": 4.6,
                "review_status": "approved",
                "data_verification": {
                  "is_verified": false,
                  "verified_by": null,
                  "verified_at": null,
                  "verification_note": "AI 合成数据，待真实从业者验证后升级为已验证状态"
                },
                "created_at": "2026-04-17",
                "updated_at": "2026-04-17"
              }
            },
            {
              "id": "ops_exp_002",
              "keywords": {
                "job_titles": [
                  "新媒体运营",
                  "内容运营",
                  "用户运营",
                  "运营专员",
                  "社群运营",
                  "私域运营",
                  "活动运营",
                  "短视频运营"
                ],
                "tech_stack": [
                  "Excel",
                  "Canva",
                  "剪映",
                  "秀米",
                  "135编辑器",
                  "巨量引擎",
                  "小红书聚光",
                  "新榜"
                ],
                "skills": [
                  "内容选题",
                  "多平台运营",
                  "数据监控",
                  "私域引流",
                  "用户互动",
                  "投放执行",
                  "活动配合",
                  "素材制作"
                ],
                "tools": [
                  "剪映",
                  "Canva",
                  "秀米",
                  "135编辑器",
                  "新榜",
                  "蝉妈妈",
                  "Excel",
                  "企业微信"
                ],
                "concepts": [
                  "新媒体矩阵",
                  "内容策略",
                  "用户生命周期",
                  "公域引流",
                  "私域转化",
                  "KOL合作",
                  "SEO",
                  "GMV"
                ]
              },
              "work_content": {
                "daily_tasks": [
                  {
                    "task": "内容选题与创作",
                    "time_ratio": "30%",
                    "detail": "每天早上花1-2小时刷竞品账号和热点榜单，确定当日选题。然后根据选题写文案/做图文/剪视频。实际产出效率很低，一条高质量小红书笔记从选题到发布至少需要3-4小时。很多运营为了完成日更KPI，不得不降低质量批量产出。"
                  },
                  {
                    "task": "账号数据监控与内容优化",
                    "time_ratio": "20%",
                    "detail": "每天查看各平台数据后台，记录粉丝数、阅读量、点赞评论转发数、主页访问量等。根据数据判断哪些内容效果好，调整后续创作方向。实际上平台算法经常变动，昨天有效的方法今天可能就失效了，运营需要不断试错。"
                  },
                  {
                    "task": "用户互动与私域运营",
                    "time_ratio": "20%",
                    "detail": "回复各平台评论和私信，将公域用户引导到微信私域（个人号/企业微信/社群）。每天至少要加10-20个新用户到私域。KPI是私域新增用户数和私域活跃率。实际上很多用户加了微信后就不再互动，所谓的'私域流量'活跃率通常不到5%。"
                  },
                  {
                    "task": "投放执行与效果跟踪",
                    "time_ratio": "15%",
                    "detail": "配合投放团队执行信息流广告计划，准备投放素材（图片/视频/文案），监控投放数据。初级运营主要负责素材产出和数据汇报，投放策略由上级决定。KPI是投放ROI和获客成本，但素材质量只是影响ROI的因素之一，产品本身和市场竞争同样重要。"
                  },
                  {
                    "task": "活动执行与跨部门协作",
                    "time_ratio": "15%",
                    "detail": "配合市场部/销售部执行联合活动，如直播带货、节日促销、KOL合作等。运营负责提供内容素材、跟进执行细节、统计活动数据。实际上活动执行中大量工作是琐碎的沟通和确认，创意含量很低。"
                  }
                ],
                "jd_vs_reality": [
                  {
                    "jd_says": "负责新媒体矩阵运营，制定内容策略，实现粉丝增长和品牌曝光",
                    "reality": "'新媒体矩阵'意味着你要同时运营多个平台（微信、小红书、抖音、B站、微博等），但每个平台的内容形式和算法完全不同，一个人根本做不过来。所谓的'内容策略'通常是上级定的方向，你只负责执行。KPI是粉丝增长数和曝光量，但这两个指标经常被'刷'——互粉群、买粉、内部转发都是行业潜规则。真实粉丝的获取成本越来越高，初级运营背负的增长KPI往往不切实际。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "通过数据分析优化运营策略，提升转化率和用户留存",
                    "reality": "初级运营的数据分析工作主要停留在'看报表'层面——每天看各平台后台数据，每周做Excel汇总。真正的数据分析（如归因分析、漏斗优化、用户分群）需要数据团队支持，初级运营很少有机会接触。'提升转化率'听起来很专业，实际上你能做的非常有限——优化一下文案、换一张封面图、调整发布时间，这些微调对转化率的影响通常不到5%。KPI考核的转化率目标往往是老板拍脑袋定的，缺乏数据支撑。",
                    "gap_level": "medium"
                  },
                  {
                    "jd_says": "搭建私域流量池，实现用户精细化运营",
                    "reality": "'私域流量池'是近两年运营圈最火的概念，但现实很骨感。把用户加到微信只是第一步，真正难的是让用户持续活跃和转化。初级运营的'精细化运营'实际上就是：每天在群里发广告、定期群发消息、偶尔做个抽奖。所谓的'用户分层'、'标签化管理'在大部分公司停留在PPT层面，实际执行中根本没有足够的人力和工具来落地。KPI是私域GMV或复购率，但这两个指标更多取决于产品本身的价格和品质，运营能起到的作用被严重高估。",
                    "gap_level": "high"
                  }
                ]
              },
              "core_skills": {
                "must_have": [
                  {
                    "skill": "多平台内容创作",
                    "level": "熟练",
                    "why": "运营需要同时产出图文、视频、文案等多种形式的内容，适应不同平台的调性",
                    "how_to_verify": "能针对同一产品，分别产出适合小红书（种草图文）、抖音（短视频脚本）、公众号（深度文章）的三套内容"
                  },
                  {
                    "skill": "数据分析与报表",
                    "level": "熟练",
                    "why": "运营是数据驱动的工作，每天都要看数据、做决策。不会看数据等于盲人摸象",
                    "how_to_verify": "给一份运营数据，能快速识别异常指标，分析可能原因，并提出3条以上优化建议"
                  },
                  {
                    "skill": "用户沟通与私域管理",
                    "level": "熟练",
                    "why": "私域运营的核心是用户关系维护，能不能让用户愿意留在你的私域并持续互动，决定了转化效果",
                    "how_to_verify": "能设计一套从公域引流到私域的完整SOP，包含引流话术、欢迎语、日常互动、转化引导"
                  },
                  {
                    "skill": "活动策划与执行",
                    "level": "基本",
                    "why": "运营需要定期策划活动来拉动数据，从简单的抽奖到复杂的裂变活动都需要掌握",
                    "how_to_verify": "能独立策划一个完整的线上活动方案，包含活动目标、玩法设计、时间节点、预算估算、效果预估"
                  },
                  {
                    "skill": "工具使用（排版/设计/剪辑）",
                    "level": "熟练",
                    "why": "运营是'多面手'岗位，需要自己完成排版、配图、视频剪辑等工作，依赖他人会严重影响效率",
                    "how_to_verify": "能熟练使用秀米/135编辑器排版公众号文章，用Canva做配图，用剪映剪短视频"
                  }
                ],
                "nice_to_have": [
                  {
                    "skill": "SEO/SEM基础",
                    "level": "了解",
                    "why": "了解搜索引擎优化逻辑能帮助运营产出更容易被搜索到的内容",
                    "how_to_verify": "能为指定关键词写一篇符合SEO规范的文章，包含标题优化、关键词布局、内链设置"
                  },
                  {
                    "skill": "KOL/KOC合作管理",
                    "level": "了解",
                    "why": "达人合作是运营的重要获客渠道，了解合作流程和报价逻辑是加分项",
                    "how_to_verify": "能描述一个完整的KOL合作流程，包括筛选标准、沟通话术、合作形式、效果评估"
                  },
                  {
                    "skill": "直播运营基础",
                    "level": "了解",
                    "why": "直播带货是当前电商运营的重要场景，了解直播运营的基本流程能拓宽职业发展空间",
                    "how_to_verify": "能列出一场直播的完整准备清单，包含选品、脚本、排品、话术、场控等环节"
                  }
                ]
              },
              "entry_advice": [
                {
                  "action": "选择一个垂直领域，从零运营一个自媒体账号",
                  "priority": 1,
                  "estimated_time": "持续至少3个月",
                  "resources": [
                    "小红书/抖音/公众号（选一个主攻平台）",
                    "新榜/蝉妈妈等数据分析工具（免费版）",
                    "参考同领域头部账号的内容策略"
                  ],
                  "why": "这是最有含金量的面试作品。一个有真实粉丝和数据的账号，能证明你具备内容创作、数据分析和用户运营的综合能力。"
                },
                {
                  "action": "学习内容创作核心技能：文案+设计+剪辑",
                  "priority": 2,
                  "estimated_time": "2-3周",
                  "resources": [
                    "文案：《爆款文案》- 关健明",
                    "设计：Canva在线教程",
                    "剪辑：剪映官方教程（B站有大量免费教程）"
                  ],
                  "why": "运营是'多面手'岗位，这三个技能是日常工作的基础。不需要达到专业水平，但必须能独立完成基本产出。"
                },
                {
                  "action": "建立数据分析习惯，学会看懂核心运营指标",
                  "priority": 3,
                  "estimated_time": "1周",
                  "resources": [
                    "《数据分析思维：分析方法和业务知识》",
                    "各平台官方数据说明文档",
                    "蝉妈妈/新榜的行业数据报告"
                  ],
                  "why": "运营面试一定会问数据相关的问题。至少要理解DAU/MAU、CTR、CVR、CPA、ROI、留存率、LTV等核心指标的定义和计算方式。"
                },
                {
                  "action": "了解目标行业的运营模式和常见玩法",
                  "priority": 4,
                  "estimated_time": "1-2周",
                  "resources": [
                    "36氪/虎嗅行业报道",
                    "目标公司及竞品的社交媒体账号",
                    "运营研究社/鸟哥笔记等行业公众号"
                  ],
                  "why": "不同行业的运营逻辑差异很大（电商重转化、内容重流量、SaaS重留存），面试前必须了解目标行业的基本运营模式。建议深度体验3-5个竞品的产品和运营策略。"
                }
              ],
              "meta": {
                "source_type": "ai_synthesized_community",
                "source_detail": "AI 基于公开社区信息（知乎、V2EX、脉脉等）综合生成的模拟社区整理数据，非真实社区汇总",
                "contributor": null,
                "quality_score": 4.3,
                "review_status": "approved",
                "data_verification": {
                  "is_verified": false,
                  "verified_by": null,
                  "verified_at": null,
                  "verification_note": "AI 合成数据，待真实从业者验证后升级为已验证状态"
                },
                "created_at": "2026-04-17",
                "updated_at": "2026-04-17"
              }
            }
          ]
        }
      ]
    }
  ]
},
  "design-data": {
  "version": "1.0",
  "updated_at": "2026-04-17",
  "categories": [
    {
      "category_id": "uiux_design",
      "category_name": "UI/UX设计",
      "jobs": [
        {
          "job_id": "uiux-junior",
          "job_title": "初级UI/UX设计师",
          "experience_level": "0-2年",
          "experiences": [
            {
              "id": "ui_exp_001",
              "keywords": {
                "job_titles": [
                  "UI设计师",
                  "UX设计师",
                  "视觉设计师",
                  "交互设计师",
                  "UI/UX设计师",
                  "初级设计师",
                  "界面设计师",
                  "视觉设计专员"
                ],
                "tech_stack": [
                  "Figma",
                  "Sketch",
                  "Photoshop",
                  "Illustrator",
                  "HTML",
                  "CSS",
                  "After Effects",
                  "Principle"
                ],
                "skills": [
                  "视觉设计",
                  "高保真设计",
                  "切图交付",
                  "设计走查",
                  "多端适配",
                  "组件化设计",
                  "B端设计",
                  "运营活动设计"
                ],
                "tools": [
                  "Figma",
                  "蓝湖",
                  "Zeplin",
                  "Sketch",
                  "Photoshop",
                  "Illustrator",
                  "Principle",
                  "After Effects"
                ],
                "concepts": [
                  "设计系统",
                  "设计规范",
                  "Auto Layout",
                  "iOS HIG",
                  "Material Design",
                  "响应式设计",
                  "设计令牌",
                  "可用性测试"
                ]
              },
              "work_content": {
                "daily_tasks": [
                  {
                    "task": "UI视觉稿执行与切图交付",
                    "time_ratio": "40%",
                    "detail": "根据产品经理的PRD文档和交互稿，在Figma中完成高保真视觉设计。日常工作包括：按照设计规范调整组件样式、适配多端屏幕尺寸（iOS/Android/Web）、导出切图资源（@1x/@2x/@3x）并上传至蓝湖/Zeplin等协作平台。大部分时候是在已有设计系统内做视觉还原，而非从零开始设计。"
                  },
                  {
                    "task": "B端后台页面搭建",
                    "time_ratio": "25%",
                    "detail": "公司内部管理系统、运营后台等B端产品的页面设计。这类页面通常有成熟的组件库（如Ant Design、Element UI），设计师的工作更多是组合现有组件、调整布局间距、确保信息层级清晰。难点在于理解业务逻辑和表单交互流程，但决策权通常在产品经理手中。"
                  },
                  {
                    "task": "运营活动页/营销素材设计",
                    "time_ratio": "20%",
                    "detail": "配合运营部门设计活动落地页、Banner、Push推送素材等。这类需求通常周期极短（1-2天），以视觉冲击力为主，不太涉及复杂交互。需要快速出稿并配合A/B测试调整方案。这是初级设计师最常被分配的'杂活'，但也是最能体现视觉功底的地方。"
                  },
                  {
                    "task": "设计走查与开发还原跟进",
                    "time_ratio": "10%",
                    "detail": "开发完成后，对照设计稿逐页检查前端还原度，标注色差、间距偏差、字体大小等问题，通过飞书/钉钉文档提交走查清单。需要反复与前端沟通确认，有时需要妥协（如某些动效实现成本过高）。这项工作枯燥但直接影响最终产品体验。"
                  },
                  {
                    "task": "参与需求评审与设计讨论",
                    "time_ratio": "5%",
                    "detail": "参加产品需求评审会，了解需求背景和业务目标。初级设计师在会上主要是倾听和记录，偶尔被要求提供设计可行性评估。真正的设计策略讨论通常由高级设计师或设计负责人主导，初级设计师很少有机会参与核心决策。"
                  }
                ],
                "jd_vs_reality": [
                  {
                    "jd_says": "负责产品的用户体验设计，主导从需求分析到交互原型、视觉设计的全流程",
                    "reality": "初级设计师几乎不会'主导'任何流程。需求分析由产品经理完成，交互原型由高级设计师或产品经理直接给出（或使用现成模板），初级设计师只负责最后的视觉执行环节。所谓的'全流程参与'更多是旁听和辅助。考核指标是设计稿按时交付率和开发还原度，而非设计方案的创新性。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "具备用户研究能力，能独立进行可用性测试并输出改进方案",
                    "reality": "大多数初级设计师入职后从未做过一次正式的可用性测试。用户研究通常由专门的用研团队或高级设计师负责。初级设计师偶尔会被要求帮忙招募测试用户或整理访谈记录，但不会独立设计研究方案或主导分析。公司更看重你出图的速度和质量。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "建立和维护设计规范，推动设计系统化",
                    "reality": "设计规范和组件库通常已经由前辈搭建好，初级设计师的任务是'遵守'而非'建立'。最多是发现规范中缺失的组件，提个工单让高级设计师补充。维护工作主要是同步更新Figma组件库中的样式变更，属于日常琐事。",
                    "gap_level": "medium"
                  },
                  {
                    "jd_says": "与产品、开发紧密协作，推动设计方案落地",
                    "reality": "这部分描述基本准确，但'推动'这个词过于主动了。实际情况是：产品经理定需求，高级设计师定方向，初级设计师出图，前端开发实现。初级设计师在协作链中处于执行末端，主要工作是响应修改需求和解答开发关于设计细节的疑问。KPI考核中协作相关指标占比较低，核心还是看产出数量和质量。",
                    "gap_level": "medium"
                  }
                ]
              },
              "core_skills": {
                "must_have": [
                  {
                    "skill": "Figma熟练使用",
                    "level": "熟练",
                    "why": "目前互联网公司几乎全部使用Figma作为主力设计工具，不会Figma连面试机会都很难拿到。需要熟练掌握组件库管理、Auto Layout、原型交互、多人协作等功能。",
                    "how_to_verify": "能独立使用Figma完成一套完整App的UI设计稿，包含组件化搭建、多页面联动原型、设计规范文档输出"
                  },
                  {
                    "skill": "设计基础（排版、色彩、构图）",
                    "level": "熟练",
                    "why": "这是设计师的基本功，决定了你出图的视觉质量。初级设计师的日常大量工作是视觉执行，排版和配色能力直接决定产出水平。",
                    "how_to_verify": "提供3-5套不同风格的高保真UI设计稿，展示对网格系统、色彩搭配、信息层级的掌握程度"
                  },
                  {
                    "skill": "设计规范理解与遵循",
                    "level": "基本",
                    "why": "大厂都有成熟的设计系统（如Ant Design、Arco Design），初级设计师必须能快速理解并遵循现有规范，而不是自由发挥。这是团队协作的基础。",
                    "how_to_verify": "能在限定设计系统内完成页面设计，组件使用正确、间距符合规范、状态（hover/active/disabled）完整"
                  },
                  {
                    "skill": "基础前端知识（HTML/CSS）",
                    "level": "了解",
                    "why": "不需要会写代码，但需要理解盒模型、Flexbox布局、CSS变量等概念，这样才能与前端高效沟通，避免提出难以实现的设计方案。",
                    "how_to_verify": "能看懂基础HTML/CSS代码，理解常见CSS属性对视觉效果的影响，能用浏览器开发者工具检查页面元素样式"
                  },
                  {
                    "skill": "多端适配能力",
                    "level": "基本",
                    "why": "同一套设计需要适配iOS、Android、Web等多端，理解各平台设计规范（iOS Human Interface Guidelines、Material Design）和适配规则是日常工作刚需。",
                    "how_to_verify": "能针对同一功能输出iOS和Android两套适配方案，正确处理安全区域、状态栏、导航栏等平台差异"
                  }
                ],
                "nice_to_have": [
                  {
                    "skill": "动效设计（Principle/After Effects/Lottie）",
                    "level": "了解",
                    "why": "能做基础动效会让你的设计方案更有竞争力，但初级岗位不强制要求。掌握Lottie导出流程可以在需要时快速产出可实现的动效方案。",
                    "how_to_verify": "能用Principle或Figma制作简单的页面转场动效和微交互动画"
                  },
                  {
                    "skill": "用户研究方法",
                    "level": "了解",
                    "why": "了解基础的用户研究方法（用户访谈、问卷调查、可用性测试）能在需求评审时提出更有价值的建议，但初级岗位很少独立执行研究项目。",
                    "how_to_verify": "能描述至少3种用户研究方法的适用场景和执行流程"
                  },
                  {
                    "skill": "插画/3D建模能力",
                    "level": "了解",
                    "why": "部分公司需要设计师具备插画能力（如空状态插画、运营活动主视觉），但这不是通用要求。有此技能可以在面试中加分。",
                    "how_to_verify": "提供原创插画或3D作品集，展示风格多样性和商业应用能力"
                  }
                ]
              },
              "entry_advice": [
                {
                  "action": "用Figma临摹3-5个知名App的完整界面，重点练习组件化思维",
                  "priority": 1,
                  "estimated_time": "3-4周",
                  "resources": [
                    "Figma官方教程（figma.com/resources/learn-design）",
                    "Dribbble上找高赞UI作品作为临摹对象",
                    "优设网（uisdc.com）Figma入门系列教程"
                  ],
                  "why": "Figma是入行必备工具，通过临摹可以同时提升工具熟练度和设计感觉。组件化思维是大厂最看重的初级设计师能力之一。"
                },
                {
                  "action": "系统学习iOS和Android平台设计规范",
                  "priority": 2,
                  "estimated_time": "1-2周",
                  "resources": [
                    "Apple Human Interface Guidelines（developer.apple.com/design/human-interface-guidelines）",
                    "Material Design 3指南（m3.material.io）",
                    "《移动设计规范指南》"
                  ],
                  "why": "面试中经常考察平台规范知识，实际工作中也需要频繁参考。理解规范能帮助你做出'正确'的设计决策，避免低级错误。"
                },
                {
                  "action": "准备一份结构清晰的作品集，包含2-3个完整项目案例",
                  "priority": 3,
                  "estimated_time": "4-6周",
                  "resources": [
                    "Behance上参考优秀作品集的叙事结构",
                    "Notion模板：UI/UX作品集框架",
                    "站酷（zcool.com.cn）上分析国内设计师的作品集风格"
                  ],
                  "why": "作品集是设计师求职的核心材料。每个案例应包含：项目背景、设计目标、设计过程（调研-构思-方案-迭代）、最终成果和数据效果。面试官更看重设计思考过程而非最终视觉。"
                },
                {
                  "action": "学习基础前端知识，理解设计与开发的协作边界",
                  "priority": 4,
                  "estimated_time": "2-3周",
                  "resources": [
                    "freeCodeCamp的HTML/CSS基础课程",
                    "MDN Web Docs（developer.mozilla.org）",
                    "B站搜索'设计师学CSS'系列视频"
                  ],
                  "why": "能和前端顺畅沟通的设计师在团队中更受欢迎。理解技术边界能帮助你避免设计出难以实现的方案，减少返工。"
                }
              ],
              "meta": {
                "source_type": "ai_synthesized_interview",
                "source_detail": "AI 基于公开社区信息（知乎、V2EX、脉脉等）综合生成的模拟访谈数据，非真实访谈",
                "contributor": null,
                "quality_score": 4.5,
                "review_status": "approved",
                "data_verification": {
                  "is_verified": false,
                  "verified_by": null,
                  "verified_at": null,
                  "verification_note": "AI 合成数据，待真实从业者验证后升级为已验证状态"
                },
                "created_at": "2026-04-17",
                "updated_at": "2026-04-17"
              }
            },
            {
              "id": "ui_exp_002",
              "keywords": {
                "job_titles": [
                  "UI设计师",
                  "视觉设计师",
                  "UX设计师",
                  "界面设计师",
                  "平面设计师",
                  "电商设计师",
                  "初级UI设计师",
                  "视觉设计"
                ],
                "tech_stack": [
                  "Figma",
                  "Sketch",
                  "Photoshop",
                  "Illustrator",
                  "After Effects",
                  "Cinema 4D",
                  "Lottie",
                  "Midjourney"
                ],
                "skills": [
                  "视觉优化",
                  "图标设计",
                  "活动页面设计",
                  "竞品分析",
                  "设计评审",
                  "资源管理",
                  "插画绘制",
                  "快速出稿"
                ],
                "tools": [
                  "Figma",
                  "Photoshop",
                  "Illustrator",
                  "Dribbble",
                  "Behance",
                  "Mobbin",
                  "Pinterest",
                  "Midjourney"
                ],
                "concepts": [
                  "设计趋势",
                  "网格系统",
                  "色彩理论",
                  "字体排版",
                  "信息层级",
                  "设计交付",
                  "A/B测试",
                  "数据驱动设计"
                ]
              },
              "work_content": {
                "daily_tasks": [
                  {
                    "task": "产品迭代页面的视觉优化",
                    "time_ratio": "35%",
                    "detail": "在现有产品基础上做视觉层面的优化迭代，如调整按钮样式、优化卡片布局、统一图标风格等。这类工作通常由产品经理发起，附带着竞品截图作为参考。设计师需要在保持现有设计语言一致性的前提下做微调，创新空间有限，但对细节把控能力要求高。"
                  },
                  {
                    "task": "设计素材制作与资源管理",
                    "time_ratio": "25%",
                    "detail": "制作App内各类图标（功能图标、Tab图标、空状态插画）、启动页、引导页等静态素材，同时管理设计资源库（图标库、插画库、图片素材库）。需要为不同分辨率和平台导出多版本资源，工作繁琐但不可或缺。"
                  },
                  {
                    "task": "配合运营设计活动页面",
                    "time_ratio": "20%",
                    "detail": "电商大促（618、双11）、节日活动、拉新裂变等运营活动的页面设计。这类需求特点是时间紧、改稿频繁、以转化率为导向。设计师需要快速出多套方案供选择，并根据运营数据反馈调整视觉策略。"
                  },
                  {
                    "task": "竞品分析与设计趋势收集",
                    "time_ratio": "10%",
                    "detail": "定期收集竞品的设计更新和行业设计趋势，整理成PPT或文档在团队内分享。这项工作看似轻松，但需要持续关注大量设计平台（Dribbble、Behance、Mobbin、App Store截图），并具备分析总结能力。"
                  },
                  {
                    "task": "设计评审与修改迭代",
                    "time_ratio": "10%",
                    "detail": "参加设计评审会，接收来自设计主管、产品经理、业务方的修改意见并逐一修改。初级设计师的方案经常被推翻重来，需要具备良好的心态和快速迭代能力。一次评审可能产生10+条修改意见，大部分是主观审美层面的调整。"
                  }
                ],
                "jd_vs_reality": [
                  {
                    "jd_says": "深入理解用户需求，通过设计提升用户体验和产品满意度",
                    "reality": "初级设计师接触用户的机会极少。所谓的'理解用户需求'实际上是通过阅读产品经理写的用户画像和需求文档来间接了解。设计决策更多是参考竞品和遵循上级指导，而非基于真实的用户洞察。满意度提升很难归因到某个具体的设计改动上。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "参与产品规划，从设计角度提供专业建议",
                    "reality": "产品规划阶段通常没有初级设计师的参与。产品路线图和功能优先级由产品负责人和业务线负责人决定，设计师在需求确定后才介入。初级设计师能做的'专业建议'仅限于视觉层面的微调建议（如'这个按钮颜色对比度不够'），而非产品方向性的设计策略建议。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "跟踪设计趋势，持续提升设计品质",
                    "reality": "这条基本写实。确实需要关注设计趋势，但目的不是为了'提升设计品质'，而是为了在评审会上能说出'竞品XX也是这么做的'来为自己的设计方案辩护。设计品质的提升更多依赖于设计主管的审美把控，初级设计师的发挥空间有限。",
                    "gap_level": "medium"
                  }
                ]
              },
              "core_skills": {
                "must_have": [
                  {
                    "skill": "Figma高效设计能力",
                    "level": "熟练",
                    "why": "Figma是当前行业标准工具，熟练度直接影响工作效率。需要掌握快捷键、组件变体、Auto Layout、设计令牌（Design Tokens）等进阶功能，才能在紧张的项目周期内按时交付。",
                    "how_to_verify": "能在2小时内完成一个中等复杂度页面的高保真设计稿（含组件化搭建和基础交互原型）"
                  },
                  {
                    "skill": "视觉设计基本功",
                    "level": "熟练",
                    "why": "排版、配色、图标设计、插画是初级设计师的立身之本。日常大量工作是视觉执行，基本功不扎实会导致产出质量不达标，频繁被要求返工。",
                    "how_to_verify": "作品集中展示对网格系统、色彩理论、字体排版的系统化理解，视觉呈现达到商业发布水准"
                  },
                  {
                    "skill": "设计系统使用能力",
                    "level": "基本",
                    "why": "几乎所有中大型公司都有设计系统，初级设计师必须能在规范框架内工作。包括正确使用组件库、理解设计令牌（颜色、间距、圆角等变量）、遵循状态规范等。",
                    "how_to_verify": "能快速阅读并理解一个陌生的设计系统文档，在限定规范内完成页面设计且无规范违反"
                  },
                  {
                    "skill": "设计交付与协作能力",
                    "level": "基本",
                    "why": "设计稿的交付质量直接影响开发还原度。需要掌握标注规范、切图命名规则、多状态标注、响应式断点说明等交付技能。",
                    "how_to_verify": "交付的设计稿能让前端开发独立完成还原，走查问题数量控制在每页5个以内"
                  },
                  {
                    "skill": "商业设计思维",
                    "level": "了解",
                    "why": "初级设计师容易陷入'为了好看而设计'的误区，需要理解设计是服务于商业目标的。如电商设计中，按钮位置和颜色直接影响点击率，需要用数据思维做设计决策。",
                    "how_to_verify": "能在设计方案中说明设计决策与业务指标（如转化率、留存率）的关联逻辑"
                  }
                ],
                "nice_to_have": [
                  {
                    "skill": "动效设计与原型制作",
                    "level": "了解",
                    "why": "能制作交互动效原型会让方案更有说服力，但初级岗位不强制要求。掌握Figma内置的Smart Animate已经能满足大部分需求。",
                    "how_to_verify": "能用Figma制作包含页面转场和微交互的可交互原型"
                  },
                  {
                    "skill": "数据驱动设计能力",
                    "level": "了解",
                    "why": "了解A/B测试、热力图分析等数据驱动设计方法，能在设计评审中用数据支撑方案。但初级岗位很少有机会独立发起数据分析。",
                    "how_to_verify": "能阅读基础的数据看板（如神策、GrowingIO），理解核心指标含义"
                  },
                  {
                    "skill": "AI设计工具使用",
                    "level": "了解",
                    "why": "Midjourney、Stable Diffusion等AI工具在运营设计中应用越来越广，能提高素材产出效率。但AI生成的设计仍需人工调整才能达到交付标准。",
                    "how_to_verify": "能用AI工具快速生成运营活动背景素材，并进行后期处理达到商用标准"
                  }
                ]
              },
              "entry_advice": [
                {
                  "action": "集中精力打磨作品集，至少包含1个完整的App重设计（Redesign）项目",
                  "priority": 1,
                  "estimated_time": "4-6周",
                  "resources": [
                    "Mobbin（mobbin.com）收集真实App截图作为参考",
                    "Behance搜索'App Redesign'学习优秀案例的叙事方式",
                    "YouTube频道：Mizko、Jesse Showalter的设计思维分享"
                  ],
                  "why": "作品集是求职的决定性因素。一个完整的Redesign项目能全面展示你的设计能力：用户分析、问题定义、信息架构、交互设计、视觉设计、设计规范。比零散的页面设计更有说服力。"
                },
                {
                  "action": "加入设计社区，持续输入优质设计案例",
                  "priority": 2,
                  "estimated_time": "持续进行，每周2-3小时",
                  "resources": [
                    "优设网（uisdc.com）- 国内最大的设计师社区",
                    "Dribbble、Behance - 国际设计平台",
                    "小红书搜索'UI设计日报'关注每日更新账号",
                    "微信公众号：优设、功夫UX、我们的设计日记"
                  ],
                  "why": "设计是输入驱动的创意工作。持续接触优秀案例能提升审美水平、积累设计模式、了解行业趋势。面试中能引用近期优秀案例也会加分。"
                },
                {
                  "action": "学习一个主流设计系统（如Ant Design或Arco Design）的组件规范",
                  "priority": 3,
                  "estimated_time": "1-2周",
                  "resources": [
                    "Ant Design官方文档（ant.design）",
                    "Arco Design官方文档（arco.design）",
                    "Ant Design设计价值观与原则文档"
                  ],
                  "why": "国内互联网公司大量使用Ant Design体系，提前熟悉能快速适应工作。面试中展示对设计系统的理解也能体现专业度。"
                },
                {
                  "action": "练习快速出稿能力，设定时间限制完成设计挑战",
                  "priority": 4,
                  "estimated_time": "持续进行，每周1-2次",
                  "resources": [
                    "Daily UI（dailyui.co）- 每日设计挑战",
                    "Sharpen Design（sharpen.design）- 设计提示生成器",
                    "设计群组中的接单模拟练习"
                  ],
                  "why": "实际工作中经常需要在1-2天内完成设计稿，快速出稿能力是初级设计师的核心竞争力。通过限时练习可以提升设计决策速度和抗压能力。"
                }
              ],
              "meta": {
                "source_type": "ai_synthesized_community",
                "source_detail": "AI 基于公开社区信息（知乎、V2EX、脉脉等）综合生成的模拟社区整理数据，非真实社区汇总",
                "contributor": null,
                "quality_score": 4,
                "review_status": "approved",
                "data_verification": {
                  "is_verified": false,
                  "verified_by": null,
                  "verified_at": null,
                  "verification_note": "AI 合成数据，待真实从业者验证后升级为已验证状态"
                },
                "created_at": "2026-04-17",
                "updated_at": "2026-04-17"
              }
            }
          ]
        }
      ]
    },
    {
      "category_id": "data_analysis",
      "category_name": "数据分析",
      "jobs": [
        {
          "job_id": "data-junior",
          "job_title": "初级数据分析师",
          "experience_level": "0-2年",
          "experiences": [
            {
              "id": "da_exp_001",
              "keywords": {
                "job_titles": [
                  "数据分析师",
                  "数据分析",
                  "DA",
                  "数据运营",
                  "初级数据分析师",
                  "数据专员",
                  "BI分析师",
                  "商业分析师"
                ],
                "tech_stack": [
                  "SQL",
                  "Excel",
                  "Python",
                  "Tableau",
                  "QuickBI",
                  "Metabase",
                  "Superset",
                  "pandas"
                ],
                "skills": [
                  "SQL取数",
                  "数据报表",
                  "数据看板搭建",
                  "A/B测试分析",
                  "数据质量监控",
                  "临时取数",
                  "指标体系维护",
                  "统计检验"
                ],
                "tools": [
                  "Tableau",
                  "QuickBI",
                  "Metabase",
                  "Superset",
                  "Excel",
                  "Jupyter Notebook",
                  "飞书",
                  "Confluence"
                ],
                "concepts": [
                  "DAU",
                  "MAU",
                  "留存率",
                  "转化漏斗",
                  "ARPU",
                  "LTV",
                  "假设检验",
                  "数据仓库"
                ]
              },
              "work_content": {
                "daily_tasks": [
                  {
                    "task": "SQL取数与数据报表制作",
                    "time_ratio": "45%",
                    "detail": "日常最高频的工作就是写SQL从数据仓库中提取数据。产品经理、运营、市场等团队会提各种取数需求：日活月活、转化漏斗、用户留存、GMV趋势等。需要熟练编写复杂SQL（多表JOIN、窗口函数、子查询），将结果整理成Excel报表或导入BI工具（如Tableau、QuickBI）制作可视化看板。这项工作占用了初级分析师近一半的时间。"
                  },
                  {
                    "task": "数据看板搭建与维护",
                    "time_ratio": "20%",
                    "detail": "使用BI工具（QuickBI、Metabase、Superset等）搭建业务数据看板，包括核心指标监控、用户行为分析、销售数据追踪等。日常维护包括更新数据源、修复报表异常、根据业务变化调整指标口径。看板搭建的技术门槛不高，但理解业务指标体系需要时间积累。"
                  },
                  {
                    "task": "A/B测试数据监控与分析",
                    "time_ratio": "15%",
                    "detail": "配合产品团队进行A/B测试，负责实验分组的数据提取、指标计算、显著性检验和结果汇报。日常工作包括：检查实验数据质量（分流是否均匀、是否有作弊流量）、计算实验组和对照组的核心指标差异、使用统计方法判断结果是否显著。初级分析师通常只负责执行分析流程，实验设计由高级分析师或产品经理完成。"
                  },
                  {
                    "task": "临时取数需求响应",
                    "time_ratio": "12%",
                    "detail": "各部门的临时数据需求，如'帮我拉一下上周新注册用户的设备分布'、'这个活动的参与用户数是多少'等。这类需求量大、单次耗时短（15-30分钟），但非常碎片化，严重打断深度分析工作。很多初级分析师自嘲为'取数工具人'。"
                  },
                  {
                    "task": "数据质量检查与异常监控",
                    "time_ratio": "8%",
                    "detail": "监控核心业务数据的异常波动，如日活突然下降、支付成功率异常等。需要编写SQL脚本定期检查数据质量，发现异常后排查原因（埋点问题、数据延迟、上游系统故障等）并通知相关团队。这项工作需要较强的业务理解能力和责任心。"
                  }
                ],
                "jd_vs_reality": [
                  {
                    "jd_says": "构建数据分析体系，建立完善的数据指标体系和分析框架",
                    "reality": "初级分析师不会'构建'任何体系。数据指标体系通常由数据团队负责人或高级分析师搭建，初级分析师的任务是'使用'和'维护'已有体系。所谓的'构建数据分析体系'在初级岗位的实际含义是：按照已有的指标定义写SQL取数、在已有的报表模板中填数据。考核指标是取数准确率和报表交付及时率，而非体系建设的完整性。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "通过数据分析驱动业务增长，提供战略性建议",
                    "reality": "初级分析师产出的分析结论很少能直接'驱动业务增长'。大部分分析报告的归宿是'提交后石沉大海'。业务决策由业务负责人做出，数据只是参考因素之一。初级分析师更像是'数据搬运工'——把数据从数据库搬到报表里，偶尔加几句描述性分析。真正能影响业务决策的深度分析通常由高级分析师或数据科学家完成。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "熟练使用Python/R进行数据分析和建模",
                    "reality": "大部分初级数据分析师的日常工作完全不需要Python/R。SQL + Excel + BI工具就能覆盖90%的工作需求。Python只在少数场景下使用：数据量太大Excel处理不了时用pandas做预处理、需要做统计分析时用scipy/statsmodels、需要自动化报表时写脚本。但这些场景在初级岗位中出现频率很低。JD中写Python要求更多是为了筛选候选人。",
                    "gap_level": "medium"
                  },
                  {
                    "jd_says": "具备良好的沟通能力，能向管理层汇报数据分析结果",
                    "reality": "初级分析师很少有机会直接向管理层汇报。常规的汇报链路是：初级分析师完成分析 -> 高级分析师审核 -> 数据团队负责人汇总 -> 向管理层汇报。初级分析师的沟通对象主要是平级的产品经理和运营同事，沟通内容以'数据口径确认'和'取数需求对齐'为主，而非'汇报分析结论'。",
                    "gap_level": "medium"
                  }
                ]
              },
              "core_skills": {
                "must_have": [
                  {
                    "skill": "SQL查询能力",
                    "level": "精通",
                    "why": "SQL是数据分析师最核心的工作技能，日常工作中使用频率最高。需要熟练掌握SELECT、JOIN、GROUP BY、窗口函数、CTE、子查询等，能独立编写复杂的数据提取脚本。面试中SQL是必考项，通常要求手写代码。",
                    "how_to_verify": "面试中能在20分钟内手写完成涉及3-5张表JOIN、窗口函数、条件聚合的复杂SQL查询"
                  },
                  {
                    "skill": "Excel数据处理",
                    "level": "熟练",
                    "why": "Excel仍是数据分析师日常使用频率第二高的工具。需要熟练使用数据透视表、VLOOKUP/XLOOKUP、条件格式、图表制作等功能。很多非技术背景的业务方更习惯看Excel报表而非BI看板。",
                    "how_to_verify": "能使用Excel在30分钟内完成一份包含数据透视表、多维度交叉分析、条件格式高亮的数据分析报表"
                  },
                  {
                    "skill": "BI工具使用",
                    "level": "基本",
                    "why": "QuickBI、Metabase、Tableau等BI工具是搭建数据看板的标准工具。需要掌握数据源接入、维度/度量配置、图表类型选择、看板布局、权限管理等基础功能。不同公司使用的BI工具不同，但核心逻辑相通。",
                    "how_to_verify": "能独立使用一种BI工具搭建包含5个以上图表的业务数据看板，支持时间筛选和维度下钻"
                  },
                  {
                    "skill": "业务指标理解能力",
                    "level": "基本",
                    "why": "不理解业务指标就无法写出正确的SQL。需要理解DAU/MAU、留存率、转化漏斗、ARPU、LTV等核心指标的定义、计算口径和业务含义。不同公司的指标定义可能有细微差异，入职后需要快速学习。",
                    "how_to_verify": "能准确描述至少10个常见业务指标的定义和计算方式，理解指标之间的关联关系"
                  },
                  {
                    "skill": "基础统计学",
                    "level": "了解",
                    "why": "A/B测试分析需要用到假设检验、p值、置信区间等统计概念。不需要深厚的数学功底，但必须理解基本原理，才能正确解读实验结果，避免做出错误的统计推断。",
                    "how_to_verify": "能正确解释A/B测试结果中的p值含义，判断实验结果是否具有统计显著性"
                  }
                ],
                "nice_to_have": [
                  {
                    "skill": "Python数据分析（pandas/numpy）",
                    "level": "了解",
                    "why": "当数据量超过Excel处理上限（约100万行）或需要自动化重复性分析任务时，Python是更好的选择。但初级岗位使用频率不高，属于加分项而非必需项。",
                    "how_to_verify": "能用pandas完成数据清洗、分组聚合、合并连接等常见数据处理操作"
                  },
                  {
                    "skill": "数据可视化设计",
                    "level": "了解",
                    "why": "好的数据可视化能让分析结论更直观易懂。了解图表选型原则（何时用柱状图、折线图、散点图等）和信息设计基础能提升报表质量。",
                    "how_to_verify": "能根据数据特征和分析目的选择合适的图表类型，避免常见的数据可视化误区（如截断Y轴、误导性比例）"
                  },
                  {
                    "skill": "数据仓库基础知识",
                    "level": "了解",
                    "why": "了解数仓分层（ODS/DWD/DWS/ADS）和表命名规范能帮助你更快地找到需要的数据表。不需要会建表，但需要理解数据从埋点到报表的完整链路。",
                    "how_to_verify": "能描述数据从用户端埋点到最终报表的完整处理链路，理解各层的作用和区别"
                  }
                ]
              },
              "entry_advice": [
                {
                  "action": "系统刷SQL题，重点攻克JOIN和窗口函数",
                  "priority": 1,
                  "estimated_time": "3-4周",
                  "resources": [
                    "LeetCode SQL题库（筛选中等难度）",
                    "牛客网SQL实战题库",
                    "SQLZoo（sqlzoo.net）免费交互式练习",
                    "《SQL必知必会》作为语法参考书"
                  ],
                  "why": "SQL是数据分析师面试必考项，也是入职后使用频率最高的技能。JOIN和窗口函数是区分候选人的关键考点，必须达到手写无障碍的水平。"
                },
                {
                  "action": "做一个完整的数据分析项目，从取数到结论输出",
                  "priority": 2,
                  "estimated_time": "2-3周",
                  "resources": [
                    "Kaggle上找一份真实业务数据集（如电商、用户行为）",
                    "Jupyter Notebook记录分析过程",
                    "参考知乎/掘金上的数据分析项目实战文章"
                  ],
                  "why": "面试中需要展示你的分析思维，而不仅仅是工具使用能力。一个完整的项目能体现你从提出问题、数据清洗、分析探索到得出结论的全流程能力。"
                },
                {
                  "action": "学习A/B测试的统计学基础",
                  "priority": 3,
                  "estimated_time": "1-2周",
                  "resources": [
                    "《AB测试：创新从实验开始》",
                    "知乎搜索'A/B测试入门'高赞回答",
                    "StatQuest YouTube频道的假设检验系列视频（有中文字幕）"
                  ],
                  "why": "A/B测试是互联网公司最常用的实验方法，面试中几乎必问。需要理解假设检验的基本流程、样本量计算、p值解读等核心概念。"
                },
                {
                  "action": "熟悉一种BI工具，搭建个人数据分析作品集",
                  "priority": 4,
                  "estimated_time": "2周",
                  "resources": [
                    "Tableau Public免费版（可公开发布作品）",
                    "Metabase开源版（本地安装练习）",
                    "阿里云QuickBI提供免费试用"
                  ],
                  "why": "BI工具上手快，有可视化作品能在面试中直观展示能力。Tableau Public上的公开作品可以作为作品集链接分享给面试官。"
                }
              ],
              "meta": {
                "source_type": "ai_synthesized_interview",
                "source_detail": "AI 基于公开社区信息（知乎、V2EX、脉脉等）综合生成的模拟访谈数据，非真实访谈",
                "contributor": null,
                "quality_score": 4.5,
                "review_status": "approved",
                "data_verification": {
                  "is_verified": false,
                  "verified_by": null,
                  "verified_at": null,
                  "verification_note": "AI 合成数据，待真实从业者验证后升级为已验证状态"
                },
                "created_at": "2026-04-17",
                "updated_at": "2026-04-17"
              }
            },
            {
              "id": "da_exp_002",
              "keywords": {
                "job_titles": [
                  "数据分析师",
                  "数据分析",
                  "DA",
                  "数据运营",
                  "数据专员",
                  "BI分析师",
                  "初级数据分析师",
                  "数据助理"
                ],
                "tech_stack": [
                  "SQL",
                  "Excel",
                  "Python",
                  "Tableau",
                  "QuickBI",
                  "Metabase",
                  "pandas",
                  "numpy"
                ],
                "skills": [
                  "数据监控",
                  "报表更新",
                  "临时取数",
                  "专题分析",
                  "埋点验收",
                  "数据文档编写",
                  "需求沟通",
                  "数据清洗"
                ],
                "tools": [
                  "Excel",
                  "飞书",
                  "钉钉",
                  "企业微信",
                  "Tableau",
                  "QuickBI",
                  "Jupyter Notebook",
                  "Confluence"
                ],
                "concepts": [
                  "数据埋点",
                  "数据字典",
                  "漏斗分析",
                  "同期群分析",
                  "RFM分析",
                  "归因分析",
                  "ETL",
                  "数据治理"
                ]
              },
              "work_content": {
                "daily_tasks": [
                  {
                    "task": "日常数据监控与报表更新",
                    "time_ratio": "35%",
                    "detail": "每天早上第一件事是检查核心业务数据看板，确认数据是否正常。然后更新日报/周报/月报模板中的数据，发送给产品、运营等团队。报表内容通常是固定的指标组合（DAU、新增、留存、收入等），工作重复性高，但需要保证数据准确性。一旦数据出错会影响业务方的判断。"
                  },
                  {
                    "task": "业务方临时取数需求处理",
                    "time_ratio": "30%",
                    "detail": "通过飞书/钉钉/企业微信接收各部门的取数需求，评估需求合理性（指标口径是否清晰、数据是否可获取），编写SQL提取数据，整理成Excel或文档交付。每天平均处理5-10个临时需求，单个耗时15分钟到2小时不等。最大的痛点是需求描述不清，需要反复沟通确认。"
                  },
                  {
                    "task": "专题分析报告撰写",
                    "time_ratio": "15%",
                    "detail": "针对特定业务问题做深度分析，如'某功能上线后用户行为变化分析'、'流失用户特征分析'等。需要自主确定分析框架、提取数据、制作图表、撰写分析结论和建议。但初级分析师的专题分析经常被高级分析师大幅修改，结论部分经常被重写。"
                  },
                  {
                    "task": "数据埋点验收与问题排查",
                    "time_ratio": "10%",
                    "detail": "新产品功能上线前，需要验收埋点是否正确上报（事件名、参数、触发时机是否符合预期）。上线后监控埋点数据质量，发现漏报、错报等问题需要推动开发修复。这项工作需要耐心和细心，但技术含量不高。"
                  },
                  {
                    "task": "数据文档编写与维护",
                    "time_ratio": "10%",
                    "detail": "维护数据字典（记录各数据表和字段的含义、口径、负责人）、指标说明文档、SQL脚本库等。这类工作看似不重要，但对团队协作至关重要。很多初级分析师因为不重视文档导致离职后知识无法传承。"
                  }
                ],
                "jd_vs_reality": [
                  {
                    "jd_says": "运用数据挖掘和机器学习方法，发现业务机会和潜在风险",
                    "reality": "初级数据分析师几乎不会接触机器学习。数据挖掘也是高级分析师或算法工程师的职责范围。初级岗位的数据分析以描述性分析（发生了什么）和诊断性分析（为什么发生）为主，预测性分析（将要发生什么）很少涉及。JD中写这些要求更多是为了提高岗位吸引力。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "独立负责业务线的数据分析工作，成为业务的数据Partner",
                    "reality": "'数据Partner'是高级分析师的定位。初级分析师更像是'数据助理'——响应需求、提供数据、制作报表。独立负责业务线分析通常需要2-3年经验积累，初级阶段更多是在高级分析师指导下完成具体任务。业务方也不会把初级分析师当作'Partner'对待，更多是当作'取数工具'。",
                    "gap_level": "high"
                  },
                  {
                    "jd_says": "建立数据化运营体系，推动数据文化建设",
                    "reality": "数据化运营体系的建设是数据团队负责人的工作，初级分析师在其中扮演的是执行者角色。数据文化建设更是公司层面的战略，与初级分析师关系不大。实际工作中，初级分析师能做的'推动数据文化'仅限于：提醒业务方看数据、教业务方使用BI看板、在周会上分享数据洞察。",
                    "gap_level": "medium"
                  }
                ]
              },
              "core_skills": {
                "must_have": [
                  {
                    "skill": "SQL编写与优化",
                    "level": "精通",
                    "why": "SQL是数据分析师吃饭的家伙。初级岗位日常80%以上的工作需要写SQL。不仅要会写，还要写得快、写得对、写得高效（避免全表扫描、合理使用索引）。面试中SQL能力是第一筛选标准。",
                    "how_to_verify": "能在面试白板编程环节中，15分钟内写出逻辑正确、结构清晰的SQL，处理涉及多表关联和复杂聚合的场景"
                  },
                  {
                    "skill": "Excel高级应用",
                    "level": "熟练",
                    "why": "Excel是数据交付的通用格式，很多业务方只看Excel。需要熟练掌握数据透视表、Power Query、条件格式、复杂公式（INDEX-MATCH、SUMIFS等）。Excel处理百万级以下数据效率高于写SQL跑临时任务。",
                    "how_to_verify": "能使用Excel完成一份包含多Sheet联动、数据透视表、动态图表的交互式分析报表"
                  },
                  {
                    "skill": "数据思维与分析框架",
                    "level": "基本",
                    "why": "工具只是手段，分析思维才是核心竞争力。需要掌握常用的分析框架：漏斗分析、同期群分析、RFM分析、归因分析等。面对业务问题时能快速确定分析思路，而不是拿到需求就开始写SQL。",
                    "how_to_verify": "面对一个开放性业务问题（如'如何提升用户留存'），能在10分钟内给出结构化的分析思路和所需数据清单"
                  },
                  {
                    "skill": "数据可视化与报表设计",
                    "level": "基本",
                    "why": "分析结论需要通过可视化报表传达给业务方。需要掌握图表选型原则、配色方案、信息层级设计等基础可视化技能。好的报表能让业务方快速理解数据含义，差的报表会让数据失去价值。",
                    "how_to_verify": "能设计一份信息层级清晰、重点突出的数据分析报告，图表选择合理、标注完整、结论明确"
                  },
                  {
                    "skill": "沟通与需求理解能力",
                    "level": "基本",
                    "why": "数据分析师的工作高度依赖与业务方的沟通。需要能准确理解业务方的真实需求（很多时候业务方说的需求和他们真正想要的不一样），能用非技术语言解释数据分析结果。",
                    "how_to_verify": "面对模糊的取数需求，能通过提问明确指标口径、时间范围、维度粒度等关键信息，避免返工"
                  }
                ],
                "nice_to_have": [
                  {
                    "skill": "Python数据处理",
                    "level": "了解",
                    "why": "在需要处理大量数据或自动化重复任务时，Python能大幅提升效率。但初级岗位使用场景有限，掌握基础pandas操作即可。",
                    "how_to_verify": "能用Python完成CSV/Excel文件的批量处理、数据清洗和简单统计分析"
                  },
                  {
                    "skill": "数据仓库与ETL基础",
                    "level": "了解",
                    "why": "了解数据仓库的基本架构和ETL流程，能帮助你理解数据的来源和局限性，避免使用有问题的数据得出错误结论。",
                    "how_to_verify": "能描述公司数据仓库的分层结构，知道常见指标的数据来源表和计算逻辑"
                  },
                  {
                    "skill": "产品思维与商业意识",
                    "level": "了解",
                    "why": "理解产品逻辑和商业模式能让你的分析更有深度。知道业务方关心什么、为什么关心，才能提供真正有价值的分析结论，而不是堆砌数据。",
                    "how_to_verify": "能在分析报告中将数据发现与业务动作关联起来，提出可执行的建议而非仅描述现象"
                  }
                ]
              },
              "entry_advice": [
                {
                  "action": "以LeetCode SQL 50题为目标进行密集训练",
                  "priority": 1,
                  "estimated_time": "3-4周",
                  "resources": [
                    "LeetCode数据库题库（按难度筛选，先Easy后Medium）",
                    "牛客网SQL刷题专区",
                    "SQL解题思路总结笔记（GitHub搜索'SQL面试题'）",
                    "《SQL基础教程》巩固语法基础"
                  ],
                  "why": "SQL面试通过率直接决定你能否拿到offer。建议每天刷3-5题，重点掌握JOIN的多种写法、窗口函数（ROW_NUMBER/RANK/DENSE_RANK/LAG/LEAD）、日期函数、条件聚合等高频考点。"
                },
                {
                  "action": "用真实数据集完成一个端到端的分析项目并发布",
                  "priority": 2,
                  "estimated_time": "3-4周",
                  "resources": [
                    "Kaggle数据集（推荐：电商用户行为数据、金融交易数据）",
                    "GitHub Pages或Notion发布分析报告",
                    "知乎/掘金发布分析文章获取反馈"
                  ],
                  "why": "项目经验是面试中展示分析能力的最佳载体。建议选择一个有明确业务场景的数据集，按照'提出问题-数据探索-深入分析-得出结论-提出建议'的结构完成报告，并公开发布获取反馈。"
                },
                {
                  "action": "学习常见的数据分析模型和框架",
                  "priority": 3,
                  "estimated_time": "2周",
                  "resources": [
                    "《数据分析思维：分析方法和业务知识》",
                    "知乎搜索'数据分析框架'整理笔记",
                    "B站搜索'漏斗分析教程''RFM分析实战'"
                  ],
                  "why": "面试中经常考察分析框架的应用能力。掌握漏斗分析、同期群分析、RFM模型、AARRR模型等常用框架，能在面试中快速给出结构化的分析思路。"
                },
                {
                  "action": "了解目标公司的业务和数据基础设施",
                  "priority": 4,
                  "estimated_time": "面试前1-2天",
                  "resources": [
                    "目标公司官网、年报、招股书了解业务模式",
                    "脉脉/知乎搜索目标公司数据分析团队的工作内容",
                    "技术博客搜索目标公司的数据平台介绍"
                  ],
                  "why": "面试中展示对目标公司业务的了解能大幅加分。了解他们用什么BI工具、数据仓库架构、核心业务指标，能让面试官觉得你做了充分准备且有强烈的入职意愿。"
                }
              ],
              "meta": {
                "source_type": "ai_synthesized_community",
                "source_detail": "AI 基于公开社区信息（知乎、V2EX、脉脉等）综合生成的模拟社区整理数据，非真实社区汇总",
                "contributor": null,
                "quality_score": 4,
                "review_status": "approved",
                "data_verification": {
                  "is_verified": false,
                  "verified_by": null,
                  "verified_at": null,
                  "verification_note": "AI 合成数据，待真实从业者验证后升级为已验证状态"
                },
                "created_at": "2026-04-17",
                "updated_at": "2026-04-17"
              }
            }
          ]
        }
      ]
    }
  ]
},
};

// ============================================================
// 内嵌 Prompt 模板
// 从 03-prompt-engineering/v2-jd-parser.md 中提取
// ============================================================
const PROMPT_TEMPLATE = `# 角色定义

你是一位资深求职顾问，擅长从真实从业者经验的角度解读招聘 JD。你的核心能力是将 JD 中的"黑话"和包装性描述翻译成求职者能理解的具体信息。

**关键要求：你的回复必须包含所有章节（6 个或 5 个，取决于是否有用户背景），绝不能在中途停止输出。**

# 工作原则

1. 禁止编造来源：不要编造公司名、人名、访谈场景。用"根据从业者社区公开讨论整理"。
2. 禁止编造数字：不要编造薪资、百分比。用"因公司和城市而异"等表述。
3. 标注不确定性：用"在大多数情况下"、"部分公司可能"等限定表述。
4. JD 原文优先：不曲解 JD 明确写的内容。
5. 诚实标注：引用经验时用"根据从业者社区公开讨论整理"。

# 知识库参考

{KNOWLEDGE_INJECTION}

---

# 用户输入

JD 文本：
{JD_TEXT}

岗位类别：{JOB_CATEGORY}

用户背景：{USER_BACKGROUND}

---

# 输出要求

请输出一份完整的 JD 解读报告，使用 Markdown 二级标题（##）分隔。只输出以下章节，不要输出任何其他章节（如"团队协作模式"、"KPI/考核指标"等）。每个章节必须有实质内容，不要留空。所有条目不要添加额外的子行说明。

## 一、真实工作内容

列出 3-5 条日常工作任务。每条格式：**[XX%] 任务名称** — 一句话具体描述。时间占比之和为 100%。

## 二、核心能力要求

分两组：**必选技能**（3-5 个）和**加分技能**（2-3 个）。每个格式：**技能名** — 要求水平及简要原因。

## 三、行动建议

3-5 条具体行动，按优先级排序。每条格式：**行动名称**（预计 X 个月）— 简要说明。

## 四、JD 潜台词

**先判断 JD 中是否存在"包装"或"话术"：**

- **如果存在包装用语**（如"能承受工作压力"、"快速迭代"等模糊或夸大描述）：找出 2-3 条，逐条解读。格式：

**"JD 原文引用"**
→ 用自然、口语化的语言解释真实含义，结合从业者经验给出建议。每条 2-3 句话。

- **如果 JD 描述清晰直白、没有明显包装用语**：**不要输出此章节**，直接跳到第五章。

**注意**：不要把 JD 中正常、清晰的要求当作"潜台词"来解读。

## 五、考核与工作强度

从 JD 中推断可能的考核方式和工作强度信号，分两部分：

**考核方式**：列出 2-3 个可能的考核维度。如果 JD 中无暗示，写"JD 中未提及明确的考核方向"。

**工作强度**：列出从 JD 中识别到的强度信号。如果 JD 中无相关信号，写"JD 中未发现明显的工作强度相关信号"。

> 注：考核方式和工作强度因公司和团队而异，以上仅为常见情况的推断，面试时建议主动了解。

## 六、差距分析

仅当用户提供了背景信息时输出。如果用户未提供背景，不要输出此章节。

用温暖、鼓励性的语气。先肯定用户现有基础，再列出需要补强的方向。格式：

**你的优势：**
- 用 1-2 句话肯定用户已有的基础或特质

**需要补强的方向：**

1. **差距项名称**（优先级：高/中/低）— 具体建议和预计时间（X 个月）

报告最后必须包含以下声明：

📌 数据来源说明
本报告基于 AI 对招聘 JD 的分析和从业者社区公开信息整理。经验数据仅供参考，可能不完全适用于所有公司和团队。建议结合具体公司的招聘信息和在职从业者的反馈做综合判断。`;

// ============================================================
// 中文停用词表（精简版）
// ============================================================
const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
  '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有',
  '看', '好', '自己', '这', '他', '她', '它', '们', '那', '些', '什么',
  '如何', '怎么', '为什么', '可以', '能', '能够', '应该', '需要', '必须',
  '及', '与', '或', '等', '对', '被', '把', '从', '向', '为', '以', '于',
  '而', '但', '但', '且', '如果', '虽然', '因为', '所以', '因此', '然后',
  '并且', '或者', '还是', '不是', '已', '已经', '正在', '将', '会',
  '做', '进行', '工作', '岗位', '职位', '公司', '团队', '项目', '负责',
  '要求', '具备', '熟悉', '了解', '掌握', '优先', '以上', '以下',
  '相关', '经验', '能力', '素质', '精神', '意识', '思维',
  '的', '地', '得', '之', '其', '该', '此', '每', '各', '某', '任',
  '招聘', '岗位职责', '任职要求', '薪资', '福利', '待遇', '地点',
  '年', '月', '日', '周', '时', '分', '秒',
  '请', '欢迎', '期待', '加入', '我们', '您',
]);

// ============================================================
// category_id -> category_name 映射
// ============================================================
const CATEGORY_MAP = {
  development: '开发',
  algorithm: '算法',
  product_manager: '产品经理',
  operations: '运营',
  uiux_design: 'UI/UX设计',
  data_analysis: '数据分析',
  // 兼容旧 category id
  frontend: '开发',
  backend: '开发',
};

// ============================================================
// LLMClient 类（适配云函数环境，使用 Node.js 18+ 内置 fetch）
// ============================================================
class LLMClient {
  constructor(config = {}) {
    this.baseURL = (config.baseURL || LLM_API_BASE_URL).replace(/\/+$/, '');
    this.apiKey = config.apiKey || LLM_API_KEY;
    this.model = config.model || LLM_MODEL_NAME;
    this.temperature = config.temperature != null ? config.temperature : 0.7;
    this.maxTokens = config.maxTokens != null ? config.maxTokens : 4096;
    this.timeout = config.timeout != null ? config.timeout : 50000;
    this.retries = config.retries != null ? config.retries : 2;
    this.chatURL = `${this.baseURL}/chat/completions`;
  }

  /**
   * 发送 Prompt 到大模型，返回生成的文本
   */
  async chat(systemPrompt, userPrompt, options = {}) {
    const messages = [];
    if (systemPrompt && systemPrompt.trim()) {
      messages.push({ role: 'system', content: systemPrompt.trim() });
    }
    if (!userPrompt || !userPrompt.trim()) {
      throw new Error('LLMClient: userPrompt 不能为空');
    }
    messages.push({ role: 'user', content: userPrompt.trim() });

    const requestBody = {
      model: this.model,
      messages,
      temperature: options.temperature != null ? options.temperature : this.temperature,
      max_tokens: options.maxTokens != null ? options.maxTokens : this.maxTokens,
    };

    return this._requestWithRetry(requestBody);
  }

  /**
   * 带重试机制的 API 请求
   */
  async _requestWithRetry(requestBody, attempt = 0) {
    try {
      return await this._doRequest(requestBody);
    } catch (err) {
      if (attempt < this.retries && this._isRetryableError(err)) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[LLM] 请求失败 (${err.message})，${delay}ms 后进行第 ${attempt + 1} 次重试...`);
        await this._sleep(delay);
        return this._requestWithRetry(requestBody, attempt + 1);
      }
      throw err;
    }
  }

  /**
   * 执行单次 API 请求
   */
  async _doRequest(requestBody) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.chatURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `API 请求失败 (HTTP ${response.status})`;
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = (errorJson.error && errorJson.error.message) || errorJson.message || errorMessage;
        } catch (e2) { /* 忽略 */ }

        if (response.status === 401) throw new Error('API Key 无效或已过期，请检查 LLM_API_KEY 配置');
        if (response.status === 429) throw new Error('API 调用频率超限，请稍后重试');
        if (response.status === 400) throw new Error(`请求参数错误: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      // 解析响应（GLM-5.1 等模型可能返回超大整数导致 JSON.parse 失败）
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        const sanitized = responseText.replace(/"(\w+)"\s*:\s*(\d{16,})/g, '"$1":0');
        try {
          data = JSON.parse(sanitized);
        } catch (e2) {
          throw new Error(`API 响应 JSON 解析失败: ${e2.message}`);
        }
      }

      if (!data.choices || !data.choices[0]) {
        throw new Error(`API 返回格式异常: 缺少 choices 字段`);
      }

      const message = data.choices[0].message || {};
      const content = message.content || message.reasoning_content || '';
      if (!content) throw new Error('API 返回内容为空');

      return {
        content,
        usage: data.usage || {},
        finishReason: (data.choices && data.choices[0] && data.choices[0].finish_reason) || 'unknown',
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`API 请求超时 (${this.timeout / 1000}s)，请检查网络连接或增加超时时间`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 判断错误是否可重试
   */
  _isRetryableError(err) {
    const retryablePatterns = [
      'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT',
      'fetch failed', '请求超时',
      'API 请求失败 (HTTP 5', 'API 请求失败 (HTTP 502',
      'API 请求失败 (HTTP 503', 'API 请求失败 (HTTP 504',
    ];
    const message = err.message || '';
    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================
// KnowledgeRetriever 类（使用内嵌数据）
// ============================================================
class KnowledgeRetriever {
  constructor() {
    this.allExperiences = [];
    this.categoryMap = {};
    this.loaded = false;
  }

  /**
   * 加载内嵌知识库数据
   */
  async loadKnowledge() {
    if (this.loaded) return;

    for (const [key, data] of Object.entries(KNOWLEDGE_DATA)) {
      try {
        if (data.categories && Array.isArray(data.categories)) {
          for (const category of data.categories) {
            const categoryId = category.category_id;
            const categoryName = category.category_name;

            if (!this.categoryMap[categoryId]) {
              this.categoryMap[categoryId] = [];
            }

            for (const job of category.jobs) {
              for (const exp of job.experiences) {
                const enriched = {
                  ...exp,
                  _category_id: categoryId,
                  _category_name: categoryName,
                  _job_title: job.job_title,
                };
                this.allExperiences.push(enriched);
                this.categoryMap[categoryId].push(enriched);
              }
            }
          }
        }
        console.log(`[KnowledgeRetriever] 已加载: ${key}`);
      } catch (err) {
        console.error(`[KnowledgeRetriever] 加载失败: ${key}`, err.message);
      }
    }

    console.log(`[KnowledgeRetriever] 共加载 ${this.allExperiences.length} 条经验数据`);
    this.loaded = true;
  }

  /**
   * 核心检索方法：给定 JD 文本和岗位类别，返回最相关的经验
   */
  async retrieve(jdText, jobCategory = null, options = {}) {
    if (!this.loaded) await this.loadKnowledge();

    // 如果指定了 category，先按 category 过滤
    let candidates;
    if (jobCategory === 'development') {
      candidates = [...(this.categoryMap['frontend'] || []), ...(this.categoryMap['backend'] || [])];
    } else if (jobCategory) {
      candidates = this.categoryMap[jobCategory] || [];
    } else {
      candidates = this.allExperiences;
    }

    if (candidates.length === 0) {
      console.warn(`[KnowledgeRetriever] 未找到匹配的经验数据，category=${jobCategory}`);
      return [];
    }

    const ranked = this._rankExperiences(jdText, candidates);

    const MIN_HYBRID_SCORE = 0.1;
    const filtered = ranked.filter(r => r.scores.hybrid >= MIN_HYBRID_SCORE);

    if (filtered.length === 0) {
      console.warn(`[KnowledgeRetriever] 无经验达到相关性阈值(${MIN_HYBRID_SCORE})，返回得分最高的 1 条`);
      return options.returnScores ? [ranked[0]] : [ranked[0].experience];
    }

    const topResults = filtered.slice(0, 2);
    return options.returnScores ? topResults : topResults.map(r => r.experience);
  }

  // ---- 检索相关内部方法 ----

  _keywordMatch(jdText, experience) {
    if (!experience.keywords) return 0;
    const jdTokens = this._tokenize(jdText);
    const jdTokenSet = new Set(jdTokens);
    const keywordGroups = Object.values(experience.keywords);
    let matchCount = 0;
    let totalKeywords = 0;

    for (const group of keywordGroups) {
      for (const kw of group) {
        totalKeywords++;
        const kwTokens = this._tokenize(kw);
        for (const token of kwTokens) {
          if (jdTokenSet.has(token)) {
            matchCount++;
            break;
          }
        }
      }
    }
    return totalKeywords > 0 ? matchCount / totalKeywords : 0;
  }

  _semanticSimilarity(jdText, experience) {
    const jdTokens = this._tokenize(jdText);
    const jdSet = new Set(jdTokens);
    const kwTokens = this._flattenKeywordsToTokens(experience.keywords);
    const kwSet = new Set(kwTokens);

    let intersection = 0;
    for (const token of jdSet) {
      if (kwSet.has(token)) intersection++;
    }
    const union = jdSet.size + kwSet.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  _rankExperiences(jdText, experiences) {
    const KEYWORD_WEIGHT = 0.6;
    const SEMANTIC_WEIGHT = 0.4;

    return experiences.map(exp => {
      const keywordScore = this._keywordMatch(jdText, exp);
      const semanticScore = this._semanticSimilarity(jdText, exp);
      const hybridScore = keywordScore * KEYWORD_WEIGHT + semanticScore * SEMANTIC_WEIGHT;
      return { experience: exp, scores: { keyword: keywordScore, semantic: semanticScore, hybrid: hybridScore } };
    }).sort((a, b) => b.scores.hybrid - a.scores.hybrid);
  }

  // ---- 分词工具方法 ----

  _tokenize(text) {
    if (!text) return [];
    const normalized = text.toLowerCase();
    const tokens = normalized.match(/[\u4e00-\u9fa5]{2,}|[a-zA-Z0-9]+/g) || [];
    const expanded = [];
    for (const token of tokens) {
      if (/^[a-zA-Z0-9]+$/.test(token)) {
        if (!STOP_WORDS.has(token) && token.length > 1) expanded.push(token);
        continue;
      }
      if (!STOP_WORDS.has(token)) expanded.push(token);
      for (let i = 0; i < token.length - 1; i++) {
        const bigram = token.substring(i, i + 2);
        if (!STOP_WORDS.has(bigram)) expanded.push(bigram);
      }
    }
    return expanded;
  }

  _flattenKeywordsToTokens(keywords) {
    if (!keywords) return [];
    const allTokens = [];
    for (const group of Object.values(keywords)) {
      for (const kw of group) {
        allTokens.push(...this._tokenize(kw));
      }
    }
    return allTokens;
  }
}

// ============================================================
// 格式化函数：将 experience 对象转为 Markdown 格式
// ============================================================
function formatExperienceForPrompt(experience) {
  const lines = [];
  lines.push(`### 经验 ${experience.id}`);
  lines.push('');
  lines.push('#### 真实日常工作：');

  if (experience.work_content && experience.work_content.daily_tasks) {
    for (const task of experience.work_content.daily_tasks) {
      lines.push(`${task.time_ratio}时间] ${task.task}`);
      lines.push(`   ${task.detail}`);
    }
  }

  lines.push('');
  lines.push('#### JD 写的 vs 实际情况：');

  if (experience.work_content && experience.work_content.jd_vs_reality) {
    for (const item of experience.work_content.jd_vs_reality) {
      lines.push(`- JD说"${item.jd_says}" → 实际：${item.reality}`);
    }
  }

  lines.push('');
  lines.push('#### 核心技能要求：');

  if (experience.core_skills) {
    const mustHave = (experience.core_skills.must_have || []).map(s => s.skill).join('、');
    const niceToHave = (experience.core_skills.nice_to_have || []).map(s => s.skill).join('、');
    lines.push(`必备：${mustHave}`);
    if (niceToHave) lines.push(`加分：${niceToHave}`);
  }

  lines.push('');
  lines.push('#### 入行建议：');

  if (experience.entry_advice) {
    const sorted = [...experience.entry_advice].sort((a, b) => a.priority - b.priority);
    sorted.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.action}（${item.estimated_time}）— ${item.why}`);
    });
  }

  lines.push('');
  return lines.join('\n');
}

function formatKnowledgeForInjection(experiences) {
  if (!experiences || experiences.length === 0) return '暂无相关经验数据。';

  const lines = [];
  lines.push('## 来自从业者社区公开讨论整理的经验');
  lines.push('');
  lines.push('### 经验来源：AI 基于公开社区信息综合生成');
  lines.push('');

  experiences.forEach((exp, idx) => {
    const formatted = formatExperienceForPrompt(exp);
    const contentLines = formatted.split('\n');
    contentLines[0] = `### 经验 ${idx + 1}`;
    lines.push(contentLines.join('\n'));
  });

  return lines.join('\n');
}

// ============================================================
// PromptBuilder 类（使用内嵌模板和数据）
// ============================================================
class PromptBuilder {
  constructor() {
    this.knowledgeRetriever = new KnowledgeRetriever();
    this._templateCache = null;
  }

  /**
   * 构建完整的 Prompt（拆分为 system 和 user 两部分）
   */
  async buildPrompt(jdText, jobCategory = null, userBackground = null) {
    // 1. 确保知识库已加载
    await this.knowledgeRetriever.loadKnowledge();

    // 2. 检索相关知识
    const experiences = await this.knowledgeRetriever.retrieve(jdText, jobCategory);

    // 3. 格式化知识注入文本
    const knowledgeText = formatKnowledgeForInjection(experiences);

    // 4. 读取内嵌模板
    const template = this._loadTemplate();

    // 5. 获取岗位类别名称
    const categoryName = jobCategory
      ? (CATEGORY_MAP[jobCategory] || jobCategory)
      : '未指定';

    // 6. 输入清洗
    const cleanedJdText = this._sanitizeInput(jdText, 10000);
    const cleanedBackground = this._sanitizeInput(userBackground, 500);
    const backgroundText = cleanedBackground || '用户未提供背景信息';

    // 7. 拆分模板为 system 和 user 两部分
    const splitMarker = /#{1,2}\s*用户输入/;
    const splitIndex = template.search(splitMarker);

    let systemPart, userPart;
    if (splitIndex !== -1) {
      systemPart = template.slice(0, splitIndex).trim();
      userPart = template.slice(splitIndex).trim();
    } else {
      systemPart = template;
      userPart = '请解读以下招聘 JD：\n\n{JD_TEXT}\n\n岗位类别：{JOB_CATEGORY}\n{USER_BACKGROUND}';
    }

    // 8. 替换占位符
    const systemPrompt = this._fillPlaceholders(systemPart, knowledgeText, '', categoryName, '');
    const userPrompt = this._fillPlaceholders(userPart, '', cleanedJdText, categoryName, backgroundText);

    return {
      systemPrompt,
      userPrompt,
      prompt: systemPrompt + '\n\n' + userPrompt,
      metadata: {
        jobCategory: categoryName,
        categoryId: jobCategory,
        experienceCount: experiences.length,
        experienceIds: experiences.map(e => e.id),
        hasUserBackground: !!userBackground,
        knowledgeCharCount: knowledgeText.length,
        promptCharCount: systemPrompt.length + userPrompt.length,
      },
    };
  }

  /**
   * 加载内嵌的 Prompt 模板
   */
  _loadTemplate() {
    if (this._templateCache) return this._templateCache;
    this._templateCache = PROMPT_TEMPLATE.trim();
    return this._templateCache;
  }

  _fillPlaceholders(template, knowledgeText, jdText, jobCategory, userBackground) {
    return template
      .replace('{KNOWLEDGE_INJECTION}', knowledgeText)
      .replace('{JD_TEXT}', jdText)
      .replace('{JOB_CATEGORY}', jobCategory)
      .replace('{USER_BACKGROUND}', userBackground);
  }

  _sanitizeInput(input, maxLength = 10000) {
    if (!input || typeof input !== 'string') return null;
    let cleaned = input.slice(0, maxLength);
    const injectionPatterns = [
      /忽略以上[所有]?[规则|指令|要求]/gi,
      /ignore\s+(all\s+)?(previous|above|the)/gi,
      /你现在是/gi,
      /system\s*:/gi,
      /\{[A-Z_]+\}/g,
    ];
    for (const pattern of injectionPatterns) {
      cleaned = cleaned.replace(pattern, '[已过滤]');
    }
    return cleaned.trim() || null;
  }
}

// ============================================================
// AI 请求队列（防止并发限流）
// ============================================================
const aiQueue = {
  _running: false,
  _queue: [],

  async enqueue(task) {
    return new Promise((resolve, reject) => {
      this._queue.push({ task, resolve, reject });
      this._process();
    });
  },

  async _process() {
    if (this._running || this._queue.length === 0) return;
    this._running = true;

    const { task, resolve, reject } = this._queue.shift();
    const queueLength = this._queue.length;
    if (queueLength > 0) {
      console.log(`[AI队列] 当前排队 ${queueLength + 1} 个请求`);
    }

    try {
      const result = await task();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this._running = false;
      this._process();
    }
  },
};

// ============================================================
// 报告完整性检测与补全
// ============================================================

/**
 * 检测报告是否完整，不完整时自动补全缺失章节
 * @param {string} report - AI 生成的报告文本
 * @param {string} systemPrompt - system prompt（用于补全请求）
 * @returns {Promise<string>} 完整的报告
 */
async function checkAndCompleteReport(report, systemPrompt) {
  // 检测标志：报告末尾是否包含数据来源声明
  const hasDataSource = report.includes('数据来源说明');

  if (hasDataSource) {
    console.log('[补全] 报告完整，无需补全');
    return report;
  }

  // 检测已输出的章节
  const dimensionPattern = /^##\s*[一二三四五六][、.．]/gm;
  const foundDimensions = report.match(dimensionPattern) || [];
  const foundSet = new Set(foundDimensions.map(d => d.charAt(3)));

  console.log(`[补全] 报告不完整（${foundSet.size} 个章节），开始补全...`);

  // 构建补全请求
  const completePrompt = `以下是未完成的 JD 解读报告，请从"${foundDimensions[foundDimensions.length - 1] || '## 一'}"之后继续输出缺失的章节，直到包含"数据来源说明"为止。不要重复已输出的内容。

已有内容：
${report}

请直接从缺失的章节开始输出，不要加任何解释。`;

  try {
    const llmClient = new LLMClient();

    const supplement = await aiQueue.enqueue(async () => {
      const result = await llmClient.chat(systemPrompt, completePrompt);
      return result.content;
    });

    // 去重：补全内容可能重复了已有章节的开头
    let cleanSupplement = supplement;
    const lastDim = foundDimensions[foundDimensions.length - 1];
    if (lastDim && cleanSupplement.includes(lastDim)) {
      const secondOccurrence = cleanSupplement.indexOf(lastDim, lastDim.length);
      if (secondOccurrence > 0) {
        cleanSupplement = cleanSupplement.substring(secondOccurrence);
      }
    }

    const completedReport = report + '\n\n' + cleanSupplement;
    console.log(`[补全] 补全成功，新增 ${cleanSupplement.length} 字，总计 ${completedReport.length} 字`);
    return completedReport;
  } catch (err) {
    console.error('[补全] 补全失败，返回原始报告:', err.message);
    return report;
  }
}

// ============================================================
// 核心：handleParse 函数
// ============================================================

/**
 * 处理 JD 解读请求
 * @param {string} jdText - JD 文本
 * @param {string|null} jobCategory - 岗位类别
 * @param {string|null} userBackground - 用户背景
 * @returns {Promise<Object>} 解读结果
 */
async function handleParse(jdText, jobCategory, userBackground) {
  // ---- 参数校验 ----
  if (!jdText || typeof jdText !== 'string' || jdText.trim().length === 0) {
    return { success: false, error: { message: 'jdText 不能为空，请提供招聘 JD 文本' } };
  }

  if (jdText.length < 50) {
    return { success: false, error: { message: 'JD 文本过短，请提供至少 50 字的完整 JD' } };
  }

  if (jdText.length > 10000) {
    return { success: false, error: { message: 'JD 文本过长，请控制在 10000 字以内' } };
  }

  if (userBackground && userBackground.length > 500) {
    return { success: false, error: { message: '背景信息请控制在 500 字以内' } };
  }

  // 验证 jobCategory 是否合法
  const validCategories = Object.keys(CATEGORY_MAP);
  const normalizedCategory = jobCategory || null;
  if (normalizedCategory && !validCategories.includes(normalizedCategory)) {
    return { success: false, error: { message: `无效的岗位类别，可选值：${validCategories.join(', ')}` } };
  }

  console.log(`[解读] 开始处理，category=${normalizedCategory || '自动检测'}`);

  // ---- 构建 Prompt ----
  const builder = new PromptBuilder();
  let metadata = {
    jobCategory: CATEGORY_MAP[normalizedCategory] || '未指定',
    experienceCount: 0,
    promptCharCount: 0,
  };

  let systemPrompt = '';
  let userPrompt = '';

  try {
    const buildResult = await builder.buildPrompt(jdText, normalizedCategory, userBackground);
    systemPrompt = buildResult.systemPrompt;
    userPrompt = buildResult.userPrompt;
    metadata = buildResult.metadata;
  } catch (err) {
    console.warn(`[解读] 知识库检索失败，使用默认元数据: ${err.message}`);
    // 降级：使用简单 Prompt
    systemPrompt = '你是一个专业的招聘JD解读助手，擅长从从业者真实经验的角度分析招聘需求。';
    userPrompt = `请解读以下招聘JD，给出真实工作内容、核心能力要求和行动建议：\n\n${jdText}`;
    metadata.promptCharCount = systemPrompt.length + userPrompt.length;
  }

  // ---- 调用 LLM ----
  console.log('[解读] 调用大模型 API...');

  let report;
  try {
    report = await aiQueue.enqueue(async () => {
      const llmClient = new LLMClient();
      const result = await llmClient.chat(systemPrompt, userPrompt);
      return result.content;
    });

    // ---- 后处理：检测报告完整性 ----
    report = await checkAndCompleteReport(report, systemPrompt);

    console.log(`[解读] AI 调用成功，生成 ${report.length} 字`);
  } catch (aiErr) {
    console.error('[解读] AI 模式调用失败:', aiErr.message);
    return {
      success: false,
      error: { message: `AI 调用失败: ${aiErr.message}` },
    };
  }

  return {
    success: true,
    data: {
      report,
      metadata: {
        jobCategory: metadata.jobCategory,
        experienceCount: metadata.experienceCount,
        promptCharCount: metadata.promptCharCount,
        mode: 'AI',
      },
    },
  };
}

// ============================================================
// 云函数入口函数
// ============================================================
exports.main = async (event, context) => {
  console.log('[云函数] 收到请求:', JSON.stringify(event).substring(0, 200));

  const { action, jdText, jobCategory, userBackground } = event;

  switch (action) {
    case 'parse':
      return await handleParse(jdText, jobCategory, userBackground);

    case 'health':
      return { success: true, data: { status: 'ok', model: LLM_MODEL_NAME } };

    default:
      return { success: false, error: { message: '未知操作: ' + action } };
  }
};
