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

## A. Skill 名称

**WebApp 一致性与 Contract 审计**

---

## B. Skill 目标

本 Skill 用于审计一个 Web App 是否存在以下四大类问题，并把问题落到可执行修复上：

### 1) 代码逻辑类问题
- 业务规则在多个地方重复定义，导致冲突
- 条件分支、权限、导航、feature flag、loading/empty/error 状态互相打架
- 同一概念在不同模块命名、枚举、校验规则不一致
- 页面逻辑正确地"渲染了错误的数据前提"

### 2) Contract / 数据类问题
- 前后端 route、query、payload shape 不一致
- API response 与前端消费字段名不一致（如 `items` / `records`）
- 页面依赖的聚合字段没有返回，或不同用户返回不一致
- sync / init-state / backfill 未执行，导致页面 fallback 掩盖真实数据问题
- 同一张表的同一字段，在不同项目子集上完整度差异巨大，但未被显式识别

### 3) 页面与设计一致性问题
- 同级页面在边距、字号、标题层级、组件密度、按钮层级上不一致
- 相同用途组件出现不同视觉规范
- design token 未被统一使用，存在大量硬编码样式值
- 页面看起来像"一个产品里的多个系统拼起来的"

### 4) 用户视角 / Persona 差异问题
- owner 账号正常，业务同事账号异常
- 同一页面在不同用户下拿到的项目子集、状态对象、聚合结果差异巨大
- 列表页正常但详情页失败
- dashboard 统计正常与否依赖 state/init/backfill，而非单纯前端展示逻辑

本 Skill 的目标不是只报错，而是：

1. **先识别系统里真正的单一事实来源是否存在**
2. **再定位逻辑冲突与 contract 断裂发生在哪一层**
3. **明确区分代码 bug、数据缺值、同步缺口、用户视角差异**
4. **最后输出可执行、可排序、可复验的修复方案**

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

本 Skill 强调：

> **先确认差异是否有意设计，再判定是否属于不一致；先确认是代码问题还是数据前提问题，再决定修法。**

---

## E. 核心原则

### 原则 1：先静态约束，后动态测试
先看 lint / 类型 / schema / 路由 / DTO / token / 配置，再跑页面测试。能在静态层抓住的问题，不应等到浏览器里才发现。

### 原则 2：优先检查单一事实来源
高频不一致通常不是某个页面"手误"，而是因为：
- token 没有统一来源
- route config 与 menu config 分裂
- API schema 与 form schema 分裂
- 状态枚举在多个文件重复定义
- 页面布局规范只存在于脑子里
- 同一业务字段在 sync、DB、API、UI 四层各叫各的名字

### 原则 3：先区分代码 bug 与数据前提问题
很多"页面不对"并不是前端组件坏了，而是：
- 字段没 sync 进库
- state 没初始化
- backfill 没执行
- 用户子集拿到的项目本身字段完整度低
- 空值 fallback 掩盖了根因

### 原则 4：用户视角差异是一级风险
对于内部工具，默认必须考虑：
- owner / 管理员
- 普通成员
- 新同步 / 弱数据用户
- 不同项目子集用户

"我这里正常"不能作为系统正确的证明。

### 原则 5：组件一致性优先于页面一致性
页面一致性最好从组件层解决，而不是在页面层到处补丁。

### 原则 6：一致性检测必须证据化
所有问题尽量指向：
- 具体文件 / 组件 / route / selector
- 具体 token / 样式值 / 文本 / 条件分支
- 具体 API / response key / DB 字段 / job
- 具体 persona / 项目子集 / 页面差异

不能只说"看起来不统一"。

### 原则 7：无障碍是 UI 一致性的一部分
标题、表单标签、对话框命名、对比度、焦点态，既是 accessibility 问题，也是产品一致性问题。

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

## G. 推荐默认技术栈（若项目已有其他方案，则沿用现有方案优先）

### 代码正确性与约束
- TypeScript strict mode
- ESLint
- eslint-plugin-react-hooks
- Zod / 同类 schema 工具
- Stylelint
- shared API/domain types

### 测试层
- Testing Library
- Playwright
- Storybook

### 设计系统层
- Design Tokens
- Layout primitives / page shell / header pattern / form pattern / table pattern
- Style Dictionary 或同类 token pipeline

### 数据与 contract 层
- DTO / schema / shared type 显式化
- route contract map
- data-readiness checks（sync/init/backfill/seed）
- persona matrix validation

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
5. 若是数据型应用，最好提供：
   - 关键表结构或字段说明
   - sync / init / backfill 的现状
   - 关键 persona 名单
   - 典型项目/记录样本

