# 变更日志

> 格式：每次变更简要记录，保持可追溯。不做长篇分析。

## 2026-04-18

- [Phase2] 修复跨文件 ID 重复：exp_001→fe_exp_001 等 12 处，涉及 3 个 JSON 文件
- [Phase2] 修复 level 枚举值："掌握"→"熟练"，frontend-backend.json 4 处
- [Phase2] tech-architecture.md 添加数据结构权威定义指向注释
- [Review] 生成 REVIEW-report.md（综合评分 6.8/10）+ 辩论稿 DEFENSE/DEBATE
- [Review] 辩论裁决：需做轻量 RAG + 幻觉边界规则 + 种子数据诚实标注
- [Prompt] 创建 hallucination-boundaries.md（5 条硬规则 + Prompt 注入模板）
- [工程] 创建 CHANGELOG.md 和 phase-review-log.md，建立轻量级 Review 机制
- [Phase2] 种子数据诚实标注：source_type 改为 ai_synthesized_* 前缀（12 条全部完成）
- [Phase2] 种子数据新增 data_verification 字段（is_verified: false，12 条全部完成）
- [Phase2] 种子数据 source_detail 改为诚实标注（去掉暗示真实访谈的表述）
- [Phase3] 种子数据补充 keywords 字段（12 条，5 子字段：job_titles/tech_stack/skills/tools/concepts）
- [Phase3] 设计 V1 Prompt 模板（v1-jd-parser.md）：8 维度分层输出 + 幻觉边界 5 规则 + 质量自检清单
- [Phase3] 实现 knowledge-retriever.js：轻量 RAG（关键词 0.6 + Jaccard 语义 0.4 混合排序），49 项测试通过
- [Phase3] 实现 prompt-builder.js：模板加载 + 占位符替换 + 元数据返回
- [Phase3] 格式化层压缩率 76.1%（原始 5537 字符 → 格式化 1325 字符）
- [Phase3] V1 质量评估：21/25（基线达标 ≥15，接近优秀 ≥22），详见 prompt-test-results.md
- [Phase3-Review] 修复 Prompt 注入防护：prompt-builder.js 新增 _sanitizeInput（长度限制+注入模式过滤）
- [Phase3-Review] 修复检索相关性阈值：knowledge-retriever.js 新增 MIN_HYBRID_SCORE=0.1 过滤
- [Phase3-Review] 修复模板提取容错：prompt-builder.js 支持多种代码块格式 + 全文回退
- [Phase3-Review] 修复后回归测试：49/49 通过
- [Phase4] 调研免费 LLM API：推荐智谱 GLM-4-Flash（永久免费）+ 硅基流动（3000万 tokens）
- [Phase4] 搭建后端 API 服务：Express + 6 个接口（parse/categories/history/feedback/health），Mock+AI 双模式
- [Phase4] 搭建微信原生小程序：3 个页面（index/report/history）+ API 封装，17 个文件
- [Phase4] 实现 AI 对接层：llm-client.js（OpenAI 兼容格式，超时/重试/降级机制）
- [Phase4] 集成测试：5 个接口全部通过（健康检查/类别/解读/历史/参数校验）
- [Phase4-Review] 发现 4 个前后端对接致命问题，已全部修复：
  - api.js 响应判断逻辑（code→success）
  - report.js Markdown 渲染（结构化字段→Markdown 文本）
  - app.js 岗位类别 ID 统一（product→product_manager 等）
  - index.wxml 动态渲染确认无需额外修改
- [进度] 2026-04-18 工作暂停，Phase 1-4 全部完成，待获取智谱 API Key 后进入联调阶段
- [联调] 配置智谱 API Key，模型切换为 GLM-5.1
- [联调] 修复 GLM-5.1 兼容性问题：
  - 超大整数解析（u64::MAX in usage）：llm-client.js 正则替换 + server.js 日志过滤
  - 推理模型兼容：reasoning_content 回退 + max_tokens 8192 + timeout 60000
  - system/user prompt 拆分：prompt-builder.js 以"# 用户输入"为分界线
  - 首次 AI 调用成功（2987 tokens），后续因频繁测试触发 429 限流降级为 Mock
