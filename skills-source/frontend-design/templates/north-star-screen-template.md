# North-Star Screen Spec

> 关键页面的视觉锚点定义。Phase 2 的硬交付物。
> 完整/局部模式下：至少 1 个关键页面必须完成此 spec，否则不得进入 Phase 3。
> 选择标准：最能体现 route 视觉人格、最容易在实现中退化的页面。

---

## {页面名称}

### 1. 页面目标
{用户在这个页面要完成什么——一句话}

### 2. 首屏布局骨架
{文字描述或 ASCII 线框：区域划分、主面板/侧面板/header/footer 关系、比例}

### 3. 第一视觉焦点
{用户进入页面后，视线最先落在哪里？为什么是这里？用什么视觉手段引导（字号/色彩/位置/留白）？}

### 4. 信息层级（从强到弱排列）
1. {最重要的信息} — 视觉表达方式（字号、色彩、位置）
2. {次要信息} — 视觉表达方式
3. {辅助信息} — 视觉表达方式
4. {背景/环境信息} — 视觉表达方式

### 5. 关键交互区域
{哪些区域是可交互的？hover/click 后预期什么视觉反馈？主操作 vs 次操作如何视觉区分？}

### 6. 组件风格差异点（≥2 个）
{这个页面上的组件相比 UI 库默认值，哪些做了路线化定制？}
- 组件 1：{默认值} → {定制后}（理由：与 route 的 {特征} 对齐）
- 组件 2：{默认值} → {定制后}（理由：...）

### 7. Route 在本页面的具体体现（signature element）
{选定的 route 在这个页面上通过什么具体视觉元素体现？}
{例："Editorial Research Workspace 通过大行距阅读区 + 左侧目录导航 + 引用卡片样式体现"}

### 8. 最容易退化为模板的点（≥2 个）
- {位置/组件} — 退化方式 — 防止方式
- {位置/组件} — 退化方式 — 防止方式

### 9. 明确禁止项（≥3 个）
- 禁止：{具体描述}
- 禁止：{具体描述}
- 禁止：{具体描述}

### 10. 实现优先级标注
- **P0（必须还原）**：{列出}
- **P1（可后补）**：{列出}

### 11. Real Content（⚠️ 硬要求）

- **Real headline**: {真实标题文案}
- **Real support text**: {真实说明/描述文案}
- **Real CTA**: {真实行动按钮文案}
- **真实内容模块（≥3 条）**:
  1. {模块名} — {真实内容}
  2. {模块名} — {真实内容}
  3. {模块名} — {真实内容}

> ⚠️ 禁止使用 lorem ipsum、Feature 1/2/3、"Welcome to Dashboard"、generic placeholder copy 作为关键屏内容。
> 违反此项 → 触发 Hard Fail HF-2。

---

## Real vs Placeholder 对比示例

### 示例 1：Dashboard 首屏标题

| | Placeholder（❌ 触发 HF-2） | Real Content（✅） |
|---|---|---|
| Headline | "Welcome to Your Dashboard" | "本周投后异动：3 家公司需要关注" |
| Support text | "Here you can view your data and analytics" | "系统已自动标记收入同比下降 >15% 的公司，请优先查看" |
| CTA | "Get Started" | "查看异动详情" |

### 示例 2：AI Copilot 对话页

| | Placeholder（❌） | Real Content（✅） |
|---|---|---|
| Headline | "AI Assistant" | "分析助手 · 当前关注：新能源赛道 Q3 表现" |
| Suggestion card | "Try asking a question" | "帮我对比宁德时代和比亚迪的毛利率变化趋势" |
| Empty state | "No conversations yet" | "输入公司名称或选择分析模板开始" |

### 示例 3：列表页空态

| | Placeholder（❌） | Real Content（✅） |
|---|---|---|
| Empty illustration text | "No data found" | "还没有添加追踪的公司，从投资组合中选择开始" |
| CTA | "Add Item" | "从投组导入" |
