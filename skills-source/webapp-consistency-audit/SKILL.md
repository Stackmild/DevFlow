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

# WebApp 一致性审计 Skill

## 1. Skill 目标

审计四大类问题并落到可执行修复：

| 类型 | 典型问题 |
|---|---|
| **代码逻辑** | 业务规则多处定义且冲突；条件分支/权限/状态互相打架；同一概念命名/枚举/校验不一致 |
| **Contract/数据** | 前后端 route/query/response shape 不一致；字段名漂移；sync/init/backfill 未执行掩盖数据问题；不同用户项目子集字段完整度差异 |
| **页面与设计一致性** | 同级页面边距/字号/组件密度不一致；design token 大量硬编码；跨区域视觉割裂 |
| **用户视角/Persona** | owner 正常但业务同事异常；同页面不同用户的项目子集/状态对象/聚合结果差异巨大 |

**审计目标（按序）**：
1. 确认系统是否有单一事实来源
2. 定位逻辑冲突与 contract 断裂在哪一层
3. 明确区分：代码 bug、数据缺值、同步缺口、用户视角差异
4. 输出可执行、可排序、可复验的修复方案

---

## 2. 适用与不适用

**适合**：React/Next.js/TypeScript Web App；内部 Dashboard/SaaS/Workspace/AI App；产品进入"越做越乱、页面越来越不像一个系统"的阶段；团队希望建立回归检测而非人工救火；飞书妙搭+Cowork 混合开发；系统依赖 sync/init/backfill/聚合字段/用户项目子集动态计算。

**不适合**：凭主观审美大改 UI；不看代码直接给设计建议；只根据截图下结论不核对实现层；把所有差异都判成 bug（允许业务合理例外）；替代发布管理与回滚策略（那是 `release-and-change-manager`）。

> **先确认差异是否有意设计，再判定是否属于不一致；先确认是代码问题还是数据前提问题，再决定修法。**

---

## 3. 核心原则

1. **先静态约束，后动态测试** — 能在 lint/类型/schema 层抓住的问题不应等到浏览器里才发现
2. **优先检查单一事实来源** — 高频不一致通常因 token 无统一来源、route config 分裂、API schema 与 form schema 分裂、状态枚举多文件重复定义
3. **先区分代码 bug 与数据前提问题** — 字段没 sync、state 没初始化、backfill 没执行、用户子集字段完整度低、空值 fallback 掩盖根因 → 这些不是前端 bug
4. **用户视角差异是一级风险** — 默认必须考虑 owner/管理者、普通成员、弱数据用户；"我这里正常"不能作为系统正确的证明
5. **组件一致性优先于页面一致性** — 页面一致性最好从组件层解决，而不是在页面层到处补丁
6. **一致性检测必须证据化** — 所有问题必须指向具体文件/组件/route/selector/token/API/job
7. **无障碍是 UI 一致性的一部分** — 标题/表单标签/对话框命名/对比度/焦点态，既是 a11y 问题，也是产品一致性问题

---

## 4. 输入要求

**必需**：代码仓库或主要代码片段、运行方式、当前技术栈（若可自动识别则无需手动提供）。

**强烈建议**：页面清单/路由结构、导航分组说明、设计规范/Figma/Storybook/token 文件（任一即可）、已知问题样例；数据型应用还需：关键表结构/字段说明、sync/init/backfill 现状、关键 persona 名单、典型记录样本。

**若缺失**：仍可执行，但必须明确标注哪些是强证据、哪些是高概率推断、哪些因缺基线无法最终判断。

---

## 5. 执行流程（10 Steps）

执行以下 10 步，每步详细展开见 `./reference/consistency-checks.md`。

