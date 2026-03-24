# Evaluation Run Policy
# 什么时候应该（和不应该）生成 evaluation YAML

本文档定义 `monitor/evaluation-{task_id}.yaml` 的生成触发策略。

---

## 建议触发时机

### 优先触发（强烈建议）

1. **任务进入 `status=completed`，且 schema_family ∈ {v2.0-traced, v1.0-structured}**
   - 这类任务的 parse_coverage 最高，evaluation 结论最可信
   - 命令：`node scripts/regression-check.mjs --cohort {task_id} --emit-evaluation`

2. **Gate 3 ACCEPT 后**，在 Phase F closeout 时
   - State-auditor skill 被 spawn 时，产出的 audit report 同时可触发 evaluation
   - 这是 evaluation 最自然的触发点，data freshness 最高

3. **手动跑 regression-check 时带 `--emit-evaluation`**
   - 适合批量补全已有任务的 evaluation，或在协议升级后重新评估

---

## 不建议触发的情况

| 情况 | 原因 |
|------|------|
| `parse_coverage.events=none` 且 `decisions=none` | 没有可信数据，生成 evaluation 无意义，9 个维度全部 pending |
| `schema_family=unknown` | 基础 schema 无法判定，regression 结果大量 UNKNOWN |
| task 仍在 Phase A 或 Phase B | 流程未完成，evaluation 会大量 N/A |
| task `status=gate_a_pending` | 任务在起点，无意义 |
| task `status=in_progress` 且 `current_phase` 不是 phase_f | 流程未完成 |
| 已知遗留 incomplete 任务（见 regression-known-issues.yaml B/C 类） | 不值得为历史包袱生成 evaluation |

---

## 生成质量分级

当前 evaluation YAML 的质量分为两档：

| 档位 | 来源 | 内容 |
|------|------|------|
| **自动档（regression-only）** | `regression-check --emit-evaluation` | 9 维度 grade=pending，regression_check_results 自动填入，key_findings 来自 FAIL 断言 |
| **手动档（state-auditor）** | `@state-auditor` skill | 9 维度 grade 有 AI 评分，evidence 有具体内容 |

自动档的价值在于：即使没有 state-auditor 跑，也能留下结构化的 regression 记录供后续对比。

---

## 最小触发条件（脚本层面）

regression-check.mjs 的 `--emit-evaluation` 在以下情况会自动跳过写入（不触发）：

- 任务目录不存在
- `canonical_task_meta.status` 不是 `completed`（除非加 `--force` 标志）

---

## 与 state-auditor 的分工

| 产出 | 来源 | 时机 |
|------|------|------|
| `monitor/evaluation-{task_id}.yaml`（自动档）| regression-check --emit-evaluation | Gate 3 ACCEPT 后，Phase F 时 |
| `monitor/evaluation-{task_id}.yaml`（手动档）| @state-auditor skill | 同上，或 Phase F closeout 后手动触发 |
| `monitor/{audit-report}.md` | @state-auditor skill | Phase F closeout（完整审计） |

state-auditor 产出手动档 evaluation 时，应直接覆盖同名文件（以 AI 评分版为准）。

---

## 追溯性建议

对于 19 个已有任务：
- v2.0-traced + completed（7 个）：建议补生成 evaluation（已在 2026-03-24 完成 6 个）
- v1.5-flat + completed（5 个完成的）：coverage 受限，可生成但质量降级，9 维度全 pending
- unknown + completed：不建议生成
