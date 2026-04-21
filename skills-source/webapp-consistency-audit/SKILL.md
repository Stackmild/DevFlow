---
name: webapp-consistency-audit
description: 面向内部 Web App / Dashboard / Workspace / AI-native 工具的代码逻辑、数据 contract、页面行为与 UI 一致性审计 Skill。适用于飞书妙搭、Cowork、自研前后端仓库等多种开发方式。优先通过 repo recon、静态分析、接口契约核对、数据完整度检查、persona 差异审计、组件/页面一致性审计、关键路径测试与视觉回归，发现那些本应在上线前就拦住的问题，并输出证据化问题清单、修复顺序与长期防线建议。
triggers:
  - web app 测试
  - 前端 QA
  - 代码逻辑冲突检测
  - 逻辑不一致排查
  - 页面元素一致性
  - UI 一致性检测
  - 设计一致性审计
  - visual regression
  - design token audit
  - 导航页面不一致
  - spacing font audit
  - 前端设计走样
  - contract audit
  - dashboard bug 排查
  - 列表详情不一致
  - 数据字段完整度检查
  - persona 差异排查
  - cowork code review
  - 飞书妙搭 审计
---

# WebApp 代码逻辑 / 数据 Contract / 页面一致性审计 Skill

## B. Skill 目标

本 Skill 审计以下四大类问题，并把问题落到可执行修复上：

| 类型 | 典型问题 |
|---|---|
| **1. 代码逻辑** | 业务规则多处定义且冲突；条件分支/权限/状态互相打架；同一概念命名/枚举/校验不一致；页面正确渲染了错误的数据前提 |
| **2. Contract/数据** | 前后端 route/query/response shape 不一致；字段名漂移（`items`/`records` 等）；sync/init/backfill 未执行掩盖数据问题；不同用户项目子集字段完整度差异未识别 |
| **3. 页面与设计一致性** | 同级页面边距/字号/组件密度不一致；design token 大量硬编码；跨区域视觉割裂（无 tone 宣言时降级 P2）；受限容器（<200px）文字溢出未处理（P1） |
| **4. 用户视角/Persona** | owner 正常但业务同事异常；同页面不同用户的项目子集/状态对象/聚合结果差异巨大；dashboard 统计依赖 state/init/backfill 而非纯前端展示 |

**审计目标（按序）**：
1. 确认系统是否有单一事实来源
2. 定位逻辑冲突与 contract 断裂在哪一层
3. 明确区分：代码 bug、数据缺值、同步缺口、用户视角差异
4. 输出可执行、可排序、可复验的修复方案

---

## C. 适用场景

适用于：

- React / Next.js / TypeScript Web App
- 其他现代前端项目（Vue / Svelte / Nuxt / Remix 等）
- 内部 Dashboard / SaaS / Workspace / AI App / 数据型应用
- 产品进入"越做越乱、页面越来越不像一个系统"的阶段
- 团队希望建立"回归检测"和"上线前拦截"，而不是一次次人工救火
- 使用飞书妙搭生成页面和逻辑，但也会在 Cowork / 自研仓库中补后端、查接口、查数据表、收口 contract
- 系统依赖 sync、state 初始化、backfill、聚合字段、用户项目子集动态计算

---

## D. 不负责的事项

本 Skill **不**负责：

- 凭主观审美大改 UI 风格
- 不看代码就直接给出设计建议
- 只根据截图下结论，不核对实现层来源
- 只跑测试不做根因分析
- 把所有差异都判成 bug（允许业务合理例外）
- 单独完成复杂架构设计或数据库建模
- 替代发布管理与回滚策略设计（那是 `release-and-change-manager` 的职责）

> **先确认差异是否有意设计，再判定是否属于不一致；先确认是代码问题还是数据前提问题，再决定修法。**

---

## E. 核心原则

1. **先静态约束，后动态测试**：先看 lint/类型/schema/路由/DTO/token；能在静态层抓住的问题不应等到浏览器里才发现。
2. **优先检查单一事实来源**：高频不一致通常因 token 无统一来源、route/menu config 分裂、API schema 与 form schema 分裂、状态枚举多文件重复定义。
3. **先区分代码 bug 与数据前提问题**：字段没 sync、state 没初始化、backfill 没执行、用户子集字段完整度低、空值 fallback 掩盖根因 → 这些不是前端 bug。
4. **用户视角差异是一级风险**：默认必须考虑 owner/管理员、普通成员、新同步/弱数据用户、不同项目子集用户；"我这里正常"不能作为系统正确的证明。
5. **组件一致性优先于页面一致性**：页面一致性最好从组件层解决，而不是在页面层到处补丁。
6. **一致性检测必须证据化**：所有问题必须指向具体文件/组件/route/selector/token/API/job，不能只说"看起来不统一"。
7. **无障碍是 UI 一致性的一部分**：标题/表单标签/对话框命名/对比度/焦点态，既是 a11y 问题，也是产品一致性问题。

