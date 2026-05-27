---
name: playwright-e2e-testing
description: Playwright E2E 视觉与功能测试执行协议 v4。为 Web App 编写、运行、审计 Playwright 测试，强制覆盖 critical visual states 矩阵、layering/occlusion 专项、高对比背景场景、交互/数据/设计合规/负向路径四维功能测试，通过 self-audit gate 阻断弱断言与伪通过测试。所有视觉验证必须使用 toHaveScreenshot() baseline 比对，禁止用 getComputedStyle 替代视觉真相。先复用现有 e2e 资产，缺失时补建。
triggers:
  - playwright 测试
  - e2e 测试
  - 端到端测试
  - 视觉回归测试
  - visual regression
  - screenshot 测试
  - toHaveScreenshot
  - 截图对比
  - layering 测试
  - occlusion 测试
  - 透明度 bug
  - overlay 测试
  - sticky 测试
  - 视觉状态矩阵
  - baseline 管理
  - 视觉 bug
  - bleed-through
  - 交互测试
  - 功能测试
---

# Playwright E2E Testing Skill — 执行协议 v4

## A. Skill 使命

**执行协议**，不是原则说明。按 G 章节六阶段流程执行，产出可运行测试代码、baseline 文件、YAML 报告和缺陷分类结论。

**核心教训 1（视觉）**：AM Hub 54/54 功能测试通过，但预览面板背景 92% 透明上线。根因：`expect(bg).toBeTruthy()` 对 `rgba(0,0,0,0)` 也通过；`getComputedStyle` ≠ 渲染真相；无任何 `toHaveScreenshot()` 测试。

**核心教训 2（功能）**：AM Hub Todo 功能上线后发现三类 bug，均未被 Playwright 测试拦住。根因：全部测试为视觉截图，无交互操作、无数据内容验证、无设计合规检查、无负向路径测试。

---

## B. 适用场景

**适合**：内部 Web App / Dashboard / 管理后台 / AI-native 工具；含 overlay / drawer / modal / sticky / fixed 等 layering 组件；需要 mobile + desktop 双断点视觉覆盖。

**不适合**：纯后端 API 测试、性能压测、安全渗透测试。

---

## C. 禁止模式、反模式与 Self-Audit Gate

### C1. 绝对禁止的断言模式

| 禁止模式 | 为什么禁止 | 正确替代 |
|---------|----------|---------|
| `expect(cssValue).toBeTruthy()` | `"rgba(0,0,0,0)"` 通过 = 透明背景放行 | `expect(cssValue).toBe('rgb(255,255,255)')` + `toHaveScreenshot()` |
| `expect(true).toBe(true)` | 永远通过 = 伪测试 | 写真实断言或删除 |
| 只用 `getComputedStyle` 判断视觉 | 不考虑层叠/遮挡/overflow | 必须搭配 `toHaveScreenshot()` |
| `page.screenshot()` 存图不比对 | 无回归检测 | `expect(page).toHaveScreenshot('name.png')` |
| `.catch(() => false)` 静默失败 | 错误被吞 | 让错误冒泡或 `test.fail()` |
| Tailwind v4 多跳 CSS var 链在 `evaluate()` 中 | `--color-background → --background → --bg-app` 链返回 `rgba(0,0,0,0)`（C-019 实证） | `toHaveScreenshot()` + E4；禁止依赖 `getComputedStyle` 解析两跳以上 CSS var |
| 只做截图不做交互验证 | CRUD 操作、状态变更、数据持久化不可见 | 操作 + 验证 DOM 变化 + 截图（见 Db1） |
| 只截图不验证 DOM 字段内容 | 组件渲染但显示错误数据不可见 | `toHaveText()` / `toContainText()` 精确匹配（见 Db2） |
| 跳过错误路径测试 | 错误状态 UI 破损、无法恢复的路径无法发现 | 必须覆盖 error/invalid input/边界值（见 Db4） |

### C2. 反模式（已有但未在 C1 中列出的）

