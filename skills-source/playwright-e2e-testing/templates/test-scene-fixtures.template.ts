// test-scene-fixtures.template.ts
// 高对比背景场景注入工具 — 用于检测 overlay/sticky 的透明/bleed-through
// 复制到 e2e/fixtures/test-scene-fixtures.ts 使用

import { type Page } from '@playwright/test';

const CONTRAST_BG_ID = '__pw_contrast_bg__';

/**
 * 注入高对比条纹背景
 * 用途：打开 overlay/drawer/panel 前注入，截图可检测任何透明泄漏
 * CB规则：未声明 translucent 时，截图出现条纹 = Real Bug
 */
export async function injectContrastBackground(page: Page): Promise<void> {
  await page.evaluate((id) => {
    if (document.getElementById(id)) return;
    const div = document.createElement('div');
    div.id = id;
    div.style.cssText = `
      position: fixed; inset: 0; z-index: -1; pointer-events: none;
      background: repeating-linear-gradient(
        45deg,
        #ff0000 0px, #ff0000 20px,
        #00ff00 20px, #00ff00 40px,
        #0000ff 40px, #0000ff 60px,
        #ffff00 60px, #ffff00 80px
      );
    `;
    div.innerHTML = `
      <div style="
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        font-size: 72px; font-weight: 900;
        color: #ff00ff; text-shadow: 2px 2px 0 #000;
        white-space: nowrap; pointer-events: none;
      ">BLEED-THROUGH DETECTOR</div>
    `;
    document.body.prepend(div);
  }, CONTRAST_BG_ID);
}

/**
 * 注入滚动表格背景
 * 用途：在 sticky 列/表头背后注入，截图可检测 sticky 元素是否真正遮挡
 * @param container — CSS selector of the scroll container
 */
export async function injectScrollingTableBackground(
  page: Page,
  container: string
): Promise<void> {
  await page.evaluate(({ sel, id }) => {
    const el = document.querySelector(sel);
    if (!el || document.getElementById(id)) return;
    const table = document.createElement('div');
    table.id = id;
    table.style.cssText =
      'position:absolute;inset:0;z-index:-1;overflow:hidden;pointer-events:none;';
    let html = '<table style="width:200%;border-collapse:collapse;">';
    for (let r = 0; r < 50; r++) {
      html += '<tr>';
      for (let c = 0; c < 8; c++) {
        const bg = (r + c) % 2 === 0 ? '#e0e0e0' : '#ffffff';
        html += `<td style="padding:8px 12px;background:${bg};font-size:14px;color:#333;">R${r}C${c}</td>`;
      }
      html += '</tr>';
    }
    html += '</table>';
    table.innerHTML = html;
    (el as HTMLElement).style.position = 'relative';
    el.prepend(table);
  }, { sel: container, id: `${CONTRAST_BG_ID}_table` });
}

/**
 * 移除所有注入的对比背景
 * 在截图完成后清理，恢复页面正常状态
 */
export async function removeContrastBackground(page: Page): Promise<void> {
  await page.evaluate((id) => {
    document.getElementById(id)?.remove();
    document.getElementById(`${id}_table`)?.remove();
  }, CONTRAST_BG_ID);
}