### 若没有这些输入
Skill 仍可执行，但必须明确标注：
- 哪些结论是强证据
- 哪些是高概率推断
- 哪些因缺设计基线或缺数据基线无法最终判断

---

## I. 执行流程

## Step 0. 项目侦察（Repo Recon）
先快速建立地图，不直接开改。

### 要识别的内容
- package manager
- framework
- 是否有 TypeScript、ESLint、Stylelint、Playwright、Vitest/Jest、Storybook
- 是否有 Tailwind / CSS Modules / styled-components / emotion / SCSS
- 是否存在 token 文件、theme 文件、UI primitives、layout primitives
- route 定义位置
- nav / sidebar / tabs / breadcrumbs 来源
- API schema、form schema、domain types 的位置
- controller / service / DTO / shared type 分层
- sync / init-state / backfill / worker / cron / seed 逻辑位置
- Dashboard / 列表 / 详情分别依赖的数据来源

### 输出
给出一份简短地图：
- app 结构
- 测试基础设施现状
- 设计系统现状
- contract 单一事实来源位置
- 数据作业位置
- 高风险 persona 差异点

---

## Step 1. 静态一致性审计（Static Contract Audit）
目标：先找不运行页面就能确认的问题。

### 1.1 类型与 schema
检查：
- tsconfig 是否启用 strict 或接近 strict
- API response、前端 type、表单 schema 是否三套并存且不一致
- 是否有大量 `any` / `unknown` 掩盖真实 contract 问题
- parser 输出与 UI 消费字段是否不一致
- enum / status / variant 是否重复定义、值不一致

### 1.2 前端逻辑规则
检查：
- Hook 是否违反规则
- effect 依赖是否遗漏导致状态陈旧
- loading / empty / error / success 分支是否互斥不清
- feature flag 是否在多个位置各自解释
- 权限判断是否在 route、menu、component 三处各写一遍

### 1.3 Route / API / DTO 契约
重点检查：
- 页面实际请求的 route 是否真实存在
- query 参数是否被 controller / service 支持
- alias 路由是否只补一半
- response shape 是否与前端读取字段一致
- shared/api.interface 与 controller 实际返回是否一致
- 是否存在 `items` / `records`、`exclude` / `removeFromMonitor`、`/worklog` / `/worklogs` 一类漂移

### 1.4 样式与 token 静态规则
检查：
- 是否大量硬编码颜色、字号、间距、圆角、阴影
- token 名称是否混乱，是否存在 deprecated token
- 自定义 CSS 是否绕开设计系统 primitives

### 1.5 导航与信息架构
检查：
- sidebar / tabs / route title / page heading 是否同源
- 菜单可见性与页面可访问性是否不一致
- breadcrumb、返回逻辑、一级二级导航是否语义冲突

---

## Step 2. 数据前提与字段完整度审计（新增重点）
目标：识别"代码没坏，但数据前提没准备好"的问题。

### 2.1 关键数据作业识别
识别是否依赖：
- sync
- init-state
- backfill
- seed
- 外部 ID 映射
- 聚合字段生成

### 2.2 关键字段完整度检查
对 dashboard / 列表 / 详情依赖的关键字段做检查，例如：
- 分组字段（城市、状态、owner）
- 摘要字段（最近拜访、阶段、金额）
- 状态字段（radar state、review state）
- 外部主键 / bitableRecordId

输出：
- 总记录数
- 非空数量
- 空值数量
- 非空率
- 是否达到可发布水平

### 2.3 空值 fallback 是否合理
区分：
- 这是合理 fallback
- 这是数据没准备好但页面还能活
- 这是页面逻辑掩盖了真实问题

例如：
- `未分类`
- `暂无数据`
- 默认 badge
- 空状态替代真实错误

---

## Step 3. Persona / 用户视角审计（新增重点）
目标：拦住"我这边正常，同事那边全坏"。

### 默认至少识别三类 persona
1. Owner / 管理者 / 全量视角用户
2. 普通业务用户
3. 弱数据用户（新同步、字段缺失、state 未补齐）

### 对每个 persona 至少检查
- 登录
- Dashboard / 首页
- 列表页
- 详情页
- 关键字段
- 关键动作

### 重点不是比较项目重叠，而是比较：
- 同一张表的同一关键字段，在各自项目子集上的完整度
- 同一页面的 API 返回 shape 是否一致
- 是否只是数据缺值导致 fallback
- 是否存在用户维度 payload / state / aggregation 异常

