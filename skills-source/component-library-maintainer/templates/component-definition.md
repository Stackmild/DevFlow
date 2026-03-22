# {组件名} 组件规范

> 共享组件定义文档。由 `component-library-maintainer` skill 维护。
> 进入共享组件库的组件都必须有此定义。

**组件名**：
**所属层级**：`primitives` / `foundational` / `composite`
**发布阶段**：`experimental` / `beta` / `stable` / `deprecated`
**最后更新**：YYYY-MM-DD

---

## 1. Purpose（用途）

**解决什么问题**：

**属于哪一层**：

---

## 2. Usage Boundaries（使用边界）

**何时使用**：
-

**何时不要使用**：
-

**与相邻组件的区别**：
| 组件 | 区别 |
|------|------|
| ComponentA | ... |

---

## 3. Anatomy（结构解析）

**必需部分**：
-

**可选部分**：
-

---

## 4. Props / API

| Prop | 类型 | 默认值 | 说明 | 受控/非受控 |
|------|------|-------|------|-----------|
| size | `sm` \| `md` \| `lg` | `md` | 尺寸 | - |
| variant | `primary` \| `secondary` \| `ghost` | `primary` | 视觉变体 | - |
| isDisabled | boolean | `false` | 禁用状态 | - |
| isLoading | boolean | `false` | 加载状态 | - |
| onClick | function | - | 点击回调 | - |

**互斥 props（不能同时使用）**：
-

---

## 5. States（状态清单）

| 状态 | 视觉表现 | 可交互 | 备注 |
|------|---------|-------|------|
| default | - | ✅ | - |
| hover | - | ✅ | - |
| focus | 可见 focus ring | ✅ | - |
| active | - | ✅ | - |
| disabled | 降低不透明度 | ❌ | - |
| loading | spinner 替换内容 | ❌ | - |
| error/invalid | 红色边框 | ✅ | 主要用于表单 |

---

## 6. Accessibility Contract（可访问性契约）

**语义角色（role）**：
**可见/隐藏 label**：
**Keyboard support**：
- Tab：...
- Enter/Space：...
- Escape：...

**Focus management**：

**错误/帮助信息关联方式（aria-describedby）**：

**屏幕阅读器可感知名称**：

---

## 7. Content Guidance（内容规范）

**文案长度建议**：
**大小写规则**：
**空状态文案**：
**错误状态文案**：

---

## 8. Examples / Stories

**最小示例**：
```jsx
<ComponentName>基本用法</ComponentName>
```

**典型示例**：
```jsx
<ComponentName variant="primary" size="md" onClick={handleClick}>
  主要操作
</ComponentName>
```

**边界情况**：
```jsx
// 长文本截断
// 禁用状态
// 加载状态
```

---

## 9. Test Baseline（测试基线）

**Interaction tests**：
- [ ] 点击触发 onClick
- [ ] disabled 时不触发回调
- [ ] loading 时不触发回调

**Accessibility checks**：
- [ ] 有可访问名称
- [ ] 键盘可达
- [ ] Focus 可见

**Visual regression baseline**：
- [ ] default
- [ ] hover
- [ ] focus
- [ ] disabled
- [ ] loading

---

## 10. Lifecycle（生命周期）

**当前阶段**：experimental / beta / stable / deprecated

**若 deprecated**：
- 替代方案：
- 迁移说明：
- 计划下线时间：

---

*此模板由 `component-library-maintainer` skill 提供。*
