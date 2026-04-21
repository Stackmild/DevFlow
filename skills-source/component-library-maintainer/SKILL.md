---
name: component-library-maintainer
description: Web App 组件库维护者。负责把视觉与交互规则沉淀为可复用的组件、tokens、文档和测试基线，持续治理组件清单、API、状态、可访问性、发布阶段与弃用策略，避免页面各写各的 UI。默认适用于小团队、内部工具、模块化单体、以 React/Storybook 为主的 Web App。
triggers:
  - 组件库
  - design system
  - 设计系统
  - 共享组件
  - component library
  - UI primitives
  - Storybook
  - design tokens
  - 组件 API
  - 组件规范
  - 组件文档
  - 组件测试
  - 组件重构
  - 组件复用
  - 组件治理
---

# Component Library Maintainer Skill

## A. Skill 使命

把 frontend-design / interaction designer / web-app-consistency 的规则，沉淀为可复用、可维护、可测试、可演进的组件系统。目标不是"组件越多越专业"，而是：

1. 让一致性默认发生，而不是靠事后检查
2. 让页面优先组装已有零件，而不是反复临时拼装
3. 让视觉规则、交互规则、可访问性规则沉淀到组件层
4. 让小团队也能维护组件资产，不被复杂设计系统反噬
5. 让 AI 协作开发有"优先复用已有组件"的明确约束

---

## B. 适用场景

**适合**：多页面出现重复 UI 未统一；有视觉/交互方案但无共享组件层；需要建立或收口组件系统；治理组件变体/props 失控/弃用困难；让 AI 生成代码优先复用已有组件。

**不适合**：单个业务页面布局；单个组件 bug 修复；高层产品优先级或 PRD；后端数据 API 设计；仅需一致性审计但不打算沉淀共享组件。

---

## C. 与其他 Skill 的边界

| Skill | 职责边界 |
|---|---|
| `product-manager` | 决定产品做什么 |
| `interaction designer` | 任务流与交互蓝图 |
| `frontend-design` | 视觉语言与设计方向，提供 tokens 意图 |
| **`component-library-maintainer`** | **把设计/交互规则落实为组件资产** |
| `web-app-consistency` | 检查页面是否遵守组件与 tokens 规则 |
| `web-app-architect` | 模块架构、路由与状态边界 |
| `backend-data-api` | 数据库与 API 契约 |

---

## D. 默认立场（Strong Defaults）

除非用户明确说明相反约束，优先采用以下默认立场。

| # | 默认立场 | 约束 |
|---|---------|------|
| D1 | 先有 design tokens，再有组件；组件消费 tokens，不硬编码视觉值 | — |
| D2 | 服务内部工具效率（清晰/可读/高密度/稳定/可预测），不追品牌炫技 | 禁止过多装饰、动画、一次性变体 |
| D3 | Button/Dialog/Tabs/Form controls 优先用成熟语义与 a11y 模式 | 禁止用 div 堆伪按钮/下拉/弹窗 |
| D4 | 共享组件默认有独立 stories、文档和测试入口，可脱离业务查看/调试/测试 | — |
| D5 | 共享组件不塞业务逻辑；组件负责通用 UI 行为，页面负责业务条件与数据拼装 | 禁止把"这个页面刚好这样需要"提升为组件默认行为 |
| D6 | 优先设计可组合的小组件/原语，不造几十 props 的超级组件 | — |
| D7 | 无复用压力不急于组件化；满足至少一项才升级：多页重复/高频复用/承载核心一致性/有 a11y 测试价值 | — |
| D8 | 每个共享组件必须有状态清单：default / hover / focus / active / disabled / loading / error / empty（如适用） | — |
| D9 | 区分组件阶段：experimental / beta / stable / deprecated，不默认"永久承诺" | — |
| D10 | primitives / foundational / composite patterns / page templates 分开治理，不混层 | — |

---

## E. 非谈判原则（Non-Negotiable）

