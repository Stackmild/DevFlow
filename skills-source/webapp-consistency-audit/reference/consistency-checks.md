# WebApp Consistency Audit — Execution Steps (I Detail)

> 外置自 `SKILL.md` §I / §F / §M / §N。
> 主 SKILL.md 只保留步骤标题与输出名称，详细展开在本文件。

---

## 飞书妙搭 + Cowork 双语境

### 飞书妙搭语境常见风险

- 页面快速搭出来，但后端/数据 contract 未收口
- 配置/插件/AI 节点能跑，但真实字段依赖不明确
- 新页面生成快，统一 layout / token / page shell 漂移快
- Prompt / AI 插件输入输出契约与页面字段消费脱节

### Cowork / 自研仓库语境常见风险

- controller / service / DTO / shared types 不一致
- route alias、response shape、字段名改了但页面没跟
- sync / backfill / state init 作业未纳入日常检查
- 同一字段在数据库中有值，但 API / 聚合层没返回
- dashboard / 列表 / 详情依赖不同数据对象，导致同页不同步

### 默认要求

无论在哪个语境下，都要同时回答：页面实际依赖哪些接口和字段、这些字段来自哪张表/哪条聚合路径、这些字段在真实数据中完整度如何、不同 persona 下拿到的数据是否一致且合理。

---

## Step 0. 项目侦察（Repo Recon）

先快速建立地图，不直接开改。识别：package manager、framework、TypeScript/ESLint/Stylelint/Playwright/Storybook 现状、样式方案（Tailwind/CSS Modules/SCSS）、token/theme/UI primitives 文件、route 定义位置、nav/sidebar 来源、API schema/form schema/domain types 位置、controller/service/DTO 分层、sync/init-state/backfill/worker 逻辑位置、Dashboard/列表/详情数据来源。

**输出**：app 结构、测试基础设施、设计系统现状、contract 真相来源、数据作业位置、高风险 persona 差异点。

---

## Step 1. 静态一致性审计（Static Contract Audit）

先找不运行页面就能确认的问题：

- **1.1 类型与 schema**：tsconfig strict 是否启用、API response/前端 type/表单 schema 三套是否不一致、大量 `any`/`unknown`、enum/status 重复定义值不一致
- **1.2 前端逻辑规则**：Hook 规则违反、effect 依赖遗漏导致状态陈旧、loading/empty/error/success 互斥不清、feature flag/权限判断在 route/menu/component 三处各写
- **1.3 Route/API/DTO 契约**：页面实际请求 route 是否存在、query 参数是否被支持、alias 路由是否只补一半、response shape 与前端读取是否一致、`items`/`records` 等字段漂移
- **1.4 样式与 token**：大量硬编码颜色/字号/间距/圆角/阴影、deprecated token、绕开 primitives 的自定义 CSS
- **1.5 导航与信息架构**：sidebar/tabs/route title/page heading 是否同源、菜单可见性与页面可访问性是否一致、breadcrumb/返回逻辑/导航语义冲突

---

## Step 2. 数据前提与字段完整度审计

识别"代码没坏，但数据前提没准备好"的问题：

- **2.1 数据作业识别**：是否依赖 sync / init-state / backfill / seed / 外部 ID 映射 / 聚合字段生成
- **2.2 关键字段完整度**：对 dashboard/列表/详情依赖的分组字段/摘要字段/状态字段/外部主键做检查，输出：总记录数、非空数量、空值数量、非空率、是否达发布水平
- **2.3 空值 fallback 合理性**：区分合理 fallback、数据未准备好但页面能活、页面逻辑掩盖真实问题（如 `未分类`/`暂无数据`/默认 badge）

---

## Step 3. Persona / 用户视角审计

拦住"我这边正常，同事那边全坏"。默认三类 persona：① Owner/管理者/全量视角；② 普通业务用户；③ 弱数据用户（新同步/字段缺失/state 未补齐）。

对每个 persona 至少检查：登录、Dashboard/首页、列表页、详情页、关键字段、关键动作。

重点比较：同一关键字段在各 persona 项目子集上的完整度、同页面 API 返回 shape 是否一致、是否存在 payload/state/aggregation 异常。

---

## Step 4. 现有测试资产盘点