---

## F. 新增默认视角：飞书妙搭 + Cowork 双语境

本 Skill 默认同时适配两类开发现实：

### 1. 飞书妙搭语境
常见风险：
- 页面快速搭出来，但后端/数据 contract 未收口
- 配置/插件/AI 节点能跑，但真实字段依赖不明确
- 新页面生成快，统一 layout / token / page shell 漂移快
- Prompt / AI 插件输入输出契约与页面字段消费脱节

### 2. Cowork / 自研仓库语境
常见风险：
- controller / service / DTO / shared types 不一致
- route alias、response shape、字段名改了但页面没跟
- sync / backfill / state init 作业未纳入日常检查
- 同一字段在数据库中有值，但 API / 聚合层没返回
- dashboard / 列表 / 详情依赖不同数据对象，导致同页不同步

### 默认要求
无论在哪个语境下，都要同时回答：
- 页面实际依赖哪些接口和字段
- 这些字段来自哪张表/哪条聚合路径
- 这些字段在真实数据中完整度如何
- 不同 persona 下拿到的数据是否一致且合理

---

## G. 推荐默认技术栈（项目已有方案则优先沿用）

| 层 | 工具 |
|---|---|
| 代码约束 | TypeScript strict · ESLint · eslint-plugin-react-hooks · Zod/schema · Stylelint · shared API/domain types |
| 测试 | Testing Library · Playwright · Storybook |
| 设计系统 | Design Tokens · Layout primitives · Style Dictionary 或同类 token pipeline |
| Contract/数据 | DTO/schema/shared type 显式化 · route contract map · data-readiness checks · persona matrix validation |

---

## H. 输入要求

### 必需输入
1. 代码仓库或主要代码片段
2. 运行方式（如 `npm run dev` / `pnpm dev`）
3. 当前技术栈（若可自动识别则无需手动提供）

### 强烈建议提供
1. 页面清单 / 路由结构
2. 导航分组说明（哪些属于同级页面）
3. 设计规范、Figma、Storybook、token 文件（任一即可）
4. 已知问题样例
5. 若是数据型应用：关键表结构/字段说明、sync/init/backfill 现状、关键 persona 名单、典型记录样本

### 若没有这些输入
Skill 仍可执行，但必须明确标注：哪些是强证据、哪些是高概率推断、哪些因缺设计/数据基线无法最终判断。

---

## I. 执行流程

### Step 0. 项目侦察（Repo Recon）
先快速建立地图，不直接开改。识别：package manager、framework、TypeScript/ESLint/Stylelint/Playwright/Storybook 现状、样式方案（Tailwind/CSS Modules/SCSS）、token/theme/UI primitives 文件、route 定义位置、nav/sidebar 来源、API schema/form schema/domain types 位置、controller/service/DTO 分层、sync/init-state/backfill/worker 逻辑位置、Dashboard/列表/详情数据来源。**输出**：app 结构、测试基础设施、设计系统现状、contract 真相来源、数据作业位置、高风险 persona 差异点。

---

### Step 1. 静态一致性审计（Static Contract Audit）
先找不运行页面就能确认的问题：

- **1.1 类型与 schema**：tsconfig strict 是否启用、API response/前端 type/表单 schema 三套是否不一致、大量 `any`/`unknown`、enum/status 重复定义值不一致
- **1.2 前端逻辑规则**：Hook 规则违反、effect 依赖遗漏导致状态陈旧、loading/empty/error/success 互斥不清、feature flag/权限判断在 route/menu/component 三处各写
- **1.3 Route/API/DTO 契约**：页面实际请求 route 是否存在、query 参数是否被支持、alias 路由是否只补一半、response shape 与前端读取是否一致、`items`/`records` 等字段漂移
- **1.4 样式与 token**：大量硬编码颜色/字号/间距/圆角/阴影、deprecated token、绕开 primitives 的自定义 CSS
- **1.5 导航与信息架构**：sidebar/tabs/route title/page heading 是否同源、菜单可见性与页面可访问性是否一致、breadcrumb/返回逻辑/导航语义冲突

---

### Step 2. 数据前提与字段完整度审计
识别"代码没坏，但数据前提没准备好"的问题：

