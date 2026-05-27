# J. Playwright 配置 + 稳定化前置动作

## J1. 必须的 expect 配置

```typescript
// playwright.config.ts
expect: {
  toHaveScreenshot: {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
    animations: 'disabled',
  },
},
```

## J2. 稳定化前置动作（两阶段）

**阶段 A：首次导航前（`page.goto()` 之前）**

```typescript
async function stabilizeBeforeNavigation(page: Page) {
  // A1. Freeze time
  await page.addInitScript(() => {
    const fixedDate = new Date('2026-01-01T00:00:00Z');
    Date = class extends Date {
      constructor(...args: any[]) { super(...(args.length ? args : [fixedDate])); }
      static now() { return fixedDate.getTime(); }
    };
  });
  // A2. Seed random
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  });
  // A3. Mock routes — 由 mock-api fixture 处理
  // A4. Locale/timezone — 由 playwright.config.ts 定义
  // A5. Viewport — 由 playwright.config.ts project 定义
}
```

**阶段 B：页面加载后（截图之前）**

```typescript
async function stabilizeAfterLoad(page: Page) {
  // B1. Wait for fonts（优先信号）
  await page.evaluate(() => document.fonts.ready);
  // B2. Disable animations/transitions
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important; animation-delay: 0s !important;
      transition-duration: 0s !important; transition-delay: 0s !important;
      scroll-behavior: auto !important;
    }`,
  });
  // B3. Mask dynamic regions — 受 J3 规则约束
  // B4. Final settle — fallback only, ≤ 200ms
  await page.waitForTimeout(150);
}
```

## J2b. 等待优先级（固定等待只能作为 fallback）

| 优先级 | 等待方式 | 说明 |
|--------|---------|------|
| 1（最高） | `await expect(sentinel).toBeVisible()` | 等待关键 UI 就绪 |
| 2 | `await page.evaluate(() => document.fonts.ready)` | 等待字体 |
| 3 | `await page.waitForLoadState('networkidle')` | 等待网络 settle |
| 4（最低） | `await page.waitForTimeout(N)` | **fallback only**，N ≤ 200ms |

## J3. Mask 使用硬规则

| # | 规则 |
|---|------|
| M1 | 只能 mask **非目标区域**的动态内容（时间戳、随机 ID、计数器） |
| M2 | **禁止** mask 被测组件本体 |
| M3 | **禁止** mask 背景、边界、阴影、sticky 边界、overlay 区域 |
| M4 | 每个 mask 必须在 YAML `masked_regions` 字段登记 selector + reason |
| M5 | 若 mask 导致无法检测视觉 bug → 按 Self-Audit BLOCK 处理 |
