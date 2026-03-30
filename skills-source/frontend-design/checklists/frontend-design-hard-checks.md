# frontend-design Hard Checks — Deterministic 检查清单

> 不依赖 LLM 自评的机械判定项。
> Phase 4 中先于 Rubric 执行。结果写入 design-spec Section 16 和 Package YAML。
> 本轮先做清单，不脚本化。清单结构已为未来自动化做好准备。

---

## 检查分类

检查项分为两类：

- **Blocking Checks**：FAIL = 阻断，对应 Hard Fail 条目，触发后不得判定设计通过
- **Quality Checks**：FAIL = 降低 Rubric 对应维度评分，不直接阻断

---

## HC → HF 映射表

| HC | 类型 | 检查项 | 对应 HF | FAIL 后果 |
|----|------|--------|---------|----------|
| HC-1 | Blocking | Route Selection 完成 | Phase 间阻断 | 不得进入 Phase 2 |
| HC-2 | Blocking | North-Star 完成 | HF-1 | 不得进入 Phase 3 / Hard Fail |
| HC-3 | Blocking | 无 placeholder 内容 | HF-2 | Hard Fail |
| HC-4 | Quality | Token 最小集覆盖 | — | 降低 System Coherence / Visual Craft |
| HC-5 | Blocking | 无 token drift | HF-4 | Hard Fail |
| HC-6 | Blocking | 关键状态已定义 | HF-5 | Hard Fail |
| HC-7 | Quality | ≥3 组件定制点 | — | 降低 Originality / Route Fidelity |
| HC-8 | Blocking | 退化信号 < 3 | HF-3 | Hard Fail |

---

## 详细检查项

### HC-1：Route Selection 完成（Blocking — Phase 间阻断）

**判定方式**：检查输出中是否存在以下段落：
- "Selected Route"（或 "选定路线"）段——包含路线名称和选定理由
- "Rejected Directions"（或 "被拒绝的方向"）段——包含至少 1 个被拒绝的方向

**通过**：两者均存在
**失败**：任一缺失 → 不得进入 Phase 2

---

### HC-2：North-Star 完成（Blocking → HF-1）

**判定方式**：检查输出中是否存在按 `north-star-screen-template.md` 填写的 North-Star Screen Spec：
- 至少 1 个页面
- 包含模板要求的 11 个字段（含 Real Content）

**通过**：至少 1 个完整的 North-Star Spec
**失败**：不存在或不完整 → Hard Fail HF-1 + 不得进入 Phase 3

---

### HC-3：无 placeholder 内容（Blocking → HF-2）

**判定方式**：扫描 North-Star Screen Spec 和关键页面描述中的以下关键词：
- `lorem ipsum` / `Lorem Ipsum`
- `Feature 1` / `Feature 2` / `Feature 3`（大小写不敏感）
- `placeholder` / `TBD` / `TODO`（作为内容而非注释）
- `Welcome to Dashboard` / `Welcome to App`
- `Get Started`（作为通用 CTA 而非产品特定操作）
- `Sample data` / `Example content`

**通过**：未发现上述关键词
**失败**：发现任一 → Hard Fail HF-2

---

### HC-4：Token 最小集覆盖（Quality → Rubric）

**判定方式**：检查 Token 段是否覆盖以下 4 个必要分类：
1. **Color**：至少 primary + semantic（success/warning/error）+ surface + text
2. **Typography**：至少 3 级字号梯度（heading/body/label）
3. **Spacing**：至少 4 级间距梯度
4. **Radius**：至少 2 级圆角定义

**通过**：4 个分类全部覆盖
**失败（warn）**：任一分类缺失 → 降低 System Coherence 和 Visual Craft 评分

---

### HC-5：无 token drift（Blocking → HF-4）

**判定方式**：检查组件规则和状态描述中的颜色/间距/字号值，是否都引用了 Token 段中定义的 token：
- 硬编码颜色值（如 `#3B82F6`、`rgb(59, 130, 246)`）出现在组件描述中 → drift
- 硬编码像素值（如 `padding: 17px`）不在 spacing scale 中 → drift

**通过**：所有值可追溯到 token 定义
**失败**：存在 ≥2 个 drift 实例 → Hard Fail HF-4

---

### HC-6：关键状态已定义（Blocking → HF-5）

**判定方式**：检查状态段是否明确覆盖以下 4 个必要状态：
1. **loading** — 有明确的视觉表达（skeleton/spinner/placeholder）
2. **empty** — 有明确的空态设计（插图+文案+CTA）
3. **error** — 有明确的错误态设计（图标+文案+重试）
4. **disabled** — 有明确的禁用态视觉区分

**通过**：4 个状态全部定义
**失败**：任一缺失 → Hard Fail HF-5

---

### HC-7：≥3 组件定制点（Quality → Rubric）

**判定方式**：检查组件规则段中，是否明确列出了至少 3 个"与 UI 库默认值不同"的定制点：
- 每个定制点必须说明：组件名 + 默认值 + 定制后 + 理由

**通过**：≥3 个定制点，每个有完整说明
**失败（warn）**：< 3 个或说明不完整 → 降低 Originality 和 Route Fidelity 评分

---

### HC-8：退化信号 < 3（Blocking → HF-3）

**判定方式**：对照 `route-anti-patterns.md` 中的跨路线通用退化信号，检查当前输出：

跨路线通用退化信号（见 route-anti-patterns.md §通用信号）：
1. 所有页面使用相同 layout skeleton
2. Token 定义了但组件规则没引用
3. Expression Layer 全部是形容词而无具体参数
4. Rejected Directions 与最终输出无差异
5. 所有组件使用 UI 库默认值

**通过**：匹配到的退化信号 < 3 个
**失败**：≥ 3 个 → Hard Fail HF-3

**额外要求**：无论通过与否，匹配到的退化信号数量写入 Package 的 `degeneration_signal_count` 字段。

---

## 输出格式

Phase 4 Section 16 的 Hard Checks Result 使用以下格式：

```markdown
### 16. Hard Checks Result

| HC | 检查项 | 类型 | 结果 | 备注 |
|----|--------|------|------|------|
| HC-1 | Route Selection | Blocking | pass/fail | |
| HC-2 | North-Star | Blocking | pass/fail | |
| HC-3 | Placeholder | Blocking | pass/fail | |
| HC-4 | Token 最小集 | Quality | pass/warn | |
| HC-5 | Token Drift | Blocking | pass/fail | |
| HC-6 | 关键状态 | Quality | pass/fail | |
| HC-7 | 组件定制点 | Quality | pass/warn | |
| HC-8 | 退化信号 | Blocking | pass/fail | count: {n} |

**Blocking 结果**：{全部 pass / 触发 HF-X}
**Quality 结果**：{全部 pass / HC-4 warn / HC-7 warn}
```
