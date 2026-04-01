# Cowork ↔ 飞书妙搭协作手册

> **版本**: v1.0
> **创建日期**: 2026-03-31
> **适用范围**: 所有 Cowork 产出代码 → 飞书妙搭构建发布的项目（不限于 AM Hub）
> **目的**: 沉淀首次 Cowork ↔ 飞书妙搭协作中暴露的陷阱和最佳实践，供后续项目复用。

---

## 1. 协作模式概述

### 角色分工

| 角色 | 职责 | 工具 |
|------|------|------|
| **用户（PM / 业务方）** | 提需求、验收、在飞书妙搭上传代码 | 飞书妙搭 IDE |
| **Cowork（AI 编码助手）** | 产出完整代码、生成上传指令 | Claude Code Agent |
| **飞书妙搭（云端构建）** | 接收代码、编译构建、发布部署 | Rspack + 飞书云端 |

### 典型工作流

```
1. 用户在 Cowork 中描述需求
2. Cowork 在本地 workspace 产出代码
3. Cowork 生成"飞书妙搭指令"（改动描述 + 具体代码 + 检查点）
4. 用户将指令粘贴给飞书妙搭
5. 飞书妙搭执行修改 → 构建 → 发布
6. 用户在发布后验证
7. 发现问题 → 回到步骤 1
```

### 关键约束

- **Cowork 不能直接推送代码到飞书妙搭**——必须经用户中转
- **飞书妙搭有自己的文件系统**——可能与本地 workspace 有差异
- **构建环境是 Rspack**——某些 Webpack 特性不完全兼容

---

## 2. 指令编写规范

### 指令结构模板

每条给飞书妙搭的指令必须包含三部分：

```markdown
## 改动 N: [简要描述]

### 目标文件
`client/src/pages/XXX/XXX.tsx`

### 改动说明
[用自然语言描述要做什么，为什么]

### 具体代码
找到这段代码：
​```tsx
// 现有代码（用于定位）
​```

替换为：
​```tsx
// 新代码
​```

### 检查点
- [ ] 构建通过无报错
- [ ] 页面 X 功能 Y 正常
- [ ] 移动端布局正确
```

### 编写原则

1. **定位优先**：先给出"找到这段代码"，让飞书妙搭能准确定位修改位置
2. **上下文充足**：定位代码至少包含前后 2–3 行上下文，避免歧义
3. **一次一文件**：每个改动块只涉及一个文件，多文件改动拆成多个块
4. **检查点明确**：每个改动后面跟验证步骤，飞书妙搭可据此自检
5. **不假设状态**：不能假设飞书妙搭记得上次的改动——每条指令自包含

### 常见错误

- 只给"把 X 改成 Y"但不给定位代码 → 飞书妙搭可能改错位置
- 给整个文件而非 diff → 飞书妙搭丢失自己之前的修改
- 多个文件混在一条指令里 → 容易漏改

---

## 3. 编码陷阱

### 3.1 Unicode 转义不可用

**问题**：飞书妙搭的 Rspack 构建**不处理** JS 字符串中的 `\uXXXX` 转义序列。

```tsx
// 错误 — 构建后显示为乱码
const label = '\u5168\u90E8';

// 正确 — 使用真实 UTF-8 字符
const label = '全部';
```

**二次坑**：用正则批量替换 `\uXXXX` 时，如果替换逻辑有残余反斜杠，会产生 `\收\入` 这样的双反斜杠字符。需要二次清理：

```python
# 第一步：\uXXXX → 真实字符
re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), content)

# 第二步：清理残余反斜杠 + 中文字符
re.sub(r'\\([\u0100-\uffff])', r'\1', content)
```

**规则**：所有中文字符串必须使用真实 UTF-8 字符，不使用 Unicode 转义。

### 3.2 模板字面量中的中文

```tsx
// 安全 — 模板字面量中的中文没问题
const msg = `共 ${count} 家公司`;

// 但注意：如果模板字面量被压缩工具处理，中文可能被转义
// 确保 Rspack 配置中 minimize 不转义非 ASCII
```

### 3.3 Rspack 与 Webpack 的差异

飞书妙搭使用 Rspack（Rust 版 Webpack），以下功能可能不完全兼容：
- `require.context()` — 改用 `import.meta.glob()`（如果支持）或显式 import
- 某些 PostCSS 插件行为不同
- Source map 格式可能影响调试

