# R. Scroll Position 规范

**禁止**：依赖鼠标滚轮模拟或惯性滚动（`page.mouse.wheel()` → 不确定最终位置）

**必须**：基于最大可滚动距离计算确定位置：

```typescript
const scrollVertical = (el: Element) => {
  const max = Math.max(0, el.scrollHeight - el.clientHeight);
  return { start: 0, mid: Math.floor(max / 2), end: max };
};

const scrollHorizontal = (el: Element) => {
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  return { start: 0, mid: Math.floor(max / 2), end: max };
};

// 使用方式：
// await container.evaluate(el => {
//   const pos = Math.max(0, el.scrollHeight - el.clientHeight);
//   el.scrollTop = Math.floor(pos / 2); // mid
// });
```

公式：`maxScroll = max(0, scrollDimension - clientDimension)`，`mid = floor(maxScroll/2)`，`end = maxScroll`。

截图命名中 position 必须是 `start` / `mid` / `end` 之一。

每个滚动截图步骤：
1. `evaluate(el => el.scrollTop = VALUE)` 设确定位置
2. 等待渲染稳定（优先 UI ready 信号，fallback `waitForTimeout(100)`）
3. `toHaveScreenshot()`