| 反模式 | 后果 | 正确做法 |
|--------|------|---------|
| 只测 default 状态 | 漏掉 loading/empty/overlay/scroll | 覆盖 D 章节矩阵 |
| 全页截图不做元素级截图 | 微小变化被 threshold 吞掉 | 对关键组件单独 `toHaveScreenshot()` |
| 盲目 `--update-snapshots` | Real bug 被 baseline 掩盖 | 遵守 L 章节治理规则 |
| 搜索测试只触发不验证结果 | 搜索逻辑错误但列表"有内容"不可见 | 验证条目数 + 内容匹配（见 Db2） |

### C3. Self-Audit Gate — 双层机制

**执行时机**：写完所有测试后、提交/运行前。

**Layer 1 — Regex 快速拦截**

```bash
grep -rn 'getComputedStyle.*\.\(toBeTruthy\|toBeDefined\)' e2e/tests/
grep -rn 'expect(true)\.toBe(true)' e2e/tests/
grep -rn '\.catch.*=>.*false\|\.catch.*=>.*null' e2e/tests/
grep -rn 'page\.screenshot(' e2e/tests/ | grep -v 'toHaveScreenshot'
grep -rn '@interaction\|@data\|@design\|@negative' e2e/tests/ | wc -l  # P6: 必须 > 0
grep -rn 'test\.describe.*@' e2e/tests/ | grep -v '@visual\|@layering\|@interaction\|@data\|@design\|@negative'  # P7: 未标 tag = WARN
```

命中 P1-P5 任意一条即 **BLOCK**。P6 返回 0 = **BLOCK**（功能测试维度缺失）。P7 命中 = WARN。

**Layer 2 — 语义复核**：对 Layer 1 命中逐条检查上下文：`getComputedStyle` 若同一 test 中搭配了 `toHaveScreenshot()` → 降级 WARN；`toBeTruthy()` 的 x 若是非 CSS 值 → 放行。

**Gate 判定**：任意 BLOCK → 修复后重新审计。

### C4. 允许的辅助结构断言（不能替代 toHaveScreenshot）

| 类型 | 示例 | 用途 |
|------|------|------|
| Computed style 精确匹配 | `expect(bg).toBe('rgb(255,255,255)')` | 仅精确匹配，不允许 `toBeTruthy()` |
| Bounding box 稳定性 | `expect(box.x).toBeCloseTo(expected, 1)` | sticky 滚动前后坐标，必须搭配截图 |
| Overlay 后层不可点击 | 点击 overlay 后方元素应被拦截 | 验证 overlay 真正遮挡 |
| Body scroll lock | `document.body.style.overflow` 检查 | modal 打开后 body 不应滚动 |

---

## D. Critical Visual States 矩阵

### D1. 10 种 Visual State

| Visual State | 如何触发 | 截图命名约定 |
|-------------|---------|------------|
| `default` | 数据加载完成后 | `{page}-default-{viewport}.png` |
| `loading` | 拦截 API 不 fulfill | `{page}-loading-{viewport}.png` |
| `empty` | mock 返回空数组 | `{page}-empty-{viewport}.png` |
| `error` | mock 返回 500 | `{page}-error-{viewport}.png` |
| `populated` | 大量数据 mock | `{page}-populated-{viewport}.png` |
| `overlay-open` | 触发打开交互 | `{page}-overlay-open-{viewport}.png` |
| `scroll-mid` | `scrollTop = maxScroll/2` | `{page}-scroll-mid-{viewport}.png` |
| `scroll-end` | `scrollTop = maxScroll` | `{page}-scroll-end-{viewport}.png` |
| `mobile-narrow` | viewport 390x844 | `{page}-{state}-mobile.png` |
| `desktop-wide` | viewport 1440x900 | `{page}-{state}-desktop.png` |

### D2. 每个被测页面最低覆盖要求

- `default` × 2 viewports（desktop + mobile）
- `loading` × 1
- `empty` × 1（若有空状态）
- `error` × 1（若有错误状态）
- `overlay-open` × 2 viewports（若有 overlay）
- `scroll-mid` × 1（若页面可滚动）

---

