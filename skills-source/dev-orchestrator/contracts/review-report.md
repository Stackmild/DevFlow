# Review Report Schema — Review Contract v2

> reviewer 必须声明看了什么上下文、检查了什么 contract、每条高严重度 finding 的证据。

---

## 结构化输出（YAML）

写入 `artifacts/{reviewer}-report.yaml`：

```yaml
reviewer: "{skill name}"
producer:                              # V6.0 新增：审查独立性证据（第一轮仅 review/audit artifact 要求）
  actor_type: "sub_agent"              # sub_agent | orchestrator（仅 INLINE_FALLBACK 时允许 orchestrator）
  actor_id: "{skill name}"             # 与 reviewer 字段一致
  dispatch_ref: "{event_id}"           # 对应 events.jsonl 中 skill_dispatched 事件的 event_id
  fallback: false                      # INLINE_FALLBACK 时为 true，须同时有 inline_fallback event
review_type: "code" | "consistency" | "pre_release_test"
context_pulled:                    # ⚠️ 必填且非空
  - source: "artifact:{id}" | "file:{path}"
    purpose: "{为什么看这个}"
contracts_checked:                 # ⚠️ 必填且非空
  - contract: "{contract 名称}"
    source_artifact: "artifact:{id}"
    result: "aligned" | "deviated" | "no_contract_available"
    evidence: "{证据}"
risks_by_severity:
  critical: []
  high: []
  medium: []
  low: []
missing_tests:                     # ⚠️ 必填
  - test: "{应测但未测}"
    reason_missing: "{原因}"
repo_context_needed_but_missing:
  - context: "{需要但缺失}"
    impact: "{影响}"
evidence:                          # ⚠️ critical/high 必须附证据
  - finding_id: "{P0-1}"
    evidence_type: "code_ref" | "artifact_ref" | "behavior_observation"
    evidence: "{证据}"
verdict: "accept" | "request_changes" | "accept_with_known_gaps"
known_gaps_if_accepted:
  - gap: "{gap}"
    risk: "{风险}"
build_evidence:                    # ⚠️ V4.5 新增：code-reviewer Layer 0 输出，其他 reviewer 如不执行 Layer 0 可省略
  tests_run_coverage: "all_explicit" | "partial_not_run" | "no_tests"
  delivery_verification:
    typecheck: "pass" | "fail" | "not_run" | "n/a"
    build: "pass" | "fail" | "not_run" | "n/a"
  compile_risk_patterns_found: []  # 如有：["useRef_no_init", "missing_use_client", ...]
  layer_0_verdict: "clean" | "concerns_found"
completion_status: "done"            # done | done_with_concerns | needs_context | blocked
completion_note: ""                  # ≤ 2 句，空 = 无补充
```

**completion_status 填写规则（reviewer）**：
- `done`：审查完成，verdict 已确定
- `done_with_concerns`：审查完成，但 reviewer 对某项有保留意见（超出 known_gaps 范畴），见 completion_note
- `needs_context`：缺少审查所需信息（如 change-package 缺失），无法完成，见 completion_note
- `blocked`：遭遇外部阻塞，见 completion_note

**Truth-source 规则（ORC 读取时遵循）**：与 change-package 相同——`blocked`/`needs_context` 触发 early-exit；`done`/`done_with_concerns` 仍接受 artifact 完整性兜底检查。

## 人类可读版（Markdown）

同时写入 `artifacts/{reviewer}-report.md`。

## 硬条件（Review Effectiveness 主标准）

- `context_pulled` 必填且非空
- `contracts_checked` 必填且非空（无 contract 时标注 `no_contract_available` + 审查盲区说明）
- `evidence` 覆盖所有 critical/high finding
- `missing_tests` 必填
- verdict 与 findings/risk 一致
- verdict 为 `accept_with_known_gaps` 时 `known_gaps_if_accepted` 非空
- `producer.actor_type` = `sub_agent`（INLINE_FALLBACK 时 = `orchestrator` + `fallback: true` + 须有 `inline_fallback` event）
  **⚠️ V6.0 引入，第二轮脚本验证**：当前 pre-gate self-check 和 present-gate.mjs 尚未检验此字段；
  ORC 须填写，审计时以 state-auditor 人工核查为准，自动拦截在第二轮实现。
- `producer.dispatch_ref` 必须匹配 events.jsonl 中一条 `skill_dispatched` 事件的 event_id
  **⚠️ V6.0 引入，第二轮脚本验证**：同上，当前无自动验证，第二轮 PG3-4 增强时加入。

## 弱提示

行数偏短可提示深度不足，但不单独作为判定依据。主标准是覆盖 + 证据 + 上下文。
