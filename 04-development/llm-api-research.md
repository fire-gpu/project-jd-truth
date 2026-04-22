# JD 真话项目 -- 中文大模型 API 选型调研

> 调研时间：2026 年 4 月
> 目标：为 AI JD 解读功能选择免费/低成本的中文大模型 API

---

## 一、需求摘要

| 需求项 | 说明 |
|--------|------|
| 中文能力 | 解读中文招聘 JD，需要强中文理解和生成能力 |
| 上下文长度 | 至少 8K tokens（Prompt + 知识注入约 4-5K tokens） |
| 成本预算 | 免费额度或极低成本，Demo 阶段日调用量 < 50 次 |
| API 格式 | OpenAI 兼容格式优先，方便切换 |
| 网络要求 | 国内可直连，无需翻墙 |

---

## 二、平台对比总表

| 平台 | 免费额度 | 有效期 | 推荐模型 | 上下文窗口 | OpenAI 兼容 | 注册门槛 |
|------|----------|--------|----------|-----------|-------------|----------|
| **硅基流动 SiliconFlow** | 新用户 2000 万 tokens，活动期累计最高 3000 万 | 永久 | DeepSeek-V3/R1, Qwen2.5-72B, Kimi K2.5 | 32K-128K（视模型） | 是 | 手机号注册 |
| **智谱 AI** | GLM-4.7-Flash 永久免费无上限；新用户 2000 万 tokens | 永久 | GLM-4.7-Flash, GLM-5-Turbo | 200K | 是（v4 接口） | 手机号 + 实名 |
| **阿里云百炼** | 每模型 100 万 tokens（90 天）；Qwen-Turbo 每月 100 万永久免费 | 90 天 / 永久 | Qwen3.5-Turbo, Qwen3-Max | 32K-128K | 是（compatible-mode） | 支付宝/手机号 + 实名 |
| **DeepSeek** | 注册即送 500 万 tokens | 30 天 | DeepSeek-V3.2, DeepSeek-R1 | 128K（V4 可达 1M） | 是 | 手机号注册 |
| **火山引擎（豆包）** | 每日 200 万 tokens，凌晨刷新不累积 | 每日刷新 | Doubao-Seed-2.0 Pro, Doubao-Flash | 32K-128K | 是 | 手机号 + 实名 |
| **百度千帆** | ERNIE-Speed/Lite 永久免费（每日约 500 次） | 永久 | ERNIE-Speed, ERNIE-Lite | 128K | 是 | 手机号 + 实名 |
| **腾讯混元** | 100 万 tokens 混元大模型包 + 100 万 Embedding 包 | 1 年 | Hunyuan-Pro, Hunyuan-Standard | 128K | 是 | 手机号 + 实名 |
| **讯飞星火** | 注册即领 500 万 tokens | 90 天 | Spark X2 | 32K | 是 | 手机号注册 |
| **Moonshot AI（Kimi）** | 注册即赠约 800 万 tokens | 90 天 | Kimi-K2.5, Kimi-K2-thinking | 262K | 是 | 手机号注册 |

---

## 三、各平台详细信息

### 1. 硅基流动（SiliconFlow / SiliconCloud）

- **免费额度**：新用户 2000 万 tokens（永久有效），完成新手任务可额外获得 1000 万，累计最高 3000 万 tokens
- **推荐模型**：`deepseek-ai/DeepSeek-V3`、`Qwen/Qwen2.5-72B-Instruct`、`THUDM/glm-4-9b-chat`
- **上下文窗口**：32K-128K（视具体模型）
- **API 格式**：全面兼容 OpenAI 格式
- **Base URL**：`https://api.siliconflow.cn/v1`
- **QPS 限制**：基础用户 QPS=5，TPM=100K
- **注册流程**：访问 cloud.siliconflow.cn -> 手机号注册 -> 控制台创建 API Key
- **亮点**：推理速度业内最快之一；聚合多厂商模型，一键切换

### 2. 智谱 AI（BigModel）

