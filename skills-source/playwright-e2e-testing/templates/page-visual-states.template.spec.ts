// page-visual-states.template.spec.ts
// D 章节 Critical Visual States 矩阵测试骨架
// 复制到 e2e/tests/{page}.visual.spec.ts，替换 __PLACEHOLDER__

import { test, expect, type Page } from '../fixtures/mock-api';

const PAGE_URL = '__PAGE_URL__'; // e.g. '/insights/company-master'
const OVERLAY_TRIGGER = '__OVERLAY_TRIGGER__'; // 触发 overlay 的选择器

// ===== Stabilize helpers (J 章节两阶段) =====

/** 阶段 A：导航前调用（addInitScript 必须在 goto 前） */
async function stabilizeBeforeNavigation(page: Page) {
  await page.addInitScript(() => {
    const fixedDate = new Date('2026-01-01T00:00:00Z');
    Date = class extends Date {
      constructor(...args: any[]) { super(...(args.length ? args : [fixedDate])); }
      static now() { return fixedDate.getTime(); }
    };
  });
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  });
}

/** 阶段 B：页面加载后、截图前调用 */
async function stabilizeAfterLoad(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important; animation-delay: 0s !important;
      transition-duration: 0s !important; transition-delay: 0s !important;
      scroll-behavior: auto !important;
    }`,
  });
  await page.waitForTimeout(150); // fallback settle — not primary strategy
}

// ===== Desktop tests =====

test.describe('Visual States — Desktop @visual', () => {
  test.beforeEach(async ({ mockApi, page }) => {
    await stabilizeBeforeNavigation(page);
    await mockApi();
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');
    await stabilizeAfterLoad(page);
  });

  test('T1 default state [desktop]', async ({ page }) => {
    await expect(page).toHaveScreenshot('page-default-desktop.png', {
      maxDiffPixelRatio: 0.01,
      fullPage: true,
    });
  });

  test('T5 full context [desktop]', async ({ page }) => {
    await expect(page).toHaveScreenshot('page-full-context-desktop.png', {
      maxDiffPixelRatio: 0.01,
      fullPage: false, // viewport only for context shots
    });
  });

  test('T6 overlay open state [desktop]', async ({ page }) => {
    if (!OVERLAY_TRIGGER) { test.skip(true, 'No overlay trigger defined'); return; }
    await page.locator(OVERLAY_TRIGGER).first().click();
    await page.waitForSelector('[role="complementary"], [role="dialog"]', { timeout: 5000 });
    await expect(page).toHaveScreenshot('page-overlay-open-desktop.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});

// ===== Mobile tests =====

test.describe('Visual States — Mobile @visual', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ mockApi, page }) => {
    await stabilizeBeforeNavigation(page);
    await mockApi();
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');
    await stabilizeAfterLoad(page);
  });

  test('T4 mobile breakpoint [mobile]', async ({ page }) => {
    await expect(page).toHaveScreenshot('page-default-mobile.png', {
      maxDiffPixelRatio: 0.01,
      fullPage: true,
    });
  });
});

// ===== Empty / Error states =====

test.describe('Visual States — Empty & Error @visual', () => {
  test('T1 empty state', async ({ mockApi, page }) => {
    await stabilizeBeforeNavigation(page);
    await mockApi({ companyList: [] }); // 按实际 mock API 参数调整
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');
    await stabilizeAfterLoad(page);
    await expect(page).toHaveScreenshot('page-empty-desktop.png', { maxDiffPixelRatio: 0.01 });
  });

  test('T1 error state', async ({ mockApi, page }) => {
    await stabilizeBeforeNavigation(page);
    await mockApi({ errorEndpoints: new Set(['__PRIMARY_ENDPOINT__']) });
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');
    await stabilizeAfterLoad(page);
    await expect(page).toHaveScreenshot('page-error-desktop.png', { maxDiffPixelRatio: 0.01 });
  });
});
