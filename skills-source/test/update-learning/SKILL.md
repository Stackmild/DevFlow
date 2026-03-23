# AI Coding 学习库更新

> 用户通过 `@update-learning` 触发，一次完成：搜索 → 摘要生成 → 写入 Supabase 全流程。

## 项目目录

`/Users/yfguo/Documents/资管文件/AI Incorporation/Development & Coding Workflow/projects/news-digest/`

## 内容定向（严格遵守）

- **受众**：PE/资管行业从业者，非技术背景，关注企业内 AI 应用
- **收录**：AI Coding 实践案例、企业 AI 工作流改造、非技术人员用 AI 工具的真实经验
- **排除**：学术论文、纯编程教程、API 文档、arXiv 预印本
- **时间范围**：2025-09-30 之后发布的内容
- **语言**：海外英文为主，中文为辅
- **铁律**：禁止编造任何 URL 或内容——只收录真实搜索到的文章

## 执行流程

### Step 1：查询上次更新时间

```bash
cd "/Users/yfguo/Documents/资管文件/AI Incorporation/Development & Coding Workflow/projects/news-digest" && node -e "
import { supabase } from './src/supabase-client.mjs';
const { data } = await supabase.from('kv_store').select('value').eq('key', 'ai_coding.last_updated').maybeSingle();
console.log(data?.value ? 'Last updated: ' + data.value : 'No previous update');
"
```

记住返回的时间，只搜索此后的新内容。

### Step 2：搜索 4 个主题

对以下 4 个主题，分别调用 `mcp__hong_internal__search_external_data` 搜索：

| 主题 | topic_group | 搜索词（每个主题搜 2 次） |
|------|------------|------------------------|
| 用 Claude/Cursor 做什么 | `with_claude_cursor` | `"Claude Code" workflow productivity 2026` / `Cursor AI coding real experience` |
| 谁在改造什么工作流 | `workflow_transformation` | `AI workflow transformation enterprise 2026` / `AI replacing manual work finance consulting` |
| 企业 AI 化踩坑 | `enterprise_pitfalls` | `enterprise AI adoption mistakes lessons 2026` / `AI tool rollout failure company` |
| 可借鉴的成功案例 | `success_cases` | `PE firm AI tools results productivity` / `built with AI case study non-technical 2026` |

从搜索结果中筛选符合内容定向的文章（最多 20 篇总计）。

### Step 3：质量过滤

对每篇候选文章确认：
- URL 来自搜索结果（不是编造的）
- 发布时间在 2025-09-30 之后
- 有实际案例、数字或具体场景（不是泛泛介绍）
- 标题不含 "tutorial"、"step by step"、"beginner guide"

### Step 4：为每篇文章生成完整摘要

**每篇文章必须同时生成以下 3 个字段**：

- **summary**（100-150 字中文短摘要）：聚焦 PE/资管用户价值点，概括核心发现
- **summary_long**（300-500 字中文深度解读）：
  - 包含文章的核心论点和关键数据
  - 提炼对 PE/资管行业的具体启示
  - 如有案例，详细描述案例背景和结果
  - 语言平实，非技术读者能读懂
- **applicability**（20-40 字）：一句话说明为什么适合 PE/资管从业者看

### Step 5：写入 Supabase

将所有文章构造为 JSON 数组，通过以下脚本一次性写入：

```bash
cd "/Users/yfguo/Documents/资管文件/AI Incorporation/Development & Coding Workflow/projects/news-digest" && node -e "
import { supabase } from './src/supabase-client.mjs';

const articles = [
  // ← 在此插入 Step 4 生成的文章 JSON 数组
  // 每篇文章格式：
  // {
  //   title: '文章标题',
  //   source: '来源',
  //   url: '真实URL',
  //   published_at: '2026-03-23T00:00:00Z',
  //   topic_group: 'with_claude_cursor',
  //   summary: '短摘要...',
  //   summary_long: '深度解读...',
  //   applicability: '适用性说明'
  // }
];

const { data, error } = await supabase
  .from('ai_coding_articles')
  .upsert(articles, { onConflict: 'url', ignoreDuplicates: true })
  .select('id');

if (error) {
  console.error('写入失败:', error.message);
} else {
  console.log('写入成功：' + (data?.length ?? 0) + ' 篇新文章');
  // 更新 last_updated
  const now = new Date().toISOString();
  await supabase.from('kv_store').upsert(
    { key: 'ai_coding.last_updated', value: now, updated_at: now },
    { onConflict: 'key' }
  );
  console.log('ai_coding.last_updated 已更新为 ' + now);
}
"
```

### Step 6：输出结果

```
AI Coding 学习库更新完成 · {日期}

新增文章：N 篇
- with_claude_cursor: X 篇
- workflow_transformation: X 篇
- enterprise_pitfalls: X 篇
- success_cases: X 篇

最值得关注的 3 篇：
1. {标题} — {一句话理由}
2. {标题} — {一句话理由}
3. {标题} — {一句话理由}

所有文章均包含 AI 深度摘要（summary_long），可在学习库 Tab 中点击「AI 摘要」查看。
```

## 注意事项

- summary_long 必须在 Step 4 一步生成，不要分两步（先插入再补摘要）
- 写入使用 `upsert on url, ignoreDuplicates: true`：已存在的 URL 会被跳过
- 脚本自动读取 `.env` 中的 Supabase 凭证，无需手动传入
- 如果搜索结果不足，宁可只写入 5 篇高质量文章，不要凑数
