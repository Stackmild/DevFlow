// component-screenshot.template.spec.ts
// 组件级元素截图 + T1-T6 命名约定
// 复制到 e2e/tests/{component}.visual.spec.ts，替换 __PLACEHOLDER__

import { test, expect } from '../fixtures/mock-api';
import {
  injectContrastBackground,
  removeContrastBackground,
} from '../fixtures/test-scene-fixtures';

const PAGE_URL = '__PAGE_URL__';
const COMPONENT_SELECTOR = '__COMPONENT_SELECTOR__'; // e.g. '[role="complementary"]'
const COMPONENT_NAME = '__COMPONENT_NAME__'; // e.g. 'company-preview-panel'
const OVERLAY_TRIGGER = '__OVERLAY_TRIGGER__'; // 若组件需要打开 overlay

test.describe(`Component Screenshots: ${COMPONENT_NAME} @visual`, () => {
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

  // T1: Component Default (element-level)
  test(`T1 ${COMPONENT_NAME} default — desktop`, async ({ page }) => {
    const el = page.locator(COMPONENT_SELECTOR).first();
    await expect(el).toBeVisible({ timeout: 5000 });
    await expect(el).toHaveScreenshot(`${COMPONENT_NAME}-default-desktop.png`, {
      maxDiffPixelRatio: 0.01,
    });
  });

  // T2: High-Contrast Background
  test(`T2 ${COMPONENT_NAME} contrast background — desktop`, async ({ page }) => {
    // If component requires overlay trigger, open it first
    if (OVERLAY_TRIGGER) {
      await page.locator(OVERLAY_TRIGGER).first().click();
    }
    await injectContrastBackground(page);
    const el = page.locator(COMPONENT_SELECTOR).first();
    await expect(el).toBeVisible({ timeout: 5000 });

    // Critical: screenshot must NOT show contrast stripes through the component
    await expect(el).toHaveScreenshot(`${COMPONENT_NAME}-contrast-bg-desktop.png`, {
      maxDiffPixelRatio: 0.01,
    });
    await removeContrastBackground(page);
  });

  // T4: Mobile
  test(`T4 ${COMPONENT_NAME} mobile — 390px`, async ({ page, mockApi }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    if (OVERLAY_TRIGGER) {
      await page.locator(OVERLAY_TRIGGER).first().click();
    }
    const el = page.locator(COMPONENT_SELECTOR).first();
    if (!(await el.count())) { test.skip(true, 'Component not visible on mobile'); return; }
    await expect(el).toHaveScreenshot(`${COMPONENT_NAME}-default-mobile.png`, {
      maxDiffPixelRatio: 0.01,
    });
  });

  // T5: Desktop Full-Context (full page)
  test(`T5 ${COMPONENT_NAME} full context — desktop`, async ({ page }) => {
    if (OVERLAY_TRIGGER) {
      await page.locator(OVERLAY_TRIGGER).first().click();
      await expect(page.locator(COMPONENT_SELECTOR).first()).toBeVisible({ timeout: 5000 });
    }
    await expect(page).toHaveScreenshot(`${COMPONENT_NAME}-full-context-desktop.png`, {
      maxDiffPixelRatio: 0.01,
      fullPage: false,
    });
  });

  // T6: Overlay Open State (if applicable)
  test(`T6 ${COMPONENT_NAME} overlay open — desktop`, async ({ page }) => {
    if (!OVERLAY_TRIGGER) { test.skip(true, 'Not an overlay component'); return; }
    await page.locator(OVERLAY_TRIGGER).first().click();
    const el = page.locator(COMPONENT_SELECTOR).first();
    await expect(el).toBeVisible({ timeout: 5000 });
    await expect(el).toHaveScreenshot(`${COMPONENT_NAME}-overlay-open-desktop.png`, {
      maxDiffPixelRatio: 0.01,
    });
  });
});