---

## Step 4. 现有测试资产盘点（Use Existing Tests First）
先尊重现有工程资产，不要一上来重写测试。

### 要做的事
- 读取现有 unit / integration / E2E / visual tests
- 判断它们覆盖的是实现细节还是用户行为
- 判断是否存在 brittle tests / snapshot 滥用 / 无断言测试
- 标记哪些测试本身已经暴露 contract 漂移和设计漂移

### 输出
- 现有测试可复用清单
- 薄弱区清单
- 误导性测试清单

---

## Step 5. 最小高信号测试生成（Only If Needed）
若现有测试不足，再补最小一组高价值测试，而不是铺满。

### 5.1 逻辑测试优先级
优先补：
1. 列表 → 详情 主链路
2. Dashboard 聚合与 fallback 逻辑
3. route / query / response shape 契约
4. 权限与 persona 分支
5. 关键表单校验
6. 状态切换与空/错/加载分支

### 5.2 页面一致性测试优先级
优先补：
1. 同级页面 header 区
2. 列表页工具栏 / filter bar / table 容器
3. 表单页标签、输入框、错误提示、按钮层级
4. 卡片容器、间距、标题、说明文案密度
5. 弹窗 / drawer / sheet 的 header-footer 结构

### 5.3 测试写法要求
- 优先用户视角查询与断言
- 避免只断言 className 或内部 state
- 必要时断言 computed style / token 使用结果
- 视觉测试与语义测试分开
- 对内部数据型应用，补上 persona matrix 与 data-readiness smoke

---

## Step 6. 组件一致性审计（Component Consistency Audit）

### 需要建立的组件矩阵
对以下组件做横向盘点：
- Button
- Input / Select / Textarea / Checkbox / Radio / Switch
- Modal / Dialog / Drawer / Sheet
- PageHeader / SectionHeader
- Card / Panel / Widget
- Table / List / EmptyState / LoadingState / ErrorState
- Tabs / Breadcrumb / Pagination
- Badge / Tag / StatusChip / Toast

### 每个组件要检查的维度
- variant 是否过多或命名混乱
- 同一 variant 在不同地方视觉不一致
- 尺寸体系是否统一
- 交互态是否齐全且一致
- 是否使用 token
- 是否存在"同名不同样"或"同样不同名"

---

## Step 7. 同级页面一致性审计（Sibling Page Audit）

### 先建立"同级页面组"
例如：
- 一级导航下的所有列表页
- 一级导航下的所有详情页
- 同一模块下的设置页
- 同一工作台中的 dashboard 子页

### 对每组页面做对比
必须检查：

#### 7.1 布局与容器
- 主容器最大宽度
- 左右 padding
- 顶部留白
- 区块间距
- 栅格列距

#### 7.2 标题系统
- 页面标题字号 / 字重 / 行高
- 副标题、描述文字样式
- section 标题层级
- 标题与操作区距离

#### 7.3 操作区
- 主按钮位置是否一致
- 主次按钮层级是否一致
- 筛选栏、搜索框、批量操作区是否一致

#### 7.4 数据展示
- table header / row 密度
- 卡片 padding / gap / shadow / radius
- 数字、状态标签、时间字段排版是否一致

#### 7.5 状态页
- loading skeleton 是否一致
- empty state 是否统一
- error state 是否统一
- 无权限 / 无数据 / 过滤为空是否被混用

#### 7.6 弹出层
- 标题区样式
- 关闭动作位置
- footer 按钮顺序
- 危险态规则

---

## Step 8. 视觉回归检测（Visual Regression）
优先顺序：
1. Storybook 组件级视觉回归
2. 关键页面 Playwright 截图对比
3. 跨浏览器 smoke

原则：
- 先组件后页面
- 截图必须有稳定基线
- 只对关键页面/关键状态做视觉对比
- 将视觉差异与 root cause 对上：token 漂移、布局漂移、文案换行、组件替换、数据态不同等

---

## Step 9. 无障碍与语义一致性审计（A11y + Semantic Consistency）
必查：
- 页面是否有清晰 title
- dialog / drawer 是否有可感知名称
- form element 是否有 visible label
- icon-only button 是否有可访问名称
- tab / nav / table / list 是否有合理语义
- 焦点态是否可见
- 对比度是否足够

---

## J. 重点检测规则（可直接作为 checklist）