- **2.1 数据作业识别**：是否依赖 sync / init-state / backfill / seed / 外部 ID 映射 / 聚合字段生成
- **2.2 关键字段完整度**：对 dashboard/列表/详情依赖的分组字段/摘要字段/状态字段/外部主键做检查，输出：总记录数、非空数量、空值数量、非空率、是否达发布水平
- **2.3 空值 fallback 合理性**：区分合理 fallback、数据未准备好但页面能活、页面逻辑掩盖真实问题（如 `未分类`/`暂无数据`/默认 badge）

---

### Step 3. Persona / 用户视角审计
拦住"我这边正常，同事那边全坏"。默认三类 persona：① Owner/管理者/全量视角；② 普通业务用户；③ 弱数据用户（新同步/字段缺失/state 未补齐）。
对每个 persona 至少检查：登录、Dashboard/首页、列表页、详情页、关键字段、关键动作。
重点比较：同一关键字段在各 persona 项目子集上的完整度、同页面 API 返回 shape 是否一致、是否存在 payload/state/aggregation 异常。

---

### Step 4. 现有测试资产盘点
先尊重现有工程资产，不要一上来重写测试。读取现有 unit/integration/E2E/visual tests，判断覆盖实现细节还是用户行为，标记 brittle tests/snapshot 滥用/无断言测试。**输出**：可复用清单、薄弱区清单、误导性测试清单。

---

### Step 5. 最小高信号测试生成（Only If Needed）
若现有测试不足，再补最小一组高价值测试：

- **逻辑测试优先**：列表→详情主链路、Dashboard 聚合与 fallback 逻辑、route/query/response shape 契约、权限与 persona 分支、关键表单校验、状态切换与空/错/加载分支
- **UI 一致性测试优先**：同级页面 header 区、列表页工具栏/filter bar/table 容器、表单标签/输入框/错误提示/按钮层级、卡片容器/间距/标题、弹窗 header-footer 结构
- **写法要求**：用户视角查询与断言、避免只断言 className/内部 state、补 persona matrix 与 data-readiness smoke

---

### Step 6. 组件一致性审计
对以下组件做横向盘点：Button、Input/Select/Textarea/Checkbox/Radio/Switch、Modal/Dialog/Drawer/Sheet、PageHeader/SectionHeader、Card/Panel/Widget、Table/List/EmptyState/LoadingState/ErrorState、Tabs/Breadcrumb/Pagination、Badge/Tag/StatusChip/Toast。
每个组件检查：variant 过多或命名混乱、同 variant 在不同地方视觉不一致、尺寸体系、交互态是否齐全且一致、是否使用 token、"同名不同样"/"同样不同名"。

---

### Step 7. 同级页面一致性审计（Sibling Page Audit）
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

### Step 8. 视觉回归检测
顺序：① Storybook 组件级视觉回归 → ② 关键页面 Playwright 截图对比 → ③ 跨浏览器 smoke。
原则：先组件后页面、截图必须有稳定基线、只对关键页面/关键状态做对比、将视觉差异与 root cause 对上（token 漂移/布局漂移/文案换行/组件替换/数据态不同等）。

---

### Step 9. 无障碍与语义一致性审计
必须检查：页面是否有清晰 title、dialog/drawer 是否有可感知名称、form element 是否有 visible label、icon-only button 是否有可访问名称、tab/nav/table/list 是否有合理语义、焦点态是否可见、对比度是否足够。

---

## J. 重点检测规则（可直接作为 checklist）

### 1. 代码逻辑 / Contract 类

| Rule | 要点 |
|---|---|
| L1 | 同一业务概念（status/role/variant/sourceType 等）不得多处定义 |
| L2 | route / menu title / page heading / breadcrumb 尽量同源，分散写极易漂移 |
| L3 | API schema、frontend type、form validation 必须可相互映射 |
| L4 | 页面依赖的接口 contract 必须显式核对（path/method/query/body/response 字段/alias/shared types）|
| L5 | loading / empty / error / success 必须互斥清晰；空数据与接口失败禁止展示同一 UI |
| L6 | feature flag 与权限逻辑必须可追踪，禁止在多处各写一套判断 |
| L7 | 数据作业依赖（sync/init-state/backfill）必须显式点名，不能假定数据已在 |
| L8 | Dashboard / 列表聚合字段（城市/上次拜访/状态等）必须检查字段完整度 |
| L9 | Persona 差异必须区分原因：代码 bug / 数据缺值 / 状态未初始化 / 用户视角异常 |

### 2. 页面元素一致性类