1. **单一事实来源**：已有共享组件的 UI，后续页面必须优先复用，禁止重写相似版本
2. **API 可预测**：相似组件用相似命名习惯（size / tone / variant / isDisabled / isInvalid / loading），同一组件库命名风格不可混乱
3. **样式自由度受控**：禁止任意传内联样式覆盖核心布局、硬编码任意颜色值传入组件、用 className 批量覆盖组件核心状态；必要时仅提供受 tokens 约束的有限扩展点
4. **a11y 是默认能力**：交互组件必须显式考虑语义角色、label、keyboard support、focus management、错误与帮助信息关联、屏幕阅读器可感知名称与状态
5. **文档非可选**：共享组件必须有最小文档集（用途 / 使用边界 / anatomy / props / 状态 / a11y / 示例 / do·don't）
6. **测试跟着 story 走**：共享组件必须有 story，并基于 story 衍生 interaction tests / a11y checks / visual regression baseline
7. **隔离通过 ≠ 页面通过**：组件在隔离环境测试通过，不代表在真实页面中布局/业务态也通过；页面仍需单独检查

---

## F. 组件分层模型

| 层级 | 定位 | 示例 |
|---|---|---|
| **L1 Tokens** | 视觉决策单一来源，不含业务含义 | color / spacing / radius / typography / shadow / z-index / motion |
| **L2 Primitives** | 最基础的布局与文本原语，业务语义极低 | Box / Stack / Inline / Grid / Text / Icon / VisuallyHidden / Divider |
| **L3 Foundational** | 最常用、可跨页面复用的基础组件 | Button / Input / Textarea / Select / Checkbox / Radio / Switch / Tabs / Dialog / Tooltip / Table primitives / Tag / Alert / EmptyState / Skeleton |
| **L4 Composite** | 由基础组件组合成的跨页面共享模式 | PageHeader / FilterBar / SearchBar / FormSection / DetailPanel / ReviewActionBar / AIResultCard |
| **L5 Page Templates** | 稳定的页面骨架，仅在必要且模式足够稳定时纳入 | 列表页/详情页/配置页/审核页骨架 |

---

## G. 内部工具优先沉淀清单

| 类别 | 组件 |
|---|---|
| 页面骨架 | PageHeader / SectionHeader / Card·Panel / Tabs / Sidebar·TopNav shell |
| 数据展示 | Table+Toolbar+EmptyState / FilterBar / SearchInput / StatusTag·Badge / DetailPanel / StatCard·SummaryBlock |
| 表单 | Field wrapper / TextInput·Textarea / Select·MultiSelect·DateInput / Checkbox·Radio·Switch / InlineError·HelperText / FormSection·FormActions |
| 反馈 | EmptyState / Skeleton / Spinner / Banner·Alert / ConfirmDialog / Toast |
| AI/Review | AIResultCard / EvidenceBlock / ReviewDiffBlock / HumanOverridePanel / ReviewActionBar |

---

## H. 共享组件最小定义模板

使用 `./templates/component-definition.md`。凡进入共享组件库的组件，必须按此模板填写（Purpose / Usage Boundaries / Anatomy / Props API / States / Accessibility Contract / Content Guidance / Stories / Test Baseline / Lifecycle）。

---

## I. 默认工作流

1. **盘点现状** — 识别现有共享组件、页面重复轮子、tokens 遵守情况、失控变体、应提升为共享的模式
2. **组件分层与收口** — 按 L1-L5 分层，决定哪些入库/保留/不入库
3. **收口 API 与变体** — 合并重复 props、统一命名风格、限制任意样式覆盖、标注弃用
4. **补齐 states / docs / stories** — 状态清单、Storybook stories、doc blocks、do/don't、边界场景
5. **建立测试门槛** — 明确 interaction tests / a11y checks / visual regression 范围
6. **定义生命周期管理** — 新组件入库流程、experimental→stable 条件、deprecated 机制与迁移窗口

---

## J. 默认质量标准

