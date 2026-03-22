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

本 Skill 负责把 **frontend-design / interaction designer / web-app-consistency** 的规则，沉淀为一套**真正可复用、可维护、可测试、可演进**的组件系统。

它不只是“做几个按钮和输入框”，而是要回答这些问题：

- 哪些 UI 应该沉淀成共享组件，哪些不该？
- 组件与页面模式的边界在哪里？
- 组件的 props、状态、交互、可访问性约束如何统一？
- design tokens 如何成为视觉决策的单一来源？
- 组件如何被文档化、测试、发布、弃用与替换？
- 如何避免 AI / 开发者每次都重新发明一版相似但不一致的组件？

本 Skill 的目标不是追求“组件越多越专业”，而是：

1. **让一致性默认发生，而不是靠事后检查**
2. **让页面优先组装已有零件，而不是反复临时拼装**
3. **让视觉规则、交互规则、可访问性规则都沉淀到组件层**
4. **让一个小团队也能维护组件资产，不被复杂设计系统反噬**
5. **让 AI 协作开发有“优先复用已有组件”的明确约束**

---

## B. 适用场景

### 适合

- 已有多个页面，开始出现按钮、表格、表单、弹窗、状态提示各写各的情况
- 已有视觉方案和交互方案，但没有真正的共享组件层
- 要建立或收口一套内部工具组件系统
- 要决定哪些东西应成为共享组件、哪些只是业务页面局部实现
- 要为 Storybook / 组件文档 / 视觉回归 / a11y 测试建立规范
- 要治理组件变体膨胀、props 失控、旧组件难以弃用的问题
- 要让 AI 生成代码时优先复用组件库，而不是页内现写

### 不适合

- 只需要讨论单个业务页面的布局
- 只需要修某个组件的一个 bug
- 只需要高层产品优先级或 PRD
- 只需要后端数据/API 设计
- 只需要页面一致性审计但不打算沉淀共享组件

---

## C. 与其他 Skill 的边界

### 本 Skill 负责

- 组件清单与分层
- design tokens 使用与约束
- 组件 API 设计
- 组件状态覆盖
- 组件可访问性契约
- Storybook stories / docs / test 基线
- 组件发布阶段、弃用与迁移策略
- 组件复用治理与重复组件收口

### 本 Skill 不负责

- 决定产品要做什么（交给 `product manager`）
- 决定完整任务流与交互蓝图（交给 `interaction designer`）
- 决定整体视觉语言与设计方向（交给 `frontend-design`）
- 做页面与代码的一致性审计（交给 `web-app-consistency`）
- 做整体模块架构、路由与状态边界（交给 `web-app-architect`）
- 做数据库与 API 契约（交给 `backend-data-api`）

### 与现有 Skill 的关系

- `frontend-design` 提供 **视觉原则与 tokens 意图**
- `interaction designer` 提供 **行为模式与交互规则**
- `component-library-maintainer` 把它们落实为 **组件资产**
- `web-app-consistency` 用来检查页面是否**遵守组件与 tokens 规则**

---

## D. 默认立场（Strong Defaults）

除非用户明确说明相反约束，否则优先采用以下默认立场。

### D1. 默认先有 design tokens，再有共享组件

颜色、间距、圆角、字号、阴影、边框、层级、尺寸等基础视觉决策，默认优先表达为 tokens；组件消费 tokens，而不是在组件或页面中硬编码视觉值。

### D2. 默认组件库服务于“内部工具效率”，不是追求品牌炫技

对内部产品，优先级通常是：

- 清晰
- 可读
- 高密度但不拥挤
- 稳定
- 可预测

默认避免为了“更有设计感”增加过多装饰、动画、奇特结构和一次性变体。

### D3. 默认优先成熟原语 / 可访问性模式，不手写伪组件

Button、Dialog、Tabs、Menu Button、Form controls 等常见交互，优先使用成熟的语义与可访问性模式，避免自己用一堆 `div` 模仿按钮、下拉和弹窗。

### D4. 默认优先 Storybook 式组件驱动开发

共享组件默认应有独立 stories、文档和测试入口。组件应该能在脱离业务页面和后端数据的情况下被单独查看、调试与测试。

### D5. 默认共享组件要比业务页面更克制

共享组件不应把具体业务逻辑、特殊命名、局部判断塞进内部。默认做法是：

- 组件负责通用 UI 行为
- 业务页面负责业务条件与数据拼装
- 不把“这个页面刚好这样需要”直接提升成组件默认行为

### D6. 默认组合优于超级组件

优先设计一组可组合的小组件/原语，而不是一个拥有几十个 props、覆盖所有场景的超级组件。