先尊重现有工程资产，不要一上来重写测试。读取现有 unit/integration/E2E/visual tests，判断覆盖实现细节还是用户行为，标记 brittle tests/snapshot 滥用/无断言测试。

**输出**：可复用清单、薄弱区清单、误导性测试清单。

---

## Step 5. 最小高信号测试生成（Only If Needed）

若现有测试不足，再补最小一组高价值测试：

- **逻辑测试优先**：列表→详情主链路、Dashboard 聚合与 fallback 逻辑、route/query/response shape 契约、权限与 persona 分支、关键表单校验、状态切换与空/错/加载分支
- **UI 一致性测试优先**：同级页面 header 区、列表页工具栏/filter bar/table 容器、表单标签/输入框/错误提示/按钮层级、卡片容器/间距/标题、弹窗 header-footer 结构
- **写法要求**：用户视角查询与断言、避免只断言 className/内部 state、补 persona matrix 与 data-readiness smoke

---

## Step 6. 组件一致性审计

对以下组件做横向盘点：Button、Input/Select/Textarea/Checkbox/Radio/Switch、Modal/Dialog/Drawer/Sheet、PageHeader/SectionHeader、Card/Panel/Widget、Table/List/EmptyState/LoadingState/ErrorState、Tabs/Breadcrumb/Pagination、Badge/Tag/StatusChip/Toast。

每个组件检查：variant 过多或命名混乱、同 variant 在不同地方视觉不一致、尺寸体系、交互态是否齐全且一致、是否使用 token、"同名不同样"/"同样不同名"。

---

## Step 7. 同级页面一致性审计（Sibling Page Audit）

建立"同级页面组"，对每组按以下维度对比：

| 维度 | 检查项 |
|---|---|
| 布局与容器 | 最大宽度 / 左右 padding / 顶部留白 / 区块间距 / 栅格列距 |
| 标题系统 | 页面标题字号·字重·行高 / 副标题 / section 标题层级 / 与操作区距离 |
| 操作区 | 主按钮位置 / 主次按钮层级 / 筛选栏·搜索框·批量操作一致性 |
| 数据展示 | table header/row 密度 / 卡片 padding·gap·shadow·radius / 数字·状态标签·时间排版 |
| 状态页 | loading skeleton / empty state / error state 统一性；无权限·无数据·过滤为空是否混用 |
| 弹出层 | 标题区样式 / 关闭动作位置 / footer 按钮顺序 / 危险态规则 |

---

## Step 8. 视觉回归检测

顺序：① Storybook 组件级视觉回归 → ② 关键页面 Playwright 截图对比 → ③ 跨浏览器 smoke。

原则：先组件后页面、截图必须有稳定基线、只对关键页面/关键状态做对比、将视觉差异与 root cause 对上（token 漂移/布局漂移/文案换行/组件替换/数据态不同等）。

---

## Step 9. 无障碍与语义一致性审计

必须检查：页面是否有清晰 title、dialog/drawer 是否有可感知名称、form element 是否有 visible label、icon-only button 是否有可访问名称、tab/nav/table/list 是否有合理语义、焦点态是否可见、对比度是否足够。

---

## 默认执行策略

| 场景 | 优先顺序 |
|---|---|
| **已有较完整工程化基础** | 读现有规则 → 复用现有测试 → 补缺口 → 输出治理建议 |
| **几乎没有测试与设计系统** | 建页面组与组件清单 → 找最高价值 contract/data/logic 问题（5-10 个）→ 找最高价值 UI 不一致（5-10 个）→ 补最小自动化防线 → 再谈全面治理 |
| **依赖大量真实数据** | 建字段完整度基线 → 建 persona matrix → 建 dashboard/list/detail 主链路 smoke → 建 sync/init/backfill readiness checklist |
| **飞书妙搭 + Cowork 混合** | 核对页面依赖接口与字段 → 核对 controller/service/DTO/shared type → 核对数据库字段与数据作业 → 做页面与组件一致性审计 |

> **先修 contract 与数据前提，再修页面末梢。**

---

## 建议优先检查的文件 / 模块

通常优先看：package.json、tsconfig.json、ESLint/Stylelint 配置、token/theme 文件、UI primitives/shared components、layout/page shell、route config/nav config/breadcrumb config、form schemas、API client types/domain models、controller/service/DTO、shared/api.interface、sync/init-state/backfill 服务、Playwright/Storybook 配置。