- [联调] 验证降级机制正常：AI 失败 → Mock 模式，用户无感知
- [联调] 工程决策：换回 GLM-4-Flash（限流宽松、响应快、兼容性好，JD 解读不需要推理模型）
- [联调] GLM-4-Flash 端到端测试成功：AI 调用正常，生成 1082 字报告
- [联调] 待优化：AI 报告格式未严格遵循 V1 Prompt 分维度结构（需 Prompt V2 迭代）
- [Prompt-V2] 创建 v2-jd-parser.md：从 350 行精简到 73 行，去掉代码块示例，直接描述格式
- [Prompt-V2] 修复 AI 提前停止问题：V1 模板过长导致 GLM-4-Flash 只输出 1 个维度（finish_reason: stop）
- [Prompt-V2] V2 测试成功：8/8 维度全部输出，1803 字，格式正确，含数据来源声明
- [Prompt-V2] 超时调整：30s→45s（完整 Prompt + 长输出需要更多时间）
- [Prompt-V2] server.js 切换为 v2-jd-parser.md 模板
- [真机修复] 产品改名：JD 真话 → JD 说真话
- [真机修复] UI 全面改版：蓝色 → 玫红色 #FF2D55，13 个文件，渐变 header + 卡片阴影 + 按压效果
- [真机修复] 流式输出：WebSocket 实现（后端 ws + 前端 wx.connectSocket），Mock 模式模拟逐字输出
- [真机修复] Prompt V2.1：JD 潜台词改为引用+箭头格式，KPI/工作强度/差距分析可读性优化
- [真机修复] 卡顿优化：增量渲染（只转换新增文本）+ 减少 setData 调用频率
- [Phase5] 流式渲染修复：增量渲染→全文渲染（Markdown 上下文相关，增量必然格式错乱）
- [Phase5] 边界测试 8 用例完成（7 通过 / 1 失败 / 1 警告），详见 04-development/test-boundary-results.json
- [Phase5] AI 模式验证：产品经理 JD 2519 字完整报告，8/8 维度，格式正确，无幻觉
- [Phase5] 并发分析：智谱 API 并发限制 1-2 个请求，Demo 阶段无影响
- [Phase5] 路线 B 规划完成（roadmap-b.md）：导出方案 D+E、UI P0 三项、功能 P0 两项
- [并发] 前端按钮冷却 5 秒（index.js），防止用户连点 + toast 提示
- [并发] 后端 AI 请求串行队列（server.js），多人同时解读自动排队，防止 429 限流
- [Prompt-V3] 精简维度 8→6：砍掉"团队协作"，合并"KPI"+"工作强度"为"考核与工作强度"
- [Prompt-V3] max_tokens 4096→8192，确保长报告不被截断
- [UI] 去掉底部操作栏的分享按钮（微信自带转发功能）
- [UI] emoji 映射同步更新为 6 个维度

## 2026-04-20 ~ 2026-04-21

- [Phase6] 创建 .gitignore（.env、node_modules、日志、OS 文件）
- [Phase6] 修复 history.js 缺少 goToIndex 方法
- [Phase6] 修复前后端分页参数不匹配（后端 limit → page/pageSize，返回字段 items → list）
- [Phase6] 修复 Mock 模式缺少 development/algorithm 分支
- [Phase6] 修复 report.js 分享标题 jobCategory 未赋值
- [Phase6] 微信云开发改造：后端逻辑从 Express + WebSocket 迁移到云函数
  - 创建 cloudfunctions/parseJD/（index.js + package.json + config.json）
  - 合并 LLM/Knowledge/Prompt/补全/队列到单一云函数
  - 知识库数据内嵌为 JavaScript 对象字面量（tcb CLI 不上传 JSON 文件）
  - API Key 内嵌（代码不公开，无需环境变量）
- [Phase6] 前端改造：WebSocket → wx.cloud.callFunction
  - index.js：onSubmit 改为云函数调用，结果存 localStorage
  - report.js：删除 WebSocket 流式逻辑，改为 URL 参数/localStorage 加载
  - history.js：改为读 localStorage，去掉 API 调用和分页
  - app.js：添加 wx.cloud.init()
  - app.json：添加 cloudfunctionRoot
- [Phase6] 部署调试（8 个问题修复）：
  - project.config.json 添加 miniprogramRoot/cloudfunctionRoot
  - 云函数入口函数名 main_handler → main
  - 知识库 JSON 内嵌语法错误（JSON.parse → 对象字面量）
  - Node.js 兼容性（catch {} → catch(e)、??/?. → 三元表达式）
  - config.json 添加 runtime: Nodejs18
- [Phase6] Prompt V3.1 精简：删除冗余"输出规则"段落，行动建议去掉推荐资源，Prompt 减少 28%
- [Phase6] UI 优化：自定义 loading 遮罩（淡橙色 #FFA03C 旋转动画 + 暗色卡片），去掉"预计 20-30 秒"
- [Phase6] 云函数部署成功，真机测试通过，代码审核通过
- [Phase6] 部署架构：小程序 → 云函数 parseJD → 智谱 API（0 成本）

## 2026-04-22

- [Phase7] 代码上传 v1.0.0，提交微信审核
- [Phase7] 审核失败：个人主体不支持 AI 深度合成服务类目（需企业主体）
- [Phase7] 修复 loading 遮罩过早消失：删除 5 秒自动解锁 setTimeout，改用 onShow 重置
- [Phase7] 修复 URL 超长导致跳转失败：改为 historyId 传递，report 页从 localStorage 读取
- [Phase7] LLM 超时从 120s 降到 50s（适配云函数 60s 限制），maxTokens 从 8192 降到 4096