---

## 4. 数据库命名约定

### 原则：以飞书已创建的为准

飞书妙搭的数据库表由用户在飞书平台上手动创建，**表名以飞书上的实际名称为准**。

```typescript
// 错误 — 按代码惯例自行命名
export const appCompanyMaster = pgTable('app_company_master', { ... });

// 正确 — 与飞书平台上的表名完全一致
export const companyMaster = pgTable('company_master', { ... });
```

### 检查清单

- [ ] 新增表前，先确认飞书平台上表是否已创建
- [ ] schema.ts 中的表名与飞书平台完全一致（区分大小写）
- [ ] 字段名与飞书表中列名一致
- [ ] 字段类型匹配（飞书的"数字"→ Drizzle 的 `integer` / `real`）

### 前缀惯例

如果项目需要区分数据来源，使用以下前缀：

| 前缀 | 含义 | 例子 |
|------|------|------|
| `source_` 或 `src_` | 外部同步的只读表 | `src_project`, `src_worklog` |
| `app_` | 本应用拥有的读写表 | `app_project_states` |
| 无前缀 | 飞书平台已创建的表（保持原名） | `company_master` |

**关键**：不要擅自给飞书已创建的表加前缀。

---

## 5. 常量 vs 硬编码

### 原则：所有可能变化的文案、标签从常量派生

```tsx
// 错误 — 硬编码中文标签
<PageHeader eyebrow="洞察" />

// 正确 — 从常量派生
const NAV_GROUP_LABELS = {
  workspace: '个人项目',
  insights: 'Insights',
  system: '系统',
} as const;

<PageHeader eyebrow={NAV_GROUP_LABELS[routeMeta.navGroup]} />
```

### 必须常量化的项目

| 类别 | 示例 | 常量位置 |
|------|------|---------|
| 导航分组标签 | "Insights"、"个人项目" | `routes.config.ts` |
| 页面标题 / 副标题 | "公司总览"、"财务趋势" | `routes.config.ts` |
| 业务状态枚举 | "回购潜力"/"预警"/"风险" | 独立 constants 文件 |
| 指标名称 | "Runway"、"人效健康度" | 独立 constants 文件 |
| 筛选选项 | Deal Leader 列表 | 独立 constants 文件或 API 返回 |

### 可以硬编码的项目

- 纯 UI 结构文案（如 placeholder "搜索公司…"）
- 一次性出现且不跨页面的说明文字
- 三方库的配置字符串

---

## 6. CSS Token 与样式规范

### 飞书构建环境的样式注意事项

1. **Inline style 优先级**：飞书构建对 Tailwind CSS 的处理与标准一致，但如果遇到样式覆盖问题，检查是否有全局样式污染
2. **CSS 变量作用域**：确保 CSS 变量在 `:root` 或正确的作用域声明，飞书构建不会自动提升变量

### 高频 Token 对照表

| 用途 | 正确 Token | 常见错误 Token | 区别 |
|------|-----------|--------------|------|
| 行 hover | `--hover-bg` | `--bg-subtle` | `--bg-subtle` 是白色半透明底色 |
| 行分隔线 | `--border-subtle` | `--content-glass-border` | Glass 边框是白色，不可见 |
| 选中态背景 | `--accent-soft` | `--accent-bg` | 语义不同 |
| Sticky 列背景 | `#ffffff` | `--content-glass-bg` | Glass 是半透明，sticky 必须不透明 |
| Overlay 遮罩 | `rgba(15,23,42,0.15)` | `--bg-subtle` | 遮罩需要特定半透明值 |
| 面板背景 | `--bg-surface-strong` | `--nested-glass-bg` | Drawer 背景必须不透明 |

### Tailwind 陷阱

```tsx
// 错误 — color-mix 在飞书环境可能不支持
className="bg-[color-mix(in_srgb,var(--accent-primary),transparent_92%)]"

// 正确 — 使用已定义的 token
style={{ backgroundColor: 'var(--accent-bg)' }}
```

---

## 7. 上传前检查清单

每次向飞书妙搭提交代码前，逐条确认：

### 编码
- [ ] 所有中文字符串使用真实 UTF-8，无 `\uXXXX` 转义
- [ ] 无 `\\中文` 双反斜杠残留
- [ ] 文件编码为 UTF-8（无 BOM）

