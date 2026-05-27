// layering-occlusion.template.spec.ts
// E1-E5 Layering/Occlusion/Sticky 专项检测骨架
// 复制到 e2e/tests/{page}.layering.spec.ts，替换 __PLACEHOLDER__ 部分

import { test, expect } from '../fixtures/mock-api'; // 按实际 fixture 路径调整
import {
  injectContrastBackground,
  injectScrollingTableBackground,
  removeContrastBackground,
} from '../fixtures/test-scene-fixtures';

const PAGE_URL = '__PAGE_URL__'; // e.g. '/insights/company-master'
const OVERLAY_TRIGGER_SELECTOR = '__OVERLAY_TRIGGER__'; // 触发 overlay 的元素
const STICKY_COLUMN_SELECTOR = '__STICKY_COL__'; // e.g. 'td.sticky'
const SCROLL_CONTAINER_SELECTOR = '__SCROLL_CONTAINER__'; // e.g. '.overflow-x-auto'

test.describe('Layering & Occlusion @layering', () => {
  test.beforeEach(async ({ mockApi, page }) => {
    await mockApi();
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');
  });

  // ===== E2: Overlay 实色背景验证 =====
  test('overlay panel is opaque — no bleed-through [T2]', async ({ page }) => {
    // 注入高对比背景
    await injectContrastBackground(page);

    // 打开 overlay
    await page.locator(OVERLAY_TRIGGER_SELECTOR).first().click();
    const panel = page.locator('[role="complementary"]'); // 按实际选择器
    await expect(panel).toBeVisible({ timeout: 5000 });

    // 截图 — 高对比背景下 panel 不应透出条纹
    await expect(panel).toHaveScreenshot('overlay-contrast-bg-desktop.png', {
      maxDiffPixelRatio: 0.01,
    });

    await removeContrastBackground(page);
  });

  test('overlay full page with contrast background [T5]', async ({ page }) => {
    await injectContrastBackground(page);
    await page.locator(OVERLAY_TRIGGER_SELECTOR).first().click();
    await expect(page.locator('[role="complementary"]')).toBeVisible({ timeout: 5000 });

    await expect(page).toHaveScreenshot('overlay-full-page-contrast-desktop.png', {
      maxDiffPixelRatio: 0.01,
      fullPage: false,
    });

    await removeContrastBackground(page);
  });

  // ===== E1: Sticky 列完全遮挡下层内容 =====
  test('sticky column occludes scrolled content [T3]', async ({ page }) => {
    const container = page.locator(SCROLL_CONTAINER_SELECTOR).first();
    if (!(await container.count())) {
      test.skip(true, 'No scroll container found');
      return;
    }

    // 注入表格背景到容器
    await injectScrollingTableBackground(page, SCROLL_CONTAINER_SELECTOR);

    // 滚动到 mid 位置（R 章节公式）
    await container.evaluate((el) => {
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      el.scrollLeft = Math.floor(max / 2);
    });
    await page.waitForTimeout(100);

    // Sticky 列元素级截图 — 不应透出背景表格
    const stickyEl = page.locator(STICKY_COLUMN_SELECTOR).first();
    if (await stickyEl.count()) {
      await expect(stickyEl).toHaveScreenshot('sticky-col-mid-scroll-desktop.png', {
        maxDiffPixelRatio: 0.01,
      });
    }

    // Sticky 列 bounding box 稳定性
    const boxBefore = await stickyEl.boundingBox();
    await container.evaluate((el) => {
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      el.scrollLeft = max;
    });
    await page.waitForTimeout(100);
    const boxAfter = await stickyEl.boundingBox();

    if (boxBefore && boxAfter) {
      expect(Math.abs(boxBefore.x - boxAfter.x)).toBeLessThan(2);
    }

    await removeContrastBackground(page);
  });

  // ===== E3: 滚动无露底/无错位 =====
  test('scroll start — no gaps or misalignment [T3-start]', async ({ page }) => {
    const container = page.locator(SCROLL_CONTAINER_SELECTOR).first();
    if (!(await container.count())) return;

    await container.evaluate((el) => { el.scrollLeft = 0; });
    await page.waitForTimeout(100);
    await expect(page).toHaveScreenshot('scroll-start-desktop.png', { maxDiffPixelRatio: 0.01 });
  });

  test('scroll end — no gaps or misalignment [T3-end]', async ({ page }) => {
    const container = page.locator(SCROLL_CONTAINER_SELECTOR).first();
    if (!(await container.count())) return;

    await container.evaluate((el) => {
      el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    });
    await page.waitForTimeout(100);
    await expect(page).toHaveScreenshot('scroll-end-desktop.png', { maxDiffPixelRatio: 0.01 });
  });

  // ===== E5: Overlay 后层不可点击 =====
  test('overlay blocks interaction with background elements', async ({ page }) => {
    await page.locator(OVERLAY_TRIGGER_SELECTOR).first().click();
    const panel = page.locator('[role="complementary"]');
    await expect(panel).toBeVisible({ timeout: 5000 });

    // 尝试点击 overlay 背后的第一个可交互元素（应被遮挡）
    const backdrop = page.locator('div[style*="position: fixed"][style*="zIndex: 40"]').first();
    if (await backdrop.count()) {
      const box = await backdrop.boundingBox();
      if (box) {
        // 点击 overlay 背后区域
        await page.mouse.click(box.x + 50, box.y + 200);
        // Panel 应该已关闭（点击了遮罩）
        // 或者 panel 依然存在（点击没有穿透）
        // 根据实际行为调整断言
      }
    }
  });
});

// ===== Mobile viewport 变体 =====
test.describe('Layering Mobile @layering', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('overlay is opaque on mobile [T4]', async ({ mockApi, page }) => {
    await mockApi();
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    await injectContrastBackground(page);
    await page.locator(OVERLAY_TRIGGER_SELECTOR).first().click();
    const panel = page.locator('[role="complementary"]');
    await expect(panel).toBeVisible({ timeout: 5000 });

    await expect(panel).toHaveScreenshot('overlay-contrast-bg-mobile.png', {
      maxDiffPixelRatio: 0.01,
    });

    await removeContrastBackground(page);
  });
});