### D7. 默认没有复用压力，不急于组件化

只有在以下至少满足其一时，才建议升级为共享组件：

- 相同模式已在多个页面重复出现
- 未来明显会高频复用
- 该模式承载核心一致性（如页面头部、表格、表单行、状态标签）
- 该模式存在明确的可访问性与测试价值

### D8. 默认每个共享组件必须有“状态清单”

共享组件默认至少要明确：

- default
- hover / focus / active（如适用）
- disabled / readonly（如适用）
- loading（如适用）
- error / invalid（如适用）
- empty / no-data（如适用）
- responsive 行为（如适用）

### D9. 默认组件要有发布阶段与弃用规则

共享组件不应一上来就“永久承诺”。默认建议至少区分：

- experimental / early access
- beta
- stable / GA
- deprecated

### D10. 默认页面模式与基础组件分开治理

`PageHeader`、`FilterBar`、`ReviewActionBar` 这类“页面骨架组件”可以共享，但它们不等同于基础组件。默认应分为：

- primitives（原语）
- foundational components（基础组件）
- composite/shared patterns（复合共享模式）
- page templates（页面模板，若有单独 Skill 则交给模板 Skill）

---

## E. 非谈判原则（Non-Negotiable）

### 1. 共享组件必须是“单一事实来源”

一旦某类 UI 已有共享组件，后续页面默认必须优先复用它，而不是在页面里重新写一个相似版本。

### 2. 组件 API 必须可预测

相似组件应有相似的 API 习惯，例如：

- `size`
- `tone` / `variant`
- `isDisabled` / `disabled`
- `isInvalid` / `error`
- `loading`

不允许同一组件库里命名风格完全混乱。

### 3. 样式自由度必须被控制

不能为了“灵活”而给共享组件开放过多任意 CSS 出口。默认禁止：

- 到处传内联样式覆盖核心布局
- 任意颜色值直接传入组件
- 用一堆 className 覆盖组件核心状态与层级

必要时可提供有限、清晰、受 tokens 约束的扩展点。

### 4. 组件必须把可访问性当成默认能力，而不是附加项

对于交互组件，必须显式考虑：

- 语义角色
- 可见/隐藏 label
- keyboard support
- focus management
- 错误信息与帮助信息关联
- 屏幕阅读器可理解的名称与状态

### 5. 组件文档不是可选项

凡是共享组件，都必须有最小文档集：

- 用途
- 何时使用 / 何时不用
- anatomy
- props 说明
- 状态说明
- a11y 说明
- 示例
- do / don't

### 6. 组件测试必须跟着 story 走

共享组件默认要有 story，并基于 story 衍生：

- interaction tests
- accessibility checks
- visual regression baseline

### 7. 组件层通过，不等于页面层通过

组件在隔离环境中通过测试，并不自动代表放进真实页面后仍然可用。页面仍需单独做布局、可访问性与业务态检查。

---

## F. 组件分层模型（Recommended Taxonomy）

默认按以下层次组织组件库。

### Layer 1. Tokens

只承载设计决策，不承载业务含义：

- color
- spacing
- radius
- typography
- shadow
- border
- z-index / elevation
- motion duration / easing（如需要）
- size scale

### Layer 2. Primitives / Layout Primitives

最基础、最抽象、最低业务语义的组件，例如：

- Box
- Stack / Inline
- Grid
- Text
- Icon
- VisuallyHidden
- Divider

这层的目标是：**在 tokens 之上提供稳定的布局与文本原语**。

### Layer 3. Foundational Components

最常用、可跨页面复用的基础组件，例如：

- Button
- Link
- Input / Textarea
- Select / Combobox
- Checkbox / Radio / Switch
- Tabs
- Dialog / Drawer
- Tooltip / Popover
- Table primitives
- Tag / Badge
- Alert / Banner / Toast
- EmptyState / Skeleton / Spinner

### Layer 4. Composite Shared Patterns

由基础组件组合成、但仍跨页面复用的共享模式，例如：

- PageHeader
- SectionHeader
- FilterBar
- SearchBar
- FormSection
- DetailPanel
- SummaryStatBlock
- ReviewActionBar
- AIResultCard

### Layer 5. Page Templates（若纳入本 Skill）

只在确有必要且模式足够稳定时，才定义页面模板，例如：

- 列表页骨架
- 详情页骨架
- 配置页骨架
- 审核页骨架

如果你后续有专门的 `internal-tool-page-patterns` Skill，则页面模板应优先交给那个 Skill 管理。

---

## G. 内部工具推荐优先沉淀的组件清单

对你这种部门内部产品，默认先沉淀这些高复用、高一致性价值的组件。

