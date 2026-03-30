# Design Quality Rubric — frontend-design V2.6

> Phase 4 的核心评分工具。每次输出必须按此 rubric 自评，附 evidence basis。
> 下游 reviewer（webapp-consistency-audit）可用此判断视觉方案质量。

---

## 使用时机

- Phase 4 Critique & Gate 中执行
- 必须在 Hard Checks 之后、Final Verdict 之前完成
- 每个维度必须给出 Score + Evidence Basis

---

## 8 维度评分

### 1. Product Fit（产品适配度）

**检验**：route 是否真正反映产品气质，7 维诊断是否映射到视觉决策。

| 分数 | 标准 |
|------|------|
| **5** | Route 选择完美反映产品气质，7 维诊断每条都能在视觉决策中找到对应 |
| **4** | Route 合理，少量维度（1-2 个）未体现在视觉决策中 |
| **3** | Route 合理但映射浅——文案说了"适配"，token/layout 看不出差异 |
| **2** | Route 与产品气质有明显错配（如金融监控用了 Consumer-light） |
| **1** | 完全无产品诊断，直接输出通用系统 |

**Common Failure Mode**：写了"本产品面向高压审慎用户"，但 token 和 density 与消费级 App 无区别
**Fix Action**：≤2 → 回 Phase 1，重审 route + content framing

---

### 2. Hierarchy Clarity（层级清晰度）

**检验**：信息层级是否靠字号+色彩+空间+位置多手段可靠区分。

| 分数 | 标准 |
|------|------|
| **5** | ≥3 层信息层级可靠区分，任何页面截图可立即判断主次 |
| **4** | 层级清晰，少量边缘场景（空态 vs 错态）区分不足 |
| **3** | 主标题/正文/辅助可区分，但卡片内部、表格行内缺细粒度层级 |
| **2** | 依赖单一手段（仅字号或仅颜色）拉层级，视觉单调 |
| **1** | 所有文字看起来权重相同 |

**Common Failure Mode**：字号梯度列了 7 级但间距只有 1 种，实际层级只靠大小字
**Fix Action**：≤2 → 回 Phase 2，重做 North-Star 层级定义

---

### 3. Originality / Anti-Generic（原创性/去模板感）

**检验**：能否明显区别于通用 SaaS / 通用 shadcn 拼装感。

| 分数 | 标准 |
|------|------|
| **5** | 看到界面可立即识别产品身份，不可能与其他产品混淆 |
| **4** | 有明确视觉人格，少量页面仍偏通用 |
| **3** | 有尝试差异化但仅停留在颜色/logo 层面，布局和组件仍是 UI 库默认 |
| **2** | 换个品牌色就可以是任何后台 |
| **1** | 纯 UI 库默认皮肤 |

**Common Failure Mode**：Rejected Directions 写了 3 条但实际输出与"被拒绝"的方向无差异
**Fix Action**：≤2 → 回 Phase 1，重跑 anti-pattern guardrails

---

### 4. System Coherence（系统一致性）

**检验**：token→shell→component→state 是否形成完整推导链，每层决策可回溯到 route。

| 分数 | 标准 |
|------|------|
| **5** | 推导链完整，每个 token 值、每个组件规则都能解释为什么 |
| **4** | 推导链完整，少量组件缺乏 route 回溯 |
| **3** | Token 和 shell 一致，但组件层和状态层各自为政 |
| **2** | Token 存在但组件实际用的值不在 token 范围内 |
| **1** | Token 和实际视觉描述完全脱节 |

**Common Failure Mode**：列了 30 个 token 但 component rules 引用的值不在 token 表内
**Fix Action**：≤2 → 回 Phase 3，重做 token→component 推导链

---

### 5. Visual Craft（视觉工艺）

**检验**：spacing/radius/shadow/motion 是否精心选择，形成统一材质感。

| 分数 | 标准 |
|------|------|
| **5** | 所有视觉维度（spacing/radius/shadow/motion/density）精心选择，形成统一材质感 |
| **4** | 大部分视觉细节到位，少量辅助组件（toast/tooltip/empty state）缺规则 |
| **3** | 核心组件有规则，辅助组件缺失 |
| **2** | 只有 color 和 typography 有定义，其他维度缺失 |
| **1** | 基本无视觉细节定义 |

**Common Failure Mode**：shadow 写了 3 级但应用规则空白，不知道哪个组件用哪级
**Fix Action**：≤2 → 回 Phase 3，重做 token/spacing 细节

---

### 6. Expression Control（表达控制力）

**检验**：表达层（metaphor/icon/motion/brand moment）是否与 route 匹配且不过量。

| 分数 | 标准 |
|------|------|
| **5** | Expression Layer 强度与 route 完全匹配，表达存在但不过度 |
| **4** | 表达适当，少量 brand moment 缺乏具体描述 |
| **3** | 表达层存在但与 route 脱节（如工具型产品用了强表达） |
| **2** | 无表达层或表达层完全照抄 route 描述未做具体化 |
| **1** | 表达层缺失 |

