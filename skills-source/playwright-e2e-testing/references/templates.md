# M. 模板文件清单（11 个）

## 视觉回归测试模板（8 个原有）

| 文件 | 用途 |
|------|------|
| `playwright.config.template.ts` | Playwright 配置（project matrix + toHaveScreenshot + reporter） |
| `page-visual-states.template.spec.ts` | D 章节 visual states 矩阵 + stabilize 两阶段调用 |
| `component-screenshot.template.spec.ts` | 组件级元素截图 + T1-T6 命名约定 |
| `layering-occlusion.template.spec.ts` | E1-E5 所有检测项骨架 |
| `test-scene-fixtures.template.ts` | 高对比背景注入（`injectContrastBackground` 等） |
| `scroll-stability.template.spec.ts` | R 章节 `scrollVertical/scrollHorizontal` + start/mid/end |
| `self-audit.template.ts` | Layer 1 grep 脚本 + Layer 2 语义复核提示 |
| `findings-report.template.md` | YAML 报告 + Markdown 报告模板 |

## 功能测试模板（3 个新增）

| 文件 | 用途 | 对应章节 |
|------|------|---------|
| `interaction.template.spec.ts` | 交互测试骨架：用户操作 + 状态变更 + 数据持久化验证 | Db1 |
| `data-correctness.template.spec.ts` | 数据正确性测试：API mock 响应内容 + 字段渲染一致性验证 | Db2 |
| `design-compliance.template.spec.ts` | 设计合规测试：CSS token 精确匹配 + 元素尺寸/间距验证 | Db3 |

### `interaction.template.spec.ts` 骨架

```typescript
// @ts-check
import { test, expect } from '@playwright/test';

test.describe('${ComponentName} — interaction @interaction', () => {
  test.beforeEach(async ({ page }) => {
    // Step 1: Freeze time + seed random (stabilizeBeforeNavigation)
    // Step 2: Navigate + wait for sentinel
    // Step 3: stabilizeAfterLoad
  });

  test('happy path: ${action} → ${expected state}', async ({ page }) => {
    // Arrange: set up precondition
    // Act: perform user action (click/type/select)
    // Assert: verify UI state changed
    await expect(page.locator('...')).toBeVisible();
    // Assert: verify data persisted (re-fetch or check DOM)
    await expect(page.locator('...')).toHaveText('...');
    // Visual: capture final state
    await expect(page.locator('...')).toHaveScreenshot('${comp}-after-${action}-desktop.png');
  });

  test('error path: ${invalid action} → error shown', async ({ page }) => {
    // Act: trigger invalid state
    // Assert: error message visible
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('...');
  });
});
```

### `data-correctness.template.spec.ts` 骨架

```typescript
import { test, expect } from '@playwright/test';

test.describe('${ComponentName} — data correctness @data', () => {
  test('renders correct field values from API response', async ({ page }) => {
    // Mock API with known fixture data
    await page.route('**/api/...**', route => route.fulfill({
      json: { /* known fixture */ }
    }));
    await page.goto('...');
    // Verify each critical field renders correctly
    await expect(page.getByTestId('field-name')).toHaveText('expected value');
    await expect(page.getByTestId('field-date')).toHaveText('2026-01-01');
    // Verify count/aggregate fields
    await expect(page.getByTestId('count-badge')).toHaveText('3');
  });

  test('search filters results correctly', async ({ page }) => {
    // Type search term
    await page.getByRole('searchbox').fill('search term');
    await page.waitForTimeout(300); // debounce
    // Verify only matching results shown
    const items = page.locator('[data-testid="list-item"]');
    await expect(items).toHaveCount(2);
    await expect(items.first()).toContainText('search term');
  });
});
```

### `design-compliance.template.spec.ts` 骨架

```typescript
import { test, expect } from '@playwright/test';

test.describe('${ComponentName} — design compliance @design', () => {
  test('button uses primary color token', async ({ page }) => {
    await page.goto('...');
    const btn = page.getByRole('button', { name: '...' });
    const bg = await btn.evaluate(el =>
      getComputedStyle(el).backgroundColor
    );
    // Exact match — no toBeTruthy()
    expect(bg).toBe('rgb(59, 130, 246)'); // primary token value
    // Visual confirmation
    await expect(btn).toHaveScreenshot('btn-primary-desktop.png');
  });

  test('card uses correct border-radius token', async ({ page }) => {
    await page.goto('...');
    const card = page.locator('[data-testid="section-card"]').first();
    const radius = await card.evaluate(el =>
      getComputedStyle(el).borderRadius
    );
    expect(radius).toBe('18px'); // --radius-card
  });

  test('label uses text-sm font-medium', async ({ page }) => {
    await page.goto('...');
    const label = page.locator('label').first();
    const fontSize = await label.evaluate(el => getComputedStyle(el).fontSize);
    const fontWeight = await label.evaluate(el => getComputedStyle(el).fontWeight);
    expect(fontSize).toBe('14px');  // text-sm
    expect(fontWeight).toBe('500'); // font-medium
  });
});
```