### G1. 页面骨架类

- PageHeader
- SectionHeader
- Card / Panel
- Tabs
- Sidebar / TopNav shell（若适用）

### G2. 数据展示类

- Table / TableToolbar / TableEmptyState
- FilterBar
- SearchInput
- StatusTag / StatusBadge
- DetailPanel
- StatCard / SummaryBlock

### G3. 表单类

- Field wrapper
- TextInput / Textarea
- Select / MultiSelect / DateInput
- Checkbox / Radio / Switch
- InlineError / HelperText
- FormSection / FormActions

### G4. 反馈类

- EmptyState
- Skeleton
- Spinner
- Banner / Alert
- ConfirmDialog
- Non-blocking Toast（若确实需要）

### G5. AI / Review 类（若产品 AI 很重）

- AIResultCard
- EvidenceBlock
- ReviewDiffBlock
- HumanOverridePanel
- ReviewActionBar

---

## H. 每个共享组件的最小定义模板（Required Contract）

凡是要进入共享组件库的组件，默认至少定义以下内容：

### 1. Purpose

- 它解决什么问题？
- 属于哪一层（primitive / foundational / composite）？

### 2. Usage Boundaries

- 何时使用
- 何时不要使用
- 与相邻组件的区别

### 3. Anatomy

- 组件由哪些部分构成
- 哪些部分是必需的，哪些是可选的

### 4. Props / API

- props 列表
- 类型与默认值
- 控制型 / 非控制型行为
- 哪些 props 不能同时使用

### 5. States

- 所有视觉与交互状态
- 每个状态下的行为差异

### 6. Accessibility Contract

- role / aria / labeling
- keyboard 行为
- focus 规则
- error/help 关联方式
- 是否支持屏幕阅读器和缩放场景

### 7. Content Guidance

- 文案长度建议
- 标点/大小写/句式建议
- 空状态、错误状态、按钮文案的写法边界

### 8. Examples / Stories

- 最小示例
- 典型示例
- 边界情况示例
- 错误示例（如适合）

### 9. Test Baseline

- interaction
- a11y
- visual regression
- 如有必要的 unit assertions

### 10. Lifecycle

- 当前阶段（experimental / beta / stable / deprecated）
- 替代方案（若弃用）
- 迁移说明（若有）

---

## I. 默认工作流（How this Skill should operate）

### Step 1. 盘点现状

先识别：

- 现有共享组件有哪些
- 页面里重复造轮子的地方有哪些
- tokens 是否存在、是否被遵守
- 哪些组件变体已经失控
- 哪些“页面局部实现”其实应提升为共享模式

### Step 2. 做组件分层与收口

输出建议的组件层级：

- 哪些保留为 primitives
- 哪些升级为 foundational components
- 哪些是 composite patterns
- 哪些不应进入组件库

### Step 3. 收口 API 与变体

重点检查：

- 重复 props
- 冲突 props
- 命名不一致
- 变体过多
- 页面通过 className 任意覆盖核心样式

必要时提出：

- 合并
- 拆分
- 限制
- 弃用

### Step 4. 补齐 states / docs / stories

对于共享组件，补齐：

- states
- Storybook stories
- doc blocks / usage guidance
- do/don't
- 边界场景

### Step 5. 建立测试门槛

至少明确：

- 哪些 stories 是“已知正确状态”
- 哪些 stories 必须有交互测试
- 哪些必须进入 visual regression
- 哪些必须做人工 keyboard / screen reader spot check

### Step 6. 定义生命周期管理

至少明确：

- 新组件如何进入库
- 何时允许 experimental
- 何时才能转为 stable
- 旧组件如何标注 deprecated
- 替代组件是什么

---

## J. 默认质量标准（Quality Bar）

### J1. Token 使用

- 基础视觉值优先来自 tokens
- 组件不得硬编码核心颜色、间距、字号、圆角
- 页面不得绕过 tokens 大量自定义值

### J2. Story completeness

每个共享组件至少应有：

- default
- 常见变体
- disabled / loading / error（如适用）
- 长文本 / 空文本 / 溢出边界（如适用）
- responsive / density 差异（如适用）

### J3. Accessibility baseline

交互组件至少应验证：

- tab 焦点可达
- visible focus
- label / name 可被读出
- 错误信息和帮助信息可关联
- 弹出层焦点管理与关闭返回焦点合理

### J4. Docs baseline

- 组件页面可让非作者理解其使用边界
- 不依赖查看源码才能知道怎么用
- 有相邻组件对比，避免误用

### J5. API discipline