- **免费额度**：GLM-4.7-Flash **永久免费、无 Token 上限**（仅限 30 并发）；新用户注册赠送 2000 万 tokens（含 GLM-4.6V 600 万 + GLM-4.5-Air 1200 万 + 200 万通用）
- **推荐模型**：`glm-4-flash`（永久免费首选）、`glm-4.7-flash`、`glm-5-turbo`
- **上下文窗口**：200K（GLM-4.7-Flash）
- **API 格式**：兼容 OpenAI 格式
- **Base URL**：`https://open.bigmodel.cn/api/paas/v4`
- **QPS 限制**：基础用户 QPS=2
- **注册流程**：访问 open.bigmodel.cn -> 手机号注册 -> 实名认证 -> 创建 API Key
- **亮点**：GLM-4.7-Flash 永久免费无上限，中文能力强，代码能力出色

### 3. 阿里云百炼（通义千问）

- **免费额度**：每模型独立 100 万 tokens（90 天有效）；`qwen-turbo` 每月 100 万 tokens **永久免费**
- **推荐模型**：`qwen3.5-turbo`（永久免费）、`qwen3-max`
- **上下文窗口**：32K-128K
- **API 格式**：兼容 OpenAI 格式
- **Base URL**：`https://dashscope.aliyuncs.com/compatible-mode/v1`
- **QPS 限制**：视模型 1-2
- **注册流程**：访问 dashscope.aliyun.com -> 支付宝/手机号注册 -> 实名认证 -> 开通百炼 -> 创建 API Key
- **亮点**：模型覆盖最全（开源+闭源 20+），Qwen 系列中文能力顶级

### 4. DeepSeek

- **免费额度**：注册即送 500 万 tokens（约 30 天有效）
- **推荐模型**：`deepseek-chat`（V3.2）、`deepseek-reasoner`（R1）
- **上下文窗口**：128K（V3.2）；V4 可达 1M
- **API 格式**：兼容 OpenAI 格式
- **Base URL**：`https://api.deepseek.com/v1`
- **QPS 限制**：无严格限制，高峰期可能延迟
- **注册流程**：访问 platform.deepseek.com -> 手机号注册 -> 创建 API Key
- **亮点**：性价比之王，推理能力极强，V4 支持 100 万 token 上下文

### 5. 火山引擎（字节豆包 / 方舟平台）

- **免费额度**：每日 200 万 tokens，凌晨 0 点刷新，不累积
- **推荐模型**：`doubao-seed-2.0-pro`、`doubao-1.5-flash`
- **上下文窗口**：32K-128K
- **API 格式**：兼容 OpenAI 格式
- **Base URL**：`https://ark.cn-beijing.volces.com/api/v1`
- **QPS 限制**：基础用户 QPS=2
- **注册流程**：访问 火山引擎官网 -> 手机号注册 -> 实名认证 -> 进入方舟平台 -> 开通模型 -> 创建 API Key
- **亮点**：每日刷新额度，适合长期持续使用；响应速度快

### 6. 百度千帆

- **免费额度**：ERNIE-Speed、ERNIE-Lite **永久免费**（每日约 500 次调用）
- **推荐模型**：`ernie-speed-128k`、`ernie-lite-8k`
- **上下文窗口**：8K-128K
- **API 格式**：兼容 OpenAI 格式
- **Base URL**：`https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat`
- **注册流程**：访问 百度智能云 -> 注册 -> 开通千帆服务 -> 创建 API Key
- **亮点**：内置百度搜索增强，适合需要实时信息的场景；老牌稳定

### 7. 其他平台

| 平台 | 免费额度 | 推荐模型 | 上下文 | 备注 |
|------|----------|----------|--------|------|
| 腾讯混元 | 100 万 tokens（1 年） | hunyuan-pro | 128K | 多模态能力强 |
| 讯飞星火 | 500 万 tokens（90 天） | spark-x2 | 32K | 数理推理强 |
| Moonshot AI | 800 万 tokens（90 天） | kimi-k2.5 | 262K | 超长上下文标杆 |
| MiniMax | 15 元代金券（2 个月） | minimax-m2.5 | 128K | 语音合成特色 |

---

## 四、推荐方案（Top 2）

### 推荐方案一：智谱 AI -- GLM-4.7-Flash（首选）

**理由**：