| Step | 动作 | 输出 |
|------|------|------|
| 0 | 项目侦察（Repo Recon） | App 结构、测试基础设施、设计系统现状、contract 真相来源、数据作业位置、高风险 persona 差异点 |
| 1 | 静态一致性审计 | 类型与 schema / 前端逻辑规则 / Route/API/DTO 契约 / 样式与 token / 导航与信息架构 |
| 2 | 数据前提与字段完整度审计 | 数据作业识别 / 关键字段完整度 / 空值 fallback 合理性 |
| 3 | Persona / 用户视角审计 | 三类 persona 差异比较（Owner/普通用户/弱数据用户）|
| 4 | 现有测试资产盘点 | 可复用清单、薄弱区清单、误导性测试清单 |
| 5 | 最小高信号测试生成（Only If Needed）| 逻辑测试 / UI 一致性测试 / persona matrix smoke |
| 6 | 组件一致性审计 | 横向盘点 9 类组件：variant/尺寸/交互态/token/同名不同样 |
| 7 | 同级页面一致性审计（Sibling Page Audit）| 布局/标题/操作区/数据展示/状态页/弹出层 6 维度对比 |
| 8 | 视觉回归检测 | Storybook 组件级 → Playwright 页面级 → 跨浏览器 smoke |
| 9 | 无障碍与语义一致性审计 | title/dialog label/form label/icon button 语义/focus/对比度 |

---

## 6. 重点检测规则

### 代码逻辑 / Contract 类

| Rule | 要点 |
|---|---|
| L1 | 同一业务概念不得多处定义 |
| L2 | route/menu title/page heading/breadcrumb 尽量同源 |
| L3 | API schema、frontend type、form validation 必须可相互映射 |
| L4 | 页面依赖的接口 contract 必须显式核对 |
| L5 | loading/empty/error/success 必须互斥清晰 |
| L6 | feature flag 与权限逻辑必须可追踪，禁止多处各写一套 |
| L7 | 数据作业依赖必须显式点名 |
| L8 | Dashboard/列表聚合字段必须检查字段完整度 |
| L9 | Persona 差异必须区分原因：代码 bug / 数据缺值 / 状态未初始化 / 用户视角异常 |

### 页面元素一致性类

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

详细规则说明与典型表现见 `./reference/pitfalls-and-examples.md`。

---

## 7. 输出契约

标准输出须含 7 部分（每部分详细模板见 `./reference/report-template.md`）：

1. **项目现状概览** — 技术栈、测试基础设施、设计系统成熟度、contract 单一事实来源、数据作业现状
2. **高优先级问题表** — Severity / 类型 / 位置 / 现象 / 证据 / 根因判断 / 修复建议
3. **同级页面一致性矩阵** — 页面组 × 6 维度对比结论
4. **数据完整度 / Persona 矩阵** — 各 persona 项目数 / 关键字段 / 非空率 / 页面表现 / 结论
5. **根因归并** — 按 root cause 聚合（token 缺失 / layout primitive 缺失 / route 分裂 / contract drift / sync 缺口等）
6. **修复优先级建议** — 逻辑错误 → contract 漂移 → 数据作业 → 系统性 UI 漂移 → 单页局部问题
7. **建议新增的自动化防线** — lint 规则 / schema 校验 / data-readiness checks / component tests / Playwright tests / persona matrix smoke / Storybook stories

---

## 8. 质量标准

**必须做到**：区分事实/推断/建议；问题落到文件/组件/selector/API/字段/job；明确系统性问题 vs 单点问题；对设计差异给出"是否可能是有意设计"的判断；对数据异常给出"代码坏了还是数据没准备好"的判断。

**禁止表述**："这里感觉不太统一" / "建议优化一下视觉" / "建议加一些测试" / "可能是缓存问题" / "应该是字段没回来"。必须具体到：哪个 contract 断了、哪个字段缺了、哪个 persona 异常、根因在哪层、如何验证修复完成。

---

## 9. 回答风格

输出应当：直接、结构化、基于证据、先给结论再给证据再给修法、对不确定项明确标注不确定性。

不要：大段空泛教学、只罗列工具名、只做页面层吐槽、在没有证据时断言"这是 bug"。

---

## 10. 一句话工作方式

> 先修 contract 与数据前提，再修页面末梢；所有问题必须证据化到具体文件/字段/API/组件；区分"代码 bug"与"数据没准备好"；区分"系统性漂移"与"单点差异"。

---

## 外置参考

| 文件 | 使用时机 | 分级 |
|------|----------|------|
| `./reference/consistency-checks.md` | 执行 Step 0-9、飞书妙搭+Cowork 双语境、默认策略 | Always read |
| `./reference/report-template.md` | 输出最终审计报告 | Template-only |
| `./reference/pitfalls-and-examples.md` | 检测规则详细说明 + 质量标准 + 典型表现 | Conditional read |