**Common Failure Mode**：Motion 写了"流畅过渡"但没说用在哪里、持续多久、触发条件
**Fix Action**：≤2 → 回 Phase 3，重做 expression layer

---

### 7. Route Fidelity（路线忠实度）🆕

**检验**：选了 route 但实现层（token/layout/component/state）是否滑回默认模板。

| 分数 | 标准 |
|------|------|
| **5** | 每个实现层决策都能直接回溯到选定 route 的特征，无默认值残留 |
| **4** | 大部分实现层忠实于 route，少量组件仍用默认值 |
| **3** | Route 在 token 和 shell 层体现了，但组件和状态层滑回通用 |
| **2** | Route 只在文案层出现，视觉层与选定 route 无关 |
| **1** | 完全无 route 痕迹，像直接用了 UI 库 starter template |

**Common Failure Mode**：Phase 1 选了 "Narrative Insight Desk" 但 Phase 3 输出的 token 和 layout 与 "Analytical Command Center" 无区别
**Fix Action**：≤2 → 回 Phase 2，重做 North-Star

---

### 8. Iteration Readiness（迭代准备度）🆕

**检验**：结构是否清晰到可被后续 edit/repair/扩展，而不是一次性不可修改的方案。

| 分数 | 标准 |
|------|------|
| **5** | Token 命名语义化、组件规则模块化、页面规则可独立修改、handoff 有明确标注 |
| **4** | 结构清晰，少量规则耦合（改一处需要改多处） |
| **3** | 核心部分可迭代，但边缘规则（状态/空态/错态）写得太模糊无法定向修改 |
| **2** | Token/组件/页面规则混在一起，改一个组件必须重新审视整套系统 |
| **1** | 一次性输出，无法局部修改 |

**Common Failure Mode**：所有 spacing 值写成具体 px 数字而非 token 引用，修改间距需要全局搜索替换
**Fix Action**：≤2 → 回 Phase 3，重写组件/结构规则

---

## Hard Fail Conditions

硬失败条件，任一触发 → 不得判定设计通过。

| # | 条件 | 原因 |
|---|------|------|
| **HF-1** | 没有 North-Star Screen | 没有页面级落地，系统再好也是空中楼阁 |
| **HF-2** | 大量 placeholder / lorem / "Feature 1/2/3" | 假内容 = 假设计，无法验证真实效果 |
| **HF-3** | 触发 ≥3 个 default SaaS degeneration signals | 已严重退化为通用模板 |
| **HF-4** | token drift（硬编码颜色与语义 token 混用） | 系统一致性破坏 |
| **HF-5** | 关键状态缺失（loading/empty/error/disabled 未定义） | 不可交付 |

---

## Low-Score Escalation（低分→阶段回退）

| 维度 | 条件 | 回退动作 |
|------|------|---------|
| Product Fit | ≤ 2 | 回 Phase 1，重审 route + content framing |
| Hierarchy Clarity | ≤ 2 | 回 Phase 2，重做 North-Star 层级定义 |
| Originality / Anti-Generic | ≤ 2 | 回 Phase 1，重跑 anti-pattern guardrails |
| System Coherence | ≤ 2 | 回 Phase 3，重做 token→component 推导链 |
| Visual Craft | ≤ 2 | 回 Phase 3，重做 token/spacing 细节 |
| Expression Control | ≤ 2 | 回 Phase 3，重做 expression layer |
| Route Fidelity | ≤ 2 | 回 Phase 2，重做 North-Star |
| Iteration Readiness | ≤ 2 | 回 Phase 3，重写组件/结构规则 |

**复合规则**：Product Fit ≤ 3 或 Originality/Anti-Generic ≤ 3（完整/新产品模式）→ 不得直接通过，必须重做 Route + North-Star + Anti-Degeneration 部分。

---

## 通过标准

- **下限**：所有维度 ≥ 3
- **目标**：至少 4 个维度 ≥ 4
- **任一维度 ≤ 2**：返回对应 Phase 修正，修正后重新走 Phase 4
- **Hard Fail 任一触发**：不通过，无论 Rubric 分数多高

---

## 输出格式

Phase 4 中的 Rubric Self-Review 必须使用以下格式：

```markdown
### Rubric Self-Review

| 维度 | 得分 | Evidence Basis |
|------|------|---------------|
| Product Fit | ? | {指出页面中的具体区域/结构/组件} |
| Hierarchy Clarity | ? | {具体区域} |
| Originality / Anti-Generic | ? | {具体区域} |
| System Coherence | ? | {具体区域} |
| Visual Craft | ? | {具体区域} |
| Expression Control | ? | {具体区域} |
| Route Fidelity | ? | {具体区域} |
| Iteration Readiness | ? | {具体区域} |

**Hard Fail 检查**：{通过 / 触发 HF-X}
**Rubric 判定**：{PASS / FAIL-RETRY(Phase X) / FAIL-ESCALATE}
```