1. **永久免费、无 Token 上限** -- 这是所有平台中最慷慨的方案，不存在额度用完的问题
2. **200K 上下文窗口** -- 远超 8K 需求，可以注入更多知识
3. **中文能力出色** -- GLM 系列在中文理解和生成方面表现优秀
4. **OpenAI 兼容** -- 迁移成本极低
5. **30 并发限制** -- 对日调用量 < 50 次的 Demo 阶段完全够用

**接入配置**：

```javascript
const config = {
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  apiKey: process.env.ZHIPU_API_KEY,
  model: 'glm-4-flash',  // 或 'glm-4.7-flash'
};
```

**注册步骤**：
1. 访问 https://open.bigmodel.cn
2. 手机号注册 + 实名认证
3. 进入控制台 -> 创建 API Key
4. 即可开始调用

---

### 推荐方案二：硅基流动 SiliconFlow -- DeepSeek-V3 / Qwen2.5-72B（备选）

**理由**：

1. **3000 万 tokens 永久有效** -- 新用户通过活动可获取大量免费额度
2. **多模型聚合** -- 一个 API Key 可调用 DeepSeek、Qwen、GLM 等多个模型，方便对比效果
3. **推理速度最快** -- 业内公认延迟最低，适合实时应用
4. **OpenAI 兼容** -- 标准格式，切换成本为零
5. **模型选择灵活** -- 如果 GLM 效果不理想，可无缝切换到 DeepSeek 或 Qwen

**接入配置**：

```javascript
const config = {
  baseURL: 'https://api.siliconflow.cn/v1',
  apiKey: process.env.SILICONFLOW_API_KEY,
  model: 'deepseek-ai/DeepSeek-V3',  // 或 'Qwen/Qwen2.5-72B-Instruct'
};
```

**注册步骤**：
1. 访问 https://cloud.siliconflow.cn
2. 手机号注册
3. 控制台 -> API Keys -> 创建新 Key
4. 完成新手任务获取额外 1000 万 tokens

---

## 五、兜底方案

如果前两个方案出现问题，按以下优先级切换：

| 优先级 | 平台 | 模型 | 切换原因 |
|--------|------|------|----------|
| 3 | 阿里云百炼 | qwen3.5-turbo | 每月 100 万永久免费，Qwen 中文能力顶级 |
| 4 | 火山引擎 | doubao-seed-2.0-pro | 每日 200 万 tokens，永不耗尽 |
| 5 | DeepSeek | deepseek-chat | 500 万 tokens 足够数月使用 |

---

## 六、成本估算

以 Demo 阶段日调用量 50 次、每次约 5K tokens（输入 4K + 输出 1K）计算：

| 指标 | 数值 |
|------|------|
| 日消耗 tokens | ~250K |
| 月消耗 tokens | ~7.5M |
| 智谱 GLM-4-Flash | 永久免费，无上限 -- **0 元** |
| 硅基流动 3000 万 tokens | 可用约 4 个月 -- **0 元** |
| 阿里云 Qwen-Turbo | 每月 100 万免费，超出后极低价（约 0.8 元/百万 tokens） |

**结论**：Demo 阶段完全可以实现零成本运行。

---

## 七、统一接入建议

由于所有推荐平台均兼容 OpenAI API 格式，建议在项目中封装统一的 LLM 调用层：

```javascript
// llm-client.js
const OpenAI = require('openai');

function createClient(provider) {
  const configs = {
    zhipu: {
      baseURL: 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: process.env.ZHIPU_API_KEY,
      model: 'glm-4-flash',
    },
    siliconflow: {
      baseURL: 'https://api.siliconflow.cn/v1',
      apiKey: process.env.SILICONFLOW_API_KEY,
      model: 'deepseek-ai/DeepSeek-V3',
    },
    dashscope: {
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: process.env.DASHSCOPE_API_KEY,
      model: 'qwen3.5-turbo',
    },
  };

  const cfg = configs[provider];
  return new OpenAI({ baseURL: cfg.baseURL, apiKey: cfg.apiKey });
}
```

通过环境变量 `LLM_PROVIDER=zhpu|siliconflow|dashscope` 即可一键切换，无需修改业务代码。
