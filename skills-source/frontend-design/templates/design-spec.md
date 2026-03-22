# {产品/模块名} 前端设计说明

> 由 `frontend-design` skill 生成。
> 覆盖：场景与方向 / Visual System / 页面骨架 / 数据型页面规则 / 状态视觉 / 组件规则 / 实现交接。

---

## 1. 场景与设计方向

**产品类型**：SaaS / Dashboard / Workspace / 内部工具 / AI App

**风格关键词**（3–5 个）：professional / calm / precise / restrained / product-grade

**视觉原则**（2–4 条）：
1.
2.

**禁止项**：
- 模板感
- 组件库默认皮肤感
- 廉价特效

**密度策略**：

| 页面类型 | 密度 | 说明 |
|---------|------|------|
| Dashboard | 适中 | KPI 卡清晰，不拥挤 |
| 列表页 | 紧凑 | 高效展示数据 |
| 详情页 | 标准 | 结构清晰，便于阅读 |
| 表单页 | 标准 | 留够呼吸空间 |

---

## 2. 信息密度与页面类型策略

**首屏密度**：
**列表密度**：
**详情密度**：
**表单密度**：
**表格行高**：
**筛选栏密度**：

---

## 3. Visual System

### 3.1 Color Tokens

| Token | 值 | 用途 |
|-------|----|------|
| color.primary.500 | #... | 主操作、主链接 |
| color.semantic.success | #... | 成功状态 |
| color.semantic.warning | #... | 警告状态 |
| color.semantic.error | #... | 错误状态 |
| color.surface.default | #... | 页面背景 |
| color.surface.elevated | #... | 卡片/面板背景 |
| color.text.primary | #... | 主要文字 |
| color.text.secondary | #... | 次要文字 |
| color.text.placeholder | #... | 占位文字 |
| color.border.default | #... | 默认边框 |

### 3.2 Typography Scale

| 级别 | 字号 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| heading-xl | 24px | 700 | 32px | 页面主标题 |
| heading-lg | 20px | 600 | 28px | 区块标题 |
| heading-md | 16px | 600 | 24px | 次级标题 |
| body-md | 14px | 400 | 22px | 正文 |
| body-sm | 13px | 400 | 20px | 说明文字 |
| label-md | 13px | 500 | 18px | 标签/Badge |
| mono | 13px | 400 | 20px | 数字/代码 |

### 3.3 Spacing Scale（基于 4px）

| Token | 值 | 典型用途 |
|-------|----|---------|
| space-1 | 4px | 图标内边距 |
| space-2 | 8px | 组件内间距 |
| space-3 | 12px | 小区块间距 |
| space-4 | 16px | 标准内间距 |
| space-6 | 24px | 区块间距 |
| space-8 | 32px | 大区块间距 |
| space-12 | 48px | 节间距 |

### 3.4 Radius / Border / Shadow

| 类型 | 值 | 用途 |
|------|----|----|
| radius-sm | 4px | 输入框、小按钮 |
| radius-md | 8px | 卡片、大按钮 |
| radius-lg | 12px | 模态框、面板 |
| shadow-sm | 0 1px 3px rgba(0,0,0,.1) | 卡片 |
| shadow-md | 0 4px 12px rgba(0,0,0,.1) | 弹出层 |
| shadow-lg | 0 8px 24px rgba(0,0,0,.15) | 模态框 |

---

## 4. Screen Architecture（页面骨架）

**Page Shell**：
- 顶部导航高度：
- 侧边栏宽度（若有）：
- 主内容最大宽度：
- 主内容左右 padding：

**First-view scan order**：

**模块分组规则**：

---

## 5. 数据型页面规则

### 5.1 Dashboard
- KPI 卡数量上限：
- 图表与表格相对优先级：
- 颜色映射规则：

### 5.2 Data Table
- 行高：compact / standard（  px）
- Header 样式：
- 工具栏规则：
- 空态/加载态/错态：

### 5.3 Form
- Label 位置：顶部 / 左侧
- 错误信息位置：字段下方
- 一列 / 两列条件：

### 5.4 Detail
- 标题区结构：
- 元数据摘要区：
- 返回与面包屑规则：

---

## 6. 状态与反馈视觉表达

| 状态 | 视觉表达 | 颜色/图标 |
|------|---------|---------|
| loading | skeleton / spinner | - |
| empty（正常空态） | 插图 + 说明文字 | gray |
| error | 错误图标 + 文字 + 重试 | semantic.error |
| 无权限 | 锁图标 + 说明 | gray |
| 待同步/未初始化 | 时钟图标 + 说明 | warning |
| 未分类（fallback） | 灰色 badge | gray |
| success | 绿色 toast / inline | semantic.success |
| warning | 黄色 banner / badge | semantic.warning |

---

## 7. 组件级规则

| 组件 | Variant | Size | 状态 | 备注 |
|------|---------|------|------|------|
| Button | primary/secondary/ghost/danger | sm/md/lg | default/hover/active/disabled/loading | - |
| Input | default/error | sm/md | default/focus/error/disabled | - |
| Badge/Tag | ... | ... | ... | - |

---

## 8. Design-to-Code Handoff

### 8.1 给飞书妙搭
-

### 8.2 给 Cowork / 前端工程
- Token 进入 theme 的方式：
- 哪些值禁止写死：
- 哪些组件需封装：

### 8.3 给设计系统维护
- 需新增 token：
- 需新增 primitives：

### 8.4 给测试/审查
- 最容易视觉漂移的页面：
- 必须做 screenshot diff 的状态：

---

## 9. 自检结果

- [ ] 无明显模板感
- [ ] 信息层级清楚
- [ ] list / detail / dashboard 像同一产品
- [ ] density 可解释
- [ ] token 足够支撑页面
- [ ] 空态/错态/fallback 视觉区分清楚
- [ ] 不只做首屏，系统页面也覆盖

---

*此模板由 `frontend-design` skill 提供。*