## Db. 功能测试矩阵（四维）

> 模板见 `references/templates.md` 中的 `interaction/data-correctness/design-compliance.template.spec.ts`。

### Db1. 交互测试（@interaction）

**最低要求**：每个带用户操作的功能点覆盖 happy path。

| 必须覆盖 | 断言方式 |
|---------|---------|
| 创建/提交操作 → 列表出现新项目 | `toContainText()` 匹配新项内容 |
| 编辑操作 → 字段更新反映在 DOM | `toHaveText()` 精确匹配更新值 |
| 删除操作 → 项目从列表消失 | `not.toBeVisible()` 或 count 减少 |
| 状态切换（toggle/tab）→ 内容变化 | 切换前后 DOM 状态断言 + 截图 |
| 搜索/筛选操作 → 结果变化 | 结果条数 + 至少一条内容匹配 |

**可选（推荐）**：操作后截图捕获最终状态（`{comp}-after-{action}-{vp}.png`）。

### Db2. 数据正确性验证（@data）

**最低要求**：每个关键数据渲染点用 mock fixture 固定数据，验证 DOM 显示值与 fixture 一致。

| 必须覆盖 | 断言方式 |
|---------|---------|
| API 返回字段 → 组件 DOM 显示 | `toHaveText(fixture.fieldValue)` |
| 列表条目数 | `toHaveCount(fixture.items.length)` |
| 搜索结果匹配 | 搜索词 → 返回结果中包含该词 |
| 空状态文案 | `toContainText('暂无数据')` 或实际文案 |
| 错误信息文案 | `toContainText(expectedErrorMessage)` |

**禁止**：`expect(await page.locator('...').count()).toBeGreaterThan(0)` — 无法验证内容。

### Db3. 设计合规验证（@design）

**最低要求**：Design token 关键属性精确匹配（不允许 `toBeTruthy()`）。

| 必须覆盖 | 断言方式 |
|---------|---------|
| 主按钮颜色 = primary token | `expect(bg).toBe('rgb(59, 130, 246)')` |
| 卡片圆角 = `--radius-card` (18px) | `expect(radius).toBe('18px')` |
| 表单 Label 字号 = text-sm (14px) | `expect(fontSize).toBe('14px')` |
| 表单 Label 字重 = font-medium (500) | `expect(fontWeight).toBe('500')` |

**注意**：CSS token 精确匹配断言必须同时配合 `toHaveScreenshot()` — 防止 token 错误绕过视觉检测。

### Db4. 负向路径测试（@negative）

**最低要求**：每个表单/操作覆盖至少一条 error path。

| 必须覆盖 | 断言方式 |
|---------|---------|
| 必填字段为空时提交 | 错误提示可见 + `toContainText()` |
| 超长输入 / 特殊字符 | 组件不崩溃 + 显示截断或提示 |
| API 返回 500 时 | Error State 组件可见 + 截图 |
| 网络超时时 | loading 或 error 状态 + 截图 |
| 操作无权限时 | 权限提示可见（若有权限模型） |

---

## E. Layering / Occlusion / Sticky 专项

### E1. Sticky / Fixed 完全遮挡下层

滚动使元素重叠 → 元素级截图不透出下方 → bounding box `|Δx| < 2px`。

### E2. Overlay / Drawer / Modal 实色背景

打开后元素级截图不透出后方内容 → **必须搭配 E4 高对比背景**。

### E3. 滚动无露底/无闪烁

横纵滚动各位置 sticky 元素坐标不变。使用 `references/scroll-spec.md` 的确定位置（start/mid/end）。

### E4. 高对比背景

放大透明/遮挡问题。使用 `test-scene-fixtures.template.ts` 的 `injectContrastBackground()`。

**必须使用的场景**：Preview Panel / Modal / Drawer / Sticky 列与行重叠 / Sticky 表头与行重叠。

### E5. Z-index 穿透验证

打开 overlay → 点击后方元素 → 点击不应穿透 → 关闭 → 后方恢复交互。

**Contrast Background 规则**：