### 1. 代码逻辑 / Contract 类

#### Rule L1：同一业务概念不得多处定义
如 status、role、variant、sourceType、periodLabel 等。

#### Rule L2：route、menu、page heading 应尽量同源
若 route title、sidebar label、breadcrumb label 分别手写，极易漂移。

#### Rule L3：API schema、frontend type、form validation 应可相互映射
若不能映射，就极易出现页面接受一种值、接口返回另一种值。

#### Rule L4：页面依赖的接口 contract 必须显式核对
包括：
- path
- method
- query/body
- 关键 response 字段
- alias 路由
- shared types

#### Rule L5：loading / empty / error / success 必须互斥清晰
不要让空数据与接口失败展示同一种 UI。

#### Rule L6：feature flag 与权限逻辑必须可追踪
不能在多个位置各写一套判断。

#### Rule L7：数据作业依赖必须显式
页面若依赖 sync / init-state / backfill，必须在审计中点名，而不是假定数据已经在。

#### Rule L8：Dashboard / 列表聚合字段必须检查完整度
例如城市、上次拜访、状态等，不能只看页面能否渲染。

#### Rule L9：Persona 差异必须解释
若 owner 正常、同事异常，不能停留在现象层，必须区分是：
- 代码 bug
- 数据缺值
- 状态未初始化
- 用户视角异常

---

### 2. 页面元素一致性类

#### Rule U1：同级页面应共享容器规范
#### Rule U2：同类页面应共享标题系统
#### Rule U3：主操作位置与按钮层级应稳定
#### Rule U4：同类组件状态应一致
#### Rule U5：空态、错态、加载态必须有统一语法
#### Rule U6：图标尺寸、文字尺寸、点击区域应统一
#### Rule U7：表单必须一致地处理 label / help / error
#### Rule U8：表格与卡片的密度体系要稳定

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

必须具体到：
- 哪个 contract 断了
- 哪个字段缺了
- 哪个 persona 异常
- 根因在哪层
- 如何验证修复完成

---

## M. 默认执行策略

### 当项目已有较完整工程化基础
优先：
1. 读现有规则
2. 复用现有测试
3. 补缺口
4. 输出治理建议

### 当项目几乎没有测试与设计系统
优先：
1. 建立页面组与组件清单
2. 找 5–10 个最高价值 contract / data / logic 问题
3. 找 5–10 个最高价值 UI 不一致
4. 先补最小自动化防线
5. 再谈全面治理

### 当项目依赖大量真实数据
优先：
1. 建字段完整度基线
2. 建 persona matrix
3. 建 dashboard/list/detail 主链路 smoke
4. 建 sync / init / backfill readiness checklist

### 当项目由飞书妙搭 + Cowork 混合开发
优先：
1. 先核对页面实际依赖接口与字段
2. 再核对 controller / service / DTO / shared type
3. 再核对数据库字段与数据作业
4. 最后做页面与组件一致性审计

也就是：

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

---

## P. 一个理想的最终目标

这个 Skill 的最终目标不是"替人看一遍代码"，而是帮助团队建立一套长期有效的质量防线：

- 静态层：Type / lint / schema / token / route contract
- 数据层：sync / init / backfill / field completeness
- 组件层：Storybook + component test + visual test
- 页面层：Playwright smoke + key flow + screenshot diff
- Persona 层：不同用户的 dashboard/list/detail 验证
- 治理层：同级页面规范、状态页规范、布局 primitive、单一事实来源

当这些建立起来之后，Skill 的价值就从"一次性找问题"升级为：

> **持续阻止逻辑冲突、contract 漂移、数据前提缺口和设计漂移再次进入主分支。**

---

## Q. 推荐的首轮落地动作（给实际项目）

如果这是一个正在开发中的内部 Web App，建议第一轮只做下面 10 件事：

1. 打开 TypeScript strict（或尽量接近 strict）
2. 建立 API / form / UI 共用 schema 映射
3. 补 route / response shape contract smoke
4. 补 React hooks lint 与核心 ESLint 规则
5. 建立设计 token 文件，停止新增硬编码视觉值
6. 给核心共享组件补 Storybook stories
7. 给 Dashboard / 列表 / 详情做 Playwright smoke
8. 建立关键字段完整度检查（如城市、state、最近拜访）
9. 建立最小 persona matrix（owner / 普通成员 / 弱数据用户）
10. 固定 layout/header/form/table 规范与审计输出模板

这样比"先写 300 个测试"更容易真正控住质量。
