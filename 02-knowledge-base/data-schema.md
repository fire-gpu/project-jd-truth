# 经验知识库 — 数据结构定义

## 设计原则

1. **可扩展**：结构上支持从关键词匹配升级到向量检索
2. **可追溯**：每条经验都有明确来源
3. **可贡献**：预留用户贡献字段
4. **可验证**：支持质量评分和审核状态

## 数据 Schema

### 顶层结构

```json
{
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
          "experiences": [ /* Experience 对象数组 */ ]
        }
      ]
    }
  ]
}
```

### Experience 对象

```json
{
  "id": "exp_001",
  "work_content": {
    "daily_tasks": [
      {
        "task": "编写业务组件和页面",
        "time_ratio": "60%",
        "detail": "主要是根据设计稿还原页面，写表单、列表、详情页等"
      },
      {
        "task": "联调和对接后端 API",
        "time_ratio": "20%",
        "detail": "和后端对接口字段、处理数据格式、调试接口问题"
      }
    ],
    "jd_vs_reality": {
      "jd_says": "负责产品前端架构设计",
      "reality": "大部分时候是按已有架构写代码，架构设计是高级工程师的事",
      "gap_level": "high"
    }
  },
  "core_skills": {
    "must_have": [
      {
        "skill": "JavaScript",
        "level": "熟练",
        "why": "日常开发核心语言",
        "how_to_verify": "能独立完成中等复杂度的交互逻辑"
      }
    ],
    "nice_to_have": [
      {
        "skill": "TypeScript",
        "level": "了解",
        "why": "越来越多团队在用，但不是硬性要求",
        "how_to_verify": "能看懂 TS 代码，会基本类型定义"
      }
    ]
  },
  "entry_advice": [
    {
      "action": "精通一个主流框架（React 或 Vue）",
      "priority": 1,
      "estimated_time": "2-3 个月",
      "resources": ["官方文档", "某个具体项目实战"],
      "why": "面试必考，实际工作每天都在用"
    }
  ],
  "meta": {
    "source_type": "interview",  // interview | community | self_contribution
    "source_detail": "访谈：某互联网公司前端工程师，3年经验",
    "contributor": null,  // 用户贡献时填写
    "quality_score": 4.5,  // 人工评分 1-5
    "review_status": "approved",  // pending | approved | rejected
    "created_at": "2026-04-17",
    "updated_at": "2026-04-17"
  }
}
```

## 字段说明

### work_content（真实工作内容）

| 字段 | 类型 | 说明 |
|------|------|------|
| daily_tasks | Array | 日常工作任务列表 |
| daily_tasks[].task | String | 任务名称 |
| daily_tasks[].time_ratio | String | 时间占比（估算） |
| daily_tasks[].detail | String | 具体描述 |
| jd_vs_reality | Object | JD 描述 vs 真实情况的对比 |
| jd_vs_reality[].gap_level | Enum | 差距程度：low / medium / high |

### core_skills（核心能力要求）

| 字段 | 类型 | 说明 |
|------|------|------|
| must_have | Array | 必备技能 |
| nice_to_have | Array | 加分技能 |
| [].skill | String | 技能名称 |
| [].level | String | 要求水平：了解/基本/熟练/精通 |
| [].why | String | 为什么需要这个技能 |
| [].how_to_verify | String | 如何验证自己达到了这个水平 |

### entry_advice（入行建议）

| 字段 | 类型 | 说明 |
|------|------|------|
| action | String | 具体行动 |
| priority | Number | 优先级（1 最高） |
| estimated_time | String | 预计所需时间 |
| resources | Array | 推荐资源 |
| why | String | 为什么建议这样做 |

## 检索策略

### V1：关键词匹配（Demo）

```javascript
function retrieveKnowledge(jdText, category) {
  // 1. 从 JD 中提取岗位类别关键词
  const keywords = extractKeywords(jdText);

  // 2. 匹配岗位类别
  const matchedCategory = matchCategory(keywords, category);

  // 3. 返回该类别下所有经验
  return knowledgeBase.filter(
    item => item.category_id === matchedCategory
  );
}
```

### V2：向量检索（后续升级）

```javascript
async function retrieveKnowledge(jdText) {
  // 1. 将 JD 文本转为向量
  const embedding = await embed(jdText);

  // 2. 在向量数据库中检索最相关的经验
  const results = await vectorDB.search(embedding, {
    topK: 3,
    threshold: 0.7
  });

  return results;
}
```

## 数据质量保障

| 维度 | 标准 | 检查方式 |
|------|------|---------|
| 真实性 | 每条经验有明确来源 | 人工审核 |
| 时效性 | 经验不超过 2 年 | created_at 字段 |
| 具体性 | 每条建议可操作 | 人工评估 |
| 去重 | 同一岗位不重复收集相似经验 | 人工审核 |
| 多样性 | 每个岗位至少 2 个不同来源的经验 | 数量检查 |