| CB1 | overlay / sticky / fixed panel 默认预期 opaque（实色） |
| CB2 | 半透明 glass 效果必须在输入中显式声明 `translucent: true` |
| CB3 | 未声明时 bleed-through → 一律 Real Bug |
| CB4 | 声明为 translucent 的组件仍需高对比截图，判定透出程度是否符合设计意图 |

---

## G. 执行工作流（六阶段）

**必需输入**：App URL、页面清单。建议输入：component 清单、是否允许更新 baseline、mock data 入口、viewport matrix、已知 UI 变更说明、translucent 组件声明。

### Pre-flight（三项 BLOCK 级检查，失败则先修复）

**PF-1 `test-index.css`**：首行必须是 `@import 'tailwindcss';`，否则 spacing/sizing 变量注入失败 → skeleton 骨架为 0 尺寸。

**PF-2 路由注册**：对照 SMOKE_ROUTES 清单逐条确认 `test-app.tsx` 有对应 `<Route>`（手工维护，不自动同步）。

**PF-3 Sentinel 唯一性**：等待"页面已加载"的文本/selector 不得出现在全局 sidebar/nav 中（sidebar 跨路由持久渲染，会先于页面挂载触发）。

### Step 0. 环境准备 + 现有资产审计

扫描：playwright.config、snapshot 目录、fixture、mock 数据、dev server、CI 入口、shims。优先复用，不默认新起。最后执行 harness smoke check：`setContent` 红色方块 → `toHaveScreenshot('harness-smoke.png')`，失败则先修复。

新增文件命名：`{page}.visual.spec.ts` / `.layering.spec.ts` / `.interaction.spec.ts` / `.data.spec.ts`。

### Step 1. 构建测试矩阵

列出被测页面和组件，标记 D 章节哪些 state 适用（视觉矩阵）+ Db1-Db4 各维度适用项（功能矩阵）。

### Step 2. 编写测试

按优先级：
- **P0**：Layering/Occlusion + 高对比背景（E 章节）
- **P1**：Visual `default` + `overlay-open` × 2 viewports
- **P1**：交互 happy path（Db1）
- **P2**：数据正确性验证（Db2）+ loading/empty/error 状态
- **P2**：负向路径（Db4）
- **P3**：设计合规（Db3）+ mobile viewport 补充

Sentinel 选择：优先页面内部唯一副标题/业务数据文本 → 其次 `data-testid` → 禁止全局 nav 文本。

### Step 3. Self-Audit Gate（C 章节双层）

发现 BLOCK → 修复 → 重新审计。

### Step 4. 运行测试 & 建立 Baseline

首次（用户明确允许）：`npx playwright test --update-snapshots`，**提交前逐张人工目视检查**（L10 规则）。后续：`npx playwright test`。

### Step 5. 失败分类（K 章节）

Harness Instability / Legitimate UI Change / Real Bug 三类。

### Step 6. 输出报告

按 `references/yaml-schema.md` schema 输出 `artifacts/e2e-visual-test-report.yaml`，填写 Q 章节 DoD。

---

## I. 输出契约

> 输出到 `artifacts/e2e-visual-test-report.yaml`，完整 schema 见 `references/yaml-schema.md`。所有字段必须存在，空值填 `null` 或 `[]`。新增字段：`interaction_coverage`（Q9-Q12 对应）。

---

## J. Playwright 配置 + 稳定化

> 详见 `references/stabilization.md`。包含：expect 配置、`stabilizeBeforeNavigation` / `stabilizeAfterLoad` 两阶段代码、等待优先级（signal > fonts > networkidle > timeout≤200ms）、Mask 硬规则（M1-M5）。

---

## K. 失败分类与处理分流

| 分类 | 定义 | 允许 | 禁止 |
|------|------|------|------|
| **Harness Instability** | 测试环境问题（动画/字体/timing） | 修复稳定性 | 不准更新 baseline |
| **Legitimate UI Change** | 有意 UI 变更，有对应说明 | 可更新 baseline + 人工审阅 | 不准跳过人工审阅 |
| **Real Bug** | 非预期视觉/功能缺陷 | 记录 defect + 阻断 merge | 不准用 baseline 更新掩盖 |

