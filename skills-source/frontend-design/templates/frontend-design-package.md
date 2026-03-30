# frontend-design-package — 标准摘要交付物模板

> `frontend-design-package` 是 frontend-design 的结构化摘要 contract。
> 它不替代完整设计文档，而是把"是否走完流程、是否满足 gate、是否允许进入实现"收成可检查的结构化交付物。

---

## 定位

- 由 frontend-design skill 在 Phase 4 末尾**自动生成**
- 嵌入 `artifacts/frontend-design-spec.md` 的 **Section 20**（YAML code block）
- 不允许 orchestrator 或其他 agent 代为生成
- Package 内容必须与长文档中对应段落一致（不得手动编造分数或状态）
- 如触发 escalation 回退，回退完成后必须重新生成 Package

---

## 消费者

| 消费者 | 用途 |
|--------|------|
| DevFlow orchestrator | Phase C 完成判定、Gate 2 pre-check |
| full-stack-developer | 快速判断设计是否 ready（`implementation_ready` 字段） |
| code-reviewer / webapp-consistency-audit | 审查时获取 route、rubric scores、hard fail 状态 |
| state-auditor | Phase F 审计 frontend-design 交付完整性 |
| 未来自动化层 | 字段结构已为脚本化检查做好准备 |

---

## YAML Schema

```yaml
frontend_design_package:
  version: "v2.6"
  mode: ""                        # full / page / component / patch
  route_selected: ""
  rejected_routes_count: 0
  north_star_count: 0
  real_content_pass: false
  degeneration_signal_count: 0    # 退化信号实际计数（HC-8 输入）

  hard_checks:
    HC-1: pass                    # Blocking — Route Selection 完成
    HC-2: pass                    # Blocking → HF-1 — North-Star 完成
    HC-3: pass                    # Blocking → HF-2 — 无 placeholder
    HC-4: pass                    # Quality → Rubric — Token 最小集
    HC-5: pass                    # Blocking → HF-4 — 无 token drift
    HC-6: pass                    # Blocking → HF-5 — 关键状态已定义
    HC-7: pass                    # Quality → Rubric — ≥3 组件定制点
    HC-8: pass                    # Blocking → HF-3 — 退化信号 < 3

  hard_fail_ids: []               # 触发的 Hard Fail 编号列表，空 = 无硬失败
                                  # 例如 ["HF-2", "HF-4"]

  rubric_scores:
    product_fit: 0
    hierarchy_clarity: 0
    originality_anti_generic: 0
    system_coherence: 0
    visual_craft: 0
    expression_control: 0
    route_fidelity: 0
    iteration_readiness: 0

  final_verdict: ""               # PASS / FAIL-RETRY / FAIL-ESCALATE
  implementation_ready: false      # true 当且仅当 final_verdict = PASS
  retry_phase: null               # "Phase 1" / "Phase 2" / "Phase 3" / null
```

---

## 字段填充规则

| 字段 | 来源 | 规则 |
|------|------|------|
| `version` | 固定 | `"v2.6"` |
| `mode` | Phase 1 诊断 | `full` / `page` / `component` / `patch` |
| `route_selected` | Phase 1 结论 | 选定路线名称（如 "AI-native Copilot Surface"） |
| `rejected_routes_count` | Phase 1 Rejected Directions | 被拒绝的方向数量（整数） |
| `north_star_count` | Phase 2 产出 | 完成的 North-Star Screen 数量（整数） |
| `real_content_pass` | Phase 2 检查 | North-Star 中是否全部使用真实内容（`true` / `false`） |
| `degeneration_signal_count` | Phase 4 检查 | 匹配到的退化信号实际数量（整数，HC-8 输入） |
| `hard_checks.HC-*` | Phase 4 Hard Checks | 每项的 `pass` / `fail` / `warn` |
| `hard_fail_ids` | Phase 4 判定 | 触发的 Hard Fail 编号列表，空列表 = 无硬失败 |
| `rubric_scores.*` | Phase 4 Rubric | 8 个维度的 1-5 分（整数） |
| `final_verdict` | Phase 4 结论 | 见下方计算逻辑 |
| `implementation_ready` | 综合判定 | `true` 当且仅当 `final_verdict = "PASS"` |
| `retry_phase` | 低分/失败判定 | 如 FAIL-RETRY，指出应回退到哪个 Phase；PASS 时为 `null` |

---

## final_verdict 计算逻辑

```
if hard_fail_ids 非空:
    if 存在可回退修复的路径:
        final_verdict = "FAIL-RETRY"
        retry_phase = 对应的 Phase（按 Low-Score Escalation 表）
    else:
        final_verdict = "FAIL-ESCALATE"
        retry_phase = null  # 需人工介入

elif 任一 rubric_scores 维度 < 3:
    final_verdict = "FAIL-RETRY"
    retry_phase = 最低分维度对应的回退 Phase

elif rubric_scores 中 ≥4 的维度 < 4 个:
    final_verdict = "FAIL-RETRY"
    retry_phase = 最低分维度对应的回退 Phase

else:
    final_verdict = "PASS"
    implementation_ready = true
    retry_phase = null
```

---

## 产出位置

Package 作为 YAML code block 嵌入 `artifacts/frontend-design-spec.md` 的 **Section 20**。

```markdown
### 20. frontend-design-package

> ⚠️ 本节是质量元数据，不是视觉规范。Phase F.5 backfill 不得将本节内容写入 VISUAL-SYSTEM.md。

​```yaml
frontend_design_package:
  version: "v2.6"
  ...
​```
```

这样长文档和 package 在同一个文件中，不增加 artifact 文件数量。
下游消费者可通过提取 YAML code block 获取结构化数据。
