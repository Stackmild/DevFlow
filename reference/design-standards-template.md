# DevFlow 设计规范模板

> 本文档是 DevFlow 级通用设计规范模板。
> Orchestrator 在 Phase C 构造 frontend-design handoff 时读取本文档，作为基础约束。
> **用户可根据团队风格自定义**——本文档的约定是起点，不是强制。

---

## 1. Design Token 命名规范

### 颜色（Color）

```
color-primary           # 主色（品牌色/主按钮/链接）
color-secondary         # 辅色
color-accent            # 强调色（高亮/角标）
color-background        # 页面背景
color-surface           # 卡片/面板背景
color-border            # 边框/分割线
color-text-primary      # 主体文字
color-text-secondary    # 次要文字/说明
color-text-disabled     # 禁用态文字
color-error             # 错误/危险
color-warning           # 警告
color-success           # 成功/完成
color-info              # 信息/中性提示
```

### 间距（Spacing）

```
spacing-xs   # 4px
spacing-sm   # 8px
spacing-md   # 16px
spacing-lg   # 24px
spacing-xl   # 32px
spacing-2xl  # 48px
```

### 字体（Typography）

```
font-size-xs     # 12px
font-size-sm     # 14px
font-size-base   # 16px
font-size-lg     # 18px
font-size-xl     # 20px
font-size-2xl    # 24px
font-size-3xl    # 30px

font-weight-regular  # 400
font-weight-medium   # 500
font-weight-semibold # 600
font-weight-bold     # 700

line-height-tight    # 1.25
line-height-normal   # 1.5
line-height-relaxed  # 1.75
```

### 圆角（Border Radius）

```
radius-sm   # 4px
radius-md   # 6px
radius-lg   # 8px
radius-xl   # 12px
radius-full # 9999px（胶囊/圆形）
```

### 阴影（Shadow）

```
shadow-sm   # 微弱阴影（悬浮卡片）
shadow-md   # 中等阴影（下拉菜单）
shadow-lg   # 较重阴影（模态框）
```

---

## 2. 组件分层原则

```
Primitive（原子）
  ↓
Foundation（基础组件）
  ↓
Composite（复合组件）
  ↓
Page Pattern（页面模式）
```

| 层级 | 说明 | 示例 |
|------|------|------|
| **Primitive** | 最小 UI 单元，无业务逻辑 | Button, Input, Badge, Icon |
| **Foundation** | 由 Primitive 组合，有特定语义 | FormField, Card, Modal, Toast |
| **Composite** | 有业务上下文，依赖数据 | UserSelect, StatusBadge, DataTable |
| **Page Pattern** | 页面级模式，定义布局和流程 | ListDetailLayout, WizardLayout |

---

## 3. 常见 UI 规则模板

### 表单错误展示
- 字段级错误：紧贴输入框下方，红色小字（font-size-sm, color-error）
- 全局错误：表单顶部 Alert 组件
- 实时验证：失焦时触发，不在输入过程中打断

### 空态（Empty State）
- 必须有：图标/插画 + 说明文字 + 操作入口（如适用）
- 说明文字说"怎么开始"，不说"没有数据"

### Loading 态
- 局部 loading：骨架屏（Skeleton）优于 Spinner
- 全局 loading：顶部进度条
- 操作 loading：按钮禁用 + 加载指示（不用全屏遮罩）

### 模态框（Modal）
- 确认类操作：宽度 400-480px，主操作按钮在右侧
- 内容展示类：宽度可达 720px，有关闭按钮
- 嵌套模态：原则上避免，如需要则覆盖层级递增

### 分页 vs 无限滚动
- 管理类列表（增删改查）：分页
- 信息流/动态：无限滚动
- 数据导出类：分页 + 批量选择

---

## 4. VISUAL-SYSTEM.md 结构模板

项目级 `VISUAL-SYSTEM.md` 应包含以下章节（由 frontend-design skill 首次产出）：

```markdown
# {项目名} 视觉规范

## 设计路线
[说明选择了哪种视觉风格及原因]

## Design Tokens
### 颜色系统
### 间距系统
### 字体系统
### 圆角与阴影

## 组件视觉规则
### 按钮
### 表单元素
### 卡片/面板
### 导航

## 页面级规则
### 布局密度
### 响应式断点
### 暗色模式（如适用）

## 版本记录
| 版本 | 任务 | 变更摘要 |
|------|------|---------|
| v1.0 | {task_id} | 初版 |
```

---

## ⚠️ 用户自定义区域

> 以下内容留空，由用户根据团队/产品实际情况填写。

### 品牌色值

```
# 替换为你的实际色值
color-primary: #______
color-secondary: #______
```

### 字体栈

```
# 替换为你使用的字体
font-family-sans: ______
font-family-mono: ______（代码块）
```

### 团队约定

> 在这里记录团队特有的设计约定，例如：
> - 所有内部工具统一使用 dense 密度
> - 主色使用公司品牌色 X
> - 不使用圆形头像，统一使用方形圆角