- 命名一致
- 受控/非受控约定清楚
- 不随意暴露“万能 style 接口”
- 默认值清晰、少惊喜

---

## K. 推荐的测试策略

默认推荐以下测试分层：

### 1. Story-level interaction tests

用于验证：

- 点击
- 输入
- 展开/收起
- 焦点移动
- 基本状态切换

### 2. Story-level accessibility checks

用于快速发现：

- label 缺失
- aria 关系错误
- 颜色对比与角色问题（工具可发现的部分）

### 3. Visual regression

用于守护：

- 意外样式漂移
- 间距、排版、层级变化
- 组件状态样式被破坏

### 4. Manual spot checks

对于 Dialog / Menu Button / Tabs / Combobox / Table 等复杂交互，默认仍需人工检查：

- keyboard 流程
- 焦点陷阱与关闭返回
- 缩放与密度表现
- 真正页面中的布局上下文

---

## L. 可访问性默认规则（A11y Defaults）

以下规则默认写进组件规范。

### L1. 不用伪按钮、伪链接、伪表单控件

默认优先原生元素或成熟可访问性原语。

### L2. 交互组件必须有可感知名称

- 可见 label 优先
- 若视觉上隐藏，仍需保留 assistive tech 可感知名称

### L3. 弹层组件必须定义焦点策略

Dialog / Drawer / Menu / Popover 默认要定义：

- 打开后初始焦点去哪里
- 关闭后焦点回哪里
- 背景内容是否应失焦/不可达

### L4. 表单错误与帮助信息必须可关联

help text、error text 不能只是视觉摆放正确，还要能被技术手段关联到字段。

### L5. disabled 要谨慎使用

尤其表单中，默认不要把 disabled 当作主要解释手段；若使用，必须解释为什么不可用，并考虑辅助技术与键盘用户体验。

---

## M. 组件生命周期治理

默认至少分四档：

### 1. Experimental / Early Access

- 新组件
- API 可能变化
- 文档与测试尚未完整
- 不建议大面积依赖

### 2. Beta

- 结构已相对稳定
- 已有文档和基础测试
- 允许受控使用并收集反馈

### 3. Stable / GA

- API 稳定
- stories、docs、a11y、visual baseline 齐备
- 可作为默认推荐方案

### 4. Deprecated

- 不再推荐新使用
- 指明替代方案
- 提供迁移说明
- 在适当窗口后移除

---

## N. 反模式（Must Call Out）

发现以下情况时，应主动指出并给出治理建议：

1. **相似组件重复存在**
   - 例如三个不同的 Button / Tag / PageHeader

2. **组件 API 过大过乱**
   - 一个组件几十个 props，且 props 相互冲突

3. **共享组件夹带业务逻辑**
   - 把页面特定判断写进基础组件

4. **页面绕过组件库随意写样式**
   - 大量 className / style 直接覆盖共享组件

5. **token 名存实亡**
   - 名义上有 tokens，实际上页面和组件继续硬编码

6. **没有 states / stories / docs 就宣布共享**
   - 导致组件无法真正复用

7. **无障碍靠“以后补”**
   - Dialog、Tabs、Menu、Form 组件没有明确 a11y 契约

8. **把页面模板误当基础组件**
   - 结果基础组件越来越重、越来越难复用

9. **没有弃用机制**
   - 旧组件永远留在库里，团队继续误用

10. **把一致性寄托在肉眼审查**
   - 没有文档、tokens、stories、测试基线

---

## O. 输出格式建议（Output Contract）

当用户调用本 Skill 时，理想输出可以包含以下内容的部分或全部：

1. 当前组件库问题诊断
2. 组件分层建议（tokens / primitives / foundational / composite）
3. 推荐优先沉淀的组件清单
4. 组件 API 收口建议
5. stories / docs / tests 补齐计划
6. 组件生命周期与弃用方案
7. 与 `frontend-design` / `interaction designer` / `web-app-consistency` 的衔接说明
8. 反模式与迁移优先级

---

## P. 这个 Skill 在你当前场景下的默认建议

对于**小团队、内部工具、AI 协作开发**，默认建议：

- 先做少量高复用组件，不追求“大而全设计系统”
- 先统一 tokens、Button、Field、Table、PageHeader、FilterBar、Empty/Loading/Error states
- 组件默认要有 Storybook stories
- 页面默认优先复用组件和 patterns，不在页面里随手造新 UI
- 把可访问性和状态覆盖写进组件定义，而不是放到最后修补
- 组件库要有发布阶段和弃用机制，避免越堆越乱

一句话：

> **这个 Skill 的职责不是“让组件更多”，而是“让组件真正成为你产品的一套标准零件”。**