### 依赖
- [ ] 新增的 npm 包已在指令中注明需安装
- [ ] 没有引入飞书妙搭环境不支持的 Node.js 原生模块
- [ ] import 路径与飞书妙搭的文件结构一致

### 数据库
- [ ] schema.ts 中的表名与飞书平台已创建的表名完全一致
- [ ] 新增表已在飞书平台上先创建
- [ ] 字段类型匹配

### 路由
- [ ] 新页面已在 `routes.config.ts` 注册
- [ ] 路由的 `navGroup` 正确
- [ ] 动态路由参数命名一致

### 样式
- [ ] 没有使用 `color-mix()`
- [ ] CSS 变量引用的 token 都已在 `tailwind-theme.css` 中声明
- [ ] inline style 中的 CSS 变量拼写正确（打错变量名不会报错，只会静默失效）

### 文案
- [ ] 无工程术语泄漏到 UI
- [ ] 同一术语全局一致
- [ ] 导航标签从 `NAV_GROUP_LABELS` 常量派生

---

## 8. 发布后验证清单

代码上传并由飞书妙搭构建发布后，执行以下验证：

### 功能验证
- [ ] 所有新增页面可正常访问（检查路由）
- [ ] 数据查询返回预期结果（检查 API 调用）
- [ ] 筛选、搜索、排序功能正常
- [ ] 点击/展开/关闭等交互正常
- [ ] 中文搜索（拼音输入）不触发逐键搜索

### 视觉验证
- [ ] 中文正确显示，无乱码
- [ ] 颜色 token 正确（hover/选中/分隔线）
- [ ] 布局不抖动
- [ ] Overlay / Drawer 面板正确遮罩和退出
- [ ] 移动端布局正确降级

### 数据验证
- [ ] Stats 统计数字正确且不受筛选影响
- [ ] 空值显示为 `—` 而非 "null" / "undefined" / "待补数据"
- [ ] 数字格式化正确（百分比、货币、倍数）

### 控制台检查
- [ ] 无 JS 报错
- [ ] 无 404 资源请求
- [ ] 无 CORS 错误
- [ ] 无废弃 API 警告

---

## 附录 A：问题来源索引

以下问题均来自 AM Hub Insights V1 的实际协作过程（2026-03）：

| 问题 | 章节 | 影响 |
|------|------|------|
| `\uXXXX` 转义未被构建处理 → 中文乱码 | §3.1 | P0 |
| 二次替换残余 `\收\入` | §3.1 | P0 |
| 表名 `app_company_master` vs 飞书 `company_master` | §4 | P1 构建失败 |
| eyebrow 硬编码"洞察"与 sidebar "Insights"不一致 | §5 | P1 视觉不一致 |
| `color-mix()` 在构建环境无法正确处理 | §6 | P2 样式丢失 |
| Settings 文案含"CSV 文件"等工程术语 | §7 文案检查 | P2 |
| 指令定位代码不够导致飞书妙搭改错位置 | §2 | P1 反工 |

---

## 附录 B：指令示例

### 好的指令

```markdown
## 改动 1: 修复公司行选中背景不覆盖 CTA 列

### 目标文件
`client/src/pages/CompanyMaster/components/CompanyRow.tsx`

### 改动说明
当前选中行的蓝色背景只覆盖到公司名和数字列，右侧"查看财务趋势"按钮没有蓝底。
原因：backgroundColor 设在了内层 div 而非最外层行容器。

### 具体代码
找到最外层行容器（大约第 45 行）：
​```tsx
<div
  className="flex items-center"
  style={{ padding: 'var(--space-sm) var(--space-lg)' }}
>
​```

替换为：
​```tsx
<div
  className="flex"
  style={{
    padding: 'var(--space-sm) var(--space-lg)',
    alignItems: 'stretch',
    backgroundColor: isSelected ? 'var(--accent-soft)' : undefined,
    cursor: 'pointer',
  }}
>
​```

同时确保所有子列 div 的 `backgroundColor` 已移除。

### 检查点
- [ ] 点击某行后，蓝色背景覆盖整行（含右侧 CTA）
- [ ] hover 状态同样覆盖整行
- [ ] 移动端布局不受影响
```

### 差的指令

```
把 CompanyRow 的选中背景改一下，现在 CTA 列没覆盖到。
```

（缺少：定位代码、具体改法、检查点）
