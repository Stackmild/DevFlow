# Web App Architect — Workflow Steps (G Detail)

> 外置自 `skills-source/web-app-architect/SKILL.md` §G。
> 主 SKILL.md 只保留步骤标题与输出名称，详细展开在本文件。

---

## Step 1. 识别约束与目标

先提炼以下约束；若缺失，则做保守假设并显式标注：

- 用户是谁（内部/外部、多少人、什么角色）
- 产品目标是什么（效率工具、工作流、分析平台、AI 协作平台）
- 主要页面类型有哪些
- 核心实体有哪些
- 数据从哪里来（手填、数据库、第三方 API、文件导入、AI 抽取）
- 权限模型是否只有登录鉴权，还是有角色/可编辑范围差异
- 是否需要实时刷新、离线、后台任务、审批流、导出、文件上传
- 团队规模与技术能力
- 未来 6–12 个月最可能发生的变化是什么

**输出**：约束与假设清单

---

## Step 2. 选择应用拓扑

在以下选项中做判断：

- 单体单应用（small monolith）
- **模块化单体（默认）**
- 单体 + 独立后台任务/worker
- 单体 + 少量拆出的高负载服务
- 多服务架构
- 单体 + 独立 BFF

判断时必须回答：

- 我们到底有多少独立团队/独立发布需求？
- 是否真的存在不同客户端形态？
- 哪些边界是业务边界，哪些只是代码量变大？
- 现在拆服务，能带来什么明确收益？
- 增加的复杂度是否值得？

**输出**：拓扑选择 + 不选其他方案的理由

---

## Step 3. 划分业务模块与边界

按业务能力而不是按页面名称划分模块，例如：

- Auth / Session
- Workspace / Project
- Todo / Task
- Monitoring / Alerts
- Review Queue
- Reports
- Settings / Admin
- AI Assist / Evidence / Suggestions

每个模块都要说明：

- 职责
- 关键实体（候选）
- 对外暴露的能力
- 依赖哪些其他模块
- 哪些共享能力应下沉到平台层，哪些不该共享

**输出**：模块地图（Module Map）

---

## Step 4. 设计路由与页面模式

先定义页面类型，再映射具体页面：

| 页面模式 | 典型用途 | 固定要素 |
|---|---|---|
| Dashboard | 总览、异常、摘要 | 关键指标、最近变化、快捷入口 |
| List | 查询、筛选、批量操作 | 筛选栏、表格/卡片、分页、批量动作 |
| Detail | 单实体查看 | 标题区、状态区、分栏信息、关联记录 |
| Edit/Create | 数据录入与修改 | 表单区、校验、草稿/提交、错误提示 |
| Review | 人工审核 / AI 结果确认 | 原始证据、结构化结果、差异、高亮、操作栏 |
| Settings | 配置与规则管理 | 配置分组、说明、权限、保存反馈 |

**输出**：路由树 + 页面模式映射表

---

## Step 5. 定义数据/API 骨架（不是最终 schema）

对核心实体给出：

- 实体名与业务含义
- 主键/外键是否存在
- 生命周期状态是否存在
- 页面会用到哪些关键读取面
- 是否存在导入 / 审核 / publish 链路

API 骨架层面必须输出：

- Resource / action 的初步边界
- 哪些页面需要聚合 view model
- 哪些能力适合独立 query endpoint
- 哪些能力必须交给 `backend-data-api` 进一步细化成正式契约

**输出**：候选实体表 + API 面草案

---

## Step 6. 定义渲染与数据获取策略

对每类页面明确：

- server fetch / route loader / client fetch 谁负责
- 是否预取
- 是否并行请求
- 是否需要 streaming
- 是否需要 skeleton / partial loading
- 是否允许 stale-while-revalidate
- 哪些数据必须实时新鲜，哪些可以接受缓存

默认规则：

- **重数据、首屏关键、可服务端获取的数据，优先服务端或路由级获取**
- 客户端组件里的数据获取主要用于：
  - 用户驱动的后续查询
  - 高频交互后的局部刷新
  - 仅客户端上下文才可得的数据
- 不把"首屏核心数据 useEffect 拉取"当作默认模式

**输出**：按路由的渲染/数据获取矩阵

---

## Step 7. 定义状态边界

对每类状态分类：

| 状态类型 | 例子 | 应放位置 |
|---|---|---|
| Local UI state | 弹窗开关、hover、当前 tab | 组件本地 |
| Screen state | 多筛选器、表单草稿、复杂交互流程 | 页面级 / reducer |
| Shared client state | 当前 workspace、跨页面轻量会话态 | 受控共享状态 |
| Server state | 列表数据、详情数据、统计数据 | 查询层 / 数据缓存层 |

必须显式指出：

- 哪些状态不能重复存
- 哪些状态是 derived state，不应单独落库或入 store
- 哪些变化走 optimistic update，哪些必须以服务端返回为准

**输出**：状态归属表

---

## Step 8. 设计目录结构与代码边界

目录结构应至少体现：

- app/routes 层
- features/modules 层
- shared/ui 层
- shared/lib 层
- data/api 层
- domain / service / model 层（按需要）

如果是 React / Next / Router 体系，应明确：

- 路由目录与业务模块如何配合
- server-only 代码与 client 代码如何隔离
- 页面级 loader / action / mutation 放在哪里
- 哪些组件是 shared ui，哪些只属于 feature

**输出**：推荐目录结构 + 命名规范

---

## Step 9. 记录关键决策（ADR）

至少记录以下 ADR：

1. 为什么选当前框架/路由体系
2. 为什么选当前应用拓扑
3. 为什么采用当前渲染策略
4. 为什么采用当前状态管理方案
5. 为什么某些能力不提前拆服务 / 不做 BFF / 不做 micro-frontend

ADR 必须包含：

- Context
- Decision
- Consequences
- Rejected alternatives
- Review trigger（什么情况下重新评估）

**输出**：ADR 列表

---

## Step 10. 给出 phased architecture plan

不要只给理想终局，要给分阶段建议：

- **Phase 1**：最小但不乱的骨架
- **Phase 2**：随着模块增加需要抽象的点
- **Phase 3**：用户量/复杂度上来后才值得引入的能力

**输出**：分阶段演进路线图
