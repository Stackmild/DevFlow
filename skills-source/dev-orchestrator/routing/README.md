# DevFlow Routing — Capability Selector

## 当前状态

Capability Selector **narrative 说明**仍在各 phase doc 中：
- Phase C selector → `phases/phase-c-plan.md`
- Phase D reviewer selector → `phases/phase-d-execute.md`

Selector 输出写入 `decisions/routing-decision-{phase}.yaml`。

## Selector 激活状态

| 文件 | 状态 | orchestrator 行为 |
|------|------|------------------|
| `phase-d-reviewer-selector.yaml` | **ACTIVE** — V1.0 config，运行时真相源 | **必须读取**并按规则执行 reviewer 选择。narrative rules 降为说明文档 |
| `phase-c-selector.yaml` | **P1 / not yet authoritative** — V1.0 config 已写入但未激活 | 可参考，但 narrative rules 仍为执行依据（直到 P1 正式激活） |

## 目录结构

```
routing/
├── README.md                              # 本文件
├── phase-c-selector.yaml                  # Phase C Capability Selector（P1 — not yet authoritative）
└── phase-d-reviewer-selector.yaml         # Phase D Reviewer Selector（ACTIVE — V1.0 config）
```

## 设计原则

> capability selector 的长期 source of truth 应逐步从 narrative docs 转向 machine-readable config。

Phase D 已完成第一步（config active）。Phase C 待 P1 正式激活。

## routing-decision-D.yaml 输出规范

orchestrator 在 D.2 dispatch 后必须写入 `decisions/routing-decision-D.yaml`，包含：
- `config_rule_matched`: 命中的 rule_id（如 `rule_ui` / `rule_data` / `rule_authenticity` / `shortcut_bugfix`）
- 如无命中 → `config_rule_matched: none` + `fallback_reason` + `fallback_review_set`