判定流程：失败 → 仅特定 OS/CI？→ Harness。有已知变更说明？→ Legitimate → L 章节流程。否则 → Real Bug。

---

## L. Baseline 治理规则

| # | 规则 |
|---|------|
| L1 | **默认禁止自动更新** — `--update-snapshots` 不得在 CI 中自动执行 |
| L2 | **双条件才可更新** — (a) 用户明确允许 AND (b) 判定为 Legitimate UI Change |
| L3 | Before/After 对比 — 每次更新必须生成对比截图 |
| L4 | 变更说明 — 每个被更新的 baseline 必须附文字说明 |
| L5 | 分设备管理 — mobile 和 desktop baseline 分开，不互相覆盖 |
| L6 | 版本控制 — baseline 文件纳入 git，通过 PR review |
| L7 | 未被分类为 Legitimate UI Change 的失败，禁止更新 baseline |
| L8 | 未经用户明确允许，禁止执行 `--update-snapshots` |
| L9 | 修测试过程中禁止"顺手刷新 baseline" |
| L10 | **首批 baseline 强制人工视觉审查**：骨架有高度、overlay 背景实色、每张截图反映预期 state。任意存疑 → 修复根因 → 清空重建 |

---

## M. 模板文件清单

> 共 11 个，详见 `references/templates.md`。包含：8 个原有视觉回归模板 + 3 个新增功能测试模板（`interaction/data-correctness/design-compliance.template.spec.ts`）。

---

## N. AM Hub 定制覆盖

> 项目特定的 13 个关键组件列表、T1-T6 截图类型、5 个高优组件矩阵、现有测试弱断言迁移表，见 `references/am-hub-coverage.md`。

---

## P. 一句话原则

> 视觉正确性的唯一证据是像素级比对，不是 computed style 检查；功能正确性的唯一证据是操作后 DOM 状态验证，不是截图通过；每个 overlay 必须在高对比背景上验证；每个 baseline 变更必须有人工审阅。

---

## Q. Definition of Done

任意条件未满足 → `completion_status: INCOMPLETE`。验证函数见 `references/dod-validator.ts`。

| # | 条件 | YAML 验证字段 |
|---|------|-------------|
| Q1 | Self-Audit Gate Layer1+Layer2 均通过 | `self_audit.layer1_grep_result=PASS` AND `layer2_semantic_result≠BLOCK` |
| Q2 | D 章节 required visual states 覆盖完成 | 每个页面 T1_default ≠ SKIP，overlay 适用时 T6_overlay ≠ SKIP |
| Q3 | E 章节 layering/occlusion 专项执行完成 | 至少 E1+E2+E4 的测试存在且已运行 |
| Q4 | N 章节 AM Hub 高优组件覆盖完成（如适用） | `am_hub_coverage_map` 5 个高优组件每项非 N/A 均有结果 |
| Q5 | YAML + Markdown 报告产出完成 | `reporter` 和 `execution_date` 字段存在 |
| Q6 | 所有失败已按 K 章节分类 | `test_summary.failed` ≤ 三类之和 |
| Q7 | Baseline 更新符合 L 章节治理规则 | `baselines_updated` 每条有 `justification.reason` |
| Q8 | merge_recommendation 已明确 | 值为 `ALLOW` 或 `BLOCK` 且附 reason |
| Q9 | 交互测试（Db1 happy path）覆盖完成（如适用） | `interaction_coverage[*].happy_path ≠ N/A` 至少一条 |
| Q10 | 数据正确性验证（Db2）覆盖完成（如适用） | `interaction_coverage[*].search_data_verify ≠ N/A` 至少一条 |
| Q11 | 设计合规验证（Db3）覆盖完成（如适用） | `interaction_coverage[*].design_compliance ≠ N/A` 至少一条 |
| Q12 | 负向路径测试（Db4）覆盖完成（如适用） | `interaction_coverage[*].error_path ≠ N/A` 至少一条 |