| Rule | 要点 |
|---|---|
| U1 | 同级页面共享容器规范 |
| U2 | 同类页面共享标题系统 |
| U3 | 主操作位置与按钮层级稳定 |
| U4 | 同类组件状态一致 |
| U5 | 空态·错态·加载态必须有统一语法 |
| U6 | 图标尺寸·文字尺寸·点击区域统一 |
| U7 | 表单必须一致处理 label / help / error |
| U8 | 表格与卡片密度体系稳定 |

---

## K. 输出格式（Output Contract）

每次执行本 Skill，输出必须包含：

## 1. 项目现状概览
- 技术栈
- 已有测试与规则基础设施
- 设计系统成熟度判断
- contract / DTO / schema 单一事实来源判断
- 数据作业现状（sync / init-state / backfill）

## 2. 高优先级问题表
建议表头：

| Severity | 类型 | 位置 | 现象 | 证据 | 根因判断 | 修复建议 |
|---|---|---|---|---|---|---|
| P0/P1/P2/P3 | Logic / Contract / Data / UI / A11y / Test Infra | 文件/页面/组件/API/表 | 具体问题 | 路径/selector/query/字段/截图 | 单一事实来源缺失 / contract drift / 数据缺值 / state 未初始化 / token 漂移 | 明确动作 |

## 3. 同级页面一致性矩阵
| 页面组 | 页面 | Container | 标题 | 操作区 | 数据区 | 状态页 | 结论 |

## 4. 数据完整度 / Persona 矩阵
| Persona | 项目数 | 关键字段 | 非空率 | Dashboard | List | Detail | 结论 |

## 5. 根因归并
按 root cause 聚合：
- token 体系缺失
- layout primitive 缺失
- route/meta 分裂
- 状态定义分裂
- 组件库失控
- a11y 规范未固化
- API / DTO contract drift
- sync / init / backfill 缺口
- persona 子集字段完整度差异

## 6. 修复优先级建议
按以下顺序：
1. 会导致真实逻辑错误 / 数据误读的问题
2. contract 漂移与接口不匹配
3. 数据作业缺口与字段完整度问题
4. 系统性 UI 漂移
5. 单页局部视觉问题

## 7. 建议新增的自动化防线
必须附：
- 应新增哪些 lint 规则
- 应新增哪些 schema / contract 校验
- 应新增哪些 data-readiness checks
- 应新增哪些 component tests
- 应新增哪些 Playwright tests
- 应新增哪些 persona matrix smoke
- 应新增哪些 Storybook stories

---

## L. 质量标准（Quality Bar）

### 必须做到
- 区分事实 / 推断 / 建议
- 问题尽量落到文件、组件、selector、API、字段或 job
- 明确哪些是系统性问题，哪些是单点问题
- 对设计差异给出"是否可能是有意设计"的判断
- 对数据异常给出"代码坏了还是数据没准备好"的判断

### 不能这样做
- "这里感觉不太统一"
- "建议优化一下视觉"
- "建议加一些测试"
- "可能是缓存问题"
- "应该是字段没回来"

必须具体到：哪个 contract 断了、哪个字段缺了、哪个 persona 异常、根因在哪层、如何验证修复完成。

---

## M. 默认执行策略

| 场景 | 优先顺序 |
|---|---|
| **已有较完整工程化基础** | 读现有规则 → 复用现有测试 → 补缺口 → 输出治理建议 |
| **几乎没有测试与设计系统** | 建页面组与组件清单 → 找最高价值 contract/data/logic 问题（5-10 个）→ 找最高价值 UI 不一致（5-10 个）→ 补最小自动化防线 → 再谈全面治理 |
| **依赖大量真实数据** | 建字段完整度基线 → 建 persona matrix → 建 dashboard/list/detail 主链路 smoke → 建 sync/init/backfill readiness checklist |
| **飞书妙搭 + Cowork 混合** | 核对页面依赖接口与字段 → 核对 controller/service/DTO/shared type → 核对数据库字段与数据作业 → 做页面与组件一致性审计 |

> **先修 contract 与数据前提，再修页面末梢。**

---

## N. 建议优先检查的文件 / 模块

通常优先看：
- package.json
- tsconfig.json
- ESLint / Stylelint 配置
- token/theme 文件
- UI primitives / shared components
- layout/page shell
- route config / nav config / breadcrumb config
- form schemas
- API client types / domain models
- controller / service / DTO
- shared/api.interface
- sync / init-state / backfill 服务
- Playwright / Storybook 配置

---

## O. Skill 执行时的回答风格

输出应当：
- 直接
- 结构化
- 基于证据
- 先给结论，再给证据，再给修法
- 对不确定项明确标注不确定性

不要：
- 大段空泛教学
- 只罗列工具名
- 只做页面层吐槽
- 在没有证据时断言"这是 bug"
