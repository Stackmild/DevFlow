# N. AM Hub 定制覆盖

## N1. 13 个关键组件列表

| # | 组件 | 文件路径 | 风险级 |
|---|------|---------|-------|
| 1 | CompanyMaster 整页 | `pages/CompanyMaster/CompanyMaster.tsx` | High |
| 2 | CompanyPreview Panel | `CompanyMaster/components/CompanyPreview.tsx` | **Critical** |
| 3 | CompanyRow | `CompanyMaster/components/CompanyRow.tsx` | Medium |
| 4 | InsightsToolbar | `CompanyMaster/components/InsightsToolbar.tsx` | High |
| 5 | FinancialTimeSeries 整页 | `pages/FinancialTimeSeries/FinancialTimeSeries.tsx` | High |
| 6 | AnnualTrendTable | `FinancialTimeSeries/components/AnnualTrendTable.tsx` | **Critical** |
| 7 | TrendCharts | `FinancialTimeSeries/components/TrendCharts.tsx` | Medium |
| 8 | StatRow | `ui/stat-row.tsx` | Medium |
| 9 | EmptyState | `ui/state-panels.tsx` | Low |
| 10 | ErrorState | `ui/state-panels.tsx` | Low |
| 11 | Layout/Sidebar | `components/Layout.tsx` | Medium |
| 12 | SectionCard | `ui/section-card.tsx` | Low |
| 13 | PageHeader | `ui/page-header.tsx` | Low |

## N2. 截图类型（T1-T6）

| # | 截图类型 | 命名约定 | 说明 |
|---|---------|---------|------|
| T1 | Component Default | `{comp}-default-{vp}.png` | 组件默认状态，元素级 |
| T2 | High-Contrast Background | `{comp}-contrast-bg-{vp}.png` | 注入条纹背景，检测透明 |
| T3 | In-Scroll | `{comp}-scroll-{pos}-{vp}.png` | pos = start/mid/end |
| T4 | Mobile Breakpoint | `{comp}-default-mobile.png` | 390x844 |
| T5 | Desktop Full-Context | `{comp}-full-context-desktop.png` | 1440x900，含周围上下文 |
| T6 | Overlay Open | `{comp}-overlay-open-{vp}.png` | overlay/drawer 打开状态 |

## N3. 5 个高优组件 × 全部截图类型

| 组件 | T1 | T2 | T3 | T4 | T5 | T6 |
|------|----|----|----|----|----|----|
| CompanyPreview Panel | ✓ | **必须** | ✗ | ✓ | ✓ | **必须** |
| AnnualTrendTable sticky 指标列 | ✓ | **必须** | **必须** | ✓ | ✓ | ✗ |
| AnnualTrendTable sticky 表头 | ✓ | **必须** | **必须** | ✓ | ✓ | ✗ |
| FTS 横向滚动表格 | ✓ | ✗ | **必须** | ✓ | ✓ | ✗ |
| InsightsToolbar 吸顶 | ✓ | ✗ | **必须** | ✓ | ✓ | ✗ |

## N4. 现有测试迁移（弱断言修复）

| 现有 test | 问题 | 改法 |
|-----------|------|------|
| `[16.4] preview panel background` | `expect(bg).toBeTruthy()` | `expect(bg).not.toBe('rgba(0,0,0,0)')` + `toHaveScreenshot()` |
| `[7.6] sticky column has opaque background` | 只查 computed style | 加 `toHaveScreenshot()` + 高对比背景 |
| `[7.6] horizontal scroll...` | 只查 boundingBox | 加滚动中 `toHaveScreenshot()` |
| `page takes screenshot for visual review` (×2) | `page.screenshot()` 无比对 | `expect(page).toHaveScreenshot()` |
| 多处 `expect(true).toBe(true)` | 无效断言 | 改为真实断言 |
