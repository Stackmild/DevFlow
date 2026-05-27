// scroll-stability.template.spec.ts
// R 章节 scroll position 规范 + start/mid/end 三档截图
// 复制到 e2e/tests/{page}.scroll.spec.ts，替换 __PLACEHOLDER__

import { test, expect } from '../fixtures/mock-api';

const PAGE_URL = '__PAGE_URL__';
const HSCROLL_SELECTOR = '__HORIZONTAL_SCROLL_CONTAINER__'; // e.g. '.overflow-x-auto'
const VSCROLL_SELECTOR = '__VERTICAL_SCROLL_CONTAINER__';  // e.g. '.overflow-y-auto'
const STICKY_COL_SELECTOR = '__STICKY_COL__'; // e.g. 'td.sticky, th.sticky'

test.describe('Scroll Stability @scroll', () => {
  test.beforeEach(async ({ mockApi, page }) => {
    await mockApi();
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addStyleTag({
      content: `*, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
        scroll-behavior: auto !important;
      }`,
    });
  });

  // ===== 横向滚动三档 =====
  test('horizontal scroll — start position [T3-start]', async ({ page }) => {
    const container = page.locator(HSCROLL_SELECTOR).first();
    if (!(await container.count())) { test.skip(true, 'No horizontal scroll'); return; }

    await container.evaluate((el) => { el.scrollLeft = 0; });
    await page.waitForTimeout(100);
    await expect(container).toHaveScreenshot('hscroll-start-desktop.png', { maxDiffPixelRatio: 0.01 });
  });

  test('horizontal scroll — mid position [T3-mid]', async ({ page }) => {
    const container = page.locator(HSCROLL_SELECTOR).first();
    if (!(await container.count())) { test.skip(true, 'No horizontal scroll'); return; }

    await container.evaluate((el) => {
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      el.scrollLeft = Math.floor(max / 2);
    });
    await page.waitForTimeout(100);
    await expect(container).toHaveScreenshot('hscroll-mid-desktop.png', { maxDiffPixelRatio: 0.01 });
  });

  test('horizontal scroll — end position [T3-end]', async ({ page }) => {
    const container = page.locator(HSCROLL_SELECTOR).first();
    if (!(await container.count())) { test.skip(true, 'No horizontal scroll'); return; }

    await container.evaluate((el) => {
      el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    });
    await page.waitForTimeout(100);
    await expect(container).toHaveScreenshot('hscroll-end-desktop.png', { maxDiffPixelRatio: 0.01 });
  });

  // ===== Sticky 列位置稳定性 =====
  test('sticky column x-position is stable across horizontal scroll', async ({ page }) => {
    const container = page.locator(HSCROLL_SELECTOR).first();
    const stickyEl = page.locator(STICKY_COL_SELECTOR).first();
    if (!(await container.count()) || !(await stickyEl.count())) return;

    const boxStart = await stickyEl.boundingBox();

    await container.evaluate((el) => {
      el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    });
    await page.waitForTimeout(100);

    const boxEnd = await stickyEl.boundingBox();

    if (boxStart && boxEnd) {
      // Sticky 列 x 坐标在滚动前后差异 < 2px
      expect(Math.abs(boxStart.x - boxEnd.x)).toBeLessThan(2);
    }
  });

  // ===== 纵向滚动三档 =====
  test('vertical scroll — start position [T3-start]', async ({ page }) => {
    const container = page.locator(VSCROLL_SELECTOR).first();
    if (!(await container.count())) { test.skip(true, 'No vertical scroll'); return; }

    await container.evaluate((el) => { el.scrollTop = 0; });
    await page.waitForTimeout(100);
    await expect(page).toHaveScreenshot('vscroll-start-desktop.png', { maxDiffPixelRatio: 0.01 });
  });

  test('vertical scroll — mid position [T3-mid]', async ({ page }) => {
    const container = page.locator(VSCROLL_SELECTOR).first();
    if (!(await container.count())) { test.skip(true, 'No vertical scroll'); return; }

    await container.evaluate((el) => {
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollTop = Math.floor(max / 2);
    });
    await page.waitForTimeout(100);
    await expect(page).toHaveScreenshot('vscroll-mid-desktop.png', { maxDiffPixelRatio: 0.01 });
  });

  test('vertical scroll — end position [T3-end]', async ({ page }) => {
    const container = page.locator(VSCROLL_SELECTOR).first();
    if (!(await container.count())) { test.skip(true, 'No vertical scroll'); return; }

    await container.evaluate((el) => {
      el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
    });
    await page.waitForTimeout(100);
    await expect(page).toHaveScreenshot('vscroll-end-desktop.png', { maxDiffPixelRatio: 0.01 });
  });
});