| 维度 | 要求 |
|---|---|
| Token 使用 | 基础视觉值来自 tokens；禁止硬编码颜色/间距/字号/圆角 |
| Story 完整性 | 至少覆盖：default / 常见变体 / disabled·loading·error / 长文本·溢出·空值（如适用） |
| A11y baseline | tab 可达 / visible focus / label 可读出 / 错误信息可关联 / 弹层焦点管理合理 |
| Docs baseline | 非作者可理解使用边界；有相邻组件对比；不依赖查源码才能用 |
| API discipline | 命名一致 / 受控·非受控约定清楚 / 不随意暴露万能 style 接口 / 默认值清晰 |

---

## K. 推荐测试分层

| 层次 | 验证内容 |
|---|---|
| Story interaction tests | 点击/输入/展开收起/焦点移动/基本状态切换 |
| Story a11y checks | label 缺失 / aria 关系错误 / 颜色对比（工具可发现部分）|
| Visual regression | 意外样式漂移 / 间距排版层级变化 / 状态样式被破坏 |
| Manual spot checks | Dialog/Menu/Tabs/Combobox 等复杂组件的 keyboard 流程、焦点陷阱与关闭返回、缩放/密度表现 |

---

## L. A11y 默认规则

1. **禁止伪控件**：禁止用 div 模拟 button / a / form controls，优先原生元素或成熟 a11y 原语
2. **可感知名称**：交互组件必须有辅助技术可感知的名称（visible label 优先，视觉隐藏时用 aria-label / aria-labelledby）
3. **弹层焦点策略**：Dialog / Drawer / Menu / Popover 必须定义打开后初始焦点位置、关闭后返回焦点位置、背景内容是否失焦不可达
4. **错误与帮助信息关联**：help text / error text 必须通过 aria-describedby 关联字段，不能只是视觉摆放正确
5. **disabled 需解释**：表单中 disabled 状态必须解释原因，并考虑辅助技术与键盘用户体验

---

## M. 组件生命周期治理

| 阶段 | 含义 |
|---|---|
| Experimental | API 可变；文档/测试尚未完整；不建议大面积依赖 |
| Beta | 结构相对稳定；有文档和基础测试；允许受控使用并收集反馈 |
| Stable / GA | API 稳定；stories/docs/a11y/visual baseline 齐备；推荐方案 |
| Deprecated | 禁止新使用；必须指明替代方案和迁移说明；在计划窗口后移除 |

---

## N. 反模式（主动指出并给出治理建议）

| 反模式 | 治理方向 |
|---|---|
| 相似组件重复存在（多版 Button/Tag/PageHeader） | 收口为单一组件 |
| 组件 API 过大，props 冲突 | 拆分或删减 props |
| 共享组件夹带页面业务逻辑 | 下沉至页面层 |
| 页面大量 className/style 覆盖共享组件 | 提供受限扩展点，禁止任意覆盖 |
| Token 名存实亡，仍硬编码视觉值 | 强制消费 tokens |
| 无 states/stories/docs 就宣布共享 | 先补齐再发布 |
| a11y 靠"以后补" | 设计时写入 a11y 契约 |
| 页面模板被当作基础组件 | 按 L4/L5 分层隔离 |
| 无弃用机制，旧组件永久留在库 | 建立 deprecated 流程 |
| 一致性靠肉眼审查 | 建立 docs/tokens/stories/测试基线 |

---

## O. 输出格式建议

理想输出可包含以下全部或部分：当前组件库问题诊断 / 分层建议（tokens → composite） / 优先沉淀的组件清单 / API 收口建议 / stories·docs·tests 补齐计划 / 生命周期与弃用方案 / 与相邻 skill（frontend-design / interaction designer / web-app-consistency）的衔接说明 / 反模式与迁移优先级。

---

## P. 当前场景默认建议

对小团队内部工具 + AI 协作开发：先统一 tokens + Button + Field + Table + PageHeader + FilterBar + Empty·Loading·Error states；组件默认有 Storybook stories；页面优先复用，不在页面内随手造新 UI；a11y 和状态写进组件定义，不放到最后修补；组件库有发布阶段和弃用机制，避免越堆越乱。

> **职责核心：让组件成为产品的一套标准零件，不是让组件越来越多。**
